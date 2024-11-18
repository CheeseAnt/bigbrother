mod types;
mod utils;
mod telemetry;

use std::process::{Command, Stdio, Child};
use std::io::{Read, BufReader, BufRead};
use std::sync::{Arc, Mutex};
use sysinfo::{System, SystemExt, Pid};
use std::thread;
use std::time::Duration;
use clap::Parser;
use log::{info, error, debug};
use env_logger;
use fs_extra::dir::get_size;
use types::{Zap, Introduction, Exit, Endpoint};

#[derive(Debug)]
#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Args {
    /// Restart the command if it exits
    #[arg(short, long, default_value_t = false)]
    restart: bool,

    /// Maximum number of restarts
    #[arg(short, long, default_value_t = 5)]
    max_restarts: u32,

    /// Do not print output
    #[arg(short, long, default_value_t = false)]
    no_output: bool,

    /// Track data folder size
    #[arg(short, long)]
    data_folder: Option<String>,

    /// Command to run
    #[arg(required = true, allow_hyphen_values = true)]
    command: Vec<String>,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();
    env_logger::init();

    // Check and fetch the command-line argument
    let command = &args.command.join(" ");

    // Run the command
    for i in 0..args.max_restarts {
        if run_command(command, &args).await {
            break;
        }

        if !args.restart {
            break;
        }

        if i + 1 != args.max_restarts {
            debug!("Restarting in {} seconds", i + 1);
            thread::sleep(Duration::from_secs((i + 1).into()));
        }
    }
}

fn read_stream<R: Read + Send + 'static>(stream: R, fifo_buffer: Arc<Mutex<String>>, write_buffer: bool, output_to_stdout: bool) -> thread::JoinHandle<()> {
    let buffer_size = 2048;

    thread::spawn(move || {
        let reader = BufReader::new(stream);
        for line in reader.lines() {
            if let Ok(line) = line {
                if output_to_stdout {
                    info!("{}", line);
                }
                if let Ok(mut buffer) = fifo_buffer.lock() {
                    buffer.push_str(&line);
                    if !write_buffer {
                        continue;
                    }
                    if buffer.len() > buffer_size {
                        let new_content = buffer[buffer.len() - buffer_size..].to_string();
                        *buffer = new_content;
                    }
                }
            }
        }
    })
}

fn get_folder_size(folder: &str) -> u64 {
    get_size(folder).unwrap_or(0)
}

async fn run_command(command: &str, args: &Args) -> bool {
    debug!("Running command: {:?} with args: {:?}", command, args);

    let root_proc = command.split(" ").next().unwrap();
    let root_proc_args = command.split(" ").skip(1).collect::<Vec<&str>>();
    // Spawn the subshell process
    let mut child = match Command::new(root_proc)
        .args(root_proc_args.clone())
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(e) => {
            error!("Failed to spawn process: {}", e);
            return false;
        }
    };

    debug!("Monitoring process with PID: {}", child.id());

    let introduction = Introduction::from_child(&child, root_proc, &root_proc_args.join(" "));
    debug!("Introduction: {:?} and {:?}", introduction, introduction.to_vec().unwrap());
    let _ = introduction.send_telemetry().await;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    // start a thread to read from stdout
    let stdout_fifo_buffer = Arc::new(Mutex::new(String::new()));
    let stdout_handle = read_stream(stdout, stdout_fifo_buffer.clone(), false, !args.no_output);

    let stderr_fifo_buffer = Arc::new(Mutex::new(String::new()));
    // start a thread to read from stderr
    let stderr_handle = read_stream(stderr, stderr_fifo_buffer.clone(), true, !args.no_output);
    let child_id = child.id();

    let result = handle_process(child, &args, stderr_fifo_buffer.clone()).await;

    let exit = Exit::from_status(child_id as i32, result, if result == 0 { None } else { Some(stderr_fifo_buffer.lock().unwrap().clone()) });
    debug!("Exit: {:?}", exit);
    let _ = exit.send_telemetry().await;

    stdout_handle.join().unwrap();
    stderr_handle.join().unwrap();

    return result == 0;
}

async fn handle_process(mut child: Child, args: &Args, stderr_fifo_buffer: Arc<Mutex<String>>) -> i32 {
    let mut sys = System::new_all();
    let pid = Pid::from(child.id() as usize); // Get the PID of the child process

    // Monitor the process while it's running
    loop {
        // Update system info
        sys.refresh_all();

        let mut data_folder_size = None;
        let process = sys.process(pid);

        // track data folder size
        if let Some(data_folder) = &args.data_folder {
            data_folder_size = Some(get_folder_size(data_folder));
            debug!("Data folder size: {} KB", data_folder_size.unwrap());
        }

        let zap = Zap::from_process(process, data_folder_size);
        debug!("Zap: {:?}", zap);
        let _ = zap.send_telemetry().await;

        if let None = process {
            debug!("Process with PID {} not found, it may have terminated.", pid);
            break
        }

        if child.try_wait().unwrap().is_some() {
            debug!("Process with PID {} terminated.", pid);
            break
        }

        // Sleep for a while before refreshing stats
        thread::sleep(Duration::from_secs(1));
    }

    // Ensure the child process is waited upon to avoid zombies
    if let Err(e) = child.wait() {
        error!("Failed to wait on child process: {}", e);
    }

    // get the reason for the exit
    let status = child.wait().unwrap();
    debug!("Child process exited with status: {}", status);

    if status.success() {
        debug!("Command succeeded");
    }
    else {
        // get the last error message
        if let Ok(buffer) = stderr_fifo_buffer.lock() {
            error!("Last error message: {}", buffer);
        }
        else {
            debug!("No stderr available");
        }
    }

    return status.code().unwrap_or(-1) as i32
}

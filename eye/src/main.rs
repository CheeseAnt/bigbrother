use std::process::{Command, Stdio};
use std::io::{Read, BufReader, BufRead};
use std::sync::{Arc, Mutex};
use sysinfo::{ProcessExt, System, SystemExt, Pid};
use std::thread;
use std::time::Duration;
use clap::Parser;
use log::{info, error, debug};
use env_logger;

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

    /// Command to run
    #[arg(required = true, allow_hyphen_values = true)]
    command: Vec<String>,
}

fn main() {
    let args = Args::parse();
    env_logger::init();

    // Check and fetch the command-line argument
    let command = &args.command.join(" ");

    // Run the command
    for i in 0..args.max_restarts {
        if run_command(command, &args) {
            break;
        }

        if !args.restart {
            break;
        }

        debug!("Restarting in {} seconds", i + 1);
        thread::sleep(Duration::from_secs((i + 1).into()));
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

fn run_command(command: &str, args: &Args) -> bool {
    debug!("Running command: {:?} with args: {:?}", command, args);

    // Spawn the subshell process
    let mut child = match Command::new("bash")
        .arg("-c")
        .arg(command)
        .stderr(Stdio::piped())
        .stdout(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(e) => {
            eprintln!("Failed to spawn process: {}", e);
            return false;
        }
    };

    let pid = Pid::from(child.id() as usize); // Get the PID of the child process
    let mut sys = System::new_all();

    debug!("Monitoring process with PID: {}", pid);

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    // start a thread to read from stdout
    let stdout_fifo_buffer = Arc::new(Mutex::new(String::new()));
    let stdout_handle = read_stream(stdout, stdout_fifo_buffer, false, !args.no_output);

    let stderr_fifo_buffer = Arc::new(Mutex::new(String::new()));
    // start a thread to read from stderr
    let stderr_handle = read_stream(stderr, stderr_fifo_buffer.clone(), true, !args.no_output);

    // Monitor the process while it's running
    loop {
        // Update system info
        sys.refresh_all();

        // Find the process by PID
        if let Some(process) = sys.process(pid) {
            // Print CPU, memory usage
            debug!(
                "CPU Usage: {:.2}%, Memory Usage: {} KB",
                process.cpu_usage(),
                process.memory()
            );

            // If you want to add network monitoring, extend with more sysinfo tools.
        } else {
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
        eprintln!("Failed to wait on child process: {}", e);
    }

    // get the reason for the exit
    let status = child.wait().unwrap();
    debug!("Child process exited with status: {}", status);
    
    if status.success() {
        debug!("Command succeeded");
        return true;
    }

    // get the last error message
    if let Ok(buffer) = stderr_fifo_buffer.lock() {
        error!("Last error message: {}", buffer);
    } else {
        debug!("No stderr available");
    }

    stdout_handle.join().unwrap();
    stderr_handle.join().unwrap();

    return false;
}

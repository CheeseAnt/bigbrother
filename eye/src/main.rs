mod types;
mod utils;
mod telemetry;

use std::process::{Command, Stdio, Child};
use std::sync::{Arc, Mutex};
use sysinfo::{System, SystemExt, Pid};
use std::thread;
use std::time::Duration;
use log::{error, debug, LevelFilter};
use env_logger;
use types::{Zap, Introduction, Exit, MessageBuffer, Endpoint, Args};
use utils::{read_streams, get_folder_size};
use chrono::Utc;
use clap::Parser;

#[tokio::main]
async fn main() {
    let args = Args::parse();
    env_logger::Builder::new()
        .filter_level(if args.verbose { LevelFilter::Debug } else { if args.no_output { LevelFilter::Error } else { LevelFilter::Info } })
        .init();

    if args.verbose {
        debug!("Verbose output enabled");
    }

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
    debug!("Introduction: {:?}", introduction);
    let _ = introduction.send_telemetry(args.telemetry_endpoint.clone()).await;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    // start a thread to read from stdout
    let all_message_buffer = Arc::new(Mutex::new(Vec::new()));
    let stderr_message_buffer = Arc::new(Mutex::new(Vec::new()));
    let (stdout_handle, stderr_handle) = read_streams(stdout, stderr, all_message_buffer.clone(), stderr_message_buffer.clone(), &args);

    let child_id = child.id();

    let result = handle_process(
        child,
        &args,
        all_message_buffer.clone()
    ).await;

    let exit = Exit::from_status(
        child_id as i32,
        result,
        if result == 0 { None } else { Some(stderr_message_buffer.lock().unwrap().clone()) },
    );

    debug!("Exit: {:?}", exit);
    let _ = exit.send_telemetry(args.telemetry_endpoint.clone()).await;

    stdout_handle.join().unwrap();
    stderr_handle.join().unwrap();

    return result == 0;
}

async fn handle_process(mut child: Child, args: &Args, all_message_buffer: Arc<Mutex<Vec<MessageBuffer>>>) -> i32 {
    let mut sys = System::new_all();
    let pid = Pid::from(child.id() as usize); // Get the PID of the child process

    // Monitor the process while it's running
    let sleep_interval = Duration::from_secs_f64(args.telemetry_interval);

    loop {
        let next_run = Utc::now() + sleep_interval;

        // Update system info
        sys.refresh_all();

        let mut data_folder_size = None;
        let process = sys.process(pid);

        // track data folder size
        if let Some(data_folder) = &args.data_folder {
            data_folder_size = Some(get_folder_size(data_folder));
            debug!("Data folder size: {} KB", data_folder_size.unwrap());
        }

        if let Ok(mut messages) = all_message_buffer.lock() {
            let zap = Zap::from_process(process, data_folder_size, Some(messages.clone()));
            messages.clear();
            debug!("Zap: {:?}", zap);
            let _ = zap.send_telemetry(args.telemetry_endpoint.clone()).await;
        }

        if let None = process {
            debug!("Process with PID {} not found, it may have terminated.", pid);
            break
        }

        if child.try_wait().unwrap().is_some() {
            debug!("Process with PID {} terminated.", pid);
            break
        }

        // Wait for a while before refreshing stats
        tokio::time::sleep(next_run.signed_duration_since(Utc::now()).to_std().unwrap_or(Duration::from_secs(0))).await;
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
        error!("Command failed");
    }

    return status.code().unwrap_or(-1) as i32
}

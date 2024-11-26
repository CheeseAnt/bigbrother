mod types;
mod utils;
mod telemetry;

use std::process::{Command, Stdio, Child};
use std::sync::{Arc, Mutex};
use sysinfo::{System, Pid};
use std::thread;
use std::time::Duration;
use log::{error, debug, LevelFilter};
use env_logger;
use types::{Zap, Introduction, Exit, MessageBuffer, Endpoint, Args, BrainWaveError};
use utils::{read_streams, log_zap, setup_signal_handlers};
use telemetry::{set_telemetry_delay, reset_system_start_time};
use chrono::Utc;
use clap::Parser;
use std::fs::File;

#[tokio::main]
async fn main() {
    let args = Args::parse();

    env_logger::Builder::new()
        .filter_level(if args.verbose { LevelFilter::Debug } else { if args.no_output { LevelFilter::Error } else { LevelFilter::Info } })
        .init();

    if args.telemetry_delay > 0.0 {
        set_telemetry_delay(args.telemetry_delay);
    }

    if args.verbose {
        debug!("Verbose output enabled");
    }

    // Check and fetch the command-line argument
    let command = &args.command.join(" ");

    // Run the command
    let mut attempt_count = 0;
    while attempt_count < args.max_restarts {
        // reset the system start time for delay calculations
        reset_system_start_time();

        match run_command(command, &args).await {
            Ok(true) => {
                debug!("Command completed successfully - exiting");
                break;
            },
            Ok(false) => {
                if !(args.restart) {
                    debug!("Command completed with non-zero exit code - exiting");
                    break;
                }
                debug!("Command completed with non-zero exit code - restarting in {} seconds", attempt_count + 1);
                thread::sleep(Duration::from_secs((attempt_count + 1).into()));
            },
            Err(BrainWaveError::RestartRequired(_)) => {
                debug!("Restart command received from brain");
                continue;
            },
            Err(BrainWaveError::ExitRequired(_)) => {
                debug!("Exit command received from brain");
                break;
            },
            Err(e) => {
                error!("Unknown error in top level: {} - restarting", e);
            }
        }

        attempt_count = attempt_count + 1;
    }
}

async fn run_command(command: &str, args: &Args) -> Result<bool, BrainWaveError> {
    debug!("Running command: {:?} with args: {:?}", command, args);

    let parent_pid = std::process::id() as usize;
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
            error!("Failed to spawn process {:?} with args {:?}: {}", root_proc, root_proc_args, e);
            return Ok(false);
        }
    };

    let child_pid = child.id();
    setup_signal_handlers(child_pid).await;

    debug!("Monitoring process with PID: {}", child_pid);

    let mut uuid: String = "".to_string();
    let introduction = Introduction::from_child(parent_pid as i32, child_pid as i32, root_proc, &root_proc_args.join(" "), args.display_name.clone());
    debug!("Introduction: {:?}", introduction);

    if !args.prevent_telemetry {
        match introduction.send_telemetry(args.telemetry_endpoint.clone()).await {
            Ok(uuid_response) => {
                debug!("Setting UUID: {}", uuid_response);
                uuid = uuid_response;
            },
            Err(e) => {
                return Err(e);
            }
        }
    }

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    // start a thread to read from stdout
    let all_message_buffer = Arc::new(Mutex::new(Vec::new()));
    let stderr_message_buffer = Arc::new(Mutex::new(Vec::new()));
    let (stdout_handle, stderr_handle) = read_streams(stdout, stderr, all_message_buffer.clone(), stderr_message_buffer.clone(), &args);

    let result = handle_process(
        child,
        &args,
        all_message_buffer.clone(),
        uuid.clone()
    ).await;

    let result_int: i32;

    match result {
        Ok(result) => {
            result_int = result;
        },
        Err(_) => {
            result_int = -1;
        }
    }

    let exit = Exit::from_status(
        uuid,
        result_int,
        if result_int == 0 { None } else { Some(stderr_message_buffer.lock().unwrap().clone()) },
    );

    debug!("Exit: {:?}", exit);
    if !args.prevent_telemetry {
        let _ = exit.send_telemetry(args.telemetry_endpoint.clone()).await;
    }

    match result {
        Ok(_) => {
            stdout_handle.join().unwrap();
            stderr_handle.join().unwrap();

            return Ok(result_int == 0)
        },
        Err(e) => {
            debug!("Process with PID {} may still be alive - force quitting", child_pid);
            let sys = System::new_all();
            match sys.process(Pid::from(child_pid as usize)) {
                Some(process) => {
                    process.kill_with(sysinfo::Signal::Term);
                    process.wait();
                },
                None => {
                    error!("Failed to find process with PID {} - it may have already terminated", child_pid);
                }
            }

            stdout_handle.join().unwrap();
            stderr_handle.join().unwrap();

            return Err(e);
        }
    }
}

async fn handle_process(mut child: Child, args: &Args, all_message_buffer: Arc<Mutex<Vec<MessageBuffer>>>, uuid: String) -> Result<i32, BrainWaveError> {
    let mut sys = System::new_all();
    let pid = Pid::from(child.id() as usize); // Get the PID of the child process

    // Monitor the process while it's running
    let sleep_interval = Duration::from_secs_f64(args.telemetry_interval);

    let mut log_file: Option<File> = None;
    if let Some(log_path) = &args.log_to_file {
        match File::options().append(true).create(true).write(true).open(log_path) {
            Ok(file) => log_file = Some(file),
            Err(e) => error!("Failed to open log file: {}", e)
        }
    }

    loop {
        let next_run = Utc::now() + sleep_interval;

        // Update system info
        sys.refresh_all();

        let process = sys.process(pid);
        let messages_to_send = if args.no_remote_logs { None } else { Some(all_message_buffer.lock().unwrap().clone()) };

        let zap = Zap::from_process(uuid.clone(), process, args, messages_to_send);
        debug!("Zap: {:?}", zap);

        log_zap(&zap, &mut log_file);

        if !args.prevent_telemetry {
            let _ = zap.send_telemetry(args.telemetry_endpoint.clone()).await?;
        }

        if let Ok(mut messages) = all_message_buffer.lock() {
            messages.clear();
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

    return Ok(status.code().unwrap_or(-1) as i32)
}

use whoami;
use hostname;
use chrono::{Utc, DateTime, SecondsFormat};
use std::io::{BufReader, BufRead};
use std::sync::{Arc, Mutex};
use std::thread;
use std::process::{ChildStdout, ChildStderr};
use fs_extra::dir::get_size;
use log::{info, debug};
use std::fs::File;
use std::io::Write;
use crate::types::{MessageBuffer, Args, Zap};
use tokio::signal::unix::{signal, SignalKind};
use std::sync::atomic::{AtomicBool, Ordering};
use sysinfo::{System, Pid};
use std::time::Duration;

pub fn get_current_user() -> String {
    whoami::username().to_string()
}

pub fn get_hostname() -> String {
    hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".to_string())
}

pub fn read_streams(
    stdout: ChildStdout,
    stderr: ChildStderr,
    all_message_buffer: Arc<Mutex<Vec<MessageBuffer>>>,
    stderr_message_buffer: Arc<Mutex<Vec<MessageBuffer>>>,
    args: &Args,
) -> (thread::JoinHandle<()>, thread::JoinHandle<()>) {
    let log_buffer_size = args.log_buffer_size;
    let error_log_buffer_size = args.error_log_buffer_size;

    let message_all_clone = all_message_buffer.clone();
    let stdout_handle = thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                info!("{}", line);

                if let Ok(mut message_buffer) = message_all_clone.lock() {
                    message_buffer.push(MessageBuffer { message: line, timestamp: Utc::now().timestamp_millis() as u64, error: false });

                    if message_buffer.len() > log_buffer_size {
                        let new_content = message_buffer[message_buffer.len() - log_buffer_size..].to_vec();
                        *message_buffer = new_content;
                    }
                }
            }
        }
    });

    let stderr_handle = thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                info!("{}", line);

                if let Ok(mut message_buffer) = stderr_message_buffer.lock() {
                    message_buffer.push(MessageBuffer { message: line.clone(), timestamp: Utc::now().timestamp_millis() as u64, error: true });

                    if message_buffer.len() > error_log_buffer_size {
                        let new_content = message_buffer[message_buffer.len() - error_log_buffer_size..].to_vec();
                        *message_buffer = new_content;
                    }
                }
                if let Ok(mut message_buffer) = all_message_buffer.lock() {
                    message_buffer.push(MessageBuffer { message: line.clone(), timestamp: Utc::now().timestamp_millis() as u64, error: true });

                    if message_buffer.len() > log_buffer_size {
                        let new_content = message_buffer[message_buffer.len() - log_buffer_size..].to_vec();
                        *message_buffer = new_content;
                    }
                }
            }
        }
    });

    return (stdout_handle, stderr_handle);
}

pub fn get_folder_size(folder: &str) -> u64 {
    get_size(folder).unwrap_or(0)
}

pub fn log_zap(zap: &Zap, log_file: &mut Option<File>) {
    if let Some(log_file) = log_file {
        let mut messages = zap.messages.as_ref().map(|m| m.iter().map(|m| m.message.clone()).collect::<Vec<String>>()).unwrap_or(vec![]);
        let time: String = DateTime::from_timestamp_millis(zap.time as i64).unwrap().to_rfc3339_opts(SecondsFormat::Millis, true);

        if messages.len() == 0 {
            messages.push("".to_string());
        }

        for message in messages {
            log_file.write_all(format!(
                "{:}: {:?}, {:?}, {:?}, {:}\n", time, zap.memory, zap.cpu, zap.disk, message
            ).as_bytes()).unwrap();
        }
    }
}

// Add this near the top of the file
pub async fn setup_signal_handlers(child_pid: u32) {
    let shutting_down = Arc::new(AtomicBool::new(false));
    let mut sigterm = signal(SignalKind::terminate()).unwrap();
    let mut sigint = signal(SignalKind::interrupt()).unwrap();
    
    let shutting_down_term = shutting_down.clone();
    let shutting_down_int = shutting_down.clone();
    
    // Handle SIGTERM
    tokio::spawn(async move {
        sigterm.recv().await;
        if !shutting_down_term.swap(true, Ordering::SeqCst) {
            debug!("Received SIGTERM, initiating graceful shutdown...");
            graceful_shutdown(child_pid).await;
        }
    });

    // Handle SIGINT (Ctrl+C)
    tokio::spawn(async move {
        sigint.recv().await;
        if !shutting_down_int.swap(true, Ordering::SeqCst) {
            debug!("Received SIGINT, initiating graceful shutdown...");
            graceful_shutdown(child_pid).await;
        }
    });
}

async fn graceful_shutdown(child_pid: u32) {
    let sys = System::new_all();
    
    // Try to terminate child process gracefully first
    if let Some(process) = sys.process(Pid::from(child_pid as usize)) {
        debug!("Sending SIGTERM to child process {}", child_pid);
        process.kill_with(sysinfo::Signal::Term);
        
        // Give the process some time to cleanup
        tokio::time::sleep(Duration::from_secs(5)).await;
        
        // If still running, force kill
        if let Some(process) = sys.process(Pid::from(child_pid as usize)) {
            debug!("Child process still running, sending SIGKILL");
            process.kill_with(sysinfo::Signal::Kill);
        }
    }
}

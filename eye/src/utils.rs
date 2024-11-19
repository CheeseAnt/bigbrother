use users;
use hostname;
use chrono::Utc;
use std::io::{BufReader, BufRead};
use std::sync::{Arc, Mutex};
use std::thread;
use std::process::{ChildStdout, ChildStderr};
use fs_extra::dir::get_size;
use log::{info};
use crate::types::{MessageBuffer, Args};

pub fn get_current_user() -> String {
    users::get_current_username()
        .map(|u| u.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string())
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
                    message_buffer.push(MessageBuffer { message: line, timestamp: Utc::now().timestamp() as u64, error: false });

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
                    message_buffer.push(MessageBuffer { message: line.clone(), timestamp: Utc::now().timestamp() as u64, error: true });

                    if message_buffer.len() > error_log_buffer_size {
                        let new_content = message_buffer[message_buffer.len() - error_log_buffer_size..].to_vec();
                        *message_buffer = new_content;
                    }
                }
                if let Ok(mut message_buffer) = all_message_buffer.lock() {
                    message_buffer.push(MessageBuffer { message: line.clone(), timestamp: Utc::now().timestamp() as u64, error: true });

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

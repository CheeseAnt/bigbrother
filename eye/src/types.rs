use serde::{Serialize, Deserialize};
use chrono::Utc;
use clap::Parser;
use sysinfo::{Process, ProcessExt};
use crate::utils::{get_current_user, get_hostname};
use std::error::Error;
use crate::telemetry::send_telemetry;
use log::error;

#[derive(Debug)]
#[derive(Parser)]
#[command(version, about, long_about = None)]
pub struct Args {
    /// Restart the command if it exits
    #[arg(short = 'r', long, default_value_t = false)]
    pub restart: bool,

    /// Maximum number of restarts
    #[arg(short = 'm', long, default_value_t = 5)]
    pub max_restarts: u32,

    /// Do not print output
    #[arg(short = 'n', long, default_value_t = false)]
    pub no_output: bool,

    /// Track data folder size
    #[arg(short = 'd', long)]
    pub data_folder: Option<String>,

    /// Telemetry endpoint
    #[arg(short = 'e', long)]
    pub telemetry_endpoint: Option<String>,

    /// Telemetry Interval
    #[arg(short = 'i', long, default_value_t = 1.0)]
    pub telemetry_interval: f64,

    /// Telemetry log buffer size
    #[arg(short = 'b', long, default_value_t = 50)]
    pub log_buffer_size: usize,

    /// Telemetry error log buffer size
    #[arg(short = 'z', long, default_value_t = 25)]
    pub error_log_buffer_size: usize,

    /// Verbose output
    #[arg(short = 'v', long, default_value_t = false)]
    pub verbose: bool,

    /// Prevent telemetry
    #[arg(short = 'x', long, default_value_t = false)]
    pub prevent_telemetry: bool,

    /// Log to file
    #[arg(short = 'l', long)]
    pub log_to_file: Option<String>,

    /// Command to run
    #[arg(required = true, allow_hyphen_values = true)]
    pub command: Vec<String>,
}

#[derive(Debug)]
pub enum BrainWaveError {
    RestartRequired(String),
    ExitRequired(String),
    TelemetryError(String),
    ReqwestError(String),
}

impl std::fmt::Display for BrainWaveError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BrainWaveError::RestartRequired(msg) => write!(f, "Process restart required: {}", msg),
            BrainWaveError::ExitRequired(msg) => write!(f, "Process exit required: {}", msg), 
            BrainWaveError::TelemetryError(msg) => write!(f, "Telemetry error occurred: {}", msg),
            BrainWaveError::ReqwestError(msg) => write!(f, "Request error occurred: {}", msg),
        }
    }
}

impl Error for BrainWaveError {}
impl From<reqwest::Error> for BrainWaveError {
    fn from(err: reqwest::Error) -> Self {
        BrainWaveError::ReqwestError(err.to_string())
    }
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageBuffer {
    pub message: String,
    pub timestamp: u64,
    pub error: bool
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Zap {
    pub uuid: String,
    pub memory: f64,
    pub cpu: f64,
    pub time: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<MessageBuffer>>,
}

impl Endpoint for Zap {
    fn endpoint(&self) -> &str {
        "zap"
    }
}

impl Zap {
    pub fn from_process(uuid: String, process: Option<&Process>, data_folder_size: Option<u64>, messages: Option<Vec<MessageBuffer>>) -> Self {
        let mut memory = 0.0;
        let mut cpu = 0.0;
        if let Some(process) = process {
            memory = process.memory() as f64;
            cpu = process.cpu_usage() as f64;
        }

        let zap = Zap {
            uuid,
            memory,
            cpu,
            time: Utc::now().timestamp_millis() as u64,
            disk: data_folder_size,
            messages,
        };
        zap
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Introduction {
    pub pid: i32,
    pub parent_pid: i32,
    pub name: String,
    pub args: String,
    pub host: String,
    pub user: String,
    pub time: u64,
}

impl Endpoint for Introduction {
    fn endpoint(&self) -> &str {
        "introduction"
    }
}

impl Introduction {
    pub fn from_child(parent_pid: i32, child_pid: i32, root_proc: &str, root_proc_args: &str) -> Self {
        let introduction = Introduction {
            pid: child_pid,
            parent_pid: parent_pid,
            name: root_proc.to_string(),
            args: root_proc_args.to_string(),
            host: get_hostname(),
            user: get_current_user(),
            time: Utc::now().timestamp_millis() as u64,
        };
        introduction
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Exit {
    pub uuid: String,
    pub exit_code: i32,
    pub time: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub messages: Option<Vec<MessageBuffer>>,
}

impl Endpoint for Exit {
    fn endpoint(&self) -> &str {
        "exit"
    }
}

impl Exit {
    pub fn from_status(uuid: String, status: i32, messages: Option<Vec<MessageBuffer>>) -> Self {
        Exit { uuid, exit_code: status, time: Utc::now().timestamp_millis() as u64, messages }
    }
}

pub trait Endpoint: MessagePack {
    async fn send_telemetry(&self, endpoint: Option<String>) -> Result<String, BrainWaveError> {
        match send_telemetry(self.endpoint(), self.to_vec().unwrap(), endpoint).await {
            Ok(response) => Ok(response),
            Err(BrainWaveError::ReqwestError(e)) => {
                error!("Telemetry request failed: {}", e);
                Ok("".to_string()) // Continue execution even if telemetry fails
            },
            Err(e) => Err(e), // Propagate other errors
        }
    }

    fn endpoint(&self) -> &str;
}   

pub trait MessagePack: Serialize {
    fn to_vec(&self) -> Result<Vec<u8>, rmp_serde::encode::Error> {
        rmp_serde::to_vec_named(self)
    }
}

// Implement for all types that satisfy the trait bounds
impl<T: Serialize + Endpoint> MessagePack for T {}

use serde::{Serialize, Deserialize};
use chrono::Utc;
use sysinfo::{Process, ProcessExt};
use std::process::Child;
use crate::utils::{get_current_user, get_hostname};
use std::error::Error;
use crate::telemetry::send_telemetry;

#[derive(Debug, Serialize, Deserialize)]
pub struct Zap {
    pub memory: f64,
    pub cpu: f64,
    pub time: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disk: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl Endpoint for Zap {
    fn endpoint(&self) -> &str {
        "zap"
    }
}

impl Zap {
    pub fn from_process(process: Option<&Process>, data_folder_size: Option<u64>) -> Self {
        let mut memory = 0.0;
        let mut cpu = 0.0;
        if let Some(process) = process {
            memory = process.memory() as f64;
            cpu = process.cpu_usage() as f64;
        }
        let zap = Zap {
            memory,
            cpu,
            time: Utc::now().timestamp() as u64,
            disk: data_folder_size,
            message: None,
        };
        zap
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Introduction {
    pub pid: i32,
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
    pub fn from_child(child: &Child, root_proc: &str, root_proc_args: &str) -> Self {
        let introduction = Introduction {
            pid: child.id() as i32,
            name: root_proc.to_string(),
            args: root_proc_args.to_string(),
            host: get_hostname(),
            user: get_current_user(),
            time: Utc::now().timestamp() as u64,
        };
        introduction
    }

    pub fn to_vec(&self) -> Result<Vec<u8>, rmp_serde::encode::Error> {
        rmp_serde::to_vec(self)
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Exit {
    pub pid: i32,
    pub exit_code: i32,
    pub time: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl Endpoint for Exit {
    fn endpoint(&self) -> &str {
        "exit"
    }
}

impl Exit {
    pub fn from_status(pid: i32, status: i32, message: Option<String>) -> Self {
        Exit { pid, exit_code: status, time: Utc::now().timestamp() as u64, message }
    }
}

pub trait Endpoint: MessagePack {
    async fn send_telemetry(&self) -> Result<(), Box<dyn Error>> {
        send_telemetry(self.endpoint(), self.to_vec().unwrap()).await
    }

    fn endpoint(&self) -> &str;
}   

pub trait MessagePack: Serialize {
    fn to_vec(&self) -> Result<Vec<u8>, rmp_serde::encode::Error> {
        rmp_serde::to_vec(self)
    }
}

// Implement for all types that satisfy the trait bounds
impl<T: Serialize + Endpoint> MessagePack for T {}
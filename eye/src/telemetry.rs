use reqwest::Client;
use once_cell::sync::Lazy;
use log::{debug, error};
use crate::types::BrainWaveError;

static TELEMETRY_ENDPOINT: Lazy<String> = Lazy::new(|| {
    std::env::var("TELEMETRY_ENDPOINT").unwrap_or_else(|_| "https://bb.antonshmanton.com/telemetry".to_string())
});

static CLIENT: Lazy<Client> = Lazy::new(|| Client::new());

static SYSTEM_START_TIME: Lazy<std::sync::Mutex<f64>> = Lazy::new(|| std::sync::Mutex::new(0.0));

static TELEMETRY_DELAY: Lazy<std::sync::Mutex<f64>> = Lazy::new(|| std::sync::Mutex::new(
    std::env::var("TELEMETRY_DELAY").unwrap_or("0.0".to_string()).parse().unwrap_or(0.0)
));

static TELEMETRY_DELAY_NEEDED: Lazy<std::sync::Mutex<bool>> = Lazy::new(|| std::sync::Mutex::new(false));

pub fn reset_system_start_time() {
    *SYSTEM_START_TIME.lock().unwrap() = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs_f64();
    *TELEMETRY_DELAY_NEEDED.lock().unwrap() = true;
}

pub fn set_telemetry_delay(delay: f64) {
    debug!("Setting telemetry delay to {}", delay);
    *TELEMETRY_DELAY.lock().unwrap() = delay;
}

pub async fn send_telemetry(endpoint: &str, data: Vec<u8>, endpoint_override: Option<String>) -> Result<String, BrainWaveError> {
    let remote_endpoint = endpoint_override.unwrap_or(TELEMETRY_ENDPOINT.to_string()) + "/" + endpoint;

    let delay = *TELEMETRY_DELAY.lock().unwrap();
    if delay > 0.0 && *TELEMETRY_DELAY_NEEDED.lock().unwrap() {
        let start_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs_f64() - *SYSTEM_START_TIME.lock().unwrap();

        debug!("Start time: {}", start_time);
        if start_time < delay {
            debug!("Delaying telemetry for {} seconds", delay-start_time);
            tokio::time::sleep(std::time::Duration::from_secs_f64(delay-start_time)).await;
        }
        else {
            *TELEMETRY_DELAY_NEEDED.lock().unwrap() = false;
        }
    }

    debug!("Sending telemetry to {}", remote_endpoint);

    let response = CLIENT
        .post(remote_endpoint)
        .header("Content-Type", "application/msgpack")
        .body(data)
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await?;
    let status = response.status();
    if !status.is_success() {
        error!("Ignoring failed telemetry request with status: {}", status);
        return Ok("".to_string());
    }

    let body = response.text().await?;  
    if status == 200 {
        match body.as_str() {
            "restart" => return Err(BrainWaveError::RestartRequired("Restart command received from telemetry server".to_string()).into()),
            "exit" => return Err(BrainWaveError::ExitRequired("Exit command received from telemetry server".to_string()).into()),
            _ => debug!("Telemetry server returned unknown command: {}", body),
        }
    }

    if status == 201 {
        return Ok(body);
    }

    Ok("".to_string())
}

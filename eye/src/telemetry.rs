use reqwest::Client;
use once_cell::sync::Lazy;
use log::{debug, error};
use crate::types::BrainWaveError;

static TELEMETRY_ENDPOINT: Lazy<String> = Lazy::new(|| {
    std::env::var("TELEMETRY_ENDPOINT").unwrap_or_else(|_| "https://bb.antonshmanton.com/telemetry".to_string())
});

static CLIENT: Lazy<Client> = Lazy::new(|| Client::new());

pub async fn send_telemetry(endpoint: &str, data: Vec<u8>, endpoint_override: Option<String>) -> Result<String, BrainWaveError> {
    let remote_endpoint = endpoint_override.unwrap_or(TELEMETRY_ENDPOINT.to_string()) + "/" + endpoint;

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

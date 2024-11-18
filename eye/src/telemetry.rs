use reqwest::Client;
use std::error::Error;
use once_cell::sync::Lazy;
use log::debug;

static TELEMETRY_ENDPOINT: Lazy<String> = Lazy::new(|| {
    std::env::var("TELEMETRY_ENDPOINT").unwrap_or_else(|_| "https://bb.antonshmanton.com/telemetry".to_string())
});

static CLIENT: Lazy<Client> = Lazy::new(|| Client::new());

pub async fn send_telemetry(endpoint: &str, data: Vec<u8>, endpoint_override: Option<String>) -> Result<(), Box<dyn Error>> {
    let remote_endpoint = endpoint_override.unwrap_or(TELEMETRY_ENDPOINT.to_string() + "/" + endpoint);

    debug!("Sending telemetry to {}", remote_endpoint);

    let response = CLIENT
        .post(remote_endpoint)
        .header("Content-Type", "application/msgpack")
        .body(data)
        .timeout(std::time::Duration::from_secs(2))
        .send()
        .await?;
    if !response.status().is_success() {
        return Err(format!("Request failed with status: {}", response.status()).into());
    }

    Ok(())
}

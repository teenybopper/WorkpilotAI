//! Device authentication and token management.
//!
//! Handles pairing with the WorkPilot backend, secure token storage
//! in the OS keychain, and token verification on startup.

use log::{info, error};
use serde::{Deserialize, Serialize};

const KEYRING_SERVICE: &str = "workpilot-companion";
const KEYRING_USERNAME: &str = "device-token";
const BACKEND_BASE_URL_KEY: &str = "backend-url";

/// Default backend URL used when no URL has been stored via pairing.
const DEFAULT_BACKEND_URL: &str = "http://localhost:8000";

#[derive(Debug, Serialize, Deserialize)]
pub struct PairRequest {
    pub device_name: String,
    pub device_platform: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PairResponse {
    pub device_id: String,
    pub device_token: String,
    pub device_name: String,
    pub device_platform: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub device_id: Option<String>,
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatus {
    pub paired: bool,
    pub device_name: Option<String>,
    pub backend_url: Option<String>,
}

/// Store the device token securely in the OS keychain.
fn store_token(token: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USERNAME)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry.set_password(token)
        .map_err(|e| format!("Failed to store token: {}", e))?;
    info!("Device token stored in keychain");
    Ok(())
}

/// Retrieve the device token from the OS keychain.
fn get_stored_token() -> Option<String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USERNAME).ok()?;
    entry.get_password().ok()
}

/// Store the backend URL for subsequent API calls.
fn store_backend_url(url: &str) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, BACKEND_BASE_URL_KEY)
        .map_err(|e| format!("Keyring error: {}", e))?;
    entry.set_password(url)
        .map_err(|e| format!("Failed to store URL: {}", e))?;
    Ok(())
}

/// Get the stored backend URL.
pub fn get_backend_url() -> String {
    let entry = keyring::Entry::new(KEYRING_SERVICE, BACKEND_BASE_URL_KEY).ok();
    entry
        .and_then(|e| e.get_password().ok())
        .unwrap_or_else(|| DEFAULT_BACKEND_URL.to_string())
}

/// Get the stored device token (for API calls).
pub fn get_device_token() -> Option<String> {
    get_stored_token()
}

/// Pair this device with a WorkPilot account.
///
/// 1. Sends device info to the backend `/api/devices/pair`
/// 2. Receives and securely stores the device token
#[tauri::command]
pub async fn pair_device(
    backend_url: String,
    access_token: String,
    device_name: String,
) -> Result<PairResponse, String> {
    let platform = detect_platform();
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/devices/pair", backend_url))
        .header("Authorization", format!("Bearer {}", access_token))
        .json(&PairRequest {
            device_name: device_name.clone(),
            device_platform: platform.clone(),
        })
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Pairing failed ({}): {}", status, body));
    }

    let pair_response: PairResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    // Store token and backend URL securely
    store_token(&pair_response.device_token)?;
    store_backend_url(&backend_url)?;

    info!("Device paired: {} ({})", device_name, platform);
    Ok(pair_response)
}

/// Verify the stored device token with the backend.
#[tauri::command]
pub async fn verify_token() -> Result<VerifyResponse, String> {
    let token = get_stored_token()
        .ok_or_else(|| "No device token stored. Please pair first.".to_string())?;
    let backend_url = get_backend_url();

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/api/devices/verify", backend_url))
        .json(&serde_json::json!({ "device_token": token }))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let verify: VerifyResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    if verify.valid {
        info!("Device token verified successfully");
    } else {
        error!("Device token is invalid or revoked");
    }

    Ok(verify)
}

/// Get the current authentication status.
#[tauri::command]
pub fn get_auth_status() -> AuthStatus {
    let token = get_stored_token();
    AuthStatus {
        paired: token.is_some(),
        device_name: None, // Could be stored alongside token
        backend_url: Some(get_backend_url()),
    }
}

fn detect_platform() -> String {
    if cfg!(target_os = "windows") {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macos".to_string()
    } else {
        "linux".to_string()
    }
}

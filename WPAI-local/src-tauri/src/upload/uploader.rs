//! HTTP upload client — sends audio chunks to the WorkPilot backend.

use super::chunker::AudioChunk;
use crate::auth::device_auth;
use log::{info, debug};
use reqwest::multipart;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct ChunkUploadResponse {
    pub session_id: String,
    pub chunk_index: u32,
    pub chunks_received: u32,
}

#[derive(Debug, Deserialize)]
pub struct SessionCreateResponse {
    pub session_id: String,
    pub status: String,
    pub chunks_received: u32,
}

/// Create a new capture session on the backend.
pub async fn create_session(
    workspace_id: &str,
    title: Option<&str>,
) -> Result<SessionCreateResponse, String> {
    let backend_url = device_auth::get_backend_url();
    let device_token = device_auth::get_device_token()
        .ok_or_else(|| "Not paired — no device token".to_string())?;

    let client = reqwest::Client::new();
    let mut body = serde_json::json!({
        "workspace_id": workspace_id,
        "capture_mode": "local_listener",
        "consent_given": true,
        "device_token": device_token,
        "platform": "system_audio",
    });

    if let Some(t) = title {
        body["title"] = serde_json::Value::String(t.to_string());
    }

    let response = client
        .post(format!("{}/api/capture/session", backend_url))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Session creation failed: {}", body));
    }

    response.json().await.map_err(|e| format!("Parse error: {}", e))
}

/// Upload a single audio chunk to the backend.
pub async fn upload_chunk(
    session_id: &str,
    chunk: &AudioChunk,
) -> Result<ChunkUploadResponse, String> {
    let backend_url = device_auth::get_backend_url();
    let client = reqwest::Client::new();

    let form = multipart::Form::new()
        .text("chunk_index", chunk.index.to_string())
        .part(
            "file",
            multipart::Part::bytes(chunk.data.clone())
                .file_name(format!("chunk_{:06}.wav", chunk.index))
                .mime_str("audio/wav")
                .map_err(|e| format!("MIME error: {}", e))?,
        );

    let response = client
        .post(format!("{}/api/capture/session/{}/chunk", backend_url, session_id))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Upload error: {}", e))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Chunk upload failed: {}", body));
    }

    debug!("Uploaded chunk {} for session {}", chunk.index, session_id);
    response.json().await.map_err(|e| format!("Parse error: {}", e))
}

/// Send a keep-alive heartbeat.
pub async fn send_keepalive(session_id: &str) -> Result<(), String> {
    let backend_url = device_auth::get_backend_url();
    let device_token = device_auth::get_device_token();
    let client = reqwest::Client::new();

    let body = serde_json::json!({
        "device_token": device_token,
    });

    client
        .post(format!("{}/api/capture/session/{}/keepalive", backend_url, session_id))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Keepalive error: {}", e))?;

    Ok(())
}

/// Finalize a capture session (signals end of capture).
pub async fn finalize_session(session_id: &str) -> Result<(), String> {
    let backend_url = device_auth::get_backend_url();
    let client = reqwest::Client::new();

    let response = client
        .post(format!("{}/api/capture/session/{}/finalize", backend_url, session_id))
        .send()
        .await
        .map_err(|e| format!("Finalize error: {}", e))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Finalize failed: {}", body));
    }

    info!("Session {} finalized", session_id);
    Ok(())
}

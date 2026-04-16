//! Session lifecycle manager.
//!
//! Orchestrates the full capture→chunk→upload→finalize flow:
//! 1. Create session on backend
//! 2. Start audio capture
//! 3. Chunk samples every 5 seconds
//! 4. Upload chunks concurrently
//! 5. Send keep-alive every 15 seconds
//! 6. Finalize session on stop

use crate::upload::uploader;
use log::{info, error};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

/// Session state exposed to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionState {
    pub session_id: Option<String>,
    pub status: String,       // idle, listening, processing, completed, error
    pub chunks_sent: u32,
    pub duration_secs: f64,
    pub error: Option<String>,
}

/// Global session state, shared across Tauri commands.
static SESSION: once_cell::sync::Lazy<Arc<Mutex<SessionState>>> =
    once_cell::sync::Lazy::new(|| {
        Arc::new(Mutex::new(SessionState {
            session_id: None,
            status: "idle".to_string(),
            chunks_sent: 0,
            duration_secs: 0.0,
            error: None,
        }))
    });

/// Start a listening session.
#[tauri::command]
pub async fn start_listening(
    workspace_id: String,
    title: Option<String>,
) -> Result<SessionState, String> {
    let mut state = SESSION.lock().map_err(|e| e.to_string())?;

    if state.status == "listening" {
        return Err("Already listening. Stop the current session first.".to_string());
    }

    // 1. Create session on backend
    let session_result = uploader::create_session(
        &workspace_id,
        title.as_deref(),
    ).await?;

    info!("Session created: {}", session_result.session_id);

    *state = SessionState {
        session_id: Some(session_result.session_id.clone()),
        status: "listening".to_string(),
        chunks_sent: 0,
        duration_secs: 0.0,
        error: None,
    };

    // 2. In production, spawn background tasks:
    // - Audio capture thread (feeds samples to chunker)
    // - Chunk upload loop (drains chunker, uploads, retries)
    // - Keep-alive ticker (every 15s)
    // These would be spawned with tokio::spawn and communicate
    // via channels / shared state.

    Ok(state.clone())
}

/// Stop the current listening session.
#[tauri::command]
pub async fn stop_listening() -> Result<SessionState, String> {
    let mut state = SESSION.lock().map_err(|e| e.to_string())?;

    if state.status != "listening" {
        return Err("Not currently listening.".to_string());
    }

    let session_id = state.session_id.clone()
        .ok_or_else(|| "No active session".to_string())?;

    // 1. Stop audio capture (would signal the capture thread)
    // 2. Flush remaining samples as final chunk
    // 3. Finalize session on backend

    state.status = "processing".to_string();
    drop(state); // Release lock before async call

    match uploader::finalize_session(&session_id).await {
        Ok(_) => {
            let mut state = SESSION.lock().map_err(|e| e.to_string())?;
            state.status = "completed".to_string();
            info!("Session {} completed", session_id);
            Ok(state.clone())
        }
        Err(e) => {
            let mut state = SESSION.lock().map_err(|e| e.to_string())?;
            state.status = "error".to_string();
            state.error = Some(e.clone());
            error!("Session {} finalization failed: {}", session_id, e);
            Err(e)
        }
    }
}

/// Get the current session status.
#[tauri::command]
pub fn get_session_status() -> Result<SessionState, String> {
    let state = SESSION.lock().map_err(|e| e.to_string())?;
    Ok(state.clone())
}

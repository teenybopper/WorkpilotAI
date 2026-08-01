//! Session lifecycle manager.
//!
//! Orchestrates the full capture→chunk→upload→finalize flow:
//! 1. Create session on backend
//! 2. Start audio capture
//! 3. Chunk samples every 5 seconds
//! 4. Upload chunks concurrently
//! 5. Send keep-alive every 15 seconds
//! 6. Finalize session on stop

use crate::audio::capture::{DEFAULT_SAMPLE_RATE, DEFAULT_CHANNELS};
use crate::upload::chunker::CHUNK_DURATION_SECS;
use crate::upload::uploader;
use log::{info, error};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

/// Interval in seconds between keep-alive heartbeats sent to the backend.
const KEEPALIVE_INTERVAL_SECS: u64 = 15;

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

struct ActiveSessionResources {
    capture_backend: Option<Box<dyn crate::audio::AudioCaptureBackend>>,
    sample_buffer: Option<crate::audio::SampleBuffer>,
    chunk_task: Option<tokio::task::JoinHandle<()>>,
    keepalive_task: Option<tokio::task::JoinHandle<()>>,
}

static RESOURCES: once_cell::sync::Lazy<Arc<Mutex<ActiveSessionResources>>> =
    once_cell::sync::Lazy::new(|| {
        Arc::new(Mutex::new(ActiveSessionResources {
            capture_backend: None,
            sample_buffer: None,
            chunk_task: None,
            keepalive_task: None,
        }))
    });

/// Helper to perform chunk upload with retry configuration
async fn perform_upload_with_retry(
    session_id: &str,
    chunk: crate::upload::chunker::AudioChunk,
    retry_config: &crate::upload::retry::RetryConfig,
    offline_buffer: &mut crate::upload::retry::OfflineBuffer,
) -> bool {
    let mut attempt = 0;
    loop {
        match uploader::upload_chunk(session_id, &chunk).await {
            Ok(_) => {
                info!("Successfully uploaded chunk {} for session {}", chunk.index, session_id);
                return true;
            }
            Err(e) => {
                attempt += 1;
                error!("Chunk {} upload attempt {} failed: {}", chunk.index, attempt, e);
                if attempt >= retry_config.max_retries {
                    error!("Max retries reached for chunk {}. Buffering to offline cache.", chunk.index);
                    if let Err(err) = offline_buffer.buffer_chunk(session_id, chunk.index, &chunk.data) {
                        error!("Failed to buffer chunk offline: {}", err);
                    }
                    return false;
                }
                let backoff = retry_config.backoff_for(attempt);
                tokio::time::sleep(backoff).await;
            }
        }
    }
}

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

    // 2. Start audio capture
    let mut backend = crate::audio::create_capture_backend();
    let sample_buffer = Arc::new(Mutex::new(Vec::new()));
    let capture_config = crate::audio::CaptureConfig::default();

    backend.start_capture(&capture_config, sample_buffer.clone())?;

    // 3. Spawn background chunker and keepalive tasks
    let session_id = session_result.session_id.clone();
    let session_id_clone = session_id.clone();
    let sample_buffer_clone = sample_buffer.clone();
    let chunk_sample_rate = capture_config.sample_rate;
    let chunk_channels = capture_config.channels;

    let chunk_handle = tokio::spawn(async move {
        use crate::upload::chunker::AudioChunker;
        use crate::upload::retry::{RetryConfig, OfflineBuffer};

        let mut chunker = AudioChunker::new(chunk_sample_rate, chunk_channels);
        let chunk_interval_secs = CHUNK_DURATION_SECS as u64;
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(chunk_interval_secs));
        let retry_config = RetryConfig::default();
        let mut offline_buffer = OfflineBuffer::new();

        loop {
            interval.tick().await;

            let mut samples = Vec::new();
            if let Ok(mut buf) = sample_buffer_clone.lock() {
                if !buf.is_empty() {
                    samples = std::mem::take(&mut *buf);
                }
            }

            if !samples.is_empty() {
                chunker.push_samples(&samples);
            }

            while chunker.has_chunk() {
                if let Some(chunk) = chunker.drain_chunk() {
                    let sid = session_id_clone.clone();
                    let rc = retry_config.clone();
                    
                    let upload_success = perform_upload_with_retry(&sid, chunk, &rc, &mut offline_buffer).await;
                    if upload_success {
                        if let Ok(mut s) = SESSION.lock() {
                            s.chunks_sent += 1;
                            s.duration_secs = s.chunks_sent as f64 * CHUNK_DURATION_SECS as f64;
                        }
                    }
                }
            }
        }
    });

    let session_id_keepalive = session_id.clone();
    let keepalive_handle = tokio::spawn(async move {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(KEEPALIVE_INTERVAL_SECS));
        loop {
            interval.tick().await;
            if let Err(e) = uploader::send_keepalive(&session_id_keepalive).await {
                error!("Keepalive heartbeat failed: {}", e);
            }
        }
    });

    // Save session resources globally for stop handler
    if let Ok(mut res) = RESOURCES.lock() {
        res.capture_backend = Some(backend);
        res.sample_buffer = Some(sample_buffer);
        res.chunk_task = Some(chunk_handle);
        res.keepalive_task = Some(keepalive_handle);
    }

    *state = SessionState {
        session_id: Some(session_id),
        status: "listening".to_string(),
        chunks_sent: 0,
        duration_secs: 0.0,
        error: None,
    };

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

    // 1. Release active capture resources
    let mut capture_backend = None;
    let mut sample_buffer = None;
    let mut chunk_task = None;
    let mut keepalive_task = None;

    if let Ok(mut res) = RESOURCES.lock() {
        capture_backend = res.capture_backend.take();
        sample_buffer = res.sample_buffer.take();
        chunk_task = res.chunk_task.take();
        keepalive_task = res.keepalive_task.take();
    }

    // Stop audio capture device stream
    if let Some(mut backend) = capture_backend {
        if let Err(e) = backend.stop_capture() {
            error!("Error stopping audio capture stream: {}", e);
        }
    }

    // Stop heartbeat task
    if let Some(task) = keepalive_task {
        task.abort();
    }

    // Stop periodic chunking task
    if let Some(task) = chunk_task {
        task.abort();
    }

    // 2. Flush remaining audio samples as a final partial chunk
    let mut remaining_samples = Vec::new();
    if let Some(buf) = sample_buffer {
        if let Ok(mut lock) = buf.lock() {
            remaining_samples = std::mem::take(&mut *lock);
        }
    }

    if !remaining_samples.is_empty() {
        use crate::upload::chunker::AudioChunker;
        let mut chunker = AudioChunker::new(DEFAULT_SAMPLE_RATE, DEFAULT_CHANNELS);
        chunker.push_samples(&remaining_samples);
        if let Some(final_chunk) = chunker.flush() {
            let retry_config = crate::upload::retry::RetryConfig::default();
            let mut offline_buffer = crate::upload::retry::OfflineBuffer::new();
            perform_upload_with_retry(&session_id, final_chunk, &retry_config, &mut offline_buffer).await;
        }
    }

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

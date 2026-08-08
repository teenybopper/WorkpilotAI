//! Retry and offline buffering logic.
//!
//! Handles transient network failures with exponential backoff
//! and buffers chunks to local disk when fully disconnected.

use log::{warn, info};
use std::path::PathBuf;
use std::time::Duration;

/// Maximum number of retry attempts per chunk.
pub const MAX_RETRIES: u32 = 5;

/// Initial backoff duration.
pub const INITIAL_BACKOFF_MS: u64 = 500;

/// Maximum backoff duration.
pub const MAX_BACKOFF_MS: u64 = 30_000;

/// Retry configuration.
#[derive(Debug, Clone)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub initial_backoff: Duration,
    pub max_backoff: Duration,
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: MAX_RETRIES,
            initial_backoff: Duration::from_millis(INITIAL_BACKOFF_MS),
            max_backoff: Duration::from_millis(MAX_BACKOFF_MS),
            backoff_multiplier: 2.0,
        }
    }
}

impl RetryConfig {
    /// Calculate backoff duration for a given attempt number.
    pub fn backoff_for(&self, attempt: u32) -> Duration {
        let ms = self.initial_backoff.as_millis() as f64
            * self.backoff_multiplier.powi(attempt as i32);
        let ms = ms.min(self.max_backoff.as_millis() as f64);
        Duration::from_millis(ms as u64)
    }
}

/// Offline buffer — stores chunks to disk when upload fails.
pub struct OfflineBuffer {
    buffer_dir: PathBuf,
    buffered_count: u32,
}

impl OfflineBuffer {
    pub fn new() -> Self {
        let buffer_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("workpilot-companion")
            .join("offline-buffer");

        if let Err(e) = std::fs::create_dir_all(&buffer_dir) {
            warn!("Failed to create offline buffer dir: {}", e);
        }

        Self {
            buffer_dir,
            buffered_count: 0,
        }
    }

    /// Buffer a chunk to local disk.
    pub fn buffer_chunk(&mut self, session_id: &str, chunk_index: u32, data: &[u8]) -> Result<(), String> {
        let path = self.buffer_dir
            .join(session_id)
            .join(format!("chunk_{:06}.wav", chunk_index));

        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create dir: {}", e))?;
        }

        std::fs::write(&path, data)
            .map_err(|e| format!("Failed to write chunk: {}", e))?;

        self.buffered_count += 1;
        info!("Buffered chunk {} offline (total: {})", chunk_index, self.buffered_count);
        Ok(())
    }

    /// Get all buffered chunks for a session.
    #[allow(dead_code)]
    pub fn get_buffered_sessions(&self) -> Vec<String> {
        let mut sessions = Vec::new();
        if let Ok(entries) = std::fs::read_dir(&self.buffer_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    if let Some(name) = entry.file_name().to_str() {
                        sessions.push(name.to_string());
                    }
                }
            }
        }
        sessions
    }

    /// Count buffered chunks.
    #[allow(dead_code)]
    pub fn buffered_count(&self) -> u32 {
        self.buffered_count
    }
}

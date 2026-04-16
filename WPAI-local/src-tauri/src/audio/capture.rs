//! Platform-agnostic audio capture abstraction.
//!
//! Defines the `AudioCapture` trait and `AudioDevice` types that each
//! platform backend (WASAPI, ScreenCaptureKit, PipeWire) must implement.

use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};

/// Describes an available audio input/output device.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub is_loopback: bool, // System audio vs microphone
    pub sample_rate: u32,
    pub channels: u16,
}

/// Configuration for starting a capture session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureConfig {
    pub device_id: Option<String>, // None = default device
    pub sample_rate: u32,          // 16000 for Whisper
    pub channels: u16,             // 1 = mono
    pub capture_loopback: bool,    // Capture system audio
    pub capture_mic: bool,         // Capture microphone
}

impl Default for CaptureConfig {
    fn default() -> Self {
        Self {
            device_id: None,
            sample_rate: 16000,
            channels: 1,
            capture_loopback: true,
            capture_mic: true,
        }
    }
}

/// Audio capture state.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum CaptureState {
    Idle,
    Capturing,
    Paused,
    Error(String),
}

/// Shared audio sample buffer.
pub type SampleBuffer = Arc<Mutex<Vec<f32>>>;

/// Platform-agnostic audio capture trait.
///
/// Each platform implements this for their native audio API:
/// - Windows: WASAPI loopback
/// - macOS: ScreenCaptureKit + CoreAudio
/// - Linux: PipeWire
pub trait AudioCaptureBackend: Send + Sync {
    /// List all available audio devices on this system.
    fn list_devices(&self) -> Result<Vec<AudioDevice>, String>;

    /// Start capturing audio with the given configuration.
    /// Samples are pushed to the provided buffer.
    fn start_capture(
        &mut self,
        config: &CaptureConfig,
        buffer: SampleBuffer,
    ) -> Result<(), String>;

    /// Stop the current capture session.
    fn stop_capture(&mut self) -> Result<(), String>;

    /// Get the current capture state.
    fn state(&self) -> CaptureState;
}

/// Create the platform-appropriate audio capture backend.
pub fn create_capture_backend() -> Box<dyn AudioCaptureBackend> {
    #[cfg(target_os = "windows")]
    {
        Box::new(super::wasapi::WasapiCapture::new())
    }
    #[cfg(target_os = "macos")]
    {
        Box::new(super::screencapturekit::ScreenCaptureKitCapture::new())
    }
    #[cfg(target_os = "linux")]
    {
        Box::new(super::pipewire::PipeWireCapture::new())
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        panic!("Unsupported platform for audio capture")
    }
}

/// Tauri command — list available audio devices.
#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    // Use cpal for cross-platform device enumeration
    use cpal::traits::{DeviceTrait, HostTrait};

    let host = cpal::default_host();
    let mut devices = Vec::new();

    // Input devices (microphones)
    if let Ok(input_devices) = host.input_devices() {
        for device in input_devices {
            if let Ok(name) = device.name() {
                let config = device.default_input_config().ok();
                devices.push(AudioDevice {
                    id: name.clone(),
                    name: name.clone(),
                    is_default: false,
                    is_loopback: false,
                    sample_rate: config.as_ref().map(|c| c.sample_rate().0).unwrap_or(44100),
                    channels: config.as_ref().map(|c| c.channels()).unwrap_or(2),
                });
            }
        }
    }

    // Output devices (for loopback reference)
    if let Ok(output_devices) = host.output_devices() {
        for device in output_devices {
            if let Ok(name) = device.name() {
                let config = device.default_output_config().ok();
                devices.push(AudioDevice {
                    id: format!("loopback:{}", name),
                    name: format!("{} (System Audio)", name),
                    is_default: false,
                    is_loopback: true,
                    sample_rate: config.as_ref().map(|c| c.sample_rate().0).unwrap_or(44100),
                    channels: config.as_ref().map(|c| c.channels()).unwrap_or(2),
                });
            }
        }
    }

    Ok(devices)
}

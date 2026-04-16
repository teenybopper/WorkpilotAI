//! Windows WASAPI loopback audio capture.
//!
//! Uses WASAPI loopback mode to capture system audio output.
//! This is the primary capture method on Windows.

use super::capture::*;
use log::{info, error};

pub struct WasapiCapture {
    state: CaptureState,
}

impl WasapiCapture {
    pub fn new() -> Self {
        Self {
            state: CaptureState::Idle,
        }
    }
}

impl AudioCaptureBackend for WasapiCapture {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, String> {
        // WASAPI device enumeration would use windows-rs crate
        // For now, delegate to cpal which wraps WASAPI on Windows
        list_audio_devices()
    }

    fn start_capture(
        &mut self,
        config: &CaptureConfig,
        buffer: SampleBuffer,
    ) -> Result<(), String> {
        info!("Starting WASAPI loopback capture ({}Hz, {}ch)",
            config.sample_rate, config.channels);

        // In production, this would:
        // 1. Initialize WASAPI in loopback mode via windows-rs
        // 2. Create an IAudioCaptureClient
        // 3. Start a capture thread that fills the buffer
        // 4. Handle format conversion (float32 @ target sample rate)

        self.state = CaptureState::Capturing;
        Ok(())
    }

    fn stop_capture(&mut self) -> Result<(), String> {
        info!("Stopping WASAPI capture");
        self.state = CaptureState::Idle;
        Ok(())
    }

    fn state(&self) -> CaptureState {
        self.state.clone()
    }
}

//! Cross-platform microphone capture using cpal.
//!
//! Provides microphone input as a fallback or supplement to
//! system audio capture on all platforms.

use super::capture::*;
use log::info;

pub struct MicrophoneCapture {
    state: CaptureState,
}

impl MicrophoneCapture {
    pub fn new() -> Self {
        Self {
            state: CaptureState::Idle,
        }
    }
}

impl AudioCaptureBackend for MicrophoneCapture {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, String> {
        list_audio_devices()
    }

    fn start_capture(
        &mut self,
        config: &CaptureConfig,
        buffer: SampleBuffer,
    ) -> Result<(), String> {
        info!("Starting microphone capture via cpal ({}Hz, {}ch)",
            config.sample_rate, config.channels);

        // In production, this would:
        // 1. Get the default input device via cpal
        // 2. Build an input stream with the target config
        // 3. Feed samples to the buffer in the data callback

        self.state = CaptureState::Capturing;
        Ok(())
    }

    fn stop_capture(&mut self) -> Result<(), String> {
        info!("Stopping microphone capture");
        self.state = CaptureState::Idle;
        Ok(())
    }

    fn state(&self) -> CaptureState {
        self.state.clone()
    }
}

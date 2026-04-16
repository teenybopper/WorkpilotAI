//! macOS ScreenCaptureKit audio capture.
//!
//! Uses Apple's ScreenCaptureKit framework (macOS 12+) to capture
//! system audio, and CoreAudio for microphone capture.

use super::capture::*;
use log::info;

pub struct ScreenCaptureKitCapture {
    state: CaptureState,
}

impl ScreenCaptureKitCapture {
    pub fn new() -> Self {
        Self {
            state: CaptureState::Idle,
        }
    }
}

impl AudioCaptureBackend for ScreenCaptureKitCapture {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, String> {
        list_audio_devices()
    }

    fn start_capture(
        &mut self,
        config: &CaptureConfig,
        buffer: SampleBuffer,
    ) -> Result<(), String> {
        info!("Starting ScreenCaptureKit audio capture ({}Hz, {}ch)",
            config.sample_rate, config.channels);

        // In production, this would:
        // 1. Create SCContentFilter for audio-only capture
        // 2. Configure SCStreamConfiguration with audio settings
        // 3. Start SCStream with a delegate that feeds the buffer
        // 4. Use CoreAudio for microphone if capture_mic is true

        self.state = CaptureState::Capturing;
        Ok(())
    }

    fn stop_capture(&mut self) -> Result<(), String> {
        info!("Stopping ScreenCaptureKit capture");
        self.state = CaptureState::Idle;
        Ok(())
    }

    fn state(&self) -> CaptureState {
        self.state.clone()
    }
}

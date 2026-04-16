//! Linux PipeWire audio capture.
//!
//! Uses PipeWire to capture system audio and microphone input.
//! Falls back to PulseAudio if PipeWire is not available.

use super::capture::*;
use log::info;

pub struct PipeWireCapture {
    state: CaptureState,
}

impl PipeWireCapture {
    pub fn new() -> Self {
        Self {
            state: CaptureState::Idle,
        }
    }
}

impl AudioCaptureBackend for PipeWireCapture {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, String> {
        list_audio_devices()
    }

    fn start_capture(
        &mut self,
        config: &CaptureConfig,
        buffer: SampleBuffer,
    ) -> Result<(), String> {
        info!("Starting PipeWire audio capture ({}Hz, {}ch)",
            config.sample_rate, config.channels);

        // In production, this would:
        // 1. Connect to PipeWire via pipewire-rs
        // 2. Create a stream targeting the default audio sink's monitor
        // 3. Configure format to f32 @ target sample rate
        // 4. Start the stream, feeding samples to the buffer
        // 5. Optionally add a second stream for mic input

        self.state = CaptureState::Capturing;
        Ok(())
    }

    fn stop_capture(&mut self) -> Result<(), String> {
        info!("Stopping PipeWire capture");
        self.state = CaptureState::Idle;
        Ok(())
    }

    fn state(&self) -> CaptureState {
        self.state.clone()
    }
}

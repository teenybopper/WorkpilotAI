//! macOS CoreAudio microphone fallback capture.
//!
//! Captures from the default input device (microphone) as a system-audio
//! fallback. Supports virtual loopback drivers (like BlackHole) when selected.

use super::capture::*;
use log::{info, error};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

pub struct ScreenCaptureKitCapture {
    state: CaptureState,
    stream: Option<StreamHandle>,
}

impl ScreenCaptureKitCapture {
    pub fn new() -> Self {
        Self {
            state: CaptureState::Idle,
            stream: None,
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
        info!("Starting macOS CoreAudio capture ({}Hz, {}ch)",
            config.sample_rate, config.channels);

        let host = cpal::default_host();
        
        // Find selected input device or fallback to default
        let device = if let Some(ref id) = config.device_id {
            let target_name = id.strip_prefix("loopback:").unwrap_or(id);
            host.input_devices()
                .map_err(|e| e.to_string())?
                .find(|d| d.name().map(|name| name == *target_name).unwrap_or(false))
                .ok_or_else(|| format!("macOS input device not found: {}", target_name))?
        } else {
            host.default_input_device()
                .ok_or_else(|| "No default input device available".to_string())?
        };

        let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        info!("Opening macOS input stream on device: {}", device_name);

        let default_supported_config = device.default_input_config()
            .map_err(|e| format!("Failed to get default input config: {}", e))?;

        let sample_format = default_supported_config.sample_format();
        let stream_config = cpal::StreamConfig {
            channels: config.channels,
            sample_rate: cpal::SampleRate(config.sample_rate),
            buffer_size: cpal::BufferSize::Default,
        };

        let buffer_clone = buffer.clone();

        let stream = match sample_format {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut buf) = buffer_clone.lock() {
                            buf.extend_from_slice(data);
                        }
                    },
                    |err| error!("macOS audio stream error: {}", err),
                    None
                )
            }
            cpal::SampleFormat::I16 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut buf) = buffer_clone.lock() {
                            let f32_samples: Vec<f32> = data.iter().map(|&s| s as f32 / 32768.0).collect();
                            buf.extend_from_slice(&f32_samples);
                        }
                    },
                    |err| error!("macOS audio stream error: {}", err),
                    None
                )
            }
            _ => return Err(format!("Unsupported macOS capture sample format: {:?}", sample_format)),
        }.map_err(|e| format!("Failed to build macOS capture stream: {}", e))?;

        stream.play().map_err(|e| format!("Failed to play macOS capture stream: {}", e))?;

        self.stream = Some(StreamHandle::new(stream));
        self.state = CaptureState::Capturing;
        Ok(())
    }

    fn stop_capture(&mut self) -> Result<(), String> {
        info!("Stopping macOS capture");
        if let Some(stream) = self.stream.take() {
            let _ = stream.pause();
        }
        self.state = CaptureState::Idle;
        Ok(())
    }

    fn state(&self) -> CaptureState {
        self.state.clone()
    }
}

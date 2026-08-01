//! Windows WASAPI loopback audio capture.
//!
//! Uses WASAPI loopback mode to capture system audio output.
//! This is the primary capture method on Windows.

use super::capture::*;
use log::{info, error};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

pub struct WasapiCapture {
    state: CaptureState,
    stream: Option<cpal::Stream>,
}

impl WasapiCapture {
    pub fn new() -> Self {
        Self {
            state: CaptureState::Idle,
            stream: None,
        }
    }
}

impl AudioCaptureBackend for WasapiCapture {
    fn list_devices(&self) -> Result<Vec<AudioDevice>, String> {
        list_audio_devices()
    }

    fn start_capture(
        &mut self,
        config: &CaptureConfig,
        buffer: SampleBuffer,
    ) -> Result<(), String> {
        info!("Starting WASAPI loopback capture ({}Hz, {}ch)",
            config.sample_rate, config.channels);

        let host = cpal::default_host();
        
        // Find output device corresponding to the loopback target
        let device = if let Some(ref id) = config.device_id {
            let target_name = id.strip_prefix("loopback:").unwrap_or(id);
            host.output_devices()
                .map_err(|e| e.to_string())?
                .find(|d| d.name().map(|name| name == *target_name).unwrap_or(false))
                .ok_or_else(|| format!("Output device not found for loopback: {}", target_name))?
        } else {
            host.default_output_device()
                .ok_or_else(|| "No default output device available for loopback".to_string())?
        };

        let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        info!("Opening loopback stream on output device: {}", device_name);

        // Retrieve default configuration for output format
        let default_supported_config = device.default_output_config()
            .map_err(|e| format!("Failed to get default output config: {}", e))?;

        let sample_format = default_supported_config.sample_format();
        let stream_config = cpal::StreamConfig {
            channels: config.channels,
            sample_rate: cpal::SampleRate(config.sample_rate),
            buffer_size: cpal::BufferSize::Default,
        };

        let buffer_clone = buffer.clone();

        // Building an input stream on an output device triggers WASAPI loopback automatically in cpal.
        let stream = match sample_format {
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        if let Ok(mut buf) = buffer_clone.lock() {
                            buf.extend_from_slice(data);
                        }
                    },
                    |err| error!("WASAPI loopback stream error: {}", err),
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
                    |err| error!("WASAPI loopback stream error: {}", err),
                    None
                )
            }
            _ => return Err(format!("Unsupported WASAPI loopback sample format: {:?}", sample_format)),
        }.map_err(|e| format!("Failed to build WASAPI input stream on output device: {}", e))?;

        stream.play().map_err(|e| format!("Failed to play WASAPI loopback stream: {}", e))?;

        self.stream = Some(stream);
        self.state = CaptureState::Capturing;
        Ok(())
    }

    fn stop_capture(&mut self) -> Result<(), String> {
        info!("Stopping WASAPI capture");
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

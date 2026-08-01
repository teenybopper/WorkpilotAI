//! Linux PipeWire/PulseAudio audio capture.
//!
//! Uses PipeWire/PulseAudio monitor devices to capture system audio.
//! Falls back to default input if PipeWire is not available.

use super::capture::*;
use log::{info, error};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};

pub struct PipeWireCapture {
    state: CaptureState,
    stream: Option<cpal::Stream>,
}

impl PipeWireCapture {
    pub fn new() -> Self {
        Self {
            state: CaptureState::Idle,
            stream: None,
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
        info!("Starting Linux PipeWire/PulseAudio capture ({}Hz, {}ch)",
            config.sample_rate, config.channels);

        let host = cpal::default_host();
        
        // Find input monitor device or fallback
        let device = if let Some(ref id) = config.device_id {
            let target_name = id.strip_prefix("loopback:").unwrap_or(id);
            let input_devices = host.input_devices().map_err(|e| e.to_string())?;
            let mut found_device = None;
            
            for d in input_devices {
                if let Ok(name) = d.name() {
                    // On Linux (PulseAudio/PipeWire), monitor devices capture system output.
                    // They typically contain the output device name and the word "monitor".
                    if name.contains(target_name) && (name.to_lowercase().contains("monitor") || name.to_lowercase().contains("output")) {
                        found_device = Some(d);
                        break;
                    }
                }
            }

            if let Some(d) = found_device {
                d
            } else {
                // Try matching exact input device
                host.input_devices()
                    .map_err(|e| e.to_string())?
                    .find(|d| d.name().map(|name| name == *target_name).unwrap_or(false))
                    .ok_or_else(|| format!("Linux input device or monitor not found for: {}", target_name))?
            }
        } else {
            // Find default monitor device if possible, or fallback to default input
            let input_devices = host.input_devices().map_err(|e| e.to_string())?;
            let mut default_monitor = None;
            for d in input_devices {
                if let Ok(name) = d.name() {
                    if name.to_lowercase().contains("monitor") {
                        default_monitor = Some(d);
                        break;
                    }
                }
            }
            if let Some(d) = default_monitor {
                d
            } else {
                host.default_input_device()
                    .ok_or_else(|| "No default input device available".to_string())?
            }
        };

        let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());
        info!("Opening Linux capture stream on device: {}", device_name);

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
                    |err| error!("Linux audio stream error: {}", err),
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
                    |err| error!("Linux audio stream error: {}", err),
                    None
                )
            }
            _ => return Err(format!("Unsupported Linux capture sample format: {:?}", sample_format)),
        }.map_err(|e| format!("Failed to build Linux capture stream: {}", e))?;

        stream.play().map_err(|e| format!("Failed to play Linux capture stream: {}", e))?;

        self.stream = Some(stream);
        self.state = CaptureState::Capturing;
        Ok(())
    }

    fn stop_capture(&mut self) -> Result<(), String> {
        info!("Stopping PipeWire capture");
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

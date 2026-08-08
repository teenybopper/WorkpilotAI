//! Audio chunker — splits PCM samples into WAV chunks.
//!
//! Buffers audio samples and produces WAV-encoded chunks every
//! `CHUNK_DURATION_SECS` seconds for upload.

use crate::audio::capture::{DEFAULT_SAMPLE_RATE, DEFAULT_CHANNELS};
use hound::{WavSpec, WavWriter};
use log::debug;
use std::io::Cursor;

/// Duration of each audio chunk in seconds.
pub const CHUNK_DURATION_SECS: f32 = 5.0;

/// WAV specification for Whisper-compatible audio.
#[allow(dead_code)]
pub fn wav_spec() -> WavSpec {
    WavSpec {
        channels: DEFAULT_CHANNELS,
        sample_rate: DEFAULT_SAMPLE_RATE,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    }
}

/// Audio chunk ready for upload.
#[derive(Debug)]
pub struct AudioChunk {
    pub index: u32,
    pub data: Vec<u8>,  // WAV-encoded bytes
    #[allow(dead_code)]
    pub duration_secs: f32,
    pub sample_count: usize,
}

/// Chunker state machine — buffers samples and produces chunks.
pub struct AudioChunker {
    buffer: Vec<f32>,
    sample_rate: u32,
    channels: u16,
    chunk_index: u32,
    samples_per_chunk: usize,
}

impl AudioChunker {
    pub fn new(sample_rate: u32, channels: u16) -> Self {
        let samples_per_chunk = (CHUNK_DURATION_SECS * sample_rate as f32) as usize * channels as usize;
        Self {
            buffer: Vec::with_capacity(samples_per_chunk * 2),
            sample_rate,
            channels,
            chunk_index: 0,
            samples_per_chunk,
        }
    }

    /// Push new samples into the buffer.
    pub fn push_samples(&mut self, samples: &[f32]) {
        self.buffer.extend_from_slice(samples);
    }

    /// Check if a complete chunk is available.
    pub fn has_chunk(&self) -> bool {
        self.buffer.len() >= self.samples_per_chunk
    }

    /// Drain one chunk from the buffer, encoding as WAV.
    pub fn drain_chunk(&mut self) -> Option<AudioChunk> {
        if self.buffer.len() < self.samples_per_chunk {
            return None;
        }

        let samples: Vec<f32> = self.buffer.drain(..self.samples_per_chunk).collect();
        let wav_data = encode_wav(&samples, self.sample_rate, self.channels);

        let chunk = AudioChunk {
            index: self.chunk_index,
            data: wav_data,
            duration_secs: CHUNK_DURATION_SECS,
            sample_count: samples.len(),
        };

        self.chunk_index += 1;
        debug!("Produced chunk {} ({} samples)", chunk.index, chunk.sample_count);
        Some(chunk)
    }

    /// Flush remaining samples as a final partial chunk.
    pub fn flush(&mut self) -> Option<AudioChunk> {
        if self.buffer.is_empty() {
            return None;
        }

        let samples: Vec<f32> = self.buffer.drain(..).collect();
        let duration = samples.len() as f32 / (self.sample_rate as f32 * self.channels as f32);
        let wav_data = encode_wav(&samples, self.sample_rate, self.channels);

        let chunk = AudioChunk {
            index: self.chunk_index,
            data: wav_data,
            duration_secs: duration,
            sample_count: samples.len(),
        };

        self.chunk_index += 1;
        debug!("Flushed final chunk {} ({} samples, {:.1}s)", chunk.index, chunk.sample_count, duration);
        Some(chunk)
    }

    /// Get the current chunk index (number of chunks produced).
    #[allow(dead_code)]
    pub fn chunks_produced(&self) -> u32 {
        self.chunk_index
    }
}

/// Encode PCM samples as a WAV file in memory.
fn encode_wav(samples: &[f32], sample_rate: u32, channels: u16) -> Vec<u8> {
    let mut cursor = Cursor::new(Vec::new());
    let spec = WavSpec {
        channels,
        sample_rate,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };

    let mut writer = WavWriter::new(&mut cursor, spec)
        .expect("Failed to create WAV writer");

    for &sample in samples {
        writer.write_sample(sample).expect("Failed to write sample");
    }

    writer.finalize().expect("Failed to finalize WAV");
    cursor.into_inner()
}

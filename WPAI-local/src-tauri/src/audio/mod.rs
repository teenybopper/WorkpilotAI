//! Audio capture — platform abstraction and device management.

pub mod capture;
#[cfg(target_os = "windows")]
pub mod wasapi;
#[cfg(target_os = "macos")]
pub mod screencapturekit;
#[cfg(target_os = "linux")]
pub mod pipewire;
pub mod microphone;

pub use capture::*;


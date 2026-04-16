//! Audio capture — platform abstraction and device management.

pub mod capture;
pub mod wasapi;
pub mod screencapturekit;
pub mod pipewire;
pub mod microphone;

pub use capture::*;

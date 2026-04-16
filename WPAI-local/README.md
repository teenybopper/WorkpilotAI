# WPAI-local — WorkPilot AI Local Companion

Cross-platform Tauri desktop application for secure, local meeting audio capture.

## Architecture

The companion runs as a **system tray application** that:
1. **Captures** system audio (and optionally microphone) during meetings
2. **Chunks** audio into 5-second WAV segments
3. **Uploads** chunks to the WorkPilot backend in real-time
4. **Retries** with exponential backoff on network failures
5. **Buffers** to local disk when fully disconnected

## Audio Backends

| Platform | System Audio | Microphone |
|----------|-------------|------------|
| Windows  | WASAPI Loopback | WASAPI |
| macOS    | ScreenCaptureKit | CoreAudio |
| Linux    | PipeWire | PipeWire |

## Project Structure

```
src-tauri/src/
├── main.rs           # Tauri entry point
├── auth/             # Device pairing & token storage (OS keychain)
├── audio/            # Platform audio capture abstraction
│   ├── capture.rs    # AudioCaptureBackend trait
│   ├── wasapi.rs     # Windows WASAPI
│   ├── screencapturekit.rs  # macOS
│   ├── pipewire.rs   # Linux
│   └── microphone.rs # Cross-platform mic (cpal)
├── upload/           # Network & storage
│   ├── chunker.rs    # PCM → WAV chunk encoder
│   ├── uploader.rs   # HTTP multipart upload client
│   └── retry.rs      # Exponential backoff + offline buffer
├── session/          # Session lifecycle manager
└── tray/             # System tray icon & menu
```

## Backend API Contract

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/devices/pair` | POST | Pair device with user account |
| `/api/devices/verify` | POST | Verify stored device token |
| `/api/capture/session` | POST | Create capture session |
| `/api/capture/session/{id}/chunk` | POST | Upload audio chunk |
| `/api/capture/session/{id}/keepalive` | POST | Heartbeat |
| `/api/capture/session/{id}/finalize` | POST | End session, trigger pipeline |

## Development

### Prerequisites
- Rust toolchain (rustup)
- Tauri CLI: `cargo install tauri-cli`
- Platform audio libraries (see Tauri prerequisites)

### Build
```bash
# Development
cargo tauri dev

# Production
cargo tauri build
```

## Security

- Device tokens are stored in the **OS keychain** (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Audio data is transmitted over HTTPS
- No screen capture, no video — audio only
- User must explicitly grant consent before capture starts

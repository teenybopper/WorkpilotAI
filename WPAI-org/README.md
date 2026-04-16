# WPAI-org — WorkPilot AI Organization Bot Service

Provider-adapter-based meeting bot service for organization accounts.

## Architecture

The bot service implements a **provider-adapter pattern** where each meeting provider
(Google Meet, Microsoft Teams, Slack, Discord) has a dedicated adapter implementing
a common `ProviderAdapter` ABC. The service receives session requests from the main
WorkPilot backend, joins meetings as a visible bot, captures audio, and streams it
back to the backend for processing.

## Provider Adapters

| Provider | Adapter | Status |
|----------|---------|--------|
| Google Meet | `GoogleMeetAdapter` | Contract ready |
| Microsoft Teams | `MicrosoftTeamsAdapter` | Contract ready |
| Slack | `SlackAdapter` | Contract ready |
| Discord | `DiscordAdapter` | Contract ready |

Each adapter implements:
```
authenticate → join_meeting → start_audio_capture → [audio_stream] → stop_audio_capture → leave_meeting
```

## Project Structure

```
src/wpai_org/
├── main.py              # FastAPI service entry
├── config.py            # Configuration (env-based)
├── auth/
│   └── bot_auth.py      # Token verification with backend
├── adapters/
│   ├── base.py          # Abstract ProviderAdapter
│   ├── google_meet.py   # Google Meet adapter
│   ├── microsoft_teams.py  # Teams adapter
│   ├── slack.py         # Slack adapter
│   └── discord.py       # Discord adapter
├── session/
│   └── manager.py       # Session lifecycle orchestrator
├── audio/
│   ├── ingestion.py     # Audio frame capture
│   ├── chunker.py       # Frame → WAV chunk encoding
│   └── uploader.py      # HTTP upload to backend
└── events/
    └── state.py         # Session state tracking
```

## Backend API Contract

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/bot-service/verify` | POST | Verify bot service token |
| `/api/capture/session` | POST | Create capture session |
| `/api/capture/session/{id}/chunk` | POST | Upload audio chunk |
| `/api/capture/session/{id}/keepalive` | POST | Heartbeat |
| `/api/capture/session/{id}/finalize` | POST | End session, trigger pipeline |

## Development

```bash
# Install
pip install -e ".[dev]"

# Run
uvicorn wpai_org.main:app --port 8001 --reload

# Test
pytest
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WPAI_ORG_BACKEND_URL` | `http://localhost:8000` | Main backend URL |
| `WPAI_ORG_BOT_SERVICE_TOKEN` | — | Bot service auth token |
| `WPAI_ORG_PORT` | `8001` | Service port |
| `WPAI_ORG_BOT_DISPLAY_NAME` | `WorkPilot Bot` | Bot name in meetings |
| `WPAI_ORG_CHUNK_DURATION_SECS` | `5.0` | Audio chunk interval |

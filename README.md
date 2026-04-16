# WorkPilot AI

**Agentic Work Orchestration Platform** — DocOps + MeetOps + ActionOps

Upload documents and meeting recordings. WorkPilot AI extracts decisions, tasks, blockers, and follow-ups — then connects everything with cross-source intelligence and executes workflows through integrations.

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    User Workspace (React 19)                    │
├─────────────┬─────────────┬─────────────┬──────────────┬────────┤
│ Auth & Orgs │   DocOps    │   MeetOps   │  ActionOps   │Settings│
├─────────────┴─────────────┴─────────────┴──────────────┴────────┤
│                      FastAPI Control Plane                      │
│        JWT Auth · Multi-Tenancy  · Plan Entitlements            │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   DocOps    │   MeetOps   │ Intelligence│       ActionOps       │
│   Copilot   │   Copilot   │    Layer    │          MCP          │
│  (Docling)  │  (Whisper)  │  (OpenAI)   │(External Integrations)│
├─────────────┴─────────────┴─────────────┴───────────────────────┤
│            PostgreSQL 16 · Qdrant · MinIO Workspace             │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer            | Technology                                    |
|------------------|-----------------------------------------------|
| Backend          | FastAPI, SQLAlchemy, uv                       |
| Authentication   | JWT, bcrypt, passlib, python-jose             |
| Document parsing | Docling                                       |
| Transcription    | faster-whisper                                |
| Diarization      | pyannote.audio                                |
| Vector search    | Qdrant                                        |
| Database         | PostgreSQL 16                                 |
| Object storage   | MinIO                                         |
| LLM              | OpenAI (gpt-4o-mini)                          |
| Embeddings       | sentence-transformers (all-MiniLM-L6-v2)      |
| Frontend         | React 19, Vite 8, Tailwind CSS v4             |

## 🚀 Quickstart

### 1. Start Infrastructure Dependencies
WorkPilot runs entirely natively on your local machine.

```bash
# Start MinIO, Qdrant, and Redis natively in the background
./start_infra.sh

# To stop the infrastructure later:
./stop_infra.sh
```

### 2. Backend (FastAPI + Agentic Framework)
```bash
cd backend
# Backend dependencies and server are managed entirely using `uv`
uv sync
uv run uvicorn app.main:app --reload
```

# Run the server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Key Modules

### Auth & Multi-Tenancy
- **Accounts**: Individual and Organization profiles.
- **Entitlements**: Plan-based restrictions (Free, Pro, Business, Enterprise) governing limits and capabilities.
- **Onboarding**: Secure JWT-based auth and invite-code member registration.

### MeetOps
- **Bot Join**: AI assistant joins web-conferencing URLs directly.
- **Local Listener**: Completely on-device audio capture without joining a room.
- AI generates transcripts, diarizes speakers, and extracts actionable insights.

### ActionOps (Integrations Hub)
- **External Connections**: API bridging for tools like Jira, ClickUp, Notion, Slack.
- **Three-Stage Approvals**:
  - `Light`: AI executes automations transparently.
  - `Medium`: AI executes and issues a notification.
  - `Heavy`: AI prepares the payload and explicitly halts until user approval.
  
For more technical details, please refer to the `architecture.md` file.

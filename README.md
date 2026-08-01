# WorkPilot AI

**Local Agentic Work Orchestration Platform** — DocOps + MeetOps + ActionOps

WorkPilot AI is a privacy-first, on-device AI assistant that runs locally on your computer. Upload documents, ingest meeting recordings, or capture live meeting audio directly from your desktop. WorkPilot AI extracts decisions, tasks, blockers, risks, and follow-ups — then builds cross-source intelligence and executes automated workflows through integrations.

## 🏗 Architecture

```text
┌──────────────────────────────────────────────────────────────────┐
│              WorkPilot AI Web App (React 19 + Vite)              │
│       Dashboard · DocOps · MeetOps · ActionOps · Integrations    │
└────────────────────────────────┬─────────────────────────────────┘
                                 │ HTTP REST / WebSocket
┌────────────────────────────────▼─────────────────────────────────┐
│                     FastAPI Control Plane                        │
│            Local Session Manager · RAG Engine · MCP Engine           │
├───────────────┬────────────────┬─────────────────┬───────────────┤
│    DocOps     │    MeetOps     │  Intelligence   │   ActionOps   │
│   (Docling)   │(Faster-Whisper │     Layer       │ (Jira, Slack, │
│               │ & Pyannote)    │(OpenAI+ChromaDB)│ GDocs, Email) │
├───────────────┴────────────────┴─────────────────┴───────────────┤
│       SQLite (`workpilot.db`) · ChromaDB · Local Filesystem      │
└────────────────────────────────▲─────────────────────────────────┘
                                 │ HTTP Audio Chunks (5s WAV)
┌────────────────────────────────┴─────────────────────────────────┐
│            WPAI-local Desktop Companion (Tauri v2 + Rust)        │
│       System Tray · WASAPI / SCK / PipeWire · Offline Buffer     │
└──────────────────────────────────────────────────────────────────┘
```

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy, `uv` package manager |
| **Desktop Companion** | Tauri v2, Rust (`cpal`, WASAPI, ScreenCaptureKit, PipeWire) |
| **Document Parsing** | Docling (`docling`) |
| **ASR Transcription** | `faster-whisper` (`base` model) |
| **Speaker Diarization** | `pyannote.audio` (`speaker-diarization-3.1`) |
| **Vector DB** | ChromaDB (embedded in-memory / disk persistence) |
| **Database** | SQLite (`~/WorkPilotAI/data/workpilot.db`) |
| **Storage** | Local Filesystem (`~/WorkPilotAI/files`) |
| **LLM & Embeddings** | OpenAI (GPT-4o-mini / GPT-4o), sentence-transformers (`all-MiniLM-L6-v2`) |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide Icons |

---

## 🚀 Quickstart

### Prerequisites
- **Python 3.12+** & **uv** (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Node.js 18+** & **npm**
- **Rust Toolchain** & **Tauri CLI** (for building the local desktop companion)
- **OpenAI API Key** (configured in Settings or `.env`)

### 1. Backend (FastAPI Control Plane)
```bash
cd backend

# Synchronize dependencies with uv
uv sync

# Run the FastAPI server
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend (React SPA)
```bash
cd frontend

# Install node dependencies
npm install

# Start development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. WPAI-local Desktop Companion (Optional for Live Audio Capture)
```bash
cd WPAI-local

# Launch Tauri companion in dev mode
cargo tauri dev
```

---

## 🔑 Key Modules

### 📄 DocOps (Document Intelligence)
- **Docling Integration**: Converts PDF, DOCX, and PPTX files into structured Markdown and table representations.
- **Entity Extraction**: Automatically identifies people, dates, monetary amounts, deadlines, clauses, and obligations.
- **RAG Document Search**: Instant semantic Q&A across workspace documents powered by embedded ChromaDB.
- **Document Comparison**: Line-by-line diffing with AI-synthesized change summaries and risk flags.

### 🎙 MeetOps (Meeting Operations)
- **Pre-recorded Audio Ingestion**: Upload WAV, MP3, M4A, OGG, or WebM meeting files.
- **Live Local Audio Capture**: Desktop companion captures system audio output and microphone in real time.
- **ASR & Diarization**: Transcribes speech with `faster-whisper` and labels distinct speakers using `pyannote.audio`.
- **Insight Extraction**: Automated extraction of tasks (with owners/due dates), binding decisions, blockers, risks, unresolved questions, and concise meeting summaries.

### ⚡ ActionOps (Agentic Execution Hub)
- **Action Plan Generation**: Scans extracted meeting/document evidence and formulates concrete action plans.
- **1-Click Human-in-the-Loop Governance**: Review proposed actions with risk levels, edit payloads/owners, and approve or reject before execution.
- **MCP Adapter Integrations**: Connects to Jira, Slack, Google Docs, and Email to trigger automated ticket creation, message dispatch, and document creation.

---

For technical architectural details and flow diagrams, please see [`architecture.md`](file:///home/mayank/Documents/personal/workpilotAI/architecture.md) and [`architecture_flowchart.md`](file:///home/mayank/Documents/personal/workpilotAI/architecture_flowchart.md).


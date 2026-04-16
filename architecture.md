# System Architecture

WorkPilot AI is designed as a centralized agentic work orchestration platform. 

## Technology Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Alembic, uv
- **Frontend**: React 19, Vite, Tailwind CSS v4
- **Database**: PostgreSQL 16
- **Vector DB**: Qdrant
- **Object Storage**: MinIO
- **AI Models**: GPT-4o-mini (LLM), Faster-Whisper (ASR), Pyannote (Diarization), Docling (Document Parsing)

## Database Schema (PostgreSQL)

The platform is built on a multi-tenant relational schema:

1. **Authentication & Multi-Tenancy**:
   - `User`: Base identity (email, password_hash, account_type).
   - `Organization`: Workspace containers featuring plan tiers (Free, Pro, Business, Enterprise) and seat limits.
   - `OrganizationMember`: Tracks User-Org roles (Admin, Member, Viewer).
   - `InviteCode` & `RefreshToken`: For stateless and stateful authentication flows.

2. **Core Data layer**:
   - `Workspace`: Bounded contexts belonging to either Users or Organizations.
   - `Source`: Raw ingested files (Documents vs. Audio/Video Meetings) held in MinIO.

3. **Intelligence layer**:
   - `DocumentVersion`: Extracted Markdown structure from documents.
   - `TranscriptSegment`: Speaker-diarized text generated from Whisper.
   - `Speaker`: Meeting participant metadata.
   - `Task`, `Decision`, `RiskFlag`: Details extracted by the LLM.

4. **Automation layer (ActionOps)**:
   - `ConnectedTool`: External OAuth / API token registry for integrations (Jira, Notion, Slack).
   - `ActionItem`: Agentic tasks proposed by the LLM natively containing a `target_tool_id`.
   - `ActionExecution`: Audit history of executed webhook/MCP payloads.

## System Workflow & Modules

### 1. DocOps (Document Operations)
- **Ingestion**: PDFs/Docx uploaded to `/api/documents/upload`.
- **Parsing**: `Docling` processes files locally into structured JSON and semantic Markdown.
- **Embedding**: Sentence Transformers vectorize sentences into Qdrant for granular Retrieval Augmented Generation (RAG).

### 2. MeetOps (Meeting Operations)
MeetOps bypasses traditional recording by operating natively during the call.
- **Capture Modes**: 
  - *Bot Join*: An automated agent dials into Zoom/Google Meet spaces natively.
  - *Local Listener*: Audio buffers directly from the User's local OS devices.
- **Processing**: The buffer goes through `faster-whisper` and is grouped by `pyannote.audio` diarization vectors. 
- **Extraction**: LLM automatically identifies speakers, pulling out `Tasks` and `ActionItems`.

### 3. ActionOps (Agentic Execution)
Replaces manual review with an LLM-orchestrated Integrations Hub. 
- Contains an MCP (Model Context Protocol) bridging structure for SaaS APIs.
- **3-Stage Governance Model**:
  - `Light`: Non-destructive (e.g. Add an internal tag) -> **Auto-Executed**.
  - `Medium`: Visibility required (e.g. Send a Slack update) -> **Executed & Notified**.
  - `Heavy`: Destructive / External (e.g. Close a Jira Epic, Send Client Email) -> **Halts for Human Approval**.

## Authentication Flow

1. JSON Web Tokens (JWT) are used for robust API request authorization.
2. React components inject JWT into the Axios interceptor header. Unauthenticated requests trigger refresh cycling or redirect to login.
3. Access tokens last 60m, securely paired with 30-day Refresh tokens stored inside the `refresh_tokens` database table. This permits strict device revocation.
4. FastAPI endpoints validate token signatures, retrieving the user and processing Entitlement limits (`check_feature_limit`) calculated against the `PlanTier` belonging to the Organization.

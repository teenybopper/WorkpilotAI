# WorkPilot AI — Architecture & User Flow

## 1. High-Level System Topology

```mermaid
graph TB
    subgraph "Users"
        IU["👤 Individual User"]
        OU["🏢 Organization User"]
    end

    subgraph "Frontend — React SPA"
        LP["Landing / Login"]
        SU["Signup<br/>(Individual vs Org)"]
        DB["Dashboard"]
        MO["MeetOps Page"]
        CS["Companion Setup<br/>/setup/companion"]
        BS["Bot Setup<br/>/setup/bot"]
    end

    subgraph "Main Backend — FastAPI"
        AR["Auth Router"]
        DR["Device Auth Router"]
        BR["Bot Auth Router"]
        CR["Capture Router"]
        MR["Meetings Router"]
        SR["Sessions Router"]
        IR["Intelligence Router"]
        AOR["Actions Router"]
    end

    subgraph "WPAI-local — Tauri Desktop App"
        TC["System Tray App"]
        AC["Audio Capture<br/>(WASAPI / SCK / PipeWire)"]
        CK["Chunker<br/>(5s WAV)"]
        UL["Uploader<br/>(HTTP Multipart)"]
    end

    subgraph "WPAI-org — FastAPI Bot Service"
        BM["Bot Session Manager"]
        GA["Google Meet Adapter"]
        TA["Teams Adapter"]
        SA["Slack Adapter"]
        DA["Discord Adapter"]
        BI["Audio Ingestion"]
        BU["Backend Uploader"]
    end

    subgraph "Infrastructure"
        PG["PostgreSQL"]
        MN["MinIO<br/>(Object Storage)"]
        QD["Qdrant<br/>(Vector DB)"]
        RD["Redis<br/>(Cache)"]
    end

    subgraph "AI Pipeline"
        WH["Whisper<br/>(Transcription)"]
        PY["Pyannote<br/>(Diarization)"]
        LLM["LLM<br/>(Extraction)"]
    end

    IU --> LP
    OU --> LP
    LP --> SU
    SU --> DB
    DB --> MO
    DB --> CS
    DB --> BS

    CS -.->|"Pair Device"| DR
    BS -.->|"Create Token"| BR

    TC -->|"Verify Token"| DR
    AC --> CK --> UL
    UL -->|"Upload Chunks"| CR

    BM --> GA & TA & SA & DA
    BI --> BU
    BU -->|"Upload Chunks"| CR

    CR -->|"Store Audio"| MN
    CR -->|"Create Session"| PG
    MR -->|"Trigger Pipeline"| WH --> PY --> LLM
    LLM -->|"Index"| QD
    LLM -->|"Store"| PG

    AR --> PG
    DR --> PG
    BR --> PG
    SR --> PG
    IR --> QD

    style IU fill:#f0abfc,stroke:#a855f7,color:#1a1a2e
    style OU fill:#67e8f9,stroke:#06b6d4,color:#1a1a2e
    style TC fill:#fbbf24,stroke:#f59e0b,color:#1a1a2e
    style BM fill:#34d399,stroke:#10b981,color:#1a1a2e
```

---

## 2. User Onboarding — Account Type Branching

```mermaid
flowchart TD
    START(["User visits WorkPilot"]) --> LOGIN{"Has Account?"}
    LOGIN -->|No| SIGNUP["Signup Page"]
    LOGIN -->|Yes| LOGINP["Login Page"]
    LOGINP --> AUTH["Authenticate<br/>(JWT issued)"]

    SIGNUP --> TYPE{"Account Type?"}

    TYPE -->|Individual| IFORM["Individual Form<br/>(name, email, password)"]
    TYPE -->|Organization| OFORM["Organization Form<br/>(name, email, password,<br/>org name, plan tier)"]

    IFORM --> ICREATE["POST /api/auth/signup<br/>account_type = individual"]
    OFORM --> OCREATE["POST /api/auth/signup<br/>account_type = organization"]

    ICREATE --> AUTH
    OCREATE --> AUTH

    AUTH --> DASHBOARD["Dashboard Page"]

    DASHBOARD --> ACCHECK{"account_type?"}

    ACCHECK -->|individual| ICARD["🟣 Local Companion Card<br/>Personal Mode"]
    ACCHECK -->|organization| OCARD["🔵 Meeting Bot Card<br/>Business Mode"]

    ICARD -->|Click| CSETUP["/setup/companion<br/>LocalCompanionSetupPage"]
    OCARD -->|Click| BSETUP["/setup/bot<br/>OrgBotSetupPage"]

    CSETUP --> DOWNLOAD["Download Tauri App<br/>(Win / Mac / Linux)"]
    CSETUP --> PAIR["Pair Device<br/>POST /api/devices/pair"]
    PAIR --> TOKEN["🔑 Device Token<br/>(shown once, stored in keychain)"]

    BSETUP --> PROVIDERS["View Provider Grid<br/>(Meet, Teams, Slack, Discord)"]
    BSETUP --> BTOKEN["Create Bot Service Token<br/>POST /api/bot-service/token"]
    BTOKEN --> STOKEN["🔑 Service Token<br/>(shown once, configure in bot service)"]

    style START fill:#6366f1,stroke:#4f46e5,color:#fff
    style ICARD fill:#f0abfc,stroke:#a855f7,color:#1a1a2e
    style OCARD fill:#67e8f9,stroke:#06b6d4,color:#1a1a2e
    style TOKEN fill:#fbbf24,stroke:#f59e0b,color:#1a1a2e
    style STOKEN fill:#34d399,stroke:#10b981,color:#1a1a2e
```

---

## 3. Individual Mode — Local Companion Capture Flow

```mermaid
flowchart TD
    subgraph "User's Desktop"
        TRAY["System Tray Icon<br/>(WPAI-local)"]
        UI["Companion UI<br/>(Pair / Status)"]
    end

    subgraph "Audio Layer"
        MIC["🎤 Microphone"]
        SYS["🔊 System Audio"]
        BACKEND_AUDIO["AudioCaptureBackend Trait"]
    end

    subgraph "Processing Pipeline"
        BUF["Sample Buffer<br/>(f32 PCM)"]
        CHUNK["Chunker<br/>(5s intervals)"]
        WAV["WAV Encoder<br/>(16kHz mono)"]
    end

    subgraph "Network Layer"
        UPLOAD["HTTP Uploader<br/>(multipart)"]
        RETRY["Retry Engine<br/>(exp. backoff)"]
        OFFLINE["Offline Buffer<br/>(local disk)"]
        KA["Keep-Alive<br/>(every 15s)"]
    end

    subgraph "WorkPilot Backend"
        CSESS["POST /api/capture/session"]
        CCHUNK["POST /api/capture/session/:id/chunk"]
        CFIN["POST /api/capture/session/:id/finalize"]
        MINIO["MinIO<br/>capture/{session_id}/chunk_NNNNNN.wav"]
    end

    TRAY -->|"Start Listening"| UI
    UI -->|"1. Create Session"| CSESS
    CSESS -->|"session_id"| UI

    MIC --> BACKEND_AUDIO
    SYS --> BACKEND_AUDIO
    BACKEND_AUDIO --> BUF

    BUF -->|"Every 5s"| CHUNK
    CHUNK --> WAV
    WAV --> UPLOAD

    UPLOAD -->|"Success"| CCHUNK
    UPLOAD -->|"Failure"| RETRY
    RETRY -->|"Max retries"| OFFLINE
    RETRY -->|"Retry OK"| CCHUNK
    OFFLINE -.->|"Reconnect"| UPLOAD

    CCHUNK --> MINIO

    UI -->|"Keep-Alive"| KA
    KA -->|"POST"| CSESS

    UI -->|"Stop Listening"| CFIN
    CFIN -->|"Triggers Pipeline"| PIPELINE["Transcription → Diarization → Extraction"]

    style TRAY fill:#fbbf24,stroke:#f59e0b,color:#1a1a2e
    style MINIO fill:#fb923c,stroke:#f97316,color:#1a1a2e
    style PIPELINE fill:#a78bfa,stroke:#8b5cf6,color:#1a1a2e
    style OFFLINE fill:#f87171,stroke:#ef4444,color:#1a1a2e
```

---

## 4. Organization Mode — Bot Service Capture Flow

```mermaid
flowchart TD
    subgraph "WorkPilot Backend"
        TRIGGER["MeetOps Session Start<br/>(user clicks Start)"]
        VERIFY["POST /api/bot-service/verify"]
        CSESS2["POST /api/capture/session"]
        CCHUNK2["POST /api/capture/session/:id/chunk"]
        CFIN2["POST /api/capture/session/:id/finalize"]
    end

    subgraph "WPAI-org Bot Service"
        API["FastAPI Service<br/>:8001"]
        SM["Session Manager"]
        ST["State Tracker"]
    end

    subgraph "Provider Adapters"
        REG{"Adapter Registry"}
        GMA["GoogleMeetAdapter"]
        MTA["MicrosoftTeamsAdapter"]
        SLA["SlackAdapter"]
        DCA["DiscordAdapter"]
    end

    subgraph "Adapter Lifecycle"
        AUTH2["authenticate()"]
        JOIN["join_meeting()"]
        CAP["start_audio_capture()"]
        STREAM["audio_stream()"]
        STOP["stop_audio_capture()"]
        LEAVE["leave_meeting()"]
    end

    subgraph "Audio Pipeline"
        ING["AudioIngestion"]
        CHK["AudioChunker<br/>(WAV encoding)"]
        BUP["BackendUploader"]
    end

    TRIGGER -->|"POST /bot/session/start"| API
    API -->|"Verify token"| VERIFY
    VERIFY -->|"✅ Valid"| SM

    SM --> REG
    REG -->|"google_meet"| GMA
    REG -->|"microsoft_teams"| MTA
    REG -->|"slack"| SLA
    REG -->|"discord"| DCA

    GMA & MTA & SLA & DCA --> AUTH2
    AUTH2 --> JOIN
    JOIN -->|"Bot visible in meeting"| CAP
    CAP --> STREAM

    STREAM --> ING --> CHK --> BUP

    BUP -->|"Create session"| CSESS2
    BUP -->|"Upload chunks"| CCHUNK2
    BUP -->|"Keep-alive"| CSESS2

    SM -->|"State changes"| ST

    TRIGGER -->|"Stop"| API
    API --> SM
    SM --> STOP --> LEAVE
    LEAVE --> BUP
    BUP -->|"Finalize"| CFIN2

    style API fill:#34d399,stroke:#10b981,color:#1a1a2e
    style GMA fill:#4ade80,stroke:#22c55e,color:#1a1a2e
    style MTA fill:#60a5fa,stroke:#3b82f6,color:#1a1a2e
    style SLA fill:#c084fc,stroke:#a855f7,color:#1a1a2e
    style DCA fill:#818cf8,stroke:#6366f1,color:#1a1a2e
```

---

## 5. Shared Pipeline — Transcript to Intelligence

Both capture modes feed into the same downstream pipeline:

```mermaid
flowchart LR
    subgraph "Capture Complete"
        S1["Local Companion<br/>Finalize"]
        S2["Org Bot<br/>Finalize"]
    end

    subgraph "Source Record"
        SRC["Source<br/>(type=meeting, status=uploaded)"]
    end

    subgraph "MeetOps Pipeline"
        T1["Whisper<br/>Transcription"]
        T2["Pyannote<br/>Diarization"]
        T3["LLM<br/>Entity Extraction"]
        T4["LLM<br/>Action Extraction"]
    end

    subgraph "Storage"
        PG2["PostgreSQL<br/>(segments, entities, tasks,<br/>decisions, risks)"]
        QD2["Qdrant<br/>(vector embeddings)"]
        MN2["MinIO<br/>(audio files)"]
    end

    subgraph "Intelligence Layer"
        RAG["Cross-Source RAG"]
        CONFLICT["Conflict Detection"]
        SUMMARY["Case Summaries"]
    end

    subgraph "ActionOps"
        PLAN["Action Planning<br/>(LLM Agent)"]
        APPROVE["User Approval"]
        EXEC["Action Execution<br/>(MCP Tools)"]
    end

    S1 & S2 --> SRC
    SRC --> T1 --> T2 --> T3 --> T4

    T1 -->|"Segments"| PG2
    T2 -->|"Speakers"| PG2
    T3 -->|"Entities"| PG2
    T3 -->|"Embeddings"| QD2
    T4 -->|"Tasks, Decisions, Risks"| PG2

    PG2 & QD2 --> RAG & CONFLICT & SUMMARY
    T4 --> PLAN --> APPROVE --> EXEC

    style S1 fill:#f0abfc,stroke:#a855f7,color:#1a1a2e
    style S2 fill:#67e8f9,stroke:#06b6d4,color:#1a1a2e
    style RAG fill:#fbbf24,stroke:#f59e0b,color:#1a1a2e
    style EXEC fill:#f87171,stroke:#ef4444,color:#1a1a2e
```

---

## 6. Authentication Model

```mermaid
flowchart TD
    subgraph "User Auth (JWT)"
        USER["User logs in"] --> JWT["JWT Access Token<br/>(+ Refresh Token)"]
        JWT --> FRONTEND["React SPA<br/>(Bearer header)"]
        FRONTEND --> BACKEND["FastAPI Backend<br/>(get_current_user)"]
    end

    subgraph "Device Auth (Token Hash)"
        PAIR["User pairs device<br/>POST /api/devices/pair"] --> RAWDT["Raw Device Token<br/>(shown once)"]
        RAWDT --> KEYCHAIN["OS Keychain<br/>(Tauri stores token)"]
        RAWDT -.->|"SHA-256"| HASHDT["token_hash in DB<br/>(device_tokens table)"]
        KEYCHAIN -->|"POST /api/devices/verify"| VERIFY2["Backend verifies<br/>(hash comparison)"]
        KEYCHAIN -->|"POST /api/capture/session"| CAPTURE["Capture Router<br/>(authenticates device)"]
    end

    subgraph "Bot Service Auth (Token Hash)"
        CREATE["Admin creates token<br/>POST /api/bot-service/token"] --> RAWBT["Raw Bot Token<br/>(shown once)"]
        RAWBT --> ENV["Bot Service .env<br/>(WPAI_ORG_BOT_SERVICE_TOKEN)"]
        RAWBT -.->|"SHA-256"| HASHBT["token_hash in DB<br/>(bot_service_tokens table)"]
        ENV -->|"POST /api/bot-service/verify"| VERIFY3["Backend verifies"]
        ENV -->|"POST /api/capture/session"| CAPTURE
    end

    style JWT fill:#6366f1,stroke:#4f46e5,color:#fff
    style RAWDT fill:#fbbf24,stroke:#f59e0b,color:#1a1a2e
    style RAWBT fill:#34d399,stroke:#10b981,color:#1a1a2e
    style KEYCHAIN fill:#fb923c,stroke:#f97316,color:#1a1a2e
```

---

## 7. Frontend Navigation Map

```mermaid
flowchart TD
    LOGIN["/login"] --> DASH
    SIGNUP["/signup"] --> DASH
    JOINORG["/join-org"] --> DASH

    DASH["/ Dashboard"] --> DOCOPS["/docops<br/>DocOps"]
    DASH --> MEETOPS["/meetops<br/>MeetOps"]
    DASH --> ACTIONS["/actions<br/>ActionOps"]
    DASH --> SETTINGS["/settings"]
    DASH --> WORKSPACE["/workspace/:id"]

    DASH -->|"Individual"| COMPANION["/setup/companion<br/>LocalCompanionSetupPage"]
    DASH -->|"Organization"| BOTSETUP["/setup/bot<br/>OrgBotSetupPage"]

    MEETOPS -->|"CTA Banner"| COMPANION
    MEETOPS -->|"CTA Banner"| BOTSETUP

    WORKSPACE --> WMEETOPS["/workspace/:id/meetops"]
    WORKSPACE --> WACTIONS["/workspace/:id/actions"]

    subgraph "Sidebar Nav"
        N1["📊 Dashboard"]
        N2["📄 DocOps"]
        N3["🎙 MeetOps"]
        N4["⚡ ActionOps"]
        N5["⚙️ Settings"]
        N6["🖥 Companion<br/>(individual)"]
        N7["🤖 Bot Setup<br/>(organization)"]
    end

    style COMPANION fill:#f0abfc,stroke:#a855f7,color:#1a1a2e
    style BOTSETUP fill:#67e8f9,stroke:#06b6d4,color:#1a1a2e
    style DASH fill:#6366f1,stroke:#4f46e5,color:#fff
```

---

## 8. Database Entity Relationships (New Tables)

```mermaid
erDiagram
    users ||--o{ device_tokens : "has"
    organizations ||--o{ bot_service_tokens : "has"
    device_tokens ||--o{ meeting_sessions : "creates"
    bot_service_tokens ||--o{ meeting_sessions : "creates"
    workspaces ||--o{ meeting_sessions : "contains"
    meeting_sessions ||--o| sources : "produces"

    users {
        uuid id PK
        string email
        string account_type
    }

    organizations {
        uuid id PK
        string name
        string plan_tier
    }

    device_tokens {
        uuid id PK
        uuid user_id FK
        string device_name
        string device_platform
        string token_hash
        boolean is_active
        timestamp last_seen_at
    }

    bot_service_tokens {
        uuid id PK
        uuid org_id FK
        string service_name
        string token_hash
        json scopes_json
        boolean is_active
        timestamp last_used_at
    }

    meeting_sessions {
        uuid id PK
        uuid workspace_id FK
        uuid source_id FK
        enum capture_mode
        enum status
        uuid device_id FK
        uuid bot_service_token_id FK
        string provider_session_id
        int chunks_received
    }

    sources {
        uuid id PK
        uuid workspace_id FK
        enum source_type
        string storage_path
    }
```

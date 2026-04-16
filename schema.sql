-- ============================================================================
-- WorkPilot AI — PostgreSQL Database Schema
-- ============================================================================
-- Run: psql -U workpilot -d workpilot_db -f schema.sql
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. AUTH & IDENTITY
-- ============================================================================

CREATE TYPE account_type AS ENUM ('individual', 'organization');
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'business', 'enterprise');
CREATE TYPE org_role AS ENUM ('admin', 'member', 'viewer');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    account_type    account_type NOT NULL DEFAULT 'individual',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    settings_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(128) UNIQUE NOT NULL,
    domain          VARCHAR(255),  -- Email domain for auto-join (e.g. acme.com)
    logo_url        TEXT,
    admin_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_tier       plan_tier NOT NULL DEFAULT 'free',
    max_seats       INTEGER NOT NULL DEFAULT 5,
    settings_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_organizations_domain ON organizations(domain);

CREATE TABLE organization_members (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role            org_role NOT NULL DEFAULT 'member',
    invited_by      UUID REFERENCES users(id),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (org_id, user_id)
);

CREATE TABLE invite_codes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code            VARCHAR(32) UNIQUE NOT NULL,
    created_by      UUID NOT NULL REFERENCES users(id),
    email           VARCHAR(255),           -- optional: restrict to specific email
    max_uses        INTEGER NOT NULL DEFAULT 1,
    uses            INTEGER NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL,
    device_info     VARCHAR(512),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. WORKSPACES
-- ============================================================================

CREATE TABLE workspaces (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. SOURCES (Documents & Meetings)
-- ============================================================================

CREATE TYPE source_type AS ENUM ('document', 'meeting');
CREATE TYPE source_status AS ENUM ('uploaded', 'processing', 'ready', 'failed');

CREATE TABLE sources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type     source_type NOT NULL,
    filename        VARCHAR(512) NOT NULL,
    storage_path    VARCHAR(1024) NOT NULL,
    mime_type       VARCHAR(128),
    file_size       BIGINT,
    status          source_status NOT NULL DEFAULT 'uploaded',
    uploaded_by     UUID REFERENCES users(id),
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. DOCUMENT PROCESSING
-- ============================================================================

CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    version_num     INTEGER NOT NULL DEFAULT 1,
    extracted_text  TEXT,
    sections_json   JSONB,
    tables_json     JSONB,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. MEETING PROCESSING
-- ============================================================================

CREATE TABLE speakers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name            VARCHAR(255),
    email           VARCHAR(255),
    label           VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transcript_segments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    speaker_id      UUID REFERENCES speakers(id),
    speaker_label   VARCHAR(64),
    start_time      DOUBLE PRECISION,
    end_time        DOUBLE PRECISION,
    text            TEXT NOT NULL,
    confidence      DOUBLE PRECISION,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE capture_mode AS ENUM ('bot_join', 'local_listener', 'upload');
CREATE TYPE session_status AS ENUM (
    'pending', 'joining', 'listening', 'processing',
    'completed', 'failed', 'cancelled'
);

CREATE TABLE meeting_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id       UUID REFERENCES sources(id),
    capture_mode    capture_mode NOT NULL,
    status          session_status NOT NULL DEFAULT 'pending',
    platform        VARCHAR(64),
    meeting_url     VARCHAR(1024),
    title           VARCHAR(512),
    config_json     JSONB DEFAULT '{}',
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    duration_seconds DOUBLE PRECISION,
    consent_given   BOOLEAN NOT NULL DEFAULT FALSE,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. EXTRACTED INTELLIGENCE
-- ============================================================================

CREATE TABLE entities (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id       UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    entity_type     VARCHAR(64) NOT NULL,
    value           TEXT NOT NULL,
    context         TEXT,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id       UUID REFERENCES sources(id),
    text            TEXT NOT NULL,
    owner           VARCHAR(255),
    due_date        TIMESTAMPTZ,
    priority        task_priority NOT NULL DEFAULT 'medium',
    status          task_status NOT NULL DEFAULT 'pending',
    evidence_text   TEXT,
    confidence      DOUBLE PRECISION,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE decisions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id       UUID REFERENCES sources(id),
    text            TEXT NOT NULL,
    approver        VARCHAR(255),
    confidence      DOUBLE PRECISION,
    evidence_text   TEXT,
    meeting_timestamp DOUBLE PRECISION,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE risk_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE risk_flags (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id       UUID REFERENCES sources(id),
    text            TEXT NOT NULL,
    severity        risk_severity NOT NULL DEFAULT 'medium',
    evidence_text   TEXT,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. INTEGRATIONS (Connected Tools / MCP)
-- ============================================================================

CREATE TYPE tool_status AS ENUM ('connected', 'disconnected', 'error');

CREATE TABLE connected_tools (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id              UUID REFERENCES organizations(id) ON DELETE CASCADE,
    tool_type           VARCHAR(64) NOT NULL,    -- jira, clickup, linear, etc.
    display_name        VARCHAR(255) NOT NULL,
    auth_config_encrypted TEXT,                   -- encrypted OAuth / API key
    capabilities_json   JSONB DEFAULT '[]',
    status              tool_status NOT NULL DEFAULT 'connected',
    config_json         JSONB DEFAULT '{}',      -- project keys, workspace IDs, etc.
    last_verified_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. ACTIONOPS (Three-Stage: Light / Medium / Heavy)
-- ============================================================================

CREATE TYPE action_severity AS ENUM ('light', 'medium', 'heavy');
CREATE TYPE action_type AS ENUM (
    'create_ticket', 'update_ticket', 'close_ticket',
    'create_doc', 'update_doc',
    'send_message', 'add_comment',
    'custom'
);
CREATE TYPE approval_status AS ENUM (
    'auto_executed',    -- light: ran automatically
    'notified',         -- medium: ran and user was notified
    'pending_approval', -- heavy: waiting for user approval
    'approved',         -- heavy: user approved, ready to execute
    'rejected',         -- heavy: user rejected
    'executing',        -- currently running
    'executed',         -- successfully completed
    'failed'            -- execution failed
);

CREATE TABLE action_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id           UUID REFERENCES sources(id),          -- meeting/doc that triggered
    target_tool_id      UUID REFERENCES connected_tools(id),  -- which integration to use
    action_type         action_type NOT NULL,
    severity            action_severity NOT NULL DEFAULT 'heavy',
    title               VARCHAR(512) NOT NULL,
    description         TEXT,
    target_object_id    VARCHAR(255),             -- e.g. JIRA-123, clickup task URL
    owner               VARCHAR(255),
    due_date            TIMESTAMPTZ,
    payload_json        JSONB DEFAULT '{}',       -- action-specific payload
    source_evidence_json JSONB DEFAULT '[]',      -- [{source_id, text, type}]
    confidence          DOUBLE PRECISION,
    approval_status     approval_status NOT NULL DEFAULT 'pending_approval',
    approved_by         UUID REFERENCES users(id),
    rejection_reason    TEXT,
    trace_id            UUID DEFAULT uuid_generate_v4(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE action_executions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_item_id      UUID NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
    status              VARCHAR(32) NOT NULL,     -- success, failed, partial
    request_json        JSONB,
    response_json       JSONB,
    error_message       TEXT,
    duration_ms         INTEGER,
    executed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. ACTIVITY LOG & AUDIT
-- ============================================================================

CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    action_type     VARCHAR(128) NOT NULL,        -- ticket_created, doc_uploaded, etc.
    entity_type     VARCHAR(64),                  -- action_item, source, meeting_session
    entity_id       UUID,
    title           VARCHAR(512),
    description     TEXT,
    metadata_json   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    actor           VARCHAR(255),
    action          VARCHAR(128) NOT NULL,
    entity_type     VARCHAR(64),
    entity_id       UUID,
    detail          TEXT,
    before_state    JSONB,
    after_state     JSONB,
    trace_id        UUID,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. EVIDENCE LINKS
-- ============================================================================

CREATE TABLE evidence_links (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type         VARCHAR(64) NOT NULL,     -- task, decision, risk_flag, action_item
    entity_id           UUID NOT NULL,
    source_id           UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    evidence_text       TEXT,
    evidence_location   JSONB,                    -- {page, timestamp, section}
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 11. DEVICE TOKENS (Local Companion Pairing)
-- ============================================================================

CREATE TABLE device_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name     VARCHAR(255),
    device_platform VARCHAR(64),            -- windows, macos, linux
    token_hash      TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. BOT SERVICE TOKENS (Organization Bot Service Auth)
-- ============================================================================

CREATE TABLE bot_service_tokens (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    service_name    VARCHAR(255) NOT NULL,
    token_hash      TEXT NOT NULL,
    scopes_json     JSONB DEFAULT '[]',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. MEETING SESSIONS EXTENSIONS
-- ============================================================================

ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES device_tokens(id);
ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS bot_service_token_id UUID REFERENCES bot_service_tokens(id);
ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS provider_session_id VARCHAR(255);
ALTER TABLE meeting_sessions ADD COLUMN IF NOT EXISTS chunks_received INTEGER DEFAULT 0;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_org_members_org ON organization_members(org_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_org ON workspaces(org_id);
CREATE INDEX idx_sources_workspace ON sources(workspace_id);
CREATE INDEX idx_sources_type ON sources(source_type);
CREATE INDEX idx_document_versions_source ON document_versions(source_id);
CREATE INDEX idx_transcript_segments_source ON transcript_segments(source_id);
CREATE INDEX idx_meeting_sessions_workspace ON meeting_sessions(workspace_id);
CREATE INDEX idx_entities_source ON entities(source_id);
CREATE INDEX idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX idx_decisions_workspace ON decisions(workspace_id);
CREATE INDEX idx_risk_flags_workspace ON risk_flags(workspace_id);
CREATE INDEX idx_connected_tools_user ON connected_tools(user_id);
CREATE INDEX idx_connected_tools_org ON connected_tools(org_id);
CREATE INDEX idx_action_items_workspace ON action_items(workspace_id);
CREATE INDEX idx_action_items_status ON action_items(approval_status);
CREATE INDEX idx_action_items_severity ON action_items(severity);
CREATE INDEX idx_action_executions_item ON action_executions(action_item_id);
CREATE INDEX idx_activity_log_org ON activity_log(org_id);
CREATE INDEX idx_activity_log_workspace ON activity_log(workspace_id);
CREATE INDEX idx_evidence_links_entity ON evidence_links(entity_type, entity_id);
CREATE INDEX idx_evidence_links_source ON evidence_links(source_id);
CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_bot_service_tokens_org ON bot_service_tokens(org_id);
CREATE INDEX idx_meeting_sessions_device ON meeting_sessions(device_id);
CREATE INDEX idx_meeting_sessions_bot_token ON meeting_sessions(bot_service_token_id);

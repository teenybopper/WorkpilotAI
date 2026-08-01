"""WorkPilot AI — SQLAlchemy ORM models for local desktop application."""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime,
    ForeignKey, JSON, Enum as SAEnum, BigInteger
)
from sqlalchemy.orm import relationship
from app.database import Base
import enum


# ── Enums ─────────────────────────────────────────────────────────────────

class SourceType(str, enum.Enum):
    DOCUMENT = "document"
    MEETING = "meeting"


class SourceStatus(str, enum.Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MeetingCaptureMode(str, enum.Enum):
    LOCAL_LISTENER = "local_listener"
    UPLOAD = "upload"


class SessionStatus(str, enum.Enum):
    PENDING = "pending"
    LISTENING = "listening"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ToolStatus(str, enum.Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class ActionSeverity(str, enum.Enum):
    LIGHT = "light"
    MEDIUM = "medium"
    HEAVY = "heavy"


class ActionType(str, enum.Enum):
    CREATE_TICKET = "create_ticket"
    UPDATE_TICKET = "update_ticket"
    CLOSE_TICKET = "close_ticket"
    CREATE_DOC = "create_doc"
    UPDATE_DOC = "update_doc"
    SEND_MESSAGE = "send_message"
    ADD_COMMENT = "add_comment"
    CUSTOM = "custom"


class ApprovalStatus(str, enum.Enum):
    AUTO_EXECUTED = "auto_executed"
    NOTIFIED = "notified"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    EXECUTED = "executed"
    FAILED = "failed"


# ── Helper ───────────────────────────────────────────────────────────────

def _uuid_str():
    return str(uuid.uuid4())


# ── User (Single Local User) ────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    email = Column(String(255), unique=True, nullable=True)
    name = Column(String(255), nullable=False, default="Local User")
    settings_json = Column(JSON, nullable=True, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    connected_tools = relationship("ConnectedTool", back_populates="user", cascade="all, delete-orphan")
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")


# ── Workspaces ───────────────────────────────────────────────────────────

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="workspaces")
    sources = relationship("Source", back_populates="workspace", cascade="all, delete-orphan")
    speakers = relationship("Speaker", back_populates="workspace", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="workspace", cascade="all, delete-orphan")
    decisions = relationship("Decision", back_populates="workspace", cascade="all, delete-orphan")
    risk_flags = relationship("RiskFlag", back_populates="workspace", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="workspace", cascade="all, delete-orphan")
    meeting_sessions = relationship("MeetingSession", back_populates="workspace", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="workspace", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="workspace", cascade="all, delete-orphan")


# ── Sources ──────────────────────────────────────────────────────────────

class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    source_type = Column(SAEnum(SourceType), nullable=False)
    filename = Column(String(512), nullable=False)
    storage_path = Column(String(1024), nullable=False)
    mime_type = Column(String(128), nullable=True)
    file_size = Column(BigInteger, nullable=True)
    status = Column(SAEnum(SourceStatus), default=SourceStatus.UPLOADED, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    workspace = relationship("Workspace", back_populates="sources")
    document_versions = relationship("DocumentVersion", back_populates="source", cascade="all, delete-orphan")
    transcript_segments = relationship("TranscriptSegment", back_populates="source", cascade="all, delete-orphan")
    entities = relationship("Entity", back_populates="source", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="source")
    decisions = relationship("Decision", back_populates="source")
    risk_flags = relationship("RiskFlag", back_populates="source")
    meeting_session = relationship("MeetingSession", back_populates="source", uselist=False)


# ── Document Processing ──────────────────────────────────────────────────

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False)
    version_num = Column(Integer, default=1, nullable=False)
    extracted_text = Column(Text, nullable=True)
    sections_json = Column(JSON, nullable=True)
    tables_json = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="document_versions")


# ── Meeting Processing ───────────────────────────────────────────────────

class Speaker(Base):
    __tablename__ = "speakers"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    label = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="speakers")
    segments = relationship("TranscriptSegment", back_populates="speaker")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False)
    speaker_id = Column(String(36), ForeignKey("speakers.id"), nullable=True)
    speaker_label = Column(String(64), nullable=True)
    start_time = Column(Float, nullable=True)
    end_time = Column(Float, nullable=True)
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="transcript_segments")
    speaker = relationship("Speaker", back_populates="segments")


class Entity(Base):
    __tablename__ = "entities"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False)
    entity_type = Column(String(64), nullable=False)
    value = Column(Text, nullable=False)
    context = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("Source", back_populates="entities")


# ── Extracted Intelligence ───────────────────────────────────────────────

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    text = Column(Text, nullable=False)
    owner = Column(String(255), nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(SAEnum(TaskPriority), default=TaskPriority.MEDIUM)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING)
    evidence_text = Column(Text, nullable=True)
    confidence = Column(Float, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="tasks")
    source = relationship("Source", back_populates="tasks")


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    text = Column(Text, nullable=False)
    approver = Column(String(255), nullable=True)
    confidence = Column(Float, nullable=True)
    evidence_text = Column(Text, nullable=True)
    meeting_timestamp = Column(Float, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="decisions")
    source = relationship("Source", back_populates="decisions")


class RiskFlag(Base):
    __tablename__ = "risk_flags"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    text = Column(Text, nullable=False)
    severity = Column(SAEnum(RiskSeverity), default=RiskSeverity.MEDIUM)
    evidence_text = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="risk_flags")
    source = relationship("Source", back_populates="risk_flags")


# ── MeetOps Sessions ────────────────────────────────────────────────────

class MeetingSession(Base):
    __tablename__ = "meeting_sessions"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    capture_mode = Column(SAEnum(MeetingCaptureMode), nullable=False)
    status = Column(SAEnum(SessionStatus), default=SessionStatus.PENDING, nullable=False)
    platform = Column(String(64), nullable=True)
    title = Column(String(512), nullable=True)
    config_json = Column(JSON, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    consent_given = Column(Boolean, default=False, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    chunks_received = Column(Integer, default=0, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="meeting_sessions")
    source = relationship("Source", back_populates="meeting_session")


# ── Integrations / Connected Tools ───────────────────────────────────────

class ConnectedTool(Base):
    __tablename__ = "connected_tools"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    tool_type = Column(String(64), nullable=False)
    display_name = Column(String(255), nullable=False)
    auth_config_encrypted = Column(Text, nullable=True)
    capabilities_json = Column(JSON, nullable=True, default=[])
    status = Column(SAEnum(ToolStatus), default=ToolStatus.CONNECTED, nullable=False)
    config_json = Column(JSON, nullable=True, default={})
    last_verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="connected_tools")
    action_items = relationship("ActionItem", back_populates="target_tool")


# ── ActionOps (Note-Making & Actions) ────────────────────────────────────

class ActionItem(Base):
    """A proposed action extracted from meetings — notes, tasks, follow-ups."""
    __tablename__ = "action_items"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=True)
    target_tool_id = Column(String(36), ForeignKey("connected_tools.id"), nullable=True)
    action_type = Column(SAEnum(ActionType), nullable=False)
    severity = Column(SAEnum(ActionSeverity), default=ActionSeverity.HEAVY, nullable=False)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    target_object_id = Column(String(255), nullable=True)
    owner = Column(String(255), nullable=True)
    due_date = Column(DateTime, nullable=True)
    payload_json = Column(JSON, nullable=True, default={})
    source_evidence_json = Column(JSON, nullable=True, default=[])
    confidence = Column(Float, nullable=True)
    approval_status = Column(
        SAEnum(ApprovalStatus), default=ApprovalStatus.PENDING_APPROVAL, nullable=False
    )
    rejection_reason = Column(Text, nullable=True)
    trace_id = Column(String(36), default=_uuid_str)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="action_items")
    target_tool = relationship("ConnectedTool", back_populates="action_items")
    executions = relationship("ActionExecution", back_populates="action_item", cascade="all, delete-orphan")


class ActionExecution(Base):
    __tablename__ = "action_executions"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    action_item_id = Column(String(36), ForeignKey("action_items.id"), nullable=False)
    status = Column(String(32), nullable=False)
    request_json = Column(JSON, nullable=True)
    response_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    executed_at = Column(DateTime, default=datetime.utcnow)

    action_item = relationship("ActionItem", back_populates="executions")


# ── Activity & Audit ─────────────────────────────────────────────────────

class ActivityLog(Base):
    __tablename__ = "activity_log"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    action_type = Column(String(128), nullable=False)
    entity_type = Column(String(64), nullable=True)
    entity_id = Column(String(36), nullable=True)
    title = Column(String(512), nullable=True)
    description = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True, default={})
    created_at = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="activity_logs")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=True)
    actor = Column(String(255), nullable=True)
    action = Column(String(128), nullable=False)
    entity_type = Column(String(64), nullable=True)
    entity_id = Column(String(36), nullable=True)
    detail = Column(Text, nullable=True)
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)
    trace_id = Column(String(36), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="audit_events")


class EvidenceLink(Base):
    __tablename__ = "evidence_links"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(String(36), nullable=False)
    source_id = Column(String(36), ForeignKey("sources.id"), nullable=False)
    evidence_text = Column(Text, nullable=True)
    evidence_location = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

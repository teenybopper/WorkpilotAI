"""Pydantic schemas for API request/response validation (local desktop app)."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────────────────

class SourceTypeEnum(str, Enum):
    DOCUMENT = "document"
    MEETING = "meeting"


class SourceStatusEnum(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class TaskStatusEnum(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskPriorityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MeetingCaptureModeEnum(str, Enum):
    LOCAL_LISTENER = "local_listener"
    UPLOAD = "upload"


class SessionStatusEnum(str, Enum):
    PENDING = "pending"
    LISTENING = "listening"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ActionTypeEnum(str, Enum):
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    CREATE_DOC = "create_doc"
    UPDATE_DOC = "update_doc"
    SEND_MESSAGE = "send_message"
    SCHEDULE_MEETING = "schedule_meeting"
    CUSTOM = "custom"


class ApprovalStatusEnum(str, Enum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTING = "executing"
    EXECUTED = "executed"
    FAILED = "failed"


class ActionSeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ToolStatusEnum(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


# ── Workspace ─────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    source_count: int = 0
    document_count: int = 0
    meeting_count: int = 0

    class Config:
        from_attributes = True


class WorkspaceDetailResponse(WorkspaceResponse):
    sources: List["SourceResponse"] = []
    tasks: List["TaskResponse"] = []
    decisions: List["DecisionResponse"] = []
    risk_flags: List["RiskFlagResponse"] = []


# ── Source ─────────────────────────────────────────────────────────────────

class SourceResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    source_type: SourceTypeEnum
    filename: str
    status: SourceStatusEnum
    mime_type: Optional[str]
    file_size: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Document ──────────────────────────────────────────────────────────────

class DocumentExtractRequest(BaseModel):
    source_id: UUID


class DocumentCompareRequest(BaseModel):
    source_id_a: UUID
    source_id_b: UUID


class DocumentQueryRequest(BaseModel):
    workspace_id: UUID
    query: str
    top_k: int = Field(default=5, ge=1, le=20)


class DocumentQueryResponse(BaseModel):
    answer: str
    evidence: List["EvidenceCard"]
    confidence: float


# ── Meeting ───────────────────────────────────────────────────────────────

class MeetingTranscribeRequest(BaseModel):
    source_id: UUID


class MeetingExtractActionsRequest(BaseModel):
    source_id: UUID


class MeetingSummaryResponse(BaseModel):
    source_id: UUID
    summary: str
    duration_seconds: Optional[float]
    speaker_count: int
    action_count: int
    decision_count: int


class TranscriptSegmentResponse(BaseModel):
    id: UUID
    speaker_label: Optional[str]
    start_time: Optional[float]
    end_time: Optional[float]
    text: str
    confidence: Optional[float]

    class Config:
        from_attributes = True


# ── Intelligence ──────────────────────────────────────────────────────────

class WorkspaceQueryRequest(BaseModel):
    workspace_id: UUID
    query: str
    top_k: int = Field(default=5, ge=1, le=20)
    source_types: Optional[List[SourceTypeEnum]] = None


class WorkspaceQueryResponse(BaseModel):
    answer: str
    evidence: List["EvidenceCard"]
    confidence: float


class EvidenceCard(BaseModel):
    source_id: UUID
    source_type: str
    filename: str
    text: str
    relevance_score: float
    metadata: Optional[dict] = None


class CaseSummaryResponse(BaseModel):
    workspace_id: UUID
    workspace_name: str
    summary: str
    key_findings: List[str]
    open_tasks: int
    unresolved_risks: int
    total_decisions: int
    conflicts: List[str]


# ── Task ──────────────────────────────────────────────────────────────────

class TaskResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    source_id: Optional[UUID]
    text: str
    owner: Optional[str]
    due_date: Optional[datetime]
    priority: TaskPriorityEnum
    status: TaskStatusEnum
    evidence_text: Optional[str]
    confidence: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class TaskUpdateRequest(BaseModel):
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriorityEnum] = None
    status: Optional[TaskStatusEnum] = None


# ── Decision ──────────────────────────────────────────────────────────────

class DecisionResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    source_id: Optional[UUID]
    text: str
    approver: Optional[str]
    confidence: Optional[float]
    evidence_text: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Risk Flag ─────────────────────────────────────────────────────────────

class RiskFlagResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    source_id: Optional[UUID]
    text: str
    severity: str
    evidence_text: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── MeetOps Session ───────────────────────────────────────────────────────

class MeetingSessionCreate(BaseModel):
    workspace_id: UUID
    capture_mode: MeetingCaptureModeEnum
    title: Optional[str] = None
    consent_given: bool = False


class MeetingSessionResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    source_id: Optional[UUID]
    capture_mode: MeetingCaptureModeEnum
    status: SessionStatusEnum
    title: Optional[str]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[float]
    consent_given: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingSessionTranscriptSubmit(BaseModel):
    """For local listener mode — submit captured transcript."""
    transcript_text: str
    segments: Optional[List[dict]] = None  # [{speaker, start_time, end_time, text}]


# ── Connected Tool / MCP ──────────────────────────────────────────────────

class ConnectedToolCreate(BaseModel):
    tool_type: str = Field(..., min_length=1, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=255)
    auth_config: Optional[dict] = None
    config: Optional[dict] = None


class ConnectedToolResponse(BaseModel):
    id: UUID
    tool_type: str
    display_name: str
    capabilities: Optional[List[str]] = None
    status: ToolStatusEnum
    config: Optional[dict] = None
    last_verified_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AvailableToolInfo(BaseModel):
    tool_type: str
    display_name: str
    description: str
    capabilities: List[str]
    auth_type: str
    config_fields: List[dict]


# ── ActionOps ─────────────────────────────────────────────────────────────

class ActionItemCreate(BaseModel):
    workspace_id: UUID
    action_type: ActionTypeEnum
    title: str
    description: Optional[str] = None
    target_tool_id: Optional[UUID] = None
    target_object_id: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    payload: Optional[dict] = None
    source_evidence: Optional[List[dict]] = None


class ActionItemResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    target_tool_id: Optional[UUID]
    action_type: ActionTypeEnum
    title: str
    description: Optional[str]
    target_object_id: Optional[str]
    owner: Optional[str]
    due_date: Optional[datetime]
    payload: Optional[dict] = None
    source_evidence: Optional[List[dict]] = None
    confidence: Optional[float]
    risk_level: ActionSeverityEnum
    approval_state: ApprovalStatusEnum
    rejection_reason: Optional[str]
    trace_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ActionItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_tool_id: Optional[UUID] = None
    target_object_id: Optional[str] = None
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    payload: Optional[dict] = None


class ActionApproveRequest(BaseModel):
    pass


class ActionRejectRequest(BaseModel):
    reason: str = Field(..., min_length=1)


class ActionExecutionResponse(BaseModel):
    id: UUID
    action_item_id: UUID
    status: str
    request_json: Optional[dict]
    response_json: Optional[dict]
    error_message: Optional[str]
    duration_ms: Optional[int]
    executed_at: datetime

    class Config:
        from_attributes = True


class ActionItemGenerateRequest(BaseModel):
    """Ask the system to auto-generate action plans from workspace evidence."""
    workspace_id: UUID
    scope: Optional[str] = None


# ── Forward references ────────────────────────────────────────────────────

WorkspaceDetailResponse.model_rebuild()
DocumentQueryResponse.model_rebuild()
WorkspaceQueryResponse.model_rebuild()

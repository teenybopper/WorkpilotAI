"""Workspace / Copilot API router — workspace management, cross-source Q&A, case summaries."""

import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Workspace, Source, Task, Decision, RiskFlag, SourceType, TaskStatus
from app.schemas import (
    WorkspaceCreate, WorkspaceResponse, WorkspaceDetailResponse,
    WorkspaceQueryRequest, WorkspaceQueryResponse,
    CaseSummaryResponse, TaskResponse, TaskUpdateRequest,
    DecisionResponse, RiskFlagResponse, SourceResponse,
)
from app.services.intelligence import (
    cross_source_query, detect_conflicts, generate_case_summary,
)
from app.routers.auth import get_current_user
from app.services.auth import get_user_org

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])


@router.post("", response_model=WorkspaceResponse)
async def create_workspace(
    request: WorkspaceCreate,
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workspace."""
    org = get_user_org(db, user.id)
    workspace = Workspace(
        name=request.name, 
        description=request.description,
        owner_id=user.id,
        org_id=org.id if org else None
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
    )


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """List all workspaces with source counts."""
    org = get_user_org(db, user.id)
    if org:
        workspaces = db.query(Workspace).filter(Workspace.org_id == org.id).order_by(Workspace.created_at.desc()).all()
    else:
        workspaces = db.query(Workspace).filter(Workspace.owner_id == user.id).order_by(Workspace.created_at.desc()).all()

    result = []
    for ws in workspaces:
        sources = db.query(Source).filter(Source.workspace_id == ws.id).all()
        doc_count = sum(1 for s in sources if s.source_type == SourceType.DOCUMENT)
        meeting_count = sum(1 for s in sources if s.source_type == SourceType.MEETING)

        result.append(WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            description=ws.description,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
            source_count=len(sources),
            document_count=doc_count,
            meeting_count=meeting_count,
        ))

    return result


@router.get("/{workspace_id}", response_model=WorkspaceDetailResponse)
async def get_workspace(
    workspace_id: uuid.UUID,
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get detailed workspace info with sources, tasks, decisions, and risks."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    sources = db.query(Source).filter(Source.workspace_id == workspace_id).all()
    tasks = db.query(Task).filter(Task.workspace_id == workspace_id).order_by(Task.created_at.desc()).all()
    decisions = db.query(Decision).filter(Decision.workspace_id == workspace_id).order_by(Decision.created_at.desc()).all()
    risks = db.query(RiskFlag).filter(RiskFlag.workspace_id == workspace_id).order_by(RiskFlag.created_at.desc()).all()

    doc_count = sum(1 for s in sources if s.source_type == SourceType.DOCUMENT)
    meeting_count = sum(1 for s in sources if s.source_type == SourceType.MEETING)

    return WorkspaceDetailResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        source_count=len(sources),
        document_count=doc_count,
        meeting_count=meeting_count,
        sources=[SourceResponse.model_validate(s) for s in sources],
        tasks=[TaskResponse.model_validate(t) for t in tasks],
        decisions=[DecisionResponse.model_validate(d) for d in decisions],
        risk_flags=[RiskFlagResponse.model_validate(r) for r in risks],
    )


@router.delete("/{workspace_id}")
async def delete_workspace(
    workspace_id: uuid.UUID,
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a workspace and all its data."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    db.delete(workspace)
    db.commit()
    return {"status": "deleted", "workspace_id": str(workspace_id)}


@router.post("/query", response_model=WorkspaceQueryResponse)
async def workspace_query(
    request: WorkspaceQueryRequest,
    db: Session = Depends(get_db),
):
    """Cross-source Q&A spanning documents and meetings."""
    source_types = [st.value for st in request.source_types] if request.source_types else None
    result = cross_source_query(
        workspace_id=request.workspace_id,
        query=request.query,
        top_k=request.top_k,
        source_types=source_types,
        db=db,
    )
    return result


@router.get("/{workspace_id}/case-summary", response_model=CaseSummaryResponse)
async def get_case_summary(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Generate a comprehensive case summary for the workspace."""
    result = generate_case_summary(workspace_id, db)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/{workspace_id}/conflicts")
async def get_conflicts(
    workspace_id: uuid.UUID,
    db: Session = Depends(get_db),
):
    """Detect conflicts between documents and meeting statements."""
    conflicts = detect_conflicts(workspace_id, db)
    return {"workspace_id": str(workspace_id), "conflicts": conflicts, "count": len(conflicts)}


# ── Task Management ──────────────────────────────────────────────────────

@router.get("/{workspace_id}/tasks", response_model=list[TaskResponse])
async def list_tasks(
    workspace_id: uuid.UUID,
    status: str | None = None,
    user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List tasks in a workspace with optional status filter."""
    query = db.query(Task).filter(Task.workspace_id == workspace_id)
    if status:
        query = query.filter(Task.status == status)
    return query.order_by(Task.created_at.desc()).all()


@router.patch("/{workspace_id}/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    workspace_id: uuid.UUID,
    task_id: uuid.UUID,
    request: TaskUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update a task's owner, due date, priority, or status."""
    task = db.query(Task).filter(Task.id == task_id, Task.workspace_id == workspace_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if request.owner is not None:
        task.owner = request.owner
    if request.due_date is not None:
        task.due_date = request.due_date
    if request.priority is not None:
        task.priority = request.priority
    if request.status is not None:
        task.status = request.status

    db.commit()
    db.refresh(task)
    return task

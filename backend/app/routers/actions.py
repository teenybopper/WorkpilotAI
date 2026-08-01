"""ActionOps router — plan, review, approve, and execute agentic actions."""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ActionItem, ActionExecution, ApprovalStatus
from app.schemas import (
    ActionItemResponse, ActionItemCreate, ActionItemUpdate,
    ActionItemGenerateRequest, ActionApproveRequest, ActionRejectRequest,
    ActionExecutionResponse,
)
from app.services.auth import get_or_create_local_user
from app.services.actionops import (
    generate_action_items, approve_action, reject_action,
    execute_action, update_action_item,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/actions", tags=["ActionOps"])


@router.post("/plan", response_model=list[ActionItemResponse])
async def plan_actions(
    request: ActionItemGenerateRequest,
    db: Session = Depends(get_db),
):
    """Generate action plans from workspace evidence using AI."""
    user = get_or_create_local_user(db)

    try:
        plans = generate_action_items(
            workspace_id=request.workspace_id,
            user_id=user.id,
            db=db,
            scope=request.scope or "all",
        )
        return _serialize_plans(plans)
    except Exception as e:
        logger.error(f"Action planning failed: {e}")
        raise HTTPException(status_code=500, detail=f"Action planning failed: {str(e)}")


@router.get("", response_model=list[ActionItemResponse])
async def list_actions(
    workspace_id: UUID = Query(...),
    approval_state: str | None = None,
    db: Session = Depends(get_db),
):
    """List action plans for a workspace, optionally filtered by state."""
    query = db.query(ActionItem).filter(ActionItem.workspace_id == workspace_id)
    if approval_state:
        query = query.filter(ActionItem.approval_state == ApprovalStatus(approval_state))
    plans = query.order_by(ActionItem.created_at.desc()).all()
    return _serialize_plans(plans)


@router.get("/{action_id}", response_model=ActionItemResponse)
async def get_action(
    action_id: UUID,
    db: Session = Depends(get_db),
):
    """Get a specific action plan."""
    plan = db.query(ActionItem).filter(ActionItem.id == action_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Action plan not found")
    return _serialize_plan(plan)


@router.patch("/{action_id}", response_model=ActionItemResponse)
async def edit_action(
    action_id: UUID,
    request: ActionItemUpdate,
    db: Session = Depends(get_db),
):
    """Edit an action plan before approval."""
    try:
        updates = request.model_dump(exclude_unset=True)
        # Map 'payload' to 'payload_json'
        if "payload" in updates:
            updates["payload_json"] = updates.pop("payload")
        plan = update_action_item(action_id, updates, db)
        return _serialize_plan(plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/approve", response_model=ActionItemResponse)
async def approve_action_item(
    action_id: UUID,
    db: Session = Depends(get_db),
):
    """Approve an action plan for execution."""
    try:
        plan = approve_action(action_id, db)
        return _serialize_plan(plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/reject", response_model=ActionItemResponse)
async def reject_action_item(
    action_id: UUID,
    request: ActionRejectRequest,
    db: Session = Depends(get_db),
):
    """Reject an action plan with a reason."""
    try:
        plan = reject_action(action_id, request.reason, db)
        return _serialize_plan(plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/execute", response_model=ActionExecutionResponse)
async def execute_action_item(
    action_id: UUID,
    db: Session = Depends(get_db),
):
    """Execute an approved action plan via the connected tool."""
    try:
        execution = execute_action(action_id, db)
        return execution
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")


@router.get("/{action_id}/execution-log", response_model=list[ActionExecutionResponse])
async def get_execution_log(
    action_id: UUID,
    db: Session = Depends(get_db),
):
    """Get execution history for an action plan."""
    executions = db.query(ActionExecution).filter(
        ActionExecution.action_item_id == action_id
    ).order_by(ActionExecution.executed_at.desc()).all()
    return executions


# ── Serialization helpers ─────────────────────────────────────────────────

def _serialize_plan(plan: ActionItem) -> ActionItemResponse:
    return ActionItemResponse(
        id=plan.id,
        workspace_id=plan.workspace_id,
        target_tool_id=plan.target_tool_id,
        action_type=plan.action_type,
        title=plan.title,
        description=plan.description,
        target_object_id=plan.target_object_id,
        owner=plan.owner,
        due_date=plan.due_date,
        payload=plan.payload_json,
        source_evidence=plan.source_evidence_json,
        confidence=plan.confidence,
        risk_level=plan.risk_level,
        approval_state=plan.approval_state,
        rejection_reason=plan.rejection_reason,
        trace_id=plan.trace_id,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


def _serialize_plans(plans: list[ActionItem]) -> list[ActionItemResponse]:
    return [_serialize_plan(p) for p in plans]

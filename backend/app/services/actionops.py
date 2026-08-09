"""ActionOps service — agentic action planning, review, and execution."""

import logging
import uuid
from datetime import datetime
from sqlalchemy.orm import Session as DBSession

from app.models import (
    ActionItem, ActionExecution, ConnectedTool, Task, Decision, RiskFlag,
    MeetingRequest, Source, ActionType, ApprovalStatus, ActionSeverity, ToolStatus,
)
from app.utils.llm import llm_json

logger = logging.getLogger(__name__)


def generate_action_items(
    workspace_id: uuid.UUID,
    user_id: uuid.UUID,
    db: DBSession,
    scope: str = "all",
) -> list[ActionItem]:
    """Analyze workspace evidence and generate proposed ActionItems."""

    # Gather evidence from the workspace
    tasks = db.query(Task).filter(Task.workspace_id == workspace_id).all()
    decisions = db.query(Decision).filter(Decision.workspace_id == workspace_id).all()
    risks = db.query(RiskFlag).filter(RiskFlag.workspace_id == workspace_id).all()
    meeting_requests = db.query(MeetingRequest).filter(MeetingRequest.workspace_id == workspace_id).all()

    # Get available connected tools
    tools = db.query(ConnectedTool).filter(
        ConnectedTool.user_id == user_id,
        ConnectedTool.status == ToolStatus.CONNECTED,
    ).all()

    tool_descriptions = []
    for tool in tools:
        caps = tool.capabilities_json or []
        tool_descriptions.append(
            f"- {tool.display_name} ({tool.tool_type}): can {', '.join(caps)}"
        )

    # Build evidence context
    evidence_parts = []
    evidence_items = []

    for t in tasks:
        evidence_parts.append(f"[TASK] {t.text} (owner: {t.owner or 'unassigned'}, "
                              f"status: {t.status.value}, priority: {t.priority.value})")
        evidence_items.append({
            "source_id": str(t.source_id) if t.source_id else None,
            "text": t.text,
            "type": "task",
            "entity_id": str(t.id),
        })

    for d in decisions:
        evidence_parts.append(f"[DECISION] {d.text} (approved by: {d.approver or 'unknown'})")
        evidence_items.append({
            "source_id": str(d.source_id) if d.source_id else None,
            "text": d.text,
            "type": "decision",
            "entity_id": str(d.id),
        })

    for r in risks:
        evidence_parts.append(f"[RISK] {r.text} (severity: {r.severity.value})")
        evidence_items.append({
            "source_id": str(r.source_id) if r.source_id else None,
            "text": r.text,
            "type": "risk",
            "entity_id": str(r.id),
        })

    for mr in meeting_requests:
        evidence_parts.append(f"[MEETING_REQUEST] {mr.title} (participants: {mr.participants or 'TBD'}, "
                              f"proposed_time: {mr.proposed_time or 'TBD'}, purpose: {mr.purpose or 'Follow-up'})")
        evidence_items.append({
            "source_id": str(mr.source_id) if mr.source_id else None,
            "text": f"{mr.title} with {mr.participants or 'team'}",
            "type": "meeting_request",
            "entity_id": str(mr.id),
        })

    if not evidence_parts:
        logger.info(f"No evidence found in workspace {workspace_id} for action planning")
        return []

    evidence_text = "\n".join(evidence_parts)
    tools_text = "\n".join(tool_descriptions) if tool_descriptions else "No tools connected."

    prompt = f"""You are an agentic work orchestration assistant. Based on the workspace evidence below,
propose specific actions that should be executed using the available connected tools.

AVAILABLE TOOLS:
{tools_text}

WORKSPACE EVIDENCE:
{evidence_text}

For each proposed action, return a JSON object with an "actions" array. Each action should have:
- "action_type": one of "create_task", "update_task", "create_doc", "update_doc", "send_message", "schedule_meeting", "custom"
- "title": short action title
- "description": detailed description of what to do
- "target_tool": which connected tool type to use (e.g., "jira", "slack", "google_docs", "google_calendar"), or null if no tool matches
- "target_object_id": existing object to update (e.g., ticket ID), or null for new items
- "owner": who should own this action
- "confidence": 0-1 how confident you are this action is correct
- "risk_level": "low", "medium", or "high"
- "payload": tool-specific payload object (for schedule_meeting include: title, participants, proposed_time, purpose)
- "evidence_refs": array of indices referencing which evidence items support this action

Rules:
- Only propose actions for tools that are actually connected
- If no tool matches, still propose the action with target_tool=null
- Score confidence based on how clear the evidence is
- Mark calendar scheduling and data modifying actions as medium+ risk
- Mark destructive or high-impact actions as high risk

Return ONLY the JSON object."""

    result = llm_json(prompt)
    actions_data = result.get("actions", [])

    action_items = []
    for action in actions_data:
        # Map action type
        action_type_map = {
            "create_task": ActionType.CREATE_TICKET,
            "update_task": ActionType.UPDATE_TICKET,
            "create_ticket": ActionType.CREATE_TICKET,
            "update_ticket": ActionType.UPDATE_TICKET,
            "create_doc": ActionType.CREATE_DOC,
            "update_doc": ActionType.UPDATE_DOC,
            "send_message": ActionType.SEND_MESSAGE,
            "schedule_meeting": ActionType.SCHEDULE_MEETING,
        }
        action_type = action_type_map.get(action.get("action_type"), ActionType.CUSTOM)

        # Find matching tool
        target_tool_id = None
        target_tool_type = action.get("target_tool")
        if target_tool_type:
            for tool in tools:
                if tool.tool_type == target_tool_type:
                    target_tool_id = tool.id
                    break

        # Map risk level
        risk_map = {
            "low": ActionSeverity.LIGHT,
            "light": ActionSeverity.LIGHT,
            "medium": ActionSeverity.MEDIUM,
            "high": ActionSeverity.HEAVY,
            "heavy": ActionSeverity.HEAVY,
        }
        risk_level = risk_map.get(action.get("risk_level", "low"), ActionSeverity.LIGHT)

        # Gather source evidence for this action
        evidence_refs = action.get("evidence_refs", [])
        source_evidence = []
        for ref_idx in evidence_refs:
            if 0 <= ref_idx < len(evidence_items):
                source_evidence.append(evidence_items[ref_idx])

        plan = ActionItem(
            workspace_id=workspace_id,
            target_tool_id=target_tool_id,
            action_type=action_type,
            title=action.get("title", "Untitled Action"),
            description=action.get("description"),
            target_object_id=action.get("target_object_id"),
            owner=action.get("owner"),
            payload_json=action.get("payload"),
            source_evidence_json=source_evidence if source_evidence else None,
            confidence=action.get("confidence", 0.5),
            severity=risk_level,
            approval_status=ApprovalStatus.PROPOSED,
        )
        db.add(plan)
        action_items.append(plan)

    db.commit()
    for plan in action_items:
        db.refresh(plan)

    logger.info(f"Generated {len(action_items)} action plans for workspace {workspace_id}")
    return action_items


def approve_action(action_item_id: uuid.UUID, db: DBSession) -> ActionItem:
    """Approve an action plan for execution."""
    plan = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
    if not plan:
        raise ValueError("Action plan not found")
    if plan.approval_state != ApprovalStatus.PROPOSED:
        raise ValueError(f"Action is in state '{plan.approval_state.value}', cannot approve")

    plan.approval_state = ApprovalStatus.APPROVED
    db.commit()
    db.refresh(plan)

    logger.info(f"Action plan {action_item_id} approved")
    return plan


def reject_action(action_item_id: uuid.UUID, reason: str, db: DBSession) -> ActionItem:
    """Reject an action plan with a reason."""
    plan = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
    if not plan:
        raise ValueError("Action plan not found")
    if plan.approval_state != ApprovalStatus.PROPOSED:
        raise ValueError(f"Action is in state '{plan.approval_state.value}', cannot reject")

    plan.approval_state = ApprovalStatus.REJECTED
    plan.rejection_reason = reason
    db.commit()
    db.refresh(plan)

    logger.info(f"Action plan {action_item_id} rejected: {reason}")
    return plan


def execute_action(action_item_id: uuid.UUID, db: DBSession) -> ActionExecution:
    """Execute an approved action plan via the connected tool adapter."""
    plan = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
    if not plan:
        raise ValueError("Action plan not found")
    if plan.approval_state != ApprovalStatus.APPROVED:
        raise ValueError(f"Action must be approved before execution (current: {plan.approval_state.value})")

    plan.approval_state = ApprovalStatus.EXECUTING
    db.commit()

    start_time = datetime.utcnow()
    execution = ActionExecution(
        action_item_id=plan.id,
        status="pending",
        request_json=plan.payload_json,
    )

    try:
        # Get the tool adapter
        if plan.target_tool_id:
            tool = db.query(ConnectedTool).filter(ConnectedTool.id == plan.target_tool_id).first()
            if not tool:
                raise ValueError("Connected tool not found")
            if tool.status != ToolStatus.CONNECTED:
                raise ValueError(f"Tool '{tool.display_name}' is not connected")

            # Execute via adapter
            from app.services.mcp.registry import get_adapter
            adapter = get_adapter(tool.tool_type)
            result = adapter.execute(
                action_type=plan.action_type.value,
                payload=plan.payload_json or {},
                tool_config=tool.config_json or {},
                auth_config=tool.auth_config_encrypted,
            )

            execution.status = "success"
            execution.response_json = result
        else:
            # No tool connected — log as manual action needed
            execution.status = "success"
            execution.response_json = {
                "message": "No tool connected. Action logged for manual execution.",
                "action_type": plan.action_type.value,
                "payload": plan.payload_json,
            }

        plan.approval_state = ApprovalStatus.EXECUTED

    except Exception as e:
        execution.status = "failed"
        execution.error_message = str(e)
        plan.approval_state = ApprovalStatus.FAILED
        logger.error(f"Action execution failed for {action_item_id}: {e}")

    end_time = datetime.utcnow()
    execution.duration_ms = int((end_time - start_time).total_seconds() * 1000)
    execution.executed_at = end_time

    db.add(execution)
    db.commit()
    db.refresh(execution)

    logger.info(f"Action {action_item_id} executed: {execution.status}")
    return execution


def update_action_item(
    action_item_id: uuid.UUID,
    updates: dict,
    db: DBSession,
) -> ActionItem:
    """Update an action plan (only when in PROPOSED state)."""
    plan = db.query(ActionItem).filter(ActionItem.id == action_item_id).first()
    if not plan:
        raise ValueError("Action plan not found")
    if plan.approval_state != ApprovalStatus.PROPOSED:
        raise ValueError("Can only edit actions in 'proposed' state")

    allowed_fields = ["title", "description", "target_object_id", "owner", "due_date", "payload_json"]
    for field, value in updates.items():
        if field in allowed_fields and value is not None:
            setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan

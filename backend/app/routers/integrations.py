"""Integrations router — manage MCP tool connections."""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ConnectedTool, ToolStatus
from app.schemas import ConnectedToolCreate, ConnectedToolResponse, AvailableToolInfo
from app.services.entitlements import get_default_user, check_feature_limit
from app.services.mcp.registry import list_available_tools, get_adapter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/integrations", tags=["Integrations"])


@router.get("/available-tools", response_model=list[AvailableToolInfo])
async def get_available_tools():
    """List all available tool types that can be connected."""
    tools = list_available_tools()
    return tools


@router.get("/connected", response_model=list[ConnectedToolResponse])
async def get_connected_tools(
    db: Session = Depends(get_db),
):
    """List all tools connected by the current user."""
    user = get_default_user(db)
    tools = db.query(ConnectedTool).filter(
        ConnectedTool.user_id == user.id
    ).order_by(ConnectedTool.created_at.desc()).all()

    result = []
    for tool in tools:
        result.append(ConnectedToolResponse(
            id=tool.id,
            tool_type=tool.tool_type,
            display_name=tool.display_name,
            capabilities=[c["name"] for c in (tool.capabilities_json or [])],
            status=tool.status,
            config=tool.config_json,
            last_verified_at=tool.last_verified_at,
            created_at=tool.created_at,
        ))
    return result


@router.post("/connect", response_model=ConnectedToolResponse)
async def connect_tool(
    request: ConnectedToolCreate,
    db: Session = Depends(get_db),
):
    """Connect a new MCP tool."""
    user = get_default_user(db)

    # Check entitlement limit
    max_tools = check_feature_limit(user, "max_connected_tools")
    if max_tools > 0:
        current_count = db.query(ConnectedTool).filter(
            ConnectedTool.user_id == user.id,
            ConnectedTool.status == ToolStatus.CONNECTED,
        ).count()
        if current_count >= max_tools:
            raise HTTPException(
                status_code=403,
                detail=f"Your plan allows a maximum of {max_tools} connected tools"
            )

    # Get adapter to discover capabilities
    try:
        adapter = get_adapter(request.tool_type)
        capabilities = [c.to_dict() for c in adapter.discover_capabilities()]
    except ValueError:
        capabilities = []

    # Create the connection record
    # TODO: Encrypt auth_config before storing
    auth_encrypted = str(request.auth_config) if request.auth_config else None

    tool = ConnectedTool(
        user_id=user.id,
        tool_type=request.tool_type,
        display_name=request.display_name,
        auth_config_encrypted=auth_encrypted,
        capabilities_json=capabilities,
        status=ToolStatus.CONNECTED,
        config_json=request.config,
    )
    db.add(tool)
    db.commit()
    db.refresh(tool)

    logger.info(f"Connected tool: {tool.display_name} ({tool.tool_type})")

    return ConnectedToolResponse(
        id=tool.id,
        tool_type=tool.tool_type,
        display_name=tool.display_name,
        capabilities=[c["name"] for c in capabilities],
        status=tool.status,
        config=tool.config_json,
        last_verified_at=tool.last_verified_at,
        created_at=tool.created_at,
    )


@router.delete("/{tool_id}")
async def disconnect_tool(
    tool_id: UUID,
    db: Session = Depends(get_db),
):
    """Disconnect a tool."""
    user = get_default_user(db)
    tool = db.query(ConnectedTool).filter(
        ConnectedTool.id == tool_id,
        ConnectedTool.user_id == user.id,
    ).first()

    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    tool.status = ToolStatus.DISCONNECTED
    db.commit()

    logger.info(f"Disconnected tool: {tool.display_name}")
    return {"status": "disconnected", "tool_id": str(tool_id)}


@router.get("/{tool_id}/capabilities")
async def get_tool_capabilities(
    tool_id: UUID,
    db: Session = Depends(get_db),
):
    """Get capabilities of a connected tool."""
    tool = db.query(ConnectedTool).filter(ConnectedTool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return {"tool_type": tool.tool_type, "capabilities": tool.capabilities_json or []}

"""Bot service auth router — manage service tokens for organization bot service."""

import logging
import uuid
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BotServiceToken, MeetingSession, SessionStatus, MeetingCaptureMode
from app.routers.auth import get_current_user
from app.services.auth import get_user_org
from app.schemas import (
    BotServiceTokenCreateRequest, BotServiceTokenResponse,
    BotServiceVerifyRequest, BotServiceVerifyResponse,
    OrgBotStatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/bot-service", tags=["Bot Service Auth"])


@router.post("/token", response_model=BotServiceTokenResponse)
async def create_bot_token(
    request: BotServiceTokenCreateRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a bot service token for the user's organization."""
    org = get_user_org(db, user.id)
    if not org:
        raise HTTPException(status_code=404, detail="No organization found")

    raw_token = secrets.token_urlsafe(64)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    bot_token = BotServiceToken(
        org_id=org.id,
        service_name=request.service_name,
        token_hash=token_hash,
        scopes_json=request.scopes or [],
        is_active=True,
    )
    db.add(bot_token)
    db.commit()
    db.refresh(bot_token)

    logger.info(f"Bot service token created: {request.service_name} for org {org.name}")
    return BotServiceTokenResponse(
        id=bot_token.id,
        org_id=bot_token.org_id,
        service_name=bot_token.service_name,
        token=raw_token,  # Only returned on creation
        scopes=bot_token.scopes_json,
        is_active=bot_token.is_active,
        last_used_at=bot_token.last_used_at,
        created_at=bot_token.created_at,
    )


@router.post("/verify", response_model=BotServiceVerifyResponse)
async def verify_bot_token(
    request: BotServiceVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify a bot service token (used by org bot service on startup)."""
    token_hash = hashlib.sha256(request.bot_token.encode()).hexdigest()
    token = db.query(BotServiceToken).filter(
        BotServiceToken.token_hash == token_hash,
        BotServiceToken.is_active == True,
    ).first()

    if not token:
        return BotServiceVerifyResponse(valid=False)

    from datetime import datetime
    token.last_used_at = datetime.utcnow()
    db.commit()

    return BotServiceVerifyResponse(
        valid=True,
        token_id=token.id,
        org_id=token.org_id,
    )


@router.get("/tokens", response_model=list[BotServiceTokenResponse])
async def list_bot_tokens(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all bot service tokens for the user's organization."""
    org = get_user_org(db, user.id)
    if not org:
        raise HTTPException(status_code=404, detail="No organization found")

    tokens = db.query(BotServiceToken).filter(
        BotServiceToken.org_id == org.id,
    ).order_by(BotServiceToken.created_at.desc()).all()

    return [
        BotServiceTokenResponse(
            id=t.id,
            org_id=t.org_id,
            service_name=t.service_name,
            scopes=t.scopes_json,
            is_active=t.is_active,
            last_used_at=t.last_used_at,
            created_at=t.created_at,
        )
        for t in tokens
    ]


@router.delete("/token/{token_id}")
async def revoke_bot_token(
    token_id: uuid.UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a bot service token."""
    org = get_user_org(db, user.id)
    if not org:
        raise HTTPException(status_code=404, detail="No organization found")

    token = db.query(BotServiceToken).filter(
        BotServiceToken.id == token_id,
        BotServiceToken.org_id == org.id,
    ).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    token.is_active = False
    db.commit()
    logger.info(f"Bot token revoked: {token.service_name} for org {org.name}")
    return {"message": "Token revoked", "token_id": str(token_id)}


@router.get("/status", response_model=OrgBotStatusResponse)
async def get_bot_status(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the organization bot service status for dashboard display."""
    org = get_user_org(db, user.id)
    if not org:
        return OrgBotStatusResponse(token_configured=False)

    token = db.query(BotServiceToken).filter(
        BotServiceToken.org_id == org.id,
        BotServiceToken.is_active == True,
    ).first()

    if not token:
        return OrgBotStatusResponse(token_configured=False)

    active_count = db.query(MeetingSession).filter(
        MeetingSession.bot_service_token_id == token.id,
        MeetingSession.status.in_([
            SessionStatus.LISTENING,
            SessionStatus.JOINING,
            SessionStatus.PENDING,
        ]),
    ).count()

    completed_count = db.query(MeetingSession).filter(
        MeetingSession.bot_service_token_id == token.id,
        MeetingSession.status == SessionStatus.COMPLETED,
    ).count()

    return OrgBotStatusResponse(
        token_configured=True,
        service_name=token.service_name,
        active_sessions=active_count,
        completed_sessions=completed_count,
    )

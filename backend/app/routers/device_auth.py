"""Device auth router — stub endpoints for local companion pairing and verification."""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MeetingSession, SessionStatus
from app.routers.auth import get_local_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/devices", tags=["Device Auth"])


# ── Schemas ───────────────────────────────────────────────────────────────

class DevicePairRequest(BaseModel):
    device_name: str
    device_platform: str


class DevicePairResponse(BaseModel):
    device_id: str
    device_token: str
    device_name: str
    device_platform: str
    created_at: datetime


class DeviceVerifyRequest(BaseModel):
    device_token: str


class DeviceVerifyResponse(BaseModel):
    valid: bool
    device_id: Optional[str] = None
    user_id: Optional[str] = None


class LocalCompanionStatusResponse(BaseModel):
    paired: bool
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    device_platform: Optional[str] = None
    is_active: Optional[bool] = None
    last_seen_at: Optional[datetime] = None
    active_session_id: Optional[str] = None
    active_session_status: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────

# Constant token and UUID for the local-only single user companion
LOCAL_DEVICE_ID = "00000000-0000-0000-0000-000000000000"
LOCAL_TOKEN = "local-companion-token"


@router.post("/pair", response_model=DevicePairResponse)
async def pair_device(
    request: DevicePairRequest,
    user=Depends(get_local_user),
):
    """Pair the local companion device."""
    logger.info(f"Pairing local companion: {request.device_name} ({request.device_platform})")
    return DevicePairResponse(
        device_id=LOCAL_DEVICE_ID,
        device_token=LOCAL_TOKEN,
        device_name=request.device_name,
        device_platform=request.device_platform,
        created_at=datetime.utcnow(),
    )


@router.get("")
async def list_devices(
    user=Depends(get_local_user),
):
    """List paired devices (returns the local companion)."""
    return [
        {
            "id": LOCAL_DEVICE_ID,
            "device_name": "Local Companion",
            "device_platform": "local",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_seen_at": datetime.utcnow(),
        }
    ]


@router.delete("/{device_id}")
async def revoke_device(
    device_id: str,
    user=Depends(get_local_user),
):
    """Revoke a paired device."""
    logger.info(f"Revoking companion device {device_id}")
    return {"message": "Device revoked", "device_id": device_id}


@router.post("/verify", response_model=DeviceVerifyResponse)
async def verify_device(
    request: DeviceVerifyRequest,
    user=Depends(get_local_user),
):
    """Verify the device token."""
    valid = request.device_token == LOCAL_TOKEN
    return DeviceVerifyResponse(
        valid=valid,
        device_id=LOCAL_DEVICE_ID if valid else None,
        user_id=str(user.id) if valid else None,
    )


@router.get("/companion-status", response_model=LocalCompanionStatusResponse)
async def get_companion_status(
    user=Depends(get_local_user),
    db: Session = Depends(get_db),
):
    """Get the local companion status for the web dashboard."""
    # Check for active listening sessions
    active_session = db.query(MeetingSession).filter(
        MeetingSession.status.in_([
            SessionStatus.LISTENING,
            SessionStatus.PENDING,
        ]),
    ).first()

    return LocalCompanionStatusResponse(
        paired=True,
        device_id=LOCAL_DEVICE_ID,
        device_name="Local Companion",
        device_platform="local",
        is_active=True,
        last_seen_at=datetime.utcnow(),
        active_session_id=str(active_session.id) if active_session else None,
        active_session_status=active_session.status.value if active_session else None,
    )

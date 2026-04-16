"""Device auth router — pair, list, verify, and revoke local companion devices."""

import logging
import uuid
import hashlib
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DeviceToken, MeetingSession, SessionStatus
from app.routers.auth import get_current_user
from app.schemas import (
    DevicePairRequest, DevicePairResponse, DeviceTokenResponse,
    DeviceVerifyRequest, DeviceVerifyResponse, LocalCompanionStatusResponse,
    SessionStatusEnum,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/devices", tags=["Device Auth"])


@router.post("/pair", response_model=DevicePairResponse)
async def pair_device(
    request: DevicePairRequest,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Pair a local companion device with the current user's account.

    Device starts as PENDING (is_active=False). It only becomes active
    when the companion app successfully verifies the token via /verify.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    device = DeviceToken(
        user_id=user.id,
        device_name=request.device_name,
        device_platform=request.device_platform,
        token_hash=token_hash,
        is_active=False,  # Pending until companion verifies
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    logger.info(f"Device paired (pending): {device.device_name} ({device.device_platform}) for {user.email}")
    return DevicePairResponse(
        device_id=device.id,
        device_token=raw_token,
        device_name=device.device_name,
        device_platform=device.device_platform,
        created_at=device.created_at,
    )


@router.get("", response_model=list[DeviceTokenResponse])
async def list_devices(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all paired devices for the current user."""
    devices = db.query(DeviceToken).filter(
        DeviceToken.user_id == user.id,
    ).order_by(DeviceToken.created_at.desc()).all()
    return devices


@router.delete("/{device_id}")
async def revoke_device(
    device_id: uuid.UUID,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke (deactivate) a paired device."""
    device = db.query(DeviceToken).filter(
        DeviceToken.id == device_id,
        DeviceToken.user_id == user.id,
    ).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.is_active = False
    db.commit()
    logger.info(f"Device revoked: {device.device_name} for {user.email}")
    return {"message": "Device revoked", "device_id": str(device_id)}


@router.post("/verify", response_model=DeviceVerifyResponse)
async def verify_device(
    request: DeviceVerifyRequest,
    db: Session = Depends(get_db),
):
    """Verify a device token (used by companion app on startup).

    On first successful verification, activates the device (pending → active).
    This ensures devices only show as active after the companion app confirms.
    """
    token_hash = hashlib.sha256(request.device_token.encode()).hexdigest()
    device = db.query(DeviceToken).filter(
        DeviceToken.token_hash == token_hash,
    ).first()

    if not device:
        return DeviceVerifyResponse(valid=False)

    from datetime import datetime

    # Activate device on first successful verification
    if not device.is_active:
        device.is_active = True
        logger.info(f"Device activated via verify: {device.device_name}")

    device.last_seen_at = datetime.utcnow()
    db.commit()

    return DeviceVerifyResponse(
        valid=True,
        device_id=device.id,
        user_id=device.user_id,
    )


@router.get("/companion-status", response_model=LocalCompanionStatusResponse)
async def get_companion_status(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the local companion status for dashboard display."""
    device = db.query(DeviceToken).filter(
        DeviceToken.user_id == user.id,
        DeviceToken.is_active == True,
    ).order_by(DeviceToken.last_seen_at.desc().nullslast()).first()

    if not device:
        return LocalCompanionStatusResponse(paired=False)

    # Check for active sessions from this device
    active_session = db.query(MeetingSession).filter(
        MeetingSession.device_id == device.id,
        MeetingSession.status.in_([
            SessionStatus.LISTENING,
            SessionStatus.PENDING,
        ]),
    ).first()

    return LocalCompanionStatusResponse(
        paired=True,
        device_id=device.id,
        device_name=device.device_name,
        device_platform=device.device_platform,
        is_active=device.is_active,
        last_seen_at=device.last_seen_at,
        active_session_id=active_session.id if active_session else None,
        active_session_status=SessionStatusEnum(active_session.status.value) if active_session else None,
    )

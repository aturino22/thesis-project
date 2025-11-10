"""FastAPI application exposing OTP dispatch operations."""

from __future__ import annotations

import logging

from fastapi import Depends, FastAPI, HTTPException, status

from .config import Settings, get_settings
from .dispatchers import dispatch_email, dispatch_sms
from .models import OtpDispatchRequest, OtpDispatchResponse

LOGGER = logging.getLogger("otp_service")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s: %(message)s")

app = FastAPI(title="OTP Delivery Service")


@app.get("/health", status_code=status.HTTP_200_OK)
async def health() -> dict[str, str]:
    """Simple health check endpoint."""

    return {"status": "ok"}


@app.post(
    "/otp/send",
    response_model=OtpDispatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Dispatch an OTP via email or SMS",
)
async def send_otp(
    payload: OtpDispatchRequest,
    settings: Settings = Depends(get_settings),
) -> OtpDispatchResponse:
    """Dispatch an OTP code using the configured channel."""

    LOGGER.info("Dispatching OTP for user %s over channel %s", payload.user_id, payload.channel)
    if payload.metadata:
        LOGGER.info("OTP metadata: %s", payload.metadata)
    subject = payload.subject or "Fintech Thesis OTP code"
    body = (
        f"Your verification code is {payload.code}. "
        f"It expires at {payload.expires_at.isoformat()}."
    )

    try:
        if payload.channel == "EMAIL":
            await dispatch_email(settings=settings, recipient=str(payload.email), subject=subject, body=body)
        else:
            await dispatch_sms(settings=settings, phone_number=str(payload.phone_number), body=body)
    except Exception as exc:  # noqa: BLE001 - we want to wrap any delivery failure
        LOGGER.exception("Failed to dispatch OTP", exc_info=exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OTP dispatch failed",
        ) from exc

    return OtpDispatchResponse(status="sent", channel=payload.channel, expires_at=payload.expires_at)

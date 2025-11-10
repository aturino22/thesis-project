"""Pydantic models shared by the OTP delivery service."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ValidationInfo, model_validator

OtpChannel = Literal["EMAIL", "SMS"]


class OtpDispatchRequest(BaseModel):
    """Incoming payload for OTP dispatch."""

    user_id: UUID
    channel: OtpChannel
    code: str = Field(pattern=r"^\d{6}$", description="OTP numeric code (6 digits).")
    expires_at: datetime
    email: EmailStr | None = Field(default=None, description="Target email for channel EMAIL.")
    phone_number: str | None = Field(
        default=None,
        description="Target phone number for channel SMS (simulated).",
    )
    subject: str | None = Field(default=None, description="Optional email subject override.")
    metadata: dict[str, Any] | None = Field(
        default=None,
        description="Additional metadata forwarded to log output.",
    )

    @model_validator(mode="after")
    def validate_destination(self, info: ValidationInfo) -> "OtpDispatchRequest":
        """Ensure the required destination is provided based on the channel."""

        if self.channel == "EMAIL" and not self.email:
            raise ValueError("Field 'email' is required when channel is EMAIL.")
        if self.channel == "SMS" and not self.phone_number:
            raise ValueError("Field 'phone_number' is required when channel is SMS.")
        return self


class OtpDispatchResponse(BaseModel):
    """Outgoing response for OTP dispatch."""

    status: Literal["sent"]
    channel: OtpChannel
    expires_at: datetime

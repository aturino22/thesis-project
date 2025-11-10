"""HTTP client used to communicate with the OTP delivery service."""

from __future__ import annotations

from typing import Any, Literal

import httpx


OtpChannelCode = Literal["EMAIL", "SMS"]


class OtpServiceError(RuntimeError):
    """Raised when the OTP service is unreachable or returns an error."""


class OtpServiceClient:
    """Minimal HTTP client for the OTP delivery microservice."""

    def __init__(self, *, base_url: str, timeout_seconds: float) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout_seconds

    async def dispatch(self, payload: dict[str, Any]) -> None:
        """
        Invoke the remote OTP service with the provided payload.

        Args:
            payload: JSON serialisable dictionary accepted by the OTP service.
        """

        try:
            async with httpx.AsyncClient(base_url=self._base_url, timeout=self._timeout) as client:
                response = await client.post("/otp/send", json=payload)
        except httpx.RequestError as exc:  # pragma: no cover - network failures are reported upstream
            raise OtpServiceError("OTP service unreachable") from exc

        if response.status_code != httpx.codes.ACCEPTED:
            detail = response.text or "OTP service rejected the request"
            raise OtpServiceError(detail)

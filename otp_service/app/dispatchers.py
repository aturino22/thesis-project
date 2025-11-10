"""Channel-specific logic to deliver OTP codes."""

from __future__ import annotations

import asyncio
import logging
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Final

from .config import Settings

LOGGER: Final = logging.getLogger("otp_service.dispatchers")


async def dispatch_email(*, settings: Settings, recipient: str, subject: str, body: str) -> None:
    """Send the OTP via email using the configured SMTP transport."""

    if not settings.smtp_host:
        LOGGER.info("SMTP host not configured; simulating email send to %s", recipient)
        LOGGER.info("Subject: %s", subject)
        LOGGER.info("Body:%s%s", "\n", body)
        return

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    def _send() -> None:
        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as smtp:
                if settings.smtp_username:
                    smtp.login(settings.smtp_username, settings.smtp_password or "")
                smtp.send_message(message)
                return

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password or "")
            smtp.send_message(message)

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _send)


async def dispatch_sms(*, settings: Settings, phone_number: str, body: str) -> None:
    """Simulate SMS delivery by logging (and optionally appending to a file)."""

    message = f"OTP for {phone_number}: {body}"
    LOGGER.info(message)

    if settings.sms_log_file:
        log_path = Path(settings.sms_log_file)

        def _append() -> None:
            log_path.parent.mkdir(parents=True, exist_ok=True)
            with log_path.open("a", encoding="utf-8") as stream:
                stream.write(message + "\n")

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _append)

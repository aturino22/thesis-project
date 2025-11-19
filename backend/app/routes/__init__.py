"""Router package per esporre gli endpoint pubblici dell'applicazione."""

from .accounts import router as accounts_router
from .auth import router as auth_router
from .crypto_positions import router as crypto_positions_router
from .market import router as market_router
from .otp import router as otp_router
from .transactions import router as transactions_router
from .profile import router as profile_router
from .withdrawals import router as withdrawals_router

__all__ = [
    "accounts_router",
    "auth_router",
    "transactions_router",
    "otp_router",
    "crypto_positions_router",
    "market_router",
    "profile_router",
    "withdrawals_router",
]

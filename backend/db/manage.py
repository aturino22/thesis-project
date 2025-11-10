"""Utility CLI per gestire migrazioni e seed del database."""

from __future__ import annotations

import argparse
import sys

from backend.db.migrations.run_all import main as run_migrations
from backend.db.seeds.run_all import main as run_seeds


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parsa gli argomenti della riga di comando."""
    parser = argparse.ArgumentParser(description="Gestione database (migrazioni e seed).")
    parser.add_argument(
        "command",
        choices=["migrate", "seed", "bootstrap"],
        help="Operazione da eseguire.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Entry point del comando `python -m backend.db.manage`."""
    args = parse_args(argv)

    if args.command == "migrate":
        return run_migrations()
    if args.command == "seed":
        return run_seeds()
    if args.command == "bootstrap":
        result = run_migrations()
        if result != 0:
            return result
        return run_seeds()
    return 0


if __name__ == "__main__":
    sys.exit(main())

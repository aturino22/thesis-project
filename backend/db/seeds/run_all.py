from __future__ import annotations

# Esegue tutti gli script di seed del database in ordine deterministico.

import sys
from collections import namedtuple
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Iterable, List

from dotenv import load_dotenv

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parents[3]))
    from backend.db.seeds import SEED_MODULE_PATHS, iter_seed_modules  # type: ignore
else:
    from . import SEED_MODULE_PATHS, iter_seed_modules

SeedResult = namedtuple("SeedResult", ["module", "status", "error"])


@dataclass
class SeedExecutionContext:
    """Contenitore di contesto per eseguire i moduli seed in modo sequenziale."""

    module_paths: List[str]
    results: List[SeedResult]

    def run(self) -> None:
        """
        Esegue tutti i moduli seed configurati nell'ordine definito.

        Restituisce:
            None: I risultati vengono aggiunti a ``self.results`` come effetto collaterale.
        """
        for module in iter_seed_modules(self.module_paths):
            self._execute_module(module)

    def _execute_module(self, module: ModuleType) -> None:
        """
        Esegue la funzione ``seed`` esposta da un determinato modulo.

        Argomenti:
            module: Modulo importato che espone una funzione ``seed`` chiamabile.

        Restituisce:
            None: L'esito viene registrato all'interno di ``self.results``.
        """
        module_name = module.__name__
        seed_callable = getattr(module, "seed", None)
        if seed_callable is None or not callable(seed_callable):
            result = SeedResult(module_name, "skipped", ValueError("No callable 'seed' function"))
            self.results.append(result)
            print(f"[SKIP] {module_name}: missing callable seed()")
            return
        print(f"[RUN ] {module_name}...")
        try:
            seed_callable()
        except Exception as exc:  # noqa: BLE001 - propagate controlled failure
            result = SeedResult(module_name, "failed", exc)
            self.results.append(result)
            print(f"[FAIL] {module_name}: {exc}")
            raise
        else:
            result = SeedResult(module_name, "succeeded", None)
            self.results.append(result)
            print(f"[DONE] {module_name}")


def load_environment() -> None:
    """
    Carica le variabili d'ambiente definite nei file `.env` locali, se presenti.

    Restituisce:
        None: L'ambiente del processo viene arricchito in-place.
    """
    project_root = Path(__file__).resolve().parents[3]
    env_files = [
        project_root / ".env",
        project_root / "backend" / ".env",
    ]
    for env_file in env_files:
        load_dotenv(env_file, override=False)


def main(module_paths: Iterable[str] | None = None) -> int:
    """
    Punto di ingresso per lanciare tutti i moduli seed.

    Argomenti:
        module_paths: Iterable opzionale che sostituisce l'elenco predefinito dei moduli.

    Restituisce:
        int: Codice di uscita (0 se successo, 1 in caso di errore).
    """
    load_environment()
    context = SeedExecutionContext(list(module_paths or SEED_MODULE_PATHS), [])
    try:
        context.run()
    except Exception:
        print("\nSeed execution aborted due to errors.")
        return 1

    print("\nAll seed scripts completed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Minimal standalone runner for the backend test modules.

`pytest` is the supported way to run these tests:

    python -m pytest backend/tests -q

This runner exists so the suite can also be executed in a bare environment that
has no pytest installed (for example an offline CI bootstrap image). It provides
just enough of the pytest API used by the tests (`pytest.raises`, `pytest.skip`,
`pytest.mark`) and reports the same PASS/FAIL information.
"""

from __future__ import annotations

import contextlib
import importlib.util
import sys
import traceback
import types
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


class Skipped(Exception):
    pass


def _install_pytest_shim() -> None:
    if "pytest" in sys.modules:
        return
    try:
        import pytest  # noqa: F401

        return
    except ModuleNotFoundError:
        pass

    shim = types.ModuleType("pytest")

    class _Info:
        def __init__(self) -> None:
            self.value: BaseException | None = None

    @contextlib.contextmanager
    def raises(expected, **_kwargs):
        info = _Info()
        try:
            yield info
        except expected as exc:  # noqa: B902
            info.value = exc
            return
        raise AssertionError(f"expected {getattr(expected, '__name__', expected)} to be raised")

    def skip(reason: str = "", **_kwargs):
        raise Skipped(reason)

    class _Mark:
        def __getattr__(self, _name):
            def decorator(*args, **kwargs):
                if len(args) == 1 and callable(args[0]) and not kwargs:
                    return args[0]
                return lambda func: func

            return decorator

    shim.raises = raises
    shim.skip = skip
    shim.fail = lambda msg="", **_k: (_ for _ in ()).throw(AssertionError(msg))
    shim.mark = _Mark()
    shim.approx = lambda value, rel=1e-6, abs=1e-9: value  # noqa: A002
    sys.modules["pytest"] = shim


def run_module(path: Path) -> tuple[int, int, int]:
    spec = importlib.util.spec_from_file_location(path.stem, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    passed = failed = skipped = 0
    for name in sorted(vars(module)):
        if not name.startswith("test_"):
            continue
        func = getattr(module, name)
        if not callable(func):
            continue
        try:
            func()
        except Skipped as exc:
            skipped += 1
            print(f"SKIP {path.name}::{name} - {exc}")
        except Exception:  # noqa: BLE001
            failed += 1
            print(f"FAIL {path.name}::{name}")
            traceback.print_exc()
        else:
            passed += 1
            print(f"PASS {path.name}::{name}")
    return passed, failed, skipped


def main(argv: list[str]) -> int:
    _install_pytest_shim()
    targets = [Path(a) for a in argv[1:]] or sorted(Path(__file__).parent.glob("test_*.py"))
    totals = [0, 0, 0]
    for target in targets:
        result = run_module(target)
        totals = [a + b for a, b in zip(totals, result)]
    print(f"\n{totals[0]} passed, {totals[1]} failed, {totals[2]} skipped")
    return 1 if totals[1] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

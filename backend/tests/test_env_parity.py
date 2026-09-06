"""Environment-variable parity between code and every .env.example template.

The rescan found 20 documented env names that ``Settings`` never consumed. These
tests fail the build if the templates and ``app/config/settings.py`` drift apart
again.

Settings is read with ``ast`` rather than imported, so this suite runs in a bare
offlineenvironment where pydantic is not installed. When pydantic IS installed the
live model is cross-checked as well.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SETTINGS_PY = ROOT / "backend" / "app" / "config" / "settings.py"
BACKEND_EXAMPLE = ROOT / "backend" / ".env.example"
MOBILE_EXAMPLE = ROOT / "mobile" / ".env.example"
ROOT_EXAMPLE = ROOT / ".env.example"

# Documented on purpose but not part of the Settings model: these are
# docker-compose / container interpolation values only.
NON_SETTINGS = {
    "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "POSTGRES_PORT",
    "REDIS_PORT", "API_PORT", "PORT",
}


def _parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip()
    return values


def _settings_class() -> ast.ClassDef:
    tree = ast.parse(SETTINGS_PY.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == "Settings":
            return node
    raise AssertionError("class Settings not found in app/config/settings.py")


def _alias_strings(call: ast.Call) -> set[str]:
    """Pull every literal string out of a Field(validation_alias=...) call."""
    names: set[str] = set()
    for keyword in call.keywords:
        if keyword.arg != "validation_alias":
            continue
        for sub in ast.walk(keyword.value):
            if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                names.add(sub.value.upper())
    return names


def _settings_fields() -> dict[str, set[str]]:
    """Map each Settings field to every env name that can populate it."""
    fields: dict[str, set[str]] = {}
    for node in _settings_class().body:
        if not isinstance(node, ast.AnnAssign) or not isinstance(node.target, ast.Name):
            continue
        name = node.target.id
        if name.startswith("_") or name == "model_config":
            continue
        accepted = {name.upper()}
        if isinstance(node.value, ast.Call):
            accepted |= _alias_strings(node.value)
        fields[name] = accepted
    assert fields, "no Settings fields parsed"
    return fields


def _accepted_env_names() -> set[str]:
    names: set[str] = set()
    for accepted in _settings_fields().values():
        names |= accepted
    return names


def test_settings_parses_and_exposes_fields():
    fields = _settings_fields()
    assert len(fields) > 40, f"expected a large Settings model, parsed {len(fields)}"


def test_every_documented_backend_name_is_consumed():
    documented = set(_parse_env(BACKEND_EXAMPLE))
    orphans = sorted(documented - _accepted_env_names() - NON_SETTINGS)
    assert not orphans, (
        "backend/.env.example documents names that settings.py never reads: "
        f"{orphans}"
    )


def test_legacy_aliases_still_resolve():
    """Existing deployments must keep booting after the canonical rename."""
    accepted = _accepted_env_names()
    for legacy in (
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "REFRESH_TOKEN_EXPIRE_DAYS",
        "STORAGE_PROVIDER",
        "STORAGE_BUCKET",
        "STORAGE_ENDPOINT",
        "STORAGE_REGION",
        "STORAGE_ACCESS_KEY",
        "STORAGE_SECRET_KEY",
    ):
        assert legacy in accepted, f"{legacy} must remain an accepted alias"


def test_canonical_names_are_documented():
    documented = set(_parse_env(BACKEND_EXAMPLE))
    for canonical in (
        "ACCESS_TOKEN_MINUTES", "REFRESH_TOKEN_DAYS", "STORAGE_BACKEND",
        "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY",
        "DATABASE_POOL_SIZE", "DATABASE_MAX_OVERFLOW",
        "CELERY_RESULT_BACKEND", "SMTP_USE_TLS",
        "GOOGLE_AUTH_ENABLED", "GOOGLE_WEB_CLIENT_ID", "GOOGLE_ANDROID_CLIENT_ID",
    ):
        assert canonical in documented, f"{canonical} must be documented"


def test_previously_orphaned_names_are_now_real_settings():
    """These were documented but unused before the fix."""
    fields = _settings_fields()
    for field in (
        "database_pool_size", "database_max_overflow", "database_pool_timeout",
        "database_pool_recycle", "celery_result_backend", "smtp_use_tls",
    ):
        assert field in fields, f"{field} must be a real setting"


def test_pool_settings_are_actually_consumed():
    source = (ROOT / "backend" / "app" / "database" / "session.py").read_text()
    assert "settings.database_pool_size" in source
    assert "settings.database_max_overflow" in source
    assert "pool_size=10" not in source, "pool size must not be hardcoded"


def test_celery_uses_broker_and_result_backend():
    source = (ROOT / "backend" / "app" / "workers" / "celery_app.py").read_text()
    assert "s.broker_url" in source
    assert "s.result_backend" in source


def test_smtp_tls_is_not_hardcoded():
    source = (ROOT / "backend" / "app" / "services" / "auth_tokens.py").read_text()
    assert "start_tls=s.smtp_use_tls" in source
    assert "start_tls=True" not in source


def test_root_env_example_exists():
    assert ROOT_EXAMPLE.exists(), "scripts/validate_project.py requires a root .env.example"


def test_validate_environment_uses_canonical_storage_names():
    source = (ROOT / "scripts" / "validate_environment.py").read_text()
    assert "STORAGE_PROVIDER" not in source, (
        "validate_environment.py must require the canonical S3_* names"
    )
    assert "S3_BUCKET" in source


def test_no_secret_is_exposed_through_expo_public():
    """EXPO_PUBLIC_* values are embedded in the APK, so none may be a secret."""
    forbidden = re.compile(r"SECRET|PASSWORD|PRIVATE_KEY|_API_KEY")
    for name in _parse_env(MOBILE_EXAMPLE):
        if name.startswith("EXPO_PUBLIC_"):
            assert not forbidden.search(name), f"{name} must not be EXPO_PUBLIC_"


def test_google_client_secret_is_backend_only():
    assert "GOOGLE_CLIENT_SECRET" in _parse_env(BACKEND_EXAMPLE)
    assert not any("CLIENT_SECRET" in n for n in _parse_env(MOBILE_EXAMPLE))


def test_live_settings_model_matches_static_parse_when_pydantic_available():
    """Cross-check the AST parse against the real model, when importable."""
    try:
        import sys

        sys.path.insert(0, str(ROOT / "backend"))
        from app.config.settings import Settings  # noqa: PLC0415
    except Exception as exc:  # pragma: no cover - offline sandbox
        import pytest

        pytest.skip(f"pydantic-settings unavailable: {exc}")
    static = set(_settings_fields())
    live = set(Settings.model_fields)
    assert static <= live, f"AST parse found unknown fields: {sorted(static - live)}"

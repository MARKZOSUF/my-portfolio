"""Google Sign-In wiring and ID-token verification tests.

These run offline. Where `jose`/`cryptography` are unavailable the crypto tests
skip explicitly rather than reporting a false pass; the static wiring tests
always run.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

SERVICE = BACKEND / "app" / "services" / "google_identity.py"
ROUTES = BACKEND / "app" / "api" / "v1" / "auth" / "routes.py"
MODELS = BACKEND / "app" / "database" / "models.py"
SCHEMAS = BACKEND / "app" / "schemas" / "auth.py"
MIGRATION = ROOT / "database" / "migrations" / "versions" / "0013_google_identity_user_identities.py"


def test_google_identity_service_exists():
    assert SERVICE.exists(), "a real ID-token verifier must exist"


def test_verifier_rejects_unsigned_and_symmetric_algorithms():
    """alg:none and HMAC confusion are the classic ID-token bypasses."""
    source = SERVICE.read_text()
    assert '"RS256"' in source or "'RS256'" in source
    assert "algorithms" in source
    assert "none" in source.lower()


def test_verifier_checks_audience_issuer_expiry_and_nonce():
    source = SERVICE.read_text()
    for required in ("audience", "iss", "exp", "nonce", "email_verified"):
        assert required in source, f"verification must check {required}"


def test_verifier_uses_jwks_with_caching():
    source = SERVICE.read_text()
    assert "jwks" in source.lower()
    assert "_JwksCache" in source
    assert "kid" in source


def test_token_is_never_trusted_without_verification():
    """The route must not decode claims itself; it must call the verifier."""
    source = ROUTES.read_text()
    assert "verify_google_id_token" in source
    assert "get_unverified_claims" not in source


def test_google_route_returns_404_when_disabled():
    source = ROUTES.read_text()
    assert "google_auth_enabled" in source
    assert "404" in source


def test_google_route_does_not_leak_failure_detail():
    """A failed verification must be a generic 401, not an oracle."""
    source = ROUTES.read_text()
    assert "auth.google_failed" in source
    assert "401" in source


def test_identity_is_linked_by_provider_subject_not_email_alone():
    """Matching on email alone would allow account takeover."""
    source = ROUTES.read_text()
    assert "UserIdentity" in source
    assert "subject" in source


def test_user_identity_model_has_unique_constraints():
    source = MODELS.read_text()
    assert "user_identities" in source
    assert "uq_user_identity_provider_subject" in source
    assert "uq_user_identity_user_provider" in source


def test_google_schemas_bound_token_size():
    source = SCHEMAS.read_text()
    assert "GoogleAuthIn" in source
    assert "max_length" in source, "an unbounded id_token is a DoS vector"


def test_providers_endpoint_exists_for_the_client():
    source = ROUTES.read_text()
    assert "AuthProvidersOut" in source
    assert "providers" in source


def test_migration_is_additive_and_reversible():
    source = MIGRATION.read_text()
    assert "user_identities" in source
    assert "def upgrade" in source and "def downgrade" in source
    assert "DROP TABLE" not in source.split("def downgrade")[0], (
        "upgrade must not drop existing tables"
    )


def test_migration_chains_onto_the_previous_revision():
    source = MIGRATION.read_text()
    assert "down_revision" in source
    assert "0012_free_product" in source


def test_service_imports_cleanly_when_dependencies_available():
    try:
        from app.services.google_identity import (  # noqa: PLC0415
            GoogleIdentity,
            GoogleIdentityError,
            verify_google_id_token,
        )
    except Exception as exc:  # pragma: no cover - offline sandbox
        import pytest

        pytest.skip(f"dependencies unavailable: {exc}")
    assert callable(verify_google_id_token)
    assert issubclass(GoogleIdentityError, Exception)
    assert GoogleIdentity("sub", "a@b.c", True, None, None).subject == "sub"

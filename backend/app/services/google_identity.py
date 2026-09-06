"""Google ID-token verification.

The mobile app performs the interactive OAuth step and sends the resulting
**ID token** to ``POST /api/v1/auth/google``. Everything security-relevant is
checked here, server-side:

* RS256 signature against Google's published JWKS (fetched over HTTPS, cached)
* ``iss`` is ``accounts.google.com`` / ``https://accounts.google.com``
* ``aud`` is one of the configured Google client IDs for this deployment
* ``exp`` / ``iat`` / ``nbf`` with a bounded clock skew
* ``nonce`` matches the value the client generated for this attempt
* ``email_verified`` is true before an email is trusted for account linking

A token that fails any check raises :class:`GoogleIdentityError`; the caller
turns that into a generic 401 so nothing about the failure leaks to the client.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import httpx
from jose import jwt
from jose.exceptions import JWTError

from app.config.settings import get_settings


class GoogleIdentityError(Exception):
    """Raised when a Google ID token cannot be trusted."""


@dataclass(frozen=True)
class GoogleIdentity:
    subject: str
    email: str
    email_verified: bool
    display_name: str
    picture: str | None = None


class _JwksCache:
    """Tiny TTL cache so every sign-in does not hit Google's JWKS endpoint."""

    def __init__(self) -> None:
        self._keys: dict | None = None
        self._fetched_at: float = 0.0

    def invalidate(self) -> None:
        self._keys = None
        self._fetched_at = 0.0

    async def get(self, force: bool = False) -> dict:
        settings = get_settings()
        age = time.monotonic() - self._fetched_at
        if not force and self._keys is not None and age < settings.google_jwks_cache_seconds:
            return self._keys
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(settings.google_jwks_url)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:  # noqa: BLE001 - network/JSON failures are all fatal here
            if self._keys is not None:
                return self._keys  # serve stale rather than lock everyone out
            raise GoogleIdentityError("Could not fetch Google signing keys") from exc
        if not isinstance(payload, dict) or not payload.get("keys"):
            raise GoogleIdentityError("Google signing key document was empty")
        self._keys = payload
        self._fetched_at = time.monotonic()
        return payload


_jwks = _JwksCache()


def _select_key(jwks: dict, kid: str | None) -> dict | None:
    for key in jwks.get("keys", []):
        if kid is None or key.get("kid") == kid:
            return key
    return None


async def verify_google_id_token(id_token: str, expected_nonce: str | None = None) -> GoogleIdentity:
    settings = get_settings()
    if not settings.google_auth_enabled:
        raise GoogleIdentityError("Google sign-in is not enabled on this deployment")
    audiences = settings.google_audiences
    if not audiences:
        raise GoogleIdentityError("No Google client ID is configured")
    if not id_token or id_token.count(".") != 2:
        raise GoogleIdentityError("Malformed Google ID token")

    try:
        header = jwt.get_unverified_header(id_token)
    except JWTError as exc:
        raise GoogleIdentityError("Malformed Google ID token header") from exc
    if header.get("alg") != "RS256":
        # Reject "alg": "none" and HMAC confusion outright.
        raise GoogleIdentityError("Unexpected Google ID token algorithm")

    jwks = await _jwks.get()
    key = _select_key(jwks, header.get("kid"))
    if key is None:
        # Google rotates keys; refetch once before giving up.
        jwks = await _jwks.get(force=True)
        key = _select_key(jwks, header.get("kid"))
    if key is None:
        raise GoogleIdentityError("Google signing key was not found")

    try:
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=audiences,
            options={
                "verify_aud": True,
                "verify_signature": True,
                "verify_exp": True,
                "verify_iat": True,
            },
        )
    except JWTError as exc:
        raise GoogleIdentityError("Google ID token failed verification") from exc

    if claims.get("iss") not in settings.google_issuers:
        raise GoogleIdentityError("Unexpected Google ID token issuer")

    now = int(time.time())
    skew = settings.google_clock_skew_seconds
    exp = claims.get("exp")
    if not isinstance(exp, int) or exp + skew < now:
        raise GoogleIdentityError("Google ID token has expired")
    iat = claims.get("iat")
    if not isinstance(iat, int) or iat - skew > now:
        raise GoogleIdentityError("Google ID token was issued in the future")
    nbf = claims.get("nbf")
    if isinstance(nbf, int) and nbf - skew > now:
        raise GoogleIdentityError("Google ID token is not valid yet")

    if expected_nonce is not None:
        presented = claims.get("nonce")
        if not presented or presented != expected_nonce:
            raise GoogleIdentityError("Google ID token nonce mismatch")

    subject = claims.get("sub")
    if not subject:
        raise GoogleIdentityError("Google ID token has no subject")

    email = (claims.get("email") or "").strip().lower()
    email_verified = bool(claims.get("email_verified"))
    if not email or not email_verified:
        # Never link an account on an unverified address: that is an account
        # takeover path.
        raise GoogleIdentityError("Google account has no verified email address")

    display_name = (claims.get("name") or "").strip() or email.split("@")[0]
    return GoogleIdentity(
        subject=str(subject),
        email=email,
        email_verified=email_verified,
        display_name=display_name[:120],
        picture=claims.get("picture"),
    )

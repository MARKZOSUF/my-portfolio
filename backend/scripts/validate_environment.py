#!/usr/bin/env python3
"""Configuration validator.

Usage:
    python scripts/validate_environment.py --environment development
    python scripts/validate_environment.py --environment production

Exit code 0 = configuration is acceptable for the chosen environment.
Exit code 1 = one or more blocking problems (they are listed by name).

Secret VALUES are never printed - only the names of the settings involved.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from urllib.parse import urlparse

PLACEHOLDER = "CHANGE_ME"
PRIVATE_HOST = re.compile(
    r"^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|"
    r"172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|::1|.*\.local)$",
    re.I,
)

REQUIRED_ALWAYS = ["APP_ENV", "DATABASE_URL", "REDIS_URL", "SECRET_KEY", "DATA_ENCRYPTION_KEY"]
REQUIRED_PRODUCTION = [
    "PUBLIC_API_URL", "PUBLIC_APP_URL", "CORS_ORIGINS", "STORAGE_PROVIDER",
    "STORAGE_BUCKET", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY", "EMAIL_FROM",
]
SECRET_NAMES = {
    "SECRET_KEY", "DATA_ENCRYPTION_KEY", "AI_API_KEY", "TAVILY_API_KEY", "BRAVE_API_KEY",
    "SERPER_API_KEY", "SEMANTIC_SCHOLAR_API_KEY", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY",
    "SMTP_PASSWORD", "GOOGLE_CLIENT_SECRET", "APPLE_PRIVATE_KEY",
    "STUDYFORGE_UPLOAD_STORE_PASSWORD", "STUDYFORGE_UPLOAD_KEY_PASSWORD",
}
SELF_HOSTED = {"ollama", "vllm", "localai", "self-hosted"}


def load_env_file(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    if not os.path.exists(path):
        return values
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            values[key.strip()] = value.split("  #")[0].strip()
    return values


def truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def validate(env: dict[str, str], environment: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    production = environment == "production"

    def get(name: str) -> str:
        return (env.get(name) or "").strip()

    for name in REQUIRED_ALWAYS + (REQUIRED_PRODUCTION if production else []):
        if not get(name):
            errors.append(f"{name} is missing")

    if production:
        for name, value in env.items():
            if PLACEHOLDER in value:
                errors.append(f"{name} still contains the {PLACEHOLDER} placeholder")
        if truthy(get("DEBUG")):
            errors.append("DEBUG must be false in production")
        secret = get("SECRET_KEY")
        if secret and (len(secret) < 48 or secret.lower().startswith("development")):
            errors.append("SECRET_KEY is too weak for production (need >= 48 random characters)")
        if get("DATA_ENCRYPTION_KEY").lower().startswith("development"):
            errors.append("DATA_ENCRYPTION_KEY is a development placeholder")
        if get("AI_PROVIDER") == "development":
            errors.append("AI_PROVIDER=development is not allowed in production")
        if get("EMAIL_PROVIDER") == "development":
            errors.append("EMAIL_PROVIDER=development is not allowed in production")
        cors = get("CORS_ORIGINS")
        if "*" in cors:
            errors.append("CORS_ORIGINS must not contain a wildcard in production")
        if get("STORAGE_PROVIDER") != "s3":
            errors.append("STORAGE_PROVIDER must be s3: generated PDFs need durable storage, "
                          "not ephemeral application-server disk")
        api = get("PUBLIC_API_URL")
        if api and not api.startswith("https://"):
            errors.append("PUBLIC_API_URL must use HTTPS in production")

    # database URL sanity
    database = get("DATABASE_URL")
    if database:
        parsed = urlparse(database)
        if not parsed.scheme.startswith("postgresql"):
            errors.append("DATABASE_URL must be a postgresql:// or postgresql+asyncpg:// URL")
        elif not parsed.hostname:
            errors.append("DATABASE_URL has no host")

    # AI provider rules
    provider = get("AI_PROVIDER")
    key = get("AI_API_KEY")
    keyless_allowed = truthy(get("AI_ALLOW_KEYLESS_SELF_HOSTED"))
    if provider in SELF_HOSTED:
        base = get("AI_SELF_HOSTED_BASE_URL")
        if not base:
            errors.append("AI_SELF_HOSTED_BASE_URL is required for a self-hosted AI provider")
        allowed = [h.strip().lower() for h in get("AI_SELF_HOSTED_ALLOWED_HOSTS").split(",") if h.strip()]
        host = (urlparse(base).hostname or "").lower() if base else ""
        if base and allowed and not any(host == a or host.endswith("." + a) for a in allowed):
            errors.append("AI_SELF_HOSTED_BASE_URL host is not in AI_SELF_HOSTED_ALLOWED_HOSTS "
                          "(this allowlist is what prevents an SSRF path)")
        if not key and not keyless_allowed:
            errors.append("Keyless self-hosted AI must be explicitly enabled with "
                          "AI_ALLOW_KEYLESS_SELF_HOSTED=true")
        if not key and keyless_allowed:
            warnings.append("Keyless self-hosted AI approved: the Authorization header will be "
                            "omitted entirely (never sent as an empty Bearer value)")
    elif provider not in {"", "development"} and not key:
        errors.append("AI_API_KEY is required for a cloud AI provider")

    # search providers
    providers = [p.strip() for p in get("SEARCH_PROVIDERS").split(",") if p.strip()]
    keyed = {"tavily": "TAVILY_API_KEY", "brave": "BRAVE_API_KEY", "serper": "SERPER_API_KEY"}
    for name, env_name in keyed.items():
        if name in providers and not get(env_name):
            warnings.append(f"{name} is listed in SEARCH_PROVIDERS but {env_name} is empty; it will be skipped")
    if providers and all(p in keyed for p in providers) and not any(get(k) for k in keyed.values()):
        warnings.append("Only keyed search providers are configured and none have keys; "
                        "research will fall back to the keyless baseline or fail")

    return errors, warnings


def validate_mobile(environment: str) -> tuple[list[str], list[str]]:
    """Check the mobile API URL rules (mirrors resolveApiUrl in the app)."""

    errors: list[str] = []
    warnings: list[str] = []
    filename = "mobile/.env.production" if environment == "production" else "mobile/.env"
    env = load_env_file(filename)
    if not env:
        warnings.append(f"{filename} not found; skipped mobile checks (copy the .example file)")
        return errors, warnings
    url = (env.get("EXPO_PUBLIC_API_URL") or "").strip()
    if not url:
        errors.append("EXPO_PUBLIC_API_URL is missing")
        return errors, warnings
    parsed = urlparse(url)
    if environment == "production":
        if parsed.scheme != "https":
            errors.append("EXPO_PUBLIC_API_URL must use HTTPS in a production build")
        if PRIVATE_HOST.match(parsed.hostname or ""):
            errors.append(f"EXPO_PUBLIC_API_URL points at the local/private host {parsed.hostname}")
    for name in env:
        if name.startswith("EXPO_PUBLIC_") and any(token in name for token in ("SECRET", "PASSWORD", "PRIVATE_KEY", "API_KEY")):
            errors.append(f"{name} looks like a secret; EXPO_PUBLIC_* values ship inside the app bundle")
    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate StudyForge AI configuration")
    parser.add_argument("--environment", default="development", choices=["development", "staging", "production"])
    parser.add_argument("--env-file", default="backend/.env")
    args = parser.parse_args()

    env = dict(load_env_file(args.env_file))
    for name, value in os.environ.items():  # real environment wins
        if name.isupper():
            env[name] = value

    errors, warnings = validate(env, args.environment)
    mobile_errors, mobile_warnings = validate_mobile(args.environment)
    errors += mobile_errors
    warnings += mobile_warnings

    print(f"StudyForge AI configuration check - environment: {args.environment}")
    print(f"Settings source: {args.env_file} + process environment")
    print(f"Settings seen: {len(env)} (values are never printed)")
    for warning in warnings:
        print(f"  WARN  {warning}")
    for error in errors:
        print(f"  ERROR {error}")
    if errors:
        print(f"\nFAILED: {len(errors)} blocking problem(s).")
        return 1
    print("\nOK: configuration is acceptable for this environment.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Application configuration.

All settings come from environment variables with safe development defaults.
Production validation fails closed (see ``validate_config``).
"""
import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SUPPORTED_PROVIDERS = {"openai", "gemini", "perplexity", "openrouter", "groq", "deepseek", "anthropic"}
PROVIDER_DEFAULTS = {
    "openai": ("https://api.openai.com/v1", "gpt-5-mini"),
    "gemini": ("https://generativelanguage.googleapis.com/v1beta", "gemini-2.5-flash"),
    "perplexity": ("https://api.perplexity.ai", "sonar"),
    "openrouter": ("https://openrouter.ai/api/v1", "openai/gpt-4.1-mini"),
    "groq": ("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
    "deepseek": ("https://api.deepseek.com/v1", "deepseek-chat"),
    "anthropic": ("https://api.anthropic.com/v1", "claude-sonnet-4-20250514"),
}


def _bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _int(name, default, minimum=1, maximum=None):
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    value = max(minimum, value)
    return min(value, maximum) if maximum is not None else value


class BaseConfig:
    ENV_NAME = "development"
    SECRET_KEY = os.getenv("SECRET_KEY", "development-only-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'instance' / 'studyresearch.db'}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- AI provider (single external key architecture) ---
    AI_PROVIDER = os.getenv("AI_PROVIDER", "openai").strip().lower()
    _provider_default = PROVIDER_DEFAULTS.get(AI_PROVIDER, PROVIDER_DEFAULTS["openai"])
    AI_API_KEY = os.getenv("AI_API_KEY", "")
    AI_BASE_URL = os.getenv("AI_BASE_URL", _provider_default[0]).rstrip("/")
    AI_MODEL = os.getenv("AI_MODEL", _provider_default[1])
    AI_CONNECT_TIMEOUT = _int("AI_CONNECT_TIMEOUT", 10, 1, 60)
    AI_READ_TIMEOUT = _int("AI_READ_TIMEOUT", 90, 5, 300)
    AI_MAX_RETRIES = _int("AI_MAX_RETRIES", 2, 0, 4)
    AI_FEATURES_ENABLED = _bool("AI_FEATURES_ENABLED", True)
    MAX_OUTPUT_TOKENS = _int("MAX_OUTPUT_TOKENS", 6000, 500, 16000)

    # --- Research behavior ---
    MAX_SOURCES = _int("MAX_SOURCES", 10, 1, 25)
    MAX_QUERY_LENGTH = _int("MAX_QUERY_LENGTH", 1000, 50, 4000)
    FREE_DAILY_RESEARCH_LIMIT = _int("FREE_DAILY_RESEARCH_LIMIT", 5, 1, 100)

    # --- Chat ---
    CHAT_HISTORY_LIMIT = _int("CHAT_HISTORY_LIMIT", 12, 0, 50)
    CHAT_MESSAGE_MAX = _int("CHAT_MESSAGE_MAX", 1000, 100, 4000)

    # --- Uploads / document parsing ---
    MAX_CONTENT_LENGTH = _int("MAX_UPLOAD_MB", 20, 1, 50) * 1024 * 1024
    MAX_UPLOAD_BYTES = MAX_CONTENT_LENGTH
    MAX_ARCHIVE_FILES = _int("MAX_ARCHIVE_FILES", 1000, 10, 5000)
    MAX_ARCHIVE_EXPANDED_BYTES = _int("MAX_ARCHIVE_EXPANDED_MB", 80, 10, 250) * 1024 * 1024
    MAX_DOCUMENT_PAGES = _int("MAX_DOCUMENT_PAGES", 250, 1, 1000)
    MAX_DOCUMENT_CHARS = _int("MAX_DOCUMENT_CHARS", 500000, 10000, 2000000)
    DOCUMENT_PROCESS_TIMEOUT = _int("DOCUMENT_PROCESS_TIMEOUT", 30, 5, 120)
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", str(BASE_DIR / "instance" / "uploads"))
    ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "pptx"}
    MALWARE_SCANNER = os.getenv("MALWARE_SCANNER", "noop").lower()
    CLAMSCAN_PATH = os.getenv("CLAMSCAN_PATH", "clamscan")

    # --- Source fetching ---
    SOURCE_MAX_BYTES = _int("SOURCE_MAX_MB", 8, 1, 20) * 1024 * 1024
    SOURCE_MAX_PDF_PAGES = _int("SOURCE_MAX_PDF_PAGES", 40, 1, 100)
    SOURCE_FETCH_TIMEOUT = _int("SOURCE_FETCH_TIMEOUT", 20, 3, 60)
    SOURCE_REDIRECT_LIMIT = _int("SOURCE_REDIRECT_LIMIT", 3, 0, 5)

    # --- Sessions / security ---
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = _bool("COOKIE_SECURE", False)
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    WTF_CSRF_TIME_LIMIT = 3600

    # --- Rate limiting ---
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    # --- Background jobs ---
    JOB_BACKEND = os.getenv("JOB_BACKEND", "thread").lower()
    REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
    RESEARCH_JOB_TIMEOUT = _int("RESEARCH_JOB_TIMEOUT", 900, 60, 3600)
    STUCK_SESSION_MINUTES = _int("STUCK_SESSION_MINUTES", 30, 5, 720)

    AUTO_CREATE_DB = True
    CONTENT_SECURITY_POLICY = (
        "default-src 'self'; style-src 'self'; script-src 'self'; "
        "img-src 'self' data:; connect-src 'self'; object-src 'none'; "
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
    )


class DevelopmentConfig(BaseConfig):
    ENV_NAME = "development"


class TestConfig(BaseConfig):
    ENV_NAME = "testing"
    TESTING = True
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    AI_PROVIDER = "openai"
    AI_API_KEY = "test-placeholder-not-a-real-key"
    JOB_BACKEND = "thread"
    RATELIMIT_ENABLED = False


class ProductionConfig(BaseConfig):
    ENV_NAME = "production"
    SESSION_COOKIE_SECURE = _bool("COOKIE_SECURE", False)
    PREFERRED_URL_SCHEME = "https"
    AUTO_CREATE_DB = False


config_by_name = {"development": DevelopmentConfig, "testing": TestConfig, "production": ProductionConfig}


def validate_config(cfg):
    """Fail closed on unsafe or unusable configuration.

    Returns a list of human-safe problems in non-raising contexts.
    """
    errors = []
    provider = str(cfg.get("AI_PROVIDER", "")).lower()
    if provider not in SUPPORTED_PROVIDERS:
        errors.append(f"AI_PROVIDER must be one of: {', '.join(sorted(SUPPORTED_PROVIDERS))}")
    base = str(cfg.get("AI_BASE_URL", ""))
    parts = urlsplit(base)
    if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
        errors.append("AI_BASE_URL must be a credential-free HTTPS URL")
    db_url = str(cfg.get("SQLALCHEMY_DATABASE_URI", ""))
    try:
        from sqlalchemy.engine import make_url

        parsed = make_url(db_url)
        if parsed.drivername not in {"sqlite", "postgresql", "postgresql+psycopg"}:
            errors.append("DATABASE_URL must use SQLite or PostgreSQL")
    except Exception:
        errors.append("DATABASE_URL is invalid")
    if cfg.get("ENV_NAME") == "production":
        secret = str(cfg.get("SECRET_KEY") or "")
        if len(secret) < 32 or secret in {"dev-only-change-me", "development-only-change-me", "replace-with-a-long-random-value"}:
            errors.append("Production SECRET_KEY must be a random value of at least 32 characters")
        if cfg.get("AI_FEATURES_ENABLED") and not cfg.get("AI_API_KEY"):
            errors.append("AI_API_KEY is required when AI features are enabled")
        if not cfg.get("SESSION_COOKIE_SECURE"):
            errors.append("COOKIE_SECURE=true is required in production")
        if cfg.get("JOB_BACKEND") != "rq":
            errors.append("JOB_BACKEND=rq is required in production")
        if str(cfg.get("RATELIMIT_STORAGE_URI", "")).startswith("memory:"):
            errors.append("A Redis rate-limit backend is required in production")
        if cfg.get("MALWARE_SCANNER") != "clamav":
            errors.append("MALWARE_SCANNER=clamav is required in production")
    return errors


def validate_config_or_raise(cfg):
    errors = validate_config(cfg)
    if errors:
        raise RuntimeError("Configuration error: " + "; ".join(errors))

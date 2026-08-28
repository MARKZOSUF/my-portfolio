"""AI provider factory and readiness gates.

The readiness gate is the single place routes must call before accepting an
AI operation. It never exposes the API key (not even partially).
"""
from flask import current_app

from services.ai.providers.anthropic import AnthropicProvider
from services.ai.providers.deepseek import DeepSeekProvider
from services.ai.providers.gemini import GeminiProvider
from services.ai.providers.groq import GroqProvider
from services.ai.providers.openai import OpenAIProvider
from services.ai.providers.openrouter import OpenRouterProvider
from services.ai.providers.perplexity import PerplexityProvider
from utils.errors import AppError

PROVIDERS = {
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
    "perplexity": PerplexityProvider,
    "openrouter": OpenRouterProvider,
    "groq": GroqProvider,
    "deepseek": DeepSeekProvider,
    "anthropic": AnthropicProvider,
}

_NO_CAPS = {"generation": False, "streaming": False, "web_search": False, "embeddings": False}


def get_ai_provider():
    cfg = current_app.config
    name = str(cfg["AI_PROVIDER"]).lower()
    cls = PROVIDERS.get(name)
    if not cls:
        raise AppError("UNSUPPORTED_PROVIDER", "The configured AI provider is unsupported.", 503)
    return cls(
        cfg.get("AI_API_KEY", ""),
        cfg["AI_BASE_URL"],
        cfg["AI_MODEL"],
        cfg["AI_CONNECT_TIMEOUT"],
        cfg["AI_READ_TIMEOUT"],
        cfg["AI_MAX_RETRIES"],
    )


def provider_status():
    """Server-safe capability report. Never includes the key or key fragments."""
    cfg = current_app.config
    name = str(cfg.get("AI_PROVIDER", "")).lower()
    enabled = bool(cfg.get("AI_FEATURES_ENABLED"))
    configured = bool(cfg.get("AI_API_KEY"))
    cls = PROVIDERS.get(name)
    if not cls:
        return {
            "provider": name or "unknown",
            "supported": False,
            "enabled": enabled,
            "configured": configured,
            "ready": False,
            "capabilities": dict(_NO_CAPS),
            "mode": "unavailable",
            "message": "The configured AI provider is unsupported.",
        }
    caps = cls.capabilities.as_dict()
    ready = enabled and configured and caps["generation"]
    if not enabled:
        message = "AI features are disabled on this server."
    elif not configured:
        message = "The server AI provider key is not configured."
    else:
        message = "Ready."
    return {
        "provider": cls.provider_name,
        "supported": True,
        "enabled": enabled,
        "configured": configured,
        "ready": ready,
        "capabilities": caps,
        "mode": "full_research" if caps["web_search"] else "document_study",
        "message": message,
    }


def require_ai_ready():
    """Raise a structured error unless AI operations can run right now.

    Call this before consuming quota, creating sessions, or enqueueing jobs.
    """
    cfg = current_app.config
    if not cfg.get("AI_FEATURES_ENABLED"):
        raise AppError("AI_DISABLED", "AI features are disabled on this server.", 503)
    status = provider_status()
    if not status["supported"]:
        raise AppError("UNSUPPORTED_PROVIDER", "The configured AI provider is unsupported.", 503)
    if not status["configured"]:
        raise AppError("PROVIDER_NOT_CONFIGURED", "The server AI provider is not configured.", 503)
    return status

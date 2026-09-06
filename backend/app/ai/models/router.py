"""Backend-managed AI model router.

Design rules enforced here:

* Ordinary application users never supply an AI API key. Credentials live only
  in backend settings and are never returned to clients.
* An administrator may point the router at an OpenAI-compatible cloud provider
  (OpenAI, Azure-compatible gateways, ...) OR at an approved self-hosted
  runtime (Ollama, vLLM, LocalAI).
* Self-hosted runtimes usually have no API key. For those we omit the
  Authorization header entirely rather than sending an empty ``Bearer``.
* Keyless self-hosted access must be explicitly enabled by an administrator and
  the base URL must match an allow-list, so this cannot become an SSRF path.
* Per-task model selection and an optional fallback provider are supported.
"""

from __future__ import annotations

from urllib.parse import urlsplit

from app.ai.models.base import LanguageModel
from app.ai.models.development import DevelopmentModel
from app.ai.models.openai_compatible import OpenAICompatibleModel
from app.config.settings import get_settings

SELF_HOSTED_PROVIDERS = frozenset({"ollama", "vllm", "localai", "self-hosted"})
CLOUD_PROVIDERS = frozenset({"openai", "openai-compatible", "azure-compatible"})


class AIConfigurationError(RuntimeError):
    """Raised when the administrator configuration is unusable."""


class CircuitBreaker:
    """Very small in-process breaker so a dead provider stops being retried."""

    def __init__(self, threshold: int = 5):
        self.threshold = threshold
        self._failures: dict[str, int] = {}

    def record_failure(self, key: str) -> None:
        self._failures[key] = self._failures.get(key, 0) + 1

    def record_success(self, key: str) -> None:
        self._failures.pop(key, None)

    def is_open(self, key: str) -> bool:
        return self._failures.get(key, 0) >= self.threshold


_breaker = CircuitBreaker()


class FallbackModel:
    """Try each model in order; surface the last error if all fail."""

    def __init__(self, models: list[LanguageModel]):
        self.models = models

    async def generate(self, *args, **kwargs):
        last: Exception | None = None
        for model in self.models:
            key = getattr(model, "model", model.__class__.__name__)
            if _breaker.is_open(key):
                continue
            try:
                result = await model.generate(*args, **kwargs)
                _breaker.record_success(key)
                return result
            except Exception as exc:  # noqa: BLE001 - provider errors are opaque
                _breaker.record_failure(key)
                last = exc
        raise last or AIConfigurationError("No AI provider available")

    async def stream(self, *args, **kwargs):
        last: Exception | None = None
        for model in self.models:
            key = getattr(model, "model", model.__class__.__name__)
            if _breaker.is_open(key):
                continue
            try:
                async for chunk in model.stream(*args, **kwargs):
                    yield chunk
                _breaker.record_success(key)
                return
            except Exception as exc:  # noqa: BLE001
                _breaker.record_failure(key)
                last = exc
        raise last or AIConfigurationError("No AI provider available")


def host_allowed(base_url: str, allowed_hosts: list[str]) -> bool:
    """Return True when ``base_url`` host is on the administrator allow-list."""

    host = (urlsplit(base_url).hostname or "").lower()
    if not host:
        return False
    for entry in allowed_hosts:
        candidate = entry.strip().lower()
        if not candidate:
            continue
        if host == candidate or host.endswith("." + candidate):
            return True
    return False


class ModelRouter:
    def __init__(self, settings=None):
        self.s = settings or get_settings()

    def model_for(self, task: str) -> str:
        return self.s.ai_task_models.get(task, self.s.ai_model)

    def build(self, provider: str, task: str) -> LanguageModel:
        provider = (provider or "").strip().lower()

        if provider == "development":
            return DevelopmentModel()

        if provider in CLOUD_PROVIDERS:
            key = self.s.ai_api_key.get_secret_value()
            if not key:
                raise AIConfigurationError(
                    "AI_API_KEY is required for cloud providers. Configure it server-side, "
                    "or switch AI_PROVIDER to an approved self-hosted runtime."
                )
            return OpenAICompatibleModel(
                self.s.ai_base_url,
                key,
                self.model_for(task),
                self.s.ai_timeout_seconds,
            )

        if provider in SELF_HOSTED_PROVIDERS:
            base_url = self.s.ai_self_hosted_base_url or self.s.ai_base_url
            if not base_url:
                raise AIConfigurationError("AI_SELF_HOSTED_BASE_URL must be set for self-hosted providers.")
            if not host_allowed(base_url, self.s.ai_self_hosted_allowed_hosts):
                raise AIConfigurationError(
                    "Self-hosted AI base URL is not in AI_SELF_HOSTED_ALLOWED_HOSTS. "
                    "Add the host explicitly before using it."
                )
            key = self.s.ai_api_key.get_secret_value()
            if not key and not self.s.ai_allow_keyless_self_hosted:
                raise AIConfigurationError(
                    "Keyless self-hosted AI is disabled. Set AI_ALLOW_KEYLESS_SELF_HOSTED=true "
                    "to explicitly approve it, or provide AI_API_KEY."
                )
            model_name = self.s.ai_self_hosted_model or self.model_for(task)
            # key == '' makes OpenAICompatibleModel omit the Authorization header.
            return OpenAICompatibleModel(base_url, key, model_name, self.s.ai_timeout_seconds)

        raise AIConfigurationError(f"Unsupported provider: {provider}")

    def for_task(self, task: str):
        models = [self.build(self.s.ai_provider, task)]
        if self.s.ai_fallback_provider:
            try:
                models.append(self.build(self.s.ai_fallback_provider, task))
            except AIConfigurationError:
                pass
        return models[0] if len(models) == 1 else FallbackModel(models)

    @property
    def generative_available(self) -> bool:
        """True when a real (non-placeholder) generative model can be built."""

        try:
            model = self.build(self.s.ai_provider, "notes")
        except AIConfigurationError:
            return False
        return not isinstance(model, DevelopmentModel)

    def status(self) -> dict:
        """Non-secret configuration status for admin/diagnostic endpoints."""

        try:
            self.build(self.s.ai_provider, "notes")
            error = None
        except AIConfigurationError as exc:
            error = str(exc)
        return {
            "provider": self.s.ai_provider,
            "fallback_provider": self.s.ai_fallback_provider or None,
            "generative_available": self.generative_available,
            "keyless_self_hosted_allowed": self.s.ai_allow_keyless_self_hosted,
            "default_model": self.s.ai_model,
            "task_models": dict(self.s.ai_task_models),
            "configuration_error": error,
        }

from __future__ import annotations

"""OpenAI-compatible chat client.

Works with OpenAI, Azure/OpenAI-compatible gateways and approved self-hosted
runtimes (Ollama, vLLM, LocalAI).

Critical rule: when no API key is configured (approved keyless self-hosted
deployments) the ``Authorization`` header is omitted entirely. Sending
``Authorization: Bearer `` with an empty value makes several gateways return
opaque 401s, so it is never done here.
"""

import json
from collections.abc import AsyncIterator

try:  # httpx is a hard runtime dependency (requirements.txt); the guard only keeps
    # this module importable for offline unit tests that inject their own client.
    import httpx
except ModuleNotFoundError:  # pragma: no cover - exercised only in bare environments
    import typing as _typing

    class _HttpxStub:
        AsyncClient = _typing.Any
        Response = _typing.Any

        def __getattr__(self, name):
            raise RuntimeError(
                "httpx is not installed. Install backend requirements with "
                "`pip install -r backend/requirements.txt` before making network calls."
            )

    httpx = _HttpxStub()  # type: ignore[assignment]
try:  # tenacity is a hard runtime dependency (requirements.txt); the guard keeps this
    # module importable in a bare offline environment for unit tests.
    from tenacity import retry, stop_after_attempt, wait_exponential
except ModuleNotFoundError:  # pragma: no cover
    def retry(*_args, **_kwargs):  # type: ignore[misc]
        def decorator(func):
            return func

        return decorator

    def stop_after_attempt(*_args, **_kwargs):  # type: ignore[misc]
        return None

    def wait_exponential(*_args, **_kwargs):  # type: ignore[misc]
        return None

from app.ai.models.base import LanguageModel, ModelMessage, ModelResult


class ProviderError(RuntimeError):
    """Structured provider failure (status code + provider-supplied detail)."""

    def __init__(self, message: str, status_code: int | None = None, provider: str = "openai-compatible"):
        super().__init__(message)
        self.status_code = status_code
        self.provider = provider

    def to_dict(self) -> dict:
        return {"error": str(self), "status_code": self.status_code, "provider": self.provider}


class OpenAICompatibleModel(LanguageModel):
    def __init__(self, base_url: str, api_key: str, model: str, timeout: int = 90):
        self.base = (base_url or "").rstrip("/")
        self.key = api_key or ""
        self.model = model
        self.timeout = timeout

    @property
    def keyless(self) -> bool:
        return not self.key.strip()

    def headers(self, streaming: bool = False) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if not self.keyless:
            headers["Authorization"] = f"Bearer {self.key}"
        if streaming:
            headers["Accept"] = "text/event-stream"
        return headers

    @staticmethod
    def _raise_for_status(response: httpx.Response) -> None:
        if response.status_code < 400:
            return
        detail = ""
        try:
            payload = response.json()
            detail = str(payload.get("error", payload))[:400]
        except Exception:  # noqa: BLE001 - non-JSON error body
            detail = response.text[:400]
        raise ProviderError(f"AI provider returned {response.status_code}: {detail}", response.status_code)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    async def generate(self, messages: list[ModelMessage], *, temperature: float = 0.2,
                       max_tokens: int = 2500, json_mode: bool = False) -> ModelResult:
        payload = {
            "model": self.model,
            "messages": [m.__dict__ for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base}/chat/completions", headers=self.headers(), json=payload)
            self._raise_for_status(response)
            data = response.json()
        try:
            choice = data["choices"][0]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"Malformed provider response: {exc}") from exc
        return ModelResult(
            text=choice["message"]["content"],
            model=data.get("model", self.model),
            provider="openai-compatible",
            usage=data.get("usage", {}),
            finish_reason=choice.get("finish_reason", "stop"),
        )

    async def stream(self, messages: list[ModelMessage], *, temperature: float = 0.2,
                     max_tokens: int = 2500) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": [m.__dict__ for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{self.base}/chat/completions",
                                     headers=self.headers(streaming=True), json=payload) as response:
                if response.status_code >= 400:
                    await response.aread()
                    self._raise_for_status(response)
                async for line in response.aiter_lines():
                    if not line.startswith("data: ") or line == "data: [DONE]":
                        continue
                    try:
                        data = json.loads(line[6:])
                        delta = data["choices"][0].get("delta", {}).get("content")
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
                    if delta:
                        yield delta

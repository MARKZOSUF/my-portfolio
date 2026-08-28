import pytest,requests
from services.ai.factory import get_ai_provider
from services.ai.providers.gemini import GeminiProvider
from services.ai.providers.openai import OpenAIProvider
from services.ai.providers.openai_chat import OpenAIChatProvider
from utils.errors import AppError
def test_factory_and_capabilities(app):
    with app.app_context():
        p=get_ai_provider(); assert p.provider_name=="openai"; assert p.capabilities.web_search
def test_generation_only_document_mode(): assert not GeminiProvider("x","https://x.example","m").capabilities.web_search
def test_search_disabled_explicit():
    with pytest.raises(AppError) as e: OpenAIChatProvider("x","https://x.example","m").search_web("x")
    assert e.value.code=="WEB_SEARCH_NOT_SUPPORTED"
def test_timeout_normalized(monkeypatch):
    p=GeminiProvider("secret","https://x.example","m",max_retries=0)
    monkeypatch.setattr(p.http.session,"request",lambda *a,**k: (_ for _ in ()).throw(requests.Timeout()))
    with pytest.raises(AppError) as e: p.generate([{"role":"user","content":"x"}])
    assert e.value.code=="PROVIDER_TIMEOUT"; assert "secret" not in e.value.message

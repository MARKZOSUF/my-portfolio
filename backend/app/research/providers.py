"""Search provider adapters for the StudyForge deep-research engine.

Two classes of provider are supported:

1. Keyed commercial providers (Tavily, Brave, Serper). These stay optional and
   are only used when an administrator configures a server-side API key.
2. Keyless public/open academic APIs (MediaWiki, Crossref, OpenAlex). These are
   documented public APIs that explicitly permit programmatic access with a
   polite User-Agent / contact address. They give the product a legal research
   baseline when no commercial key is configured.

The keyless baseline is deliberately narrow. It is NOT a general web index and
the engine must disclose that limitation to the user (see LIMITATION_NOTE).

Nothing in this module scrapes blocked content, bypasses authentication or
uses reverse-engineered private endpoints.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Iterable, Protocol

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

# Canonical provider endpoints. These constants exist so that the URLs are
# testable and can never silently regress into malformed template strings
# again (the original engine.py shipped '{{https://api.tavily.com/search').
TAVILY_SEARCH_URL = "https://api.tavily.com/search"
BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
SERPER_SEARCH_URL = "https://google.serper.dev/search"
WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php"
WIKIPEDIA_HI_API_URL = "https://hi.wikipedia.org/w/api.php"
CROSSREF_WORKS_URL = "https://api.crossref.org/works"
OPENALEX_WORKS_URL = "https://api.openalex.org/works"

USER_AGENT = "StudyForgeResearch/2.1 (+https://studyforge.example/about; educational research)"

KEYED_PROVIDERS = frozenset({"tavily", "brave", "serper"})
KEYLESS_PROVIDERS = frozenset({"wikipedia", "wikipedia_hi", "crossref", "openalex"})
ALL_PROVIDERS = KEYED_PROVIDERS | KEYLESS_PROVIDERS

LIMITATION_NOTE = (
    "This run used the keyless public-source baseline (MediaWiki, Crossref, OpenAlex). "
    "It covers encyclopaedic and open academic metadata only. It is not a full web index, "
    "it may miss very recent material, and it cannot access paywalled or login-protected sources."
)


@dataclass(frozen=True)
class Hit:
    """A single search result before retrieval/ranking."""

    url: str
    title: str
    snippet: str
    provider: str
    source_type: str = "web"
    published: str | None = None


class SearchUnavailable(RuntimeError):
    """Raised when no provider could return results."""


class ProviderAdapter(Protocol):
    name: str
    requires_key: bool

    async def search(self, client: httpx.AsyncClient, query: str, limit: int, key: str) -> list[Hit]:
        ...


def _text(value: object, fallback: str = "") -> str:
    return value.strip() if isinstance(value, str) and value.strip() else fallback


class TavilyAdapter:
    name = "tavily"
    requires_key = True
    source_type = "web"

    async def search(self, client: httpx.AsyncClient, query: str, limit: int, key: str) -> list[Hit]:
        response = await client.post(
            TAVILY_SEARCH_URL,
            json={
                "api_key": key,
                "query": query,
                "max_results": limit,
                "search_depth": "advanced",
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or "results" not in payload:
            raise ValueError("tavily returned a malformed payload")
        results = payload.get("results") or []
        if not isinstance(results, list):
            raise ValueError("tavily returned a malformed payload")
        return [
            Hit(item["url"], _text(item.get("title"), "Untitled"), _text(item.get("content")), self.name)
            for item in results
            if isinstance(item, dict) and _text(item.get("url"))
        ]


class BraveAdapter:
    name = "brave"
    requires_key = True
    source_type = "web"

    async def search(self, client: httpx.AsyncClient, query: str, limit: int, key: str) -> list[Hit]:
        response = await client.get(
            BRAVE_SEARCH_URL,
            params={"q": query, "count": limit, "safesearch": "strict"},
            headers={"X-Subscription-Token": key, "Accept": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or "web" not in payload:
            raise ValueError("brave returned a malformed payload")
        results = (payload.get("web") or {}).get("results") or []
        if not isinstance(results, list):
            raise ValueError("brave returned a malformed payload")
        return [
            Hit(item["url"], _text(item.get("title"), "Untitled"), _text(item.get("description")), self.name)
            for item in results
            if isinstance(item, dict) and _text(item.get("url"))
        ]


class SerperAdapter:
    name = "serper"
    requires_key = True
    source_type = "web"

    async def search(self, client: httpx.AsyncClient, query: str, limit: int, key: str) -> list[Hit]:
        response = await client.post(
            SERPER_SEARCH_URL,
            json={"q": query, "num": limit},
            headers={"X-API-KEY": key, "Content-Type": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict) or "organic" not in payload:
            raise ValueError("serper returned a malformed payload")
        results = payload.get("organic") or []
        if not isinstance(results, list):
            raise ValueError("serper returned a malformed payload")
        return [
            Hit(item["link"], _text(item.get("title"), "Untitled"), _text(item.get("snippet")), self.name)
            for item in results
            if isinstance(item, dict) and _text(item.get("link"))
        ]


class MediaWikiAdapter:
    """Public MediaWiki Action API. Documented, keyless, requires a UA string."""

    requires_key = False
    source_type = "encyclopaedia"

    def __init__(self, name: str = "wikipedia", api_url: str = WIKIPEDIA_API_URL, article_base: str | None = None):
        self.name = name
        self.api_url = api_url
        self.article_base = article_base or api_url.replace("/w/api.php", "/wiki/")

    async def search(self, client: httpx.AsyncClient, query: str, limit: int, key: str = "") -> list[Hit]:
        response = await client.get(
            self.api_url,
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": max(1, min(limit, 20)),
                "format": "json",
                "srprop": "snippet|timestamp",
            },
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError(f"{self.name} returned a malformed payload")
        results = (payload.get("query") or {}).get("search") or []
        hits: list[Hit] = []
        for item in results:
            if not isinstance(item, dict):
                continue
            title = _text(item.get("title"))
            if not title:
                continue
            snippet = _text(item.get("snippet")).replace('<span class="searchmatch">', "").replace("</span>", "")
            hits.append(
                Hit(
                    url=self.article_base + title.replace(" ", "_"),
                    title=title,
                    snippet=snippet,
                    provider=self.name,
                    source_type=self.source_type,
                    published=_text(item.get("timestamp")) or None,
                )
            )
        return hits


class CrossrefAdapter:
    """Crossref REST API. Keyless; a mailto contact enables the polite pool."""

    name = "crossref"
    requires_key = False
    source_type = "peer_reviewed"

    def __init__(self, mailto: str = ""):
        self.mailto = mailto

    async def search(self, client: httpx.AsyncClient, query: str, limit: int, key: str = "") -> list[Hit]:
        params: dict[str, object] = {"query.bibliographic": query, "rows": max(1, min(limit, 20)), "select": "DOI,title,abstract,URL,issued,container-title"}
        if self.mailto:
            params["mailto"] = self.mailto
        response = await client.get(
            CROSSREF_WORKS_URL,
            params=params,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("crossref returned a malformed payload")
        items = (payload.get("message") or {}).get("items") or []
        hits: list[Hit] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            url = _text(item.get("URL"))
            titles = item.get("title") or []
            title = _text(titles[0]) if isinstance(titles, list) and titles else ""
            if not url or not title:
                continue
            abstract = _text(item.get("abstract"))
            year = ""
            issued = item.get("issued") or {}
            parts = issued.get("date-parts") if isinstance(issued, dict) else None
            if isinstance(parts, list) and parts and isinstance(parts[0], list) and parts[0]:
                year = str(parts[0][0])
            hits.append(Hit(url, title, abstract[:2000], self.name, self.source_type, year or None))
        return hits


class OpenAlexAdapter:
    """OpenAlex API. Fully open scholarly metadata; mailto enables polite pool."""

    name = "openalex"
    requires_key = False
    source_type = "peer_reviewed"

    def __init__(self, mailto: str = ""):
        self.mailto = mailto

    async def search(self, client: httpx.AsyncClient, query: str, limit: int, key: str = "") -> list[Hit]:
        params: dict[str, object] = {"search": query, "per-page": max(1, min(limit, 25))}
        if self.mailto:
            params["mailto"] = self.mailto
        response = await client.get(
            OPENALEX_WORKS_URL,
            params=params,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("openalex returned a malformed payload")
        hits: list[Hit] = []
        for item in payload.get("results") or []:
            if not isinstance(item, dict):
                continue
            title = _text(item.get("display_name"))
            location = item.get("primary_location") or {}
            url = ""
            if isinstance(location, dict):
                url = _text(location.get("landing_page_url"))
            url = url or _text(item.get("doi")) or _text(item.get("id"))
            if not title or not url:
                continue
            hits.append(
                Hit(
                    url=url,
                    title=title,
                    snippet=_text(item.get("type"), "scholarly work"),
                    provider=self.name,
                    source_type=self.source_type,
                    published=str(item.get("publication_year")) if item.get("publication_year") else None,
                )
            )
        return hits


def build_adapters(
    provider_names: Iterable[str],
    *,
    crossref_mailto: str = "",
) -> list[ProviderAdapter]:
    """Instantiate adapters for the configured provider names, in order."""

    adapters: list[ProviderAdapter] = []
    for name in provider_names:
        key = name.strip().lower()
        if key == "tavily":
            adapters.append(TavilyAdapter())
        elif key == "brave":
            adapters.append(BraveAdapter())
        elif key == "serper":
            adapters.append(SerperAdapter())
        elif key == "wikipedia":
            adapters.append(MediaWikiAdapter())
        elif key == "wikipedia_hi":
            adapters.append(MediaWikiAdapter("wikipedia_hi", WIKIPEDIA_HI_API_URL))
        elif key == "crossref":
            adapters.append(CrossrefAdapter(crossref_mailto))
        elif key == "openalex":
            adapters.append(OpenAlexAdapter(crossref_mailto))
    return adapters


def deduplicate(hits: Iterable[Hit], canonicalize) -> list[Hit]:
    """Remove duplicate URLs (after canonicalisation) preserving first-seen order."""

    seen: set[str] = set()
    unique: list[Hit] = []
    for hit in hits:
        try:
            key = canonicalize(hit.url)
        except Exception:
            continue
        if key in seen:
            continue
        seen.add(key)
        unique.append(hit)
    return unique


async def backoff(attempt: int, base: float = 2.0, cap: float = 4.0) -> None:
    await asyncio.sleep(min(cap, base ** attempt))

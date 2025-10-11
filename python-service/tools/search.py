from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

import requests

from app.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str


class SearchProvider:
    name: str = "base"

    def search(self, query: str, *, max_results: int = 5) -> List[SearchResult]:
        raise NotImplementedError


class TavilyProvider(SearchProvider):
    name = "tavily"
    endpoint = "https://api.tavily.com/search"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def search(self, query: str, *, max_results: int = 5) -> List[SearchResult]:
        payload = {
            "query": query,
            "search_depth": "advanced",
            "max_results": max_results,
        }
        headers = {"Content-Type": "application/json", "X-API-Key": self.api_key}
        response = requests.post(self.endpoint, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        results = []
        for item in data.get("results", [])[:max_results]:
            results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    snippet=item.get("content", ""),
                )
            )
        return results


class SerpAPIProvider(SearchProvider):
    name = "serpapi"
    endpoint = "https://serpapi.com/search.json"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def search(self, query: str, *, max_results: int = 5) -> List[SearchResult]:
        params = {
            "q": query,
            "api_key": self.api_key,
            "num": max_results,
        }
        response = requests.get(self.endpoint, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        results = []
        for item in data.get("organic_results", [])[:max_results]:
            results.append(
                SearchResult(
                    title=item.get("title", ""),
                    url=item.get("link", ""),
                    snippet=item.get("snippet", ""),
                )
            )
        return results


class DuckDuckGoProvider(SearchProvider):
    name = "duckduckgo"
    endpoint = "https://duckduckgo.com/"

    def search(self, query: str, *, max_results: int = 5) -> List[SearchResult]:
        params = {"q": query, "format": "json", "t": "Ashley"}
        response = requests.get(f"{self.endpoint}ac/", params=params, timeout=10)
        if response.status_code != 200:
            logger.warning("DuckDuckGo search failed: %s", response.text[:200])
            return []
        data = response.json()
        results = []
        for item in data[:max_results]:
            results.append(
                SearchResult(
                    title=item.get("phrase", ""),
                    url=item.get("url", ""),
                    snippet=item.get("snippet", ""),
                )
            )
        return results


class SearchManager:
    def __init__(self) -> None:
        settings = get_settings()
        self.providers: Dict[str, SearchProvider] = {}
        if settings.tavily_api_key:
            self.providers["auto"] = TavilyProvider(settings.tavily_api_key)
            self.providers["tavily"] = self.providers["auto"]
        elif settings.serpapi_api_key:
            self.providers["auto"] = SerpAPIProvider(settings.serpapi_api_key)
            self.providers["serpapi"] = self.providers["auto"]
        else:
            provider = DuckDuckGoProvider()
            self.providers["auto"] = provider
            self.providers[provider.name] = provider

    def get_provider(self, name: str) -> SearchProvider:
        return self.providers.get(name, self.providers["auto"])

    def search(self, query: str, provider_name: str = "auto", max_results: int = 5) -> List[SearchResult]:
        provider = self.get_provider(provider_name)
        try:
            return provider.search(query, max_results=max_results)
        except Exception as exc:
            logger.warning("Search provider %s failed: %s", provider.name, exc)
            fallback = self.providers.get("duckduckgo")
            if fallback and fallback is not provider:
                return fallback.search(query, max_results=max_results)
            return []


_manager: Optional[SearchManager] = None


def get_search_manager() -> SearchManager:
    global _manager
    if _manager is None:
        _manager = SearchManager()
    return _manager


def web_search(query: str, provider: str = "auto", max_results: int = 5) -> List[SearchResult]:
    manager = get_search_manager()
    return manager.search(query, provider_name=provider, max_results=max_results)


__all__ = [
    "SearchResult",
    "SearchProvider",
    "SearchManager",
    "get_search_manager",
    "web_search",
]

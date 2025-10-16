"""
Internet Access Manager for Ashley AI
Provides safe, rate-limited internet access with multiple fallback methods
"""

import requests
import json
import time
import hashlib
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
import logging
from bs4 import BeautifulSoup
try:
    import wikipedia
except ImportError:  # pragma: no cover - optional runtime dependency
    wikipedia = None  # type: ignore[assignment]
from urllib.parse import quote_plus, urljoin, urlparse
from dataclasses import dataclass
import os

logger = logging.getLogger(__name__)

@dataclass
class SearchResult:
    """Represents a search result"""
    title: str
    url: str
    snippet: str
    source: str
    timestamp: datetime

@dataclass
class APIQuota:
    """Tracks API usage and quotas"""
    service: str
    limit_type: str  # daily, monthly, total
    limit: int
    used: int
    reset_time: datetime
    
class UsageTracker:
    """Tracks API usage with automatic reset and protection"""
    
    def __init__(self, storage_file: str = "api_usage.json"):
        self.storage_file = storage_file
        self.quotas: Dict[str, APIQuota] = {}
        self.load_usage()
    
    def load_usage(self):
        """Load usage data from storage"""
        try:
            if os.path.exists(self.storage_file):
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    
                for service, quota_data in data.items():
                    self.quotas[service] = APIQuota(
                        service=quota_data['service'],
                        limit_type=quota_data['limit_type'],
                        limit=quota_data['limit'],
                        used=quota_data['used'],
                        reset_time=datetime.fromisoformat(quota_data['reset_time'])
                    )
        except Exception as e:
            logger.error(f"Error loading usage data: {e}")
            self._initialize_default_quotas()
    
    def _initialize_default_quotas(self):
        """Initialize default quota limits"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = today.replace(day=1)
        
        self.quotas = {
            'google_search': APIQuota('google_search', 'daily', 100, 0, today + timedelta(days=1)),
            'bing_search': APIQuota('bing_search', 'monthly', 1000, 0, month_start + timedelta(days=32)),
            'news_api': APIQuota('news_api', 'daily', 100, 0, today + timedelta(days=1)),
            'serpapi': APIQuota('serpapi', 'monthly', 100, 0, month_start + timedelta(days=32)),
        }
    
    def save_usage(self):
        """Save usage data to storage"""
        try:
            data = {}
            for service, quota in self.quotas.items():
                data[service] = {
                    'service': quota.service,
                    'limit_type': quota.limit_type,
                    'limit': quota.limit,
                    'used': quota.used,
                    'reset_time': quota.reset_time.isoformat()
                }
            
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving usage data: {e}")
    
    def check_and_reset_quotas(self):
        """Check and reset quotas if needed"""
        now = datetime.now()
        
        for service, quota in self.quotas.items():
            if now >= quota.reset_time:
                quota.used = 0
                
                if quota.limit_type == 'daily':
                    quota.reset_time = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
                elif quota.limit_type == 'monthly':
                    next_month = now.replace(day=1) + timedelta(days=32)
                    quota.reset_time = next_month.replace(day=1)
                
                logger.info(f"Reset quota for {service}")
    
    def can_use_service(self, service: str) -> bool:
        """Check if service can be used (under quota)"""
        self.check_and_reset_quotas()
        
        if service not in self.quotas:
            return False
        
        quota = self.quotas[service]
        return quota.used < quota.limit
    
    def record_usage(self, service: str):
        """Record usage for a service"""
        if service in self.quotas:
            self.quotas[service].used += 1
            self.save_usage()
    
    def get_usage_report(self) -> Dict[str, Any]:
        """Get current usage report"""
        self.check_and_reset_quotas()
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'services': {}
        }
        
        for service, quota in self.quotas.items():
            report['services'][service] = {
                'used': quota.used,
                'limit': quota.limit,
                'limit_type': quota.limit_type,
                'percentage': (quota.used / quota.limit) * 100,
                'reset_time': quota.reset_time.isoformat()
            }
        
        return report

class InternetAccessManager:
    """
    Comprehensive internet access with multiple methods and fallbacks
    """
    
    def __init__(self, config_file: str = "internet_config.json"):
        self.config_file = config_file
        self.usage_tracker = UsageTracker()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.load_config()
        
        # Cache for search results
        self.cache: Dict[str, Any] = {}
        self.cache_ttl = 3600  # 1 hour cache
    
    def load_config(self):
        """Load configuration for internet access"""
        default_config = {
            "api_keys": {
                "google_search_api_key": os.getenv("GOOGLE_SEARCH_API_KEY"),
                "google_search_engine_id": os.getenv("GOOGLE_SEARCH_ENGINE_ID"),
                "bing_search_api_key": os.getenv("BING_SEARCH_API_KEY"),
                "news_api_key": os.getenv("NEWS_API_KEY"),
                "serpapi_key": os.getenv("SERPAPI_KEY")
            },
            "timeout": 10,
            "max_results": 5,
            "cache_enabled": True
        }
        
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    self.config = json.load(f)
            else:
                self.config = default_config
                self.save_config()
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            self.config = default_config
    
    def save_config(self):
        """Save configuration"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def _get_cache_key(self, query: str, search_type: str) -> str:
        """Generate cache key for query"""
        return hashlib.md5(f"{search_type}:{query}".encode()).hexdigest()
    
    def _is_cache_valid(self, timestamp: float) -> bool:
        """Check if cache entry is still valid"""
        return time.time() - timestamp < self.cache_ttl
    
    def _cache_result(self, key: str, result: Any):
        """Cache a search result"""
        if self.config.get("cache_enabled", True):
            self.cache[key] = {
                'result': result,
                'timestamp': time.time()
            }
    
    def _get_cached_result(self, key: str) -> Optional[Any]:
        """Get cached result if valid"""
        if not self.config.get("cache_enabled", True):
            return None
            
        if key in self.cache:
            cached = self.cache[key]
            if self._is_cache_valid(cached['timestamp']):
                return cached['result']
            else:
                del self.cache[key]
        return None
    
    def search_google(self, query: str) -> List[SearchResult]:
        """Search using Google Custom Search API"""
        api_key = self.config["api_keys"]["google_search_api_key"]
        search_engine_id = self.config["api_keys"]["google_search_engine_id"]
        
        if not api_key or not search_engine_id:
            raise ValueError("Google API credentials not configured")
        
        if not self.usage_tracker.can_use_service('google_search'):
            raise ValueError("Google search quota exceeded")
        
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                'q': query,
                'key': api_key,
                'cx': search_engine_id,
                'num': self.config.get("max_results", 5)
            }
            
            response = self.session.get(url, params=params, timeout=self.config["timeout"])
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for item in data.get('items', []):
                results.append(SearchResult(
                    title=item.get('title', ''),
                    url=item.get('link', ''),
                    snippet=item.get('snippet', ''),
                    source='google',
                    timestamp=datetime.now()
                ))
            
            self.usage_tracker.record_usage('google_search')
            return results
            
        except Exception as e:
            logger.error(f"Google search error: {e}")
            raise
    
    def search_bing(self, query: str) -> List[SearchResult]:
        """Search using Bing Search API"""
        api_key = self.config["api_keys"]["bing_search_api_key"]
        
        if not api_key:
            raise ValueError("Bing API key not configured")
        
        if not self.usage_tracker.can_use_service('bing_search'):
            raise ValueError("Bing search quota exceeded")
        
        try:
            url = "https://api.bing.microsoft.com/v7.0/search"
            headers = {"Ocp-Apim-Subscription-Key": api_key}
            params = {
                "q": query,
                "count": self.config.get("max_results", 5)
            }
            
            response = self.session.get(url, headers=headers, params=params, 
                                     timeout=self.config["timeout"])
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for item in data.get('webPages', {}).get('value', []):
                results.append(SearchResult(
                    title=item.get('name', ''),
                    url=item.get('url', ''),
                    snippet=item.get('snippet', ''),
                    source='bing',
                    timestamp=datetime.now()
                ))
            
            self.usage_tracker.record_usage('bing_search')
            return results
            
        except Exception as e:
            logger.error(f"Bing search error: {e}")
            raise
    
    def search_duckduckgo_free(self, query: str) -> List[SearchResult]:
        """Free DuckDuckGo search via web scraping"""
        try:
            # Use DuckDuckGo instant answer API (free)
            url = "https://api.duckduckgo.com/"
            params = {
                'q': query,
                'format': 'json',
                'no_redirect': '1',
                'no_html': '1',
                'skip_disambig': '1'
            }
            
            response = self.session.get(url, params=params, timeout=self.config["timeout"])
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            # Get instant answer
            if data.get('Abstract'):
                results.append(SearchResult(
                    title=data.get('Heading', 'DuckDuckGo Result'),
                    url=data.get('AbstractURL', ''),
                    snippet=data.get('Abstract', ''),
                    source='duckduckgo',
                    timestamp=datetime.now()
                ))
            
            # Get related topics
            for topic in data.get('RelatedTopics', []):
                if isinstance(topic, dict) and 'Text' in topic:
                    results.append(SearchResult(
                        title=topic.get('Text', '')[:100],
                        url=topic.get('FirstURL', ''),
                        snippet=topic.get('Text', ''),
                        source='duckduckgo',
                        timestamp=datetime.now()
                    ))
            
            return results[:self.config.get("max_results", 5)]
            
        except Exception as e:
            logger.error(f"DuckDuckGo search error: {e}")
            # Fallback to HTML scraping
            return self._scrape_duckduckgo_html(query)
    
    def _scrape_duckduckgo_html(self, query: str) -> List[SearchResult]:
        """Fallback: Scrape DuckDuckGo HTML results"""
        try:
            url = f"https://duckduckgo.com/html/?q={quote_plus(query)}"
            response = self.session.get(url, timeout=self.config["timeout"])
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            results = []
            
            for result in soup.find_all('div', class_='result')[:self.config.get("max_results", 5)]:
                title_elem = result.find('a', class_='result__a')
                snippet_elem = result.find('a', class_='result__snippet')
                
                if title_elem:
                    results.append(SearchResult(
                        title=title_elem.get_text().strip(),
                        url=title_elem.get('href', ''),
                        snippet=snippet_elem.get_text().strip() if snippet_elem else '',
                        source='duckduckgo_html',
                        timestamp=datetime.now()
                    ))
            
            return results
            
        except Exception as e:
            logger.error(f"DuckDuckGo HTML scraping error: {e}")
            return []
    
    def search_wikipedia(self, query: str) -> List[SearchResult]:
        """Search Wikipedia (completely free)"""
        if wikipedia is None:
            logger.debug("Wikipedia dependency not installed; skipping wikipedia search.")
            return []
        try:
            # Search for pages
            search_results = wikipedia.search(query, results=3)
            results = []
            
            for title in search_results:
                try:
                    summary = wikipedia.summary(title, sentences=2)
                    page = wikipedia.page(title)
                    
                    results.append(SearchResult(
                        title=title,
                        url=page.url,
                        snippet=summary,
                        source='wikipedia',
                        timestamp=datetime.now()
                    ))
                except wikipedia.exceptions.DisambiguationError as e:
                    # Handle disambiguation
                    if e.options:
                        try:
                            summary = wikipedia.summary(e.options[0], sentences=2)
                            page = wikipedia.page(e.options[0])
                            results.append(SearchResult(
                                title=e.options[0],
                                url=page.url,
                                snippet=summary,
                                source='wikipedia',
                                timestamp=datetime.now()
                            ))
                        except Exception:
                            continue
                except Exception:
                    continue
            
            return results[:self.config.get("max_results", 5)]
            
        except Exception as e:
            logger.error(f"Wikipedia search error: {e}")
            return []
    
    def get_news(self, query: str = None, category: str = None) -> List[SearchResult]:
        """Get news articles"""
        api_key = self.config["api_keys"]["news_api_key"]
        
        if not api_key:
            # Fallback to free news sources
            return self._get_free_news(query)
        
        if not self.usage_tracker.can_use_service('news_api'):
            return self._get_free_news(query)
        
        try:
            url = "https://newsapi.org/v2/everything" if query else "https://newsapi.org/v2/top-headlines"
            params = {
                'apiKey': api_key,
                'pageSize': self.config.get("max_results", 5),
                'language': 'en'
            }
            
            if query:
                params['q'] = query
            if category:
                params['category'] = category
            
            response = self.session.get(url, params=params, timeout=self.config["timeout"])
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for article in data.get('articles', []):
                results.append(SearchResult(
                    title=article.get('title', ''),
                    url=article.get('url', ''),
                    snippet=article.get('description', ''),
                    source='news_api',
                    timestamp=datetime.now()
                ))
            
            self.usage_tracker.record_usage('news_api')
            return results
            
        except Exception as e:
            logger.error(f"News API error: {e}")
            return self._get_free_news(query)
    
    def _get_free_news(self, query: str = None) -> List[SearchResult]:
        """Get news from free sources"""
        results = []
        
        # Use DuckDuckGo with news query
        if query:
            news_query = f"{query} news"
        else:
            news_query = "latest news"
        
        try:
            ddg_results = self.search_duckduckgo_free(news_query)
            for result in ddg_results:
                if 'news' in result.url.lower() or any(word in result.url.lower() for word in ['bbc', 'cnn', 'reuters', 'ap']):
                    result.source = 'free_news'
                    results.append(result)
            
            return results[:self.config.get("max_results", 5)]
            
        except Exception as e:
            logger.error(f"Free news search error: {e}")
            return []
    
    def get_webpage_content(self, url: str, max_length: int = 2000) -> str:
        """Fetch and extract text content from a webpage"""
        try:
            response = self.session.get(url, timeout=self.config["timeout"])
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "aside"]):
                script.decompose()
            
            # Get text content
            text = soup.get_text()
            
            # Clean up text
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = ' '.join(chunk for chunk in chunks if chunk)
            
            return text[:max_length]
            
        except Exception as e:
            logger.error(f"Error fetching webpage content: {e}")
            return f"Error fetching content from {url}"
    
    def comprehensive_search(self, query: str) -> Dict[str, Any]:
        """
        Perform comprehensive search using all available methods with fallbacks
        """
        cache_key = self._get_cache_key(query, 'comprehensive')
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            logger.info(f"Returning cached result for: {query}")
            return cached_result
        
        search_result = {
            'query': query,
            'timestamp': datetime.now().isoformat(),
            'results': {},
            'sources_used': [],
            'total_results': 0
        }
        
        # Try search services in order of preference
        search_methods = [
            ('google', self.search_google),
            ('bing', self.search_bing),
            ('duckduckgo', self.search_duckduckgo_free),
        ]
        if wikipedia is not None:
            search_methods.append(('wikipedia', self.search_wikipedia))
        
        for service_name, search_method in search_methods:
            try:
                results = search_method(query)
                if results:
                    search_result['results'][service_name] = [
                        {
                            'title': r.title,
                            'url': r.url,
                            'snippet': r.snippet,
                            'source': r.source
                        } for r in results
                    ]
                    search_result['sources_used'].append(service_name)
                    search_result['total_results'] += len(results)
                    
                    # If we get good results from premium services, we can stop
                    if service_name in ['google', 'bing'] and len(results) >= 3:
                        break
                        
            except Exception as e:
                logger.warning(f"Search method {service_name} failed: {e}")
                continue
        
        # If no results from search engines, ensure we have something
        if search_result['total_results'] == 0:
            search_result['results']['fallback'] = [{
                'title': 'Search Information',
                'url': '',
                'snippet': f'I searched for "{query}" but couldn\'t find specific results. I can help you with general information about this topic.',
                'source': 'fallback'
            }]
            search_result['sources_used'].append('fallback')
            search_result['total_results'] = 1
        
        # Cache the result
        self._cache_result(cache_key, search_result)
        
        return search_result
    
    def get_current_time_info(self) -> Dict[str, str]:
        """Get current time and date information"""
        now = datetime.now()
        return {
            'current_time': now.strftime('%Y-%m-%d %H:%M:%S'),
            'current_date': now.strftime('%Y-%m-%d'),
            'day_of_week': now.strftime('%A'),
            'timezone': 'Local Time'
        }
    
    def format_search_results_for_prompt(self, search_results: Dict[str, Any]) -> str:
        """Format search results for inclusion in AI prompt"""
        if not search_results.get('results'):
            return "No search results available."
        
        formatted = f"Search Results for '{search_results['query']}':\n\n"
        
        result_count = 0
        for source, results in search_results['results'].items():
            if source == 'fallback':
                continue
                
            formatted += f"=== {source.upper()} RESULTS ===\n"
            for i, result in enumerate(results, 1):
                formatted += f"{result_count + 1}. {result['title']}\n"
                formatted += f"   URL: {result['url']}\n"
                formatted += f"   Summary: {result['snippet']}\n\n"
                result_count += 1
        
        time_info = self.get_current_time_info()
        formatted += f"Search performed at: {time_info['current_time']}\n"
        formatted += f"Sources used: {', '.join(search_results['sources_used'])}\n"
        
        return formatted
    
    def get_usage_status(self) -> Dict[str, Any]:
        """Get current usage status and limits"""
        return self.usage_tracker.get_usage_report()

# Global instance
internet_manager = InternetAccessManager()

def get_internet_manager() -> InternetAccessManager:
    """Get the global internet access manager instance"""
    return internet_manager

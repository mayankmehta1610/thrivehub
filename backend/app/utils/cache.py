import json
import time
from typing import Any

from app.config import settings

_redis_client = None
_memory_cache: dict[str, tuple[Any, float]] = {}


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not settings.redis_url:
        return None
    try:
        import redis

        client = redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        _redis_client = client
        return client
    except Exception:
        return None


def cache_get(key: str) -> Any | None:
    r = _get_redis()
    if r:
        val = r.get(key)
        return json.loads(val) if val else None
    entry = _memory_cache.get(key)
    if entry and entry[1] > time.time():
        return entry[0]
    _memory_cache.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl: int | None = None) -> None:
    ttl = ttl or settings.cache_ttl_seconds
    r = _get_redis()
    if r:
        r.setex(key, ttl, json.dumps(value, default=str))
        return
    _memory_cache[key] = (value, time.time() + ttl)


def cache_delete(key: str) -> None:
    r = _get_redis()
    if r:
        r.delete(key)
    _memory_cache.pop(key, None)


def cache_delete_pattern(prefix: str) -> None:
    r = _get_redis()
    if r:
        for key in r.scan_iter(f"{prefix}*"):
            r.delete(key)
        return
    for key in list(_memory_cache):
        if key.startswith(prefix):
            del _memory_cache[key]

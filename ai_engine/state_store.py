"""
Research State Store — Redis-backed with in-memory fallback.

Replaces the old global RESEARCH_STATES dict to provide:
  1. Workspace-scoped state isolation
  2. Persistence across process restarts
  3. Auto-expiry (24h TTL)
  4. Multi-worker support

Key format: "research:{session_id}:state"
"""

import os
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ai_engine.state_store")

# ============================
# Redis Client (optional)
# ============================
_redis_client = None
_redis_available = False
STATE_TTL_SECONDS = 86400  # 24 hours


def _key(session_id: int) -> str:
    """Build a stable storage key for a research session state."""
    return f"research:{int(session_id)}:state"

def _init_redis():
    """Lazily initialize Redis connection."""
    global _redis_client, _redis_available
    if _redis_client is not None:
        return

    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        logger.info("[StateStore] REDIS_URL not set — using in-memory fallback")
        _redis_available = False
        return

    try:
        import redis
        _redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
        _redis_client.ping()
        _redis_available = True
        logger.info(f"[StateStore] Connected to Redis: {redis_url}")
    except Exception as e:
        logger.warning(f"[StateStore] Redis unavailable ({e}) — using in-memory fallback")
        _redis_available = False


# ============================
# In-Memory Fallback
# ============================
import time

# ============================
# In-Memory Fallback with Cleanup
# ============================
_MEMORY_STORE: Dict[str, Dict[str, Any]] = {}
_MEMORY_EXPIRY: Dict[str, float] = {}  # Tracks when each key should expire

def _cleanup_memory():
    """Removes expired items from memory store."""
    now = time.time()
    expired_keys = [k for k, expiry in _MEMORY_EXPIRY.items() if now > expiry]
    for k in expired_keys:
        _MEMORY_STORE.pop(k, None)
        _MEMORY_EXPIRY.pop(k, None)
    
    # Cap total size if still too many
    if len(_MEMORY_STORE) > 1000:
        # Sort by expiry (earliest first) and remove 20%
        sorted_keys = sorted(_MEMORY_EXPIRY.keys(), key=lambda k: _MEMORY_EXPIRY[k])
        for k in sorted_keys[:200]:
            _MEMORY_STORE.pop(k, None)
            _MEMORY_EXPIRY.pop(k, None)

def get_state(session_id: int) -> Dict[str, Any]:
    """Get the current state for a research session."""
    _init_redis()
    key = _key(session_id)

    if _redis_available and _redis_client:
        try:
            raw = _redis_client.get(key)
            if raw:
                return json.loads(raw)
        except Exception as e:
            logger.error(f"[StateStore] Redis GET failed: {e}")

    # Fallback to in-memory
    _cleanup_memory() # Regular cleanup
    return _MEMORY_STORE.get(key, {})


def set_state(session_id: int, state: Dict[str, Any]) -> None:
    """Set the full state for a research session."""
    _init_redis()
    key = _key(session_id)

    if _redis_available and _redis_client:
        try:
            _redis_client.setex(key, STATE_TTL_SECONDS, json.dumps(state, default=str))
            return
        except Exception as e:
            logger.error(f"[StateStore] Redis SET failed: {e}")

    # Fallback to in-memory
    _cleanup_memory()
    _MEMORY_STORE[key] = state
    _MEMORY_EXPIRY[key] = time.time() + STATE_TTL_SECONDS


def update_state(session_id: int, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Merge updates into the existing state for a research session."""
    current = get_state(session_id)
    current.update(updates)
    set_state(session_id, current)
    return current


def delete_state(session_id: int) -> None:
    """Delete the state for a research session."""
    _init_redis()
    key = _key(session_id)

    if _redis_available and _redis_client:
        try:
            _redis_client.delete(key)
        except Exception as e:
            logger.error(f"[StateStore] Redis DELETE failed: {e}")

    _MEMORY_STORE.pop(key, None)
    _MEMORY_EXPIRY.pop(key, None)


# ============================
# Backward Compatibility
# ============================
# The old code imports `RESEARCH_STATES` as a dict.
# We provide a dict-like wrapper that delegates to the new store.

class _StateProxy(dict):
    """
    Dict-like wrapper so old code that does:
        from state_store import RESEARCH_STATES
        RESEARCH_STATES[rid] = {...}
        state = RESEARCH_STATES.get(rid, {})
    continues to work, but data goes through the new Redis-backed store.
    """

    def __getitem__(self, key):
        return get_state(int(key))

    def __setitem__(self, key, value):
        set_state(int(key), value)

    def __contains__(self, key):
        return bool(get_state(int(key)))

    def get(self, key, default=None):
        result = get_state(int(key))
        return result if result else default

    def __delitem__(self, key):
        delete_state(int(key))

    def update_key(self, key, updates):
        return update_state(int(key), updates)


# This is what old code imports
RESEARCH_STATES = _StateProxy()

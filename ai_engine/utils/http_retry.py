"""Simple HTTP helpers with retry and timeout.

This wraps `requests.get`/`post` with a retry/backoff policy and returns
`requests.Response` or raises an exception on repeated failure.
"""
import time
import requests
from typing import Optional, Dict, Any


def _backoff_sleep(attempt: int, base: float = 0.5):
    time.sleep(base * (2 ** (attempt - 1)))


def http_get(url: str, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None,
             timeout: int = 10, retries: int = 3) -> requests.Response:
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(url, params=params, headers=headers or {}, timeout=timeout)
            resp.raise_for_status()
            return resp
        except Exception as e:
            last_err = e
            if attempt < retries:
                _backoff_sleep(attempt)
                continue
            raise


def http_post(url: str, json: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None,
              timeout: int = 10, retries: int = 3) -> requests.Response:
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.post(url, json=json, headers=headers or {}, timeout=timeout)
            resp.raise_for_status()
            return resp
        except Exception as e:
            last_err = e
            if attempt < retries:
                _backoff_sleep(attempt)
                continue
            raise

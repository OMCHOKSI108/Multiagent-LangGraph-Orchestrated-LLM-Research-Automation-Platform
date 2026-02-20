"""Lightweight in-memory metrics for local development.

Provides simple counters and timings. Meant as a quickstart before
integrating a full metrics system like Prometheus.
"""
from collections import defaultdict
import time
from threading import Lock

_counters = defaultdict(int)
_timings = defaultdict(list)
_lock = Lock()


def inc(name: str, amount: int = 1) -> None:
    with _lock:
        _counters[name] += amount


def timing(name: str, value_ms: int) -> None:
    with _lock:
        _timings[name].append(int(value_ms))


def get_metrics() -> dict:
    with _lock:
        # Return shallow copies
        return {
            "counters": dict(_counters),
            "timings": {k: list(v) for k, v in _timings.items()},
        }


def reset_metrics() -> None:
    with _lock:
        _counters.clear()
        _timings.clear()

"""
Event Emitter for Live Execution Transparency.

Emits structured events to the Node.js backend for real-time streaming.
This module intentionally avoids creating ad hoc asyncio event loops from sync
code paths. Instead, it uses a single background worker thread with a sync
HTTP client so emitters remain loop-safe across threads and request contexts.
"""

import atexit
import logging
import os
import queue
import threading
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger("ai_engine.events")

BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:5000/api")
_EVENT_TIMEOUT = 5.0
_EVENT_QUEUE: "queue.Queue[Optional[tuple[str, dict]]]" = queue.Queue(maxsize=1000)
_WORKER_STARTED = False
_WORKER_LOCK = threading.Lock()
_CLIENT: Optional[httpx.Client] = None
_WORKER_THREAD: Optional[threading.Thread] = None

_current_job_id: Optional[int] = None
_LAST_STAGE_BY_JOB: Dict[int, str] = {}
_STAGE_LOCK = threading.Lock()

ALLOWED_SEVERITIES = {"info", "warn", "error", "success"}
ALLOWED_CATEGORIES = {"stage", "source", "agent", "error", "user_action_required", "brain_thought", "brain_report_chunk"}


def _sanitize_text(value: Any, max_len: int = 500) -> str:
    text = str(value or "").strip()
    return text[:max_len]


def _ensure_worker() -> None:
    global _WORKER_STARTED, _CLIENT, _WORKER_THREAD
    if _WORKER_STARTED:
        return

    with _WORKER_LOCK:
        if _WORKER_STARTED:
            return

        _CLIENT = httpx.Client(timeout=_EVENT_TIMEOUT)
        _WORKER_THREAD = threading.Thread(target=_worker_loop, name="event-emitter", daemon=True)
        _WORKER_THREAD.start()
        _WORKER_STARTED = True
        atexit.register(_shutdown_worker)


def _worker_loop() -> None:
    while True:
        item = _EVENT_QUEUE.get()
        if item is None:
            _EVENT_QUEUE.task_done()
            break

        url, payload = item
        try:
            assert _CLIENT is not None
            response = _CLIENT.post(url, json=payload)
            if response.status_code != 200:
                logger.warning(
                    f"[EventEmitter] Failed to emit (HTTP {response.status_code}): {response.text[:200]}"
                )
        except Exception as e:
            logger.warning(f"[EventEmitter] Emission failed: {e}")
        finally:
            _EVENT_QUEUE.task_done()


def _shutdown_worker() -> None:
    global _CLIENT
    if not _WORKER_STARTED:
        return

    try:
        _EVENT_QUEUE.put_nowait(None)
    except queue.Full:
        pass

    if _WORKER_THREAD and _WORKER_THREAD.is_alive():
        _WORKER_THREAD.join(timeout=1.0)

    if _CLIENT is not None:
        try:
            _CLIENT.close()
        except Exception:
            pass
        _CLIENT = None


def _fire_and_forget(url: str, payload: dict) -> None:
    _ensure_worker()
    try:
        _EVENT_QUEUE.put_nowait((url, payload))
    except queue.Full:
        logger.warning("[EventEmitter] Dropping event because the queue is full")


def set_job_context(job_id: int):
    global _current_job_id
    _current_job_id = job_id
    logger.info(f"[EventEmitter] Job context set to #{job_id}")


def get_job_id() -> Optional[int]:
    return _current_job_id


def emit_event(
    stage: str,
    message: str,
    severity: str = "info",
    category: str = "stage",
    details: Optional[Dict[str, Any]] = None,
    research_id: Optional[int] = None,
):
    job_id = research_id or _current_job_id
    if not job_id:
        return

    stage = _sanitize_text(stage, 80) or "unknown"
    message = _sanitize_text(message, 1000) or "No message provided"
    severity = severity if severity in ALLOWED_SEVERITIES else "info"
    category = category if category in ALLOWED_CATEGORIES else "stage"

    event_id = f"evt_{datetime.now().strftime('%H%M%S')}_{uuid.uuid4().hex[:8]}"
    payload = {
        "research_id": job_id,
        "event_id": event_id,
        "stage": stage,
        "severity": severity,
        "category": category,
        "message": message,
        "details": details or {},
    }
    _fire_and_forget(f"{BACKEND_URL}/events", payload)


def emit_source(
    source_type: str,
    domain: str,
    url: Optional[str] = None,
    status: str = "success",
    items_found: int = 0,
    research_id: Optional[int] = None,
    title: Optional[str] = None,
    description: Optional[str] = None,
    favicon: Optional[str] = None,
    thumbnail: Optional[str] = None,
    published_date: Optional[str] = None,
    citation_text: Optional[str] = None,
):
    job_id = research_id or _current_job_id
    if not job_id:
        return

    if not favicon and url:
        try:
            from urllib.parse import urlparse

            hostname = urlparse(url).netloc
            if hostname:
                favicon = f"https://s2.googleusercontent.com/s2/favicons?domain={hostname}&sz=32"
        except Exception:
            pass

    payload = {
        "research_id": job_id,
        "source_type": source_type,
        "domain": domain,
        "url": url,
        "status": status,
        "items_found": items_found,
        "title": title,
        "description": description,
        "favicon": favicon,
        "thumbnail": thumbnail,
        "published_date": published_date,
        "citation_text": citation_text,
    }
    _fire_and_forget(f"{BACKEND_URL}/events/source", payload)


def emit_agent_start(agent_name: str, research_id: Optional[int] = None):
    emit_event(
        stage="analyzing",
        message=f"Running agent: {agent_name}",
        severity="info",
        category="agent",
        details={"agent_name": agent_name},
        research_id=research_id,
    )


def emit_agent_complete(agent_name: str, duration_ms: int, success: bool = True, research_id: Optional[int] = None):
    emit_event(
        stage="analyzing",
        message=f"Agent {agent_name} {'completed' if success else 'failed'} ({duration_ms}ms)",
        severity="success" if success else "error",
        category="agent",
        details={"agent_name": agent_name, "duration_ms": duration_ms},
        research_id=research_id,
    )


def emit_search(query: str, source: str, results_count: int = 0, research_id: Optional[int] = None):
    emit_event(
        stage="searching",
        message=f"Searching {source}: {query[:50]}...",
        severity="info",
        category="source",
        details={"source": source, "query": query, "results": results_count},
        research_id=research_id,
    )


def emit_scrape(url: str, success: bool = True, research_id: Optional[int] = None):
    from urllib.parse import urlparse

    domain = urlparse(url).netloc
    emit_event(
        stage="scraping",
        message=f"{'Scraped' if success else 'Failed to scrape'}: {domain}",
        severity="info" if success else "warn",
        category="source",
        details={"url": url, "domain": domain},
        research_id=research_id,
    )


def emit_error(message: str, error_code: Optional[str] = None, recoverable: bool = True, research_id: Optional[int] = None):
    emit_event(
        stage="error",
        message=message,
        severity="warn" if recoverable else "error",
        category="error",
        details={"error_code": error_code, "recoverable": recoverable},
        research_id=research_id,
    )


def emit_stage_change(stage: str, next_stage: Optional[str] = None, research_id: Optional[int] = None):
    job_id = research_id or _current_job_id
    if not job_id:
        return

    normalized = _sanitize_text(stage, 80).lower() or "unknown"
    with _STAGE_LOCK:
        prev = _LAST_STAGE_BY_JOB.get(job_id)
        if prev == normalized:
            return
        _LAST_STAGE_BY_JOB[job_id] = normalized

    msg = f"Stage: {stage}"
    if next_stage:
        msg += f" -> Next: {next_stage}"

    emit_event(
        stage=stage,
        message=msg,
        severity="info",
        category="stage",
        details={"next_stage": next_stage},
        research_id=job_id,
    )

def emit_report_chunk(chunk: str, research_id: Optional[int] = None):
    """
    Emits a real-time report chunk for live typing in the Report tab.
    """
    emit_event(
        stage="writing",
        message="Reporting chunk...",
        severity="info",
        category="brain_report_chunk",
        details={"chunk": chunk},
        research_id=research_id,
    )

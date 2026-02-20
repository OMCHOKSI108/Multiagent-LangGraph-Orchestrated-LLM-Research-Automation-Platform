"""
Event Emitter for Live Execution Transparency.

Emits structured events to the Node.js backend for real-time streaming.
"""
import os
import requests
import logging
import uuid
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger("ai_engine.events")

# Backend URL for event submission
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000")

# Store current job context
_current_job_id: Optional[int] = None

ALLOWED_SEVERITIES = {"info", "warn", "error", "success"}
ALLOWED_CATEGORIES = {"stage", "source", "agent", "error", "user_action_required"}


def _sanitize_text(value: Any, max_len: int = 500) -> str:
    text = str(value or "").strip()
    return text[:max_len]


def set_job_context(job_id: int):
    """Set the current job ID for event emission."""
    global _current_job_id
    _current_job_id = job_id
    logger.info(f"[EventEmitter] Job context set to #{job_id}")


def get_job_id() -> Optional[int]:
    """Get the current job ID."""
    return _current_job_id


def emit_event(
    stage: str,
    message: str,
    severity: str = "info",
    category: str = "stage",
    details: Optional[Dict[str, Any]] = None,
    research_id: Optional[int] = None
):
    """
    Emit an execution event to the backend.
    
    Args:
        stage: Current execution stage
        message: Human-readable message
        severity: 'info', 'warn', 'error', 'success'
        category: 'stage', 'source', 'agent', 'error'
        details: Optional additional data
        research_id: Override job ID if needed
    """
    job_id = research_id or _current_job_id
    
    if not job_id:
        logger.debug(f"[EventEmitter] No job context, skipping event: {message}")
        return
    
    stage = _sanitize_text(stage, 80) or "unknown"
    message = _sanitize_text(message, 500) or "No message provided"
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
        "details": details or {}
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/events",
            json=payload,
            timeout=5  # Allow enough time for DB insert
        )
        if response.status_code != 200:
            logger.warning(f"[EventEmitter] Failed to emit event (HTTP {response.status_code}): {response.text[:200]}")
        else:
            # Use INFO for user_action_required events so they always show in logs
            if category == "user_action_required":
                logger.info(f"[EventEmitter] Emitted user_action_required: {stage} - {message[:80]}")
            else:
                logger.debug(f"[EventEmitter] Emitted: {stage} - {message[:60]}")
    except requests.ConnectionError as e:
        logger.warning(f"[EventEmitter] Cannot reach backend at {BACKEND_URL}: {e}")
    except Exception as e:
        # Don't fail the pipeline if event emission fails
        logger.warning(f"[EventEmitter] Could not emit event: {type(e).__name__}: {e}")

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
    citation_text: Optional[str] = None
):
    """
    Register a data source that was scraped.

    Args:
        source_type: 'arxiv', 'web', 'pdf', 'pubmed', 'openalex', 'wikipedia'
        domain: Domain name (e.g., 'arxiv.org')
        url: Full URL if available
        status: 'success', 'partial', 'failed'
        items_found: Number of results
        research_id: Override job ID if needed
        title: Source title
        description: Source description/summary
        favicon: Favicon URL
        thumbnail: Thumbnail image URL
        published_date: Publication date string
        citation_text: Citation text
    """
    job_id = research_id or _current_job_id

    if not job_id:
        return

    # Auto-generate favicon from URL if not provided
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

    try:
        resp = requests.post(
            f"{BACKEND_URL}/events/source",
            json=payload,
            timeout=5
        )
        if resp.status_code != 200:
            logger.warning(f"[EventEmitter] Source emit failed (HTTP {resp.status_code}): {resp.text[:200]}")
    except requests.ConnectionError as e:
        logger.warning(f"[EventEmitter] Cannot reach backend for source emit: {e}")
    except requests.RequestException as e:
        logger.warning(f"[EventEmitter] Source emit error: {e}")


def emit_agent_start(agent_name: str, research_id: Optional[int] = None):
    """Emit event when an agent starts running."""
    emit_event(
        stage="analyzing",
        message=f"Running agent: {agent_name}",
        severity="info",
        category="agent",
        details={"agent_name": agent_name},
        research_id=research_id
    )


def emit_agent_complete(agent_name: str, duration_ms: int, success: bool = True, research_id: Optional[int] = None):
    """Emit event when an agent completes."""
    emit_event(
        stage="analyzing",
        message=f"Agent {agent_name} {'completed' if success else 'failed'} ({duration_ms}ms)",
        severity="success" if success else "error",
        category="agent",
        details={"agent_name": agent_name, "duration_ms": duration_ms},
        research_id=research_id
    )


def emit_search(query: str, source: str, results_count: int = 0, research_id: Optional[int] = None):
    """Emit event for a search operation."""
    emit_event(
        stage="searching",
        message=f"Searching {source}: {query[:50]}...",
        severity="info",
        category="source",
        details={"source": source, "query": query, "results": results_count},
        research_id=research_id
    )


def emit_scrape(url: str, success: bool = True, research_id: Optional[int] = None):
    """Emit event for a scrape operation."""
    from urllib.parse import urlparse
    domain = urlparse(url).netloc
    
    emit_event(
        stage="scraping",
        message=f"{'Scraped' if success else 'Failed to scrape'}: {domain}",
        severity="info" if success else "warn",
        category="source",
        details={"url": url, "domain": domain},
        research_id=research_id
    )


def emit_error(message: str, error_code: Optional[str] = None, recoverable: bool = True, research_id: Optional[int] = None):
    """Emit an error event."""
    emit_event(
        stage="error",
        message=message,
        severity="warn" if recoverable else "error",
        category="error",
        details={"error_code": error_code, "recoverable": recoverable},
        research_id=research_id
    )


def emit_stage_change(stage: str, next_stage: Optional[str] = None, research_id: Optional[int] = None):
    """Emit a stage transition event."""
    msg = f"Stage: {stage}"
    if next_stage:
        msg += f" → Next: {next_stage}"
    
    emit_event(
        stage=stage,
        message=msg,
        severity="info",
        category="stage",
        details={"next_stage": next_stage},
        research_id=research_id
    )

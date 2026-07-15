import json
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

_producer = None


def get_producer():
    global _producer
    if _producer is None:
        import redis.asyncio as aioredis
        _producer = aioredis.from_url(REDIS_URL)
    return _producer


async def emit_progress(job_id: str, agent: str, status: str, message: str = "", data: dict | None = None):
    try:
        r = get_producer()
        payload = json.dumps({
            "jobId": job_id,
            "agent": agent,
            "status": status,
            "message": message,
            "data": data or {},
        })
        await r.publish(f"research:progress:{job_id}", payload)
    except Exception:
        pass


async def emit_token(job_id: str, token: str):
    try:
        r = get_producer()
        await r.publish(f"research:tokens:{job_id}", token)
    except Exception:
        pass


async def is_job_cancelled(job_id: str) -> bool:
    """Check if a research job has been cancelled via Redis flag."""
    try:
        r = get_producer()
        result = await r.get(f"research:cancel:{job_id}")
        return result is not None
    except Exception:
        return False


async def cancel_job(job_id: str):
    """Set the cancellation flag for a research job in Redis."""
    try:
        r = get_producer()
        await r.set(f"research:cancel:{job_id}", "1")
        # Publish a cancellation event so SSE picks it up
        payload = json.dumps({
            "jobId": job_id,
            "agent": "pipeline",
            "status": "cancelled",
            "message": "Research cancelled by user.",
            "data": {},
        })
        await r.publish(f"research:progress:{job_id}", payload)
    except Exception:
        pass


async def clear_cancel_flag(job_id: str):
    """Remove the cancellation flag for a research job."""
    try:
        r = get_producer()
        await r.delete(f"research:cancel:{job_id}")
    except Exception:
        pass
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

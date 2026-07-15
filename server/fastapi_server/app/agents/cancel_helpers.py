from ..services.progress import is_job_cancelled
from .types import ResearchState


async def check_cancelled(state: ResearchState) -> bool:
    """Check if the research job has been cancelled and update state accordingly.
    Returns True if cancelled, False otherwise."""
    job_id = state.get("job_id", "")
    if state.get("cancelled"):
        return True
    if await is_job_cancelled(job_id):
        state["cancelled"] = True
        state["status"] = "cancelled"
        return True
    return False
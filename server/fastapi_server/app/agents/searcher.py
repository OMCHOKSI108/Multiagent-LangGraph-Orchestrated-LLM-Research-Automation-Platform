from ..services.search import search_web
from ..services.progress import emit_progress
from .types import ResearchState


async def run_searcher(state: ResearchState) -> ResearchState:
    if state.get("error"):
        return state

    job_id = state.get("job_id", "")
    queries = state.get("search_queries", [state["question"]])
    await emit_progress(job_id, "searcher", "running", f"Searching the web with {len(queries)} queries...")

    all_results = []

    for i, query in enumerate(queries):
        await emit_progress(job_id, "searcher", "searching", f'Running query {i + 1}/{len(queries)}: "{query[:80]}..."')
        try:
            results = await search_web(query)
            all_results.extend(results)
        except Exception:
            pass

    seen_urls = set()
    unique_results = []
    for r in all_results:
        url = r.get("url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique_results.append(r)

    state["search_results"] = unique_results[:15]
    state["status"] = "searched"

    await emit_progress(job_id, "searcher", "complete", f"Found {len(state['search_results'])} unique sources.", {"source_count": len(state['search_results'])})
    return state

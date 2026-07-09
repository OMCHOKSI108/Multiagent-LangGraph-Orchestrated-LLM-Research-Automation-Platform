from ..services.search import crawl_pages
from ..services.llm import call_llm
from ..services.progress import emit_progress
from .types import ResearchState


async def _extract_relevant_content(question: str, crawl_results: list[dict], job_id: str = "") -> str:
    content_blocks = []
    for item in crawl_results:
        title = item.get("title", "Untitled")
        url = item.get("url", "")
        content = item.get("content", "")
        truncated = content[:2000]
        content_blocks.append(f"Source: {title}\nURL: {url}\nContent:\n{truncated}\n---")

    combined = "\n".join(content_blocks)

    if not combined.strip():
        return "No content could be extracted from the sources."

    await emit_progress(job_id, "crawler", "analyzing", "Extracting relevant information from crawled content...")

    system_prompt = """You are a research analyst. Given a research question and crawled web content, extract and summarize the most relevant information. Focus on facts, data, key arguments, and important findings. Organize the information thematically."""

    user_prompt = f"Research Question: {question}\n\nCrawled Content:\n{combined}\n\nExtract and organize the key information relevant to the research question."

    return call_llm(system_prompt, user_prompt, temperature=0.3)


async def run_crawler(state: ResearchState) -> ResearchState:
    if state.get("error"):
        return state

    job_id = state.get("job_id", "")
    urls = [r.get("url", "") for r in state.get("search_results", []) if r.get("url")]

    if not urls:
        state["status"] = "crawled"
        state["analysis"] = "No sources found to crawl."
        await emit_progress(job_id, "crawler", "complete", "No sources found to crawl.")
        return state

    await emit_progress(job_id, "crawler", "running", f"Crawling {len(urls)} web pages for content...")

    try:
        crawl_results = await crawl_pages(urls)
    except Exception as e:
        state["status"] = "crawled"
        state["analysis"] = f"Crawling failed: {e}"
        await emit_progress(job_id, "crawler", "error", f"Crawling failed: {e}")
        return state

    state["crawled_content"] = crawl_results
    await emit_progress(job_id, "crawler", "parsed", f"Crawled {len(crawl_results)} pages successfully.")

    state["analysis"] = await _extract_relevant_content(state["question"], crawl_results, job_id)
    state["status"] = "crawled"

    await emit_progress(job_id, "crawler", "complete", f"Extracted and analyzed content from {len(crawl_results)} sources.")
    return state

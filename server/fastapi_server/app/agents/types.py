from typing import TypedDict, Optional, Any


class ResearchState(TypedDict):
    question: str
    session_id: str
    job_id: str
    plan: str
    search_queries: list[str]
    search_results: list[dict]
    crawled_content: list[dict]
    analysis: str
    report: str
    review: str
    revision_count: int
    max_revisions: int
    status: str
    error: Optional[str]
    cancelled: bool
    chunk_count: int
    db: Any
    structured_data: list[dict]
    key_findings: list[dict]
    citations: list[dict]
    paper_id: str
    paper_title: str
    paper_abstract: str
    paper_sections: list[dict]

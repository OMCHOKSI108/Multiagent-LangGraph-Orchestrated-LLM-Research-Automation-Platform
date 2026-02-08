"""
Search Router for AI Engine.

Provides unified search API across multiple providers.
"""
import asyncio
import time
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from utils.search_service import search_sync, AVAILABLE_PROVIDERS, DEFAULT_PROVIDERS

router = APIRouter(prefix="/search", tags=["Search"])

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    providers: Optional[List[str]] = Field(
        default=None, 
        description="List of search providers to use"
    )
    max_results: int = Field(
        default=10, 
        ge=1, 
        le=50, 
        description="Maximum results per provider"
    )

class SearchResult(BaseModel):
    title: str
    url: str
    description: str
    source: str
    favicon: str = ""
    thumbnail: Optional[str] = None
    published: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_results: int
    providers_used: List[str]
    execution_time: float

@router.post("/", response_model=SearchResponse)
async def search(
    request: SearchRequest
) -> SearchResponse:
    """
    Unified search across multiple providers.
    
    Searches across the specified providers and returns normalized results.
    Providers are queried in parallel for better performance.
    
    **Available providers:**
    - duckduckgo: General web search
    - google: Google search (if configured)
    - arxiv: Academic papers
    - wikipedia: Wikipedia articles
    - openalex: Scientific literature
    - pubmed: Medical literature
    
    **Returns:**
    - Unified results with consistent schema
    - Provider attribution
    - Execution timing
    """
    try:
        start_time = time.time()
        
        # Validate providers if specified
        providers = request.providers or DEFAULT_PROVIDERS
        invalid_providers = [p for p in providers if p not in AVAILABLE_PROVIDERS]
        if invalid_providers:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid providers: {invalid_providers}. Available: {AVAILABLE_PROVIDERS}"
            )
        
        # Execute search synchronously in thread pool
        loop = asyncio.get_event_loop()
        raw_result = await loop.run_in_executor(
            None,
            lambda: search_sync(request.query, providers, request.max_results)
        )
        
        execution_time = time.time() - start_time
        
        return SearchResponse(
            query=raw_result["query"],
            results=[SearchResult(**r) for r in raw_result["results"]],
            total_results=raw_result["total_results"],
            providers_used=raw_result["providers_used"],
            execution_time=round(execution_time, 3)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/providers")
async def get_providers() -> Dict[str, Any]:
    """
    Get list of available search providers and their capabilities.
    """
    return {
        "available_providers": AVAILABLE_PROVIDERS,
        "default_providers": DEFAULT_PROVIDERS,
        "provider_descriptions": {
            "duckduckgo": "General web search with privacy focus",
            "google": "Google search (requires API key)",
            "arxiv": "Academic papers and preprints",
            "wikipedia": "Wikipedia encyclopedia articles",
            "openalex": "Open access scientific literature",
            "pubmed": "Medical and life science literature"
        }
    }


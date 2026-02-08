"""
Search Router for AI Engine.

Provides unified search API across multiple providers.
"""
import asyncio
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from utils.search_service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    providers: Optional[List[str]] = Field(
        default=["duckduckgo", "arxiv"], 
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
    thumbnail: str = ""
    published: str = ""

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
        search_service = SearchService()
        
        # Validate providers
        invalid_providers = [p for p in request.providers if p not in search_service.get_available_providers()]
        if invalid_providers:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid providers: {invalid_providers}. Available: {search_service.get_available_providers()}"
            )
        
        # Execute search
        results = await search_service.search(
            query=request.query,
            providers=request.providers,
            max_results=request.max_results
        )
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/providers")
async def get_providers() -> Dict[str, Any]:
    """
    Get list of available search providers and their capabilities.
    """
    search_service = SearchService()
    return {
        "available_providers": search_service.get_available_providers(),
        "default_providers": ["duckduckgo", "arxiv"],
        "provider_descriptions": {
            "duckduckgo": "General web search with privacy focus",
            "google": "Google search (requires API key)",
            "arxiv": "Academic papers and preprints",
            "wikipedia": "Wikipedia encyclopedia articles",
            "openalex": "Open access scientific literature",
            "pubmed": "Medical and life science literature"
        }
    }

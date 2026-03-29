"""
WebScraperAgent
================
Agent wrapper around ScrapingPipeline.
Integrates with the existing BaseAgent / LangGraph pipeline.

Runs: search → scrape → return sources for downstream agents.
"""

import logging
import time
from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger("ai_engine.agents.scraper.web")

SYSTEM_PROMPT = """You are a Web Research Analyst.
You will receive scraped web content and must extract the most relevant information.

Given the research query and scraped sources, produce a structured summary:
{
  "key_findings": ["finding1", "finding2", ...],
  "main_themes": ["theme1", "theme2"],
  "data_points": ["fact1", "fact2", ...],
  "gaps": ["what is missing or unclear"],
  "source_quality": "high|medium|low",
  "summary": "2-3 paragraph synthesis"
}

Output ONLY valid JSON.
"""


class WebScraperAgent(BaseAgent):
    """
    Searches the web, scrapes results, and synthesizes findings
    into structured knowledge for downstream agents.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="WebScraperAgent",
            system_prompt=SYSTEM_PROMPT,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        task = state.get("task", "")
        search_terms = state.get("search_terms", [task])
        query = search_terms[0] if search_terms else task

        logger.info(f"[{self.name}] Searching + scraping for: {query[:60]}")
        t0 = time.time()

        # ── Run scraping pipeline ─────────────────────────────────────────
        try:
            from scraper.pipeline import ScrapingPipeline
            pipeline = ScrapingPipeline(n_search=6, n_scrape=5)
            scrape_result = pipeline.run(query)
        except Exception as e:
            logger.error(f"[{self.name}] Scraping pipeline failed: {e}")
            return {
                "response": {"error": str(e), "sources": []},
                "agent": self.name,
                "execution_time": round(time.time() - t0, 2),
            }

        combined_text = scrape_result.get("combined_text", "")
        sources = scrape_result.get("sources", [])

        if not combined_text.strip():
            return {
                "response": {"sources": sources, "summary": "No content scraped."},
                "agent": self.name,
                "execution_time": round(time.time() - t0, 2),
            }

        # ── LLM synthesis of scraped content ─────────────────────────────
        context = f"Query: {task}\n\nScraped Content:\n{combined_text[:12000]}"
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]

        try:
            response = self.llm.invoke(messages)
            analysis = self._extract_json(response.content)
            if not isinstance(analysis, dict):
                analysis = {"summary": response.content, "key_findings": []}
        except Exception as e:
            logger.warning(f"[{self.name}] LLM synthesis failed: {e}")
            analysis = {"summary": combined_text[:2000], "key_findings": []}

        analysis["sources"] = sources
        analysis["source_count"] = len(sources)
        
        # Aggregate image URLs for VisionAgent
        image_urls = []
        for s in sources:
            urls = s.get("metadata", {}).get("image_urls", [])
            if urls:
                image_urls.extend(urls)
        analysis["image_urls"] = list(set(image_urls))[:10] # Cap total unique images

        return {
            "response": analysis,
            "raw": combined_text[:2000],
            "agent": self.name,
            "execution_time": round(time.time() - t0, 2),
        }

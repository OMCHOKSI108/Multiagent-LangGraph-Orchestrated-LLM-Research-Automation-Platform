"""
DataCleanerAgent
================
Cleans, deduplicates, and normalizes scraped research data.
Removes noise, HTML artifacts, repeated text, and low-quality content.
Uses MODEL_REASONING for intelligent filtering.
"""

import logging
import re
import time
from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger("ai_engine.agents.processing.cleaner")

SYSTEM_PROMPT = """You are a Data Quality Analyst for academic research.
Clean and filter the provided text data.

Tasks:
1. Remove HTML artifacts, ads, cookie notices, navigation text
2. Remove duplicate or near-duplicate sentences
3. Identify and keep only research-relevant content
4. Normalize whitespace and encoding issues
5. Score overall content quality (0-100)

Return JSON:
{
  "cleaned_text": "...",
  "removed_count": 5,
  "quality_score": 85,
  "key_sentences": ["most important sentence 1", ...],
  "topic_relevance": "high|medium|low"
}

Output ONLY valid JSON.
"""


class DataCleanerAgent(BaseAgent):
    """
    Cleans and deduplicates scraped text using both
    deterministic rules and LLM-based quality filtering.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="DataCleanerAgent",
            system_prompt=SYSTEM_PROMPT,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        task = state.get("task", "")
        t0 = time.time()

        # Get scraped content from state/findings
        findings = state.get("findings", {})
        raw_text = ""

        # Try to get from web_scraper findings first, then combined sources
        if "web_scraper" in findings:
            ws = findings["web_scraper"]
            if isinstance(ws, dict):
                raw_text = ws.get("summary", "") + "\n\n"
                sources = ws.get("sources", [])
                for src in sources[:5]:
                    raw_text += src.get("text", "")[:2000] + "\n\n"

        if not raw_text:
            raw_text = str(findings)[:8000]

        # ── Step 1: Deterministic cleaning ───────────────────────────────
        cleaned = self._deterministic_clean(raw_text)

        # ── Step 2: LLM quality filtering ────────────────────────────────
        context = f"Research Topic: {task}\n\nText to clean:\n{cleaned[:8000]}"
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=context),
        ]

        try:
            response = self.llm.invoke(messages)
            result = self._extract_json(response.content)
            if not isinstance(result, dict):
                result = {"cleaned_text": cleaned, "quality_score": 60}
        except Exception as e:
            logger.warning(f"[{self.name}] LLM cleaning failed, using deterministic: {e}")
            result = {"cleaned_text": cleaned, "quality_score": 60}

        return {
            "response": result,
            "raw": raw_text[:500],
            "agent": self.name,
            "execution_time": round(time.time() - t0, 2),
        }

    def _deterministic_clean(self, text: str) -> str:
        """Fast rule-based cleaning before sending to LLM."""
        # Remove HTML tags
        text = re.sub(r"<[^>]+>", " ", text)
        # Remove URLs in plain text (keep the content around them)
        text = re.sub(r"https?://\S+", "[URL]", text)
        # Remove excessive whitespace
        text = re.sub(r"\s{3,}", "\n\n", text)
        # Remove lines that are just punctuation/numbers (navigation artifacts)
        lines = [ln for ln in text.split("\n") if len(ln.strip()) > 20]
        # Remove duplicate lines
        seen = set()
        unique_lines = []
        for line in lines:
            key = re.sub(r"\s+", " ", line.strip().lower())[:50]
            if key not in seen:
                seen.add(key)
                unique_lines.append(line)
        return "\n".join(unique_lines)

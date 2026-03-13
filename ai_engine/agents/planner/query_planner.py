"""
QueryPlannerAgent
=================
Routes user queries into one of three research modes:
  - direct  : Simple question → LLM answers from knowledge
  - search  : Needs fresh data → WebSearch + single scrape
  - deep    : Complex research → Full multi-agent LangGraph pipeline

Uses MODEL_CODING (fast/cheap JSON model):
  OFFLINE: qwen2.5-coder:1.5b
  ONLINE:  openrouter/mistralai/mistral-7b-instruct (or MODEL_CODING prefix)
"""

from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
import json
import re
import logging

logger = logging.getLogger("ai_engine.planner")

SYSTEM_PROMPT = """You are a Research Query Router. Classify each user query into exactly one mode.

MODES:
  "direct" - Simple factual question that an LLM can answer from knowledge.
             Examples: "What is a neural network?", "Who invented the telephone?"

  "search" - Needs fresh, real-world, or recent information not in training data.
             Examples: "Latest AI news today", "Current price of Bitcoin", "Recent papers on LLMs"

  "deep"   - Complex research topic requiring multi-agent deep analysis.
             Examples: "Analyze transformer architectures vs RNNs", "/deep Quantum Finance",
                       "Comprehensive review of CRISPR applications", questions with /research /deepresearch /gatherdata

OUTPUT FORMAT (valid JSON only):
{
  "mode": "direct" | "search" | "deep",
  "confidence": 0.0-1.0,
  "search_terms": ["term1", "term2"],
  "depth": "standard" | "deep" | "gather",
  "rationale": "brief explanation"
}

Rules:
- If query starts with /deep, /deepresearch → always "deep" with depth "deep"
- If query starts with /research → "deep" with depth "standard"
- If query starts with /gatherdata → "deep" with depth "gather"
- If query starts with /search → always "search"
- Default depth for "deep" mode is "standard"
- search_terms should be 2-4 concise, relevant terms
"""


class QueryPlannerAgent(BaseAgent):
    """
    Classifies user queries into direct / search / deep modes.
    Uses MODEL_CODING since it's a structured JSON extraction task.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="QueryPlannerAgent",
            system_prompt=SYSTEM_PROMPT,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        task = state.get("task", "").strip()
        logger.info(f"[{self.name}] Routing query: {task[:80]}")

        # ── Slash command fast-path (no LLM needed) ──────────────────────
        slash = self._parse_slash(task)
        if slash:
            logger.info(f"[{self.name}] Slash command → {slash}")
            return {
                "response": slash,
                "raw": f"slash:{task}",
                "agent": self.name,
                "execution_time": 0.0,
            }

        # ── LLM classification ────────────────────────────────────────────
        messages = [
            SystemMessage(content=SYSTEM_PROMPT + "\n\nOutput ONLY valid JSON."),
            HumanMessage(content=f"Classify this query:\n\n{task}"),
        ]

        import time
        t0 = time.time()
        try:
            response = self.llm.invoke(messages)
            result = self._extract_json(response.content)
            elapsed = round(time.time() - t0, 2)

            # Validate and normalise
            if not isinstance(result, dict) or "mode" not in result:
                result = self._fallback_classify(task)

            result.setdefault("search_terms", [task])
            result.setdefault("depth", "standard")
            result.setdefault("confidence", 0.8)

            logger.info(
                f"[{self.name}] mode={result['mode']} "
                f"depth={result['depth']} ({elapsed}s)"
            )
            return {
                "response": result,
                "raw": response.content,
                "agent": self.name,
                "execution_time": elapsed,
            }

        except Exception as e:
            logger.error(f"[{self.name}] LLM error: {e}")
            fallback = self._fallback_classify(task)
            return {
                "response": fallback,
                "raw": str(e),
                "agent": self.name,
                "execution_time": 0.0,
            }

    # ── Helpers ───────────────────────────────────────────────────────────

    def _parse_slash(self, query: str) -> dict | None:
        """Fast path for slash commands — no LLM needed."""
        q = query.strip()
        slash_map = {
            "/deepresearch": ("deep", "deep"),
            "/deep ":        ("deep", "deep"),
            "/research":     ("deep", "standard"),
            "/gatherdata":   ("deep", "gather"),
            "/search":       ("search", "standard"),
        }
        for prefix, (mode, depth) in slash_map.items():
            if q.lower().startswith(prefix.rstrip()):
                topic = q[len(prefix):].strip() if len(prefix) > 6 else q
                return {
                    "mode": mode,
                    "depth": depth,
                    "search_terms": [topic or q],
                    "confidence": 1.0,
                    "rationale": f"Explicit slash command: {prefix.strip()}",
                }
        return None

    def _fallback_classify(self, query: str) -> dict:
        """Rule-based fallback when LLM fails."""
        q = query.lower()
        recent_words = {"latest", "recent", "today", "current", "news", "2024", "2025"}
        complex_words = {"analyze", "compare", "review", "research", "comprehensive",
                         "explain in detail", "survey", "mechanism"}

        if any(w in q for w in recent_words):
            return {"mode": "search", "depth": "standard",
                    "search_terms": [query], "confidence": 0.6,
                    "rationale": "Contains recency keywords"}
        if any(w in q for w in complex_words) or len(query.split()) > 8:
            return {"mode": "deep", "depth": "standard",
                    "search_terms": [query], "confidence": 0.5,
                    "rationale": "Complex phrasing or long query"}
        return {"mode": "direct", "depth": "standard",
                "search_terms": [query], "confidence": 0.5,
                "rationale": "Default: simple question"}

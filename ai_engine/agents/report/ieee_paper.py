"""
IEEEPaperAgent
===============
Generates a fully-structured IEEE-format research paper from
completed research session data.

Only callable AFTER research pipeline has completed.
Uses MODEL_WRITING (gemma2:2b OFFLINE | groq/gemma2-9b-it ONLINE).

Also supports conversational section editing:
  agent.expand_section(state, section="methodology") → updated paper
"""

import logging
import time
from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger("ai_engine.agents.report.ieee_paper")

IEEE_SYSTEM_PROMPT = """You are an expert IEEE research paper writer.
Generate complete, properly structured IEEE-format academic papers.

IEEE PAPER STRUCTURE:
1. Title (descriptive, max 12 words)
2. Abstract (150-250 words: motivation, methods, results, conclusions)
3. Keywords (5-8 terms)
4. I. Introduction (background, motivation, problem statement, contributions)
5. II. Related Work (compare 5-8 relevant works with citations)
6. III. Methodology (detailed approach, algorithms, system design)
7. IV. Results (quantitative outcomes, tables, figures descriptions)
8. V. Discussion (interpretation, limitations, implications)
9. VI. Conclusion (summary, future work)
10. References (IEEE format: [1] Author, "Title," Journal, vol, pp, year.)

FORMATTING RULES:
- Use IEEE citation style: [1], [2], etc.
- Include Figure captions as: Fig. 1. Description
- Include Table captions as: TABLE I. Description
- Use formal academic language
- Each section: 200-400 words minimum

Output the complete paper in Markdown with proper ## headers.
"""

EXPAND_SYSTEM_PROMPT = """You are an IEEE paper section editor.
You will receive an existing paper and must expand or improve one specific section.
Keep all other sections unchanged. Return the FULL updated paper.

When expanding:
- Add more technical depth
- Include additional citations [n]
- Add relevant equations or algorithms if appropriate
- Maintain IEEE formatting throughout
"""


class IEEEPaperAgent(BaseAgent):
    """
    Generates and edits IEEE-format research papers.
    Triggered after research pipeline completion.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="IEEEPaperAgent",
            system_prompt=IEEE_SYSTEM_PROMPT,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        """Generate full IEEE paper from completed research state."""
        task = state.get("task", "")
        selected_topic = state.get("selected_topic", task)
        t0 = time.time()

        logger.info(f"[{self.name}] Generating IEEE paper for: {selected_topic[:60]}")

        # ── Gather all research findings ──────────────────────────────────
        findings = state.get("findings", {})
        report_context = self._build_context(selected_topic, findings, state)

        messages = [
            SystemMessage(content=IEEE_SYSTEM_PROMPT),
            HumanMessage(content=report_context),
        ]

        try:
            response = self.llm.invoke(messages)
            paper_text = response.content.strip()

            return {
                "response": {
                    "ieee_paper": paper_text,
                    "topic": selected_topic,
                    "word_count": len(paper_text.split()),
                    "status": "generated",
                },
                "raw": paper_text[:500],
                "agent": self.name,
                "execution_time": round(time.time() - t0, 2),
            }

        except Exception as e:
            logger.error(f"[{self.name}] Failed to generate paper: {e}")
            return {"error": str(e), "agent": self.name}

    def expand_section(self, state: dict, section: str, additional_context: str = "") -> dict:
        """
        Expand or revise a specific section of an existing paper.
        Used for conversational editing: "Expand the methodology section"
        """
        t0 = time.time()
        existing_paper = state.get("ieee_paper", "")
        task = state.get("task", "")

        if not existing_paper:
            # No paper yet — generate first
            return self.run(state)

        prompt = (
            f"Existing paper:\n\n{existing_paper}\n\n"
            f"---\n"
            f"INSTRUCTION: Expand and improve the '{section}' section significantly.\n"
            f"Research topic: {task}\n"
        )
        if additional_context:
            prompt += f"Additional context/new research:\n{additional_context}\n"
        prompt += "\nReturn the COMPLETE updated paper in Markdown format."

        messages = [
            SystemMessage(content=EXPAND_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]

        try:
            response = self.llm.invoke(messages)
            paper_text = response.content.strip()
            return {
                "response": {
                    "ieee_paper": paper_text,
                    "section_expanded": section,
                    "status": "updated",
                },
                "agent": self.name,
                "execution_time": round(time.time() - t0, 2),
            }
        except Exception as e:
            return {"error": str(e), "agent": self.name}

    def _build_context(self, topic: str, findings: dict, state: dict) -> str:
        """Build a comprehensive context prompt from research findings."""
        parts = [f"Generate an IEEE research paper on: {topic}\n\n== RESEARCH FINDINGS ==\n"]

        # Add each agent's findings
        for key, value in findings.items():
            if isinstance(value, dict):
                text = value.get("summary", value.get("cleaned_text", str(value)))[:1500]
            else:
                text = str(value)[:1500]
            parts.append(f"[{key.upper()}]:\n{text}\n")

        # Add scraped sources
        web_data = findings.get("web_scraper", {})
        sources = web_data.get("sources", []) if isinstance(web_data, dict) else []
        if sources:
            parts.append("\n== SCRAPED SOURCES (for citations) ==\n")
            for i, src in enumerate(sources[:8], 1):
                parts.append(
                    f"[{i}] Title: {src.get('title', 'Unknown')}\n"
                    f"    URL: {src.get('url', '')}\n"
                    f"    Date: {src.get('published_date', '')}\n"
                )

        # Summary from report if available
        summary = state.get("research_summary", "")
        if summary:
            parts.append(f"\n== RESEARCH SUMMARY ==\n{summary[:2000]}")

        return "\n".join(parts)

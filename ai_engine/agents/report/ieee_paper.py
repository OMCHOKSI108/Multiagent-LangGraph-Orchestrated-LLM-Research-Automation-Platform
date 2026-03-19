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

IEEE_REFERENCE_TEMPLATE = r"""
\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\def\BibTeX{{\rm B\kern-.05em{\sc i\kern-.025em b}\kern-.08em T\kern-.1667em\lower.7ex\hbox{E}\kern-.125emX}}

\begin{document}

\title{PAPER TITLE HERE}

\author{
  \IEEEauthorblockN{Author Name}
  \IEEEauthorblockA{\textit{Department} \\
  \textit{Institution}\\
  City, Country \\
  email@example.com}
}

\maketitle

\begin{abstract}
Abstract text here (150-250 words).
\end{abstract}

\begin{IEEEkeywords}
keyword1, keyword2, keyword3
\end{IEEEkeywords}

\section{Introduction}
Introduction text.

\section{Related Work}
Related work text.

\section{Methodology}
Methodology text.

\section{Results}
Results text.

\section{Conclusion}
Conclusion text.

\begin{thebibliography}{00}
\bibitem{b1} Author, ``Title,'' \textit{Journal}, vol. X, pp. Y--Z, Year.
\end{thebibliography}

\end{document}
"""

IEEE_SYSTEM_PROMPT = f"""You are an expert IEEE research paper LaTeX writer. Follow these rules STRICTLY with no exceptions.

=== MANDATORY RULES ===
1. Use ONLY \\documentclass[conference]{{IEEEtran}} — no other document class is permitted.
2. Output ONLY raw LaTeX code. NO markdown, NO backticks, NO explanations before or after the code.
3. Your output MUST begin with \\documentclass and end with \\end{{document}}.
4. Every \\begin{{X}} MUST have a matching \\end{{X}} — never leave environments open.
5. All citations MUST use \\cite{{key}} where key matches a \\bibitem{{key}} in the bibliography.
6. Do NOT invent or hallucinate references. Only cite sources provided to you.
7. Keep figures as \\includegraphics{{placeholder}} if no image path is provided.
8. Use \\section, \\subsection — never \\chapter.
9. Escape all special characters: & → \\&, % → \\%, # → \\#, _ → \\_

=== SECTION ORDER (mandatory) ===
Abstract → Introduction → Related Work → Methodology → Results → Discussion → Conclusion → References

=== REFERENCE TEMPLATE (replicate this structure EXACTLY) ===
{IEEE_REFERENCE_TEMPLATE}
=== END TEMPLATE ===

Your output is piped directly into pdflatex. Any non-LaTeX output will cause a compile failure.
"""

EXPAND_SYSTEM_PROMPT = """You are an IEEE paper LaTeX section editor.
You will receive an existing IEEE LaTeX paper and must expand or improve one specific section.

RULES:
1. Keep ALL other sections unchanged — word for word.
2. Output ONLY raw LaTeX. No markdown, no backticks, no explanations.
3. Maintain \\documentclass[conference]{IEEEtran} and all existing \\bibitem keys.
4. Do not add new \\bibitem entries unless you also add the \\cite{} call in the text.
5. Return the FULL updated LaTeX document from \\documentclass to \\end{document}.

When expanding a section:
- Add more technical depth with specific details from the research findings.
- Add relevant equations using \\begin{equation}...\\end{equation}.
- Add figures as \\includegraphics{placeholder} with descriptive captions.
- Maintain formal academic IEEE language throughout.
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

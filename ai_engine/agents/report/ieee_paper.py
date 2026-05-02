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
import asyncio
import gc
from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
from ai_engine.utils.event_emitter import emit_agent_start, emit_agent_complete, emit_event
from .reference_builder import build_references
from .image_embedder import embed_images
import os

logger = logging.getLogger("ai_engine.agents.report.ieee_paper")

# ─── IEEE LaTeX Preamble ────────────────────────────────────────────────────
IEEE_PREAMBLE = r"""\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage[hyphens]{url}
\usepackage[colorlinks=true,linkcolor=blue,citecolor=blue,urlcolor=blue]{hyperref}
\def\BibTeX{{\rm B\kern-.05em{\sc i\kern-.025em b}\kern-.08em
    T\kern-.1667em\lower.7ex\hbox{E}\kern-.125emX}}"""

IEEE_SYSTEM_PROMPT = r"""You are an expert IEEE research paper LaTeX writer. Follow these rules STRICTLY with no exceptions.

=== MANDATORY OUTPUT FORMAT ===
Output ONLY raw LaTeX code.
- NO markdown (no ```, no **, no *)
- NO explanations or commentary before or after the code
- Your output MUST begin with \documentclass[conference]{IEEEtran}
- Your output MUST end with \end{document}

=== REQUIRED PREAMBLE (copy EXACTLY) ===
\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}
\usepackage[hyphens]{url}
\usepackage[colorlinks=true,linkcolor=blue,citecolor=blue,urlcolor=blue]{hyperref}

=== CITATION RULES (CRITICAL) ===
1. The bibliography section is PRE-BUILT and provided to you. Copy it VERBATIM.
2. Cite sources using \cite{key} where 'key' matches a \bibitem{key} in the pre-built bibliography.
3. NEVER invent or hallucinate \bibitem entries. Use ONLY the keys given to you.
4. Every factual claim in the paper MUST have a \cite{key} citation.
5. If no source supports a claim, mark it with [SPECULATIVE] instead.

=== FIGURE RULES ===
1. Image figures are PRE-BUILT and provided to you. Insert them at the indicated section.
2. For figures without provided images, use: \includegraphics[width=0.9\linewidth]{placeholder}
3. Always wrap figures in \begin{figure}[htbp]...\end{figure}
4. Figure captions must be descriptive and scientific.

=== STRUCTURE (mandatory order) ===
Abstract → Introduction → Related Work → Methodology → Results → Discussion → Conclusion → References

=== FORMATTING RULES ===
- Use \section{}, \subsection{} — never \chapter{}
- Escape all special chars: & → \&  |  % → \%  |  # → \#  |  _ → \_ (outside math mode)
- Use \textbf{} for bold, \textit{} for italic, \texttt{} for code
- IEEE font is Times — do NOT add \usepackage{times} (IEEEtran handles it)

Your output is piped directly into: pdflatex -interaction=nonstopmode paper.tex
Any non-LaTeX output will cause a compile failure.
"""

EXPAND_SYSTEM_PROMPT = r"""You are an IEEE paper LaTeX section editor.
You will receive an existing IEEE LaTeX paper and must expand or improve one specific section.

RULES:
1. Keep ALL other sections unchanged — word for word.
2. Output ONLY raw LaTeX. No markdown, no backticks, no explanations.
3. Maintain \documentclass[conference]{IEEEtran} and all existing \bibitem keys.
4. Do not add new \bibitem entries unless you also add the \cite{} call in the text.
5. Return the FULL updated LaTeX document from \documentclass to \end{document}.

When expanding a section:
- Add more technical depth with specific details from the research findings.
- Add relevant equations using \begin{equation}...\end{equation}.
- Add figures as \includegraphics{placeholder} with descriptive captions.
- Maintain formal academic IEEE language throughout.
"""


class IEEEPaperAgent(BaseAgent):
    """
    Generates and edits IEEE-format research papers with real references and embedded images.
    Triggered after research pipeline completion.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="IEEEPaperAgent",
            system_prompt=IEEE_SYSTEM_PROMPT,
            **kwargs
        )

    async def arun(self, state: dict) -> dict:
        """Generate full IEEE paper from completed research state."""
        task = state.get("task", "")
        selected_topic = state.get("selected_topic", task)
        job_id = state.get("_job_id", "?")
        research_id = int(job_id) if str(job_id).isdigit() else None

        t0 = time.time()
        logger.info(f"[{self.name}] Generating IEEE paper for: {selected_topic[:60]}")
        emit_agent_start(self.name, research_id=research_id)
        gc.collect()

        # ── Step 1: Build real references from scraped sources ──────────────
        findings = state.get("findings", {})
        emit_event("writing", "Building verified reference list...",
                   category="agent", research_id=research_id)
        ref_data = build_references(findings)

        # ── Step 2: Download and embed images ───────────────────────────────
        output_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "output", f"job_{job_id}")
        )
        os.makedirs(output_dir, exist_ok=True)

        emit_event("writing", "Downloading research figures...",
                   category="agent", research_id=research_id)
        img_data = embed_images(findings, output_dir)

        # ── Step 3: Build LLM context ────────────────────────────────────────
        report_context = self._build_context(selected_topic, findings, state, ref_data, img_data)
        brain_guidance = self._get_brain_guidance(state)

        enhanced_system = IEEE_SYSTEM_PROMPT
        if brain_guidance:
            enhanced_system += (
                f"\n\nFOLLOW THESE DIRECTIVES FROM THE CENTRAL BRAIN:\n{brain_guidance}\n"
                f"Ensure the paper matches the thesis and narrative arc defined by the brain.\n"
            )

        context_human = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=enhanced_system),
            HumanMessage(content=(
                f"Topic: {selected_topic}\n\n"
                f"Research Findings:\n{context_human}\n\n"
                f"Detailed Context (references, figures, sources):\n{report_context}"
            )),
        ]

        # ── Step 4: Stream generation (suppress raw chunks from UI) ─────────
        emit_event("writing", "Generating IEEE paper...",
                   severity="info", category="stage", research_id=research_id)

        full_response = ""
        try:
            async for chunk in self.llm.astream(messages):
                content = chunk.content
                if content:
                    full_response += content
                    # Do NOT emit raw LaTeX chunks to UI — emit progress milestones instead

            gc.collect()
            elapsed = time.time() - t0

            # Emit a single clean completion event
            word_count = len(full_response.split())
            emit_event(
                "writing",
                f"IEEE paper generated ({word_count} tokens, {len(ref_data['references'])} references, "
                f"{img_data['count']} figures)",
                severity="success", category="agent", research_id=research_id
            )
            emit_agent_complete(self.name, int(elapsed * 1000), success=True, research_id=research_id)

            # Post-inject the pre-built bibliography if the LLM dropped it
            final_latex = self._ensure_bibliography(full_response, ref_data["bibitem_block"])

            return {
                "response": {
                    "ieee_paper": final_latex,
                    "topic": selected_topic,
                    "word_count": word_count,
                    "reference_count": ref_data["count"],
                    "figure_count": img_data["count"],
                    "status": "generated",
                },
                "raw": final_latex[:500],
                "agent": self.name,
                "execution_time": round(elapsed, 2),
            }

        except Exception as e:
            logger.error(f"[{self.name}] Failed to generate paper: {e}")
            emit_agent_complete(self.name, int((time.time() - t0) * 1000), success=False, research_id=research_id)
            return {"error": str(e), "agent": self.name}

    def run(self, state: dict) -> dict:
        """Sync wrapper."""
        return asyncio.run(self.arun(state))

    def expand_section(self, state: dict, section: str, additional_context: str = "") -> dict:
        """Expand or revise a specific section of an existing paper."""
        t0 = time.time()
        existing_paper = state.get("ieee_paper", "")
        task = state.get("task", "")

        if not existing_paper:
            return self.run(state)

        prompt = (
            f"Existing paper:\n\n{existing_paper}\n\n"
            f"---\n"
            f"INSTRUCTION: Expand and improve the '{section}' section significantly.\n"
            f"Research topic: {task}\n"
        )
        if additional_context:
            prompt += f"Additional context/new research:\n{additional_context}\n"
        prompt += "\nReturn the COMPLETE updated paper as valid LaTeX."

        brain_guidance = self._get_brain_guidance(state)
        enhanced_system = EXPAND_SYSTEM_PROMPT
        if brain_guidance:
            enhanced_system += f"\n\nFOLLOW THESE DIRECTIVES FROM THE CENTRAL BRAIN:{brain_guidance}\n"

        messages = [
            SystemMessage(content=enhanced_system),
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

    def _ensure_bibliography(self, latex: str, bibitem_block: str) -> str:
        """Guarantee the pre-built bibliography is in the output."""
        if not bibitem_block:
            return latex

        # If the LLM already wrote a thebibliography, replace its contents
        bib_pattern = r'\\begin\{thebibliography\}\{[^}]*\}.*?\\end\{thebibliography\}'
        replacement = (
            f"\\begin{{thebibliography}}{{00}}\n"
            f"{bibitem_block}\n"
            f"\\end{{thebibliography}}"
        )

        import re
        if re.search(bib_pattern, latex, re.DOTALL):
            latex = re.sub(bib_pattern, replacement, latex, flags=re.DOTALL)
        elif "\\end{document}" in latex:
            # Inject before \end{document}
            latex = latex.replace(
                "\\end{document}",
                f"\n{replacement}\n\n\\end{{document}}"
            )
        return latex

    def _build_context(
        self,
        topic: str,
        findings: dict,
        state: dict,
        ref_data: dict,
        img_data: dict,
    ) -> str:
        """Build a comprehensive context prompt for the LLM."""
        parts = [f"Generate an IEEE research paper on: {topic}\n"]

        # Reference instructions
        parts.append("=" * 60)
        parts.append("VERIFIED REFERENCES (USE ONLY THESE CITE KEYS):")
        parts.append(ref_data["cite_context"])
        parts.append("\nPRE-BUILT BIBLIOGRAPHY BLOCK (copy VERBATIM into \\begin{thebibliography}):")
        parts.append(ref_data["bibitem_block"] or "(No references available)")
        parts.append("=" * 60)

        # Figure instructions
        if img_data["count"] > 0:
            parts.append("\nPRE-BUILT FIGURE BLOCKS (insert at indicated sections):")
            for section_key, fig_block in img_data["figure_map"].items():
                parts.append(f"\n[INSERT IN {section_key.upper()} SECTION]:\n{fig_block}")
            parts.append("=" * 60)

        # Research findings
        parts.append("\nRESEARCH FINDINGS:\n")
        for key, value in findings.items():
            if key.startswith("_") or key in ("image_intelligence", "vision_analysis"):
                continue
            if isinstance(value, dict):
                text = value.get("summary", value.get("raw_text", str(value)))[:1500]
            else:
                text = str(value)[:1500]
            parts.append(f"[{key.upper()}]:\n{text}\n")

        # Research summary
        summary = state.get("research_summary", "")
        if summary:
            parts.append(f"\nRESEARCH SUMMARY:\n{summary[:2000]}")

        return "\n".join(parts)

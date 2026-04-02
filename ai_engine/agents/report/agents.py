import os
import re
import subprocess
import asyncio
import gc
import time

from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
from .domain_templates import detect_domain, get_template
from .latex_sanitizer import sanitize_llm_latex, sanitize_latex, check_balance
from utils.event_emitter import emit_agent_start, emit_agent_complete, emit_report_chunk


class ScientificWritingAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ScientificWriting",
            system_prompt="""Your Role: Senior NLP Research Scientist (Writer Agent)

ABSOLUTE RULE: EDIT ONLY — DO NOT REDESIGN

Your Task:
Write a rigorous, publication-ready research report based on verified findings.

Allowed Sources (from prompt.json):
- ArXiv
- IEEE
- ACM
- Peer-reviewed journals

FORBIDDEN Sources:
- Blogs
- Unverified websites
- Anonymous sources

Citation Policy (MANDATORY):
1. ALL claims MUST be cited with source
2. Provide BibTeX-ready entries for each citation
3. Mark speculative content with [SPECULATIVE] label
4. Mark assumptions with [ASSUMPTION] label

Output Requirements:
- Comprehensive Markdown report
- Structured sections matching domain template
- BibTeX entries at the end
- NO hallucinated claims
- NO best-practice redesign suggestions

Quality Standards:
- Academic rigor
- Dense, professional language
- No filler or fluff content

Visual Integration (IMPORTANT):
1. You will receive 'approved_images' — a list of images scored >= 7/10 for academic suitability.
2. Each image has: url, caption, placement (which section), alt_text, score.
3. Place each approved image in the EXACT section indicated by its 'placement' field.
4. Use the format: ![{alt_text}]({url})
   *Figure N: {caption}*
5. Number figures sequentially: Figure 1, Figure 2, ...
6. If 'approved_images' is empty, write '[No figures available]' in the Results section.

Data Tables:
- If findings contain structured data (lists of dicts with consistent keys), render them as Markdown tables.
- Table format: | Column | Column | with proper alignment.

AI Brain Research Plan:
- If 'research_plan' is provided (from CentralBrain), follow its 'priority_sections' and 'key_hypotheses'.
- Emphasize sections listed in 'priority_sections'.
""",
            **kwargs
        )

    def _build_image_context(self, findings: dict) -> str:
        """Extract approved images from ImageIntelligenceAgent findings."""
        img_data = findings.get("image_intelligence", {})
        if isinstance(img_data, dict):
            resp = img_data.get("response", img_data)
            approved = resp.get("approved_images", []) if isinstance(resp, dict) else []
        else:
            approved = []

        if not approved:
            return ""

        lines = ["\n== APPROVED FIGURES (embed in appropriate sections) =="]
        for i, img in enumerate(approved, 1):
            lines.append(
                f"Figure {i}: url={img.get('url','')} | "
                f"placement={img.get('placement','results')} | "
                f"caption={img.get('caption','')} | "
                f"alt_text={img.get('alt_text','Figure')} | "
                f"score={img.get('score',0)}/10"
            )
        return "\n".join(lines)

    def _build_brain_context(self, state: dict) -> str:
        """Extract cumulative brain guidance from state."""
        return self._get_brain_guidance(state)

    async def arun(self, state: dict) -> dict:
        """
        Native async implementation for streaming report generation.
        """
        print(f"[{self.name}] Writing Rigorous Research Report (Streaming)...")
        findings = state.get("findings", {})
        task = state.get("task", "Research Topic")
        job_id = state.get("_job_id", "?")
        research_id = int(job_id) if str(job_id).isdigit() else None
        
        start_time = time.time()
        emit_agent_start(self.name, research_id=research_id)
        gc.collect()

        # Build context (same logic as sync run)
        context_parts = [f"RESEARCH TOPIC: {task}\n"]
        for key, value in findings.items():
            if key.startswith("_"): continue
            if key in ("image_intelligence", "central_brain", "vision_analysis"): continue
            if isinstance(value, dict):
                resp = value.get("response", value)
                if isinstance(resp, dict):
                    if "raw_text" in resp: context_parts.append(f"[{key.upper()}]: {resp['raw_text'][:3000]}")
                    elif "markdown_report" in resp: context_parts.append(f"[{key.upper()}]: {resp['markdown_report'][:3000]}")
                    else:
                        text_parts = [f"{k}: {str(v)[:500]}" for k, v in resp.items() if not k.startswith("_") and isinstance(v, (str, list))]
                        if text_parts: context_parts.append(f"[{key.upper()}]:\n" + "\n".join(text_parts))
            elif isinstance(value, str): context_parts.append(f"[{key.upper()}]: {value[:3000]}")

        image_ctx = self._build_image_context(findings)
        if image_ctx: context_parts.append(image_ctx)
        brain_ctx = self._build_brain_context(state)
        if brain_ctx: context_parts.append(brain_ctx)

        domain = detect_domain(task, findings)
        template = get_template(domain)
        sections = template.get("sections", [])
        section_prompts = template.get("section_prompts", {})

        structure_instruction = "Follow this EXACT report structure:\n"
        for section in sections:
            prompt = section_prompts.get(section, "")
            structure_instruction += f"## {section.replace('_', ' ').title()}\n- Guideline: {prompt}\n"

        full_context = "\n\n".join(context_parts)
        context_human = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=self.system_prompt + (f"\n\nDIRECTIVES:{brain_ctx}" if brain_ctx else "")),
            HumanMessage(content=(f"Research Data:\n{structure_instruction}\n\nWrite Report:\n{context_human}\n\nData:\n{full_context[:10000]}"))
        ]

        full_response = ""
        try:
            # TRUE LIVE STREAMING
            async for chunk in self.llm.astream(messages):
                content = chunk.content
                if content:
                    full_response += content
                    emit_report_chunk(content, research_id=research_id)
            
            gc.collect()
            elapsed = time.time() - start_time
            emit_agent_complete(self.name, int(elapsed * 1000), success=True, research_id=research_id)
            
            return {
                "response": {"markdown_report": full_response},
                "raw": full_response,
                "agent": self.name
            }
        except Exception as e:
            logger.error(f"[{self.name}] Async streaming failed: {e}")
            return {"error": str(e)}

    def run(self, state: dict) -> dict:
        # Fallback for sync contexts
        return asyncio.run(self.arun(state))

class LaTeXGenerationAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="LaTeXGeneration",
            system_prompt=r"""You are an expert IEEE research paper LaTeX writer and editor. Follow these rules STRICTLY with ZERO exceptions.

=== MANDATORY RULES ===
1. Use ONLY \documentclass[conference]{IEEEtran} — no other document class is ever acceptable.
2. Output ONLY raw LaTeX code. NO markdown, NO backticks (```), NO explanations before or after the code.
3. Your output MUST start with \documentclass and end with \end{document}. Nothing else.
4. Every \begin{ENV} MUST have a matching \end{ENV}. Never leave any environment unclosed.
5. All citations MUST use \cite{key} where 'key' exactly matches a \bibitem{key} in the bibliography.
6. NEVER invent or hallucinate references. Only cite sources explicitly given to you.
7. Use \includegraphics{placeholder_fig1} for figures when no actual image file is provided.
8. If a Markdown image ![Caption](URL) is provided, convert it to:
   \begin{figure}[h]
   \centering
   \includegraphics[width=0.8\linewidth]{URL}
   \caption{Caption}
   \end{figure}
9. Use \section{}, \subsection{} — NEVER \chapter{}.
10. Escape ALL special characters: & → \&  |  % → \%  |  # → \#  |  _ → \_  (outside math mode)
11. Use \textbf{} for bold, \textit{} for italic, \texttt{} for code — NEVER ** or * markdown.

=== REQUIRED PREAMBLE ===
\documentclass[conference]{IEEEtran}
\IEEEoverridecommandlockouts
\usepackage{cite}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage{algorithmic}
\usepackage{graphicx}
\usepackage{textcomp}
\usepackage{xcolor}

=== SECTION ORDER (mandatory) ===
Abstract → Introduction → Related Work → Methodology → Results → Discussion → Conclusion → References

=== DIFF/PATCH MODE (when editing existing LaTeX) ===
- ONLY modify the specific section instructed. All other sections stay word-for-word identical.
- Return the FULL updated LaTeX document from \documentclass to \end{document}.

Your output is piped directly into: pdflatex -interaction=nonstopmode paper.tex
Any non-LaTeX content in your output will cause a compile failure and break the pipeline.
""",
            **kwargs
        )

    def run(self, state: dict) -> dict:
        # Imports at module top

        print(f"[{self.name}] Managing LaTeX Artifacts...")
        findings = state.get("findings", {})
        task = state.get("task", "Research Report")
        job_id = state.get("_job_id", "unknown")
        research_id = int(job_id) if str(job_id).isdigit() else None
        
        # RAM Management: Clear before complex LaTeX/PDF processing
        gc.collect()
        # Check for existing LaTeX in findings or state
        existing_latex = state.get("latex_source", "") or findings.get("latex_generation", {}).get("latex_source", "")
        
        markdown_content = ""
        if "scientific_writing" in findings:
            sw = findings["scientific_writing"]
            if isinstance(sw, dict):
                markdown_content = sw.get("markdown_report", sw.get("raw_text", ""))
        
        # Determine Mode
        mode = "FULL_GEN" if not existing_latex or len(existing_latex) < 50 else "PATCH"
        print(f"[{self.name}] Mode: {mode}")

        # Detect Domain for Template
        domain = detect_domain(task, findings)
        template = get_template(domain)
        preamble = template.get("latex_preamble", "")
        print(f"[{self.name}] Detected Domain: {domain}. Using Preamble: {bool(preamble)}")

        if mode == "FULL_GEN":
            if not markdown_content:
                # Fallback content generation if markdown missing
                print(f"[{self.name}] No markdown report, creating basic structure...")
                markdown_content = f"# {task}\n\n## Abstract\n(No content provided)\n"

            instruction = f"Generate FULL LaTeX for this Markdown.\n"
            if preamble:
                instruction += f"IMPORTANT: You MUST start the document with the following specific Preamble/Class configuration exactly:\n\n```latex\n{preamble}\n```\n\n"
            
            instruction += f"Markdown Content:\n\n{markdown_content[:20000]}"

            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=instruction)
            ]
        else:
            # Patch Mode (hypothetically triggered by updates, here we usually just get new markdown)
            # If we received new markdown, we might effectively be doing a full regen unless we are clever.
            # But the user Requirement says "Editor is the only LaTeX writer" and "Diff-based only".
            # For the purpose of this pipeline, if we have a full new markdown report, we essentially treat it as a new draft.
            # BUT if we are in a targeted update loop, we would patch.
            # I will implement the logic: If we have existing latex AND specific instructions to update, we patch.
            # If we just have a new markdown report from the writer, we probably treat it as a fresh gen or a "Full Rewrite" which is allowed if approved.
            # Since this is an automated pipeline, "Writer" -> "Editor" usually implies full draft.
            # I will stick to Full Gen for the main pipeline flow, but enable Patch logic if `update_instruction` is present.
            
            update_instruction = state.get("update_instruction", "")
            if update_instruction:
                 mode = "PATCH"
                 messages = [
                    SystemMessage(content=self.system_prompt + "\n\nROLE: LaTeX Patch Engineer\nTASK: Apply Patch"),
                    HumanMessage(content=f"Existing LaTeX:\n{existing_latex[:10000]}...\n\nInstruction: {update_instruction}")
                ]
            else:
                 # Default to re-gen if it's the main pipeline flow delivering a new report
                 mode = "FULL_GEN (Overwrite)"
                 messages = [
                    SystemMessage(content=self.system_prompt),
                    HumanMessage(content=f"Generate FULL LaTeX for this Markdown:\n\n{markdown_content[:20000]}")
                ]

        try:
            response = self.llm.invoke(messages)
            result_content = response.content

            # ── Post-processing pipeline (Fix 2) ─────────────────────────
            # Step 1: Strip fences, fix escaping, anchor to \documentclass
            final_latex = sanitize_llm_latex(result_content)

            # Step 2: Deep sanitization (unicode, math envs, special chars, balance)
            final_latex = sanitize_latex(final_latex)

            # Step 3: Balance check — warn but don't block
            balanced, balance_msg = check_balance(final_latex)
            print(f"[{self.name}] {balance_msg}")

            # ── Save .tex file ────────────────────────────────────────────
            output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "output"))
            os.makedirs(output_dir, exist_ok=True)
            tex_filename = f"research_{job_id}.tex"
            tex_path = os.path.join(output_dir, tex_filename)

            with open(tex_path, "w", encoding="utf-8") as f:
                f.write(final_latex)

            # ── Compile PDF (Fix 4): pdflatex × 2, bibtex, pdflatex × 1 ─
            pdf_path = None
            compile_log = ""
            try:
                def _run_pdflatex():
                    return subprocess.run(
                        ["pdflatex", "-interaction=nonstopmode", "-output-directory", output_dir, tex_path],
                        capture_output=True, text=True, timeout=90, cwd=output_dir
                    )

                r1 = _run_pdflatex()
                compile_log = r1.stdout[-3000:] if r1.stdout else ""

                # Run bibtex for bibliography resolution
                base_name = tex_filename.replace(".tex", "")
                subprocess.run(
                    ["bibtex", base_name],
                    capture_output=True, text=True, timeout=30, cwd=output_dir
                )

                # Second and third pdflatex pass for cross-references
                _run_pdflatex()
                r3 = _run_pdflatex()
                compile_log += r3.stdout[-1000:] if r3.stdout else ""

                pdf_filename = f"research_{job_id}.pdf"
                if os.path.exists(os.path.join(output_dir, pdf_filename)):
                    pdf_path = os.path.join(output_dir, pdf_filename)
                    print(f"[{self.name}] PDF compiled successfully: {pdf_filename}")
                else:
                    print(f"[{self.name}] pdflatex ran but PDF not found — check compile log")
            except FileNotFoundError:
                print(f"[{self.name}] pdflatex not found — skipping compilation")
            except Exception as compile_err:
                print(f"[{self.name}] Compilation error: {compile_err}")

            return {
                "response": {
                    "latex_source": final_latex,
                    "tex_path": tex_path,
                    "pdf_path": pdf_path,
                    "mode": mode,
                    "balance_ok": balanced,
                    "balance_msg": balance_msg,
                },
                "raw": result_content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

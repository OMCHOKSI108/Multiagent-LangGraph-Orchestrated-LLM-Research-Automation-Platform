from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
from utils.embeddings import ToneAnalyzer

class InteractivePaperChatbotAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="InteractivePaperChatbot",
            system_prompt="""You are a Research Paper Assistant with RAG (Retrieval-Augmented Generation) capabilities.
You have access to the COMPLETE research document, literature sources, and data gathered by the multi-agent research pipeline.

YOUR CAPABILITIES:
1. Answer questions about ANY section of the research paper
2. Cite specific sources with [Source N] references when available
3. Explain methodology, findings, gaps, and conclusions
4. Compare findings across different sources in the literature
5. Suggest further research directions based on identified gaps

RESPONSE FORMAT RULES:
- When referencing a specific section, use **bold section names** like **Literature Review** or **Gap Analysis**
- When citing a paper, use the format: [Author, Year](url) or [Source N] with the reference number
- When quoting from the report, use > blockquote formatting
- Structure longer answers with clear headings using ## or ###
- For numerical data or comparisons, use markdown tables
- If the user asks about something NOT in the research, clearly state what IS covered

REFERENCE HIGHLIGHTING:
- Always include source citations when answering factual questions
- Use inline references like [[1]](url), [[2]](url) linking to the actual paper URLs
- At the end of detailed answers, include a "References" section listing cited sources""",
            **kwargs
        )

    def _build_context(self, findings: dict) -> str:
        """Build structured RAG context from findings."""
        sections = []
        
        # Handle nested structure
        if "final_state" in findings and "findings" in findings["final_state"]:
            findings = findings["final_state"]["findings"]

        # Full report
        msr = findings.get("multi_stage_report", {})
        report = msr.get("markdown_report") or msr.get("response") or ""
        if not report:
            sw = findings.get("scientific_writing", {})
            report = sw.get("markdown_report") or sw.get("response") or ""
        if report:
            sections.append(f"=== FULL REPORT ===\n{report[:12000]}")

        # Literature
        lit = findings.get("literature_review", {})
        lit_resp = lit.get("response") if isinstance(lit, dict) else None
        if lit_resp and isinstance(lit_resp, dict) and "papers" in lit_resp:
            papers = []
            for i, p in enumerate(lit_resp["papers"][:15], 1):
                papers.append(
                    f"[{i}] {p.get('title', 'Untitled')} — {p.get('authors', 'Unknown')} "
                    f"({p.get('published', 'N/A')})\n    URL: {p.get('url', 'N/A')}\n    "
                    f"Summary: {(p.get('abstract') or p.get('summary', ''))[:200]}"
                )
            sections.append(f"=== LITERATURE ({len(lit_resp['papers'])} papers) ===\n" + "\n".join(papers))
        elif lit_resp and isinstance(lit_resp, str):
            sections.append(f"=== LITERATURE REVIEW ===\n{lit_resp[:3000]}")

        # Gap / novelty
        for key in ["gap_synthesis", "innovation_novelty", "scoring"]:
            data = findings.get(key, {})
            resp = data.get("response") if isinstance(data, dict) else None
            if resp:
                text = resp if isinstance(resp, str) else str(resp)[:2000]
                sections.append(f"=== {key.replace('_',' ').upper()} ===\n{text[:2000]}")

        if not sections:
            sections.append(f"=== RAW FINDINGS ===\n{str(findings)[:8000]}")

        return "\n\n".join(sections)

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Answering User Query with RAG context...")
        
        query = state.get("task", "")
        findings = state.get("findings", {})
        context = self._build_context(findings)
        
        enhanced_prompt = f"{self.system_prompt}\n\n{context}"
        
        messages = [
            SystemMessage(content=enhanced_prompt),
            HumanMessage(content=query)
        ]
        
        try:
            response = self.llm.invoke(messages)
            return {
                "response": response.content,
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

class ReviewerStyleCritiqueAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ReviewerStyleCritique",
            system_prompt="""You are a Critical Reviewer (NeurIPS/ICLR style). 
            Write a formal review based on the analysis.
            Output JSON with keys: 'review_text', 'decision', 'weaknesses', 'strengths'.
            """,
            **kwargs
        )
        self.tone_analyzer = ToneAnalyzer()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Analyzing Writing Tone (HF Model)...")
        # Check writing from state if available, else findings
        findings = state.get("findings", {})
        text_to_check = ""
        if "scientific_writing" in findings:
            text_to_check = findings["scientific_writing"].get("markdown_report", "")
        # fallback to summary
        if not text_to_check:
             text_to_check = str(findings)

        tone = self.tone_analyzer.analyze_tone(text_to_check)
        print(f"[{self.name}] Tone Score: {tone['label']} ({tone['score']:.4f})")

        enhanced_prompt = f"{self.system_prompt}\n\nAUTOMATED TONE CHECK (HF DistilBERT):\nLabel: {tone['label']}\nConfidence: {tone['score']:.2f}"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            return {
                "response": self._extract_json(response.content),
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

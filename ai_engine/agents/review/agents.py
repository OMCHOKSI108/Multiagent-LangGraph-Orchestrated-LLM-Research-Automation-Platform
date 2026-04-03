from ..base import BaseAgent
from ai_engine.utils.providers import ArxivProvider, WebSearchProvider, GoogleSearchProvider, OpenAlexProvider, PubMedProvider
from langchain_core.messages import SystemMessage, HumanMessage
from typing import Dict, Any

class SystematicLiteratureReviewAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="SystematicLiteratureReview",
            system_prompt="""You are an expert in Systematic Literature Reviews (PRISMA guidelines).
            Given a set of papers or a topic, synthesize the methodologies and findings.
            Output JSON with keys: 'methodologies_matrix', 'findings_summary', 'statistical_trends'.
            """,
            **kwargs
        )
        self.arxiv_provider = ArxivProvider()
        self.ddg_provider = WebSearchProvider()
        self.google_provider = GoogleSearchProvider()
        self.openalex_provider = OpenAlexProvider()
        self.pubmed_provider = PubMedProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Running SLR with Multi-Source Data...")
        task = state.get("selected_topic") or state.get("task", "")
        
        # 1. Search Multi-Source
        arxiv_papers = self.arxiv_provider.search_papers(task, max_results=15)
        openalex_results = self.openalex_provider.search(task, max_results=15)
        pubmed_results = self.pubmed_provider.search(task, max_results=10)
        ddg_results = self.ddg_provider.search(f"systematic review survey {task}", max_results=10)
        google_results = self.google_provider.search(f"state of the art survey {task}", max_results=8)
        
        # Aggregate ALL Sources
        context_str = "Selected Research Papers (Multi-Source):\n"
        if arxiv_papers:
            context_str += "\n--- Source: Arxiv (CS/Math) ---\n"
            for p in arxiv_papers:
                context_str += f"- {p.get('title', 'Untitled')} ({p.get('published', 'N/A')})\n"
        if openalex_results:
            context_str += "\n--- Source: OpenAlex (Global Science) ---\n"
            for r in openalex_results:
                context_str += f"- {r.get('title', 'Untitled')} ({r.get('published', 'N/A')}): {r.get('summary', '')[:200]}\n"
        if pubmed_results:
            context_str += "\n--- Source: PubMed (Bio/Med) ---\n"
            for r in pubmed_results:
                context_str += f"- {r.get('title', 'Untitled')} ({r.get('published', 'N/A')}): {r.get('summary', '')[:200]}\n"
        context_str += "\n--- Source: Web/Surveys ---\n"
        for r in ddg_results + google_results:
            context_str += f"- {r.get('title', 'Untitled')}: {r.get('body', '')[:200]}\n"
            
        # Add Brain Guidance
        brain_guidance = self._get_brain_guidance(state)

        enhanced_prompt = f"{self.system_prompt}\n\n[GENUINE REAL-TIME DATASET]\n{context_str}"
        if brain_guidance:
            enhanced_prompt += f"\n\n[DIRECTIVES FROM CENTRAL BRAIN]{brain_guidance}\n"
        
        context = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=context)
        ]
        
        try:
            response = self.llm.invoke(messages)
            raw_content = response.content
            parsed_json = self._extract_json(raw_content)

            if isinstance(parsed_json, dict):
                parsed_json.setdefault("title", f"Systematic Literature Review: {task}")
                parsed_json.setdefault("topic", task)
                parsed_json["paper_list"] = {
                    "arxiv": arxiv_papers,
                    "openalex": openalex_results,
                    "pubmed": pubmed_results,
                    "web": ddg_results + google_results,
                }
                parsed_json.setdefault(
                    "source_count",
                    len(arxiv_papers) + len(openalex_results) + len(pubmed_results) + len(ddg_results) + len(google_results),
                )

            return {
                "response": parsed_json,
                "raw": raw_content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {
                "response": {
                    "title": f"Systematic Literature Review: {task}",
                    "topic": task,
                    "methodologies_matrix": [],
                    "findings_summary": "SLR generation failed; downstream stages should treat this as partial evidence.",
                    "statistical_trends": {},
                    "fallback": True,
                    "error": str(e),
                },
                "raw": "Error during execution",
                "agent": self.name
            }

class SurveyMetaAnalysisAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="SurveyMetaAnalysis",
            system_prompt="""You are a Meta-Analysis expert. 
            Aggregate quantitative data from findings to produce a high-level survey.
            Output JSON with keys: 'meta_analysis_text', 'aggregated_stats'.
            """,
            **kwargs
        )

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        print(f"[{self.name}] Conducting Meta-Analysis...")
        findings = state.get("findings", {})
        
        slr_data = ""
        if "slr" in findings:
             slr_data = str(findings["slr"])
        
        # Add Brain Guidance
        brain_guidance = self._get_brain_guidance(state)

        enhanced_prompt = f"{self.system_prompt}\n\n[LITERATURE DATA]\n{slr_data[:15000]}"
        if brain_guidance:
            enhanced_prompt += f"\n\n[DIRECTIVES FROM CENTRAL BRAIN]{brain_guidance}\n"
        
        context = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=context)
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

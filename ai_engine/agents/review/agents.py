from ..base import BaseAgent
from utils.providers import ArxivProvider, WebSearchProvider, GoogleSearchProvider, OpenAlexProvider, PubMedProvider
from langchain_core.messages import SystemMessage, HumanMessage

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
        # Using lazy initialization logic in constructor but imports are now top-level
        self.arxiv_provider = ArxivProvider()
        self.ddg_provider = WebSearchProvider()
        self.google_provider = GoogleSearchProvider()
        self.openalex_provider = OpenAlexProvider()
        self.pubmed_provider = PubMedProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Running SLR with Multi-Source Data...")
        task = state.get("task", "")
        
        # 1. Search Arxiv (Scientific/Technical - CS/Math Focus)
        arxiv_papers = self.arxiv_provider.search_papers(task, max_results=8)
        
        # 2. Search OpenAlex (General Science/Humanities/Global)
        openalex_results = self.openalex_provider.search(task, max_results=8)
        
        # 3. Search PubMed (Biomedical/Life Sciences) - Useful if topic is bio-related
        pubmed_results = self.pubmed_provider.search(task, max_results=5)
        
        # 4. Search Web/Google (Surveys/Grey Literature)
        ddg_results = self.ddg_provider.search(f"systematic review survey {task}", max_results=5)
        google_results = self.google_provider.search(f"state of the art survey {task}", max_results=4)
        
        # Aggregate ALL Sources
        context_str = "Selected Research Papers (Multi-Source):\n"
        
        # Arxiv
        if arxiv_papers:
            context_str += "\n--- Source: Arxiv (CS/Math) ---\n"
            for p in arxiv_papers:
                context_str += f"- {p['title']} ({p['published']})\n"

        # OpenAlex
        if openalex_results:
            context_str += "\n--- Source: OpenAlex (Global Science) ---\n"
            for r in openalex_results:
                context_str += f"- {r['title']} ({r['published']}): {r['summary']}\n"
                
        # PubMed
        if pubmed_results:
            context_str += "\n--- Source: PubMed (Bio/Med) ---\n"
            for r in pubmed_results:
                context_str += f"- {r['title']} ({r['published']}): {r['summary']}\n"

        # Web
        context_str += "\n--- Source: Web/Surveys ---\n"
        for r in ddg_results + google_results:
            context_str += f"- {r['title']}: {r.get('body', '')}\n"
            
        enhanced_prompt = f"{self.system_prompt}\n\ngennuine REAL-TIME DATASET (30+ Sources Scanned):\n{context_str}"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            raw_content = response.content
            parsed_json = self._extract_json(raw_content)
            
            if isinstance(parsed_json, dict):
                parsed_json["_meta_sources"] = {"arxiv": arxiv_papers, "web": ddg_results + google_results}
                
            return {
                "response": parsed_json,
                "raw": raw_content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e), "raw": "Error during execution"}

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

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Conducting Meta-Analysis...")
        findings = state.get("findings", {})
        
        # Aggregate SLR data
        slr_data = ""
        if "slr" in findings:
            # SLR might be large, we might need to summarize if too big
             slr_data = str(findings["slr"])
        
        enhanced_prompt = f"{self.system_prompt}\n\nLITERATURE DATA:\n{slr_data[:15000]}"
        
        from langchain_core.messages import SystemMessage, HumanMessage
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

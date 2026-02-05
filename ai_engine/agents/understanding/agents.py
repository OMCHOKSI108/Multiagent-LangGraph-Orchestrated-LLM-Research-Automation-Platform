from ..base import BaseAgent
from utils.providers import PDFReaderProvider
from langchain_core.messages import SystemMessage, HumanMessage

class PaperDecompositionAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="PaperDecomposition",
            system_prompt="""You are an expert Structural Reader. 
            Decompose the paper into sections (Abstract, Intro, Methods, Results, Discussion).
            Output JSON with keys: 'sections', 'core_claims_by_section', 'technical_depth_score'.
            """,
            **kwargs
        )
        self.pdf_provider = PDFReaderProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Decomposing Paper Structure...")
        paper_url = state.get("paper_url")
        
        full_text = ""
        if paper_url:
            # Handle Arxiv abs -> pdf conversion
            if "arxiv.org/abs/" in paper_url:
                paper_url = paper_url.replace("abs", "pdf")
                if not paper_url.endswith(".pdf"): paper_url += ".pdf"
                
            full_text = self.pdf_provider.read_pdf(paper_url)
            
        if not full_text:
            full_text = "No content available. Please provide a valid PDF URL."

        truncated_text = full_text[:10000] # Header/Intro usually enough for decomposition
        
        enhanced_prompt = f"{self.system_prompt}\n\nPAPER START (Structural Analysis):\n{truncated_text}"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            raw_content = response.content
            parsed_json = self._extract_json(raw_content)
            
            return {
                "response": parsed_json,
                "raw": raw_content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e), "raw": "Error during execution"}

class PaperUnderstandingAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="PaperUnderstanding",
            system_prompt="""You are a Technical Researcher. 
            Summarize the core contribution and methodology of the decomposed paper.
            Output JSON with keys: 'contribution_summary', 'methodology_class', 'key_algorithms'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Analyzing Paper Content...")
        findings = state.get("findings", {})
        
        # Get structure from decomposition
        structure = ""
        if "paper_decomposition" in findings:
            structure = str(findings["paper_decomposition"])
            
        enhanced_prompt = f"{self.system_prompt}\n\nPAPER STRUCTURE CONTEXT:\n{structure[:10000]}"
        
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

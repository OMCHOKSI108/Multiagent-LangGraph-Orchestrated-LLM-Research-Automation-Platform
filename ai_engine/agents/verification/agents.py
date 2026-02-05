from ..base import BaseAgent
from utils.providers import ArxivProvider, GoogleSearchProvider
from langchain_core.messages import SystemMessage, HumanMessage

class TechnicalVerificationAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="TechnicalVerification",
            system_prompt="""You are a Peer Reviewer. 
            Verify the mathematical and logical soundness of the claims.
            Output JSON with keys: 'soundness_score', 'logical_flaws', 'math_check'.
            """,
            **kwargs
        )
        self.arxiv_provider = ArxivProvider()
        self.google_provider = GoogleSearchProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Verifying Claims...")
        # We need to verify the *extracted* understanding
        findings = state.get("findings", {})
        claims = []
        if "paper_understanding" in findings:
            # Assume understanding has some summary or claims
            understanding = findings["paper_understanding"]
            if isinstance(understanding, dict):
                claims.append(understanding.get("contribution_summary", ""))
        
        claims_text = " ".join(claims)[:200]
        
        # Search for contradictions or support
        results = self.google_provider.search(f"critique {claims_text}", max_results=2)
        
        context = "\nExternal Validation:\n"
        for r in results:
            context += f"- {r['title']}: {r.get('body', '')}\n"

        enhanced_prompt = f"{self.system_prompt}\n\nVERIFICATION CONTEXT:\n{context}"
        
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

class DataSourceValidationAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="DataSourceValidation",
            system_prompt="""You are a Data Auditor. 
            Check the citation quality and dataset availability mentioned in the paper.
            Output JSON with keys: 'dataset_availability', 'citation_quality_score', 'references_check'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Auditing Data & Citations...")
        findings = state.get("findings", {})
        
        context = ""
        if "paper_understanding" in findings:
            context = str(findings["paper_understanding"])
            
        enhanced_prompt = f"{self.system_prompt}\n\nPAPER CONTEXT:\n{context}"
        
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

class ReproducibilityReasoningAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ReproducibilityReasoning",
            system_prompt="""You are a Reproducibility Engineer. 
            Assess if the paper provides enough detail to be reproduced.
            Output JSON with keys: 'reproducibility_score', 'missing_details', 'code_availability'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Checking Reproducibility...")
        findings = state.get("findings", {})
        
        context = ""
        if "paper_decomposition" in findings:
            context += f"\nDecomposition: {findings['paper_decomposition']}"
        if "paper_understanding" in findings:
            context += f"\nUnderstanding: {findings['paper_understanding']}"
            
        enhanced_prompt = f"{self.system_prompt}\n\nPAPER DETAILS:\n{context[:10000]}"
        
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

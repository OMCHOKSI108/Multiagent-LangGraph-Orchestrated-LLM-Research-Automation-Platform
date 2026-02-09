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
            Verify if datasets mentioned are publically available via web search.
            Output JSON with keys: 'dataset_availability', 'citation_quality_score', 'references_check', 'public_datasets_found'.
            """,
            **kwargs
        )
        self.google_provider = GoogleSearchProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Auditing Data & Citations...")
        findings = state.get("findings", {})
        
        context = ""
        if "paper_understanding" in findings:
            context = str(findings["paper_understanding"])
            
        # 1. Ask LLM to extract dataset names first
        extract_prompt = f"Extract distinct dataset names used in this paper from the context. Return JSON list strings under key 'datasets'. Context: {context[:5000]}"
        
        validated_datasets = []
        try:
            extraction = self.llm.invoke([HumanMessage(content=extract_prompt)])
            extracted_json = self._extract_json(extraction.content)
            datasets = extracted_json.get("datasets", []) if isinstance(extracted_json, dict) else []
            
            # 2. Verify each dataset
            for ds in datasets:
                print(f"[{self.name}] Verifying dataset: {ds}")
                results = self.google_provider.search(f"{ds} dataset download", max_results=2)
                is_available = any("github" in r['link'] or "kaggle" in r['link'] or "huggingface" in r['link'] or "edu" in r['link'] for r in results)
                validated_datasets.append({
                    "name": ds,
                    "available": is_available,
                    "links": [r['link'] for r in results[:1]]
                })
        except Exception as ex:
            print(f"[{self.name}] Extraction Warning: {ex}")
        
        enhanced_prompt = f"{self.system_prompt}\n\nPAPER CONTEXT:\n{context[:10000]}\n\nDATASET VERIFICATION:\n{validated_datasets}"
        
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
            Look for code availability signs (GitHub links, pseudo-code).
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
            
        # Heuristic check for code
        lower_context = context.lower()
        has_github = "github.com" in lower_context or "gitlab" in lower_context
        has_pseudocode = "algorithm" in lower_context and "input" in lower_context and "output" in lower_context
        
        augmented_info = f"\nCODE CHECK:\n- Github Link Found: {has_github}\n- Pseudo-code Indicators: {has_pseudocode}"
            
        enhanced_prompt = f"{self.system_prompt}\n\nPAPER DETAILS:\n{context[:10000]}{augmented_info}"
        
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

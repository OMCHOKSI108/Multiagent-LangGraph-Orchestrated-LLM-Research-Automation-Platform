from ..base import BaseAgent
from utils.providers import GoogleSearchProvider
from utils.embeddings import SimilarityProvider
from langchain_core.messages import SystemMessage, HumanMessage

class InnovationNoveltyAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="InnovationNovelty",
            system_prompt="""You are an Innovation Expert (TRIZ methodology). 
            Generate novel approaches to solve the identified research questions.
            Output JSON with keys: 'novel_contribution', 'differentiation_from_sota', 'expected_impact'.
            """,
            **kwargs
        )
        self.google_provider = GoogleSearchProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Checking Novelty against Web...")
        # Get the proposed framework or RQ from state
        findings = state.get("findings", {})
        proposal = ""
        if "research_question" in findings:
            proposal = findings["research_question"].get("primary_research_question", "")
        elif "conceptual_framework" in findings:
            proposal = findings["conceptual_framework"].get("framework_description", "")
        else:
            proposal = state.get("task", "")

        # Search to see if this exists
        results = self.google_provider.search(f"{proposal}", max_results=3)
        
        context_str = "Existing Similar Work:\n"
        if not results:
            context_str += "No direct matches found (Potential High Novelty)."
        else:
            for r in results:
                context_str += f"- {r['title']}: {r.get('body', '')[:200]}\n"

        enhanced_prompt = f"{self.system_prompt}\n\nNOVELTY CHECK:\n{context_str}"
        
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

class BaselineReproductionAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="BaselineReproduction",
            system_prompt="""You are a Benchmarking Engineer. 
            Identify baseline models/methods that must be reproduced to validate the new approach.
            Find existing implementations (GitHub, PapersWithCode) to ensure reproducibility.
            Output JSON with keys: 'baselines_to_run', 'existing_implementations', 'datasets', 'metrics'.
            """,
            **kwargs
        )
        self.google_provider = GoogleSearchProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Designing Baselines & Finding Code...")
        findings = state.get("findings", {})
        
        # We need the innovation proposal to know what to compare against
        proposal = ""
        if "innovation_novelty" in findings:
            proposal_json = findings["innovation_novelty"]
            if isinstance(proposal_json, dict):
                proposal = proposal_json.get("novel_contribution", "")
        
        if not proposal and "slr" in findings:
             proposal = str(findings["slr"])[:500] # Fallback
             
        # 1. Search for existing implementations of related work
        search_query = f"github implementation {proposal} benchmark"
        results = self.google_provider.search(search_query, max_results=4)
        
        implementations_found = []
        for r in results:
            if "github.com" in r['link'] or "paperswithcode.com" in r['link']:
                implementations_found.append({"title": r['title'], "link": r['link']})
                
        enhanced_prompt = f"{self.system_prompt}\n\nPROPOSED APPROACH:\n{proposal}\n\nFOUND IMPLEMENTATIONS:\n{implementations_found}"
        
        msg_content = str(state)
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=msg_content)
        ]
        
        try:
            response = self.llm.invoke(messages)
            json_res = self._extract_json(response.content)
            
            if isinstance(json_res, dict):
                # Augment with real links
                json_res["_meta_code_links"] = implementations_found
                
            return {
                "response": json_res,
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

class ValidationRobustnessAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ValidationRobustness",
            system_prompt="""You are a Quality Assurance Researcher. 
            Design stress tests and ablation studies to prove robustness.
            Output JSON with keys: 'validation_experiments', 'ablation_plan', 'robustness_checks'.
            """,
            **kwargs
        )
        self.sim_provider = SimilarityProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Checking Semantic Stability (HuggingFace)...")
        # Check alignment between task and findings
        findings = state.get("findings", {})
        task = state.get("task", "")
        similarity_score = 0.0
        
        # We try to compare the task to the generated research question
        # This checks "Drift" - did we drift away from the user's task?
        current_focus = ""
        if "research_question" in findings:
            current_focus = findings["research_question"].get("primary_research_question", "")
        
        if current_focus:
             similarity_score = self.sim_provider.calculate_similarity(task, current_focus)
             print(f"[{self.name}] Drift Check Score: {similarity_score:.4f}")

        enhanced_prompt = f"{self.system_prompt}\n\nSEMANTIC DRIFT SCORE (HF Model): {similarity_score:.2f} (1.0 = Perfect Alignment)"
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            json_res = self._extract_json(response.content)
            if isinstance(json_res, dict):
                json_res["_meta_semantic_drift"] = similarity_score
                
            return {
                "response": json_res,
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

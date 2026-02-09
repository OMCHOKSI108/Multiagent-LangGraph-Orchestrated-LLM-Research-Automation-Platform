from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

class ReviewerAdversarialCritiqueAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ReviewerAdversarialCritique",
            system_prompt="""You are 'Reviewer 2'. 
            Find every possible flaw, weakness, and overclaim in the research.
            Output JSON with keys: 'critical_flaws', 'rejection_reasons'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Critiquing Research...")
        findings = state.get("findings", {})
        
        context = ""
        # Critique mainly the report or the proposal
        if "scientific_writing" in findings:
             context = findings["scientific_writing"].get("markdown_report", "")[:15000]
        elif "research_question" in findings:
             context = str(findings["research_question"])
             
        enhanced_prompt = f"{self.system_prompt}\n\nMATERIAL TO CRITIQUE:\n{context}"
        
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

class HallucinationDetectionAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="HallucinationDetection",
            system_prompt="""Your Role: Hallucination Prevention Guard
            
            Short basic instruction:
            Block unsupported content.
            
            What you should do:
            - Verify every factual claim.
            - Flag uncertain statements.
            
            Your Goal:
            Zero hallucinated facts.
            
            Result:
            - Approved content
            - Rejected content with reasons
            
            Constraint:
            - "I don't know" is acceptable.
            
            Output JSON with keys:
            'status': "APPROVED" or "REJECTED",
            'hallucinations': ["Claim 1", "Claim 2"],
            'verified_claims': ["Claim A", "Claim B"],
            'confidence_score': 0.0-1.0
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Checking for Hallucinations...")
        findings = state.get("findings", {})
        
        report = ""
        sources = ""
        
        if "scientific_writing" in findings:
            report = findings["scientific_writing"].get("markdown_report", "")[:10000]
            
        if "slr" in findings:
            sources = str(findings["slr"])[:5000]
            
        enhanced_prompt = f"{self.system_prompt}\n\nREPORT:\n{report}\n\nKNOWN SOURCES:\n{sources}"
        
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

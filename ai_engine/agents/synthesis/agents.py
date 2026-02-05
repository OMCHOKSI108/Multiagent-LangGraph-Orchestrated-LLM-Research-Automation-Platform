from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

class GapSynthesisAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="GapSynthesis",
            system_prompt="""You are a Research Gap Analyst. 
            Identify conflicts, missing evidence, and under-explored areas in the literature.
            Output JSON with keys: 'identified_gaps', 'contradictions', 'limitations_of_current_works'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Synthesizing Research Gaps...")
        findings = state.get("findings", {})
        
        context = ""
        if "slr" in findings:
            context += f"\nLiterature Review Findings: {findings['slr']}"
        if "domain_intelligence" in findings:
             context += f"\nDomain Concepts: {findings['domain_intelligence']}"
             
        enhanced_prompt = f"{self.system_prompt}\n\nRESEARCH CONTEXT:\n{context[:15000]}"
        
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

class ResearchQuestionEngineeringAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ResearchQuestionEngineering",
            system_prompt="""You are a Research Formulation expert. 
            Formulate precise, measurable, and impactful research questions based on gaps.
            Output JSON with keys: 'primary_research_question', 'sub_questions', 'hypotheses'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Engineering Research Questions...")
        findings = state.get("findings", {})
        
        gaps = ""
        if "gap_synthesis" in findings:
            gaps = str(findings["gap_synthesis"])
            
        enhanced_prompt = f"{self.system_prompt}\n\nIDENTIFIED GAPS:\n{gaps}"
        
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

class ConceptualFrameworkAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="ConceptualFramework",
            system_prompt="""You are a Theoretical Physicist/Architect. 
            Design a conceptual framework and flow for the proposed research.
            Output JSON with keys: 'framework_description', 'variables', 'relationships'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Designing Conceptual Framework...")
        findings = state.get("findings", {})
        
        rq = ""
        if "research_question" in findings:
            rq = str(findings["research_question"])
            
        enhanced_prompt = f"{self.system_prompt}\n\nRESEARCH QUESTIONS:\n{rq}"
        
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

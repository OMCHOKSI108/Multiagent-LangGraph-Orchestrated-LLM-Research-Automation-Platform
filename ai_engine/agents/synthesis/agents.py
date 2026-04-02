from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
from typing import Dict, Any
import json

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

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        print(f"[{self.name}] Synthesizing Research Gaps...")
        findings = state.get("findings", {})
        
        context = ""
        if "slr" in findings:
            slr_data = findings["slr"]
            if isinstance(slr_data, dict):
                methodologies = slr_data.get("methodologies_matrix", "Not available")
                stats = slr_data.get("statistical_trends", "Not available")
                context += f"\nMethodologies Matrix: {methodologies}\nStatistical Trends: {stats}"
            else:
                 context += f"\nLiterature Review Findings: {str(slr_data)[:10000]}"
                 
        if "domain_intelligence" in findings:
             context += f"\nDomain Concepts: {findings['domain_intelligence']}"
             
        # Add Brain Guidance
        brain_guidance = self._get_brain_guidance(state)

        enhanced_prompt = f"{self.system_prompt}\n\n[RESEARCH CONTEXT (Structured)]\n{context}"
        if brain_guidance:
            enhanced_prompt += f"\n\n[DIRECTIVES FROM CENTRAL BRAIN]{brain_guidance}\n"
        
        # Use intelligent context truncation
        context_human = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=context_human)
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
            Ensure hypotheses are testable.
            """,
            **kwargs
        )

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        print(f"[{self.name}] Engineering Research Questions...")
        findings = state.get("findings", {})
        
        gaps = ""
        if "gap_synthesis" in findings:
            gaps_json = findings["gap_synthesis"]
            if isinstance(gaps_json, dict):
                gaps = f"Gaps: {gaps_json.get('identified_gaps', [])}\nContradictions: {gaps_json.get('contradictions', [])}"
            else:
                gaps = str(findings["gap_synthesis"])
            
        # Add Brain Guidance
        brain_guidance = self._get_brain_guidance(state)

        enhanced_prompt = f"{self.system_prompt}\n\n[IDENTIFIED GAPS]\n{gaps}"
        if brain_guidance:
            enhanced_prompt += f"\n\n[DIRECTIVES FROM CENTRAL BRAIN]{brain_guidance}\n"
        
        # Use intelligent context truncation
        context_human = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=context_human)
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
            Output JSON with keys: 'framework_description', 'variables', 'relationships', 'mermaid_diagram'.
            For 'mermaid_diagram', provide valid Mermaid.js graph definition (e.g., 'graph TD; A-->B;').
            """,
            **kwargs
        )

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        print(f"[{self.name}] Designing Conceptual Framework...")
        findings = state.get("findings", {})
        
        rq = ""
        if "research_question" in findings:
            rq = str(findings["research_question"])
            
        # Add Brain Guidance
        brain_guidance = self._get_brain_guidance(state)

        enhanced_prompt = f"{self.system_prompt}\n\n[RESEARCH QUESTIONS]\n{rq}"
        if brain_guidance:
            enhanced_prompt += f"\n\n[DIRECTIVES FROM CENTRAL BRAIN]{brain_guidance}\n"
        
        # Use intelligent context truncation
        context_human = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=context_human)
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

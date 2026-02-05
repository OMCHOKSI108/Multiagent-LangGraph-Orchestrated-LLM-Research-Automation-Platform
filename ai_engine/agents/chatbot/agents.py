from ..base import BaseAgent
from utils.embeddings import ToneAnalyzer
from langchain_core.messages import SystemMessage, HumanMessage

class InteractivePaperChatbotAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="InteractivePaperChatbot",
            system_prompt="""You are an Author-Proxy. 
            Answer user questions about the specific paper based on the extracted context.
            Output text directly responsive to the user.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Answering User Query...")
        
        # State should contain 'chat_history' and 'current_query'
        query = state.get("task", "") # In chatbot mode, task is the query
        findings = state.get("findings", {})
        
        context = ""
        if "paper_understanding" in findings:
             context = str(findings["paper_understanding"])
        elif "paper_decomposition" in findings:
             context = str(findings["paper_decomposition"])
             
        enhanced_prompt = f"{self.system_prompt}\n\nPAPER CONTEXT:\n{context[:15000]}"
        
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=enhanced_prompt),
            HumanMessage(content=query)
        ]
        
        try:
            response = self.llm.invoke(messages)
            return {
                "response": response.content, # Just text
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

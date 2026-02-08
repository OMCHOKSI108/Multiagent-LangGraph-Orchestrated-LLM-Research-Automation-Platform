from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage

class VisualizationAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="Visualization",
            system_prompt="""You are a Data Visualization Expert.
            Your job is to create MERMAID.JS diagrams and STABLE DIFFUSION prompts to visually represent the research findings.
            
            Based on the provided research context, generate:
            1. 'timeline_mermaid': A Gantt/Timeline of history.
            2. 'methodology_mermaid': A Flowchart (graph TD) of the framework.
            3. 'data_chart_mermaid': A Pie/Bar chart of topics.
            4. 'image_gen_prompt': A detailed text prompt for an AI Image Generator to visualize the core concept (e.g. "Futuristic lab with robots, cyberpunk style, high resolution").
            
            Output JSON with these keys and a 'description'.
            """,
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Generating Research Plots & Images...")
        
        findings = state.get("findings", {})
        
        # Gather context
        context = ""
        if "historical_review" in findings: context += f"\nHistory: {findings['historical_review']}"
        if "conceptual_framework" in findings: context += f"\nFramework: {findings['conceptual_framework']}"
        elif "paper_decomposition" in findings: context += f"\nPaper: {findings['paper_decomposition']}"
        if "slr" in findings: context += f"\nTopics: {findings['slr']}"
        
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=f"Generate visuals for:\n{context[:15000]}")
        ]
        
        try:
            response = self.llm.invoke(messages)
            result = self._extract_json(response.content)
            
            # --- AI Image Search (Google Images) ---
            try:
                # 1. Google Image Search (Real Images)
                from utils.providers import ImageSearchProvider
                img_search = ImageSearchProvider()
                
                image_urls = []
                if "image_gen_prompt" in result:
                    search_query = result.get("image_search_query", result["image_gen_prompt"])
                    search_query = search_query.replace("realistic", "").replace("high resolution", "").strip()
                    print(f"[{self.name}] Searching Google Images for: '{search_query}'")
                    image_urls = img_search.search(search_query, max_results=4)
                    result["image_urls"] = image_urls
                    
            except Exception as v_err:
                print(f"[{self.name}] Image Search Error: {v_err}")
            # ----------------------------------------------

            return {
                "response": result,
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

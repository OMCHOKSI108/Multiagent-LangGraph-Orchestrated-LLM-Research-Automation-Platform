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
            
            # --- AI Image Generation (Stable Diffusion) ---
            try:
                from utils.vision import VisionProvider
                vision = VisionProvider()
                
                if "image_gen_prompt" in result:
                    prompt = result["image_gen_prompt"]
                    print(f"[{self.name}] Generating AI Image: '{prompt}'")
                    
                    # Create safe filename
                    import re
                    safe_task = re.sub(r'[^a-zA-Z0-9]', '_', state.get("task", "research"))[:20]
                    path = f"generated_images/{safe_task}.png"
                    
                    # Generate
                    img_path = vision.generate_image(prompt, path)
                    result["generated_image_path"] = img_path
                    
            except Exception as v_err:
                print(f"[{self.name}] Vision Error: {v_err}")
            # ----------------------------------------------

            return {
                "response": result,
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

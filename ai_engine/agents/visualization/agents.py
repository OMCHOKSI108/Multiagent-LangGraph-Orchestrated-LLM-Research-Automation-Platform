from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage
from ai_engine.utils.providers import ImageSearchProvider
from ai_engine.utils.image_downloader import download_image
from typing import Dict, Any
import gc

class VisualizationAgent(BaseAgent):
    def __init__(self, **kwargs):
        super().__init__(
            name="Visualization",
            system_prompt="""You are a Data Visualization Expert.
            Your job is to create MERMAID.JS diagrams and PREMIUM ECHARTS configurations to visually represent research findings.
            
            Based on the provided research context, generate:
            1. 'timeline_mermaid': A Gantt/Timeline of history.
            2. 'methodology_mermaid': A Flowchart (graph TD) of the framework.
            3. 'echarts_config': A premium ECharts JSON configuration (e.g., Radar, Sunburst, or complex Bar/Line chart) to visualize data patterns. Avoid simple pie charts.
            4. 'image_gen_prompt': A detailed text prompt for an AI Image Generator to visualize the core concept.
            
            Output JSON with these keys and a 'description'.
            """,
            **kwargs
        )

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        print(f"[{self.name}] Generating Research Plots & Images...")
        
        findings = state.get("findings", {})
        
        # Gather context
        context_parts = []
        if "historical_review" in findings: context_parts.append(f"History: {findings['historical_review']}")
        if "conceptual_framework" in findings: context_parts.append(f"Framework: {findings['conceptual_framework']}")
        elif "paper_decomposition" in findings: context_parts.append(f"Paper: {findings['paper_decomposition']}")
        if "slr" in findings: context_parts.append(f"Topics: {findings['slr']}")
        
        context_str = "\n".join(context_parts)
        
        # Add Brain Guidance
        brain_guidance = self._get_brain_guidance(state)

        enhanced_system_prompt = self.system_prompt
        if brain_guidance:
            enhanced_system_prompt += f"\n\nFOLLOW THESE DIRECTIVES FROM THE CENTRAL BRAIN:{brain_guidance}\n"
            
        # Use intelligent context truncation
        context_human = self._truncate_context(state, self.max_context_tokens)

        messages = [
            SystemMessage(content=enhanced_system_prompt),
            HumanMessage(content=f"Generate visuals based on research findings:\n{context_human}\n\nAdditional data:\n{context_str[:5000]}")
        ]
        
        try:
            response = self.llm.invoke(messages)
            result = self._extract_json(response.content)
            
            # --- AI Image Search & Download ---
            try:
                img_search = ImageSearchProvider()
                
                image_urls = []
                local_images = []
                
                # Use brain's specific search hints if available
                brain_hints = state.get("brain_context", {}).get("init_result", {}).get("image_search_hints", [])
                
                search_queries = []
                if "image_gen_prompt" in result:
                    search_queries.append(result["image_gen_prompt"])
                if brain_hints:
                    search_queries.extend(brain_hints)
                
                if search_queries:
                    # Focus on the most relevant query
                    search_query = search_queries[0]
                    search_query = search_query.replace("realistic", "").replace("high resolution", "").strip()
                    print(f"[{self.name}] Searching Google Images for: '{search_query}'")
                    
                    # Search
                    raw_urls = img_search.search(search_query, max_results=8)
                    
                    # Download locally
                    job_id = state.get("_job_id", "unknown")
                    print(f"[{self.name}] Downloading images for Job {job_id}...")
                    
                    for url in raw_urls:
                        local_path = download_image(url, job_id)
                        if local_path:
                            local_images.append(local_path)
                            image_urls.append({"original": url, "local": local_path})
                    
                    result["image_urls"] = local_images 
                    result["images_metadata"] = image_urls 
                    
            except Exception as v_err:
                print(f"[{self.name}] Image Search/Download Error: {v_err}")
            finally:
                # Clear memory after intensive image processing
                gc.collect()

            return {
                "response": result,
                "raw": response.content,
                "agent": self.name,
                "execution_time": 0
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}

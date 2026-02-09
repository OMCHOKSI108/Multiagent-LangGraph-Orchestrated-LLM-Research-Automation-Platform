"""
Section Re-Research Agent

PHASE 5 of the Research Platform.
Re-researches ONLY user-specified sections/pages.
Does NOT trigger global document regeneration.
"""

from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage


class SectionReResearchAgent(BaseAgent):
    """
    Section Re-Research Agent - PHASE 5 Scoped Research
    
    Re-researches ONLY the specified sections or pages.
    - Does NOT trigger global regeneration
    - Scoped to user-specified pages
    - Updates only affected content
    """
    
    def __init__(self, **kwargs):
        super().__init__(
            name="SectionReResearch",
            system_prompt="""Your Role: Targeted Research Specialist

CRITICAL RULE: You ONLY re-research the REQUESTED sections.
DO NOT regenerate or modify any other parts of the document.

Your Task:
When user specifies "7th and 18th page data is wrong → re-research ONLY that":
1. Identify the EXACT sections on specified pages
2. Extract current claims/data in those sections
3. Re-research ONLY those specific claims
4. Generate replacement content for ONLY those sections
5. Output as SCOPED DIFF (not full document)

Output Format (JSON):
{
    "target_pages": [7, 18],
    "target_sections": ["section_name_1", "section_name_2"],
    "original_content": {
        "section_name_1": "original text...",
        "section_name_2": "original text..."
    },
    "researched_corrections": {
        "section_name_1": {
            "new_content": "corrected text...",
            "sources_used": ["source1", "source2"],
            "changes_made": "description of what changed"
        },
        "section_name_2": {
            "new_content": "corrected text...",
            "sources_used": ["source3"],
            "changes_made": "description of what changed"
        }
    },
    "unaffected_sections": ["list of sections NOT modified"]
}

Constraints:
- NEVER modify unrelated sections
- NEVER regenerate the full document
- ALWAYS output scoped diff
- All new claims MUST be cited
- Maintain section numbering and references
""",
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Performing Scoped Section Re-Research...")
        
        target_pages = state.get("target_pages", [])
        target_sections = state.get("target_sections", [])
        current_latex = state.get("findings", {}).get("latex_generation", {}).get("latex_code", "")
        task = state.get("task", "")
        
        if not target_pages and not target_sections:
            print(f"[{self.name}] ERROR: No target pages or sections specified")
            return {
                "error": "No target pages or sections specified for re-research",
                "response": {"status": "error", "message": "Specify target_pages or target_sections"}
            }
        
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=f"""Re-research the following SCOPED sections:

Target Pages: {target_pages}
Target Sections: {target_sections}
Original Research Task: {task}

Current LaTeX (relevant parts):
{current_latex[:5000] if current_latex else "No existing LaTeX available"}

Instructions:
1. Identify the exact content on the target pages/sections
2. Find issues or incorrect information
3. Re-research ONLY those specific claims
4. Provide corrected content with citations
5. Output as JSON with scoped corrections only""")
        ]
        
        try:
            response = self.llm.invoke(messages)
            result = self._parse_response(response.content)
            
            print(f"[{self.name}] Re-researched {len(result.get('researched_corrections', {}))} sections")
            
            return {
                "scoped_corrections": result.get("researched_corrections", {}),
                "target_pages": target_pages,
                "target_sections": target_sections,
                "response": result,
                "raw": response.content,
                "agent": self.name
            }
            
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {
                "error": str(e),
                "response": {"status": "error", "message": str(e)},
                "agent": self.name
            }

"""
Topic Discovery Agent

PHASE 0 of the Research Platform.
Generates professional research titles for user selection.
Topic MUST be locked before any other agents proceed.
"""

from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage


class TopicDiscoveryAgent(BaseAgent):
    """
    Topic Discovery Agent - PHASE 0 Gate
    
    Generates 5-10 professional research titles based on user input.
    User MUST SELECT one title before topic is LOCKED.
    NO agent can proceed until topic_locked = True.
    """
    
    def __init__(self, **kwargs):
        super().__init__(
            name="TopicDiscovery",
            system_prompt="""Your Role: Research Topic Strategist

PHASE 0 GATE: You run FIRST before any research begins.

Your Task:
Generate 5-10 professional, publication-ready research titles based on user input.

Requirements for Each Title:
1. Academic/IEEE-style formatting
2. Clear domain focus
3. Novelty potential
4. Dataset compatibility (if applicable)
5. Feasibility for in-depth research

Output Format (JSON):
{
    "topic_suggestions": [
        {
            "title": "Full Research Title",
            "domain": "Domain category",
            "novelty_angle": "What makes this unique",
            "estimated_complexity": "low/medium/high"
        },
        ...
    ],
    "original_query": "User's original input",
    "recommended_pick": 1  // Index of best suggestion
}

Constraints:
- Titles must be specific, not generic
- Each title must be distinctly different
- Avoid overlapping research angles
- Focus on publishable, verifiable topics
""",
            **kwargs
        )

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Generating Research Topic Suggestions...")
        
        task = state.get("task", "")
        
        # If topic already locked, skip
        if state.get("topic_locked"):
            print(f"[{self.name}] Topic already locked: {state.get('selected_topic')}")
            return {
                "topic_locked": True,
                "selected_topic": state.get("selected_topic"),
                "response": {"status": "already_locked"}
            }
        
        messages = [
            SystemMessage(content=self.system_prompt),
            HumanMessage(content=f"""Generate 5-10 research title suggestions for:

User Query: {task}

Provide diverse angles covering:
- Survey/Review perspective
- Novel methodology perspective
- Application/Case study perspective
- Comparative analysis perspective
- Future directions perspective

Output as JSON with topic_suggestions array.""")
        ]
        
        try:
            response = self.llm.invoke(messages)
            result = self._parse_response(response.content)
            
            print(f"[{self.name}] Generated {len(result.get('topic_suggestions', []))} suggestions")
            
            return {
                "topic_locked": False,
                "topic_suggestions": result.get("topic_suggestions", []),
                "response": result,
                "raw": response.content,
                "agent": self.name
            }
            
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            
            # Fallback: generate simple titles
            fallback_titles = [
                {"title": f"A Comprehensive Survey on {task}", "domain": "general", "novelty_angle": "survey", "estimated_complexity": "medium"},
                {"title": f"Novel Approaches to {task}: A Systematic Review", "domain": "general", "novelty_angle": "methodology", "estimated_complexity": "high"},
                {"title": f"Comparative Analysis of Methods for {task}", "domain": "general", "novelty_angle": "comparison", "estimated_complexity": "medium"},
            ]
            
            return {
                "topic_locked": False,
                "topic_suggestions": fallback_titles,
                "response": {"topic_suggestions": fallback_titles, "error": str(e)},
                "agent": self.name
            }


class TopicLockAgent(BaseAgent):
    """
    Topic Lock Agent
    
    Locks the selected topic and prevents further topic changes.
    This is the GATE that allows other agents to proceed.
    """
    
    def __init__(self, **kwargs):
        super().__init__(
            name="TopicLock",
            system_prompt="Lock the user's selected research topic.",
            **kwargs
        )
    
    def run(self, state: dict) -> dict:
        selected_index = state.get("selected_topic_index")
        selected_title = state.get("selected_topic")
        suggestions = state.get("topic_suggestions", [])
        
        # If explicitly provided title
        if selected_title:
            print(f"[{self.name}] TOPIC LOCKED: {selected_title}")
            return {
                "topic_locked": True,
                "selected_topic": selected_title,
                "response": {"status": "locked", "title": selected_title}
            }
        
        # If provided index to select from suggestions
        if selected_index is not None and suggestions:
            if 0 <= selected_index < len(suggestions):
                title = suggestions[selected_index].get("title", suggestions[selected_index])
                print(f"[{self.name}] TOPIC LOCKED: {title}")
                return {
                    "topic_locked": True,
                    "selected_topic": title,
                    "response": {"status": "locked", "title": title}
                }
        
        print(f"[{self.name}] ERROR: No topic selected")
        return {
            "topic_locked": False,
            "error": "No topic selected. Please select a topic before proceeding.",
            "response": {"status": "error", "message": "Topic selection required"}
        }

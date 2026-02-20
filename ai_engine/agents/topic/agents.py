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
Analyze the user's input to determine if it is a **Specific Topic** or a **Broad Domain**.

1. **Specific Topic:** If the user provided a clear, specific research title or topic (e.g., 'Impact of Transformers on NLP in 2024', 'Optimizing React Rendering Performance'), accept it. 
   - Set "is_specific": true
   - Set "selected_topic": "The Refined/Formatted Title"
   - You do NOT need to generate suggestions.

2. **Vague/Broad Topic:** If the user provided a broad domain (e.g., 'AI in Healthcare', 'Stock Market Prediction'), generate 5-10 suggestions.
   - Set "is_specific": false
   - Generate "topic_suggestions"

Requirements for Suggestions (if vague):
1. Academic/IEEE-style formatting
2. Clear domain focus
3. Novelty potential
4. Dataset compatibility
5. Feasibility for in-depth research

Output Format (JSON):
{
    "is_specific": boolean,
    "selected_topic": "Title (only if is_specific=true)", 
    "topic_suggestions": [
        {
            "title": "Full Research Title",
            "domain": "Domain category",
            "novelty_angle": "What makes this unique",
            "estimated_complexity": "low/medium/high"
        }
    ],
    "original_query": "User's original input",
    "recommended_pick": 0
}

Constraints:
- Titles must be specific, not generic
- Avoid overlapping research angles
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
            HumanMessage(content=f"""Analyze this input:

User Query: {task}

If specific, return is_specific=true and the refined title.
If vague, return is_specific=false and 5-10 suggestions.

Output as JSON.""")
        ]
        
        # Check if suggestions already exist (avoid re-generation loop)
        existing_suggestions = state.get("topic_suggestions")
        if existing_suggestions and len(existing_suggestions) > 0:
            print(f"[{self.name}] Waiting for user selection from {len(existing_suggestions)} suggestions...")
            
            # Check external state store for updates
            try:
                from state_store import RESEARCH_STATES
                job_id = int(state.get("_job_id")) if str(state.get("_job_id")).isdigit() else None
                
                if job_id and job_id in RESEARCH_STATES:
                    external_state = RESEARCH_STATES[job_id]
                    if external_state.get("topic_locked"):
                        selected_topic = external_state.get("selected_topic")
                        print(f"[{self.name}] Detected EXTERNAL TOPIC LOCK: {selected_topic}")
                        return {
                            "topic_locked": True,
                            "selected_topic": selected_topic,
                            "final_topic": selected_topic # ensure it propagates
                        }
                
                # Always keep suggestions in RESEARCH_STATES for frontend polling
                if job_id:
                    if job_id not in RESEARCH_STATES:
                        RESEARCH_STATES[job_id] = {}
                    RESEARCH_STATES[job_id]["topic_suggestions"] = existing_suggestions
                    RESEARCH_STATES[job_id]["topic_locked"] = False
            except Exception as e:
                print(f"[{self.name}] Error checking external state: {e}")

            # Re-emit event in case frontend reconnected
            from utils.event_emitter import emit_event
            try:
                emit_event(
                    stage="topic_discovery",
                    message="Waiting for Topic Selection...",
                    severity="info",
                    category="user_action_required",
                    details={"suggestions": existing_suggestions},
                    research_id=int(state.get("_job_id")) if str(state.get("_job_id")).isdigit() else None
                )
                print(f"[{self.name}] Event emitted successfully")
            except Exception as e:
                print(f"[{self.name}] Event emission error: {e}")
            import time
            time.sleep(3) # Slow down the loop
            return {
                "topic_locked": False,
                "topic_suggestions": existing_suggestions
            }

        try:
            print(f"[{self.name}] DEBUG: Invoking LLM...")
            response = self.llm.invoke(messages)
            print(f"[{self.name}] DEBUG: LLM Response received. Length: {len(response.content)}")
            
            print(f"[{self.name}] DEBUG: Extracting JSON...")
            result = self._extract_json(response.content)
            print(f"[{self.name}] DEBUG: JSON Extracted. Keys: {result.keys()}")
            
            # CRITICAL FIX: BaseAgent returns {"raw_text": ...} on failure
            if "raw_text" in result:
                print(f"[{self.name}] JSON Parse Failed (Raw Text). Triggering fallback.")
                raise ValueError("Output was not valid JSON.")

            # SMART LOCK LOGIC
            if result.get("is_specific", False):
                selected_topic = result.get("selected_topic", task)
                print(f"[{self.name}] Detected SPECIFIC topic. Auto-locking: {selected_topic}")
                
                 # Emit success event
                from utils.event_emitter import emit_event
                emit_event(
                    stage="topic_discovery",
                    message=f"Topic accepted: {selected_topic}",
                    severity="success",
                    category="stage",
                    research_id=int(state.get("_job_id")) if str(state.get("_job_id")).isdigit() else None
                )
                
                return {
                    "topic_locked": True,
                    "selected_topic": selected_topic,
                    "topic_suggestions": [],
                    "response": result,
                    "agent": self.name
                }

            # FALLBACK TO SUGGESTIONS
            suggestions = result.get("topic_suggestions", [])
            print(f"[{self.name}] Generated {len(suggestions)} suggestions")
            
            # Store suggestions in RESEARCH_STATES for frontend polling
            try:
                from state_store import RESEARCH_STATES
                job_id = int(state.get("_job_id")) if str(state.get("_job_id")).isdigit() else None
                if job_id:
                    if job_id not in RESEARCH_STATES:
                        RESEARCH_STATES[job_id] = {}
                    RESEARCH_STATES[job_id]["topic_suggestions"] = suggestions
                    RESEARCH_STATES[job_id]["topic_locked"] = False
                    print(f"[{self.name}] Stored {len(suggestions)} suggestions in RESEARCH_STATES[{job_id}]")
            except Exception as e:
                print(f"[{self.name}] Failed to store in RESEARCH_STATES: {e}")
            
            # EMIT TOPIC SUGGESTIONS EVENT
            from utils.event_emitter import emit_event
            try:
                emit_event(
                    stage="topic_discovery",
                    message="Research Topic Suggestions Generated",
                    severity="info",
                    category="user_action_required",
                    details={"suggestions": suggestions},
                    research_id=int(state.get("_job_id")) if str(state.get("_job_id")).isdigit() else None
                )
                print(f"[{self.name}] Topic suggestions event emitted successfully")
            except Exception as e:
                print(f"[{self.name}] Event emission error: {e}")

            # Return False so TopicLock checks for user input
            return {
                "topic_locked": False,
                "topic_suggestions": suggestions,
                "response": result,
                "raw": response.content,
                "agent": self.name
            }
            
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            
            # Fallback: auto-lock the user's original query as the topic
            fallback_title = f"A Comprehensive Survey on {task}"
            print(f"[{self.name}] Fallback: Auto-locking topic as '{fallback_title}'")
            
            return {
                "topic_locked": True,
                "selected_topic": fallback_title,
                "topic_suggestions": [
                    {"title": fallback_title, "domain": "general", "novelty_angle": "survey", "estimated_complexity": "medium"},
                ],
                "response": {"topic_suggestions": [], "error": str(e), "fallback": True},
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
                print(f"[{self.name}] TOPIC LOCKED (Index {selected_index}): {title}")
                return {
                    "topic_locked": True,
                    "selected_topic": title,
                    "response": {"status": "locked", "title": title}
                }
        
        # ---------------------------------------------------------
        # ROBUSTNESS FIX: Check External State Store (RESEARCH_STATES)
        # ---------------------------------------------------------
        try:
            from state_store import RESEARCH_STATES
            job_id = int(state.get("_job_id")) if str(state.get("_job_id")).isdigit() else None
            
            if job_id and job_id in RESEARCH_STATES:
                external_state = RESEARCH_STATES[job_id]
                if external_state.get("topic_locked"):
                    ext_topic = external_state.get("selected_topic")
                    print(f"[{self.name}] Detected EXTERNAL TOPIC LOCK: {ext_topic}")
                    return {
                        "topic_locked": True,
                        "selected_topic": ext_topic,
                        "response": {"status": "locked", "title": ext_topic}
                    }
        except Exception as e:
            print(f"[{self.name}] Error checking external state: {e}")
        # ---------------------------------------------------------

        # AUTO-SELECTION DISABLED - User must select via API
        # We just wait here (returning False loops back to TopicDiscovery which sleeps)
        
        # Check if we have been stuck here too long? For now, infinite wait is fine.
        print(f"[{self.name}] Waiting for user topic selection...")
        return {
            "topic_locked": False,
            "response": {"status": "waiting_for_user"}
        }

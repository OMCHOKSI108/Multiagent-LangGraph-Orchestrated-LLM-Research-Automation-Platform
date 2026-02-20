
import sys
import os

# Mocking the simplified structure to verify logic without initializing the full heavy app
# We want to verify:
# 1. BaseAgent JSON parsing (mocked)
# 2. TopicDiscoveryAgent logic on "raw_text"
# 3. full_pipeline.py's run_agent logic (the fix)

print("Running Logic Verification...")

# --- 1. Simulation of BaseAgent._extract_json ---
def mock_extract_json(text):
    import json
    import re
    try:
        return json.loads(text)
    except:
        match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if match:
             try: return json.loads(match.group(1))
             except: pass
    return {"raw_text": text}

# --- 2. Simulation of TopicDiscoveryAgent.run logic ---
def topic_discovery_run(state, llm_response_text):
    print(f"\n[TopicDiscovery] Simulating run with LLM response: {llm_response_text[:50]}...")
    
    # 1. BaseAgent extracts JSON (or fails)
    result = mock_extract_json(llm_response_text)
    
    # 2. TopicDiscovery Logic
    try:
        # CRITICAL FIX CHECK: Checking for raw_text
        if "raw_text" in result:
            print("[TopicDiscovery] Detected 'raw_text'. Raising ValueError...")
            raise ValueError("Output was not valid JSON.")
            
        print("[TopicDiscovery] Valid JSON detected.")
        return {"response": result}
        
    except Exception as e:
        print(f"[TopicDiscovery] Caught Expected Error: {e}")
        print("[TopicDiscovery] Triggering Fallback...")
        task = state.get("task", "Unknown")
        fallback_title = f"A Comprehensive Survey on {task}"
        
        return {
            "topic_locked": True,
            "selected_topic": fallback_title,
            "topic_suggestions": [],
            "fallback": True
        }

# --- 3. Simulation of full_pipeline.run_agent (THE FIX) ---
def run_agent_simulation(agent_func, state, llm_output):
    result = agent_func(state, llm_output)
    
    findings_update = {"mock": "findings"}
    history_update = ["Completed"]
    
    # THE CRITICAL FIX:
    # "if isinstance(result, dict): return {**result, ...}"
    if isinstance(result, dict):
        merged = {**result, "findings": findings_update, "history": history_update}
        print(f"\n[run_agent] Merged Result: Keys = {list(merged.keys())}")
        return merged
    else:
        print(f"\n[run_agent] BAD UNMERGED Result")
        return {"findings": findings_update, "history": history_update}

# --- TEST ---
state = {"task": "Crypto Trading"}
bad_json_response = "Here are some cool topics: 1. AI in Crypto 2. Blockchain..."

final_output = run_agent_simulation(topic_discovery_run, state, bad_json_response)

print("\n--- VERIFICATION RESULTS ---")
if final_output.get("topic_locked") == True:
    print("✅ SUCCESS: 'topic_locked' is True (State propagated)")
else:
    print("❌ FAILURE: 'topic_locked' is missing or False")

if final_output.get("selected_topic") == "A Comprehensive Survey on Crypto Trading":
    print("✅ SUCCESS: Fallback topic is correct")
else:
    print(f"❌ FAILURE: Topic is {final_output.get('selected_topic')}")


import requests
import json
import sys

# Default to Job #40 based on user logs, but allow arg override
job_id = 40
if len(sys.argv) > 1:
    job_id = int(sys.argv[1])

topic = "Automated Crypto Trading System (Manual Unlock)"

url = "http://localhost:8000/research/update-state"
data = {
    "research_id": job_id,
    "state_update": {
        "selected_topic": topic,
        "topic_locked": True
    }
}

print(f"Attempting to unlock Job #{job_id} via {url}...")
print(f"Payload: {json.dumps(data, indent=2)}")

try:
    res = requests.post(url, json=data)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")
    
    if res.status_code == 200:
        print("\n✅ Success! Check the AI Engine logs/terminal to see if the loop stops.")
    else:
        print("\n❌ Failed to update state.")
        
except Exception as e:
    print(f"\n❌ Connection Error: {e}")
    print("Is the AI Engine running on port 8000?")

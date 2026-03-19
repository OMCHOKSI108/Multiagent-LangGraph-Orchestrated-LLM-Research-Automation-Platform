import requests
import json
import time
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = "http://localhost:5000/api"
AI_ENGINE_URL = "http://localhost:8000"
AI_ENGINE_SECRET = os.getenv("AI_ENGINE_SECRET", "")

def test_health():
    print("--- Testing Health ---")
    try:
        res = requests.get(f"{BACKEND_URL}/auth/me") # Simple check
        print(f"Backend Auth Check: {res.status_code}")
    except Exception as e:
        print(f"Backend reachable? Error: {e}")

    try:
        res = requests.get(f"{AI_ENGINE_URL}/health")
        print(f"AI Engine Health: {res.json()}")
    except Exception as e:
        print(f"AI Engine reachable? Error: {e}")

def test_fast_chat():
    print("\n--- Testing Fast Chat (Conversational) ---")
    payload = {
        "query": "Who is Narendra Modi?",
        "history": [],
        "context": ""
    }
    # No secret required for this endpoint based on current implementation
    try:
        res = requests.post(f"{AI_ENGINE_URL}/chatbot/fast-chat", json=payload)
        print(f"Fast Chat Response: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            print(f"Response: {data.get('response', '')[:200]}...")
        else:
            print(res.text)
    except Exception as e:
        print(f"Fast Chat Error: {e}")

def test_search():
    print("\n--- Testing Search ---")
    payload = {
        "query": "Latest AI news 2024",
        "providers": ["duckduckgo"],
        "max_results": 5
    }
    headers = {"X-API-Key": AI_ENGINE_SECRET}
    try:
        res = requests.post(f"{AI_ENGINE_URL}/search", json=payload, headers=headers)
        print(f"Search Response: {res.status_code}")
        if res.status_code == 200:
            print(f"Found {len(res.json().get('results', []))} results")
        else:
            print(res.text)
    except Exception as e:
        print(f"Search Error: {e}")

def main():
    test_health()
    test_fast_chat()
    test_search()

if __name__ == "__main__":
    main()

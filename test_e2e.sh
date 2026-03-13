#!/bin/bash
# End-to-end test script for academic research platform

API_URL="http://localhost:5000"

echo "1. Registering user..."
curl -s -X POST $API_URL/auth/signup -H 'Content-Type: application/json' -d @signup.json

echo -e "\n2. Logging in..."
TOKEN=$(curl -s -X POST $API_URL/auth/login -H 'Content-Type: application/json' -d @login.json | jq -r .token)
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Failed to get token"
  exit 1
fi
echo "Token obtained."

echo "3. Creating workspace..."
WORKSPACE_ID=$(curl -s -X POST $API_URL/workspaces -H 'Content-Type: application/json' -H "x-auth-token: $TOKEN" -d '{"name": "E2E Test Workspace"}' | jq -r .workspace.id)
if [ "$WORKSPACE_ID" == "null" ] || [ -z "$WORKSPACE_ID" ]; then
  echo "Failed to create workspace"
  exit 1
fi
echo "Workspace ID: $WORKSPACE_ID"

echo "4. Starting research..."
START_RES=$(curl -s -X POST $API_URL/workspaces/$WORKSPACE_ID/research/start -H 'Content-Type: application/json' -H "x-auth-token: $TOKEN" -d '{"topic": "Quantum Computing Basics", "depth": "quick"}')
echo "Result: $START_RES"

SESSION_ID=$(echo $START_RES | jq -r .session_id)
if [ "$SESSION_ID" == "null" ] || [ -z "$SESSION_ID" ]; then
  echo "Failed to start session"
  exit 1
fi
echo "Session ID: $SESSION_ID"

echo "5. Waiting for status (polling)..."
sleep 5
STATUS=$(curl -s -X GET $API_URL/workspaces/$WORKSPACE_ID/research/$SESSION_ID/status -H "x-auth-token: $TOKEN" | jq -r .status)
echo "Current Status: $STATUS"

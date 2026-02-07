# End-to-End Verification Checklist

## Prerequisites

1. **Services Running:**
   - AI Engine: `http://localhost:8000`
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000` (or Vite dev server)
   - Database: PostgreSQL running with all migrations applied

2. **Environment Setup:**
   - `.env` files configured in both `backend/` and `ai_engine/`
   - LLM provider available (Ollama running or API keys set)
   - Required dependencies installed

## Verification Tests

### ✅ **Test 1: Authentication Flow**

**Steps:**
1. Navigate to frontend landing page
2. Click "Sign Up" → Register with email/password/name
3. Verify registration success message
4. Click "Login" → Use registered credentials
5. Verify redirect to Dashboard
6. Check localStorage for `dre_token`

**Expected Results:**
- ✅ Registration creates user in database
- ✅ Login returns JWT token
- ✅ Dashboard loads with user data
- ✅ API calls include `x-auth-token` header

### ✅ **Test 2: Research Flow**

**Steps:**
1. From Dashboard, click "New Research"
2. Enter task: "Analyze transformer architecture innovations"
3. Leave paper URL empty (literature review mode)
4. Click "Start Research"
5. Watch real-time events stream
6. Verify research steps populate sequentially
7. Wait for completion
8. Review final report

**Expected Results:**
- ✅ Research job created in database
- ✅ SSE events stream to frontend
- ✅ Research steps show: Orchestrator → Domain Intelligence → Historical Review → SLR → Gap Synthesis → Innovation → Visualization → Writing → LaTeX
- ✅ Each step shows agent name, status, and timing
- ✅ Final report contains structured findings
- ✅ Status updates from "running" → "completed"

### ✅ **Test 3: Chat Streaming**

**Steps:**
1. Open completed research job
2. Scroll to chat section
3. Type message: "Summarize the key findings"
4. Send message
5. Watch response stream character-by-character
6. Click copy button on response
7. Verify clipboard contains response text

**Expected Results:**
- ✅ Message appears immediately in chat
- ✅ Typing indicator shows while streaming
- ✅ Response streams in real-time (not all at once)
- ✅ Copy button works correctly
- ✅ Message history persists on page refresh

### ✅ **Test 4: Memory Flow**

**Steps:**
1. Go to Settings → Memories tab
2. Add memory: "Focus on practical applications of AI"
3. Add another: "Previous research on neural networks"
4. Verify both appear in memory list
5. Search for "neural" → verify filtering
6. Delete first memory
7. Verify it's removed from list
8. Start new research and check if remaining memory influences results

**Expected Results:**
- ✅ Memories appear immediately after creation
- ✅ Search filtering works correctly
- ✅ Deletion removes memory permanently
- ✅ Research incorporates user memories in context
- ✅ Memory count updates in UI

### ✅ **Test 5: Web Search**

**Steps:**
1. From Dashboard, use "Quick Search" input
2. Search for: "latest developments in AI research"
3. Verify source cards display
4. Check favicon and descriptions load
5. Click "View more sources" button
6. Verify modal opens with full results
7. Test different providers if available

**Expected Results:**
- ✅ Search returns results from multiple providers
- ✅ Source cards show favicon, title, description
- ✅ Results include arXiv papers and web sources
- ✅ Modal displays paginated results
- ✅ No broken images or missing data

### ✅ **Test 6: Export Functionality**

**Steps:**
1. Open completed research job
2. Click "Export" dropdown
3. Download Markdown version
4. Download PDF version  
5. Download LaTeX version
6. Verify all files download correctly
7. Open files and check content formatting

**Expected Results:**
- ✅ Markdown file contains properly formatted report
- ✅ PDF renders correctly with formatting
- ✅ LaTeX file has proper syntax and structure
- ✅ All exports contain same core content
- ✅ Files have meaningful names with research ID

### ✅ **Test 7: Dark Mode**

**Steps:**
1. Click theme toggle (sun/moon icon)
2. Verify all pages switch to dark mode
3. Check Dashboard, Workspace, Settings, Landing
4. Refresh page → verify preference persists
5. Toggle back to light mode
6. Test on mobile viewport

**Expected Results:**
- ✅ All components have proper dark variants
- ✅ No white backgrounds or invisible text
- ✅ Theme preference saves in localStorage
- ✅ System preference detected on first visit
- ✅ Smooth transitions between themes

### ✅ **Test 8: Responsive Design**

**Steps:**
1. Resize browser to mobile width (< 768px)
2. Verify sidebar collapses/becomes drawer
3. Check hamburger menu appears
4. Test all pages on mobile layout
5. Verify touch interactions work
6. Test tablet viewport (768px-1024px)

**Expected Results:**
- ✅ Sidebar hidden on mobile with overlay/drawer
- ✅ Navigation accessible via hamburger menu
- ✅ Research timeline stacks vertically
- ✅ Source cards responsive (1-2 cols on mobile)
- ✅ Chat interface adapts properly
- ✅ No horizontal scroll issues

### ✅ **Test 9: No Regressions**

**Steps:**
1. Test all existing API endpoints:
   - `GET /health` (AI Engine)
   - `GET /` (Backend)
   - `GET /research` (with auth)
   - `POST /research` (with auth)
   - `GET /research/:id` (with auth)
   - `GET /events/stream` (with auth)
2. Verify old frontend pages still work
3. Check no console errors
4. Verify database schema intact

**Expected Results:**
- ✅ All existing endpoints return expected responses
- ✅ Authentication still required where expected
- ✅ Database queries execute successfully
- ✅ No JavaScript errors in console
- ✅ Existing workflows unchanged

### ✅ **Test 10: Independence Verification**

**Steps:**
1. Search codebase for "opensearch-ai" references:
   ```bash
   grep -r "opensearch-ai" . --exclude-dir=node_modules --exclude-dir=.git
   ```
2. Check imports for external dependencies
3. Verify no file paths reference opensearch-ai directory
4. Confirm all functionality works without opensearch-ai running

**Expected Results:**
- ✅ No references to opensearch-ai in code
- ✅ All features work independently
- ✅ No broken imports or missing dependencies
- ✅ Self-contained implementation

## Performance Checks

### **Loading Times**
- ✅ Frontend pages load < 2 seconds
- ✅ Research completion < 60 seconds (depends on LLM)
- ✅ Chat responses stream within 2-5 seconds
- ✅ Search results return < 5 seconds

### **Error Handling**
- ✅ Network failures show user-friendly messages
- ✅ Invalid inputs provide clear validation errors
- ✅ 404/403 errors handled gracefully
- ✅ LLM failures don't crash the system

## Final Checklist

- [ ] All 10 verification tests pass
- [ ] Performance benchmarks met
- [ ] Error handling robust
- [ ] No console errors or warnings
- [ ] Mobile/desktop layouts working
- [ ] Dark/light themes working
- [ ] All export formats functional
- [ ] Memory system integrated
- [ ] Streaming chat operational
- [ ] Web search integrated
- [ ] No opensearch-ai dependencies
- [ ] Documentation complete

## Troubleshooting Common Issues

**Research jobs fail to start:**
- Check AI Engine logs for LLM connection errors
- Verify Ollama is running or API keys set
- Check database connection

**Streaming doesn't work:**
- Verify SSE endpoints return proper headers
- Check browser dev tools for EventSource errors
- Test with curl/postman directly

**Frontend doesn't connect:**
- Check VITE_API_URL environment variable
- Verify CORS settings in backend
- Check network tab for 401/403 errors

**Memory features missing:**
- Verify migration 003_user_memories.sql applied
- Check memory routes registered in server.js
- Verify JWT authentication working

**Export downloads fail:**
- Check file system permissions
- Verify markdown-pdf package installed
- Test individual export routes with curl

If all tests pass, the opensearch-ai feature merge is complete! 🎉

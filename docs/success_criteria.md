```markdown
# Research and Analysis Platform - Project Success Criteria and Frontend Design

## Project Success Criteria

These criteria are realistic, measurable, and prioritized for a local Ollama-based prototype. They focus on achievable goals with current open-source models (Llama 3.1/Mistral derivatives via Ollama as of Feb 2026). Success is defined in tiers — you need to hit **MVP** first before claiming higher tiers.

### Tier 1: MVP (Minimum Viable Product) - Must Achieve to Call It "Working"
| Criterion | Target | Measurement Method | Why This Matters | Realistic? (Feb 2026) |
|---------|--------|---------------------|------------------|-----------------------|
| Core Pipeline Runs End-to-End | Pipeline B (single-paper analysis) completes on 80% of test papers without crashing | Run on 10 diverse open-access arXiv PDFs (CS/ML domain preferred) | Proves basic orchestration works | Yes with 5–7 agents max |
| Processing Time | < 10 minutes per paper on consumer GPU (RTX 4090 or equivalent) | Timed runs with Ollama 70B–405B quantized models | Local setup must be usable, not hours-long | Achievable if agents ≤ 7 and context managed |
| Basic Accuracy | Reproducibility detection correct on ≥70% of papers with public code (e.g., from PapersWithCode) | Manual verification on 10 papers | LLMs still weak on code; 70% is realistic ceiling for local models | Borderline — expect 60–75% |
| Hallucination Rate | < 20% detectable hallucinations in final output | Use self-check agent + manual spot-check on 10 runs | Critical for research trust | Possible with strong prompts + detection agent |
| Cost | $0 ongoing (only hardware/electricity) | No cloud API usage | Your stated goal | Fully met with Ollama |
| Frontend Usability | User can upload PDF, run analysis, view results without code knowledge | Basic user testing (you + 2–3 others) | Must be accessible | Yes with Gradio/Streamlit |

### Tier 2: Good Prototype (Useful for Personal/Academic Use)


| Criterion | Target | Measurement Method |
|---------|--------|---------------------|
| Accuracy Improvements | Reproducibility ≥80%, critique quality matches human grad-student level on 70% cases | Blind comparison with human reviews |
| Multi-Paper Support | Basic literature gap identification on 5–10 papers | Test on a known research topic |
| User Satisfaction | 4/5 average from 5 test users | Simple feedback form |
| Error Recovery | Graceful handling of bad PDFs/code failures | Test on 5 problematic papers |

### Tier 3: Production-Ready (Rare for Local Ollama Projects)
| Criterion | Target | Notes |
|---------|--------|-------|
| Full Pipeline (novelty generation) | Generates plausible new research directions validated by domain expert | Very hard with local models — frontier cloud models needed for 2026 SOTA |
| Scalability | Handles 50+ papers in batch | Token/hardware limits make this unlikely locally |

**Honest Reality Check**: With Ollama local models in 2026, Tier 1 is achievable with heavy simplification (cut to 5–7 agents). Tier 2 is possible with excellent prompting and testing. Tier 3 is not realistic without cloud frontier models or massive hardware — local models still lag on complex reasoning chains.

## Frontend Design Specification

### Recommended Tech Stack (Simple & Realistic for Local Ollama)
- **Framework**: Gradio (preferred) or Streamlit — both official docs (gradio.app, streamlit.io) recommend them for AI prototypes in 2026.
  - Why: Zero-cost, Python-only, fast iteration, built-in file upload/chat/components.
  - Avoid React/Next.js unless you want complex custom UI — adds unnecessary overhead for prototype.
- **Backend**: LangGraph or CrewAI for agent orchestration, exposed via FastAPI if needed.
- **Deployment**: Local only (streamlit run app.py or gradio launch).

### Page Structure (Markdown Wireframe)

#### 1. Home / Dashboard Page
```markdown
# Research & Analysis Platform

Upload a paper or select pipeline → Get automated analysis

[Tab: Single Paper Analysis]  [Tab: Literature Synthesis (Beta)]

Upload PDF: [File Upload Button]

Or paste arXiv ID / URL: [Text Input] [Fetch Button]

Pipeline Selection:
- Single Paper Deep Dive (Recommended)
- Full Research Pipeline (Experimental - Slow)

[Run Analysis Button]

Recent Sessions:
- Paper Title 1 - Jan 30, 2026 [View]
- Paper Title 2 - Jan 28, 2026 [View]
```

#### 2. Analysis Results Page (Main View)
```markdown
## Analysis Results: "Paper Title Here" (arXiv:xxxx.xxxx)

### Summary
[Concise 200-word summary from Paper Understanding Agent]

### Key Sections Breakdown
| Section | Summary | Figures/Tables |
|---------|---------|----------------|
| Abstract | ... | None |
| Method  | ... | Fig 1, Table 2 |
| Results | ... | Fig 3-5 |

### Technical Verification
- Claims Supported: 85%
- Potential Issues: [List of flagged items]

### Reproducibility Score: 7/10
[Detailed reasoning + code attempts if applicable]

### Reliability Verdict
[Final scoring agent output - Green/Yellow/Red badge]

### Critique
[Reviewer-style critique - strengths, weaknesses, suggestions]

### Interactive Chat
[Chat interface pre-loaded with paper context]
User: [Input box]
Assistant: [Chat history]
```

#### 3. Interactive Chatbot Tab
```markdown
## Paper Chatbot

Ask questions about the paper:

[Chat interface - full height]

Examples:
- "Explain the main method in simple terms"
- "What are the limitations?"
- "How does this compare to [other paper]?"
```

#### 4. Settings / Advanced
```markdown
## Settings

Model Selection: [Dropdown - Ollama models available locally]

Max Agents: [Slider 3–10]

Enable Code Execution Sandbox: [Toggle] (if implemented)

Clear History / Cache
```

### Design Principles (Keep It Simple)
- Minimalist UI — use default Gradio/Streamlit themes.
- Progress bars during long runs (critical for local slowness).
- Downloadable reports (Markdown/PDF export of results).
- Error messages clear and actionable.
- Mobile-responsive (Gradio handles this well).

**Honest Note**: This frontend is deliberately basic because complex UIs distract from core agent quality. Tools like Elicit and SciSpace succeed with similar clean designs — focus your effort on agent accuracy first. If you over-engineer the UI early, the project will stall.

Implement MVP frontend in < 200 lines of Python code possible with Gradio.
``` 

This is a complete, ready-to-use spec. Copy into a README.md or implement directly. If you need code snippets for Gradio setup, ask specifically.
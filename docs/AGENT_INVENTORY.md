# Agent Inventory Report

This document provides a comprehensive list of all agents in the `ai_engine/agents` module, their roles, and how they map to the user's requested capabilities.

---

## Summary: Total Agent Count

**Total Registered Agents: 27**

---

## Agent Mapping to User Requests

| User Requested Agent           | Existing Agent(s)                         | Status       |
|--------------------------------|-------------------------------------------|--------------|
| Survey Analysis Agent          | `SurveyMetaAnalysisAgent`                 | ✅ EXISTS    |
| Literature Review Agent        | `SystematicLiteratureReviewAgent`         | ✅ EXISTS    |
| Conference Paper Analysis Agent| `PaperDecompositionAgent`, `PaperUnderstandingAgent` | ✅ EXISTS    |
| Image Gathering Agent          | `VisualizationAgent` (uses ImageSearchProvider) | ✅ EXISTS    |
| Data Source Management Agent   | `DataSourceValidationAgent`               | ✅ EXISTS    |
| Web Scraping Agent             | `DataScraperAgent`                        | ✅ EXISTS    |
| Research Flow Generator Agent  | `OrchestratorAgent`, `ResearchQuestionEngineeringAgent` | ✅ EXISTS    |

---

## Detailed Agent List

### Orchestrator (Core Control)
| Agent Name           | Registry Key      | Role                                                                 |
|----------------------|-------------------|----------------------------------------------------------------------|
| `OrchestratorAgent`  | `orchestrator`    | Multi-Agent Orchestrator. Decomposes tasks, assigns roles (Scraper, Verifier, Writer, Editor), defines IO contracts, manages parallel execution. |

---

### Discovery Agents (Research Exploration)
| Agent Name                 | Registry Key          | Role                                                                 |
|----------------------------|-----------------------|----------------------------------------------------------------------|
| `DomainIntelligenceAgent`  | `domain_intelligence` | Gathers domain-specific knowledge and identifies key research areas. |
| `HistoricalReviewAgent`    | `historical_review`   | Analyzes the historical evolution of a research topic.               |

---

### Review Agents (Literature & Survey)
| Agent Name                        | Registry Key         | Role                                                                 |
|-----------------------------------|----------------------|----------------------------------------------------------------------|
| `SystematicLiteratureReviewAgent` | `slr`                | Conducts systematic literature reviews following PRISMA guidelines.  |
| `SurveyMetaAnalysisAgent`         | `survey_meta_analysis` | Performs meta-analysis of survey papers and aggregates findings.     |

---

### Synthesis Agents (Research Gap & Question)
| Agent Name                       | Registry Key           | Role                                                                 |
|----------------------------------|------------------------|----------------------------------------------------------------------|
| `GapSynthesisAgent`              | `gap_synthesis`        | Synthesizes research gaps from literature findings.                  |
| `ResearchQuestionEngineeringAgent` | `research_question`  | Formulates rigorous research questions based on identified gaps.     |
| `ConceptualFrameworkAgent`       | `conceptual_framework` | Designs conceptual frameworks for research studies.                  |

---

### Novelty Agents (Innovation & Validation)
| Agent Name                  | Registry Key            | Role                                                                 |
|-----------------------------|-------------------------|----------------------------------------------------------------------|
| `InnovationNoveltyAgent`    | `innovation_novelty`    | Evaluates the novelty and innovation level of research contributions.|
| `BaselineReproductionAgent` | `baseline_reproduction` | Reproduces baseline results for validation.                          |
| `ValidationRobustnessAgent` | `validation_robustness` | Tests the robustness of experimental results.                        |

---

### Understanding Agents (Paper Analysis)
| Agent Name               | Registry Key          | Role                                                                 |
|--------------------------|-----------------------|----------------------------------------------------------------------|
| `PaperDecompositionAgent`| `paper_decomposition` | Breaks down a research paper into its core components (abstract, methodology, results). |
| `PaperUnderstandingAgent`| `paper_understanding` | Provides deep comprehension and summarization of research papers.    |

---

### Verification Agents (Source & Data Validation)
| Agent Name                     | Registry Key               | Role                                                                 |
|--------------------------------|----------------------------|----------------------------------------------------------------------|
| `TechnicalVerificationAgent`   | `technical_verification`   | Verifies the technical correctness of claims in a paper.             |
| `DataSourceValidationAgent`    | `data_source_validation`   | Validates the authenticity and reliability of data sources.          |
| `ReproducibilityReasoningAgent`| `reproducibility_reasoning`| Assesses the reproducibility of experiments described in a paper.    |

---

### Chatbot Agents (Interactive Q&A)
| Agent Name                    | Registry Key            | Role                                                                 |
|-------------------------------|-------------------------|----------------------------------------------------------------------|
| `InteractivePaperChatbotAgent`| `interactive_chatbot`   | Provides an interactive Q&A interface for a specific paper.          |
| `ReviewerStyleCritiqueAgent`  | `reviewer_style_critique`| Provides feedback in the style of a peer reviewer.                   |

---

### Memory & Citation Agents
| Agent Name                 | Registry Key        | Role                                                                 |
|----------------------------|---------------------|----------------------------------------------------------------------|
| `MemoryKnowledgeGraphAgent`| `memory_graph`      | Builds and queries a knowledge graph from research findings.         |
| `CitationGraphAnalysisAgent`| `citation_analysis` | Analyzes citation networks and relationships between papers.         |

---

### Report Generation Agents (Writing & LaTeX)
| Agent Name              | Registry Key         | Role                                                                 |
|-------------------------|----------------------|----------------------------------------------------------------------|
| `ScientificWritingAgent`| `scientific_writing` | Senior NLP Research Scientist. Writes rigorous academic reports.     |
| `LaTeXGenerationAgent`  | `latex_generation`   | LaTeX Patch Engineer. Converts Markdown to LaTeX using domain templates. |
| `MultiStageReportAgent` | `multi_stage_report` | Orchestrates multi-stage report generation with domain-aware sections. |

---

### Critique Agents (Quality Assurance)
| Agent Name                      | Registry Key          | Role                                                                 |
|---------------------------------|-----------------------|----------------------------------------------------------------------|
| `ReviewerAdversarialCritiqueAgent`| `adversarial_critique`| Provides adversarial critique to identify weaknesses.                |
| `HallucinationDetectionAgent`   | `hallucination_detection`| Hallucination Prevention Guard. Detects and flags fabricated claims. |

---

### Scraper Agent (Web Data Collection)
| Agent Name         | Registry Key    | Role                                                                 |
|--------------------|-----------------|----------------------------------------------------------------------|
| `DataScraperAgent` | `data_scraper`  | Data Reliability Engineer. Scrapes PDFs, web pages, Arxiv, Wikipedia, Google. Validates sources. |

---

### Visualization Agent (Images & Charts)
| Agent Name          | Registry Key    | Role                                                                 |
|---------------------|-----------------|----------------------------------------------------------------------|
| `VisualizationAgent`| `visualization` | Generates Mermaid.js diagrams, AI image prompts, and searches/downloads images from Google. |

---

### News Agent (Current Events)
| Agent Name | Registry Key | Role                                                                 |
|------------|--------------|----------------------------------------------------------------------|
| `NewsAgent`| `news`       | Gathers current news and events related to a research topic.         |

---

### Scoring Agent (Source Quality)
| Agent Name    | Registry Key | Role                                                                 |
|---------------|--------------|----------------------------------------------------------------------|
| `ScoringAgent`| `scoring`    | Scores the relevance and quality of scraped sources.                 |

---

## Conclusion

All user-requested agent types are **already implemented** in the codebase. The existing agents fully cover:
- **Survey Analysis**: `SurveyMetaAnalysisAgent`
- **Literature Review**: `SystematicLiteratureReviewAgent`
- **Conference Paper Analysis**: `PaperDecompositionAgent` + `PaperUnderstandingAgent`
- **Image Gathering**: `VisualizationAgent` (with `ImageSearchProvider`)
- **Data Source Management**: `DataSourceValidationAgent`
- **Web Scraping**: `DataScraperAgent`
- **Research Flow Generation**: `OrchestratorAgent` + `ResearchQuestionEngineeringAgent`

No new agents need to be implemented. The workflow is connected through the `OrchestratorAgent` and the LangGraph pipeline defined in `ai_engine/graph/full_pipeline.py`.

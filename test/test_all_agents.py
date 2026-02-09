# =============================================================================
# AGENT TESTING SCRIPT
# =============================================================================
# Each section below can be copied into a Jupyter notebook cell
# Or run this entire script to test all agents sequentially
# =============================================================================

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# =============================================================================
# CELL 1: Setup and Imports
# =============================================================================

print("=" * 60)
print("SETTING UP ENVIRONMENT")
print("=" * 60)

from unittest.mock import MagicMock, patch
import json

# Mock the LLM to avoid actual API calls
def create_mock_llm():
    mock = MagicMock()
    mock.invoke.return_value.content = json.dumps({
        "status": "success",
        "message": "Mock response from LLM",
        "data": {"test": "value"}
    })
    return mock

print("[OK] Setup complete")

# =============================================================================
# CELL 2: Test OrchestratorAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 1: OrchestratorAgent")
print("=" * 60)

try:
    from ai_engine.agents.orchestrator.orchestrator import OrchestratorAgent
    agent = OrchestratorAgent()
    agent.llm = create_mock_llm()
    
    result = agent.run({"task": "Test research on AI transformers"})
    print("[OK] OrchestratorAgent initialized")
    print("     Name: " + agent.name)
    print("     Result keys: " + str(list(result.keys())))
except Exception as e:
    print("[FAIL] OrchestratorAgent FAILED: " + str(e))

# =============================================================================
# CELL 3: Test DataScraperAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 2: DataScraperAgent")
print("=" * 60)

try:
    from ai_engine.agents.scraper.agents import DataScraperAgent
    agent = DataScraperAgent()
    agent.llm = create_mock_llm()
    
    # Mock the providers to avoid real web calls
    agent.web_provider = MagicMock()
    agent.google_provider = MagicMock()
    agent.wiki_provider = MagicMock()
    agent.pdf_provider = MagicMock()
    agent.arxiv_provider = MagicMock()
    agent.html_provider = MagicMock()
    
    agent.wiki_provider.search.return_value = [{"title": "Test", "summary": "Test summary"}]
    agent.arxiv_provider.search_papers.return_value = []
    agent.google_provider.search.return_value = []
    
    result = agent.run({"task": "Test topic"})
    print("[OK] DataScraperAgent initialized")
    print("     Name: " + agent.name)
    print("     Result keys: " + str(list(result.keys())))
except Exception as e:
    print("[FAIL] DataScraperAgent FAILED: " + str(e))

# =============================================================================
# CELL 4: Test NewsAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 3: NewsAgent")
print("=" * 60)

try:
    from ai_engine.agents.news.agent import NewsAgent
    agent = NewsAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] NewsAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] NewsAgent FAILED: " + str(e))

# =============================================================================
# CELL 5: Test ScoringAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 4: ScoringAgent")
print("=" * 60)

try:
    from ai_engine.agents.scoring.agents import ScoringAgent
    agent = ScoringAgent()
    agent.llm = create_mock_llm()
    
    result = agent.run({"task": "Test", "findings": {}})
    print("[OK] ScoringAgent initialized")
    print("     Name: " + agent.name)
    print("     Result keys: " + str(list(result.keys())))
except Exception as e:
    print("[FAIL] ScoringAgent FAILED: " + str(e))

# =============================================================================
# CELL 6: Test DomainIntelligenceAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 5: DomainIntelligenceAgent")
print("=" * 60)

try:
    from ai_engine.agents.discovery.agents import DomainIntelligenceAgent
    agent = DomainIntelligenceAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] DomainIntelligenceAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] DomainIntelligenceAgent FAILED: " + str(e))

# =============================================================================
# CELL 7: Test HistoricalReviewAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 6: HistoricalReviewAgent")
print("=" * 60)

try:
    from ai_engine.agents.discovery.agents import HistoricalReviewAgent
    agent = HistoricalReviewAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] HistoricalReviewAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] HistoricalReviewAgent FAILED: " + str(e))

# =============================================================================
# CELL 8: Test SystematicLiteratureReviewAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 7: SystematicLiteratureReviewAgent")
print("=" * 60)

try:
    from ai_engine.agents.review.agents import SystematicLiteratureReviewAgent
    agent = SystematicLiteratureReviewAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] SystematicLiteratureReviewAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] SystematicLiteratureReviewAgent FAILED: " + str(e))

# =============================================================================
# CELL 9: Test SurveyMetaAnalysisAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 8: SurveyMetaAnalysisAgent")
print("=" * 60)

try:
    from ai_engine.agents.review.agents import SurveyMetaAnalysisAgent
    agent = SurveyMetaAnalysisAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] SurveyMetaAnalysisAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] SurveyMetaAnalysisAgent FAILED: " + str(e))

# =============================================================================
# CELL 10: Test GapSynthesisAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 9: GapSynthesisAgent")
print("=" * 60)

try:
    from ai_engine.agents.synthesis.agents import GapSynthesisAgent
    agent = GapSynthesisAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] GapSynthesisAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] GapSynthesisAgent FAILED: " + str(e))

# =============================================================================
# CELL 11: Test ResearchQuestionEngineeringAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 10: ResearchQuestionEngineeringAgent")
print("=" * 60)

try:
    from ai_engine.agents.synthesis.agents import ResearchQuestionEngineeringAgent
    agent = ResearchQuestionEngineeringAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] ResearchQuestionEngineeringAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] ResearchQuestionEngineeringAgent FAILED: " + str(e))

# =============================================================================
# CELL 12: Test ConceptualFrameworkAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 11: ConceptualFrameworkAgent")
print("=" * 60)

try:
    from ai_engine.agents.synthesis.agents import ConceptualFrameworkAgent
    agent = ConceptualFrameworkAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] ConceptualFrameworkAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] ConceptualFrameworkAgent FAILED: " + str(e))

# =============================================================================
# CELL 13: Test PaperDecompositionAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 12: PaperDecompositionAgent")
print("=" * 60)

try:
    from ai_engine.agents.understanding.agents import PaperDecompositionAgent
    agent = PaperDecompositionAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] PaperDecompositionAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] PaperDecompositionAgent FAILED: " + str(e))

# =============================================================================
# CELL 14: Test PaperUnderstandingAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 13: PaperUnderstandingAgent")
print("=" * 60)

try:
    from ai_engine.agents.understanding.agents import PaperUnderstandingAgent
    agent = PaperUnderstandingAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] PaperUnderstandingAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] PaperUnderstandingAgent FAILED: " + str(e))

# =============================================================================
# CELL 15: Test TechnicalVerificationAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 14: TechnicalVerificationAgent")
print("=" * 60)

try:
    from ai_engine.agents.verification.agents import TechnicalVerificationAgent
    agent = TechnicalVerificationAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] TechnicalVerificationAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] TechnicalVerificationAgent FAILED: " + str(e))

# =============================================================================
# CELL 16: Test DataSourceValidationAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 15: DataSourceValidationAgent")
print("=" * 60)

try:
    from ai_engine.agents.verification.agents import DataSourceValidationAgent
    agent = DataSourceValidationAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] DataSourceValidationAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] DataSourceValidationAgent FAILED: " + str(e))

# =============================================================================
# CELL 17: Test ReproducibilityReasoningAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 16: ReproducibilityReasoningAgent")
print("=" * 60)

try:
    from ai_engine.agents.verification.agents import ReproducibilityReasoningAgent
    agent = ReproducibilityReasoningAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] ReproducibilityReasoningAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] ReproducibilityReasoningAgent FAILED: " + str(e))

# =============================================================================
# CELL 18: Test InteractivePaperChatbotAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 17: InteractivePaperChatbotAgent")
print("=" * 60)

try:
    from ai_engine.agents.chatbot.agents import InteractivePaperChatbotAgent
    agent = InteractivePaperChatbotAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] InteractivePaperChatbotAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] InteractivePaperChatbotAgent FAILED: " + str(e))

# =============================================================================
# CELL 19: Test ReviewerStyleCritiqueAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 18: ReviewerStyleCritiqueAgent")
print("=" * 60)

try:
    from ai_engine.agents.chatbot.agents import ReviewerStyleCritiqueAgent
    agent = ReviewerStyleCritiqueAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] ReviewerStyleCritiqueAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] ReviewerStyleCritiqueAgent FAILED: " + str(e))

# =============================================================================
# CELL 20: Test MemoryKnowledgeGraphAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 19: MemoryKnowledgeGraphAgent")
print("=" * 60)

try:
    from ai_engine.agents.memory.agents import MemoryKnowledgeGraphAgent
    agent = MemoryKnowledgeGraphAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] MemoryKnowledgeGraphAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] MemoryKnowledgeGraphAgent FAILED: " + str(e))

# =============================================================================
# CELL 21: Test CitationGraphAnalysisAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 20: CitationGraphAnalysisAgent")
print("=" * 60)

try:
    from ai_engine.agents.memory.agents import CitationGraphAnalysisAgent
    agent = CitationGraphAnalysisAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] CitationGraphAnalysisAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] CitationGraphAnalysisAgent FAILED: " + str(e))

# =============================================================================
# CELL 22: Test ScientificWritingAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 21: ScientificWritingAgent")
print("=" * 60)

try:
    from ai_engine.agents.report.agents import ScientificWritingAgent
    agent = ScientificWritingAgent()
    agent.llm = create_mock_llm()
    
    result = agent.run({"task": "Test", "findings": {}})
    print("[OK] ScientificWritingAgent initialized")
    print("     Name: " + agent.name)
    print("     Result keys: " + str(list(result.keys())))
except Exception as e:
    print("[FAIL] ScientificWritingAgent FAILED: " + str(e))

# =============================================================================
# CELL 23: Test LaTeXGenerationAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 22: LaTeXGenerationAgent")
print("=" * 60)

try:
    from ai_engine.agents.report.agents import LaTeXGenerationAgent
    agent = LaTeXGenerationAgent()
    agent.llm = create_mock_llm()
    
    result = agent.run({
        "task": "Test", 
        "findings": {"scientific_writing": {"markdown_report": "# Test\n\n## Abstract\nTest"}},
        "_job_id": "test_job"
    })
    print("[OK] LaTeXGenerationAgent initialized")
    print("     Name: " + agent.name)
    print("     Result keys: " + str(list(result.keys())))
except Exception as e:
    print("[FAIL] LaTeXGenerationAgent FAILED: " + str(e))

# =============================================================================
# CELL 24: Test ReviewerAdversarialCritiqueAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 23: ReviewerAdversarialCritiqueAgent")
print("=" * 60)

try:
    from ai_engine.agents.critique.agents import ReviewerAdversarialCritiqueAgent
    agent = ReviewerAdversarialCritiqueAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] ReviewerAdversarialCritiqueAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] ReviewerAdversarialCritiqueAgent FAILED: " + str(e))

# =============================================================================
# CELL 25: Test HallucinationDetectionAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 24: HallucinationDetectionAgent")
print("=" * 60)

try:
    from ai_engine.agents.critique.agents import HallucinationDetectionAgent
    agent = HallucinationDetectionAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] HallucinationDetectionAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] HallucinationDetectionAgent FAILED: " + str(e))

# =============================================================================
# CELL 26: Test VisualizationAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 25: VisualizationAgent")
print("=" * 60)

try:
    from ai_engine.agents.visualization.agents import VisualizationAgent
    agent = VisualizationAgent()
    agent.llm = create_mock_llm()
    
    print("[OK] VisualizationAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] VisualizationAgent FAILED: " + str(e))

# =============================================================================
# CELL 27: Test MultiStageReportAgent
# =============================================================================

print("\n" + "=" * 60)
print("TEST 26: MultiStageReportAgent")
print("=" * 60)

try:
    from ai_engine.agents.report.pipeline import MultiStageReportAgent
    agent = MultiStageReportAgent()
    
    print("[OK] MultiStageReportAgent initialized")
    print("     Name: " + agent.name)
except Exception as e:
    print("[FAIL] MultiStageReportAgent FAILED: " + str(e))

# =============================================================================
# CELL 28: Summary
# =============================================================================

print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)
print("All agent initialization tests completed.")
print("Check output above for any [FAIL] failures.")

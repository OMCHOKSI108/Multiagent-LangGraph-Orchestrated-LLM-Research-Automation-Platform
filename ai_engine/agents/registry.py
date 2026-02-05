from typing import Dict, Any
from .base import BaseAgent
import config

# Import Orchestrator
from .orchestrator.orchestrator import OrchestratorAgent

# Import Pipeline A Agents
from .discovery.agents import DomainIntelligenceAgent, HistoricalReviewAgent
from .review.agents import SystematicLiteratureReviewAgent, SurveyMetaAnalysisAgent
from .synthesis.agents import GapSynthesisAgent, ResearchQuestionEngineeringAgent, ConceptualFrameworkAgent
from .novelty.agents import InnovationNoveltyAgent, BaselineReproductionAgent, ValidationRobustnessAgent

# Import Pipeline B Agents
from .understanding.agents import PaperDecompositionAgent, PaperUnderstandingAgent
from .verification.agents import TechnicalVerificationAgent, DataSourceValidationAgent, ReproducibilityReasoningAgent
from .chatbot.agents import InteractivePaperChatbotAgent, ReviewerStyleCritiqueAgent

# Import Shared Agents
from .memory.agents import MemoryKnowledgeGraphAgent, CitationGraphAnalysisAgent
from .report.agents import ScientificWritingAgent, LaTeXGenerationAgent
from .critique.agents import ReviewerAdversarialCritiqueAgent, HallucinationDetectionAgent

# Import Scraper
from .scraper.agents import DataScraperAgent
from .visualization.agents import VisualizationAgent

# Instantiate All Agents with Specialized Models
AGENTS: Dict[str, BaseAgent] = {
    # Orchestrator (Reasoning)
    "orchestrator": OrchestratorAgent(), # Uses default reasoning model

    # Scraper (New)
    "data_scraper": DataScraperAgent(),
    
    # Discovery (Reasoning)
    "domain_intelligence": DomainIntelligenceAgent(model_name=config.MODEL_REASONING),
    "historical_review": HistoricalReviewAgent(model_name=config.MODEL_REASONING),
    
    # Review (Reasoning/Writing)
    # Note: Agents in other files need to be updated to accept **kwargs first, 
    # but strictly speaking Python's super().__init__ calls need to propogate it.
    # For now, we assume we will update all agent classes to accept **kwargs.
    "slr": SystematicLiteratureReviewAgent(), 
    "survey_meta_analysis": SurveyMetaAnalysisAgent(),
    "gap_synthesis": GapSynthesisAgent(),
    "research_question": ResearchQuestionEngineeringAgent(),
    "conceptual_framework": ConceptualFrameworkAgent(),
    "innovation_novelty": InnovationNoveltyAgent(),
    "baseline_reproduction": BaselineReproductionAgent(),
    "validation_robustness": ValidationRobustnessAgent(),
    
    # Pipeline B (Reasoning/Critical)
    "paper_decomposition": PaperDecompositionAgent(model_name=config.MODEL_REASONING),
    "paper_understanding": PaperUnderstandingAgent(model_name=config.MODEL_REASONING),
    "technical_verification": TechnicalVerificationAgent(model_name=config.MODEL_CRITICAL), # Gemma2
    "data_source_validation": DataSourceValidationAgent(model_name=config.MODEL_CRITICAL), # Gemma2
    "reproducibility_reasoning": ReproducibilityReasoningAgent(model_name=config.MODEL_CRITICAL), # Gemma2
    "interactive_chatbot": InteractivePaperChatbotAgent(model_name=config.MODEL_WRITING),
    "reviewer_style_critique": ReviewerStyleCritiqueAgent(model_name=config.MODEL_CRITICAL),
    
    # Shared (Writing/Coding)
    "memory_graph": MemoryKnowledgeGraphAgent(model_name=config.MODEL_CODING), # JSON heavy
    "citation_analysis": CitationGraphAnalysisAgent(model_name=config.MODEL_CODING),
    "scientific_writing": ScientificWritingAgent(model_name=config.MODEL_WRITING), # Mistral
    "latex_generation": LaTeXGenerationAgent(model_name=config.MODEL_CODING), # CodeLlama
    "adversarial_critique": ReviewerAdversarialCritiqueAgent(model_name=config.MODEL_CRITICAL), # Gemma2
    "hallucination_detection": HallucinationDetectionAgent(model_name=config.MODEL_CRITICAL),
    
    # Visualization (New)
    "visualization": VisualizationAgent(model_name=config.MODEL_CODING) # CodeLlama is good for Syntax
}

from typing import Dict, Any, Optional
import logging
import importlib

try:
    import config
except ImportError:
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import config

from .base import BaseAgent

logger = logging.getLogger("ai_engine.registry")


class _LazyAgent:
    """
    Defers agent construction until first attribute access or call.
    On first use it imports the module, instantiates the class with
    the captured kwargs, caches the result, and delegates all future
    attribute access to the real instance.
    """

    __slots__ = ("_module", "_cls_name", "_kwargs", "_instance")

    def __init__(self, module: str, cls_name: str, **kwargs):
        object.__setattr__(self, "_module", module)
        object.__setattr__(self, "_cls_name", cls_name)
        object.__setattr__(self, "_kwargs", kwargs)
        object.__setattr__(self, "_instance", None)

    def _resolve(self):
        inst = object.__getattribute__(self, "_instance")
        if inst is not None:
            return inst
        mod_path = object.__getattribute__(self, "_module")
        cls_name = object.__getattribute__(self, "_cls_name")
        kwargs = object.__getattribute__(self, "_kwargs")
        logger.info(f"Lazy-loading agent: {cls_name} from {mod_path}")
        mod = importlib.import_module(mod_path, package="agents")
        cls = getattr(mod, cls_name)
        inst = cls(**kwargs) if kwargs else cls()
        object.__setattr__(self, "_instance", inst)
        return inst

    def __getattr__(self, name):
        return getattr(self._resolve(), name)

    def __call__(self, *args, **kwargs):
        return self._resolve()(*args, **kwargs)


def _lazy(module: str, cls_name: str, **kwargs) -> _LazyAgent:
    """Convenience helper to register a lazy agent."""
    return _lazy_or_none(module, cls_name, **kwargs)


def _lazy_or_none(module: str, cls_name: str, **kwargs) -> Optional[_LazyAgent]:
    """Returns a lazy proxy; if the module doesn't exist, returns None."""
    try:
        # Quick check that the module can be found (doesn't load it)
        importlib.util.find_spec(module, package="agents")
        return _LazyAgent(module, cls_name, **kwargs)
    except (ModuleNotFoundError, ValueError):
        logger.warning(f"Module {module} not found, skipping agent {cls_name}")
        return None


# ---------------------------------------------------------------------------
# Agent Registry — fully lazy, nothing is instantiated at import time
# ---------------------------------------------------------------------------
AGENTS: Dict[str, Any] = {
    # PHASE 0: Topic Discovery (MUST run first)
    "topic_discovery": _lazy(".topic.agents", "TopicDiscoveryAgent"),
    "topic_lock": _lazy(".topic.agents", "TopicLockAgent"),

    # Orchestrator (Reasoning)
    "orchestrator": _lazy(".orchestrator.orchestrator", "OrchestratorAgent"),

    # Scraper
    "data_scraper": _lazy(".scraper.agents", "DataScraperAgent"),

    # News
    "news": _lazy(".news.agent", "NewsAgent"),

    # Scoring
    "scoring": _lazy(".scoring.agents", "ScoringAgent"),

    # Discovery (Reasoning)
    "domain_intelligence": _lazy(".discovery.agents", "DomainIntelligenceAgent", model_name=config.MODEL_REASONING),
    "historical_review": _lazy(".discovery.agents", "HistoricalReviewAgent", model_name=config.MODEL_REASONING),

    # Review (Reasoning/Writing)
    "slr": _lazy(".review.agents", "SystematicLiteratureReviewAgent"),
    "survey_meta_analysis": _lazy(".review.agents", "SurveyMetaAnalysisAgent"),
    "gap_synthesis": _lazy(".synthesis.agents", "GapSynthesisAgent"),
    "research_question": _lazy(".synthesis.agents", "ResearchQuestionEngineeringAgent"),
    "conceptual_framework": _lazy(".synthesis.agents", "ConceptualFrameworkAgent"),
    "innovation_novelty": _lazy_or_none(".novelty.agents", "InnovationNoveltyAgent"),
    "baseline_reproduction": _lazy_or_none(".novelty.agents", "BaselineReproductionAgent"),
    "validation_robustness": _lazy_or_none(".novelty.agents", "ValidationRobustnessAgent"),

    # Pipeline B (Reasoning/Critical)
    "paper_decomposition": _lazy(".understanding.agents", "PaperDecompositionAgent", model_name=config.MODEL_REASONING),
    "paper_understanding": _lazy(".understanding.agents", "PaperUnderstandingAgent", model_name=config.MODEL_REASONING),
    "technical_verification": _lazy(".verification.agents", "TechnicalVerificationAgent", model_name=config.MODEL_CRITICAL),
    "data_source_validation": _lazy(".verification.agents", "DataSourceValidationAgent", model_name=config.MODEL_CRITICAL),
    "reproducibility_reasoning": _lazy(".verification.agents", "ReproducibilityReasoningAgent", model_name=config.MODEL_CRITICAL),
    "interactive_chatbot": _lazy(".chatbot.agents", "InteractivePaperChatbotAgent", model_name=config.MODEL_WRITING),
    "reviewer_style_critique": _lazy(".chatbot.agents", "ReviewerStyleCritiqueAgent", model_name=config.MODEL_CRITICAL),

    # Shared (Writing/Coding)
    "memory_graph": _lazy(".memory.agents", "MemoryKnowledgeGraphAgent", model_name=config.MODEL_CODING),
    "citation_analysis": _lazy(".memory.agents", "CitationGraphAnalysisAgent", model_name=config.MODEL_CODING),
    "scientific_writing": _lazy(".report.agents", "ScientificWritingAgent", model_name=config.MODEL_WRITING),
    "latex_generation": _lazy(".report.agents", "LaTeXGenerationAgent", model_name=config.MODEL_CODING),
    "adversarial_critique": _lazy(".critique.agents", "ReviewerAdversarialCritiqueAgent", model_name=config.MODEL_CRITICAL),
    "hallucination_detection": _lazy(".critique.agents", "HallucinationDetectionAgent", model_name=config.MODEL_CRITICAL),

    # Visualization
    "visualization": _lazy(".visualization.agents", "VisualizationAgent", model_name=config.MODEL_CODING),

    # Multi-Stage Report
    "multi_stage_report": _lazy(".report.pipeline", "MultiStageReportAgent"),

    # PHASE 5: Section Re-Research
    "section_reresearch": _lazy(".reresearch.agents", "SectionReResearchAgent", model_name=config.MODEL_REASONING),
}

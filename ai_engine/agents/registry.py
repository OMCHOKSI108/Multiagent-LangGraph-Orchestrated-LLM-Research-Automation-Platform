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


class _LazyAgent(BaseAgent):
    """
    Defers agent construction until first attribute access or call.
    On first use it imports the module, instantiates the class with
    the captured kwargs, caches the result, and delegates all future
    attribute access to the real instance.
    """

    def __init__(self, module: str, cls_name: str, **kwargs):
        # NOTE: We intentionally do NOT call BaseAgent.__init__ here because that
        # eagerly constructs an LLM provider. This proxy resolves to a real agent
        # instance on first use.
        self._module = module
        self._cls_name = cls_name
        self._kwargs = kwargs
        self._instance = None
        self._overrides: Dict[str, Any] = {}

        # Provide the attributes tests and call sites expect without forcing
        # resolution (and thus avoiding side effects at import time).
        # IMPORTANT: set these via object.__setattr__ so they do not end up in
        # _overrides, otherwise they would overwrite the real agent instance
        # attributes (including the constructed LLM wrapper) when resolved.
        object.__setattr__(self, "name", cls_name)
        object.__setattr__(self, "system_prompt", "")
        object.__setattr__(self, "model_name", kwargs.get("model_name"))
        object.__setattr__(self, "llm", None)

    def __setattr__(self, name: str, value: Any) -> None:
        if name.startswith("_"):
            object.__setattr__(self, name, value)
            return

        # Always set attributes on the proxy itself so unittest.mock.patch can
        # reliably clean up via delattr() even if the underlying instance is
        # already resolved.
        object.__setattr__(self, name, value)
        self._overrides[name] = value

        # Best-effort propagation for stateful overrides (e.g. llm mocks) when
        # the real agent is already resolved. Do NOT propagate patched `run`
        # into the underlying instance to avoid cross-test leakage.
        inst = self.__dict__.get("_instance")
        if inst is not None and name != "run":
            try:
                setattr(inst, name, value)
            except Exception:
                pass

    def __delattr__(self, name: str) -> None:
        if name.startswith("_"):
            object.__delattr__(self, name)
            return

        overrides = self.__dict__.get("_overrides")
        if isinstance(overrides, dict):
            overrides.pop(name, None)

        if name in self.__dict__:
            object.__delattr__(self, name)
            return
        raise AttributeError(name)

    def _apply_overrides(self, inst: BaseAgent) -> None:
        for key, value in self._overrides.items():
            if key == "run":
                # `run` may be patched on the proxy via unittest.mock.patch.
                # Applying it to the underlying instance makes patch cleanup
                # unreliable and can leak across tests.
                continue
            try:
                setattr(inst, key, value)
            except Exception:
                # Best-effort: overrides are primarily for tests (e.g. llm mocks)
                pass

    def _resolve(self):
        inst = self._instance
        if inst is not None:
            return inst
        mod_path = self._module
        cls_name = self._cls_name
        kwargs = self._kwargs
        logger.info(f"Lazy-loading agent: {cls_name} from {mod_path}")

        # Try to resolve module path.
        # In Docker, WORKDIR is the engine root, so 'agents.topic' is correct.
        # In some local dev setups, 'ai_engine.agents.topic' might be expected.
        full_module = mod_path
        if mod_path.startswith("."):
            # Try both possibilities
            try:
                full_module = "agents" + mod_path
                mod = importlib.import_module(full_module)
            except ImportError:
                try:
                    full_module = "ai_engine.agents" + mod_path
                    mod = importlib.import_module(full_module)
                except ImportError:
                    # Final fallback/classic behavior to let it raise original error
                    full_module = "ai_engine.agents" + mod_path
                    mod = importlib.import_module(full_module)
        else:
            mod = importlib.import_module(full_module)
        cls = getattr(mod, cls_name)
        inst = cls(**kwargs) if kwargs else cls()
        self._apply_overrides(inst)
        self._instance = inst
        return inst

    def __getattr__(self, name):
        return getattr(self._resolve(), name)

    def __call__(self, *args, **kwargs):
        return self._resolve()(*args, **kwargs)

    def run(self, state: dict) -> dict:
        return self._resolve().run(state)


def _lazy(module: str, cls_name: str, **kwargs) -> _LazyAgent:
    """Convenience helper to register a lazy agent."""
    return _lazy_or_none(module, cls_name, **kwargs)


def _lazy_or_none(module: str, cls_name: str, **kwargs):
    """Returns a lazy proxy; if the module doesn't exist, returns None."""
    # Always return the lazy agent - we'll catch import errors at resolve time
    # This allows the notebook to work even if some agents fail to load
    return _LazyAgent(module, cls_name, **kwargs)


# ---------------------------------------------------------------------------
# Agent Registry — fully lazy, nothing is instantiated at import time
# ---------------------------------------------------------------------------
AGENTS: Dict[str, Any] = {
    # PHASE 0: Topic Discovery (MUST run first)
    "topic_discovery": _lazy(".topic.agents", "TopicDiscoveryAgent"),
    "topic_lock": _lazy(".topic.agents", "TopicLockAgent"),
    # Orchestrator (Reasoning)
    "orchestrator": _lazy(".orchestrator.orchestrator", "OrchestratorAgent"),
    # Central Brain — chain-of-thought reasoning engine
    "central_brain": _lazy(".brain.central_brain", "CentralBrainAgent"),
    # Scraper
    "data_scraper": _lazy(".scraper.agents", "DataScraperAgent"),
    # News
    "news": _lazy(".news.agent", "NewsAgent"),
    # Scoring
    "scoring": _lazy(".scoring.agents", "ScoringAgent"),
    # Discovery (Reasoning)
    "domain_intelligence": _lazy(
        ".discovery.agents",
        "DomainIntelligenceAgent",
        model_name=config.MODEL_REASONING,
    ),
    "historical_review": _lazy(
        ".discovery.agents", "HistoricalReviewAgent", model_name=config.MODEL_REASONING
    ),
    # Review (Reasoning/Writing)
    "slr": _lazy(".review.agents", "SystematicLiteratureReviewAgent"),
    "survey_meta_analysis": _lazy(".review.agents", "SurveyMetaAnalysisAgent"),
    "gap_synthesis": _lazy(".synthesis.agents", "GapSynthesisAgent"),
    "research_question": _lazy(".synthesis.agents", "ResearchQuestionEngineeringAgent"),
    "conceptual_framework": _lazy(".synthesis.agents", "ConceptualFrameworkAgent"),
    "innovation_novelty": _lazy_or_none(".novelty.agents", "InnovationNoveltyAgent"),
    "baseline_reproduction": _lazy_or_none(
        ".novelty.agents", "BaselineReproductionAgent"
    ),
    "validation_robustness": _lazy_or_none(
        ".novelty.agents", "ValidationRobustnessAgent"
    ),
    # Pipeline B (Reasoning/Critical)
    "paper_decomposition": _lazy(
        ".understanding.agents",
        "PaperDecompositionAgent",
        model_name=config.MODEL_REASONING,
    ),
    "paper_understanding": _lazy(
        ".understanding.agents",
        "PaperUnderstandingAgent",
        model_name=config.MODEL_REASONING,
    ),
    "technical_verification": _lazy(
        ".verification.agents",
        "TechnicalVerificationAgent",
        model_name=config.MODEL_CRITICAL,
    ),
    "data_source_validation": _lazy(
        ".verification.agents",
        "DataSourceValidationAgent",
        model_name=config.MODEL_CRITICAL,
    ),
    "reproducibility_reasoning": _lazy(
        ".verification.agents",
        "ReproducibilityReasoningAgent",
        model_name=config.MODEL_CRITICAL,
    ),
    "interactive_chatbot": _lazy(
        ".chatbot.agents",
        "InteractivePaperChatbotAgent",
        model_name=config.MODEL_WRITING,
    ),
    "reviewer_style_critique": _lazy(
        ".chatbot.agents",
        "ReviewerStyleCritiqueAgent",
        model_name=config.MODEL_CRITICAL,
    ),
    # Shared (Writing/Coding)
    "memory_graph": _lazy(
        ".memory.agents", "MemoryKnowledgeGraphAgent", model_name=config.MODEL_CODING
    ),
    "citation_analysis": _lazy(
        ".memory.agents", "CitationGraphAnalysisAgent", model_name=config.MODEL_CODING
    ),
    "scientific_writing": _lazy(
        ".report.agents", "ScientificWritingAgent", model_name=config.MODEL_WRITING
    ),
    "latex_generation": _lazy(
        ".report.agents", "LaTeXGenerationAgent", model_name=config.MODEL_CODING
    ),
    "adversarial_critique": _lazy(
        ".critique.agents",
        "ReviewerAdversarialCritiqueAgent",
        model_name=config.MODEL_CRITICAL,
    ),
    "hallucination_detection": _lazy(
        ".critique.agents",
        "HallucinationDetectionAgent",
        model_name=config.MODEL_CRITICAL,
    ),
    # Visualization
    "visualization": _lazy(
        ".visualization.agents", "VisualizationAgent", model_name=config.MODEL_CODING
    ),
    # Multi-Stage Report
    "multi_stage_report": _lazy(".report.pipeline", "MultiStageReportAgent"),
    # PHASE 5: Section Re-Research
    "section_reresearch": _lazy(
        ".reresearch.agents",
        "SectionReResearchAgent",
        model_name=config.MODEL_REASONING,
    ),
    # ── MARP New Agents ──────────────────────────────────────────────────
    # Query Router — classifies user messages into direct/search/deep
    "query_planner": _lazy(
        ".planner.query_planner", "QueryPlannerAgent", model_name=config.MODEL_CODING
    ),
    # Web Scraper — 7-strategy search+scrape+synthesize
    "web_scraper": _lazy(
        ".scraper.web_scraper", "WebScraperAgent", model_name=config.MODEL_WRITING
    ),
    # Data Cleaner — deterministic + LLM quality filtering
    "data_cleaner": _lazy(
        ".processing.cleaner", "DataCleanerAgent", model_name=config.MODEL_REASONING
    ),
    # IEEE Paper Generator — full academic paper + conversational editing
    "ieee_paper": _lazy(
        ".report.ieee_paper", "IEEEPaperAgent", model_name=config.MODEL_WRITING
    ),
    # ── Conversational & Fast Chat ──────────────────────────────────────────
    "conversational": _lazy(".chatbot.conversational", "ConversationalAgent"),
    "editor": _lazy(".report.editor", "EditorAgent"),
    # Image Intelligence — academic suitability scoring (replaces VisionAgent)
    "image_intelligence": _lazy(".vision.agents", "ImageIntelligenceAgent"),
    # Keep legacy alias so any external callers don't break
    "vision_analysis": _lazy(".vision.agents", "ImageIntelligenceAgent"),
}

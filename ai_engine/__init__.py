"""
Multi-Agent LLM Research Automation Platform

A sophisticated multi-agent system for automated research analysis,
literature review, and academic paper understanding.
"""

__version__ = "2.0.0"
__author__ = "Research Team"
__email__ = "research@example.com"

# Core components
from .agents.base import BaseAgent
from .agents.registry import AGENTS
from .utils.token_tracker import get_global_tracker, track_agent_usage
from .utils.event_emitter import emit_event, set_job_context

__all__ = [
    "BaseAgent",
    "AGENTS", 
    "get_global_tracker",
    "track_agent_usage",
    "emit_event",
    "set_job_context",
]

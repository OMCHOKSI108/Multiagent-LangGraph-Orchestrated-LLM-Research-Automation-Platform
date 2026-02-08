"""
Token Tracker for LLM Usage Analytics

Tracks token usage across agents and models, providing cost estimation
and usage analytics for research operations.
"""
import time
import json
import os
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import threading
from pathlib import Path

# Thread-safe singleton for global token tracking
_tracker_lock = threading.Lock()
_global_tracker: Optional['TokenTracker'] = None

@dataclass
class TokenUsage:
    """Individual token usage record"""
    timestamp: str
    agent_name: str
    model_name: str
    job_id: Optional[str]
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    execution_time_ms: int
    success: bool
    error_message: Optional[str] = None

class TokenTracker:
    """Thread-safe token usage tracker with persistence"""
    
    # Cost per 1K tokens (rough estimates in USD)
    MODEL_COSTS = {
        # Ollama models (free but compute cost)
        "phi3:mini": {"prompt": 0.0, "completion": 0.0},
        "gemma2:2b": {"prompt": 0.0, "completion": 0.0},
        "qwen2.5-coder:1.5b": {"prompt": 0.0, "completion": 0.0},
        
        # Online API costs (approximate)
        "gemini-1.5-flash": {"prompt": 0.00035, "completion": 0.0014},
        "llama3-70b-8192": {"prompt": 0.0008, "completion": 0.0008},
        
        # Default fallback
        "default": {"prompt": 0.0001, "completion": 0.0002}
    }
    
    def __init__(self, persist_path: Optional[str] = None):
        self.persist_path = persist_path or self._default_persist_path()
        self.usage_records: List[TokenUsage] = []
        self._lock = threading.Lock()
        self._load_from_disk()
    
    def _default_persist_path(self) -> str:
        """Default path for persisting token usage data"""
        data_dir = Path(__file__).parent.parent / "data"
        data_dir.mkdir(exist_ok=True)
        return str(data_dir / "token_usage.json")
    
    def _load_from_disk(self):
        """Load existing usage data from disk"""
        if os.path.exists(self.persist_path):
            try:
                with open(self.persist_path, 'r') as f:
                    data = json.load(f)
                    self.usage_records = [TokenUsage(**record) for record in data.get('records', [])]
            except (json.JSONDecodeError, TypeError) as e:
                print(f"[TokenTracker] Warning: Could not load existing data: {e}")
                self.usage_records = []
    
    def _save_to_disk(self):
        """Persist usage data to disk"""
        try:
            os.makedirs(os.path.dirname(self.persist_path), exist_ok=True)
            data = {
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'records': [asdict(record) for record in self.usage_records]
            }
            with open(self.persist_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[TokenTracker] Warning: Could not save data: {e}")
    
    def estimate_tokens(self, text: str) -> int:
        """Estimate token count (4 chars ≈ 1 token for English)"""
        return max(1, len(text) // 4)
    
    def get_model_cost(self, model_name: str) -> Dict[str, float]:
        """Get cost per 1K tokens for a model"""
        return self.MODEL_COSTS.get(model_name, self.MODEL_COSTS["default"])
    
    def calculate_cost(self, model_name: str, prompt_tokens: int, completion_tokens: int) -> float:
        """Calculate estimated cost in USD"""
        costs = self.get_model_cost(model_name)
        prompt_cost = (prompt_tokens / 1000) * costs["prompt"]
        completion_cost = (completion_tokens / 1000) * costs["completion"]
        return prompt_cost + completion_cost
    
    def track_usage(
        self,
        agent_name: str,
        model_name: str,
        prompt_text: str,
        completion_text: str,
        execution_time_ms: int,
        job_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> TokenUsage:
        """Record token usage for an agent execution"""
        
        prompt_tokens = self.estimate_tokens(prompt_text)
        completion_tokens = self.estimate_tokens(completion_text)
        total_tokens = prompt_tokens + completion_tokens
        estimated_cost = self.calculate_cost(model_name, prompt_tokens, completion_tokens)
        
        usage = TokenUsage(
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_name=agent_name,
            model_name=model_name,
            job_id=job_id,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            estimated_cost=estimated_cost,
            execution_time_ms=execution_time_ms,
            success=success,
            error_message=error_message
        )
        
        with self._lock:
            self.usage_records.append(usage)
            self._save_to_disk()
        
        return usage
    
    def get_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get usage statistics for the last N hours"""
        cutoff = datetime.now(timezone.utc).timestamp() - (hours * 3600)
        
        with self._lock:
            recent_records = [
                r for r in self.usage_records
                if datetime.fromisoformat(r.timestamp.replace('Z', '+00:00')).timestamp() > cutoff
            ]
        
        if not recent_records:
            return {
                "period_hours": hours,
                "total_requests": 0,
                "total_tokens": 0,
                "total_cost": 0.0,
                "by_agent": {},
                "by_model": {},
                "success_rate": 0.0
            }
        
        # Aggregate stats
        total_tokens = sum(r.total_tokens for r in recent_records)
        total_cost = sum(r.estimated_cost for r in recent_records)
        successful = sum(1 for r in recent_records if r.success)
        
        # By agent
        by_agent = {}
        for record in recent_records:
            agent = record.agent_name
            if agent not in by_agent:
                by_agent[agent] = {"requests": 0, "tokens": 0, "cost": 0.0}
            by_agent[agent]["requests"] += 1
            by_agent[agent]["tokens"] += record.total_tokens
            by_agent[agent]["cost"] += record.estimated_cost
        
        # By model
        by_model = {}
        for record in recent_records:
            model = record.model_name
            if model not in by_model:
                by_model[model] = {"requests": 0, "tokens": 0, "cost": 0.0}
            by_model[model]["requests"] += 1
            by_model[model]["tokens"] += record.total_tokens
            by_model[model]["cost"] += record.estimated_cost
        
        return {
            "period_hours": hours,
            "total_requests": len(recent_records),
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "avg_tokens_per_request": round(total_tokens / len(recent_records), 2),
            "success_rate": round((successful / len(recent_records)) * 100, 1),
            "by_agent": by_agent,
            "by_model": by_model
        }
    
    def get_job_stats(self, job_id: str) -> Dict[str, Any]:
        """Get usage statistics for a specific job"""
        with self._lock:
            job_records = [r for r in self.usage_records if r.job_id == job_id]
        
        if not job_records:
            return {"job_id": job_id, "found": False}
        
        total_tokens = sum(r.total_tokens for r in job_records)
        total_cost = sum(r.estimated_cost for r in job_records)
        total_time_ms = sum(r.execution_time_ms for r in job_records)
        
        return {
            "job_id": job_id,
            "found": True,
            "agents_used": len(set(r.agent_name for r in job_records)),
            "total_requests": len(job_records),
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 4),
            "total_time_ms": total_time_ms,
            "agents": list(set(r.agent_name for r in job_records)),
            "models": list(set(r.model_name for r in job_records))
        }

def get_global_tracker() -> TokenTracker:
    """Get the global token tracker instance (thread-safe singleton)"""
    global _global_tracker
    
    if _global_tracker is None:
        with _tracker_lock:
            if _global_tracker is None:
                _global_tracker = TokenTracker()
    
    return _global_tracker

def track_agent_usage(
    agent_name: str,
    model_name: str,
    prompt_text: str,
    completion_text: str,
    execution_time_ms: int,
    job_id: Optional[str] = None,
    success: bool = True,
    error_message: Optional[str] = None
) -> TokenUsage:
    """Convenience function to track usage with global tracker"""
    tracker = get_global_tracker()
    return tracker.track_usage(
        agent_name=agent_name,
        model_name=model_name,
        prompt_text=prompt_text,
        completion_text=completion_text,
        execution_time_ms=execution_time_ms,
        job_id=job_id,
        success=success,
        error_message=error_message
    )

def get_usage_stats(hours: int = 24) -> Dict[str, Any]:
    """Get usage statistics from global tracker"""
    tracker = get_global_tracker()
    return tracker.get_stats(hours)

def get_job_usage(job_id: str) -> Dict[str, Any]:
    """Get usage statistics for a job from global tracker"""
    tracker = get_global_tracker()
    return tracker.get_job_stats(job_id)

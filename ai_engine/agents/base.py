from typing import Dict, Any, Optional
from langchain_core.messages import SystemMessage, HumanMessage

# ============================
# LLM Provider Abstraction
# ============================
# All LLM instantiation is now handled by the llm/ package.
# This provides automatic mode switching (OFFLINE/ONLINE),
# multi-key rotation for Groq, and rate-limit handling.
from llm.factory import get_llm_provider

try:
    import config
except ImportError:
    # Fallback for when running from different contexts
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import config
import logging
import json
import re
import time

# Import event emitter for live transparency
from utils.event_emitter import emit_agent_start, emit_agent_complete, emit_error
# Import token tracking
from utils.token_tracker import track_agent_usage
from utils.metrics import inc as metrics_inc, timing as metrics_timing

logger = logging.getLogger("ai_engine.agents")



class BaseAgent:
    # Token limits per model (approximate)
    TOKEN_LIMITS = {
        "phi3:mini": 4096,
        "gemma2:2b": 8192,
        "qwen2.5-coder:1.5b": 4096,
        "default": 4096
    }
    
    def __init__(self, name: str, system_prompt: str, model_name: Optional[str] = None):
        self.name = name
        self.system_prompt = system_prompt
        self.model_name = model_name or config.MODEL_REASONING
        self.max_context_tokens = self.TOKEN_LIMITS.get(self.model_name, self.TOKEN_LIMITS["default"])
        self.llm = self._get_llm()

    def _get_llm(self):
        """
        Returns the configured LLM client via the provider factory.

        The factory reads LLM_STATUS from config and returns the appropriate
        provider (OllamaProvider or GroqProvider). Caching, key rotation,
        and fallback logic are handled inside the factory.
        """
        provider = get_llm_provider(self.model_name)
        logger.info(f"[{self.name}] Using {provider.provider_name}: {self.model_name}")
        return provider.get_langchain_llm()


    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token for English)."""
        return len(text) // 4

    def _smart_truncate(self, text: str, max_chars: int) -> str:
        """
        Truncates text while attempting to preserve JSON structure for lists/dicts.
        """
        if len(text) <= max_chars:
            return text
            
        # Try to parse as JSON
        try:
            data = json.loads(text)
            if isinstance(data, list):
                # Truncate list by items
                while len(json.dumps(data)) > max_chars and len(data) > 0:
                    data.pop()
                return json.dumps(data)
            elif isinstance(data, dict):
                # Truncate dict by keys
                while len(json.dumps(data)) > max_chars and len(data) > 0:
                    data.popitem()
                return json.dumps(data)
        except:
            pass
            
        # Fallback to string slicing
        return text[:max_chars] + "...(truncated)"

    def _truncate_context(self, state: Dict[str, Any], max_tokens: int) -> str:
        """
        Intelligently truncates context to fit within token limits.
        Prioritizes task and recent findings over older data.
        """
        # Always include core info
        core = {
            "task": state.get("task", ""),
            "paper_url": state.get("paper_url", ""),
            "_job_id": state.get("_job_id", "")
        }
        core_str = json.dumps(core)
        # Convert max_tokens to approx chars (1 token ~= 4 chars)
        max_chars = max_tokens * 4
        remaining_chars = max_chars - len(core_str) - 2000  # Buffer
        
        findings = state.get("findings", {})
        if not findings or remaining_chars <= 0:
            return json.dumps(state)
        
        # Prioritize most recent/relevant agent outputs
        priority_order = [
            "domain_intelligence", "historical_review", "slr", 
            "gap_synthesis", "innovation_novelty", "visualization",
            "paper_decomposition", "paper_understanding"
        ]
        
        truncated_findings = {}
        for key in priority_order:
            if key in findings:
                entry = findings[key]
                entry_str = json.dumps(entry) if isinstance(entry, dict) else str(entry)
                
                if len(entry_str) < remaining_chars:
                    truncated_findings[key] = entry
                    remaining_chars -= len(entry_str)
                else:
                    # Truncate this entry to fit functionality
                    truncated_findings[key] = self._smart_truncate(entry_str, remaining_chars)
                    remaining_chars = 0
                    break
        
        result = {**core, "findings": truncated_findings}
        return json.dumps(result)

    def _compute_hash(self, text: str) -> str:
        import hashlib
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def _get_cache_path(self, hash_key: str) -> str:
        import os
        cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cache")
        os.makedirs(cache_dir, exist_ok=True)
        return os.path.join(cache_dir, f"{hash_key}.json")

    def _get_from_cache(self, hash_key: str) -> Optional[Dict[str, Any]]:
        import os
        import json
        cache_path = self._get_cache_path(hash_key)
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"[{self.name}] Cache read failed: {e}")
        return None

    def _save_to_cache(self, hash_key: str, data: Dict[str, Any]):
        import json
        cache_path = self._get_cache_path(hash_key)
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.warning(f"[{self.name}] Cache write failed: {e}")

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the agent and returns a parsed JSON dictionary.
        Includes token limiting, timing, proper error handling, and deterministic caching.
        """
        job_id = state.get("_job_id", "?")
        research_id = int(job_id) if str(job_id).isdigit() else None
        
        logger.info(f"[{self.name}] Job #{job_id} - Running...")
        start_time = time.time()
        
        # Emit agent start event
        emit_agent_start(self.name, research_id=research_id)
        # Metrics: count agent run
        try:
            metrics_inc(f"agent_runs_{self.name}")
        except Exception:
            pass
        
        # Token-limited context
        context = self._truncate_context(state, self.max_context_tokens)
        context_tokens = self._estimate_tokens(context)
        logger.debug(f"[{self.name}] Context tokens: ~{context_tokens}")
        
        # Deterministic Caching
        # Hash includes system prompt, model, and context (input)
        input_signature = f"{self.system_prompt}:{self.model_name}:{context}"
        input_hash = self._compute_hash(input_signature)
        
        cached_result = self._get_from_cache(input_hash)
        if cached_result:
            logger.info(f"[{self.name}] Cache HIT. Hash: {input_hash[:8]}")
            emit_agent_complete(self.name, 0, success=True, research_id=research_id)
            try:
                metrics_inc(f"agent_success_{self.name}")
                metrics_timing(f"agent_execution_ms_{self.name}", 0)
            except Exception:
                pass
            return cached_result

        logger.info(f"[{self.name}] Cache MISS. Hash: {input_hash[:8]}")

        messages = [
            SystemMessage(content=self.system_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=context)
        ]
        
        try:
            response = self.llm.invoke(messages)
            raw_content = response.content
            
            # Robust Parsing
            parsed_json = self._extract_json(raw_content)
            
            elapsed = time.time() - start_time
            elapsed_ms = int(elapsed * 1000)
            logger.info(f"[{self.name}] Job #{job_id} - Completed in {elapsed:.2f}s")
            try:
                metrics_inc(f"agent_success_{self.name}")
                metrics_timing(f"agent_execution_ms_{self.name}", elapsed_ms)
            except Exception:
                pass
            
            output_hash = self._compute_hash(raw_content)
            logger.info(f"[{self.name}] Output Hash: {output_hash[:8]}")

            # Track token usage
            try:
                track_agent_usage(
                    agent_name=self.name,
                    model_name=self.model_name,
                    prompt_text=context,
                    completion_text=raw_content,
                    execution_time_ms=elapsed_ms,
                    job_id=str(job_id),
                    success=True
                )
            except Exception as e:
                logger.warning(f"[{self.name}] Token tracking failed: {e}")
            
            # Prepare result
            result = {
                "response": parsed_json,
                "raw": raw_content,
                "agent": self.name,
                "execution_time": elapsed,
                "input_hash": input_hash,
                "output_hash": output_hash
            }

            # Save to Cache
            self._save_to_cache(input_hash, result)

            # Emit agent complete event
            emit_agent_complete(self.name, elapsed_ms, success=True, research_id=research_id)
            
            return result
        except Exception as e:
            elapsed = time.time() - start_time
            elapsed_ms = int(elapsed * 1000)
            logger.error(f"[{self.name}] Job #{job_id} - Failed after {elapsed:.2f}s: {e}")
            
            # Track failed usage
            try:
                track_agent_usage(
                    agent_name=self.name,
                    model_name=self.model_name,
                    prompt_text=context,
                    completion_text="",
                    execution_time_ms=elapsed_ms,
                    job_id=str(job_id),
                    success=False,
                    error_message=str(e)
                )
            except Exception as te:
                logger.warning(f"[{self.name}] Token tracking failed: {te}")
            
            # Emit agent failure event
            emit_agent_complete(self.name, elapsed_ms, success=False, research_id=research_id)
            emit_error(f"Agent {self.name}: {str(e)}", recoverable=True, research_id=research_id)
            try:
                metrics_inc(f"agent_failure_{self.name}")
                metrics_timing(f"agent_execution_ms_{self.name}", elapsed_ms)
            except Exception:
                pass
            
            return {"error": str(e), "raw": "Error during execution", "agent": self.name}

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Extracts JSON from text, handling markdown code blocks or conversational noise.
        """
        # 1. Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
            
        # 2. Extract from markdown ```json ... ```
        match = re.search(r"```json\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
                
        # 3. Find first { ... } block
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
                
        # 4. Fallback: Return raw text wrapped in dict
        logger.warning(f"[{self.name}] Could not parse JSON. Returning raw text.")
        return {"raw_text": text}

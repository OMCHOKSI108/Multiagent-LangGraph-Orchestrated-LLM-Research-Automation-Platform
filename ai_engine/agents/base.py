from typing import Dict, Any, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
import config
import logging
import json
import re
import time

# Import event emitter for live transparency
from utils.event_emitter import emit_agent_start, emit_agent_complete, emit_error

logger = logging.getLogger("ai_engine.agents")

# ============================
# LLM Connection Pool (Singleton)
# ============================
_LLM_CACHE: Dict[str, Any] = {}

def get_cached_llm(model_name: str, provider: str = "ollama"):
    """Returns a cached LLM instance to avoid redundant connections."""
    cache_key = f"{provider}:{model_name}"
    
    if cache_key not in _LLM_CACHE:
        if provider == "ollama":
            _LLM_CACHE[cache_key] = ChatOllama(
                base_url=config.OLLAMA_BASE_URL,
                model=model_name,
                temperature=0.7
            )
        elif provider == "gemini":
            _LLM_CACHE[cache_key] = ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=config.GEMINI_API_KEY,
                temperature=0.7
            )
        elif provider == "groq":
            _LLM_CACHE[cache_key] = ChatGroq(
                model_name="llama3-70b-8192",
                groq_api_key=config.GROQ_API_KEY,
                temperature=0.7
            )
        logger.info(f"Created new LLM connection: {cache_key}")
    
    return _LLM_CACHE[cache_key]


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
        """Returns the configured LLM client based on LLM_MODE."""
        if config.LLM_MODE == "offline":
            logger.info(f"[{self.name}] Using Ollama: {self.model_name}")
            return get_cached_llm(self.model_name, "ollama")
        elif config.LLM_MODE == "online":
            if config.GEMINI_API_KEY:
                logger.info(f"[{self.name}] Using Gemini")
                return get_cached_llm(self.model_name, "gemini")
            elif config.GROQ_API_KEY:
                logger.info(f"[{self.name}] Using Groq")
                return get_cached_llm(self.model_name, "groq")
        
        # Fallback to Ollama
        return get_cached_llm(self.model_name, "ollama")

    def _estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token for English)."""
        return len(text) // 4

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
        remaining_tokens = max_tokens - self._estimate_tokens(core_str) - 500  # Buffer for system prompt
        
        findings = state.get("findings", {})
        if not findings:
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
                entry_tokens = self._estimate_tokens(entry_str)
                
                if entry_tokens < remaining_tokens:
                    truncated_findings[key] = entry
                    remaining_tokens -= entry_tokens
                else:
                    # Truncate this entry to fit
                    truncated_findings[key] = {"summary": str(entry)[:remaining_tokens * 4]}
                    break
        
        result = {**core, "findings": truncated_findings}
        return json.dumps(result)

    def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the agent and returns a parsed JSON dictionary.
        Includes token limiting, timing, and proper error handling.
        """
        job_id = state.get("_job_id", "?")
        research_id = int(job_id) if str(job_id).isdigit() else None
        
        logger.info(f"[{self.name}] Job #{job_id} - Running...")
        start_time = time.time()
        
        # Emit agent start event
        emit_agent_start(self.name, research_id=research_id)
        
        # Token-limited context
        context = self._truncate_context(state, self.max_context_tokens)
        context_tokens = self._estimate_tokens(context)
        logger.debug(f"[{self.name}] Context tokens: ~{context_tokens}")
        
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
            
            # Emit agent complete event
            emit_agent_complete(self.name, elapsed_ms, success=True, research_id=research_id)
            
            return {
                "response": parsed_json,
                "raw": raw_content,
                "agent": self.name,
                "execution_time": elapsed
            }
        except Exception as e:
            elapsed = time.time() - start_time
            elapsed_ms = int(elapsed * 1000)
            logger.error(f"[{self.name}] Job #{job_id} - Failed after {elapsed:.2f}s: {e}")
            
            # Emit agent failure event
            emit_agent_complete(self.name, elapsed_ms, success=False, research_id=research_id)
            emit_error(f"Agent {self.name}: {str(e)}", recoverable=True, research_id=research_id)
            
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

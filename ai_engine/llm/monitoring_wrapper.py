"""
LLM Monitoring Wrapper
=======================
Wraps LLM providers to track API usage, token consumption, errors, and performance metrics.

This wrapper integrates with the backend monitoring system to provide real-time
API usage tracking for the admin dashboard.

Features:
    - Tracks request count, token usage, and response times per provider
    - Records errors and rate limit hits
    - Sends metrics to the monitoring backend via HTTP calls
    - Thread-safe operation with minimal performance overhead
"""

import asyncio
import logging
import time
import threading
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

from .base import LLMProvider

logger = logging.getLogger("ai_engine.llm.monitoring")

# Global monitoring configuration
MONITORING_ENABLED = True
MONITORING_BACKEND_URL = "http://localhost:5000"  # Backend monitoring endpoint
REQUEST_TIMEOUT = 5.0  # Timeout for monitoring HTTP calls


class MonitoringConfig:
    """Configuration for LLM monitoring."""

    def __init__(self):
        self.enabled = True
        self.backend_url = "http://localhost:5000"
        self.timeout = 5.0
        self.max_retries = 3
        self.retry_delay = 1.0

    @classmethod
    def from_env(cls):
        """Load configuration from environment variables."""
        import os
        config = cls()
        config.enabled = os.getenv("LLM_MONITORING_ENABLED", "true").lower() in ("true", "1", "yes", "on")
        config.backend_url = os.getenv("MONITORING_BACKEND_URL", "http://localhost:5000")
        config.timeout = float(os.getenv("MONITORING_TIMEOUT", "5.0"))
        config.max_retries = int(os.getenv("MONITORING_MAX_RETRIES", "3"))
        config.retry_delay = float(os.getenv("MONITORING_RETRY_DELAY", "1.0"))
        return config


# Global config instance
_monitoring_config = MonitoringConfig.from_env()


class LLMMonitoringWrapper(LLMProvider):
    """
    Wrapper that adds monitoring capabilities to any LLM provider.

    This wrapper intercepts all LLM calls to track usage metrics and send
    them to the monitoring backend for the admin dashboard.
    """

    def __init__(self, wrapped_provider: LLMProvider, config: Optional[MonitoringConfig] = None):
        # Copy provider attributes
        super().__init__(
            provider_name=f"monitored_{wrapped_provider.provider_name}",
            model_name=wrapped_provider.model_name,
            temperature=wrapped_provider.temperature
        )

        self.wrapped_provider = wrapped_provider
        self.config = config or _monitoring_config
        self._lock = threading.Lock()

        # Local metrics cache (for resilience if backend is down)
        self._local_metrics = {
            "requests": 0,
            "errors": 0,
            "tokens_input": 0,
            "tokens_output": 0,
            "total_response_time": 0.0,
            "rate_limit_hits": 0,
            "last_request_time": None
        }

    def _send_metric_to_backend(self, metric_type: str, data: Dict[str, Any]) -> None:
        """
        Send a metric to the monitoring backend asynchronously.
        Non-blocking to avoid impacting LLM performance.
        """
        if not self.config.enabled:
            return

        def _async_send():
            try:
                import requests
                import json

                url = f"{self.config.backend_url}/admin/metrics/llm/{metric_type}"
                payload = {
                    "provider": self.wrapped_provider.provider_name,
                    "model": self.wrapped_provider.model_name,
                    "timestamp": int(time.time() * 1000),
                    **data
                }

                response = requests.post(
                    url,
                    json=payload,
                    timeout=self.config.timeout,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code not in (200, 201):
                    logger.warning(f"[LLM Monitoring] Failed to send metric: HTTP {response.status_code}")

            except Exception as e:
                logger.warning(f"[LLM Monitoring] Failed to send metric to backend: {e}")

        # Send in background thread to avoid blocking
        import threading
        thread = threading.Thread(target=_async_send, daemon=True)
        thread.start()

    def _record_request_start(self) -> float:
        """Record the start of a request and return timestamp."""
        start_time = time.time()
        with self._lock:
            self._local_metrics["requests"] += 1
            self._local_metrics["last_request_time"] = start_time
        return start_time

    def _record_request_end(self, start_time: float, tokens_input: int = 0, tokens_output: int = 0, error: Optional[str] = None) -> None:
        """Record the end of a request with metrics."""
        end_time = time.time()
        response_time = end_time - start_time

        with self._lock:
            self._local_metrics["total_response_time"] += response_time
            self._local_metrics["tokens_input"] += tokens_input
            self._local_metrics["tokens_output"] += tokens_output
            if error:
                self._local_metrics["errors"] += 1
                if "rate limit" in error.lower() or "429" in error:
                    self._local_metrics["rate_limit_hits"] += 1

        # Send metrics to backend
        self._send_metric_to_backend("request", {
            "response_time_ms": int(response_time * 1000),
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "error": error,
            "success": error is None
        })

    def _extract_token_usage(self, response: Any) -> tuple[int, int]:
        """Extract token usage from LLM response if available."""
        try:
            # Try to extract from response metadata
            if hasattr(response, 'usage_metadata'):
                usage = response.usage_metadata
                input_tokens = getattr(usage, 'input_tokens', 0)
                output_tokens = getattr(usage, 'output_tokens', 0)
                return input_tokens, output_tokens

            # Try LangChain response format
            if hasattr(response, 'usage'):
                usage = response.usage
                input_tokens = getattr(usage, 'prompt_tokens', 0) or getattr(usage, 'input_tokens', 0)
                output_tokens = getattr(usage, 'completion_tokens', 0) or getattr(usage, 'output_tokens', 0)
                return input_tokens, output_tokens

            # Try direct attributes
            input_tokens = getattr(response, 'prompt_tokens', 0) or getattr(response, 'input_tokens', 0)
            output_tokens = getattr(response, 'completion_tokens', 0) or getattr(response, 'output_tokens', 0)
            return input_tokens, output_tokens

        except Exception as e:
            logger.debug(f"[LLM Monitoring] Could not extract token usage: {e}")
            return 0, 0

    def get_langchain_llm(self) -> Any:
        """Return the wrapped provider's LLM instance."""
        return self.wrapped_provider.get_langchain_llm()

    def is_available(self) -> bool:
        """Check if the wrapped provider is available."""
        return self.wrapped_provider.is_available()

    def get_status(self) -> Dict[str, Any]:
        """Get status with monitoring metrics."""
        base_status = self.wrapped_provider.get_status()

        with self._lock:
            metrics = self._local_metrics.copy()

        # Calculate averages
        if metrics["requests"] > 0:
            metrics["avg_response_time_ms"] = int((metrics["total_response_time"] / metrics["requests"]) * 1000)
            metrics["error_rate"] = round((metrics["errors"] / metrics["requests"]) * 100, 2)
        else:
            metrics["avg_response_time_ms"] = 0
            metrics["error_rate"] = 0.0

        return {
            **base_status,
            "monitoring": {
                "enabled": self.config.enabled,
                "metrics": metrics
            }
        }

    def rotate_key(self) -> str:
        """Rotate API key in the wrapped provider."""
        return self.wrapped_provider.rotate_key()

    def invoke_with_retry(self, messages: List[Any]) -> Any:
        """Invoke LLM with monitoring."""
        start_time = self._record_request_start()

        try:
            response = self.wrapped_provider.invoke_with_retry(messages)
            tokens_input, tokens_output = self._extract_token_usage(response)
            self._record_request_end(start_time, tokens_input, tokens_output)
            return response

        except Exception as e:
            error_msg = str(e)
            self._record_request_end(start_time, error=error_msg)
            raise

    async def ainvoke_with_retry(self, messages: List[Any]) -> Any:
        """Async invoke LLM with monitoring."""
        start_time = self._record_request_start()

        try:
            response = await self.wrapped_provider.ainvoke_with_retry(messages)
            tokens_input, tokens_output = self._extract_token_usage(response)
            self._record_request_end(start_time, tokens_input, tokens_output)
            return response

        except Exception as e:
            error_msg = str(e)
            self._record_request_end(start_time, error=error_msg)
            raise

    # Add async invoke method if the wrapped provider has it
    async def ainvoke_once(self, messages: List[Any]) -> Any:
        """Async invoke once with monitoring."""
        if not hasattr(self.wrapped_provider, 'ainvoke_once'):
            # Fallback to sync method in async context
            import concurrent.futures
            import asyncio

            loop = asyncio.get_event_loop()
            with concurrent.futures.ThreadPoolExecutor() as executor:
                return await loop.run_in_executor(executor, self.invoke_with_retry, messages)

        start_time = self._record_request_start()

        try:
            response = await self.wrapped_provider.ainvoke_once(messages)
            tokens_input, tokens_output = self._extract_token_usage(response)
            self._record_request_end(start_time, tokens_input, tokens_output)
            return response

        except Exception as e:
            error_msg = str(e)
            self._record_request_end(start_time, error=error_msg)
            raise


def wrap_provider_with_monitoring(provider: LLMProvider) -> LLMProvider:
    """
    Wrap an LLM provider with monitoring capabilities.

    Args:
        provider: The LLM provider to wrap

    Returns:
        A monitoring wrapper around the provider
    """
    return LLMMonitoringWrapper(provider)


# Convenience function to enable/disable monitoring globally
def set_monitoring_enabled(enabled: bool) -> None:
    """Enable or disable LLM monitoring globally."""
    global _monitoring_config
    _monitoring_config.enabled = enabled
    logger.info(f"[LLM Monitoring] Monitoring {'enabled' if enabled else 'disabled'}")


def get_monitoring_config() -> MonitoringConfig:
    """Get the current monitoring configuration."""
    return _monitoring_config</content>
<parameter name="filePath">d:\SEM 6\AIML317_PROJECT_III\project_sgp\ai_engine\llm\monitoring_wrapper.py
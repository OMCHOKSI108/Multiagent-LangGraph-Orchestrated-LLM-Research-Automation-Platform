"""
HuggingFace LLM Provider
========================
Provides access to HuggingFace models for local inference.
Supports both Transformers and LangChain integration.

Features:
    - Local model inference (no API calls)
    - GPU acceleration support
    - Multiple model sizes for different tasks
    - Automatic model downloading and caching
"""

import os
import importlib.util
import torch
from typing import Any, Dict, Optional
from huggingface_hub import snapshot_download
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    pipeline,
    BitsAndBytesConfig
)
from langchain_huggingface import HuggingFacePipeline
from .base import LLMProvider
import logging

logger = logging.getLogger("ai_engine.llm.huggingface")


class HuggingFaceProvider(LLMProvider):
    """
    HuggingFace provider for local model inference.

    Supports various model sizes and quantization for efficiency.
    """

    def __init__(self, model_name: str, device: str = "auto", use_quantization: bool = True):
        self.model_name = model_name
        self.device = device
        self.use_quantization = use_quantization
        self._tokenizer = None
        self._model = None
        self._pipeline = None
        self._langchain_llm = None

        # Model configurations for different sizes
        self.model_configs = {
            # Small models (fast, low memory)
            "microsoft/phi-2": {"max_length": 2048, "quantization": "4bit"},
            "microsoft/phi-3-mini-4k-instruct": {"max_length": 4096, "quantization": "4bit"},
            "microsoft/phi-3.5-mini-instruct": {"max_length": 4096, "quantization": "4bit"},

            # Medium models (balanced performance)
            "microsoft/phi-3-medium-4k-instruct": {"max_length": 4096, "quantization": "8bit"},
            "meta-llama/Llama-2-7b-chat-hf": {"max_length": 4096, "quantization": "8bit"},
            "meta-llama/Llama-3.2-3B-Instruct": {"max_length": 4096, "quantization": "4bit"},

            # Large models (high quality, high memory)
            "meta-llama/Llama-2-13b-chat-hf": {"max_length": 4096, "quantization": "8bit"},
            "meta-llama/Llama-3.1-8B-Instruct": {"max_length": 8192, "quantization": "8bit"},
            "microsoft/phi-3-large-128k-instruct": {"max_length": 128000, "quantization": "8bit"},

            # Code-specialized models
            "microsoft/phi-3.5-MoE-instruct": {"max_length": 4096, "quantization": "8bit"},
            "Qwen/Qwen2.5-Coder-7B-Instruct": {"max_length": 32768, "quantization": "4bit"},
            "Qwen/Qwen2.5-Coder-14B-Instruct": {"max_length": 32768, "quantization": "8bit"},
        }

    @property
    def provider_name(self) -> str:
        return f"HuggingFace ({self.model_name})"

    def _get_quantization_config(self, model_name: str) -> Optional[BitsAndBytesConfig]:
        """Get quantization config based on model settings."""
        if not self.use_quantization:
            return None

        # BitsAndBytes quantization is primarily useful on CUDA and requires the package.
        if self.device != "cuda":
            logger.info(
                f"[HuggingFace] Disabling quantization for {self.model_name}: "
                f"device '{self.device}' is not CUDA."
            )
            return None
        if importlib.util.find_spec("bitsandbytes") is None:
            logger.warning(
                f"[HuggingFace] Disabling quantization for {self.model_name}: "
                "bitsandbytes is not installed."
            )
            return None

        config = self.model_configs.get(model_name, {"quantization": "4bit"})
        quant_type = config.get("quantization", "4bit")

        if quant_type == "4bit":
            return BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True,
                bnb_4bit_quant_type="nf4"
            )
        elif quant_type == "8bit":
            return BitsAndBytesConfig(
                load_in_8bit=True,
                bnb_8bit_compute_dtype=torch.float16
            )

        return None

    def download_model_assets(self):
        """Download and cache model files without fully loading weights into memory."""
        logger.info(f"[HuggingFace] Pre-downloading model assets: {self.model_name}")
        snapshot_download(
            repo_id=self.model_name,
            token=os.getenv("HF_TOKEN") or None,
            local_files_only=False,
        )

    def prepare_for_startup(self, strategy: str = "download_only"):
        """Warm the Hugging Face cache during service startup."""
        normalized = (strategy or "download_only").strip().lower()
        self.download_model_assets()
        if normalized == "full_load":
            self._load_model()

    def _load_model(self):
        """Lazy load the model and tokenizer."""
        if self._model is not None:
            return

        try:
            logger.info(f"[HuggingFace] Loading model: {self.model_name}")

            # Set device
            if self.device == "auto":
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"[HuggingFace] Using device: {self.device}")

            # Load tokenizer
            self._tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                trust_remote_code=True
            )

            # Add padding token if missing
            if self._tokenizer.pad_token is None:
                self._tokenizer.pad_token = self._tokenizer.eos_token

            # Get quantization config
            quantization_config = self._get_quantization_config(self.model_name)

            # Load model
            self._model = AutoModelForCausalLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
                device_map="auto" if self.device == "cuda" else None,
                quantization_config=quantization_config,
                trust_remote_code=True,
                low_cpu_mem_usage=True
            )

            logger.info(f"[HuggingFace] Model loaded successfully")

        except Exception as e:
            logger.error(f"[HuggingFace] Failed to load model {self.model_name}: {e}")
            raise

    def _create_pipeline(self):
        """Create the transformers pipeline."""
        if self._pipeline is not None:
            return

        self._load_model()

        # Get max length from config
        config = self.model_configs.get(self.model_name, {"max_length": 4096})
        max_length = config.get("max_length", 4096)

        self._pipeline = pipeline(
            "text-generation",
            model=self._model,
            tokenizer=self._tokenizer,
            device=0 if self.device == "cuda" else -1,
            max_new_tokens=max_length,
            temperature=0.7,
            do_sample=True,
            top_p=0.9,
            repetition_penalty=1.1,
            return_full_text=False
        )

    def get_langchain_llm(self):
        """Return LangChain-compatible LLM."""
        if self._langchain_llm is not None:
            return self._langchain_llm

        self._create_pipeline()

        self._langchain_llm = HuggingFacePipeline(
            pipeline=self._pipeline,
            pipeline_kwargs={
                "max_new_tokens": 2048,
                "temperature": 0.7,
                "do_sample": True,
                "top_p": 0.9,
                "repetition_penalty": 1.1
            }
        )

        return self._langchain_llm

    def is_available(self) -> bool:
        """Check if the model is available and can be loaded."""
        try:
            self._load_model()
            return True
        except Exception as e:
            logger.warning(f"[HuggingFace] Model {self.model_name} not available: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """Return provider status information."""
        return {
            "provider": "huggingface",
            "model": self.model_name,
            "device": self.device,
            # Keep /llm/status lightweight: do not force a full model load here.
            "available": self._model is not None,
            "loaded": self._model is not None,
            "quantization": self.use_quantization,
            "max_memory": torch.cuda.get_device_properties(0).total_memory if torch.cuda.is_available() else None
        }

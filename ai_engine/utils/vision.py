import torch
from diffusers import StableDiffusionPipeline
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import io
import os
import threading
import logging
import gc

logger = logging.getLogger("ai_engine.vision")

class VisionProvider:
    """
    Singleton VisionProvider with GPU mutex to prevent concurrent access issues.
    Handles both image generation (Stable Diffusion) and captioning (BLIP).
    """
    _instance = None
    _lock = threading.Lock()  # Class-level lock for singleton
    _gpu_mutex = threading.Lock()  # GPU operation mutex
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(VisionProvider, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"[VisionProvider] Initializing on {self.device}...")
        self._init_models()
        self._initialized = True

    def _init_models(self):
        """Load vision models with memory optimizations."""
        # 1. Image Generation (Stable Diffusion)
        try:
            logger.info("[VisionProvider] Loading Stable Diffusion...")
            self.pipe = StableDiffusionPipeline.from_pretrained(
                "runwayml/stable-diffusion-v1-5", 
                torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
            )
            
            # OPTIMIZATION FOR LOW VRAM (4GB)
            if self.device == "cuda":
                logger.info("[VisionProvider] Enabling Memory Optimizations (CPU Offload)...")
                self.pipe.enable_model_cpu_offload()
                self.pipe.enable_vae_slicing()
            else:
                self.pipe.to(self.device)

            # Disable safety checker for research automation
            self.pipe.safety_checker = None
            self.pipe_loaded = True
        except Exception as e:
            logger.error(f"[VisionProvider] Error loading Diffusion: {e}")
            self.pipe = None
            self.pipe_loaded = False

        # 2. Image Analysis (BLIP)
        try:
            logger.info("[VisionProvider] Loading BLIP (Image Captioning)...")
            self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
            self.model = BlipForConditionalGeneration.from_pretrained(
                "Salesforce/blip-image-captioning-large"
            ).to(self.device)
            self.blip_loaded = True
        except Exception as e:
            logger.error(f"[VisionProvider] Error loading BLIP: {e}")
            self.model = None
            self.blip_loaded = False

    def _clear_gpu_cache(self):
        """Clear GPU cache after heavy operations."""
        if self.device == "cuda":
            torch.cuda.empty_cache()
            gc.collect()

    def generate_image(self, prompt: str, output_path: str, num_inference_steps: int = 25) -> str:
        """
        Generates an image from text and saves it.
        Uses mutex to prevent concurrent GPU access.
        """
        if not self.pipe_loaded:
            return "Image Generation Model not loaded."
        
        # Acquire GPU mutex to prevent concurrent access
        with self._gpu_mutex:
            try:
                logger.info(f"[VisionProvider] Generating: '{prompt[:50]}...'")
                
                # Generate with lower steps for speed
                image = self.pipe(
                    prompt, 
                    num_inference_steps=num_inference_steps,
                    guidance_scale=7.5
                ).images[0]
                
                # Ensure directory exists
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                image.save(output_path)
                
                logger.info(f"[VisionProvider] Saved: {output_path}")
                self._clear_gpu_cache()
                
                return output_path
            except Exception as e:
                logger.error(f"[VisionProvider] Gen Error: {e}")
                self._clear_gpu_cache()
                return f"Error: {e}"

    def analyze_image(self, image_data: bytes) -> str:
        """
        Generates a caption for the provided image bytes.
        Uses mutex to prevent concurrent GPU access.
        """
        if not self.blip_loaded:
            return "Image Analysis Model not loaded."
        
        with self._gpu_mutex:
            try:
                raw_image = Image.open(io.BytesIO(image_data)).convert('RGB')
                inputs = self.processor(raw_image, return_tensors="pt").to(self.device)
                
                out = self.model.generate(**inputs, max_new_tokens=50)
                caption = self.processor.decode(out[0], skip_special_tokens=True)
                
                self._clear_gpu_cache()
                return caption
            except Exception as e:
                logger.error(f"[VisionProvider] Analysis Error: {e}")
                self._clear_gpu_cache()
                return f"Error analyzing image: {e}"

    def unload(self):
        """Unload models to free memory."""
        with self._gpu_mutex:
            if self.pipe:
                del self.pipe
                self.pipe = None
                self.pipe_loaded = False
            if self.model:
                del self.model
                self.model = None
                self.blip_loaded = False
            self._clear_gpu_cache()
            logger.info("[VisionProvider] Models unloaded")

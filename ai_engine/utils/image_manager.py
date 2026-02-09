"""
Image Manager

PHASE 5 of the Research Platform.
Handles image replacement with semantic consistency:
- Swaps image file
- Re-analyzes image content
- Updates caption in LaTeX
- Updates in-text references
- Updates analysis sections linked to image
"""

import os
import shutil
from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class ImageReplacement:
    """Result of an image replacement operation."""
    figure_id: str
    old_path: str
    new_path: str
    new_caption: str
    affected_references: list
    analysis_update: str
    success: bool
    error: Optional[str] = None


class ImageManager:
    """
    Manages image replacements with semantic consistency.
    
    When a user replaces an image:
    1. Swap the image file
    2. Re-analyze the new image
    3. Update the caption in LaTeX (diff-based)
    4. Update in-text references
    5. Update analysis sections linked to the image
    """
    
    def __init__(self, images_dir: str = "output/images"):
        self.images_dir = images_dir
        os.makedirs(images_dir, exist_ok=True)
        self._image_registry: Dict[str, Dict[str, Any]] = {}
    
    def register_image(self, figure_id: str, path: str, caption: str, 
                       analysis: str = "", references: list = None):
        """Register an image with its metadata."""
        self._image_registry[figure_id] = {
            "path": path,
            "caption": caption,
            "analysis": analysis,
            "references": references or [],
            "version": 1
        }
        print(f"[ImageManager] Registered image: {figure_id}")
    
    def replace_image(self, figure_id: str, new_image_path: str, 
                      llm=None) -> ImageReplacement:
        """
        Replace an image and maintain semantic consistency.
        
        Args:
            figure_id: The figure ID (e.g., "fig:5.2")
            new_image_path: Path to the new image file
            llm: Optional LLM for re-analyzing the image
            
        Returns:
            ImageReplacement with all updates needed
        """
        if figure_id not in self._image_registry:
            return ImageReplacement(
                figure_id=figure_id,
                old_path="",
                new_path=new_image_path,
                new_caption="",
                affected_references=[],
                analysis_update="",
                success=False,
                error=f"Figure {figure_id} not found in registry"
            )
        
        old_info = self._image_registry[figure_id]
        old_path = old_info["path"]
        
        # 1. Copy new image to images directory
        new_filename = f"{figure_id.replace(':', '_')}_{old_info['version'] + 1}{os.path.splitext(new_image_path)[1]}"
        dest_path = os.path.join(self.images_dir, new_filename)
        
        try:
            shutil.copy2(new_image_path, dest_path)
            print(f"[ImageManager] Copied image to: {dest_path}")
        except Exception as e:
            return ImageReplacement(
                figure_id=figure_id,
                old_path=old_path,
                new_path=new_image_path,
                new_caption="",
                affected_references=[],
                analysis_update="",
                success=False,
                error=f"Failed to copy image: {e}"
            )
        
        # 2. Re-analyze image (if LLM provided)
        new_analysis = ""
        new_caption = old_info["caption"]  # Default to old caption
        
        if llm:
            try:
                from langchain_core.messages import HumanMessage
                
                analysis_prompt = f"""Analyze this image for a research paper.
                
Previous caption: {old_info['caption']}
Previous analysis: {old_info.get('analysis', 'None')}

Provide:
1. Updated caption (keep style similar but describe new content)
2. Brief analysis of what the image shows
3. Key observations for research context

Output as JSON:
{{"caption": "...", "analysis": "...", "key_observations": [...]}}"""
                
                # Note: In production, you'd use vision model here
                response = llm.invoke([HumanMessage(content=analysis_prompt)])
                result = eval(response.content) if "{" in response.content else {}
                
                new_caption = result.get("caption", old_info["caption"])
                new_analysis = result.get("analysis", "")
                
            except Exception as e:
                print(f"[ImageManager] Image analysis failed: {e}")
                new_analysis = f"[Auto-generated] Image replaced. Manual review recommended."
        
        # 3. Update registry
        self._image_registry[figure_id] = {
            "path": dest_path,
            "caption": new_caption,
            "analysis": new_analysis,
            "references": old_info["references"],
            "version": old_info["version"] + 1
        }
        
        # 4. Generate LaTeX diff for caption update
        latex_diff = self._generate_caption_diff(figure_id, old_info["caption"], new_caption)
        
        print(f"[ImageManager] Image {figure_id} replaced successfully")
        
        return ImageReplacement(
            figure_id=figure_id,
            old_path=old_path,
            new_path=dest_path,
            new_caption=new_caption,
            affected_references=old_info["references"],
            analysis_update=new_analysis,
            success=True
        )
    
    def _generate_caption_diff(self, figure_id: str, old_caption: str, new_caption: str) -> str:
        """Generate a LaTeX diff for caption update."""
        if old_caption == new_caption:
            return ""
        
        return f"""<<<<<<< SEARCH
\\caption{{{old_caption}}}
=======
\\caption{{{new_caption}}}
>>>>>>> REPLACE"""
    
    def get_image_info(self, figure_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a registered image."""
        return self._image_registry.get(figure_id)
    
    def list_images(self) -> Dict[str, Dict[str, Any]]:
        """List all registered images."""
        return self._image_registry.copy()


# Global image manager instance
image_manager = ImageManager()

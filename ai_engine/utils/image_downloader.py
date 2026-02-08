import os
import requests
import hashlib
from urllib.parse import urlparse

def download_image(url: str, job_id: str, base_dir: str = None) -> str:
    """
    Downloads an image from a URL and saves it locally.
    Returns the relative path accessible by the frontend.
    """
    try:
        # Determine output directory
        # Default: ProjectRoot/frontend/public/research_images/{job_id}/
        if not base_dir:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "research_images"))
        
        job_dir = os.path.join(base_dir, str(job_id))
        os.makedirs(job_dir, exist_ok=True)
        
        # Hash URL for unique filename
        ext = os.path.splitext(urlparse(url).path)[1]
        if not ext or len(ext) > 5:
            ext = ".jpg"
        
        filename = hashlib.md5(url.encode()).hexdigest() + ext
        filepath = os.path.join(job_dir, filename)
        
        # Check if already exists
        if os.path.exists(filepath):
            return f"/research_images/{job_id}/{filename}"
            
        # Download with timeout and headers
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            with open(filepath, "wb") as f:
                f.write(response.content)
            return f"/research_images/{job_id}/{filename}"
            
    except Exception as e:
        print(f"[ImageDownloader] Failed to download {url}: {e}")
        
    return None

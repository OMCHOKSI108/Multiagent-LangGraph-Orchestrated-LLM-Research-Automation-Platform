import os
import requests
import hashlib
from urllib.parse import urlparse

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


def download_image(url: str, job_id: str, base_dir: str = None) -> str:
    """
    Downloads an image from a URL and saves it locally.
    Returns the relative path accessible by the frontend.
    Rejects files larger than MAX_IMAGE_SIZE (10 MB).
    """
    try:
        # Determine output directory
        if not base_dir:
            base_dir = os.getenv("RESEARCH_IMAGES_DIR", "/shared/research_images")

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

        # Download with timeout, headers, and streaming size check
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        response = requests.get(url, headers=headers, timeout=5, stream=True)
        if response.status_code != 200:
            return None

        # Check Content-Length before downloading
        content_length = response.headers.get("Content-Length")
        if content_length and int(content_length) > MAX_IMAGE_SIZE:
            print(
                f"[ImageDownloader] Rejecting {url}: too large ({int(content_length) / 1024 / 1024:.1f} MB)"
            )
            return None

        # Stream download with size limit enforcement
        total_size = 0
        chunks = []
        for chunk in response.iter_content(chunk_size=8192):
            total_size += len(chunk)
            if total_size > MAX_IMAGE_SIZE:
                print(
                    f"[ImageDownloader] Rejecting {url}: exceeded {MAX_IMAGE_SIZE / 1024 / 1024} MB during download"
                )
                return None
            chunks.append(chunk)

        with open(filepath, "wb") as f:
            for chunk in chunks:
                f.write(chunk)

        return f"/research_images/{job_id}/{filename}"

    except Exception as e:
        print(f"[ImageDownloader] Failed to download {url}: {e}")

    return None

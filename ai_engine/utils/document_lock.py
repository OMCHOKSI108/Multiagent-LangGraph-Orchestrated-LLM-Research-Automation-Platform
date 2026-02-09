"""
Document Lock Utility

Provides document-level locking to prevent concurrent LaTeX modifications.
Implements rules from prompt.json:
- No parallel LaTeX writes
- One writer per document version
"""

import threading
import time
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class LockInfo:
    """Information about a document lock."""
    job_id: str
    acquired_at: float
    owner: str = "unknown"
    version: int = 1


class DocumentLock:
    """Thread-safe document locking mechanism."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """Singleton pattern to ensure one lock manager."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._locks: dict[str, LockInfo] = {}
                    cls._instance._internal_lock = threading.Lock()
        return cls._instance
    
    def acquire(self, job_id: str, owner: str = "unknown", timeout: float = 30.0) -> bool:
        """
        Acquire a lock on a document.
        
        Args:
            job_id: The job/document identifier
            owner: Who is acquiring the lock
            timeout: Maximum time to wait for lock
            
        Returns:
            True if lock acquired, False if timed out
        """
        start_time = time.time()
        
        while True:
            with self._internal_lock:
                if job_id not in self._locks:
                    self._locks[job_id] = LockInfo(
                        job_id=job_id,
                        acquired_at=time.time(),
                        owner=owner,
                        version=1
                    )
                    print(f"[DocumentLock] Lock acquired for {job_id} by {owner}")
                    return True
                elif self._locks[job_id].owner == owner:
                    # Same owner can re-acquire
                    return True
            
            if time.time() - start_time > timeout:
                print(f"[DocumentLock] Timeout acquiring lock for {job_id}")
                return False
            
            time.sleep(0.1)
    
    def release(self, job_id: str, owner: str = "unknown") -> bool:
        """
        Release a document lock.
        
        Args:
            job_id: The job/document identifier
            owner: Who is releasing (must match)
            
        Returns:
            True if released, False if not owner
        """
        with self._internal_lock:
            if job_id in self._locks:
                lock_info = self._locks[job_id]
                if lock_info.owner == owner or owner == "force":
                    del self._locks[job_id]
                    print(f"[DocumentLock] Lock released for {job_id}")
                    return True
                else:
                    print(f"[DocumentLock] Cannot release lock for {job_id}: not owner")
                    return False
            return True  # Already unlocked
    
    def is_locked(self, job_id: str) -> bool:
        """Check if a document is locked."""
        with self._internal_lock:
            return job_id in self._locks
    
    def get_lock_info(self, job_id: str) -> Optional[LockInfo]:
        """Get information about a lock."""
        with self._internal_lock:
            return self._locks.get(job_id)
    
    def increment_version(self, job_id: str) -> int:
        """Increment the document version after an edit."""
        with self._internal_lock:
            if job_id in self._locks:
                self._locks[job_id].version += 1
                return self._locks[job_id].version
            return 0
    
    def get_version(self, job_id: str) -> int:
        """Get the current document version."""
        with self._internal_lock:
            if job_id in self._locks:
                return self._locks[job_id].version
            return 0


# Global lock manager instance
document_lock = DocumentLock()

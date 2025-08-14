"""Caching and synchronization utilities for jobs."""
import os
import time
import json
from typing import Dict, Any, Optional

# Simple file-based cache for results
CACHE_DIR = "backend/cache"

def cache_result(key: str, result: Dict[str, Any], ttl_seconds: int = 3600):
    """Cache a result to disk with TTL."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    
    cache_data = {
        "result": result,
        "cached_at": time.time(),
        "ttl": ttl_seconds
    }
    
    cache_file = os.path.join(CACHE_DIR, f"{key}.json")
    with open(cache_file, "w") as f:
        json.dump(cache_data, f)

def get_cached_result(key: str) -> Optional[Dict[str, Any]]:
    """Get a cached result if it's still valid."""
    cache_file = os.path.join(CACHE_DIR, f"{key}.json")
    
    if not os.path.exists(cache_file):
        return None
    
    try:
        with open(cache_file, "r") as f:
            cache_data = json.load(f)
        
        cached_at = cache_data.get("cached_at", 0)
        ttl = cache_data.get("ttl", 3600)
        
        if time.time() - cached_at > ttl:
            # Cache expired
            os.remove(cache_file)
            return None
            
        return cache_data.get("result")
    except Exception:
        # Corrupted cache file
        try:
            os.remove(cache_file)
        except:
            pass
        return None

def generate_cache_key(address: str, radius_m: int, include_long_context: bool) -> str:
    """Generate a cache key for an analysis request."""
    import hashlib
    
    key_string = f"{address}_{radius_m}_{include_long_context}"
    return hashlib.md5(key_string.encode()).hexdigest()



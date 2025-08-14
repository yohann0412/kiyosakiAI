import asyncio
import os
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

try:
    import redis
    from rq import Queue, Connection
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# In-memory fallback for development
_jobs_store: Dict[str, Dict[str, Any]] = {}

class JobQueue:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.use_redis = REDIS_AVAILABLE and self.redis_url
        
        if self.use_redis:
            self.redis_conn = redis.from_url(self.redis_url)
            self.queue = Queue(connection=self.redis_conn)
        else:
            self.queue = None

    def enqueue_analysis(self, address: str, radius_m: int, include_long_context: bool) -> str:
        """Enqueue an analysis job and return job_id."""
        job_id = str(uuid.uuid4())
        
        if self.use_redis:
            # Use RQ for Redis-backed jobs
            from .workers import run_analysis_job
            job = self.queue.enqueue(
                run_analysis_job,
                address, radius_m, include_long_context,
                job_id=job_id,
                job_timeout='10m'
            )
            return job.id
        else:
            # Fallback to in-memory async execution
            _jobs_store[job_id] = {
                "status": "queued",
                "created_at": datetime.now().isoformat(),
                "address": address,
                "radius_m": radius_m,
                "include_long_context": include_long_context,
                "result": None,
                "error": None
            }
            # Schedule the job to run async
            asyncio.create_task(self._run_async_job(job_id, address, radius_m, include_long_context))
            return job_id

    async def _run_async_job(self, job_id: str, address: str, radius_m: int, include_long_context: bool):
        """Run job asynchronously in the fallback mode."""
        try:
            _jobs_store[job_id]["status"] = "started"
            _jobs_store[job_id]["started_at"] = datetime.now().isoformat()
            
            # Import here to avoid circular imports
            from ..agent.orchestrator import run
            
            result = run(address, radius_m, include_long_context)
            
            _jobs_store[job_id]["status"] = "finished"
            _jobs_store[job_id]["result"] = result.dict()
            _jobs_store[job_id]["finished_at"] = datetime.now().isoformat()
            
        except Exception as e:
            _jobs_store[job_id]["status"] = "failed"
            _jobs_store[job_id]["error"] = str(e)
            _jobs_store[job_id]["failed_at"] = datetime.now().isoformat()

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status and result."""
        if self.use_redis:
            try:
                job = self.queue.fetch_job(job_id)
                if not job:
                    return None
                    
                status = {
                    "job_id": job_id,
                    "status": job.get_status(),
                    "created_at": job.created_at.isoformat() if job.created_at else None,
                    "started_at": job.started_at.isoformat() if job.started_at else None,
                    "ended_at": job.ended_at.isoformat() if job.ended_at else None,
                }
                
                if job.is_finished:
                    status["result"] = job.result
                elif job.is_failed:
                    status["error"] = str(job.exc_info)
                    
                return status
            except Exception:
                return None
        else:
            return _jobs_store.get(job_id)

# Global queue instance
job_queue = JobQueue()



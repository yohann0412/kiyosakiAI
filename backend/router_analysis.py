from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from .agent import orchestrator
from .jobs.queue import job_queue
from .jobs.synchronizer import get_cached_result, cache_result, generate_cache_key

router = APIRouter()

class AnalyzeRequest(BaseModel):
    address: str
    radius_m: int = 800
    include_long_context: bool = True

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    failed_at: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None

@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """Synchronous analysis endpoint."""
    return orchestrator.run(req.address, req.radius_m, req.include_long_context)

@router.post("/analyze/async", response_model=JobResponse)
async def analyze_async(req: AnalyzeRequest):
    """Asynchronous analysis endpoint that returns a job ID."""
    # Check cache first
    cache_key = generate_cache_key(req.address, req.radius_m, req.include_long_context)
    cached_result = get_cached_result(cache_key)
    
    if cached_result:
        return JobResponse(
            job_id="cached",
            status="finished",
            message="Result retrieved from cache"
        )
    
    # Enqueue the job
    job_id = job_queue.enqueue_analysis(req.address, req.radius_m, req.include_long_context)
    
    return JobResponse(
        job_id=job_id,
        status="queued",
        message="Analysis job has been queued"
    )

@router.get("/result/{job_id}", response_model=JobStatusResponse)
async def get_job_result(job_id: str):
    """Get the status and result of a job."""
    if job_id == "cached":
        raise HTTPException(status_code=400, detail="Cannot get status for cached results")
    
    job_status = job_queue.get_job_status(job_id)
    
    if not job_status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Cache the result if it's finished
    if job_status.get("status") == "finished" and job_status.get("result"):
        # Extract parameters from job to generate cache key
        # This is a simplified approach - in production, you'd store these with the job
        cache_key = f"job_{job_id}"
        cache_result(cache_key, job_status["result"])
    
    return JobStatusResponse(**job_status)

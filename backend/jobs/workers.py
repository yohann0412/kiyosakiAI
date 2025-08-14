"""Worker functions for background jobs."""

def run_analysis_job(address: str, radius_m: int, include_long_context: bool):
    """Worker function to run analysis jobs in the background."""
    from ..agent.orchestrator import run
    
    try:
        result = run(address, radius_m, include_long_context)
        return result.dict()
    except Exception as e:
        raise e



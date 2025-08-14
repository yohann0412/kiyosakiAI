from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

router = APIRouter()

class AnalyzeRequest(BaseModel):
    address: str
    radius_m: int = 800
    include_long_context: bool = True

@router.post("/analyze")
async def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    return {"message": "Analysis started", "address": req.address}

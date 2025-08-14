from fastapi import APIRouter
from pydantic import BaseModel
from ..agent import orchestrator

router = APIRouter()

class AnalyzeRequest(BaseModel):
    address: str
    radius_m: int = 800
    include_long_context: bool = True

@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    return orchestrator.run(req.address, req.radius_m, req.include_long_context)

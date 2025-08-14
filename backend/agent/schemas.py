from pydantic import BaseModel
from typing import List, Tuple, Optional

class ReasoningInput(BaseModel):
    address: str
    lat: float
    lon: float
    radius_m: int
    metrics: dict
    amenities_bullets: List[str]
    infra_bullets: List[str]
    risk_bullets: List[str]
    long_context: Optional[str]

class ReasoningOutput(BaseModel):
    memo_markdown: str
    verdict: str


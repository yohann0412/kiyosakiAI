import httpx
import os
from tenacity import retry, stop_after_attempt, wait_exponential
from ..schemas import ReasoningInput, ReasoningOutput

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def generate_memo(reasoning_input: ReasoningInput) -> ReasoningOutput:
    """Generates an investment memo using an LLM."""
    
    api_key = os.getenv("GEMINI_API_KEY")
    model_name = os.getenv("MODEL_REASONER", "gemini-1.5-pro")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"

    with open("backend/prompts/memo_system.txt", "r") as f:
        system_prompt = f.read()
    
    with open("backend/prompts/memo_user_template.txt", "r") as f:
        user_template = f.read()

    user_prompt = user_template.format(
        address=reasoning_input.address,
        lat=reasoning_input.lat,
        lon=reasoning_input.lon,
        radius_m=reasoning_input.radius_m,
        metrics=reasoning_input.metrics,
        amenities_bullets="\n".join(f"- {b}" for b in reasoning_input.amenities_bullets),
        infra_bullets="\n".join(f"- {b}" for b in reasoning_input.infra_bullets),
        risk_bullets="\n".join(f"- {b}" for b in reasoning_input.risk_bullets),
        long_context=reasoning_input.long_context,
    )

    payload = {
        "contents": [{"parts": [{"text": user_prompt}]}],
        "system_instruction": {"parts": [{"text": system_prompt}]},
    }

    with httpx.Client() as client:
        response = client.post(url, json=payload, timeout=60.0)
        response.raise_for_status()
        data = response.json()

    memo_markdown = data["candidates"][0]["content"]["parts"][0]["text"]
    
    verdict = "Unknown"
    if "\nVerdict: " in memo_markdown:
        verdict = memo_markdown.split("\nVerdict: ")[-1].strip()

    return ReasoningOutput(memo_markdown=memo_markdown, verdict=verdict)

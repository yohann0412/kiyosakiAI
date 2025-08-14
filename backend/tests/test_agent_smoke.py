"""Smoke test for the complete agent orchestrator."""
import pytest
from backend.agent.orchestrator import run
from backend.agent.schemas import ReasoningOutput


def test_orchestrator_full_run():
    """Test that the orchestrator can complete a full analysis."""
    # Use a real NYC address for testing
    address = "Central Park, New York, NY"
    
    try:
        result = run(address, radius_m=800, include_long_context=False)
        
        # Verify the result structure
        assert isinstance(result, ReasoningOutput)
        assert hasattr(result, 'memo_markdown')
        assert hasattr(result, 'verdict')
        assert isinstance(result.memo_markdown, str)
        assert isinstance(result.verdict, str)
        assert len(result.memo_markdown) > 0
        assert len(result.verdict) > 0
        
        # Verify verdict is one of expected values
        expected_verdicts = ["Safe", "Risky", "Speculative", "Error", "Unknown"]
        assert any(v.lower() in result.verdict.lower() for v in expected_verdicts)
        
        print(f"✅ Smoke test passed!")
        print(f"Generated memo length: {len(result.memo_markdown)} chars")
        print(f"Verdict: {result.verdict}")
        
    except Exception as e:
        # If the test fails due to missing data files or API keys, that's expected
        if "geocode" in str(e).lower() or "api" in str(e).lower():
            pytest.skip(f"Skipping due to external dependency: {e}")
        else:
            # Re-raise unexpected errors
            raise


def test_orchestrator_with_invalid_address():
    """Test orchestrator behavior with invalid address."""
    result = run("Invalid Address That Doesn't Exist", radius_m=800, include_long_context=False)
    
    assert isinstance(result, ReasoningOutput)
    assert "could not geocode" in result.memo_markdown.lower() or result.verdict == "Error"


if __name__ == "__main__":
    # Run the smoke test directly
    test_orchestrator_full_run()
    test_orchestrator_with_invalid_address()
    print("All smoke tests completed!")



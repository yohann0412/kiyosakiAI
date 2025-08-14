"""Unit tests for individual tools."""
import pytest
from backend.agent.tools import geocode, amenities, permits, comps, zoning, climate, schools, crime, infra_context


def test_geocode_returns_dict():
    """Test that geocode returns a dictionary with required fields."""
    result = geocode.geocode("123 Main St, New York, NY")
    
    if result:  # If geocoding works
        assert isinstance(result, dict)
        assert "lat" in result
        assert "lon" in result
        assert "address_norm" in result
        assert isinstance(result["lat"], float)
        assert isinstance(result["lon"], float)


def test_amenities_returns_proper_structure():
    """Test that amenities tool returns expected structure."""
    result = amenities.nearby_amenities(40.7831, -73.9712, 800)
    
    assert isinstance(result, dict)
    assert "counts_by_facgroup" in result
    assert "counts_by_facdomain" in result
    assert "top_named" in result
    assert "insight_bullets" in result
    assert isinstance(result["insight_bullets"], list)


def test_permits_returns_numeric_values():
    """Test that permits tool returns valid numeric data."""
    result = permits.permits_summary(40.7831, -73.9712, 800)
    
    assert isinstance(result, dict)
    assert "permits_per_month" in result
    assert "lux_pct" in result
    assert isinstance(result["permits_per_month"], (int, float))
    assert isinstance(result["lux_pct"], (int, float))
    assert result["lux_pct"] >= 0  # Percentage should be non-negative


def test_comps_returns_valid_data():
    """Test that comps tool returns valid comparative data."""
    result = comps.comps_summary(40.7831, -73.9712, 800)
    
    assert isinstance(result, dict)
    assert "avg_price_per_sqft" in result
    assert "num_sales" in result
    assert isinstance(result["avg_price_per_sqft"], (int, float))
    assert isinstance(result["num_sales"], int)
    assert result["avg_price_per_sqft"] >= 0
    assert result["num_sales"] >= 0


def test_zoning_with_valid_bbl():
    """Test zoning tool with a hypothetical BBL."""
    result = zoning.zoning_summary("1234567890")
    
    assert isinstance(result, dict)
    # Should either return zoning data or an error
    if "error" not in result:
        assert "max_far" in result
        assert isinstance(result.get("max_far"), (int, float, type(None)))
        if result.get("max_far") is not None:
            assert result["max_far"] >= 0  # FAR should be non-negative


def test_climate_returns_boolean_flag():
    """Test that climate tool returns proper flood flag."""
    result = climate.flood_flag(40.7831, -73.9712)
    
    assert isinstance(result, dict)
    assert "in_flood_zone" in result
    assert "details" in result
    assert isinstance(result["details"], str)


def test_schools_placeholder():
    """Test schools tool placeholder."""
    result = schools.schools_summary(40.7831, -73.9712)
    
    assert isinstance(result, dict)
    assert "message" in result


def test_crime_placeholder():
    """Test crime tool placeholder."""
    result = crime.crime_summary(40.7831, -73.9712)
    
    assert isinstance(result, dict)
    assert "message" in result


def test_infra_context_with_keywords():
    """Test infrastructure context extraction."""
    result = infra_context.long_context_for_area(["test", "area"])
    
    assert isinstance(result, str)
    # Should return either empty string or context with markdown headers



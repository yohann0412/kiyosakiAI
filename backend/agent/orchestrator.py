from .schemas import ReasoningInput, ReasoningOutput
from .tools import (
    geocode,
    amenities,
    permits,
    comps,
    zoning,
    climate,
    infra_context,
    schools,
    crime,
    llm_reasoner,
)

def run(address: str, radius_m: int = 800, include_long_context: bool = True) -> ReasoningOutput:
    """
    Runs the full analysis for a given address.
    """
    
    # 1. Geocode the address
    geo_info = geocode.geocode(address)
    if not geo_info:
        return ReasoningOutput(memo_markdown="Could not geocode address.", verdict="Error")

    lat, lon = geo_info["lat"], geo_info["lon"]
    bbl = geo_info.get("bbl")

    # 2. Gather data from all tools
    amenities_data = amenities.nearby_amenities(lat, lon, radius_m)
    permits_data = permits.permits_summary(lat, lon, radius_m)
    comps_data = comps.comps_summary(lat, lon, radius_m)
    zoning_data = zoning.zoning_summary(bbl) if bbl else {"error": "BBL not found for zoning analysis."}
    climate_data = climate.flood_flag(lat, lon)
    schools_data = schools.schools_summary(lat, lon)
    crime_data = crime.crime_summary(lat, lon)

    # 3. Aggregate metrics and bullets
    metrics = {
        "avg_price_per_sqft": comps_data.get("avg_price_per_sqft"),
        "num_sales": comps_data.get("num_sales"),
        "permits_per_month": permits_data.get("permits_per_month"),
        "lux_pct": permits_data.get("lux_pct"),
        "max_far": zoning_data.get("max_far"),
    }
    
    amenities_bullets = amenities_data.get("insight_bullets", [])
    infra_bullets = [f"Last sale date: {comps_data.get('last_sale_date')}", f"Last permit date: {permits_data.get('last_permit_date')}"]
    risk_bullets = [climate_data.get("details")]

    # 4. Get long-form context if requested
    long_context_str = ""
    if include_long_context:
        keywords = address.split() + [geo_info.get("address_norm", "")]
        long_context_str = infra_context.long_context_for_area(keywords)

    # 5. Prepare input for the reasoner
    reasoning_input = ReasoningInput(
        address=address, lat=lat, lon=lon, radius_m=radius_m, metrics=metrics,
        amenities_bullets=amenities_bullets, infra_bullets=infra_bullets, risk_bullets=risk_bullets,
        long_context=long_context_str
    )

    # 6. Generate the final memo

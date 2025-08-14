import orjson
import os
import math
from collections import Counter

def nearby_amenities(lat: float, lon: float, radius_m: int) -> dict:
    """Returns counts_by_facgroup, counts_by_facdomain, top_named, insight_bullets."""
    
    filepath = "backend/data/facilities_filtered_2025-08-13.geojson"
    if not os.path.exists(filepath):
        return {
            "counts_by_facgroup": [],
            "counts_by_facdomain": [],
            "top_named": [],
            "insight_bullets": ["Amenity data not available."],
        }

    with open(filepath, "rb") as f:
        geojson_data = orjson.loads(f.read())

    # Simple distance calculation using haversine formula
    def distance_km(lat1, lon1, lat2, lon2):
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat/2) * math.sin(dlat/2) + 
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
             math.sin(dlon/2) * math.sin(dlon/2))
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c * 1000  # Convert to meters

    nearby_facilities = []
    for feature in geojson_data["features"]:
        if feature["geometry"]["type"] == "Point":
            coords = feature["geometry"]["coordinates"]
            facility_lon, facility_lat = coords[0], coords[1]
            
            dist = distance_km(lat, lon, facility_lat, facility_lon)
            if dist <= radius_m:
                nearby_facilities.append(feature["properties"])

    counts_by_facgroup = Counter(f['facgroup'] for f in nearby_facilities)
    counts_by_facdomain = Counter(f['facdomain'] for f in nearby_facilities)
    
    top_named = [f['facname'] for f in nearby_facilities if f.get('facname')]

    insight_bullets = [f"Found {len(nearby_facilities)} facilities within {radius_m} meters."]
    if counts_by_facgroup:
        insight_bullets.append(f"Top facility group: {counts_by_facgroup.most_common(1)[0][0]}")

    return {"counts_by_facgroup": counts_by_facgroup.most_common(5), "counts_by_facdomain": counts_by_facdomain.most_common(5), "top_named": top_named[:5], "insight_bullets": insight_bullets}


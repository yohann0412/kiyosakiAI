import orjson
from shapely.geometry import Point, shape
from shapely.ops import transform
import pyproj
from functools import partial
from collections import Counter
import os

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

    project = partial(
        pyproj.transform,
        pyproj.Proj(proj='latlong', datum='WGS84'),
        pyproj.Proj(proj='aeqd', lat_0=lat, lon_0=lon)
    )
    
    center = Point(lon, lat)
    buffer_proj = transform(project, center).buffer(radius_m)

    nearby_facilities = []
    for feature in geojson_data["features"]:
        facility_shape = shape(feature["geometry"])
        if buffer_proj.intersects(transform(project, facility_shape)):
            nearby_facilities.append(feature["properties"])

    counts_by_facgroup = Counter(f['facgroup'] for f in nearby_facilities)
    counts_by_facdomain = Counter(f['facdomain'] for f in nearby_facilities)
    
    top_named = [f['facname'] for f in nearby_facilities if f.get('facname')]

    insight_bullets = [f"Found {len(nearby_facilities)} facilities within {radius_m} meters."]
    if counts_by_facgroup:
        insight_bullets.append(f"Top facility group: {counts_by_facgroup.most_common(1)[0][0]}")

    return {"counts_by_facgroup": counts_by_facgroup.most_common(5), "counts_by_facdomain": counts_by_facdomain.most_common(5), "top_named": top_named[:5], "insight_bullets": insight_bullets}


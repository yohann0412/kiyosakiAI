import orjson
from shapely.geometry import Point, shape
from shapely.ops import transform
import pyproj
from functools import partial

def nearby_amenities(lat: float, lon: float, radius_m: int) -> dict:
    """Returns counts_by_facgroup, counts_by_facdomain, top_named, insight_bullets."""
    
    with open("backend/data/facilities_filtered_2025-08-13.geojson", "rb") as f:
        data = orjson.loads(f.read())

    project = partial(
        pyproj.transform,
        pyproj.Proj(proj='latlong', datum='WGS84'),
        pyproj.Proj(proj='aeqd', lat_0=lat, lon_0=lon)
    )

    center = Point(lon, lat)
    buffer = transform(project, center).buffer(radius_m)

    nearby_facilities = []
    for feature in data["features"]:
        facility_shape = shape(feature["geometry"])
        if buffer.contains(transform(project, facility_shape)):
            nearby_facilities.append(feature["properties"])

    # This is a stub. Full implementation will be added in a future step.
    return {"nearby_facilities": nearby_facilities}


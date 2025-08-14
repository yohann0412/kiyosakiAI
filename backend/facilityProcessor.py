from pyogrio import read_dataframe        # reads geo files without GDAL install hell
from shapely.geometry import Point
from haversine import haversine

# 1) Load your GeoJSON
gdf = read_dataframe("/path/to/facilities_filtered_2025-08-13.geojson")  # returns a pandas DF with a 'geometry' column (Shapely)

# 2) Given a subject property (lat, lon)
prop_lat, prop_lon = 40.7808, -73.9556  # example UES
prop_pt = Point(prop_lon, prop_lat)     # shapely uses (x=lon, y=lat)

# 3) Proximity filter (simple & fast):
def within_radius_m(row, center_latlon, radius_m=800):
    latlon = (row.geometry.y, row.geometry.x)
    return haversine(center_latlon, latlon, unit="m") <= radius_m

mask = gdf.geometry.notna() & gdf.apply(
    within_radius_m, axis=1, center_latlon=(prop_lat, prop_lon), radius_m=800
)
nearby = gdf.loc[mask, ["facname","factype","facgroup","facdomain","address","boro","datasource","geometry"]]

# 4) Group/score for your memo
summary = (nearby
           .groupby("facgroup")
           .size()
           .sort_values(ascending=False))

# 5) Example “insight bullets” you can inject into the LLM:
bullets = []
if (nearby["facgroup"]=="PARKS AND PLAZAS").any():
    bullets.append("Multiple parks/plazas within 0.5 mi — family/lifestyle appeal ↑.")
if (nearby["facgroup"]=="DAY CARE AND PRE-KINDERGARTEN").any():
    bullets.append("Daycare density within walking distance — strong for families.")
# …add more heuristics by facgroup/facdomain/datasource keywords

# 6) If you have polygons (zoning/flood), use shapely point-in-polygon:
# zones = read_dataframe("zoning.geojson")   # polygons
# zones_hit = zones.loc[zones.geometry.contains(prop_pt)]

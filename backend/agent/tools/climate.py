import pandas as pd
import os

def flood_flag(lat: float, lon: float) -> dict:
    """Returns in_flood_zone, details."""
    
    filepath = "backend/data/flood_flags.csv"
    if not os.path.exists(filepath):
        return {"in_flood_zone": None, "details": "Flood data not available."}

    df = pd.read_csv(filepath)
    
    # Find the nearest point in the dataframe
    df['distance'] = ((df['latitude'] - lat)**2 + (df['longitude'] - lon)**2)**0.5
    nearest_point = df.loc[df['distance'].idxmin()]
    
    in_flood_zone = bool(nearest_point['in_flood_zone'])
    
    if in_flood_zone:
        details = "Property is in a designated flood zone."
    else:
        details = "Property is not in a designated flood zone."

    return {"in_flood_zone": in_flood_zone, "details": details}

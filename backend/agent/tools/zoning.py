import duckdb
import os

def zoning_summary(bbl: str) -> dict:
    """Returns zoning_dist, residential_far, commercial_far, facility_far, max_far, lot_sqft."""
    
    filepath = "backend/data/pluto.parquet"
    if not os.path.exists(filepath):
        return {"error": "Zoning data not available."}

    con = duckdb.connect(database=':memory:', read_only=True)
    
    query = f"""
    SELECT "ZoneDist1", "ResFAR", "CommFAR", "FacilFAR", "LotArea"
    FROM read_parquet('{filepath}')
    WHERE "BBL" = '{bbl}'
    """
    
    result = con.execute(query).fetchone()
    con.close()

    if not result:
        return {"error": f"No zoning data found for BBL {bbl}"}

    zoning_dist, res_far, comm_far, facil_far, lot_sqft = result
    max_far = max(res_far, comm_far, facil_far)

    return {"zoning_dist": zoning_dist, "residential_far": res_far, "commercial_far": comm_far, "facility_far": facil_far, "max_far": max_far, "lot_sqft": lot_sqft}


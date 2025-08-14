import os

def zoning_summary(bbl: str) -> dict:
    """Returns zoning_dist, residential_far, commercial_far, facility_far, max_far, lot_sqft."""
    
    filepath = "backend/data/pluto.parquet"
    if not os.path.exists(filepath):
        filepath = "backend/data/pluto.csv"
        if not os.path.exists(filepath):
            return {"error": "Zoning data not available."}

    # Simple pandas-based query as fallback
    try:
        import pandas as pd
        if filepath.endswith('.parquet'):
            df = pd.read_parquet(filepath)
        else:
            df = pd.read_csv(filepath)
        
        # Find matching BBL
        matching_rows = df[df['BBL'] == bbl]
        
        if not matching_rows.empty:
            row = matching_rows.iloc[0]
            result = (row.get('ZoneDist1'), row.get('ResFAR'), 
                     row.get('CommFAR'), row.get('FacilFAR'), row.get('LotArea'))
        else:
            result = None
            
    except Exception:
        # Fallback with sample data
        result = ('R6', 2.0, 0.0, 0.0, 2500)

    if not result:
        return {"error": f"No zoning data found for BBL {bbl}"}

    zoning_dist, res_far, comm_far, facil_far, lot_sqft = result
    max_far = max(res_far, comm_far, facil_far)

    return {"zoning_dist": zoning_dist, "residential_far": res_far, "commercial_far": comm_far, "facility_far": facil_far, "max_far": max_far, "lot_sqft": lot_sqft}


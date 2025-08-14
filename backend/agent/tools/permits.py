import duckdb
import os
from datetime import datetime, timedelta

def permits_summary(lat: float, lon: float, radius_m: int, months: int = 12) -> dict:
    """Returns permits_per_month, lux_pct, sample_descriptions, last_permit_date."""
    
    filepath = "backend/data/permits.parquet"
    if not os.path.exists(filepath):
        return {
            "permits_per_month": 0,
            "lux_pct": 0,
            "sample_descriptions": [],
            "last_permit_date": None,
        }

    con = duckdb.connect(database=':memory:', read_only=False)
    con.execute("INSTALL spatial; LOAD spatial;")

    # Time window for the query
    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    
    query = f"""
    SELECT "Issuance Date", "Job Description"
    FROM read_parquet('{filepath}')
    WHERE ST_DWithin(ST_Point(longitude, latitude), ST_Point({lon}, {lat}), {radius_m})
    AND "Issuance Date" BETWEEN '{start_date.strftime('%Y-%m-%d')}' AND '{end_date.strftime('%Y-%m-%d')}'
    """
    
    results = con.execute(query).fetchall()
    con.close()

    if not results:
        return {"permits_per_month": 0, "lux_pct": 0, "sample_descriptions": [], "last_permit_date": None}

    permits_per_month = len(results) / months
    lux_keywords = ['luxury', 'penthouse', 'amenity', 'renovation']
    lux_permits = sum(1 for _, desc in results if any(keyword in str(desc).lower() for keyword in lux_keywords))
    lux_pct = (lux_permits / len(results)) * 100 if results else 0
    sample_descriptions = [desc for _, desc in results[:5]]

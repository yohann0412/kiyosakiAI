import duckdb
import os
from datetime import datetime, timedelta

def comps_summary(lat: float, lon: float, radius_m: int, months: int = 24) -> dict:
    """Returns avg_price_per_sqft, num_sales, last_sale_date."""
    
    filepath = "backend/data/sales.parquet"
    if not os.path.exists(filepath):
        return {
            "avg_price_per_sqft": 0,
            "num_sales": 0,
            "last_sale_date": None,
        }

    con = duckdb.connect(database=':memory:', read_only=False)
    con.execute("INSTALL spatial; LOAD spatial;")

    end_date = datetime.now()
    start_date = end_date - timedelta(days=months * 30)
    
    query = f"""
    SELECT "Sale Price", "Gross Square Feet", "Sale Date"
    FROM read_parquet('{filepath}')
    WHERE ST_DWithin(ST_Point(longitude, latitude), ST_Point({lon}, {lat}), {radius_m})
    AND "Sale Date" BETWEEN '{start_date.strftime('%Y-%m-%d')}' AND '{end_date.strftime('%Y-%m-%d')}'
    AND "Gross Square Feet" > 0 AND "Sale Price" > 0
    """
    
    results = con.execute(query).fetchall()
    con.close()

    if not results:
        return {"avg_price_per_sqft": 0, "num_sales": 0, "last_sale_date": None}

    num_sales = len(results)
    total_price_per_sqft = sum(price / sqft for price, sqft, _ in results if sqft > 0)
    avg_price_per_sqft = total_price_per_sqft / num_sales if num_sales > 0 else 0
    last_sale_date = max(date for _, _, date in results)

    return {"avg_price_per_sqft": avg_price_per_sqft, "num_sales": num_sales, "last_sale_date": last_sale_date}


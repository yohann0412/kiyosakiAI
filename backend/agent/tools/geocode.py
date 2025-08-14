import httpx
import orjson

_cache = {}

def geocode(address: str) -> dict:
    """Returns {address_norm, lat, lon, bbl, bin} (bbl/bin optional). Cache results."""
    if address in _cache:
        return _cache[address]

    url = f"https://nominatim.openstreetmap.org/search?q={address}&format=json"
    headers = {"User-Agent": "Kiyosaki"}
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        response.raise_for_status()
        data = orjson.loads(response.text)

    if not data:
        return None

    result = {"address_norm": data[0]["display_name"], "lat": float(data[0]["lat"]), "lon": float(data[0]["lon"]), "bbl": None, "bin": None}

    _cache[address] = result

    return result

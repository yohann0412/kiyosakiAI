# Kiyosaki - Real Estate Investment Analysis Agent

A sophisticated backend analysis agent built with FastAPI that generates structured investment memos for NYC properties using local data sources and LLM reasoning.

## 🏗️ Architecture Overview

The system follows a deterministic, multi-tool orchestration approach:

1. **Geocoding**: Converts addresses to coordinates using OpenStreetMap Nominatim
2. **Data Gathering**: Queries local files (Parquet/CSV/GeoJSON) for property analytics
3. **LLM Analysis**: Generates structured investment memo using Gemini API
4. **Job Queue**: Supports both Redis-backed and in-memory job processing

## 📁 Project Structure

```
kiyosaki/
├── backend/
│   ├── agent/
│   │   ├── orchestrator.py      # Main analysis orchestration
│   │   ├── schemas.py           # Pydantic data models
│   │   └── tools/               # Individual analysis tools
│   │       ├── geocode.py       # Address geocoding
│   │       ├── amenities.py     # Nearby facilities analysis
│   │       ├── permits.py       # Building permits analysis
│   │       ├── comps.py         # Comparable sales analysis
│   │       ├── zoning.py        # Zoning and FAR analysis
│   │       ├── climate.py       # Flood risk analysis
│   │       ├── infra_context.py # Long-form context extraction
│   │       └── llm_reasoner.py  # LLM memo generation
│   ├── jobs/
│   │   ├── queue.py             # Job queue management
│   │   ├── workers.py           # Background workers
│   │   └── synchronizer.py      # Caching system
│   ├── data/                    # Local data files
│   ├── scripts/                 # Data preparation scripts
│   └── tests/                   # Unit and integration tests
└── frontend/                    # React frontend (UI only)
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
make setup
# or manually:
pip install -r backend/requirements.txt
```

### 2. Prepare Data Files

```bash
make data
# or manually:
python3 backend/scripts/prep_permits.py
python3 backend/scripts/prep_sales.py
python3 backend/scripts/prep_pluto.py
python3 backend/scripts/prep_subway.py
```

### 3. Configure Environment

Copy the example environment file and configure your API keys:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
PORT=8000
REDIS_URL=redis://localhost:6379  # Optional
GEMINI_API_KEY=your_api_key_here
MODEL_REASONER=gemini-1.5-pro
```

### 4. Start the Development Server

```bash
make dev
# or manually:
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

## 🔧 API Endpoints

### Synchronous Analysis

```bash
POST /analyze
{
    "address": "Central Park, New York, NY",
    "radius_m": 800,
    "include_long_context": true
}
```

### Asynchronous Analysis

```bash
# Start analysis job
POST /analyze/async
{
    "address": "Central Park, New York, NY",
    "radius_m": 800,
    "include_long_context": true
}

# Check job status
GET /result/{job_id}
```

## 🧪 Testing

Run the complete test suite:

```bash
make test
```

Run specific test types:

```bash
make test-unit    # Individual tool tests
make test-smoke   # End-to-end orchestrator test
```

## 📊 Data Sources

The system expects the following data files in `backend/data/`:

- **permits.parquet/csv**: Building permits with columns `latitude`, `longitude`, `Issuance Date`, `Job Description`
- **sales.parquet/csv**: Property sales with columns `latitude`, `longitude`, `Sale Date`, `Sale Price`, `Gross Square Feet`
- **pluto.parquet/csv**: Zoning data with columns `BBL`, `ZoneDist1`, `ResFAR`, `CommFAR`, `FacilFAR`, `LotArea`
- **facilities_filtered_2025-08-13.geojson**: Amenities and facilities GeoJSON
- **flood_flags.csv**: Flood zone data with `latitude`, `longitude`, `in_flood_zone`
- **infra_dossier.md**: Infrastructure context documentation
- **cb_minutes.md**: Community board meeting minutes

## 🛠️ Development Commands

```bash
make setup     # Install dependencies
make dev       # Start development server
make test      # Run all tests
make data      # Prepare data files
make clean     # Clean Python cache files
```

## 🏗️ Tool Architecture

Each analysis tool follows a consistent pattern:

1. **Input**: Geographic coordinates (lat/lon) and search parameters
2. **Processing**: Query local data sources with spatial/temporal filters
3. **Output**: Structured data with insights and summary statistics

### Example Tool Implementation

```python
def tool_summary(lat: float, lon: float, radius_m: int) -> dict:
    """Tool description with clear return type."""

    # 1. Check data availability
    if not os.path.exists(data_file):
        return {"error": "Data not available"}

    # 2. Query with spatial/temporal filters
    results = query_data(lat, lon, radius_m)

    # 3. Process and summarize
    return {
        "metric1": calculated_value,
        "metric2": another_value,
        "insights": ["bullet point 1", "bullet point 2"]
    }
```

## 🔄 Job Queue System

The system supports two job queue modes:

### Redis Mode (Production)

- Requires Redis server and `REDIS_URL` environment variable
- Persistent job storage with worker processes
- Horizontal scaling support

### In-Memory Mode (Development)

- Automatic fallback when Redis unavailable
- Async job processing within the same process
- No external dependencies required

## 📝 LLM Integration

The system uses Google's Gemini API for memo generation:

1. **System Prompt**: Defines the assistant role and output format
2. **User Template**: Structures the analysis data for the LLM
3. **Response Parsing**: Extracts verdict from generated markdown

### Prompt Templates

- `backend/prompts/memo_system.txt`: System instructions for the LLM
- `backend/prompts/memo_user_template.txt`: Template for formatting analysis data

## 🚨 Error Handling

The system gracefully handles various failure modes:

- **Missing Data**: Tools return default values with error messages
- **Geocoding Failures**: Clear error responses for invalid addresses
- **API Failures**: Retry logic with exponential backoff
- **Dependency Issues**: Automatic fallbacks (CSV for Parquet, in-memory for Redis)

## 🔍 Monitoring and Debugging

### Smoke Test

Run end-to-end validation:

```bash
python3 backend/tests/test_agent_smoke.py
```

### Individual Tool Testing

```bash
python3 -c "from backend.agent.tools import geocode; print(geocode.geocode('Central Park, NY'))"
```

### Check Data Files

```bash
ls -la backend/data/
```

## 🏃‍♂️ Performance Considerations

- **Spatial Queries**: Uses DuckDB with spatial extension for fast geospatial operations
- **Caching**: File-based result caching with configurable TTL
- **Async Processing**: Background job processing for long-running analyses
- **Data Formats**: Supports both Parquet (fast) and CSV (fallback) formats

## 🤝 Contributing

1. Add new tools in `backend/agent/tools/`
2. Register tools in `backend/agent/orchestrator.py`
3. Add tests in `backend/tests/`
4. Update this README with new features

---

_Built with FastAPI, DuckDB, Shapely, and Gemini AI_



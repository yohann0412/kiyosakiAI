from dotenv import load_dotenv
import os

load_dotenv()

PORT = int(os.getenv("PORT", 8000))
REDIS_URL = os.getenv("REDIS_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_REASONER = os.getenv("MODEL_REASONER", "gemini-1.5-pro")
DATA_DIR = os.getenv("DATA_DIR", "backend/data")
CACHE_DIR = os.getenv("CACHE_DIR", "backend/cache")

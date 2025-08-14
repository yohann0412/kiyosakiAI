from dotenv import load_dotenv
import os

load_dotenv()

PORT = os.getenv("PORT")
REDIS_URL = os.getenv("REDIS_URL")

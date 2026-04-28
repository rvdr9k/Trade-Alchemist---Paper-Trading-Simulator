from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
import os

# Load .env relative to this file's location, not the CWD
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")


MONGO_URI = os.getenv("MONGODB_URI")

if not MONGO_URI:
    raise ValueError("MONGODB_URI not found in environment")

client = MongoClient(MONGO_URI)

db = client["trade_alchemist"]

live_prices = db["live_prices"]
historical_prices = db["historical_prices"]
metadata = db["metadata"]
transactions = db["transactions"]
market_state = db["market_state"]  

import json
import os
from datetime import datetime
from db.mongo_client import historical_prices
print("=== Historical loader started ===")

BASE_DIR = "historical_1y"
BATCH_SIZE = 1000
print("BASE_DIR:", BASE_DIR)
print("BASE_DIR contents:", os.listdir(BASE_DIR))


batch = []

def find_key(row, keyword):
    for k in row.keys():
        if keyword in k:
            return k
    return None

for exchange in os.listdir(BASE_DIR):
    exchange_path = os.path.join(BASE_DIR, exchange)
    if not os.path.isdir(exchange_path):
        continue

    for filename in os.listdir(exchange_path):
        if not filename.endswith("_1y.json"):
            continue

        symbol = filename.replace("_1y.json", "")
        filepath = os.path.join(exchange_path, filename)

        with open(filepath, "r") as f:
            rows = json.load(f)

        for row in rows:
            date_key = find_key(row, "Date")
            open_key = find_key(row, "Open")
            high_key = find_key(row, "High")
            low_key  = find_key(row, "Low")
            close_key= find_key(row, "Close")
            vol_key  = find_key(row, "Volume")

            if not all([date_key, open_key, high_key, low_key, close_key, vol_key]):
                continue

            doc = {
                "symbol": symbol,
                "exchange": exchange,
                "timestamp": datetime.fromisoformat(row[date_key]),
                "open": float(row[open_key]),
                "high": float(row[high_key]),
                "low": float(row[low_key]),
                "close": float(row[close_key]),
                "volume": int(row[vol_key])
            }

            batch.append(doc)

            if len(batch) >= BATCH_SIZE:
                historical_prices.insert_many(batch)
                batch.clear()

if batch:
    historical_prices.insert_many(batch)

print("Historical data loaded successfully")

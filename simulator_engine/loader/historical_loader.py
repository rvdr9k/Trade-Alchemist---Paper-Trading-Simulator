import json
from datetime import datetime
from pathlib import Path
from db.mongo_client import historical_prices
print("=== Historical loader started ===")

PROJECT_DIR = Path(__file__).resolve().parent.parent
BASE_DIR = PROJECT_DIR / "Data" / "historical_1y"
LEGACY_BASE_DIR = PROJECT_DIR / "historical_1y"

if not BASE_DIR.exists() and LEGACY_BASE_DIR.exists():
    BASE_DIR = LEGACY_BASE_DIR

BATCH_SIZE = 1000
print("BASE_DIR:", BASE_DIR)
print("BASE_DIR contents:", [path.name for path in BASE_DIR.iterdir()])


batch = []

def find_key(row, keyword):
    for k in row.keys():
        if keyword in k:
            return k
    return None

for exchange_path in BASE_DIR.iterdir():
    exchange = exchange_path.name
    if not exchange_path.is_dir():
        continue

    for historical_path in exchange_path.iterdir():
        filename = historical_path.name
        if not filename.endswith("_1y.json"):
            continue

        symbol = filename.replace("_1y.json", "")
        with historical_path.open("r") as f:
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

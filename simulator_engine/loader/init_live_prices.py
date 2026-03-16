from db.mongo_client import historical_prices, live_prices
from pymongo import DESCENDING

print("=== Initializing live prices ===")

live_prices.delete_many({})  # safe at this stage

symbols = historical_prices.aggregate([
    {
        "$group": {
            "_id": {
                "symbol": "$symbol",
                "exchange": "$exchange"
            }
        }
    }
])

count = 0
skipped = 0

for s in symbols:
    symbol = s["_id"]["symbol"]
    exchange = s["_id"]["exchange"]

    latest = historical_prices.find_one(
        {"symbol": symbol, "exchange": exchange},
        sort=[("timestamp", DESCENDING)]
    )

    # SAFETY CHECKS
    if not latest:
        skipped += 1
        continue

    if "close" not in latest:
        skipped += 1
        continue

    live_prices.insert_one({
        "symbol": symbol,
        "exchange": exchange,
        "price": float(latest["close"]),
        "last_update": latest["timestamp"],
        "source": "historical_init"
    })

    count += 1

print(f"Live prices initialized for {count} stocks")
print(f"Skipped stocks due to missing data: {skipped}")

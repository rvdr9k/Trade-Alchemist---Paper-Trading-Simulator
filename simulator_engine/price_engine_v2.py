import random
from datetime import datetime, timezone
from db.mongo_client import live_prices, historical_prices, metadata

# ================= CONFIG =================
BASE_MOVE = 0.001   # 0.1%
VOLUME_RANGE = (1000, 10000)
# ==========================================

print("=== Volatility-Aware Price Engine Tick ===")

stocks = list(live_prices.find({}))
tick_time = datetime.now(timezone.utc)

updated = 0

for stock in stocks:
    symbol = stock["symbol"]
    exchange = stock["exchange"]
    old_price = stock["price"]

    # fetch volatility
    meta = metadata.find_one(
        {"symbol": symbol, "exchange": exchange},
        {"avgVolatility": 1}
    )

    volatility = meta.get("avgVolatility", 1.0) if meta else 1.0

    max_move = BASE_MOVE * volatility
    pct_change = random.uniform(-max_move, max_move)

    new_price = round(old_price * (1 + pct_change), 2)
    if new_price <= 0:
        continue

    # update live price
    live_prices.update_one(
        {"_id": stock["_id"]},
        {
            "$set": {
                "price": new_price,
                "last_update": tick_time,
                "source": "simulation_v2"
            }
        }
    )

    # append to history
    historical_prices.insert_one({
        "symbol": symbol,
        "exchange": exchange,
        "timestamp": tick_time,
        "open": old_price,
        "high": max(old_price, new_price),
        "low": min(old_price, new_price),
        "close": new_price,
        "volume": random.randint(*VOLUME_RANGE)
    })

    updated += 1

print(f"=== Tick Complete | Updated {updated} stocks ===")

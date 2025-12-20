import random
from datetime import datetime, timezone
from db.mongo_client import (
    live_prices,
    historical_prices,
    metadata,
    market_state
)

# ================= CONFIG =================
BASE_MOVE = 0.001
VOLUME_RANGE = (1000, 10000)

CRASH_PROB = 0.002
BOOM_PROB  = 0.003

CRASH_MULTIPLIER = 2.5
BOOM_MULTIPLIER  = 1.5

CRASH_BIAS = -0.002
BOOM_BIAS  =  0.0015
# ==========================================

tick_time = datetime.now(timezone.utc)

# ---- Load market state ----
state_doc = market_state.find_one({})
state = state_doc["state"]
remaining = state_doc["remaining_ticks"]

# ---- Possibly start a new regime ----
if remaining <= 0:
    r = random.random()
    if r < CRASH_PROB:
        state = "CRASH"
        remaining = random.randint(5, 15)
        print(">>> MARKET CRASH STARTED <<<")
    elif r < CRASH_PROB + BOOM_PROB:
        state = "BOOM"
        remaining = random.randint(5, 10)
        print(">>> MARKET BOOM STARTED <<<")
    else:
        state = "NORMAL"
        remaining = 0

# ---- Regime parameters ----
if state == "CRASH":
    regime_multiplier = CRASH_MULTIPLIER
    regime_bias = CRASH_BIAS
elif state == "BOOM":
    regime_multiplier = BOOM_MULTIPLIER
    regime_bias = BOOM_BIAS
else:
    regime_multiplier = 1.0
    regime_bias = 0.0

print(f"Market state: {state} | Remaining ticks: {remaining}")

# ---- Price update ----
stocks = list(live_prices.find({}))
updated = 0

for stock in stocks:
    symbol = stock["symbol"]
    exchange = stock["exchange"]
    old_price = stock["price"]

    meta = metadata.find_one(
        {"symbol": symbol, "exchange": exchange},
        {"avgVolatility": 1}
    )
    volatility = meta.get("avgVolatility", 1.0) if meta else 1.0

    max_move = BASE_MOVE * volatility * regime_multiplier
    pct_change = random.uniform(-max_move, max_move) + regime_bias

    new_price = round(old_price * (1 + pct_change), 2)
    if new_price <= 0:
        continue

    live_prices.update_one(
        {"_id": stock["_id"]},
        {
            "$set": {
                "price": new_price,
                "last_update": tick_time,
                "source": f"simulation_v3_{state.lower()}"
            }
        }
    )

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

# ---- Persist market state ----
market_state.update_one(
    {},
    {
        "$set": {
            "state": state,
            "remaining_ticks": max(remaining - 1, 0),
            "started_at": tick_time
        }
    }
)

print(f"Tick complete | Updated {updated} stocks")

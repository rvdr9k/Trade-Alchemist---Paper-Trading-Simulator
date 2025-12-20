import random
from db.mongo_client import live_prices, metadata

BASE_MOVE = 0.001  # same as engine v2

print("\n=== Volatility Effect Test ===\n")

# pick a small sample to compare
stocks = list(live_prices.find({}).limit(10))

results = []

for stock in stocks:
    symbol = stock["symbol"]
    exchange = stock["exchange"]
    price = stock["price"]

    meta = metadata.find_one(
        {"symbol": symbol, "exchange": exchange},
        {"avgVolatility": 1}
    )

    volatility = meta.get("avgVolatility", 1.0) if meta else 1.0
    max_move = BASE_MOVE * volatility

    simulated_change = random.uniform(-max_move, max_move)
    new_price = round(price * (1 + simulated_change), 2)

    results.append({
        "symbol": symbol,
        "exchange": exchange,
        "volatility": round(volatility, 3),
        "old_price": price,
        "max_pct_move": round(max_move * 100, 3),
        "simulated_pct": round(simulated_change * 100, 3),
        "new_price": new_price
    })

# sort by volatility to compare clearly
results.sort(key=lambda x: x["volatility"])

# pretty print
for r in results:
    print(
        f"{r['symbol']:15} | "
        f"vol={r['volatility']:>5} | "
        f"max_move=±{r['max_pct_move']:>6}% | "
        f"actual={r['simulated_pct']:>6}% | "
        f"{r['old_price']} → {r['new_price']}"
    )

print("\n=== End of Test ===\n")

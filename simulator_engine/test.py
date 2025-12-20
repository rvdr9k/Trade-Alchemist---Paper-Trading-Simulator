from db.mongo_client import live_prices, historical_prices

live_prices.create_index(
    [("symbol", 1), ("exchange", 1)],
    unique=True
)

historical_prices.create_index(
    [("symbol", 1), ("exchange", 1), ("timestamp", 1)]
)

from datetime import datetime, timezone
from db.mongo_client import transactions, live_prices

COMMISSION_RATE = 0.002  # 0.2%

def insert_test_trade(user_id, symbol, exchange, side, quantity):
    live = live_prices.find_one({"symbol": symbol, "exchange": exchange})
    if not live:
        raise ValueError("Live price not found")

    price = live["price"]
    gross_value = round(price * quantity, 2)

    commission_amount = 0.0
    commission_rate = 0.0
    net_value = gross_value

    if side == "SELL":
        commission_rate = COMMISSION_RATE
        commission_amount = round(gross_value * COMMISSION_RATE, 2)
        net_value = round(gross_value - commission_amount, 2)

    transaction = {
        "user_id": user_id,
        "symbol": symbol,
        "exchange": exchange,
        "side": side,
        "quantity": quantity,
        "price": price,

        "gross_value": gross_value,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "net_value": net_value,

        "timestamp": datetime.now(timezone.utc)
    }

    transactions.insert_one(transaction)
    print(f"{side} transaction inserted:", transaction)


# ===== RUN TESTS =====
insert_test_trade(
    user_id="test_user",
    symbol="ASIANPAINT.BO",   # use any valid symbol in live_prices
    exchange="BSE",
    side="BUY",
    quantity=10
)

insert_test_trade(
    user_id="test_user",
    symbol="ASIANPAINT.BO",
    exchange="BSE",
    side="SELL",
    quantity=10
)

import random
import threading
from datetime import datetime, timezone

from pymongo import InsertOne, UpdateOne

from db.mongo_client import historical_prices, live_prices, market_state, metadata


BASE_MOVE = 0.001
VOLUME_RANGE = (1000, 10000)

CRASH_PROB = 0.002
BOOM_PROB = 0.003

CRASH_MULTIPLIER = 2.5
BOOM_MULTIPLIER = 1.5

CRASH_BIAS = -0.002
BOOM_BIAS = 0.0015

MOMENTUM_FACTOR = 0.3
PRICE_TICK_LOCK = threading.Lock()


def _load_market_regime():
    state_doc = market_state.find_one({}) or {}
    state = state_doc.get("state", "NORMAL")
    remaining = state_doc.get("remaining_ticks", 0)

    if remaining <= 0:
        roll = random.random()
        if roll < CRASH_PROB:
            return "CRASH", random.randint(5, 15)
        if roll < CRASH_PROB + BOOM_PROB:
            return "BOOM", random.randint(5, 10)
        return "NORMAL", 0

    return state, remaining


def _get_regime_params(state):
    if state == "CRASH":
        return CRASH_MULTIPLIER, CRASH_BIAS
    if state == "BOOM":
        return BOOM_MULTIPLIER, BOOM_BIAS
    return 1.0, 0.0


def _get_metadata_by_symbol(symbols):
    if not symbols:
        return {}

    rows = metadata.find(
        {"ticker": {"$in": symbols}},
        {"_id": 0, "ticker": 1, "symbol": 1, "exchange": 1, "avgVolatility": 1},
    )

    by_symbol = {}
    for row in rows:
        key = row.get("ticker") or row.get("symbol")
        if key:
            by_symbol[key] = row
    return by_symbol


def run_price_tick():
    if not PRICE_TICK_LOCK.acquire(blocking=False):
        state_doc = market_state.find_one({}, {"_id": 0}) or {}
        return {
            "updated": 0,
            "state": state_doc.get("state", "NORMAL"),
            "remaining_ticks": state_doc.get("remaining_ticks", 0),
            "last_tick_at": state_doc.get("last_tick_at"),
            "skipped": True,
            "reason": "tick already running",
        }

    try:
        tick_time = datetime.now(timezone.utc)
        state, remaining = _load_market_regime()
        regime_multiplier, regime_bias = _get_regime_params(state)
        stocks = list(live_prices.find({}))
        metadata_by_symbol = _get_metadata_by_symbol(
            [stock.get("symbol") for stock in stocks if stock.get("symbol")]
        )
        live_updates = []
        history_inserts = []

        for stock in stocks:
            symbol = stock.get("symbol")
            exchange = stock.get("exchange")
            old_price = stock.get("price")

            if not symbol or not exchange or old_price is None or old_price <= 0:
                continue

            meta = metadata_by_symbol.get(symbol, {})
            volatility = float(meta.get("avgVolatility", 1.0))
            max_move = BASE_MOVE * volatility * regime_multiplier
            random_move = random.gauss(0, max_move)
            drift = (old_price - stock.get("prev_price", old_price)) / old_price
            momentum = drift * MOMENTUM_FACTOR
            pct_change = random_move + momentum + regime_bias
            new_price = round(old_price * (1 + pct_change), 2)

            if new_price <= 0:
                continue

            candle_high = max(old_price, new_price)
            candle_low = min(old_price, new_price)
            volume = random.randint(*VOLUME_RANGE)
            change = round(new_price - old_price, 2)
            percent_change = round((change / old_price) * 100, 4)

            live_updates.append(
                UpdateOne(
                    {"_id": stock["_id"]},
                    {
                        "$set": {
                            "price": new_price,
                            "prev_price": old_price,
                            "prevClose": old_price,
                            "open": old_price,
                            "high": candle_high,
                            "low": candle_low,
                            "close": new_price,
                            "volume": volume,
                            "change": change,
                            "percentChange": percent_change,
                            "last_update": tick_time,
                            "source": f"simulation_v4_{state.lower()}",
                        }
                    },
                )
            )

            history_inserts.append(
                InsertOne(
                    {
                        "symbol": symbol,
                        "exchange": exchange,
                        "timestamp": tick_time,
                        "open": old_price,
                        "high": candle_high,
                        "low": candle_low,
                        "close": new_price,
                        "volume": volume,
                    }
                )
            )

        if live_updates:
            live_prices.bulk_write(live_updates, ordered=False)
        if history_inserts:
            historical_prices.bulk_write(history_inserts, ordered=False)

        updated = len(live_updates)
        market_state.update_one(
            {},
            {
                "$set": {
                    "state": state,
                    "remaining_ticks": max(remaining - 1, 0),
                    "started_at": tick_time,
                    "last_tick_at": tick_time,
                    "last_tick_updated": updated,
                }
            },
            upsert=True,
        )

        return {
            "updated": updated,
            "state": state,
            "remaining_ticks": max(remaining - 1, 0),
            "last_tick_at": tick_time.isoformat(),
            "skipped": False,
        }
    finally:
        PRICE_TICK_LOCK.release()

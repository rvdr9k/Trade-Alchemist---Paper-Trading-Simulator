import os
import re
import webbrowser
import threading
from typing import Optional
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db.mongo_client import live_prices, historical_prices, market_state, metadata
from trade_executor import execute_trade


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup logic ---
    if os.getenv("AUTO_OPEN_DOCS", "false").lower() == "true":
        host = os.getenv("APP_HOST", "127.0.0.1")
        port = os.getenv("APP_PORT", "8000")
        url = f"http://{host}:{port}/docs"

        threading.Timer(1.5, lambda: webbrowser.open(url)).start()

    yield

    # --- shutdown logic (optional) ---

app = FastAPI(lifespan=lifespan)

# allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EXCHANGE_TO_METADATA_CODE = {
    "NSE": "NSI",
    "BSE": "BSE",
    "NYSE": "NYQ",
    "NASDAQ": "NMS",
    "LSE": "LSE",
    "HKEX": "HKG",
    "SSE": "SSE",
    "ASX": "ASX",
    "TSX": "TOR",
    "JPX": "JPX",
    "NATIONAL STOCK EXCHANGE OF INDIA": "NSI",
    "BOMBAY STOCK EXCHANGE": "BSE",
    "NEW YORK STOCK EXCHANGE": "NYQ",
    "LONDON STOCK EXCHANGE": "LSE",
    "HONG KONG STOCK EXCHANGE": "HKG",
    "SHANGHAI STOCK EXCHANGE": "SSE",
    "AUSTRALIAN SECURITIES EXCHANGE": "ASX",
    "TORONTO STOCK EXCHANGE": "TOR",
    "TOKYO STOCK EXCHANGE": "JPX",
}


def normalize_exchange(exchange: Optional[str]) -> Optional[str]:
    if not exchange:
        return None
    normalized = exchange.strip().upper()
    return EXCHANGE_TO_METADATA_CODE.get(normalized, normalized)

@app.get("/prices/live")
def get_live_prices():
    live_data = list(live_prices.find({}, {"_id": 0}))
    symbols = [row.get("symbol") for row in live_data if row.get("symbol")]

    metadata_rows = list(
        metadata.find(
            {"ticker": {"$in": symbols}},
            {"_id": 0}
        )
    ) if symbols else []
    metadata_by_ticker = {row.get("ticker"): row for row in metadata_rows}

    enriched = []
    for row in live_data:
        symbol = row.get("symbol")
        meta = metadata_by_ticker.get(symbol, {})
        merged = {**row, **meta}
        enriched.append(merged)

    return enriched


@app.get("/stocks/search")
def search_stocks(exchange: Optional[str] = None, q: Optional[str] = None, limit: int = 50):
    query_filter = {}
    exchange_code = normalize_exchange(exchange)
    if exchange_code:
        query_filter["exchange"] = {"$regex": f"^{re.escape(exchange_code)}$", "$options": "i"}

    query_text = (q or "").strip()
    if query_text:
        escaped = re.escape(query_text)
        query_filter["$or"] = [
            {"ticker": {"$regex": escaped, "$options": "i"}},
            {"companyName": {"$regex": escaped, "$options": "i"}},
        ]

    safe_limit = max(1, min(limit, 200))
    metadata_rows = list(
        metadata.find(
            query_filter,
            {"_id": 0},
        )
        .sort("ticker", 1)
        .limit(safe_limit)
    )

    tickers = [row.get("ticker") for row in metadata_rows if row.get("ticker")]
    live_rows = (
        list(
            live_prices.find(
                {"symbol": {"$in": tickers}},
                {"_id": 0},
            )
        )
        if tickers
        else []
    )
    live_by_symbol = {row.get("symbol"): row for row in live_rows}

    enriched = []
    for row in metadata_rows:
        ticker = row.get("ticker")
        live = live_by_symbol.get(ticker, {})
        enriched.append({**live, **row})

    return {"data": enriched}

@app.get("/market/state")
def get_market_state():
    return market_state.find_one({}, {"_id": 0})

@app.get("/prices/history/{symbol}")
def get_price_history(symbol: str):
    data = historical_prices.find(
        {"symbol": symbol},
        {"_id": 0}
    ).sort("timestamp", -1).limit(200)

    return list(data)

@app.get("/metadata/{symbol}")
def get_metadata(symbol: str):
    record = metadata.find_one({"ticker": symbol}, {"_id": 0})
    if not record:
        return JSONResponse(
            status_code=404,
            content={"status": "error", "message": f"Metadata not found for {symbol}"}
        )
    return record

class TradeRequest(BaseModel):
    user_id: str
    symbol: str
    exchange: str
    quantity: int


@app.post("/trade/buy")
def buy_trade(req: TradeRequest):
    trade = execute_trade(
        req.user_id,
        req.symbol,
        req.exchange,
        "BUY",
        req.quantity
    )
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "data": trade
        }
    )


@app.post("/trade/sell")
def sell_trade(req: TradeRequest):
    trade = execute_trade(
        req.user_id,
        req.symbol,
        req.exchange,
        "SELL",
        req.quantity
    )
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "data": trade
        }
    )


from fastapi import Request

@app.get("/")
def root(request: Request):
    base = str(request.base_url).rstrip("/")
    return {
        "status": "Backend running",
        "docs": f"{base}/docs",
        "openapi": f"{base}/openapi.json"
    }

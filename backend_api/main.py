import os
import re
import webbrowser
import threading
from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db.mongo_client import (
    historical_prices,
    live_prices,
    market_state,
    metadata,
    portfolios,
    holdings,
    transactions,
    users,
    watchlists,
)
from trade_executor import execute_trade
from auth_utils import get_current_user


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

DEFAULT_STARTING_CAPITAL = 100000

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


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def get_user_display_name(current_user: dict):
    return current_user.get("name") or current_user.get("email") or current_user["uid"]


def get_user_transaction_query(uid: str):
    return {"$or": [{"uid": uid}, {"user_id": uid}]}


def parse_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def parse_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def get_transaction_datetime(document: dict):
    return (
        document.get("timestamp")
        or document.get("dateTime")
        or document.get("datetime")
        or document.get("createdAt")
        or utc_now_iso()
    )


def get_metadata_by_ticker(tickers: list[str]):
    if not tickers:
        return {}
    rows = list(metadata.find({"ticker": {"$in": tickers}}, {"_id": 0}))
    return {row.get("ticker"): row for row in rows if row.get("ticker")}


def get_live_prices_by_symbol(symbols: list[str]):
    if not symbols:
        return {}
    rows = list(live_prices.find({"symbol": {"$in": symbols}}, {"_id": 0}))
    return {row.get("symbol"): row for row in rows if row.get("symbol")}


def build_holdings_snapshot(uid: str, display_name: str):
    transaction_docs = list(
        transactions.find(get_user_transaction_query(uid)).sort("timestamp", 1)
    )

    aggregated = {}
    for document in transaction_docs:
        symbol = document.get("symbol") or document.get("ticker")
        exchange = document.get("exchange") or ""
        if not symbol:
            continue

        key = f"{symbol}::{exchange}"
        side = (document.get("side") or document.get("type") or "").upper()
        quantity = parse_int(document.get("quantity") or document.get("shares"))
        price = parse_float(document.get("price"))

        if quantity <= 0:
            continue

        snapshot = aggregated.setdefault(
            key,
            {
                "ticker": symbol,
                "exchange": exchange,
                "quantity": 0,
                "cost_basis": 0.0,
                "lastTradeAt": get_transaction_datetime(document),
            },
        )
        snapshot["lastTradeAt"] = get_transaction_datetime(document)

        if side == "BUY":
            snapshot["quantity"] += quantity
            snapshot["cost_basis"] += price * quantity
        elif side == "SELL":
            current_quantity = snapshot["quantity"]
            average_price = (
                snapshot["cost_basis"] / current_quantity if current_quantity > 0 else 0.0
            )
            sold_quantity = min(current_quantity, quantity)
            snapshot["quantity"] = max(0, current_quantity - quantity)
            snapshot["cost_basis"] = max(
                0.0,
                snapshot["cost_basis"] - (average_price * sold_quantity),
            )

    open_positions = [row for row in aggregated.values() if row["quantity"] > 0]
    tickers = [row["ticker"] for row in open_positions]
    metadata_by_ticker = get_metadata_by_ticker(tickers)
    live_by_symbol = get_live_prices_by_symbol(tickers)

    holdings_docs = []
    for row in open_positions:
        ticker = row["ticker"]
        current_quantity = row["quantity"]
        hold_price = round(row["cost_basis"] / current_quantity, 2) if current_quantity > 0 else 0.0
        meta = metadata_by_ticker.get(ticker, {})
        live = live_by_symbol.get(ticker, {})
        current_price = parse_float(
            live.get("price")
            or live.get("currentPrice")
            or meta.get("lastClose")
            or meta.get("last_close")
        )
        total_pl = round((current_price - hold_price) * current_quantity, 2)
        holdings_docs.append(
            {
                "uid": uid,
                "displayName": display_name,
                "ticker": ticker,
                "companyName": meta.get("companyName") or meta.get("company_name") or ticker,
                "exchange": row["exchange"] or meta.get("exchange") or "",
                "quantity": current_quantity,
                "holdPrice": hold_price,
                "currentPrice": round(current_price, 2),
                "totalPL": total_pl,
                "updatedAt": utc_now_iso(),
                "lastTradeAt": row["lastTradeAt"],
            }
        )

    holdings.delete_many({"uid": uid})
    if holdings_docs:
        holdings.insert_many([doc.copy() for doc in holdings_docs])

    return [{key: value for key, value in doc.items() if key != "_id"} for doc in holdings_docs]


def sync_portfolio_snapshot(uid: str, display_name: str):
    holdings_docs = build_holdings_snapshot(uid, display_name)

    portfolio_doc = portfolios.find_one({"uid": uid}, {"_id": 0}) or {
        "uid": uid,
        "buyingPower": DEFAULT_STARTING_CAPITAL,
    }
    buying_power = parse_float(portfolio_doc.get("buyingPower"), DEFAULT_STARTING_CAPITAL)
    investment_value = round(
        sum(parse_float(item.get("holdPrice")) * parse_int(item.get("quantity")) for item in holdings_docs),
        2,
    )
    market_value = round(
        sum(parse_float(item.get("currentPrice")) * parse_int(item.get("quantity")) for item in holdings_docs),
        2,
    )
    unrealised_pl = round(market_value - investment_value, 2)
    todays_pl = round(sum(parse_float(item.get("totalPL")) for item in holdings_docs), 2)
    total_portfolio_value = round(buying_power + market_value, 2)

    updated_portfolio = {
        "uid": uid,
        "displayName": display_name,
        "buyingPower": buying_power,
        "totalPortfolioValue": total_portfolio_value,
        "investmentValue": investment_value,
        "unrealisedPL": unrealised_pl,
        "todaysPL": todays_pl,
        "updatedAt": utc_now_iso(),
    }

    portfolios.update_one(
        {"uid": uid},
        {
            "$set": updated_portfolio,
            "$setOnInsert": {"createdAt": utc_now_iso()},
        },
        upsert=True,
    )

    return updated_portfolio, holdings_docs


def get_enriched_watchlist(uid: str):
    docs = list(
        watchlists.find({"uid": uid}, {"_id": 0}).sort("ticker", 1)
    )
    tickers = [doc.get("ticker") for doc in docs if doc.get("ticker")]
    metadata_by_ticker = get_metadata_by_ticker(tickers)
    live_by_symbol = get_live_prices_by_symbol(tickers)

    enriched = []
    for document in docs:
        ticker = document.get("ticker")
        meta = metadata_by_ticker.get(ticker, {})
        live = live_by_symbol.get(ticker, {})
        enriched.append({**meta, **live, **document})

    return enriched


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user_doc = users.find_one({"uid": current_user["uid"]}, {"_id": 0})
    portfolio_doc, _ = sync_portfolio_snapshot(
        current_user["uid"], get_user_display_name(current_user)
    )
    return {
        "auth": current_user,
        "user": user_doc,
        "portfolio": portfolio_doc,
    }


@app.post("/me/init")
def init_me(current_user: dict = Depends(get_current_user)):
    now = utc_now_iso()
    uid = current_user["uid"]
    display_name = get_user_display_name(current_user)

    user_exists = users.find_one({"uid": uid}, {"_id": 1}) is not None
    portfolio_exists = portfolios.find_one({"uid": uid}, {"_id": 1}) is not None

    users.update_one(
        {"uid": uid},
        {
            "$set": {
                "email": current_user.get("email"),
                "displayName": display_name,
                "updatedAt": now,
            },
            "$unset": {
                "photoURL": "",
            },
            "$setOnInsert": {
                "uid": uid,
                "createdAt": now,
            },
        },
        upsert=True,
    )

    portfolios.update_one(
        {"uid": uid},
        {
            "$set": {
                "displayName": display_name,
                "updatedAt": now,
            },
            "$setOnInsert": {
                "uid": uid,
                "buyingPower": DEFAULT_STARTING_CAPITAL,
                "totalPortfolioValue": DEFAULT_STARTING_CAPITAL,
                "investmentValue": 0,
                "unrealisedPL": 0,
                "todaysPL": 0,
                "createdAt": now,
            },
        },
        upsert=True,
    )

    watchlists.update_many({"uid": uid}, {"$set": {"displayName": display_name}})
    holdings.update_many({"uid": uid}, {"$set": {"displayName": display_name}})

    user_doc = users.find_one({"uid": uid}, {"_id": 0})
    portfolio_doc, _ = sync_portfolio_snapshot(uid, display_name)

    return {
        "status": "ok",
        "created": {
            "user": not user_exists,
            "portfolio": not portfolio_exists,
        },
        "user": user_doc,
        "portfolio": portfolio_doc,
    }


@app.get("/portfolio")
def get_portfolio(current_user: dict = Depends(get_current_user)):
    portfolio_doc, _ = sync_portfolio_snapshot(
        current_user["uid"], get_user_display_name(current_user)
    )
    return {"data": portfolio_doc}


@app.get("/holdings")
def get_holdings(current_user: dict = Depends(get_current_user)):
    _, holdings_docs = sync_portfolio_snapshot(
        current_user["uid"], get_user_display_name(current_user)
    )
    return {"data": holdings_docs}


@app.get("/transactions")
def get_transactions(current_user: dict = Depends(get_current_user)):
    uid = current_user["uid"]
    docs = list(
        transactions.find(get_user_transaction_query(uid)).sort("timestamp", -1)
    )
    metadata_by_ticker = get_metadata_by_ticker(
        [doc.get("symbol") or doc.get("ticker") for doc in docs if doc.get("symbol") or doc.get("ticker")]
    )
    normalized = []
    for document in docs:
        ticker = document.get("symbol") or document.get("ticker")
        meta = metadata_by_ticker.get(ticker, {})
        normalized.append(
            {
                "id": str(document.get("_id")),
                "uid": uid,
                "ticker": ticker,
                "company": document.get("company")
                or document.get("companyName")
                or meta.get("companyName")
                or ticker,
                "exchange": document.get("exchange") or meta.get("exchange") or "",
                "type": (document.get("side") or document.get("type") or "").lower(),
                "shares": parse_int(document.get("quantity") or document.get("shares")),
                "price": parse_float(document.get("price")),
                "dateTime": get_transaction_datetime(document),
            }
        )
        normalized[-1]["totalValue"] = (
            parse_float(
                document.get("gross_value")
                or document.get("grossValue")
                or document.get("net_value")
                or document.get("netValue")
            )
            or round(normalized[-1]["shares"] * normalized[-1]["price"], 2)
        )
    return {"data": normalized}


@app.get("/watchlist")
def get_watchlist(current_user: dict = Depends(get_current_user)):
    return {"data": get_enriched_watchlist(current_user["uid"])}


class WatchlistRequest(BaseModel):
    symbol: str
    exchange: str
    companyName: Optional[str] = None


@app.post("/watchlist")
def add_watchlist_item(
    req: WatchlistRequest,
    current_user: dict = Depends(get_current_user),
):
    now = utc_now_iso()
    display_name = get_user_display_name(current_user)
    meta = metadata.find_one({"ticker": req.symbol}, {"_id": 0}) or {}
    document = {
        "uid": current_user["uid"],
        "displayName": display_name,
        "ticker": req.symbol,
        "exchange": req.exchange or meta.get("exchange") or "",
        "companyName": req.companyName or meta.get("companyName") or req.symbol,
        "updatedAt": now,
    }
    watchlists.update_one(
        {
            "uid": current_user["uid"],
            "ticker": req.symbol,
            "exchange": document["exchange"],
        },
        {
            "$set": document,
            "$setOnInsert": {"createdAt": now},
        },
        upsert=True,
    )
    saved = next(
        (
            item
            for item in get_enriched_watchlist(current_user["uid"])
            if item.get("ticker") == req.symbol and item.get("exchange") == document["exchange"]
        ),
        None,
    )
    return {"status": "ok", "data": saved}


@app.delete("/watchlist/{symbol}")
def delete_watchlist_item(
    symbol: str,
    exchange: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    query = {"uid": current_user["uid"], "ticker": symbol}
    if exchange:
        query["exchange"] = exchange
    watchlists.delete_many(query)
    return {"status": "ok"}

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
    symbol: str
    exchange: str
    quantity: int


@app.post("/trade/buy")
def buy_trade(req: TradeRequest, current_user: dict = Depends(get_current_user)):
    try:
        trade = execute_trade(
            current_user["uid"],
            get_user_display_name(current_user),
            req.symbol,
            req.exchange,
            "BUY",
            req.quantity
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return JSONResponse(
        status_code=200,
        content={
            "status": "ok",
            "data": trade
        }
    )


@app.post("/trade/sell")
def sell_trade(req: TradeRequest, current_user: dict = Depends(get_current_user)):
    try:
        trade = execute_trade(
            current_user["uid"],
            get_user_display_name(current_user),
            req.symbol,
            req.exchange,
            "SELL",
            req.quantity
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
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

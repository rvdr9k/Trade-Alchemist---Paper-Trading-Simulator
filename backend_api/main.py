from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.mongo_client import live_prices, historical_prices, market_state
from pydantic import BaseModel
from trade_executor import execute_trade


app = FastAPI()

# allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/prices/live")
def get_live_prices():
    return list(live_prices.find({}, {"_id": 0}))

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
class TradeRequest(BaseModel):
    user_id: str
    symbol: str
    exchange: str
    quantity: int


@app.post("/trade/buy")
def buy_trade(req: TradeRequest):
    return execute_trade(
        req.user_id,
        req.symbol,
        req.exchange,
        "BUY",
        req.quantity
    )


@app.post("/trade/sell")
def sell_trade(req: TradeRequest):
    return execute_trade(
        req.user_id,
        req.symbol,
        req.exchange,
        "SELL",
        req.quantity
    )
from datetime import datetime, timezone
from db.mongo_client import market_state

market_state.delete_many({})

market_state.insert_one({
    "state": "NORMAL",
    "remaining_ticks": 0,
    "started_at": datetime.now(timezone.utc)
})

print("Market state initialized")

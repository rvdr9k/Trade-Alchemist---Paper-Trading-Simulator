# Trade Alchemist – Paper Trading Simulator

## Requirements
- Python 3.10+
- VS Code
- MongoDB Atlas

---

## Setup

1. Open the project folder in VS Code.

2. Create `.env` files in: simulator_engine/.env and backend_api/.env

Add:
MONGODB_URI=your_mongodb_atlas_url_here


3. Install dependencies:
bash

pip install pymongo fastapi uvicorn python-dotenv

In backend_api
pip install firebase-admin

**Run**
Start Simulator

In terminal : cd simulator_engine -> python price_engine_v3.py

Start Backend API

In terminal : cd backend_api -> uvicorn main:app --reload
// python -m uvicorn main:app --reload

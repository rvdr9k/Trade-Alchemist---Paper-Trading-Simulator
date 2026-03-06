const API = process.env.NEXT_PUBLIC_API_URL;

export async function getLivePrices() {
  const res = await fetch(`${API}/prices/live`);
  return res.json();
}

export async function getPriceHistory(symbol: string) {
  const res = await fetch(`${API}/prices/history/${symbol}`);
  return res.json();
}

export async function buyStock(data: {
  user_id: string;
  symbol: string;
  exchange: string;
  quantity: number;
}) {
  const res = await fetch(`${API}/trade/buy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}

export async function sellStock(data: {
  user_id: string;
  symbol: string;
  exchange: string;
  quantity: number;
}) {
  const res = await fetch(`${API}/trade/sell`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return res.json();
}
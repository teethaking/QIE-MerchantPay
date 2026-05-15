import os
from typing import Literal

import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="QIE MerchantPay API", version="1.0.0")


def _allowed_origins() -> list[str]:
    """Return localhost and configured production origins for browser CORS."""
    configured = os.getenv("BACKEND_CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    defaults = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
    ]
    return sorted(set(defaults + origins))


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """Expose a lightweight liveness check for deploys and local development."""
    return {"status": "ok"}


@app.get("/price")
async def price(
    currency: Literal["USD", "EUR"] = Query("USD", description="Fiat quote currency"),
) -> dict[str, float | str | bool]:
    """Return the QIE price in USD or EUR, falling back to a stable mock price."""
    selected = currency.lower()
    fallback_usd = 0.08
    fallback_eur = 0.074
    fallback_price = fallback_usd if selected == "usd" else fallback_eur
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {"ids": "qie", "vs_currencies": "usd,eur"}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            live_price = data.get("qie", {}).get(selected)
            if isinstance(live_price, (int, float)) and live_price > 0:
                return {"symbol": "QIE", "currency": currency, "price": float(live_price), "mock": False}
    except (httpx.HTTPError, ValueError):
        pass

    return {"symbol": "QIE", "currency": currency, "price": fallback_price, "mock": True}

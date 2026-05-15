"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function PriceConverter({ fiatAmount, currency, onQuoteChange }) {
  const [price, setPrice] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      // Fetch a fresh QIE quote whenever the merchant's selected currency changes.
      try {
        setError("");
        const response = await fetch(`${API_BASE_URL}/price?currency=${currency}`);
        if (!response.ok) {
          throw new Error("Price service unavailable");
        }
        const data = await response.json();
        if (!cancelled) {
          setPrice(Number(data.price));
          setIsMock(Boolean(data.mock));
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
          setPrice(currency === "EUR" ? 0.074 : 0.08);
          setIsMock(true);
        }
      }
    }

    fetchPrice();
    const intervalId = setInterval(fetchPrice, 30000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [currency]);

  const qieAmount = useMemo(() => {
    const amount = Number(fiatAmount);
    if (!price || !Number.isFinite(amount) || amount <= 0) {
      return "0";
    }
    return (amount / price).toFixed(6);
  }, [fiatAmount, price]);

  useEffect(() => {
    // Bubble the computed quote to the POS page so the QR code and poller use the same amount.
    onQuoteChange({ price, qieAmount, isMock });
  }, [price, qieAmount, isMock, onQuoteChange]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-glow">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-white/55">Live conversion</p>
          <p className="mt-1 text-2xl font-semibold text-white">{qieAmount} QIE</p>
        </div>
        <div className="rounded-full bg-qie/10 px-3 py-1 text-xs font-semibold text-qie">
          {price ? `1 QIE = ${price.toFixed(4)} ${currency}` : "Loading"}
        </div>
      </div>
      {isMock && (
        <p className="mt-3 text-xs text-amber-200/80">Using mock price because QIE is not listed or the live feed is unavailable.</p>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}

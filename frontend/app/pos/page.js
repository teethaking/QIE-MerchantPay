"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import PriceConverter from "../../components/PriceConverter";
import QRPayment from "../../components/QRPayment";
import { pollForPayment } from "../../utils/qie";

function currencySymbol(currency) {
  return currency === "EUR" ? "€" : "$";
}

export default function POSPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [fiatAmount, setFiatAmount] = useState("");
  const [quote, setQuote] = useState({ price: null, qieAmount: "0", isMock: false });
  const [checkoutState, setCheckoutState] = useState("idle");
  const [confirmedTx, setConfirmedTx] = useState(null);
  const [pollError, setPollError] = useState("");

  useEffect(() => {
    // Load the merchant identity established during onboarding.
    const saved = localStorage.getItem("qieMerchantSession");
    if (!saved) {
      router.replace("/");
      return;
    }
    setSession(JSON.parse(saved));
  }, [router]);

  const handleQuoteChange = useCallback((nextQuote) => {
    setQuote(nextQuote);
  }, []);

  useEffect(() => {
    if (checkoutState !== "waiting" || !session) {
      return undefined;
    }

    // Start payment polling only after a QR has been generated for the current sale.
    const stopPolling = pollForPayment(
      session.walletAddress,
      quote.qieAmount,
      (txHash) => {
        const completed = {
          date: new Date().toISOString(),
          fiatCurrency: session.currency,
          fiatAmount: Number(fiatAmount).toFixed(2),
          qieAmount: quote.qieAmount,
          txHash,
        };
        const existing = JSON.parse(localStorage.getItem("qieMerchantTransactions") || "[]");
        localStorage.setItem("qieMerchantTransactions", JSON.stringify([completed, ...existing]));
        setConfirmedTx(completed);
        setCheckoutState("confirmed");
      },
      (error) => setPollError(error.message || "Payment polling failed"),
    );

    return stopPolling;
  }, [checkoutState, fiatAmount, quote.qieAmount, session]);

  function generatePaymentQr() {
    if (!Number(fiatAmount) || Number(fiatAmount) <= 0 || Number(quote.qieAmount) <= 0) {
      setPollError("Enter a valid sale amount before generating a QR code.");
      return;
    }
    setPollError("");
    setConfirmedTx(null);
    setCheckoutState("waiting");
  }

  function resetSale() {
    setFiatAmount("");
    setConfirmedTx(null);
    setPollError("");
    setCheckoutState("idle");
  }

  if (!session) {
    return <main className="flex min-h-screen items-center justify-center text-white/60">Loading register…</main>;
  }

  if (checkoutState === "confirmed" && confirmedTx) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
        <section className="rounded-[2rem] border border-qie/30 bg-panel/85 p-6 text-center shadow-glow">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-qie text-4xl">✅</div>
          <h1 className="text-3xl font-black text-white">Payment received!</h1>
          <p className="mt-3 text-white/60">
            {currencySymbol(session.currency)}{Number(confirmedTx.fiatAmount).toFixed(2)} paid as {Number(confirmedTx.qieAmount).toFixed(6)} QIE.
          </p>
          <a
            href={`https://mainnet.qie.digital/tx/${confirmedTx.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 block break-all rounded-2xl bg-white/[0.05] p-3 text-sm text-qie underline decoration-qie/40 underline-offset-4"
          >
            {confirmedTx.txHash}
          </a>
          <button onClick={resetSale} className="mt-6 w-full rounded-2xl bg-qie px-5 py-4 font-bold text-ink hover:bg-qie/90">
            New Sale
          </button>
          <Link href="/dashboard" className="mt-4 block text-sm font-semibold text-white/55 hover:text-white">
            View dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-qie">{session.storeName}</p>
          <h1 className="text-3xl font-black text-white">Point of Sale</h1>
        </div>
        <Link href="/dashboard" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:border-qie/50 hover:text-qie">
          History
        </Link>
      </header>

      <section className="space-y-4">
        <label className="block rounded-[2rem] border border-white/10 bg-panel/80 p-5 shadow-glow">
          <span className="mb-3 block text-sm font-medium text-white/60">Sale amount ({session.currency})</span>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-black text-white/35">{currencySymbol(session.currency)}</span>
            <input
              value={fiatAmount}
              onChange={(event) => {
                setFiatAmount(event.target.value);
                if (checkoutState !== "idle") {
                  setCheckoutState("idle");
                }
              }}
              inputMode="decimal"
              placeholder="12.50"
              className="min-w-0 flex-1 bg-transparent text-5xl font-black text-white outline-none placeholder:text-white/18"
            />
          </div>
        </label>

        <PriceConverter fiatAmount={fiatAmount} currency={session.currency} onQuoteChange={handleQuoteChange} />

        <button onClick={generatePaymentQr} className="w-full rounded-2xl bg-qie px-5 py-4 font-bold text-ink transition hover:bg-qie/90">
          Generate Payment QR
        </button>

        {pollError && <p className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{pollError}</p>}

        {checkoutState === "waiting" && (
          <div className="space-y-4">
            <QRPayment merchantAddress={session.walletAddress} qieAmount={quote.qieAmount} />
            <div className="rounded-3xl border border-qie/20 bg-qie/10 p-4 text-center">
              <div className="mx-auto mb-3 h-3 w-3 animate-pulse rounded-full bg-qie" />
              <p className="font-semibold text-qie">Waiting for payment…</p>
              <p className="mt-1 text-xs text-white/45">Polling QIE mainnet every 3 seconds for a matching transfer.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

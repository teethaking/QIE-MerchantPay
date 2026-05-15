"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TxHistory from "../../components/TxHistory";

function downloadCsv(rows) {
  // Build a CSV in the browser so transaction history never leaves the device.
  const headers = ["date", "fiatCurrency", "fiatAmount", "qieAmount", "txHash"];
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((key) => `"${String(row[key]).replaceAll('"', '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `qie-merchantpay-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState([]);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    // Read local-only merchant and transaction data for the dashboard totals.
    const savedSession = JSON.parse(localStorage.getItem("qieMerchantSession") || "null");
    const savedTransactions = JSON.parse(localStorage.getItem("qieMerchantTransactions") || "[]");
    if (savedSession?.currency) {
      setCurrency(savedSession.currency);
    }
    setTransactions(savedTransactions);
  }, []);

  const totals = useMemo(() => {
    return transactions.reduce(
      (accumulator, tx) => ({
        qie: accumulator.qie + Number(tx.qieAmount || 0),
        fiat: accumulator.fiat + Number(tx.fiatAmount || 0),
      }),
      { qie: 0, fiat: 0 },
    );
  }, [transactions]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-qie">QIE MerchantPay</p>
          <h1 className="text-3xl font-black text-white">Transaction History</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/pos" className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:border-qie/50 hover:text-qie">
            POS
          </Link>
          <button
            onClick={() => downloadCsv(transactions)}
            disabled={!transactions.length}
            className="rounded-full bg-qie px-4 py-2 text-sm font-bold text-ink hover:bg-qie/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-5 shadow-glow">
          <p className="text-sm text-white/50">Total earned</p>
          <p className="mt-2 text-3xl font-black text-qie">{totals.qie.toFixed(6)} QIE</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-panel/80 p-5 shadow-glow">
          <p className="text-sm text-white/50">Fiat equivalent</p>
          <p className="mt-2 text-3xl font-black text-white">
            {totals.fiat.toFixed(2)} {currency}
          </p>
        </div>
      </section>

      <TxHistory transactions={transactions} />
    </main>
  );
}

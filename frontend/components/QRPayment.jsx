"use client";

import QRCode from "react-qr-code";

export default function QRPayment({ merchantAddress, qieAmount }) {
  const paymentUri = `qie:${merchantAddress}?amount=${qieAmount}&token=QUSDC`;

  return (
    <div className="rounded-[2rem] border border-qie/20 bg-white p-5 text-ink shadow-glow">
      <div className="mx-auto w-full max-w-[260px] rounded-2xl bg-white p-3">
        <QRCode value={paymentUri} size={232} className="h-auto w-full" />
      </div>
      <p className="mt-4 break-all rounded-2xl bg-black/5 p-3 text-xs text-black/65">{paymentUri}</p>
    </div>
  );
}

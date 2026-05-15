"use client";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function shortHash(hash) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export default function TxHistory({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center text-white/60">
        No completed payments yet. Your next QIE sale will appear here.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.18em] text-white/45">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Fiat</th>
              <th className="px-4 py-3">QIE</th>
              <th className="px-4 py-3">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {transactions.map((tx) => (
              <tr key={tx.txHash} className="text-white/78">
                <td className="whitespace-nowrap px-4 py-4">{formatDate(tx.date)}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  {Number(tx.fiatAmount).toFixed(2)} {tx.fiatCurrency}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-qie">{Number(tx.qieAmount).toFixed(6)}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  <a
                    href={`https://mainnet.qie.digital/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-qie underline decoration-qie/40 underline-offset-4"
                  >
                    {shortHash(tx.txHash)}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

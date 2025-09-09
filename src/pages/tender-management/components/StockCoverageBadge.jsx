// src/pages/tender-management/components/StockCoverageBadge.jsx
import React from "react";

export default function StockCoverageBadge({ days }) {
  const d = Number.isFinite(+days) ? +days : 0;
  let cls = "bg-zinc-200/60 text-zinc-800";
  if (d < 10) cls = "bg-rose-200/70 text-rose-900";
  else if (d < 30) cls = "bg-amber-200/70 text-amber-900";
  else cls = "bg-emerald-200/70 text-emerald-900";
  const label = d > 0 ? `${d} days` : "—";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

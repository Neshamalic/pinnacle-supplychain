// src/pages/import-management/components/ImportDetails.jsx
import React from "react";

/**
 * Renderiza la lista de items con:
 * - presentation_code · product_name · package_units
 * - lot_number, qty, unit_price (USD con 2 decimales)
 * - QC status por lote (badge)
 */
export default function ImportDetails({ items = [], loading = false, importRow }) {
  const fmtQty = (n) => new Intl.NumberFormat("en-US").format(n || 0);
  const fmtMoney2 = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n || 0);

  const qcBadge = (s) => {
    const v = (s || "").toLowerCase();
    const cls =
      v === "approved"
        ? "bg-emerald-100 text-emerald-700"
        : v === "rejected"
        ? "bg-red-100 text-red-700"
        : v === "in process" || v === "in_process" || v === "inprocess"
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{s || "—"}</span>;
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!items.length) {
    return <div className="p-6 text-sm text-muted-foreground">No items for this import.</div>;
  }

  return (
    <div className="p-6 space-y-3">
      {items.map((it, idx) => (
        <div
          key={`${it.presentationCode}-${it.lotNumber}-${idx}`}
          className="rounded-lg border p-4 bg-muted/20"
        >
          <div className="font-medium text-foreground">
            {it.presentationCode || "—"}
            <span className="text-muted-foreground">
              {" "}
              · {it.productName || "—"} {it.packageUnits ? `· ${it.packageUnits} units/pkg` : ""}
            </span>
          </div>

          <div className="mt-1 text-sm text-muted-foreground">
            Lot: <span className="font-medium text-foreground">{it.lotNumber || "—"}</span>{" "}
            · Qty: {fmtQty(it.qty)} · Unit: {fmtMoney2(it.unitPrice)}
          </div>

          <div className="mt-2">{qcBadge(it.qcStatus)}</div>
        </div>
      ))}
    </div>
  );
}

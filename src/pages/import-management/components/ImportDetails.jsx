// src/pages/import-management/components/ImportDetails.jsx
import React from "react";
import clsx from "clsx";

const fmtDate = (v) => {
  if (!v) return "—";
  try {
    const d = new Date(v);
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
};
const fmtMoney = (n) =>
  Number.isFinite(+n)
    ? `$${(+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";
const fmtUnit = (n) =>
  Number.isFinite(+n)
    ? (+n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

function Badge({ children, intent = "default" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
        intent === "success" && "bg-green-100 text-green-700",
        intent === "warn" && "bg-yellow-100 text-yellow-700",
        intent === "danger" && "bg-red-100 text-red-700",
        intent === "info" && "bg-blue-100 text-blue-700",
        intent === "default" && "bg-zinc-100 text-zinc-700"
      )}
    >
      {children}
    </span>
  );
}

export default function ImportDetails({ importRow, items = [], loading }) {
  const statusIntent =
    importRow?.importStatus === "warehouse"
      ? "success"
      : importRow?.importStatus === "transit"
      ? "warn"
      : "default";

  return (
    <div className="p-6 space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Arrival Date</div>
          <div className="font-medium">{fmtDate(importRow?.eta)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Transport</div>
          <div className="font-medium capitalize">{importRow?.transportType || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Import Status</div>
          <div className="font-medium">
            <Badge intent={statusIntent}>{importRow?.importStatus || "—"}</Badge>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">CIF Cost (USD)</div>
          <div className="font-medium">{fmtMoney(importRow?.totalCostUsd)}</div>
        </div>
      </div>

      {/* Items & lots */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Items & Lots</div>

        {loading ? (
          <div className="text-sm text-muted-foreground p-4">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4">No items for this import.</div>
        ) : (
          items.map((row, i) => {
            const qcIntent =
              row.qcStatus === "approved"
                ? "success"
                : row.qcStatus === "pending"
                ? "warn"
                : row.qcStatus === "rejected"
                ? "danger"
                : "default";

            return (
              <div
                key={`${row.presentationCode}-${row.lotNumber}-${i}`}
                className="rounded-lg border bg-card px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {/* >>> Aquí mostramos CODE + NAME + PACKAGE_UNITS */}
                    <div className="font-medium">
                      {row.presentationCode || "—"}
                      {row.productName ? ` · ${row.productName}` : ""}
                      {row.packageUnits ? ` · ${row.packageUnits} units/pack` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {row.lotNumber ? `Lot: ${row.lotNumber}` : ""}
                      {row.ociNumber ? ` · OCI: ${row.ociNumber}` : ""}
                      {row.poNumber ? ` · PO: ${row.poNumber}` : ""}
                    </div>
                  </div>

                  <div className="text-right text-sm shrink-0">
                    <div>Qty: {Number(row.qty || 0).toLocaleString()}</div>
                    <div>Unit: ${fmtUnit(row.unitPrice)}</div>
                  </div>
                </div>

                <div className="mt-2">
                  <Badge intent={qcIntent}>{row.qcStatus || "—"}</Badge>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

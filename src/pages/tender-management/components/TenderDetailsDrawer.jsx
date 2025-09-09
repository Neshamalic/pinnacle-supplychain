// src/pages/tender-management/components/TenderDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import Icon from "../../../components/AppIcon";
import TenderStatusBadge from "./TenderStatusBadge";
import StockCoverageBadge from "./StockCoverageBadge";

const fmtCLP = (v) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(
    Number.isFinite(+v) ? +v : 0
  );

const fmtDate = (dLike) => {
  if (!dLike) return "—";
  const d = new Date(dLike);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CL", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

export default function TenderDetailsDrawer({ open, onClose, tender }) {
  const [tab, setTab] = useState("products");

  const totals = useMemo(() => {
    if (!tender) return { items: 0, total: 0 };
    const sum = (tender.items || []).reduce((acc, it) => acc + (it.lineTotalCLP || 0), 0);
    return { items: (tender.items || []).length, total: sum };
  }, [tender]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-3xl h-full bg-card border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-xl font-semibold text-foreground">{tender?.title || "Tender"}</div>
            <div className="text-sm text-muted-foreground">{tender?.tenderId}</div>
          </div>
          <div className="flex items-center gap-3">
            <TenderStatusBadge status={tender?.status} />
            <StockCoverageBadge days={tender?.stockCoverageDays} />
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <Icon name="X" size={18} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-4">
          {["overview", "products", "delivery", "communications"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium ${
                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-110px)]">
          {tab === "overview" && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Tender ID:</span> {tender?.tenderId}</div>
              <div><span className="text-muted-foreground">Title:</span> {tender?.title || "—"}</div>
              <div><span className="text-muted-foreground">Delivery Date:</span> {fmtDate(tender?.deliveryDate)}</div>
              <div><span className="text-muted-foreground">Products:</span> {tender?.productsCount}</div>
              <div><span className="text-muted-foreground">Total CLP:</span> {fmtCLP(totals.total)}</div>
            </div>
          )}

          {tab === "products" && (
            <div className="space-y-3">
              {(tender?.items || []).map((it) => (
                <div key={`${it.presentationCode}-${it.productName}`} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">{it.productName || it.presentationCode}</div>
                      <div className="text-xs text-muted-foreground">{it.presentationCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">CLP {it.unitPrice} / unidad</div>
                      <div className="text-xs text-muted-foreground">Unidades por paquete: {it.packageUnits}</div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Awarded qty:</span> {it.awardedQty}</div>
                    <div><span className="text-muted-foreground">Packages:</span> {it.packageUnits}</div>
                    <div className="md:col-span-2 text-right font-medium">
                      {fmtCLP(it.lineTotalCLP)}
                    </div>
                  </div>
                </div>
              ))}

              {(!tender?.items || tender.items.length === 0) && (
                <div className="text-sm text-muted-foreground">No products found.</div>
              )}
            </div>
          )}

          {tab === "delivery" && (
            <div className="text-sm text-muted-foreground">Delivery details TBD.</div>
          )}
          {tab === "communications" && (
            <div className="text-sm text-muted-foreground">Communications integration TBD.</div>
          )}
        </div>
      </div>
    </div>
  );
}

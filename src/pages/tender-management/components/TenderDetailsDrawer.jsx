// src/pages/tender-management/components/TenderDetailsDrawer.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import TenderStatusBadge from "./TenderStatusBadge";
import StockCoverageBadge from "./StockCoverageBadge";
import { useSheet } from "@/lib/sheetsApi";
import { mapTenderItems, mapCommunications } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

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
  const [tab, setTab] = useState("overview");
  const [openNewComm, setOpenNewComm] = useState(false);

  // Items del tender
  const { rows: allItems = [], loading: loadingItems } = useSheet("tender_items", mapTenderItems);
  const { enrich } = usePresentationCatalog();

  const items = useMemo(() => {
    const list = (allItems || []).filter((r) => r.tenderId === (tender?.tenderId || ""));
    return enrich(list).map((r) => ({
      ...r,
      lineTotalCLP: (r.awardedQty || 0) * (r.unitPrice || 0) * (r.packageUnits || 1),
    }));
  }, [allItems, tender?.tenderId, enrich]);

  const totals = useMemo(() => {
    const total = items.reduce((acc, r) => acc + (r.lineTotalCLP || 0), 0);
    const products = new Set(items.map((i) => i.presentationCode)).size;
    const coverage = items.map((i) => Number(i.stockCoverageDays || 0)).filter(Boolean);
    const stockCoverageDays = coverage.length ? Math.min(...coverage) : 0;
    return { total, products, stockCoverageDays };
  }, [items]);

  // Comunicaciones (para refrescar después de guardar)
  const { refetch: refetchComms } = useSheet("communications", mapCommunications);

  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-card border-l border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <div className="text-xl font-semibold text-foreground">{tender?.title || "Tender"}</div>
            <div className="text-sm text-muted-foreground">{tender?.tenderId}</div>
          </div>
          <div className="flex items-center gap-3">
            <TenderStatusBadge status={tender?.status} />
            <StockCoverageBadge days={totals.stockCoverageDays} />
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <Icon name="X" size={18} />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border px-4">
          {[
            ["overview", "Overview", "Info"],
            ["products", "Products", "Cube"],
            ["delivery", "Delivery", "Truck"],
            ["communications", "Communications", "MessageCircle"],
            ["recommendations", "Recommendations", "Lightbulb"],
          ].map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${
                tab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon name={icon} size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-110px)]">
          {tab === "overview" && (
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <Card label="Tender ID" value={tender?.tenderId} />
              <Card label="Total CLP" value={fmtCLP(totals.total)} />
              <Card label="Products" value={totals.products} />
              <Card label="Status" value={<TenderStatusBadge status={tender?.status} />} />
              <Card label="Stock Coverage" value={<StockCoverageBadge days={totals.stockCoverageDays} />} />
              <Card label="Delivery Date" value={fmtDate(tender?.deliveryDate)} />
              <div className="md:col-span-3">
                <div className="text-xs text-muted-foreground mb-1">Description</div>
                <div className="rounded-lg border p-3 bg-muted/30">{tender?.description || "—"}</div>
              </div>
            </div>
          )}

          {tab === "products" && (
            <div className="space-y-3">
              {(items || []).map((it) => (
                <div key={`${it.presentationCode}-${it.lotNumber || "x"}`} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {it.productName || it.presentationCode}
                      </div>
                      <div className="text-xs text-muted-foreground">{it.presentationCode}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">{fmtCLP(it.unitPrice)} / unit</div>
                      {it.packageUnits ? (
                        <div className="text-xs text-muted-foreground">
                          Units per package: {it.packageUnits}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Awarded qty:</span> {it.awardedQty}</div>
                    <div><span className="text-muted-foreground">Currency:</span> {it.currency}</div>
                    <div className="md:col-span-2 text-right font-medium">{fmtCLP(it.lineTotalCLP)}</div>
                  </div>
                </div>
              ))}
              {loadingItems && <div className="text-sm text-muted-foreground">Loading items…</div>}
              {!loadingItems && (items || []).length === 0 && (
                <div className="text-sm text-muted-foreground">No products found.</div>
              )}
            </div>
          )}

          {tab === "delivery" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium mb-2">Delivery Schedule</div>
                <div className="rounded-md bg-muted/30 p-3">
                  <div className="text-sm">Full Delivery</div>
                  <div className="text-xs text-muted-foreground">{fmtDate(tender?.deliveryDate)} · scheduled</div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm font-medium mb-2">Shipping Information</div>
                <div className="rounded-md bg-muted/30 p-3 text-sm">
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground">Delivery Address</div>
                    <div>Almacén Central CENABAST, Maipú, Santiago</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Transport Method</div>
                    <div>Transporte Estándar</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "communications" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Communication History</div>
                <Button size="sm" iconName="Plus" onClick={() => setOpenNewComm(true)}>Add</Button>
              </div>
              <CommunicationList linkedType="tender" linkedId={tender?.tenderId || ""} />
            </div>
          )}

          {tab === "recommendations" && (
            <div className="rounded-lg border bg-yellow-50 p-4">
              <div className="font-medium mb-1">Planificación Temprana</div>
              <div className="text-sm text-muted-foreground">
                Iniciar producción con anticipación debido al volumen.
              </div>
              <div className="mt-3">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 mr-3">
                  medium priority
                </span>
                <Button size="sm" variant="secondary">Apply</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nueva Comunicación (prefilled) */}
      {openNewComm && (
        <NewCommunicationModal
          open={openNewComm}
          onClose={() => setOpenNewComm(false)}
          onSaved={handleSavedComm}
          defaultLinkedType="tender"
          defaultLinkedId={tender?.tenderId || ""}
        />
      )}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="rounded-lg border p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}


// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapImports, mapImportItems, mapPurchaseOrderItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

// --- helpers ------------------------------------------------
const fmtInt = (n) => new Intl.NumberFormat("en-US").format(n || 0);
const fmtMoney2 = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n || 0);

const Badge = ({ tone = "muted", children }) => {
  const tones = {
    success: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    info: "bg-blue-100 text-blue-700",
    muted: "bg-muted text-muted-foreground",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${tones[tone] || tones.muted}`}>{children}</span>;
};

const importStatusBadge = ({ transitQty, arrivedQty }) => {
  if (transitQty > 0) return <Badge tone="info">Transit</Badge>;
  if (arrivedQty > 0) return <Badge tone="success">Warehouse</Badge>;
  return <Badge>—</Badge>;
};

const mfgBadge = (s) => {
  const v = (s || "").toLowerCase();
  if (v === "ready" || v === "approved") return <Badge tone="success">Ready</Badge>;
  if (v === "in process" || v === "in_process" || v === "inprocess") return <Badge tone="warn">In Process</Badge>;
  return <Badge>—</Badge>;
};

// --- main modal ---------------------------------------------
export default function OrderDetailsModal({ order, isOpen, onClose }) {
  // Montamos siempre los hooks; devolvemos null solo al final
  const [tab, setTab] = useState("products"); // "details" | "products" | "timeline" | "comms"

  // 1) Items de la PO
  const { rows: allPoItems = [], loading: loadingPOI } = useSheet("purchase_order_items", mapPurchaseOrderItems);

  // 2) Imports + Import Items (para cruzar por po_number -> oci_number -> items)
  const { rows: allImports = [], loading: loadingImp } = useSheet("imports", mapImports);
  const { rows: allImpItems = [], loading: loadingImpItems } = useSheet("import_items", mapImportItems);

  // 3) Catálogo de presentaciones (product_name y package_units)
  const { enrich } = usePresentationCatalog();

  // Guard-rails
  if (!isOpen || !order) return null;

  // ---- Filtrar items de la PO actual
  const poItemsRaw = useMemo(
    () => (allPoItems || []).filter((r) => (r.poNumber || "") === (order.poNumber || "")),
    [allPoItems, order?.poNumber]
  );

  // Enriquecidos con product_name y package_units
  const poItems = useMemo(() => enrich(poItemsRaw), [poItemsRaw, enrich]);

  // ---- Buscar todos los OCIs de esta PO y su import_status
  const ociByStatus = useMemo(() => {
    const map = new Map();
    for (const r of allImports || []) {
      if ((r.poNumber || "") === (order.poNumber || "")) {
        map.set(r.ociNumber, r.importStatus || "");
      }
    }
    return map;
  }, [allImports, order?.poNumber]);

  const relatedOcis = useMemo(() => new Set(Array.from(ociByStatus.keys())), [ociByStatus]);

  // ---- Import items de esos OCI; agregamos cantidades por presentation_code y status
  const importedAggByCode = useMemo(() => {
    const agg = new Map(); // code -> { transitQty, arrivedQty, totalQty }
    for (const it of allImpItems || []) {
      if (!relatedOcis.has(it.ociNumber)) continue;
      const code = it.presentationCode || "";
      if (!code) continue;
      const status = ociByStatus.get(it.ociNumber) || "";
      const cur = agg.get(code) || { transitQty: 0, arrivedQty: 0, totalQty: 0 };
      const qty = Number(it.qty || 0);
      if (status === "transit") cur.transitQty += qty;
      else if (status === "warehouse") cur.arrivedQty += qty;
      cur.totalQty += qty;
      agg.set(code, cur);
    }
    return agg;
  }, [allImpItems, relatedOcis, ociByStatus]);

  // ---- Derivar métricas por producto (pedido vs importado)
  const productsView = useMemo(() => {
    return poItems.map((p) => {
      const imported = importedAggByCode.get(p.presentationCode) || {
        transitQty: 0,
        arrivedQty: 0,
        totalQty: 0,
      };
      const orderedQty = Number(p.qty || 0);
      const remaining = Math.max(0, orderedQty - imported.totalQty);
      return {
        ...p,
        orderedQty,
        transitQty: imported.transitQty,
        arrivedQty: imported.arrivedQty,
        importedQty: imported.totalQty,
        remainingQty: remaining,
        perItemMfg: p.itemManufacturingStatus || order.manufacturingStatus || "",
      };
    });
  }, [poItems, importedAggByCode, order?.manufacturingStatus]);

  // ---- Totales para "Details"
  const totals = useMemo(() => {
    let ordered = 0,
      imp = 0,
      tran = 0,
      arr = 0;
    for (const r of productsView) {
      ordered += r.orderedQty;
      imp += r.importedQty;
      tran += r.transitQty;
      arr += r.arrivedQty;
    }
    return { ordered, imp, tran, arr, rem: Math.max(0, ordered - imp) };
  }, [productsView]);

  const loading = loadingPOI || loadingImp || loadingImpItems;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-start justify-center p-6">
        <div className="w-full max-w-5xl bg-card border rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/40">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Order Details</h3>
              <p className="text-sm text-muted-foreground">
                PO <span className="font-medium">{order.poNumber}</span>
                {order.tenderRef ? (
                  <>
                    {" "}
                    · Tender <span className="font-medium">{order.tenderRef}</span>
                  </>
                ) : null}
              </p>
            </div>
            <Button variant="ghost" iconName="X" onClick={onClose} />
          </div>

          {/* Tabs */}
          <div className="px-6 pt-3">
            <div className="flex items-center gap-6 border-b">
              {[
                { id: "details", label: "Details", icon: "Info" },
                { id: "products", label: "Products", icon: "Package" },
                { id: "timeline", label: "Timeline", icon: "Clock" },
                { id: "comms", label: "Communications", icon: "MessageSquare" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`pb-3 -mb-px border-b-2 text-sm flex items-center gap-2 ${
                    tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                  onClick={() => setTab(t.id)}
                >
                  <Icon name={t.icon} size={16} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-auto">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : tab === "details" ? (
              <DetailsSummary totals={totals} />
            ) : tab === "products" ? (
              <ProductsList rows={productsView} />
            ) : tab === "timeline" ? (
              <Empty hint="Timeline will display shipment milestones (ETAs, departures, arrivals)." />
            ) : (
              <Empty hint="Link emails/notes to this PO in the Communications tab." />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/30">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- subviews ------------------------------------------------
function DetailsSummary({ totals }) {
  const Card = ({ title, value, icon }) => (
    <div className="flex-1 min-w-[160px] rounded-lg border bg-background p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Icon name={icon} size={14} />
        {title}
      </div>
      <div className="text-lg font-semibold mt-1">{fmtInt(value)}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <Card title="Ordered" value={totals.ordered} icon="ShoppingCart" />
      <Card title="In Transit" value={totals.tran} icon="Truck" />
      <Card title="In Warehouse" value={totals.arr} icon="Package" />
      <Card title="Imported (Total)" value={totals.imp} icon="ArrowDown" />
      <Card title="Remaining" value={totals.rem} icon="MinusCircle" />
    </div>
  );
}

function ProductsList({ rows }) {
  if (!rows?.length) return <Empty hint="No products in this purchase order." />;

  return (
    <div className="space-y-3">
      {rows.map((r, idx) => (
        <div key={`${r.presentationCode}-${idx}`} className="rounded-lg border p-4 bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-base font-medium text-foreground">
                {r.presentationCode || "—"}{" "}
                <span className="text-muted-foreground">
                  · {r.productName || "—"}
                  {r.packageUnits ? ` · ${r.packageUnits} units/pkg` : ""}
                </span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Ordered: <span className="font-medium text-foreground">{fmtInt(r.orderedQty)}</span> · Imported:{" "}
                <span className="font-medium text-foreground">
                  {fmtInt(r.importedQty)} (Transit {fmtInt(r.transitQty)} / Warehouse {fmtInt(r.arrivedQty)})
                </span>{" "}
                · Remaining: <span className="font-medium text-foreground">{fmtInt(r.remainingQty)}</span>
              </div>
              {r.unitPrice ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  Unit: <span className="font-medium text-foreground">{fmtMoney2(r.unitPrice)}</span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {mfgBadge(r.perItemMfg)}
                {importStatusBadge({ transitQty: r.transitQty, arrivedQty: r.arrivedQty })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ hint }) {
  return <div className="text-sm text-muted-foreground">{hint}</div>;
}

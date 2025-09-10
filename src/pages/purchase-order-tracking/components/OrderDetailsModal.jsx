// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import {
  mapPurchaseOrderItems,
  mapImportItems,
  mapImports,
  _utils,
} from "@/lib/adapters";

const { toNumber } = _utils;

const fmtInt = (n, lang = "en") =>
  new Intl.NumberFormat(lang === "es" ? "es-CL" : "en-US").format(toNumber(n));

const fmtMoney2 = (n, lang = "en") =>
  new Intl.NumberFormat(lang === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(n));

const fmtDate = (iso, lang = "en") => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(lang === "es" ? "es-CL" : "en-US");
};

// Simple status pill
const Pill = ({ text, tone = "neutral" }) => {
  const tones = {
    neutral: "bg-muted text-foreground",
    ok: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    info: "bg-indigo-100 text-indigo-700",
    note: "bg-sky-100 text-sky-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone] || tones.neutral}`}>
      {text}
    </span>
  );
};

const ModalShell = ({ children, title, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <div className="relative z-10 w-full max-w-5xl bg-white rounded-xl shadow-xl border border-border">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <button className="p-2 rounded hover:bg-muted" onClick={onClose} aria-label="Close">
          <Icon name="X" size={18} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const OrderDetailsModal = ({ isOpen, onClose, order, mode = "view", currentLanguage = "en" }) => {
  // Cargas
  const { rows: poItemsRaw = [], loading: ldPO } = useSheet(
    "purchase_order_items",
    mapPurchaseOrderItems
  );
  const { rows: importItemsRaw = [], loading: ldImpItems } = useSheet(
    "import_items",
    mapImportItems
  );
  const { rows: importsRaw = [], loading: ldImports } = useSheet(
    "imports",
    mapImports
  );

  const [tab, setTab] = useState("products");

  const poNumber = order?.poNumber || "";
  const lang = currentLanguage;

  // PO items
  const poItems = useMemo(() => {
    const src = Array.isArray(poItemsRaw) ? poItemsRaw : [];
    return src.filter((r) => (r?.poNumber || "") === poNumber);
  }, [poItemsRaw, poNumber]);

  // Import items de esa PO
  const importItems = useMemo(() => {
    const src = Array.isArray(importItemsRaw) ? importItemsRaw : [];
    return src.filter((r) => (r?.poNumber || "") === poNumber);
  }, [importItemsRaw, poNumber]);

  // Lookup de imports por OCI
  const importByOCI = useMemo(() => {
    const m = new Map();
    (Array.isArray(importsRaw) ? importsRaw : []).forEach((imp) => {
      if (imp?.ociNumber) m.set(imp.ociNumber, imp);
    });
    return m;
  }, [importsRaw]);

  // Unir por producto: solicitado (PO) vs importado (por status) + ETA (de imports)
  const rows = useMemo(() => {
    const byCode = new Map();

    // base por PO
    poItems.forEach((it) => {
      const code = it.presentationCode || "—";
      const prev = byCode.get(code) || {
        code,
        ordered: 0,
        unitPrice: it.unitPrice || 0,
        importStatus: "-", // agregado abajo
        eta: "", // agregado abajo
        inTransit: 0,
        received: 0,
      };
      prev.ordered += toNumber(it.qty);
      if (!prev.unitPrice && it.unitPrice) prev.unitPrice = toNumber(it.unitPrice);
      byCode.set(code, prev);
    });

    // mezcla con imports
    importItems.forEach((it) => {
      const code = it.presentationCode || "—";
      const oci = it.ociNumber || "";
      const imp = importByOCI.get(oci);
      const status = (imp?.importStatus || "").toLowerCase(); // 'transit' | 'warehouse' | ''
      const eta = imp?.eta || "";

      const prev = byCode.get(code) || {
        code,
        ordered: 0,
        unitPrice: it.unitPrice || 0,
        importStatus: "-",
        eta: "",
        inTransit: 0,
        received: 0,
      };

      if (status === "warehouse") prev.received += toNumber(it.qty);
      else if (status) prev.inTransit += toNumber(it.qty);

      // status por prioridad: warehouse > transit > -
      const prevRank = prev.importStatus === "warehouse" ? 2 : prev.importStatus === "transit" ? 1 : 0;
      const newRank = status === "warehouse" ? 2 : status === "transit" ? 1 : 0;
      if (newRank > prevRank) prev.importStatus = status || "-";

      // ETA: tomamos la más próxima
      if (eta) {
        const tNew = new Date(eta).getTime();
        const tOld = prev.eta ? new Date(prev.eta).getTime() : Infinity;
        if (Number.isFinite(tNew) && tNew < tOld) prev.eta = eta;
      }

      if (!prev.unitPrice && it.unitPrice) prev.unitPrice = toNumber(it.unitPrice);

      byCode.set(code, prev);
    });

    // pendiente
    return Array.from(byCode.values()).map((r) => ({
      ...r,
      pending: Math.max(0, toNumber(r.ordered) - toNumber(r.inTransit) - toNumber(r.received)),
    }));
  }, [poItems, importItems, importByOCI]);

  if (!isOpen || !order) return null;

  return (
    <ModalShell
      title={`${mode === "edit" ? "Edit Order" : "Order Details"} — ${order.poNumber || ""}`}
      onClose={onClose}
    >
      {/* encabezado breve con estados generales */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">PO Number</div>
          <div className="font-medium">{order.poNumber || "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Tender Ref</div>
          <div className="font-medium">{order.tenderRef || "—"}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Manufacturing</div>
          <div className="space-x-2">
            <Pill
              text={(order.manufacturingStatus || "-").replace(/\b\w/g, (m) => m.toUpperCase())}
              tone={
                (order.manufacturingStatus || "").includes("ready")
                  ? "ok"
                  : (order.manufacturingStatus || "").includes("shipped")
                  ? "info"
                  : "warn"
              }
            />
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Items loaded</div>
          <div className="text-sm">
            PO items: {ldPO ? "…" : poItems.length} · Import items:{" "}
            {ldImpItems ? "…" : importItems.length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 mb-4">
        <button
          className={`px-3 py-2 rounded ${tab === "products" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
          onClick={() => setTab("products")}
        >
          Products
        </button>
        <button
          className={`px-3 py-2 rounded ${tab === "summary" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
          onClick={() => setTab("summary")}
        >
          Summary
        </button>
      </div>

      {tab === "products" && (
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="text-sm text-muted-foreground">No items for this PO.</div>
          )}
          {rows.map((r) => (
            <div key={r.code} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{r.code}</div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    Unit: <span className="font-medium">{fmtMoney2(r.unitPrice, lang)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ETA: <span className="font-medium">{fmtDate(r.eta, lang)}</span>
                  </div>
                  <div className="text-sm">
                    <Pill
                      text={
                        r.importStatus === "warehouse"
                          ? "Warehouse"
                          : r.importStatus === "transit"
                          ? "Transit"
                          : "-"
                      }
                      tone={
                        r.importStatus === "warehouse"
                          ? "ok"
                          : r.importStatus === "transit"
                          ? "note"
                          : "neutral"
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Ordered</div>
                  <div className="font-medium">{fmtInt(r.ordered, lang)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">In Transit</div>
                  <div className="font-medium">{fmtInt(r.inTransit, lang)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Received</div>
                  <div className="font-medium">{fmtInt(r.received, lang)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pending</div>
                  <div className="font-medium">{fmtInt(r.pending, lang)}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Total (ordered)</div>
                  <div className="font-medium">
                    {fmtMoney2(toNumber(r.ordered) * toNumber(r.unitPrice), lang)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "summary" && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Ordered items</div>
            <div className="text-xl font-semibold">
              {fmtInt(rows.reduce((s, r) => s + toNumber(r.ordered), 0), lang)}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">In transit</div>
            <div className="text-xl font-semibold">
              {fmtInt(rows.reduce((s, r) => s + toNumber(r.inTransit), 0), lang)}
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Received</div>
            <div className="text-xl font-semibold">
              {fmtInt(rows.reduce((s, r) => s + toNumber(r.received), 0), lang)}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        {mode === "edit" && (
          <Button onClick={onClose} variant="primary">
            Save
          </Button>
        )}
      </div>
    </ModalShell>
  );
};

export default OrderDetailsModal;


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

const fmt = (n, lang = "en") =>
  new Intl.NumberFormat(lang === "es" ? "es-CL" : "en-US").format(toNumber(n));

const fmtMoney2 = (n, lang = "en") =>
  new Intl.NumberFormat(lang === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(n));

const ModalShell = ({ children, title, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <div className="relative z-10 w-full max-w-4xl bg-white rounded-xl shadow-xl border border-border">
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
  // Hooks: SIEMPRE al tope del componente
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

  const [tab, setTab] = useState("details"); // details | products

  // Normalizaciones seguras
  const poNumber = order?.poNumber || "";
  const poItems = useMemo(() => {
    const src = Array.isArray(poItemsRaw) ? poItemsRaw : [];
    return src.filter((r) => (r?.poNumber || "") === poNumber);
  }, [poItemsRaw, poNumber]);

  const importItems = useMemo(() => {
    const src = Array.isArray(importItemsRaw) ? importItemsRaw : [];
    return src.filter((r) => (r?.poNumber || "") === poNumber);
  }, [importItemsRaw, poNumber]);

  const importLookup = useMemo(() => {
    const out = new Map();
    (Array.isArray(importsRaw) ? importsRaw : []).forEach((imp) => {
      if (imp?.ociNumber) out.set(imp.ociNumber, imp);
    });
    return out;
  }, [importsRaw]);

  // Agregación por producto: solicitado vs recibido vs tránsito
  const productRows = useMemo(() => {
    const byCode = new Map();

    // 1) solicitado por PO
    poItems.forEach((it) => {
      const code = it.presentationCode || "—";
      const prev = byCode.get(code) || { code, ordered: 0, inTransit: 0, received: 0, unitPrice: it.unitPrice || 0 };
      prev.ordered += toNumber(it.qty);
      // Conserva unit price “referencial” de la PO
      if (!prev.unitPrice && it.unitPrice) prev.unitPrice = toNumber(it.unitPrice);
      byCode.set(code, prev);
    });

    // 2) importado (desde import_items + estado del import)
    importItems.forEach((it) => {
      const code = it.presentationCode || "—";
      const oci = it.ociNumber || "";
      const imp = importLookup.get(oci);
      const status = (imp?.importStatus || "").toLowerCase(); // 'warehouse'|'transit'|''
      const prev = byCode.get(code) || { code, ordered: 0, inTransit: 0, received: 0, unitPrice: it.unitPrice || 0 };

      if (status === "warehouse") prev.received += toNumber(it.qty);
      else prev.inTransit += toNumber(it.qty);

      // Si la PO no tenía precio unitario, toma de import (2 decimales en vista)
      if (!prev.unitPrice && it.unitPrice) prev.unitPrice = toNumber(it.unitPrice);

      byCode.set(code, prev);
    });

    // 3) calcula faltante
    return Array.from(byCode.values()).map((r) => ({
      ...r,
      pending: Math.max(0, toNumber(r.ordered) - toNumber(r.inTransit) - toNumber(r.received)),
    }));
  }, [poItems, importItems, importLookup]);

  if (!isOpen || !order) return null;

  const lang = currentLanguage;

  return (
    <ModalShell
      title={`${mode === "edit" ? "Edit Order" : "Order Details"} — ${order.poNumber || ""}`}
      onClose={onClose}
    >
      {/* Tabs */}
      <div className="flex items-center gap-3 mb-4">
        <button
          className={`px-3 py-2 rounded ${tab === "details" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
          onClick={() => setTab("details")}
        >
          Details
        </button>
        <button
          className={`px-3 py-2 rounded ${tab === "products" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
          onClick={() => setTab("products")}
        >
          Products
        </button>
      </div>

      {/* Content */}
      {tab === "details" && (
        <div className="grid grid-cols-2 gap-4">
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
            <div className="font-medium capitalize">{order.manufacturingStatus || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Transport</div>
            <div className="font-medium capitalize">{order.transportType || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">ETA</div>
            <div className="font-medium">
              {order.eta
                ? new Date(order.eta).toLocaleDateString(lang === "es" ? "es-CL" : "en-US")
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">QC Status</div>
            <div className="font-medium capitalize">{order.qcStatus || "—"}</div>
          </div>

          <div className="col-span-2 border-t pt-4 mt-2">
            <div className="text-sm text-muted-foreground mb-1">Loaded</div>
            <div className="text-sm">
              PO items: {ldPO ? "loading…" : fmt(poItems.length, lang)} · Import items:{" "}
              {ldImpItems ? "loading…" : fmt(importItems.length, lang)} · Imports:{" "}
              {ldImports ? "loading…" : fmt(importLookup.size, lang)}
            </div>
          </div>
        </div>
      )}

      {tab === "products" && (
        <div className="space-y-3">
          {productRows.length === 0 && (
            <div className="text-sm text-muted-foreground">No items for this PO.</div>
          )}
          {productRows.map((r) => (
            <div key={r.code} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.code}</div>
                <div className="text-sm text-muted-foreground">
                  Unit: <span className="font-medium">{fmtMoney2(r.unitPrice, lang)}</span>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-sm">
                <div>
                  <div className="text-muted-foreground">Ordered</div>
                  <div className="font-medium">{fmt(r.ordered, lang)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">In Transit</div>
                  <div className="font-medium">{fmt(r.inTransit, lang)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Received</div>
                  <div className="font-medium">{fmt(r.received, lang)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pending</div>
                  <div className="font-medium">{fmt(r.pending, lang)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        {/* Mantenemos el botón, pero en modo demo no escribe; así evitamos crashes por writeRow inexistente */}
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


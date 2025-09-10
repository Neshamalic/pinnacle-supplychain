// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useMemo } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrderItems, mapImports, mapImportItems } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";

export default function OrderDetailsModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  // 1) Items solicitados en la PO
  const { rows: poItemsAll = [], loading: loadingPO } = useSheet(
    "purchase_order_items",
    mapPurchaseOrderItems
  );
  const poItems = useMemo(
    () => (poItemsAll || []).filter((r) => r.poNumber === order.poNumber),
    [poItemsAll, order?.poNumber]
  );

  // 2) Imports: estado import_status / ETA por poNumber
  const { rows: importsAll = [] } = useSheet("imports", mapImports);
  const { rows: importItemsAll = [] } = useSheet("import_items", mapImportItems);

  const importInfoByPO = useMemo(() => {
    // buscamos cualquier import con esa PO
    const relatedItems = (importItemsAll || []).filter((x) => x.poNumber === order.poNumber);
    const byShipment = new Map();
    for (const it of relatedItems) {
      // hacemos join con tabla imports por ociNumber si hace falta
      const imp = (importsAll || []).find(
        (im) => im.ociNumber === it.ociNumber || im.poNumber === order.poNumber
      );
      if (!imp) continue;
      byShipment.set(imp.shipmentId, imp);
    }
    // devolvemos el primero para el banner principal
    const first = byShipment.size ? Array.from(byShipment.values())[0] : null;
    return { first, map: byShipment };
  }, [importsAll, importItemsAll, order?.poNumber]);

  // 3) Enriquecer items con productName y packageUnits
  const { enrich } = usePresentationCatalog();
  const items = useMemo(() => enrich(poItems), [poItems, enrich]);

  const fmtQty = (n) => new Intl.NumberFormat("en-US").format(n || 0);
  const fmtMoney2 = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
      n || 0
    );

  const importBadge = (status) => {
    const s = (status || "").toLowerCase();
    const cls =
      s === "warehouse"
        ? "bg-emerald-100 text-emerald-700"
        : s === "transit"
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status || "—"}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
      <div className="w-full max-w-5xl rounded-xl border bg-card shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Order Details</h3>
            <p className="text-sm text-muted-foreground">
              PO: <span className="font-medium">{order.poNumber}</span>
              {order.tenderRef ? <> · Tender: {order.tenderRef}</> : null}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose} iconName="X" />
        </div>

        <div className="px-6 pt-4">
          {/* Banner con import_status y ETA (de imports) */}
          <div className="mb-4 rounded-lg border bg-muted/30 p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Import Status:{" "}
              <span className="align-middle">
                {importBadge(importInfoByPO.first?.importStatus)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              ETA:{" "}
              <span className="font-medium">
                {importInfoByPO.first?.eta
                  ? new Date(importInfoByPO.first.eta).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          {loadingPO ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No items in this PO.</div>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={`${it.presentationCode || idx}`} className="rounded-lg border p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {it.presentationCode || "—"}
                        <span className="text-muted-foreground">
                          {" "}
                          · {it.productName || "—"}{" "}
                          {it.packageUnits ? `· ${it.packageUnits} units/pkg` : ""}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Ordered: {fmtQty(it.qty)} · Unit: {fmtMoney2(it.unitPrice)}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      Line total: <span className="font-medium">{fmtMoney2(it.lineTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}


// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import {
  mapPurchaseOrderItems,
  mapImportItems,
  mapCommunications,
} from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

const fmtUSD = (n) =>
  typeof n === "number"
    ? `USD ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `USD ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrderDetailsModal({
  open = false,
  onClose = () => {},
  order: orderProp,
  row, // alias
}) {
  const order = orderProp || row;
  const [openNewComm, setOpenNewComm] = useState(false);

  // PO items
  const { rows: allPoItems = [], loading: loadingPoItems } = useSheet(
    "purchase_order_items",
    mapPurchaseOrderItems
  );

  // Import items (para cantidad llegada/importada)
  const { rows: allImportItems = [], loading: loadingImp } = useSheet(
    "import_items",
    mapImportItems
  );

  // Enriquecer con product master
  const { enrich } = usePresentationCatalog();

  const poItems = useMemo(() => {
    const po = order?.poNumber || "";
    const items = (allPoItems || []).filter((r) => r.poNumber === po);
    return enrich(items);
  }, [allPoItems, order?.poNumber, enrich]);

  // Sumar importados por code para el mismo PO
  const importedByCode = useMemo(() => {
    const po = order?.poNumber || "";
    const map = new Map();
    for (const it of allImportItems || []) {
      if (String(it.poNumber || "") !== po) continue;
      const key = it.presentationCode;
      const current = map.get(key) || 0;
      map.set(key, current + (it.qty || 0));
    }
    return map;
  }, [allImportItems, order?.poNumber]);

  const rows = useMemo(() => {
    return (poItems || []).map((r) => {
      const importedQty = importedByCode.get(r.presentationCode) || 0;
      const remainingQty = Math.max(0, (r.qty || 0) - importedQty);
      return { ...r, importedQty, remainingQty };
    });
  }, [poItems, importedByCode]);

  // Communications del PO
  const {
    rows: allComms = [],
    loading: loadingComms,
    refetch: refetchComms,
  } = useSheet("communications", mapCommunications);

  const comms = useMemo(() => {
    const id = order?.poNumber || "";
    return (allComms || []).filter(
      (c) =>
        String(c.linked_id || "").trim() === String(id) &&
        (c.linked_type === "po" || c.linked_type === "purchaseorder")
    );
  }, [allComms, order?.poNumber]);

  if (!open || !order) return null;

  const handleSavedComm = async () => {
    if (typeof refetchComms === "function") await refetchComms();
    setOpenNewComm(false);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 top-10 mx-auto w-full max-w-4xl rounded-xl bg-white shadow-xl border"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-lg font-semibold">Order Details – {order.poNumber}</h3>
            <p className="text-sm text-muted-foreground">
              Tender Ref: {order.tenderRef || "—"}
            </p>
          </div>
          <Button variant="ghost" iconName="X" onClick={onClose} />
        </div>

        {/* Info + costos */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4">
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Manufacturing</div>
            <div className="text-sm font-medium capitalize">
              {order.manufacturingStatus || "—"}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Transport</div>
            <div className="text-sm font-medium capitalize">
              {order.transportType || "—"}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Cost (USD)</div>
            <div className="text-base font-semibold">{fmtUSD(order.costUsd || 0)}</div>
          </div>
        </div>

        {/* Product lines */}
        <div className="px-6 pb-2">
          <h4 className="text-sm font-semibold mb-2">Products in PO</h4>
          <div className="rounded-lg border divide-y">
            {(rows || []).map((r, idx) => (
              <div key={idx} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {r.presentationCode}{" "}
                      <span className="text-muted-foreground">
                        • {r.productName || "—"}{" "}
                        {r.packageUnits ? `• ${r.packageUnits} units/pack` : ""}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Requested: {r.qty?.toLocaleString("es-CL")} · Imported:{" "}
                      {r.importedQty?.toLocaleString("es-CL")} · Remaining:{" "}
                      {r.remainingQty?.toLocaleString("es-CL")}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Unit:{" "}
                    {r.unitPrice?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    USD
                  </div>
                </div>
              </div>
            ))}
            {loadingPoItems && (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                Loading PO items…
              </div>
            )}
            {!loadingPoItems && (rows || []).length === 0 && (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                No items for this PO.
              </div>
            )}
          </div>
        </div>

        {/* Communications */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Communications</h4>
            <Button size="sm" iconName="Plus" onClick={() => setOpenNewComm(true)}>
              New Communication
            </Button>
          </div>
          <div className="space-y-2">
            {(comms || []).map((c) => (
              <div key={c.id} className="p-3 rounded-lg border">
                <div className="text-sm font-medium">{c.subject || "(no subject)"}</div>
                <div className="text-xs text-muted-foreground">
                  {c.createdDate?.slice(0, 10)} · {c.type || "—"} · {c.participants || "—"}
                </div>
                {c.content ? (
                  <div className="text-sm mt-1">{c.content}</div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">(no content)</div>
                )}
              </div>
            ))}
            {loadingComms && (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
            {!loadingComms && (comms || []).length === 0 && (
              <div className="text-sm text-muted-foreground">No communications.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Create Communication (prefilled to this PO) */}
      {openNewComm && (
        <NewCommunicationModal
          open={openNewComm}
          onClose={() => setOpenNewComm(false)}
          onSaved={handleSavedComm}
          defaultLinkedType="po"
          defaultLinkedId={order?.poNumber || ""}
        />
      )}
    </div>
  );
}


// src/pages/tender-management/components/TenderDetailsModal.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapTenderItems, mapCommunications } from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

const fmtCLP = (n) =>
  typeof n === "number"
    ? `CLP ${n.toLocaleString("es-CL")}`
    : `CLP ${Number(n || 0).toLocaleString("es-CL")}`;

export default function TenderDetailsModal({
  open = false,
  onClose = () => {},
  tender: tenderProp,
  row, // alias opcional
}) {
  const tender = tenderProp || row;
  const [openNewComm, setOpenNewComm] = useState(false);

  // Cargamos tender_items
  const { rows: allItems = [], loading: loadingItems } = useSheet(
    "tender_items",
    mapTenderItems
  );

  // Enriquecemos con product master
  const { enrich } = usePresentationCatalog();

  const items = useMemo(() => {
    const tid = tender?.tenderId || "";
    const list = (allItems || []).filter((r) => r.tenderId === tid);
    return enrich(list).map((r) => ({
      ...r,
      // Total por línea considerando package_units si viene del enrich
      lineTotalCLP:
        r.currency?.toUpperCase() === "CLP"
          ? r.awardedQty * r.unitPrice * (r.packageUnits || 1)
          : r.awardedQty * r.unitPrice * (r.packageUnits || 1), // si tu data viene en CLP ya, se mantendrá
    }));
  }, [allItems, tender?.tenderId, enrich]);

  const totals = useMemo(() => {
    const products = new Set(items.map((i) => i.presentationCode)).size;
    const totalValue = items.reduce((acc, r) => acc + (r.lineTotalCLP || 0), 0);
    return { products, totalValue };
  }, [items]);

  // Communications vinculadas a este Tender
  const {
    rows: allComms = [],
    loading: loadingComms,
    refetch: refetchComms,
  } = useSheet("communications", mapCommunications);

  const comms = useMemo(() => {
    const id = tender?.tenderId || "";
    return (allComms || []).filter(
      (c) =>
        String(c.linked_id || "").trim() === String(id) &&
        (c.linked_type === "tender" || c.linked_type === "tenders")
    );
  }, [allComms, tender?.tenderId]);

  if (!open || !tender) return null;

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
            <h3 className="text-lg font-semibold">
              Tender Details – {tender.tenderId}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tender.title || "—"}
            </p>
          </div>
          <Button variant="ghost" iconName="X" onClick={onClose} />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4">
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Products</div>
            <div className="text-xl font-semibold">{totals.products}</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-sm font-medium capitalize">
              {tender.status || "—"}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/40">
            <div className="text-xs text-muted-foreground">Total Value</div>
            <div className="text-base font-semibold">{fmtCLP(totals.totalValue)}</div>
          </div>
        </div>

        {/* Items */}
        <div className="px-6 pb-2">
          <h4 className="text-sm font-semibold mb-2">Products in Tender</h4>
          <div className="divide-y rounded-lg border">
            {(items || []).map((it, idx) => (
              <div key={idx} className="px-4 py-3 flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    {it.presentationCode}{" "}
                    <span className="text-muted-foreground">
                      • {it.productName || "—"}{" "}
                      {it.packageUnits ? `• ${it.packageUnits} units/pack` : ""}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Qty: {it.awardedQty?.toLocaleString("es-CL")} · Unit:{" "}
                    {it.unitPrice?.toLocaleString("es-CL", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {it.currency?.toUpperCase() || ""}
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {fmtCLP(it.lineTotalCLP)}
                </div>
              </div>
            ))}
            {loadingItems && (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                Loading items…
              </div>
            )}
            {!loadingItems && (items || []).length === 0 && (
              <div className="px-4 py-4 text-sm text-muted-foreground">
                No products for this tender.
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
                  {c.createdDate?.slice(0, 10)} · {c.type || "—"} ·{" "}
                  {c.participants || "—"}
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

      {/* Create Communication (prefilled) */}
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


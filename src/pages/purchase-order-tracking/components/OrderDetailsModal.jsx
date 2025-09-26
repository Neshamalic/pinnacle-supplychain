// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { API_BASE, fetchJSON, formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { mapPurchaseOrderRow } from "@/lib/adapters";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/components/NewCommunicationModal";
import OrderItemEditModal from "./OrderItemEditModal";

/* ---------- helpers UI ---------- */
function ModalShell({ open, onClose, children, width = "max-w-5xl" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative mx-auto mt-10 w-full ${width} rounded-2xl bg-white shadow-xl`}>
        {children}
      </div>
    </div>
  );
}
// Limpia “OCI-OCI-171 / PO-PO-171” -> “OCI-171 / PO-171”
const cleanId = (label, val) =>
  val ? `${label}-${String(val).replace(new RegExp(`^${label}-${label}-`, "i"), `${label}-`).replace(new RegExp(`^${label}-`, "i"), `${label}-`)}` : "";
const titleIds = (oci, po) => [cleanId("OCI", oci), cleanId("PO", po)].filter(Boolean).join(" / ");

/* ---------- API ---------- */
const fetchLinesByPO = async (poNumber) => {
  // MUY IMPORTANTE: usamos filtro en el backend (rápido y fiable)
  const url = `${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(poNumber)}`;
  const json = await fetchJSON(url);
  const rows = Array.isArray(json?.rows) ? json.rows : [];
  return rows.map(mapPurchaseOrderRow).filter((r) => r.poNumber === poNumber);
};

/* ---------- Componente principal ---------- */
export default function OrderDetailsModal({ open, onClose, order }) {
  const poNumber = order?.poNumber || order?.po_number || "";
  const ociNumber = order?.shipmentId || order?.oci_number || "";

  const [tab, setTab] = useState("items"); // "items" | "comms"
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openNewComm, setOpenNewComm] = useState(false);
  const [editing, setEditing] = useState(null);

  const headerTitle = useMemo(() => titleIds(ociNumber, poNumber) || "—", [ociNumber, poNumber]);

  async function load() {
    if (!poNumber) {
      setLines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const l = await fetchLinesByPO(poNumber);
      setLines(l);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (open) load(); }, [open, poNumber]);

  const createdDate = useMemo(() => {
    const d = lines.find((r) => r.createdDate)?.createdDate;
    return d || order?.created_date || order?.created || "";
  }, [lines, order]);

  const totalUsd = useMemo(
    () => lines.reduce((acc, r) => acc + (r.unitPriceUsd * r.totalQty), 0),
    [lines]
  );

  return (
    <ModalShell open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h2 className="text-2xl font-semibold">Order Details — {headerTitle}</h2>
          <div className="text-xs text-muted-foreground">Created: {createdDate ? formatDate(createdDate) : "—"}</div>
        </div>
        <button className="rounded-lg p-2 hover:bg-slate-100" onClick={onClose}>
          <Icon name="X" size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="mb-4 flex gap-6 border-b">
          <button
            className={`pb-3 ${tab === "items" ? "border-b-2 border-primary text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("items")}
          >
            Items
          </button>
          <button
            className={`pb-3 ${tab === "comms" ? "border-b-2 border-primary text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("comms")}
          >
            Communications
          </button>
        </div>

        {/* Resumen (solo Items) */}
        {tab === "items" && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">PO Number</div>
              <div className="text-lg font-medium">{poNumber || "—"}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="text-lg font-medium">{createdDate ? formatDate(createdDate) : "—"}</div>
            </div>
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="text-xs text-muted-foreground">Total (USD)</div>
              <div className="text-lg font-medium">{formatCurrency(totalUsd)}</div>
            </div>
          </div>
        )}

        {/* TAB: Items */}
        {tab === "items" && (
          <div className="rounded-xl border">
            <div className="border-b p-4 font-medium">Products</div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : (lines || []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No items found.</div>
            ) : (
              <ul className="divide-y">
                {lines.map((it, idx) => (
                  <li key={`${it.poNumber}-${it.presentationCode}-${idx}`} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">
                          {it.productName || it.presentationCode || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Code: {it.presentationCode || "—"} • {it.transportType || "—"} • {it.ociNumber || "—"}
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground">Requested</div>
                            <div className="font-medium">{formatNumber(it.totalQty)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Imported</div>
                            <div className="font-medium">{formatNumber(it.imported)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Remaining</div>
                            <div className="font-medium">{formatNumber(it.remaining)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="w-48 shrink-0 text-right">
                        <div className="text-xs text-muted-foreground">Unit price</div>
                        <div className="font-medium">{formatCurrency(it.unitPriceUsd)}</div>
                        <button
                          className="mt-2 rounded-lg border px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                          onClick={() => setEditing(it)}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* TAB: Communications */}
        {tab === "comms" && (
          <div className="rounded-xl border">
            <div className="flex items-center justify-between border-b p-4">
              <div className="font-medium">Communications</div>
              <Button onClick={() => setOpenNewComm(true)} iconName="Plus">
                Add
              </Button>
            </div>
            <div className="p-4">
              {/* Mismo componente que usas en Tenders/Imports */}
              <CommunicationList linkedType="orders" linkedId={poNumber} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end py-6">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Modales secundarios */}
      <OrderItemEditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        line={editing}
        onSaved={() => load()}
      />
      <NewCommunicationModal
        open={openNewComm}
        onClose={() => setOpenNewComm(false)}
        defaultLinkedType="orders"
        defaultLinkedId={poNumber}
        onSaved={() => {
          // CommunicationList ya refresca internamente; si quisieras forzar, pasa una key.
          setOpenNewComm(false);
        }}
      />
    </ModalShell>
  );
}

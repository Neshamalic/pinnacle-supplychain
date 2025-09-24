// src/pages/purchase-order-tracking/components/OrderDetailsDrawer.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE, fetchJSON, formatCurrency, formatDate } from "@/lib/utils";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "@/pages/communications-log/components/NewCommunicationModal.jsx";

export default function OrderDetailsDrawer({ open, onClose, order }) {
  const [tab, setTab] = useState("items");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openNewComm, setOpenNewComm] = useState(false);

  // ---- carga items de la hoja purchase_order_items y filtra por po_number ----
  useEffect(() => {
    if (!open || !order?.po_number) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}?route=table&name=purchase_order_items`;
        const res = await fetchJSON(url);
        const all = Array.isArray(res?.rows) ? res.rows : [];
        const filtered = all.filter(
          (r) => String(r.po_number || "").trim() === String(order.po_number || "").trim()
        );
        if (mounted) setItems(filtered);
      } catch (err) {
        console.error("purchase_order_items load error:", err);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, order?.po_number]);

  const totalUsd = useMemo(() => {
    return (items || []).reduce((acc, r) => {
      const qty =
        Number(r.ordered_qty ?? r.qty ?? r.quantity ?? 0);
      const price =
        Number(r.unit_price ?? r.unit_price_usd ?? r.price ?? 0);
      return acc + qty * price;
    }, 0);
  }, [items]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100] bg-black/40 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-white border-l border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <div className="text-xl font-semibold">Order Details – {order?.po_number ? "PO" : ""}</div>
            {order?.po_number && (
              <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs border border-indigo-100">
                {order.po_number}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500">
            <span className="mr-1">Created:</span>
            <span>{formatDate(order?.created_date)}</span>
          </div>
          <button
            className="ml-4 rounded-lg p-2 hover:bg-slate-100"
            title="Close"
            onClick={onClose}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b px-4">
          {[
            ["items", "Items", "HelpCircle"],
            ["communications", "Communications", "MessageCircle"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium ${
                tab === key
                  ? "text-indigo-700 border-b-2 border-indigo-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-112px)]">
          {tab === "items" && (
            <>
              {/* Resumen */}
              <div className="grid md:grid-cols-3 gap-3 mb-4">
                <InfoCard label="PO Number" value={order?.po_number || "—"} />
                <InfoCard label="Created" value={formatDate(order?.created_date) || "—"} />
                <InfoCard label="Total (USD)" value={formatCurrency(totalUsd)} />
              </div>

              {/* Lista de items */}
              {loading && (
                <div className="text-sm text-slate-500">Loading items…</div>
              )}
              {!loading && (items || []).length === 0 && (
                <div className="text-sm text-slate-500">No items found.</div>
              )}

              <div className="space-y-3">
                {(items || []).map((it, idx) => {
                  const presentation = String(it.presentation_code || "").trim();
                  const ordered =
                    Number(it.ordered_qty ?? it.qty ?? it.quantity ?? 0);
                  const price =
                    Number(it.unit_price ?? it.unit_price_usd ?? it.price ?? 0);
                  const lineTotal = ordered * price;
                  return (
                    <div
                      key={`${presentation}-${idx}`}
                      className="rounded-lg border bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-slate-800">
                          {presentation || "Item"}
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatCurrency(price)} <span className="text-slate-400">/ unit</span>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Ordered:</span>{" "}
                          {ordered}
                        </div>
                        <div className="md:col-span-2 text-right font-medium">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {tab === "communications" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Communication History</div>
                <button
                  className="rounded-md bg-indigo-600 text-white text-sm px-3 py-1.5 hover:bg-indigo-700"
                  onClick={() => setOpenNewComm(true)}
                >
                  + Add
                </button>
              </div>

              {/* Muestra SOLO las comunicaciones de orders con este PO */}
              <CommunicationList linkedType="orders" linkedId={order?.po_number || ""} />
            </div>
          )}
        </div>
      </div>

      {openNewComm && (
        <NewCommunicationModal
          open={openNewComm}
          onClose={() => setOpenNewComm(false)}
          onSaved={() => setOpenNewComm(false)}
          defaultLinkedType="orders"
          defaultLinkedId={order?.po_number || ""}
        />
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border p-3 bg-slate-50">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

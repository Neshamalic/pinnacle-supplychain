// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useMemo, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import EditOrderItemModal from "./EditOrderItemModal";
import NewPOCommunicationModal from "./NewPOCommunicationModal";

// Normaliza strings como "PO-PO-171" => "PO-171"
function normalizeId(label = "") {
  const s = String(label).trim();
  // Si viene como "PO-PO-171" o "OCI-OCI-171", nos quedamos con la última parte con prefijo único
  // Intenta detectar "PO-" u "OCI-" repetidos:
  const match = s.match(/(PO|OCI)[-\s_]*([A-Za-z0-9]+)$/i);
  if (match) return `${match[1].toUpperCase()}-${match[2]}`;
  return s;
}

export default function OrderDetailsModal({ order, items = [], onClose, onRefresh }) {
  // order debe traer po_number, oci_number, created_date, total_usd, etc.
  const po = useMemo(() => normalizeId(order?.po_number || order?.po || ""), [order]);
  const oci = useMemo(() => normalizeId(order?.oci_number || order?.oci || ""), [order]);

  const [editItem, setEditItem] = useState(null);
  const [showNewComm, setShowNewComm] = useState(false);

  const headerTitle = useMemo(() => {
    const left = oci || "";
    const right = po || "";
    const base = [left, right].filter(Boolean).join(" / ");
    return base || "Order Details";
  }, [oci, po]);

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-lg">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Order Details — {headerTitle}</h2>
            <div className="text-sm text-gray-500">
              Created: {formatDate(order?.created_date)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">PO Number</div>
              <div className="text-base font-medium">{po}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">Created</div>
              <div className="text-base font-medium">{formatDate(order?.created_date)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500">Total (USD)</div>
              <div className="text-base font-medium">{formatCurrency(order?.total_usd)}</div>
            </div>
          </div>

          <div className="mt-6 border-b flex gap-6">
            <button className="pb-3 border-b-2 border-blue-600 text-blue-700 font-medium">
              Items
            </button>
            <button
              className="pb-3 text-gray-600 hover:text-gray-900"
              onClick={() => setShowNewComm(true)}
              title="+ Add communication"
            >
              Communications (+ Add)
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-auto">
          {items.map((it, idx) => (
            <div key={idx} className="border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold">{it?.product_name}</div>
                  <div className="text-sm text-gray-500">
                    Code: {it?.presentation_code} • {it?.units_per_pack || ""} units/pack
                  </div>
                  <div className="mt-2 flex gap-2 text-xs">
                    {it?.warehouse && (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        warehouse
                      </span>
                    )}
                    {it?.transport_type && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {String(it.transport_type).toLowerCase()}
                      </span>
                    )}
                    {order?.oci_number && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {normalizeId(order.oci_number)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-500">$ / unit</div>
                  <div className="text-base font-medium">
                    {it?.cost_usd ? `$${Number(it.cost_usd).toFixed(2)}` : "-"}
                  </div>
                  <button
                    className="mt-2 px-3 py-1 rounded-lg border hover:bg-gray-50"
                    onClick={() => setEditItem(it)}
                  >
                    Edit
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Requested</div>
                  <div className="text-lg font-medium">{it?.total_qty ?? 0}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Imported</div>
                  <div className="text-lg font-medium">{it?.imported_qty ?? 0}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Remaining</div>
                  <div className="text-lg font-medium">
                    {(Number(it?.total_qty || 0) - Number(it?.imported_qty || 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button className="px-4 py-2 rounded-xl border hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {editItem && (
        <EditOrderItemModal
          item={editItem}
          poNumber={order?.po_number}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            onRefresh?.();
          }}
        />
      )}

      {showNewComm && (
        <NewPOCommunicationModal
          poNumber={order?.po_number}
          onClose={() => setShowNewComm(false)}
          onSaved={() => {
            setShowNewComm(false);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}

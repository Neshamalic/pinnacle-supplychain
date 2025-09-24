// src/pages/purchase-order-tracking/index.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { API_BASE, fetchJSON, formatDate } from "../../lib/utils";
import OrderDetailsDrawer from "./components/OrderDetailsDrawer"; // <- usa el drawer con pestañas

function EyeIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1.5 12s3.75-7.5 10.5-7.5S22.5 12 22.5 12s-3.75 7.5-10.5 7.5S1.5 12 1.5 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function PurchaseOrderTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}?route=table&name=purchase_orders`;
      const res = await fetchJSON(url);
      if (!res?.ok) throw new Error(res?.error || "Error loading purchase_orders");
      setOrders(res.rows || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  // Agrupa por po_number para mostrar una fila por PO
  const rows = useMemo(() => {
    const map = new Map();
    for (const o of orders || []) {
      const k = String(o.po_number || "").trim();
      if (!k) continue;
      if (!map.has(k)) map.set(k, o);
    }
    return Array.from(map.values());
  }, [orders]);

  // Filtro por texto (po_number o tender_ref)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return (rows || []).filter((o) => {
      return (
        String(o.po_number || "").toLowerCase().includes(q) ||
        String(o.tender_ref || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Purchase Order Tracking</h1>
        <p className="text-gray-600">
          Monitor production status and shipment coordination for orders to India
        </p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by PO number or tender ref..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          onClick={() => load().catch(console.error)}
          className="rounded-lg bg-white px-4 py-2 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-indigo-50/40">
        <table className="min-w-full">
          <thead className="bg-indigo-50 text-left text-sm text-slate-700">
            <tr>
              <th className="px-4 py-3">PO Number</th>
              <th className="px-4 py-3">Tender Ref</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-100">
            {filtered.map((o) => (
              <tr key={o.po_number} className="text-sm hover:bg-white">
                <td className="px-4 py-3 font-semibold text-slate-800">{o.po_number}</td>
                <td className="px-4 py-3 text-slate-700">{o.tender_ref}</td>
                <td className="px-4 py-3">{formatDate(o.created_date)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-slate-700 shadow-sm ring-1 ring-indigo-200 hover:ring-indigo-300"
                    onClick={() => {
                      setSelected(o);
                      setDetailsOpen(true);
                    }}
                    title="View details"
                  >
                    <EyeIcon /> <span>View</span>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  {loading ? "Loading…" : "No orders found…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer con pestañas: Items / Communications */}
      {detailsOpen && selected && (
        <OrderDetailsDrawer
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          order={selected}
          // Si tienes un modal para editar líneas, puedes pasar un handler aquí:
          // onEditItem={(item) => openEditItem(item)}
        />
      )}
    </div>
  );
}

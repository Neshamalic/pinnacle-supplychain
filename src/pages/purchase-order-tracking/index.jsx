// src/pages/purchase-order-tracking/index.jsx
import { useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, formatDate } from '../../lib/utils';
import OrderDetailsModal from './components/OrderDetailsModal';

function EyeIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1.5 12s3.75-7.5 10.5-7.5S22.5 12 22.5 12s-3.75 7.5-10.5 7.5S1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

export default function PurchaseOrderTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    // Traemos solo purchase_orders; el modal cargará los detalles
    const url = `${API_BASE}?route=table&name=purchase_orders`;
    const res = await fetchJSON(url);
    if (!res?.ok) throw new Error(res?.error || 'Error loading purchase_orders');
    setOrders(res.rows || []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  // Una fila por PO (usa la primera ocurrencia)
  const rows = useMemo(() => {
    const map = new Map();
    for (const r of orders) {
      const k = String(r.po_number || '').trim();
      if (!k) continue;
      if (!map.has(k)) map.set(k, r);
    }
    return Array.from(map.values());
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows || []).filter(o => {
      if (!q) return true;
      return (
        String(o.po_number || '').toLowerCase().includes(q) ||
        String(o.tender_ref || '').toLowerCase().includes(q) ||
        String(o.oci_number || '').toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Purchase Order Tracking</h1>
        <p className="text-gray-600">Monitor production status and shipment coordination for orders to India</p>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by PO / Tender Ref / OCI..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full rounded-lg border p-2"
        />
        <button onClick={() => load()} className="rounded-lg border px-4 py-2">Refresh</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-indigo-100 bg-indigo-50/40">
        <table className="min-w-full">
          <thead className="bg-indigo-50 text-left text-sm text-slate-700">
            <tr>
              <th className="px-4 py-3">PO Number</th>
              <th className="px-4 py-3">OCI</th>
              <th className="px-4 py-3">Tender Ref</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-100">
            {filtered.map(o => (
              <tr key={o.po_number} className="text-sm hover:bg-white">
                <td className="px-4 py-3 font-semibold text-slate-800">{o.po_number}</td>
                <td className="px-4 py-3 text-slate-700">{o.oci_number || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{o.tender_ref || '—'}</td>
                <td className="px-4 py-3">{formatDate(o.created_date)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-slate-700 shadow-sm ring-1 ring-indigo-200 hover:ring-indigo-300"
                    onClick={() => setSelected(o)}
                    title="View details"
                  >
                    <EyeIcon /> <span>View</span>
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>No orders found…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <OrderDetailsModal
          open={!!selected}
          onClose={() => setSelected(null)}
          // Pasamos po_number, oci_number y tender_ref como “seed”
          seed={{
            po_number: selected.po_number,
            oci_number: selected.oci_number || '',
            tender_ref: selected.tender_ref || '',
            created_date: selected.created_date || '',
          }}
        />
      )}
    </div>
  );
}

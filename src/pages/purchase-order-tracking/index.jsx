// src/pages/purchase-order-tracking/index.jsx
import { useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, formatDate, badgeClass } from '../../lib/utils';
import OrderDetailsModal from './components/OrderDetailsModal';

export default function PurchaseOrderTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [filterManufacturing, setFilterManufacturing] = useState('all');

  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  async function load() {
    const url = `${API_BASE}?route=table&name=purchase_orders`;
    const res = await fetchJSON(url);
    if (!res?.ok) throw new Error(res?.error || 'Error loading purchase_orders');
    setOrders(res.rows || []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  // 👉 Agrupar por po_number (una fila por PO). Tomamos la primera ocurrencia.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const o of orders || []) {
      const key = String(o.po_number || '').trim();
      if (!key) continue;
      if (!map.has(key)) map.set(key, o);
    }
    return Array.from(map.values());
  }, [orders]);

  const filtered = useMemo(() => {
    return (grouped || []).filter(o => {
      const matchesText =
        !query ||
        String(o.po_number || '').toLowerCase().includes(query.toLowerCase()) ||
        String(o.tender_ref || '').toLowerCase().includes(query.toLowerCase());
      const matchesM =
        filterManufacturing === 'all' ||
        String(o.manufacturing_status || '').toLowerCase() === filterManufacturing;
      return matchesText && matchesM;
    });
  }, [grouped, query, filterManufacturing]);

  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-semibold">Purchase Order Tracking</h1>
      <p className="mb-6 text-gray-600">Monitor production status and shipment coordination for orders to India</p>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by PO number or tender ref..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full rounded-lg border p-2"
        />

        {/* 👉 Select limpio: 'All' por defecto, sin texto sobrepuesto */}
        <select
          className="rounded-lg border p-2"
          value={filterManufacturing}
          onChange={e => setFilterManufacturing(e.target.value)}
          aria-label="Manufacturing status filter"
          title="Manufacturing status"
        >
          <option value="all">All</option>
          <option value="planned">planned</option>
          <option value="in_process">in_process</option>
          <option value="ready">ready</option>
          <option value="shipped">shipped</option>
        </select>

        <button onClick={() => load()} className="rounded-lg border px-4 py-2">Refresh</button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-sm text-gray-700">
            <tr>
              <th className="px-4 py-3">PO Number</th>
              <th className="px-4 py-3">Tender Ref</th>
              <th className="px-4 py-3">Manufacturing</th>
              <th className="px-4 py-3">Created Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((o) => (
              <tr key={o.po_number} className="text-sm">
                <td className="px-4 py-3 font-medium">{o.po_number}</td>
                <td className="px-4 py-3">{o.tender_ref}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass('manufacturing', o.manufacturing_status)}`}>
                    {o.manufacturing_status || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">{formatDate(o.created_date)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="rounded-lg border px-3 py-1.5"
                    onClick={() => { setSelected(o); setShowDetails(true); }}
                  >
                    View
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

      {/* Modal con detalles y edición interna */}
      {showDetails && selected && (
        <OrderDetailsModal
          open={showDetails}
          onClose={() => setShowDetails(false)}
          order={selected}
          onOrderUpdated={(patch) => {
            // Actualizar en pantalla el estado del PO si se edita dentro del modal
            setOrders(prev => prev.map(p => p.po_number === selected.po_number ? { ...p, ...patch } : p));
          }}
        />
      )}
    </div>
  );
}

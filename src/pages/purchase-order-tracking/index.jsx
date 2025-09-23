// src/pages/purchase-order-tracking/index.jsx
import { useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, postJSON, formatDate, badgeClass } from '../../lib/utils';
import OrderDetailsModal from './components/OrderDetailsModal';

function EditOrderModal({ open, onClose, order, onSaved }) {
  const [manufacturing_status, setManufacturing] = useState(order?.manufacturing_status || '');
  const [transport_type, setTransport] = useState(order?.transport_type || '');

  useEffect(() => {
    if (open) {
      setManufacturing(order?.manufacturing_status || '');
      setTransport(order?.transport_type || '');
    }
  }, [open, order]);

  if (!open) return null;

  async function handleSave() {
    // Actualiza en la hoja "purchase_orders" usando la clave po_number
    // (tal como permite tu Apps Script con action=update y KEYS.purchase_orders = ['po_number'])
    const body = {
      route: 'write',
      action: 'update',
      name: 'purchase_orders',
      row: {
        po_number: order.po_number,
        manufacturing_status,
        transport_type,
      },
    };
    const res = await postJSON(API_BASE, body);
    if (!res?.ok) throw new Error(res?.error || 'Update failed');
    onSaved({ manufacturing_status, transport_type });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">Edit Order – {order?.po_number}</h2>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Manufacturing Status</label>
          <select
            value={manufacturing_status}
            onChange={e => setManufacturing(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="">(select)</option>
            <option value="planned">planned</option>
            <option value="in_process">in_process</option>
            <option value="ready">ready</option>
            <option value="shipped">shipped</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">Transport Type</label>
          <select
            value={transport_type}
            onChange={e => setTransport(e.target.value)}
            className="w-full rounded-lg border p-2"
          >
            <option value="">(select)</option>
            <option value="air">air</option>
            <option value="sea">sea</option>
            <option value="courier">courier</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrderTrackingPage() {
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState('');
  const [filterManufacturing, setFilterManufacturing] = useState('all');

  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [editOrder, setEditOrder] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  async function load() {
    // Carga hoja purchase_orders
    const url = `${API_BASE}?route=table&name=purchase_orders`;
    const res = await fetchJSON(url);
    if (!res?.ok) throw new Error(res?.error || 'Error loading purchase_orders');
    setOrders(res.rows || []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    return (orders || []).filter(o => {
      const matchesText =
        !query ||
        String(o.po_number || '').toLowerCase().includes(query.toLowerCase()) ||
        String(o.tender_ref || '').toLowerCase().includes(query.toLowerCase());

      const matchesM =
        filterManufacturing === 'all' ||
        String(o.manufacturing_status || '').toLowerCase() === filterManufacturing;

      return matchesText && matchesM;
    });
  }, [orders, query, filterManufacturing]);

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

        <select
          className="rounded-lg border p-2"
          value={filterManufacturing}
          onChange={e => setFilterManufacturing(e.target.value)}
        >
          <option value="all">Manufacturing (all)</option>
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
                    className="mr-2 rounded-lg border px-3 py-1.5"
                    onClick={() => { setSelected(o); setShowDetails(true); }}
                  >
                    View
                  </button>
                  <button
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-white"
                    onClick={() => { setEditOrder(o); setShowEdit(true); }}
                  >
                    Edit
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

      {/* Modals */}
      {showDetails && selected && (
        <OrderDetailsModal
          open={showDetails}
          onClose={() => setShowDetails(false)}
          order={selected}
        />
      )}

      {showEdit && editOrder && (
        <EditOrderModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          order={editOrder}
          onSaved={(patch) => {
            // actualiza el estado local después de guardar
            setOrders(prev => prev.map(p => p.po_number === editOrder.po_number ? { ...p, ...patch } : p));
          }}
        />
      )}
    </div>
  );
}

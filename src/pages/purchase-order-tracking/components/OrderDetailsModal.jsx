// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useState } from 'react';
import { API_BASE, fetchJSON, formatNumber, formatCurrency, badgeClass } from '../../../lib/utils';

export default function OrderDetailsModal({ open, onClose, order }) {
  const [items, setItems] = useState([]);
  const po = order || {};

  useEffect(() => {
    if (!open || !po?.po_number) return;
    async function loadItems() {
      // Trae toda la tabla purchase_order_items y filtra por po_number
      const url = `${API_BASE}?route=table&name=purchase_order_items`;
      const res = await fetchJSON(url);
      if (!res?.ok) throw new Error(res?.error || 'Error loading purchase_order_items');

      const rows = (res.rows || []).filter(r => String(r.po_number) === String(po.po_number));
      setItems(rows);
    }
    loadItems().catch(console.error);
  }, [open, po?.po_number]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">Order Details – {po.po_number}</h2>
            <div className="mt-1 text-sm text-gray-600">Tender Ref: {po.tender_ref || '—'}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        {/* Status row */}
        <div className="grid gap-3 border-b p-5 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-gray-500">Manufacturing</div>
            <div className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass('manufacturing', po.manufacturing_status)}`}>
                {po.manufacturing_status || '—'}
              </span>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-gray-500">Transport</div>
            <div className="mt-1">
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass('transport', po.transport_type)}`}>
                {po.transport_type || '—'}
              </span>
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-gray-500">Created</div>
            <div className="mt-1 text-sm">{po.created_date || '—'}</div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3 p-5">
          <h3 className="text-base font-semibold">Products in PO</h3>

          {items.map((it) => {
            const requested = Number(it.requested_qty || 0);
            const imported = Number(it.imported_qty || 0);
            const remaining = requested - imported;

            return (
              <div key={`${it.po_number}-${it.presentation_code}`} className="rounded-lg border p-4">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {String(it.product_name || it.presentation_name || 'Product')} • {String(it.pack_size || '').trim()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {it.presentation_code ? `Code: ${it.presentation_code}` : null}
                    </div>
                  </div>
                  <div className="text-sm font-medium">{formatCurrency(it.unit_cost || 0)}</div>
                </div>

                {/* KPI boxes */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-gray-500">Requested</div>
                    <div className="text-2xl font-semibold">{formatNumber(requested)}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-gray-500">Imported</div>
                    <div className="text-2xl font-semibold">{formatNumber(imported)}</div>
                  </div>
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-gray-500">Remaining</div>
                    <div className="text-2xl font-semibold">{formatNumber(Math.max(remaining, 0))}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="rounded-lg border p-4 text-gray-500">No items for this PO…</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t p-5">
          <div className="text-sm text-gray-500">Communications</div>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">+ New Communication</button>
        </div>
      </div>
    </div>
  );
}


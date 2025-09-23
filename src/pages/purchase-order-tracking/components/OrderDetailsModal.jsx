// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  API_BASE,
  fetchJSON,
  postJSON,
  formatNumber,
  formatCurrency,
  formatDate,
  badgeClass,
} from '../../../lib/utils';

// ========== Modales internos ==========

// Editar ESTADO del PO (order-level)
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Edit Order – {order?.po_number}</h3>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Manufacturing Status</label>
          <select value={manufacturing_status} onChange={e => setManufacturing(e.target.value)} className="w-full rounded-lg border p-2">
            <option value="">(select)</option>
            <option value="planned">planned</option>
            <option value="in_process">in_process</option>
            <option value="ready">ready</option>
            <option value="shipped">shipped</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">Transport Type</label>
          <select value={transport_type} onChange={e => setTransport(e.target.value)} className="w-full rounded-lg border p-2">
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

// Editar una LÍNEA de producto del PO (qty y unit_price_usd)
function EditItemModal({ open, onClose, item, onSaved }) {
  const [qty, setQty] = useState(item?.requested ?? 0);
  const [unitCost, setUnitCost] = useState(item?.unit_cost ?? 0);

  useEffect(() => {
    if (open) {
      setQty(item?.requested ?? 0);
      setUnitCost(item?.unit_cost ?? 0);
    }
  }, [open, item]);

  if (!open) return null;

  async function handleSave() {
    const body = {
      route: 'write',
      action: 'update',
      name: 'purchase_order_items',
      row: {
        po_number: item.po_number,
        presentation_code: item.presentation_code,
        qty: Number(qty),
        unit_price_usd: Number(unitCost),
      },
    };
    const res = await postJSON(API_BASE, body);
    if (!res?.ok) throw new Error(res?.error || 'Update failed');
    onSaved({ requested: Number(qty), unit_cost: Number(unitCost) });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Edit Item – {item?.product_name}</h3>

        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium">Requested (qty)</label>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full rounded-lg border p-2" />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">Unit Cost (USD)</label>
          <input type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="w-full rounded-lg border p-2" />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

// Nuevo registro en communications
function NewCommunicationModal({ open, onClose, poNumber, onSaved }) {
  const [note, setNote] = useState('');

  if (!open) return null;

  async function handleSave() {
    const body = {
      route: 'write',
      action: 'create',
      name: 'communications',
      row: {
        po_number: poNumber,
        created_at: new Date().toISOString(),
        note: note || '',
      },
    };
    const res = await postJSON(API_BASE, body);
    if (!res?.ok) throw new Error(res?.error || 'Create failed');
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">New Communication – {poNumber}</h3>
        <textarea
          rows={6}
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Escribe aquí el acuerdo o comunicación..."
          className="w-full rounded-lg border p-3"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

// ========== Modal principal ==========
export default function OrderDetailsModal({ open, onClose, order, onOrderUpdated }) {
  const [poItems, setPoItems] = useState([]);        // purchase_order_items
  const [impItems, setImpItems] = useState([]);      // import_items
  const [presentations, setPresentations] = useState([]); // product_presentation_master

  // sub-modales
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showNewComm, setShowNewComm] = useState(false);

  const po = order || {};

  // Cargar tablas necesarias
  useEffect(() => {
    if (!open || !po?.po_number) return;

    async function loadAll() {
      const urlPOI = `${API_BASE}?route=table&name=purchase_order_items`;
      const resPOI = await fetchJSON(urlPOI);
      if (!resPOI?.ok) throw new Error(resPOI?.error || 'Error loading purchase_order_items');
      const poi = (resPOI.rows || []).filter(r => String(r.po_number) === String(po.po_number));

      const urlIMP = `${API_BASE}?route=table&name=import_items`;
      const resIMP = await fetchJSON(urlIMP);
      if (!resIMP?.ok) throw new Error(resIMP?.error || 'Error loading import_items');
      const imps = (resIMP.rows || []).filter(r => String(r.po_number) === String(po.po_number));

      const urlPPM = `${API_BASE}?route=table&name=product_presentation_master`;
      const resPPM = await fetchJSON(urlPPM);
      if (!resPPM?.ok) throw new Error(resPPM?.error || 'Error loading product_presentation_master');

      setPoItems(poi);
      setImpItems(imps);
      setPresentations(resPPM.rows || []);
    }

    loadAll().catch(console.error);
  }, [open, po?.po_number]);

  // Join en memoria
  const items = useMemo(() => {
    const importedByCode = impItems.reduce((acc, it) => {
      const code = String(it.presentation_code || '');
      acc[code] = (acc[code] || 0) + Number(it.qty || 0);
      return acc;
    }, {});

    const presIndex = presentations.reduce((acc, p) => {
      const code = String(p.presentation_code || '');
      acc[code] = { product_name: p.product_name || '', package_units: p.package_units || '' };
      return acc;
    }, {});

    return (poItems || []).map(it => {
      const code = String(it.presentation_code || '');
      const requested = Number(it.qty || 0);
      const unitCost = Number(it.unit_price_usd || 0);
      const imported = Number(importedByCode[code] || 0);
      const remaining = Math.max(requested - imported, 0);

      const pres = presIndex[code] || {};
      const productName = pres.product_name || 'Product';
      const pack = pres.package_units ? `${pres.package_units} units/pack` : '';

      return {
        key: `${po.po_number}-${code}`,
        po_number: po.po_number,
        presentation_code: code,
        product_name: productName,
        pack_label: pack,
        requested,
        imported,
        remaining,
        unit_cost: unitCost,
      };
    });
  }, [poItems, impItems, presentations, po?.po_number]);

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
          <div className="flex items-center gap-2">
            {/* 👉 Edit Order aquí, como pediste */}
            <button
              onClick={() => setShowEditOrder(true)}
              className="rounded-lg border px-3 py-1.5"
              title="Edit manufacturing status / transport type"
            >
              Edit Order
            </button>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">✕</button>
          </div>
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
            <div className="mt-1 text-sm">{formatDate(po.created_date)}</div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3 p-5">
          <h3 className="text-base font-semibold">Products in PO</h3>

          {items.map((it) => (
            <div key={it.key} className="rounded-lg border p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <div className="font-medium">
                    {it.product_name} {it.pack_label ? `• ${it.pack_label}` : ''}
                  </div>
                  <div className="text-xs text-gray-500">
                    {it.presentation_code ? `Code: ${it.presentation_code}` : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium">{formatCurrency(it.unit_cost)}</div>
                  {/* 👉 Edit por producto */}
                  <button
                    className="rounded-lg border px-3 py-1.5"
                    onClick={() => setEditingItem(it)}
                    title="Edit qty / unit cost"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* KPI boxes */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Requested</div>
                  <div className="text-2xl font-semibold">{formatNumber(it.requested)}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Imported</div>
                  <div className="text-2xl font-semibold">{formatNumber(it.imported)}</div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Remaining</div>
                  <div className="text-2xl font-semibold">{formatNumber(it.remaining)}</div>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="rounded-lg border p-4 text-gray-500">No items for this PO…</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t p-5">
          <div className="text-sm text-gray-500">Communications</div>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            onClick={() => setShowNewComm(true)}
          >
            + New Communication
          </button>
        </div>
      </div>

      {/* Sub-modales */}
      {showEditOrder && (
        <EditOrderModal
          open={showEditOrder}
          onClose={() => setShowEditOrder(false)}
          order={po}
          onSaved={(patch) => {
            // Refrescar vista principal (padre nos pasó el callback)
            if (typeof onOrderUpdated === 'function') onOrderUpdated(patch);
          }}
        />
      )}

      {editingItem && (
        <EditItemModal
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          onSaved={(patch) => {
            // reflejar cambios en la lista del modal
            setPoItems(prev => prev.map(r =>
              String(r.po_number) === String(editingItem.po_number) &&
              String(r.presentation_code) === String(editingItem.presentation_code)
                ? { ...r, qty: patch.requested, unit_price_usd: patch.unit_cost }
                : r
            ));
            setEditingItem(null);
          }}
        />
      )}

      {showNewComm && (
        <NewCommunicationModal
          open={showNewComm}
          onClose={() => setShowNewComm(false)}
          poNumber={po.po_number}
          onSaved={() => { /* opcional: mostrar toast o refrescar lista si luego listamos communications */ }}
        />
      )}
    </div>
  );
}

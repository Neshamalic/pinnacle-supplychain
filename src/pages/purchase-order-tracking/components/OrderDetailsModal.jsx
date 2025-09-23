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

// Editar una LÍNEA de producto del PO (qty, unit_price_usd, manufacturing_status, transport_type)
function EditItemModal({ open, onClose, item, onSaved }) {
  const [qty, setQty] = useState(item?.requested ?? 0);
  const [unitCost, setUnitCost] = useState(item?.unit_cost ?? 0);
  const [status, setStatus] = useState(item?.status ?? '');
  const [transport, setTransport] = useState(item?.transport ?? '');

  useEffect(() => {
    if (open) {
      setQty(item?.requested ?? 0);
      setUnitCost(item?.unit_cost ?? 0);
      setStatus(item?.status ?? '');
      setTransport(item?.transport ?? '');
    }
  }, [open, item]);

  if (!open) return null;

  async function handleSave() {
    // Actualiza la fila en la hoja purchase_order_items usando claves po_number + presentation_code
    const body = {
      route: 'write',
      action: 'update',
      name: 'purchase_order_items',
      row: {
        po_number: item.po_number,
        presentation_code: item.presentation_code,
        qty: Number(qty),
        unit_price_usd: Number(unitCost),
        manufacturing_status: status || '',
        transport_type: transport || '',
      },
    };
    const res = await postJSON(API_BASE, body);
    if (!res?.ok) throw new Error(res?.error || 'Update failed');
    onSaved({
      requested: Number(qty),
      unit_cost: Number(unitCost),
      status,
      transport,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Edit Item – {item?.product_name}</h3>

        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Requested (qty)</label>
            <input
              type="number"
              value={qty}
              onChange={e => setQty(e.target.value)}
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Unit Cost (USD)</label>
            <input
              type="number"
              step="0.01"
              value={unitCost}
              onChange={e => setUnitCost(e.target.value)}
              className="w-full rounded-lg border p-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              <option value="">(select)</option>
              <option value="planned">planned</option>
              <option value="in_process">in_process</option>
              <option value="ready">ready</option>
              <option value="shipped">shipped</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Transport</label>
            <select
              value={transport}
              onChange={e => setTransport(e.target.value)}
              className="w-full rounded-lg border p-2"
            >
              <option value="">(select)</option>
              <option value="air">air</option>
              <option value="sea">sea</option>
              <option value="courier">courier</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const [poItems, setPoItems] = useState([]);        // purchase_order_items
  const [impItems, setImpItems] = useState([]);      // import_items
  const [presentations, setPresentations] = useState([]); // product_presentation_master
  const [editingItem, setEditingItem] = useState(null);

  const po = order || {};

  // Cargar tablas necesarias
  useEffect(() => {
    if (!open || !po?.po_number) return;

    async function loadAll() {
      // a) Ítems del PO
      const urlPOI = `${API_BASE}?route=table&name=purchase_order_items`;
      const resPOI = await fetchJSON(urlPOI);
      if (!resPOI?.ok) throw new Error(resPOI?.error || 'Error loading purchase_order_items');
      const poi = (resPOI.rows || []).filter(r => String(r.po_number) === String(po.po_number));

      // b) Importaciones asociadas al PO
      const urlIMP = `${API_BASE}?route=table&name=import_items`;
      const resIMP = await fetchJSON(urlIMP);
      if (!resIMP?.ok) throw new Error(resIMP?.error || 'Error loading import_items');
      const imps = (resIMP.rows || []).filter(r => String(r.po_number) === String(po.po_number));

      // c) Maestra de presentaciones
      const urlPPM = `${API_BASE}?route=table&name=product_presentation_master`;
      const resPPM = await fetchJSON(urlPPM);
      if (!resPPM?.ok) throw new Error(resPPM?.error || 'Error loading product_presentation_master');

      setPoItems(poi);
      setImpItems(imps);
      setPresentations(resPPM.rows || []);
    }

    loadAll().catch(console.error);
  }, [open, po?.po_number]);

  // Join en memoria por presentación
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
        // 👇 nuevos campos por producto
        status: it.manufacturing_status || '',
        transport: it.transport_type || '',
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
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        {/* Sólo Created a nivel PO (común a todos los productos) */}
        <div className="grid gap-3 border-b p-5 sm:grid-cols-3">
          <div className="rounded-lg border p-3 sm:col-span-1">
            <div className="text-xs text-gray-500">Created</div>
            <div className="mt-1 text-sm">{formatDate(po.created_date)}</div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-3 p-5">
          <h3 className="text-base font-semibold">Products in PO</h3>

          {items.map((it) => (
            <div key={it.key} className="rounded-lg border p-4">
              {/* Encabezado del producto */}
              <div className="mb-3 flex items-start justify-between">
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
                  <button
                    className="rounded-lg border px-3 py-1.5"
                    onClick={() => setEditingItem(it)}
                    title="Edit qty / unit cost / status / transport"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Línea de Status y Transport por producto */}
              <div className="mb-3 flex flex-wrap gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass('manufacturing', it.status)}`}>
                    {it.status || '—'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Transport</div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass('transport', it.transport)}`}>
                    {it.transport || '—'}
                  </span>
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
            onClick={() => setEditingItem({ __newComm: true })} // solo para reusar un modal si luego listamos comunicaciones
          >
            + New Communication
          </button>
        </div>
      </div>

      {/* Modal de edición de ítem */}
      {editingItem && !editingItem.__newComm && (
        <EditItemModal
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          onSaved={(patch) => {
            // reflect changes in local items (poItems)
            setPoItems(prev =>
              prev.map(r =>
                String(r.po_number) === String(editingItem.po_number) &&
                String(r.presentation_code) === String(editingItem.presentation_code)
                  ? {
                      ...r,
                      qty: patch.requested,
                      unit_price_usd: patch.unit_cost,
                      manufacturing_status: patch.status,
                      transport_type: patch.transport,
                    }
                  : r
              )
            );
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

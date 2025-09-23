// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useState, useMemo } from 'react';
import {
  API_BASE,
  fetchJSON,
  formatNumber,
  formatCurrency,
  formatDate,
  badgeClass,
} from '../../../lib/utils';

export default function OrderDetailsModal({ open, onClose, order }) {
  const [poItems, setPoItems] = useState([]);        // items de purchase_order_items (qty, unit_price_usd)
  const [impItems, setImpItems] = useState([]);      // items de import_items (qty por lote)
  const [presentations, setPresentations] = useState([]); // product_presentation_master (product_name, package_units)

  const po = order || {};

  // 1) Cargar 3 tablas: purchase_order_items, import_items y product_presentation_master
  useEffect(() => {
    if (!open || !po?.po_number) return;

    async function loadAll() {
      // a) purchase_order_items
      const urlPOI = `${API_BASE}?route=table&name=purchase_order_items`;
      const resPOI = await fetchJSON(urlPOI);
      if (!resPOI?.ok) throw new Error(resPOI?.error || 'Error loading purchase_order_items');

      // Filtrar por el PO abierto
      const poi = (resPOI.rows || []).filter(
        r => String(r.po_number) === String(po.po_number)
      );

      // b) import_items
      const urlIMP = `${API_BASE}?route=table&name=import_items`;
      const resIMP = await fetchJSON(urlIMP);
      if (!resIMP?.ok) throw new Error(resIMP?.error || 'Error loading import_items');

      const imps = (resIMP.rows || []).filter(
        r => String(r.po_number) === String(po.po_number)
      );

      // c) product_presentation_master
      const urlPPM = `${API_BASE}?route=table&name=product_presentation_master`;
      const resPPM = await fetchJSON(urlPPM);
      if (!resPPM?.ok) throw new Error(resPPM?.error || 'Error loading product_presentation_master');

      setPoItems(poi);
      setImpItems(imps);
      setPresentations(resPPM.rows || []);
    }

    loadAll().catch(console.error);
  }, [open, po?.po_number]);

  // 2) Hacer el “join” en memoria:
  //    - requested = purchase_order_items.qty
  //    - unit cost = purchase_order_items.unit_price_usd
  //    - imported = SUM(import_items.qty) por presentation_code
  //    - remaining = requested - imported
  //    - nombres: product_name / package_units desde product_presentation_master
  const items = useMemo(() => {
    // índice de importados por presentation_code
    const importedByCode = impItems.reduce((acc, it) => {
      const code = String(it.presentation_code || '');
      const qty = Number(it.qty || 0);
      acc[code] = (acc[code] || 0) + qty;
      return acc;
    }, {});

    // índice de presentación (nombre + pack)
    const presIndex = presentations.reduce((acc, p) => {
      const code = String(p.presentation_code || '');
      acc[code] = {
        product_name: p.product_name || '',
        package_units: p.package_units || '',
      };
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
            {/* 👉 ahora SÓLO fecha, formateada */}
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
                <div className="text-sm font-medium">{formatCurrency(it.unit_cost)}</div>
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
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white">+ New Communication</button>
        </div>
      </div>
    </div>
  );
}

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

/* ========= util: último registro de 'imports' por PO ========= */
function pickLatestImport(rows) {
  if (!rows || rows.length === 0) return null;
  const dateFields = [
    'updated_at', 'created_at', 'created_date',
    'shipment_date', 'import_date', 'eta', 'etd', 'last_update',
  ];
  const scored = rows.map((r, i) => {
    let best = -Infinity;
    for (const f of dateFields) {
      const v = r?.[f];
      if (v) {
        const t = Date.parse(v);
        if (!Number.isNaN(t)) best = Math.max(best, t);
      }
    }
    return { row: r, time: best, idx: i };
  });
  scored.sort((a, b) => (b.time - a.time) || (b.idx - a.idx));
  return scored[0].row;
}

/* ========= modal: crear comunicación (según tu esquema) ========= */
function NewCommunicationModal({ open, onClose, poNumber, onCreated }) {
  const [type, setType] = useState('Meeting'); // Meeting, Mail, Call, Whatsapp, Other
  const [subject, setSubject] = useState('');
  const [participants, setParticipants] = useState('');
  const [content, setContent] = useState('');

  const [linkedType, setLinkedType] = useState('PO'); // Product | PO | Import | Tender
  const [linkedId, setLinkedId] = useState('');
  const [linkedOptions, setLinkedOptions] = useState([]);
  const [loadingLinked, setLoadingLinked] = useState(false);

  useEffect(() => {
    if (!open) return;
    // cargar opciones según linkedType
    async function loadLinked() {
      setLoadingLinked(true);
      try {
        let res, options = [];
        if (linkedType === 'Product') {
          res = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`);
          if (res?.ok) {
            const names = (res.rows || [])
              .map(r => r.product_name)
              .filter(Boolean);
            // quitar duplicados y ordenar
            options = Array.from(new Set(names)).sort((a,b)=>String(a).localeCompare(String(b)));
          }
        } else if (linkedType === 'PO') {
          res = await fetchJSON(`${API_BASE}?route=table&name=purchase_order_items`);
          if (res?.ok) {
            const ids = (res.rows || [])
              .map(r => r.po_number)
              .filter(Boolean);
            options = Array.from(new Set(ids)).sort();
          }
        } else if (linkedType === 'Tender') {
          res = await fetchJSON(`${API_BASE}?route=table&name=tender_items`);
          if (res?.ok) {
            const ids = (res.rows || [])
              .map(r => r.tender_id)
              .filter(Boolean);
            options = Array.from(new Set(ids)).sort();
          }
        } else if (linkedType === 'Import') {
          res = await fetchJSON(`${API_BASE}?route=table&name=imports`);
          if (res?.ok) {
            const ids = (res.rows || [])
              .map(r => r.shipment_id)
              .filter(Boolean);
            options = Array.from(new Set(ids)).sort();
          }
        }
        setLinkedOptions(options);
        setLinkedId(options[0] || '');
      } catch (e) {
        console.error(e);
        setLinkedOptions([]);
        setLinkedId('');
      } finally {
        setLoadingLinked(false);
      }
    }
    loadLinked();
  }, [open, linkedType]);

  if (!open) return null;

  async function handleSave() {
    const row = {
      created_date: new Date().toISOString(),    // ISO automático
      type: (type || '').trim(),                 // Meeting | Mail | Call | Whatsapp | Other
      subject: (subject || '').trim(),
      participants: (participants || '').trim(),
      content: (content || '').trim(),
      linked_type: (linkedType || '').trim(),    // Product | PO | Import | Tender
      linked_id: (linkedId || '').trim(),        // según selección dependiente
      unread: true,
      preview: (content || '').slice(0, 160),
    };

    const res = await postJSON(API_BASE, {
      route: 'write',
      action: 'create',
      name: 'communications',
      row,
    });
    if (!res?.ok) throw new Error(res?.error || 'Create failed');

    onCreated?.(row);
    // limpiar y cerrar
    setSubject(''); setParticipants(''); setContent('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h3 className="mb-4 text-lg font-semibold">New Communication</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select className="w-full rounded-lg border p-2" value={type} onChange={e => setType(e.target.value)}>
              <option>Meeting</option>
              <option>Mail</option>
              <option>Call</option>
              <option>Whatsapp</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Linked Type</label>
            <select
              className="w-full rounded-lg border p-2"
              value={linkedType}
              onChange={e => setLinkedType(e.target.value)}
            >
              <option>Product</option>
              <option>PO</option>
              <option>Import</option>
              <option>Tender</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Linked ID</label>
            <select
              className="w-full rounded-lg border p-2"
              value={linkedId}
              onChange={e => setLinkedId(e.target.value)}
              disabled={loadingLinked}
            >
              {linkedOptions.length === 0 && <option value="">(no options)</option>}
              {linkedOptions.map(opt => (
                <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {linkedType === 'Product' && 'Se muestran nombres de producto (product_name).'}
              {linkedType === 'PO' && 'Se muestran números de PO (po_number).'}
              {linkedType === 'Import' && 'Se muestran shipment_id.'}
              {linkedType === 'Tender' && 'Se muestran tender_id.'}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Subject</label>
            <input className="w-full rounded-lg border p-2" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Participants</label>
            <input
              className="w-full rounded-lg border p-2"
              placeholder="juan@…, boris@…"
              value={participants}
              onChange={e => setParticipants(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Content</label>
            <textarea
              rows={6}
              className="w-full rounded-lg border p-3"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Describe acuerdos, compromisos o hitos…"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ========= modal: editar ítem (qty, unit cost, import status & transport) ========= */
function EditItemModal({ open, onClose, item, onSaved }) {
  const [qty, setQty] = useState(item?.requested ?? 0);
  const [unitCost, setUnitCost] = useState(item?.unit_cost ?? 0);
  const [importStatus, setImportStatus] = useState(item?.import_status ?? '');
  const [transport, setTransport] = useState(item?.transport ?? '');

  useEffect(() => {
    if (open) {
      setQty(item?.requested ?? 0);
      setUnitCost(item?.unit_cost ?? 0);
      setImportStatus(item?.import_status ?? '');
      setTransport(item?.transport ?? '');
    }
  }, [open, item]);

  if (!open) return null;

  async function handleSave() {
    // 1) actualizar purchase_order_items
    const res1 = await postJSON(API_BASE, {
      route: 'write',
      action: 'update',
      name: 'purchase_order_items',
      row: {
        po_number: item.po_number,
        presentation_code: item.presentation_code,
        qty: Number(qty),
        unit_price_usd: Number(unitCost),
      },
    });
    if (!res1?.ok) throw new Error(res1?.error || 'PO item update failed');

    // 2) actualizar imports (por oci_number)
    if (item.oci_number_for_po) {
      const res2 = await postJSON(API_BASE, {
        route: 'write',
        action: 'update',
        name: 'imports',
        row: {
          oci_number: item.oci_number_for_po,
          import_status: importStatus || '',
          transport_type: transport || '',
        },
      });
      if (!res2?.ok) throw new Error(res2?.error || 'Import update failed');
    }

    onSaved({
      requested: Number(qty),
      unit_cost: Number(unitCost),
      import_status: importStatus,
      transport,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <h3 className="mb-4 text-lg font-semibold">Edit Item – {item?.product_name}</h3>

        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Requested (qty)</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full rounded-lg border p-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Unit Cost (USD)</label>
            <input type="number" step="0.01" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="w-full rounded-lg border p-2" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Import Status</label>
            <select value={importStatus} onChange={e => setImportStatus(e.target.value)} className="w-full rounded-lg border p-2">
              <option value="">(select)</option>
              <option value="planned">planned</option>
              <option value="warehouse">warehouse</option>
              <option value="customs">customs</option>
              <option value="in_transit">in_transit</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Transport</label>
            <select value={transport} onChange={e => setTransport(e.target.value)} className="w-full rounded-lg border p-2">
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

/* ======================== modal principal ======================== */
export default function OrderDetailsModal({ open, onClose, order }) {
  const [poItems, setPoItems] = useState([]);             // purchase_order_items
  const [impItems, setImpItems] = useState([]);           // import_items (qty importado por producto)
  const [presentations, setPresentations] = useState([]); // product_presentation_master
  const [importsByPO, setImportsByPO] = useState([]);     // imports (para status/transport por PO)

  const [editingItem, setEditingItem] = useState(null);
  const [showComm, setShowComm] = useState(false);

  const po = order || {};

  useEffect(() => {
    if (!open || !po?.po_number) return;

    async function loadAll() {
      // Ítems del PO
      const resPOI = await fetchJSON(`${API_BASE}?route=table&name=purchase_order_items`);
      if (!resPOI?.ok) throw new Error(resPOI?.error || 'Error loading purchase_order_items');
      const poi = (resPOI.rows || []).filter(r => String(r.po_number) === String(po.po_number));

      // Import_items (para imported por presentación)
      const resIMP = await fetchJSON(`${API_BASE}?route=table&name=import_items`);
      if (!resIMP?.ok) throw new Error(resIMP?.error || 'Error loading import_items');
      const imps = (resIMP.rows || []).filter(r => String(r.po_number) === String(po.po_number));

      // Maestra de presentaciones
      const resPPM = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`);
      if (!resPPM?.ok) throw new Error(resPPM?.error || 'Error loading product_presentation_master');

      // Tabla imports (status/transport por PO)
      const resImports = await fetchJSON(`${API_BASE}?route=table&name=imports`);
      if (!resImports?.ok) throw new Error(resImports?.error || 'Error loading imports');
      const importsFiltered = (resImports.rows || []).filter(
        r => String(r.po_number) === String(po.po_number)
      );

      setPoItems(poi);
      setImpItems(imps);
      setPresentations(resPPM.rows || []);
      setImportsByPO(importsFiltered);
    }

    loadAll().catch(console.error);
  }, [open, po?.po_number]);

  // último import del PO
  const latestImport = useMemo(() => pickLatestImport(importsByPO), [importsByPO]);
  const importStatusForPO = latestImport?.import_status || '';
  const transportForPO = latestImport?.transport_type || '';
  const ociNumberForPO = latestImport?.oci_number || null;

  // join por presentación
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

      return {
        key: `${po.po_number}-${code}`,
        po_number: po.po_number,
        presentation_code: code,
        product_name: pres.product_name || 'Product',
        pack_label: pres.package_units ? `${pres.package_units} units/pack` : '',
        requested,
        imported,
        remaining,
        unit_cost: unitCost,
        import_status: importStatusForPO,
        transport: transportForPO,
        oci_number_for_po: ociNumberForPO, // para actualizar 'imports' en edición
      };
    });
  }, [
    poItems, impItems, presentations, po?.po_number,
    importStatusForPO, transportForPO, ociNumberForPO
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b p-5">
          <div>
            <h2 className="text-xl font-semibold">Order Details – {po.po_number}</h2>
            <div className="mt-1 text-sm text-gray-600">Tender Ref: {po.tender_ref || '—'}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        {/* Info superior */}
        <div className="grid gap-3 border-b bg-slate-50/60 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-gray-500">Created</div>
            <div className="mt-1 text-sm">{formatDate(po.created_date)}</div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4 p-5">
          <h3 className="text-base font-semibold text-slate-800">Products in PO</h3>

          {items.map((it) => (
            <div key={it.key} className="rounded-xl border border-indigo-100 bg-white p-4 shadow-sm ring-1 ring-transparent hover:ring-indigo-100">
              {/* encabezado del producto */}
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900">
                    {it.product_name} {it.pack_label ? <span className="text-slate-500">• {it.pack_label}</span> : null}
                  </div>
                  <div className="text-xs text-gray-500">Code: {it.presentation_code || '—'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-slate-50 px-2 py-1 text-sm font-medium">{formatCurrency(it.unit_cost)}</div>
                  <button
                    className="rounded-lg bg-white px-3 py-1.5 text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300"
                    onClick={() => setEditingItem(it)}
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* línea de status / transport */}
              <div className="mb-3 flex flex-wrap gap-4">
                <div>
                  <div className="mb-1 text-xs text-gray-500">Import Status</div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass('manufacturing', it.import_status)}`}>
                    {it.import_status || '—'}
                  </span>
                </div>
                <div>
                  <div className="mb-1 text-xs text-gray-500">Transport</div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass('transport', it.transport)}`}>
                    {it.transport || '—'}
                  </span>
                </div>
              </div>

              {/* KPI boxes */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-gray-500">Requested</div>
                  <div className="text-2xl font-semibold text-slate-900">{formatNumber(it.requested)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-gray-500">Imported</div>
                  <div className="text-2xl font-semibold text-slate-900">{formatNumber(it.imported)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-gray-500">Remaining</div>
                  <div className="text-2xl font-semibold text-slate-900">{formatNumber(it.remaining)}</div>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="rounded-xl border p-4 text-gray-500">No items for this PO…</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-slate-50/60 p-5">
          <div className="text-sm text-gray-500">Communications</div>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700"
            onClick={() => setShowComm(true)}
          >
            + New Communication
          </button>
        </div>
      </div>

      {/* Modales secundarios */}
      {editingItem && (
        <EditItemModal
          open={!!editingItem}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          onSaved={(patch) => {
            // actualizar caches locales
            setPoItems(prev => prev.map(r =>
              String(r.po_number) === String(editingItem.po_number) &&
              String(r.presentation_code) === String(editingItem.presentation_code)
                ? { ...r, qty: patch.requested, unit_price_usd: patch.unit_cost }
                : r
            ));
            // actualizar estado visual de imports
            setImportsByPO(prev => {
              if (!Array.isArray(prev)) return prev;
              return prev.map(r =>
                r.oci_number === editingItem.oci_number_for_po
                  ? { ...r, import_status: patch.import_status, transport_type: patch.transport }
                  : r
              );
            });
            setEditingItem(null);
          }}
        />
      )}

      {showComm && (
        <NewCommunicationModal
          open={showComm}
          onClose={() => setShowComm(false)}
          poNumber={po.po_number}
          onCreated={() => { /* más adelante podemos listar comunicaciones aquí */ }}
        />
      )}
    </div>
  );
}

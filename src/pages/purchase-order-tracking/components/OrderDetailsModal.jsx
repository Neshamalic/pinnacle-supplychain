// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from 'react';
import {
  API_BASE,
  fetchJSON,
  postJSON,
  formatDate,
  formatNumber,
  formatCurrency,
  badgeClass,
} from '../../../lib/utils';

/* =============== UI helpers =============== */
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        {children}
      </div>
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute right-6 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100"
      >
        ×
      </button>
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${className}`}>
      {children}
    </div>
  );
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`} >
      {children}
    </span>
  );
}

/* ===========================================================
   ItemEditModal: editar cost_usd y total_qty POR PRODUCTO
   =========================================================== */
function ItemEditModal({ open, onClose, line, onSaved }) {
  const [qty, setQty] = useState(line?.total_qty ?? 0);
  const [price, setPrice] = useState(line?.cost_usd ?? 0);

  useEffect(() => {
    setQty(line?.total_qty ?? 0);
    setPrice(line?.cost_usd ?? 0);
  }, [line]);

  async function handleSave() {
    if (!line) return;
    // Actualizamos una línea de purchase_orders (clave: po_number + presentation_code)
    await postJSON(`${API_BASE}?route=write&name=purchase_orders&action=update`, {
      row: {
        po_number: line.po_number,
        presentation_code: line.presentation_code,
        total_qty: String(qty).replace(/\./g, '').replace(',', '.'),
        cost_usd: String(price).replace(/\./g, '').replace(',', '.'),
      },
    });
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="mb-4 text-lg font-semibold">
          Edit item — {line?.product_name || line?.presentation_code}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Total qty (requested)</span>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="rounded-lg border p-2"
              min={0}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Unit price (USD)</span>
            <input
              type="number"
              step="0.0001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-lg border p-2"
              min={0}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* =======================================================================
   CommunicationModal: formulario completo (igual estilo que Tenders/Imports)
   ======================================================================= */
function CommunicationModal({ open, onClose, defaultLinked, onSaved }) {
  const [type, setType] = useState('meeting');
  const [subject, setSubject] = useState('');
  const [participants, setParticipants] = useState('');
  const [linkedType, setLinkedType] = useState(defaultLinked?.type || 'orders');
  const [linkedId, setLinkedId] = useState(defaultLinked?.id || '');
  const [content, setContent] = useState('');

  useEffect(() => {
    setLinkedType(defaultLinked?.type || 'orders');
    setLinkedId(defaultLinked?.id || '');
  }, [defaultLinked, open]);

  async function handleSave() {
    await postJSON(`${API_BASE}?route=write&name=communications&action=create`, {
      row: {
        type,
        subject,
        participants,
        linked_type: linkedType,
        linked_id: linkedId,
        content,
        unread: 'true',
        created_date: new Date().toISOString(),
      },
    });
    onSaved?.();
    onClose();
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        <h3 className="mb-4 text-lg font-semibold">New Communication</h3>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Type</span>
              <select value={type} onChange={(e)=>setType(e.target.value)} className="rounded-lg border p-2">
                <option value="meeting">Meeting</option>
                <option value="mail">Mail</option>
                <option value="call">Call</option>
                <option value="whatsapp">Whatsapp</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Participants</span>
              <input
                value={participants}
                onChange={(e)=>setParticipants(e.target.value)}
                placeholder="Name1@…, Name2@…"
                className="rounded-lg border p-2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Subject</span>
            <input
              value={subject}
              onChange={(e)=>setSubject(e.target.value)}
              placeholder="Ej: Weekly review – Q4 tenders"
              className="rounded-lg border p-2"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Linked Type</span>
              <select value={linkedType} onChange={(e)=>setLinkedType(e.target.value)} className="rounded-lg border p-2">
                <option value="orders">Orders</option>
                <option value="imports">Imports</option>
                <option value="tender">Tender</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Linked ID</span>
              <input
                value={linkedId}
                onChange={(e)=>setLinkedId(e.target.value)}
                placeholder="PO-xxx / EXP-… / tender id"
                className="rounded-lg border p-2"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Content</span>
            <textarea
              value={content}
              onChange={(e)=>setContent(e.target.value)}
              rows={6}
              className="w-full rounded-lg border p-2"
              placeholder="Escribe la nota, resumen de reunión, correo, etc."
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ===========================================================
   OrderDetailsModal (principal)
   =========================================================== */
export default function OrderDetailsModal({ open, onClose, order }) {
  const po = String(order?.po_number || order?.po || '').trim();
  const oci = String(order?.oci_number || order?.oci || '').trim();

  const [tab, setTab] = useState('items');

  const [poLines, setPoLines] = useState([]); // líneas de ese PO (una por presentation_code)
  const [importsRow, setImportsRow] = useState(null); // para status/transport
  const [importedByCode, setImportedByCode] = useState({}); // { presentation_code: sum(qty) }
  const [master, setMaster] = useState({}); // { presentation_code: { product_name, package_units } }

  // modales
  const [editLine, setEditLine] = useState(null);
  const [showComm, setShowComm] = useState(false);
  const [comms, setComms] = useState([]);

  // Título limpio “OCI-xxx / PO-xxx”
  const headerTitle = useMemo(() => {
    const a = oci ? `OCI-${oci.replace(/^OCI-?/i, '')}` : '';
    const b = po ? `PO-${po.replace(/^PO-?/i, '')}` : '';
    return [a, b].filter(Boolean).join(' / ');
  }, [po, oci]);

  // Carga datos
  async function loadData() {
    if (!po) return;

    // 1) Todas las filas de purchase_orders para ese PO (cada fila = 1 producto)
    const poRes = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders`);
    const poRowsAll = poRes?.rows || [];
    const poRows = poRowsAll.filter(r => String(r.po_number || '').trim() === po);

    // 2) imports status (por oci/po)
    let impRow = null;
    if (oci) {
      const impRes = await fetchJSON(`${API_BASE}?route=table&name=imports`);
      impRow = (impRes?.rows || []).find(r =>
        String(r.oci_number || '').trim() === oci ||
        String(r.po_number || '').trim() === po
      ) || null;
    }

    // 3) suma importada por presentation_code (import_items filtrando por oci y/o po)
    const iiRes = await fetchJSON(`${API_BASE}?route=table&name=import_items`);
    const iiRows = (iiRes?.rows || []).filter(r => {
      const okOCI = oci ? String(r.oci_number || '').trim() === oci : true;
      const okPO  = po  ? String(r.po_number  || '').trim() === po  : true;
      return okOCI && okPO;
    });
    const importedMap = {};
    for (const r of iiRows) {
      const code = String(r.presentation_code || '').trim();
      const qty = Number(r.qty || r.quantity || 0);
      importedMap[code] = (importedMap[code] || 0) + (isFinite(qty) ? qty : 0);
    }

    // 4) master de presentaciones
    const pmRes = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`);
    const masterMap = {};
    for (const r of (pmRes?.rows || [])) {
      const code = String(r.presentation_code || r.sku || r.code || '').trim();
      if (!code) continue;
      masterMap[code] = {
        product_name: r.product_name || r.name || '',
        package_units: Number(r.package_units || r.units_per_package || 1) || 1,
      };
    }

    setPoLines(poRows);
    setImportsRow(impRow);
    setImportedByCode(importedMap);
    setMaster(masterMap);
  }

  async function loadComms() {
    if (!po) return;
    const url = `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`;
    const res = await fetchJSON(url);
    setComms(res?.rows || []);
  }

  useEffect(() => {
    if (open) {
      loadData().catch(console.error);
      loadComms().catch(console.error);
    }
  }, [open, po, oci]);

  // Cálculos y enriquecimiento
  const lines = useMemo(() => {
    return (poLines || []).map(r => {
      const code = String(r.presentation_code || '').trim();
      const m = master[code] || {};
      const imported = importedByCode[code] || 0;

      return {
        ...r,
        po_number: po,
        oci_number: oci || r.oci_number,
        presentation_code: code,
        product_name: m.product_name || r.product_name || code,
        package_units: m.package_units || Number(r.package_units || 1) || 1,
        total_qty: Number(r.total_qty || r.qty || r.quantity || 0) || 0,
        cost_usd: Number(r.cost_usd || r.unit_price_usd || r.unit_price || 0) || 0,
        transport_type: (importsRow?.transport_type || r.transport_type || '').toLowerCase(),
        import_status: (importsRow?.import_status || r.import_status || '').toLowerCase(),
        imported_qty: imported,
        remaining_qty: Math.max(0, (Number(r.total_qty || 0) || 0) - (imported || 0)),
      };
    });
  }, [poLines, master, importedByCode, importsRow, po, oci]);

  // Total USD = sum(qty * price)
  const totalUsd = useMemo(() => {
    return lines.reduce((acc, x) => acc + (x.total_qty * x.cost_usd), 0);
  }, [lines]);

  async function handleDeleteComm(c) {
    const id = c?.id || c?._virtual_id; // por si no existe id
    if (!id) return alert('No se puede eliminar: falta "id".');
    const ok = confirm('Are you sure you want to delete this message?');
    if (!ok) return;
    await postJSON(`${API_BASE}?route=write&name=communications&action=delete`, { where: { id } });
    await loadComms();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="border-b p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Order Details — {headerTitle}</h2>
            {po && <Badge className="bg-slate-100 text-slate-700">PO-{po.replace(/^PO-?/i, '')}</Badge>}
            {oci && <Badge className="bg-slate-100 text-slate-700">OCI-{oci.replace(/^OCI-?/i, '')}</Badge>}
          </div>
          <div className="text-sm text-slate-500">Created: {formatDate(order?.created_date)}</div>
        </div>

        <div className="mt-4 flex gap-6">
          <button
            onClick={() => setTab('items')}
            className={`border-b-2 px-1 pb-2 text-sm ${tab === 'items' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Items
          </button>
          <button
            onClick={() => setTab('comms')}
            className={`border-b-2 px-1 pb-2 text-sm ${tab === 'comms' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Communications
          </button>
        </div>
      </div>

      {/* ==================== TAB ITEMS ==================== */}
      {tab === 'items' && (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <div className="text-xs text-slate-500">PO Number</div>
              <div className="mt-1 font-semibold">PO-{po.replace(/^PO-?/i, '')}</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">Created</div>
              <div className="mt-1 font-semibold">{formatDate(order?.created_date)}</div>
            </Card>
            <Card>
              <div className="text-xs text-slate-500">Total (USD)</div>
              <div className="mt-1 font-semibold">{formatCurrency(totalUsd)}</div>
            </Card>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Products</h3>

            {lines.map((ln) => (
              <div key={`${ln.po_number}-${ln.presentation_code}`} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{ln.product_name}</div>
                    <div className="text-xs text-slate-500">
                      Code: {ln.presentation_code} • {ln.package_units} units/pack
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {ln.import_status && (
                        <Badge className={badgeClass('manufacturing', ln.import_status)}>
                          {ln.import_status}
                        </Badge>
                      )}
                      {ln.transport_type && (
                        <Badge className={badgeClass('transport', ln.transport_type)}>
                          {ln.transport_type}
                        </Badge>
                      )}
                      {ln.oci_number && <Badge className="bg-indigo-50 text-indigo-700">OCI {ln.oci_number}</Badge>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-sm text-slate-600">
                      {formatCurrency(ln.cost_usd)} <span className="text-slate-400">/ unit</span>
                    </div>
                    <button
                      onClick={() => setEditLine(ln)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Card>
                    <div className="text-xs text-slate-500">Requested</div>
                    <div className="mt-1 text-lg font-semibold">{formatNumber(ln.total_qty)}</div>
                  </Card>
                  <Card>
                    <div className="text-xs text-slate-500">Imported</div>
                    <div className="mt-1 text-lg font-semibold">{formatNumber(ln.imported_qty)}</div>
                  </Card>
                  <Card>
                    <div className="text-xs text-slate-500">Remaining</div>
                    <div className="mt-1 text-lg font-semibold">{formatNumber(ln.remaining_qty)}</div>
                  </Card>
                </div>
              </div>
            ))}

            {lines.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-6 text-center text-slate-500">
                No items found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB COMMS ==================== */}
      {tab === 'comms' && (
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Linked to <span className="font-semibold">Orders</span> • PO-{po.replace(/^PO-?/i, '')}
              {oci && <> — <span className="font-semibold">Imports</span> • OCI-{oci.replace(/^OCI-?/i, '')}</>}
            </div>
            <button
              onClick={() => setShowComm(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
            >
              + Add
            </button>
          </div>

          <div className="space-y-3">
            {comms.map((c) => (
              <div key={c.id || c._virtual_id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{c.subject || '(sin asunto)'}</div>
                      {String(c.unread) === 'true' && (
                        <Badge className="bg-amber-100 text-amber-800">Unread</Badge>
                      )}
                      <Badge className="bg-blue-100 text-blue-800">Orders</Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {c.type || 'other'} • {c.participants || '—'}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">{formatDate(c.created_date)}</div>
                </div>

                <div className="mt-3 whitespace-pre-wrap text-slate-800">
                  {c.content || c.preview || ''}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Linked: orders • {po}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleDeleteComm(c)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {comms.length === 0 && (
              <div className="rounded-xl border border-slate-200 p-6 text-center text-slate-500">
                No communications.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end border-t p-4">
        <button onClick={onClose} className="rounded-lg border px-4 py-2">Close</button>
      </div>

      {/* Modales secundarios */}
      <ItemEditModal
        open={!!editLine}
        onClose={() => setEditLine(null)}
        line={editLine}
        onSaved={() => loadData()}
      />

      <CommunicationModal
        open={showComm}
        onClose={() => setShowComm(false)}
        defaultLinked={{ type: 'orders', id: po }}
        onSaved={() => loadComms()}
      />
    </Modal>
  );
}

// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, postJSON, formatCurrency, formatDate, formatNumber, badgeClass } from '../../../lib/utils';

/* ───────── UI helpers ───────── */
function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-lg font-semibold text-slate-900">{title}</div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}
function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium text-slate-800">{value ?? '—'}</div>
    </div>
  );
}

/* ───────── Modal: editar línea (price + qty) ───────── */
function ItemEditModal({ open, onClose, line, onSaved }) {
  const [qty, setQty] = useState(0);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    setQty(line?.total_qty ?? 0);
    setPrice(line?.cost_usd ?? 0);
  }, [line]);

  async function handleSave() {
    if (!line) return;
    await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, {
      row: {
        po_number: line.po_number,
        presentation_code: line.presentation_code,
        total_qty: Number(String(qty).replace(/\./g, '').replace(',', '.')),
        cost_usd: Number(String(price).replace(/\./g, '').replace(',', '.')),
      },
    });
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit item — ${line?.product_name || line?.presentation_code || ''}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Total qty (requested)</span>
          <input type="number" min={0} value={qty} onChange={(e)=>setQty(e.target.value)} className="rounded-lg border p-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Unit price (USD)</span>
          <input type="number" step="0.0001" min={0} value={price} onChange={(e)=>setPrice(e.target.value)} className="rounded-lg border p-2" />
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
        <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Save</button>
      </div>
    </Modal>
  );
}

/* ───────── Modal: nueva comunicación (form completo) ───────── */
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
        type, subject, participants, linked_type: linkedType, linked_id: linkedId, content,
        unread: 'true', created_date: new Date().toISOString(),
      },
    });
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New Communication">
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
            <input value={participants} onChange={(e)=>setParticipants(e.target.value)} placeholder="Name1@…, Name2@…" className="rounded-lg border p-2" />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Subject</span>
          <input value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Ej: Weekly review – Q4 tenders" className="rounded-lg border p-2" />
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
            <input value={linkedId} onChange={(e)=>setLinkedId(e.target.value)} placeholder="PO-xxx / OCI-… / Tender id" className="rounded-lg border p-2" />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Content</span>
          <textarea rows={6} value={content} onChange={(e)=>setContent(e.target.value)} className="w-full rounded-lg border p-2" placeholder="Escribe la nota, resumen de reunión, correo, etc." />
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
        <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Save</button>
      </div>
    </Modal>
  );
}

/* ───────── Tarjetas de Items y Comms ───────── */
function ProductLine({ line, onEdit }) {
  const price = Number(line.cost_usd || 0);
  const imported = Number(line.imported_qty || 0);
  const requested = Number(line.total_qty || 0);
  const remaining = Math.max(requested - imported, 0);
  const transportCls = badgeClass('transport', line.transport_type);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-slate-800">
            {line.product_name || line.presentation_code}
          </div>
          <div className="text-xs text-slate-500">
            Code: {line.presentation_code}{line.package_units ? ` • ${formatNumber(line.package_units)} units/pack` : ''}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {line.import_status ? <Badge className="bg-emerald-50 text-emerald-700">{line.import_status}</Badge> : null}
            {line.transport_type ? <Badge className={transportCls}>{line.transport_type}</Badge> : null}
            {line.oci_number ? <Badge className="bg-indigo-50 text-indigo-700">OCI {line.oci_number}</Badge> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm text-slate-500">{formatCurrency(price)} <span className="text-xs">/ unit</span></div>
          <button className="mt-2 rounded-lg border px-3 py-1.5 text-slate-700 hover:bg-slate-50" onClick={()=>onEdit(line)}>Edit</button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <InfoTile label="Requested" value={formatNumber(requested)} />
        <InfoTile label="Imported" value={formatNumber(imported)} />
        <InfoTile label="Remaining" value={formatNumber(remaining)} />
      </div>
    </div>
  );
}

function CommCard({ c, onDelete }) {
  const isUnread = String(c.unread) === 'true';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold text-slate-800">{c.subject || '(no subject)'}</div>
            {isUnread && <Badge className="bg-amber-100 text-amber-700">Unread</Badge>}
          </div>
          <div className="text-xs text-slate-500">{(c.type || '').toLowerCase()} • {c.participants || ''}</div>
        </div>
        <div className="text-xs text-slate-500">{formatDate(c.created_date)}</div>
      </div>

      {/* aquí forzamos los saltos de línea y el “wrap” */}
      <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
        {c.content || c.preview || ''}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Linked: {c.linked_type} • {c.linked_id}
      </div>

      <div className="mt-3">
        <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700" onClick={()=>onDelete(c)}>Delete</button>
      </div>
    </div>
  );
}

/* ───────── Componente principal ───────── */
export default function OrderDetailsModal({ open, onClose, seed }) {
  const [loading, setLoading] = useState(false);
  const [header, setHeader]   = useState({ po_number: '', oci_number: '', created_date: '' });
  const [lines, setLines]     = useState([]);
  const [comms, setComms]     = useState([]);

  const po  = String(seed?.po_number || '').trim();
  const oci = String(seed?.oci_number || '').trim();

  // Título “limpio”: OCI-xxx / PO-xxx (solo una vez)
  const headerTitle = useMemo(() => {
    const a = oci ? `OCI-${oci.replace(/^OCI-?/i, '')}` : '';
    const b = po  ? `PO-${po.replace(/^PO-?/i, '')}`   : '';
    return [a, b].filter(Boolean).join(' / ');
  }, [po, oci]);

  const totalUSD = useMemo(() => lines.reduce((acc, l) => acc + Number(l.cost_usd || 0) * Number(l.total_qty || 0), 0), [lines]);

  const loadAll = useCallback(async () => {
    if (!po) return;
    setLoading(true);
    try {
      // 1) purchase_orders (backend ya acepta filtros)
      const poRes  = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(po)}${oci ? `&oci=${encodeURIComponent(oci)}` : ''}`);
      const rowsPO = (poRes.rows || []).filter(r => String(r.po_number || '').trim() === po);
      const first  = rowsPO[0] || seed || {};
      setHeader({ po_number: po, oci_number: first.oci_number || oci || '', created_date: first.created_date || seed?.created_date || '' });

      const ociNow = (first.oci_number || oci || '').trim();

      // 2) master (nombre y pack)
      const pm1 = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`).catch(()=>({rows:[]}));
      const pm2 = await fetchJSON(`${API_BASE}?route=table&name=producto_presentation_master`).catch(()=>({rows:[]}));
      const master = new Map();
      for (const m of (pm1.rows||[]).concat(pm2.rows||[])) {
        const key = String(m.presentation_code || m.product_code || m.code || '').trim();
        if (!key) continue;
        master.set(key, { product_name: m.product_name || m.name || '', package_units: Number(m.package_units || m.units_per_package || m.units || 0) });
      }

      // 3) imports (estado + transporte)
      let importRow = null;
      if (ociNow || po) {
        const impRes = await fetchJSON(`${API_BASE}?route=table&name=imports${po ? `&po=${encodeURIComponent(po)}` : ''}${ociNow ? `&oci=${encodeURIComponent(ociNow)}` : ''}`);
        importRow = (impRes.rows || [])[0] || null;
      }

      // 4) import_items: sumatorias por presentation_code
      const iiRes = await fetchJSON(`${API_BASE}?route=table&name=import_items${po ? `&po=${encodeURIComponent(po)}` : ''}${ociNow ? `&oci=${encodeURIComponent(ociNow)}` : ''}`);
      const importedMap = new Map();
      for (const it of (iiRes.rows || [])) {
        const code = String(it.presentation_code || '').trim();
        const qty  = Number(it.qty || it.quantity || 0);
        if (!code) continue;
        importedMap.set(code, (importedMap.get(code) || 0) + qty);
      }

      // 5) Consolidar líneas por presentation_code
      const linesMap = new Map();
      for (const r of rowsPO) {
        const code = String(r.presentation_code || '').trim();
        if (!code) continue;
        if (!linesMap.has(code)) {
          const m = master.get(code) || {};
          linesMap.set(code, {
            po_number: po,
            oci_number: ociNow,
            presentation_code: code,
            product_name: m.product_name || '',
            package_units: m.package_units || 0,
            import_status: (importRow?.import_status || '').toLowerCase(),
            transport_type: (importRow?.transport_type || '').toLowerCase(),
            cost_usd: Number(r.cost_usd || r.unit_price_usd || r.unit_price || 0),
            total_qty: Number(r.total_qty || r.ordered_qty || r.qty || 0),
            imported_qty: Number(importedMap.get(code) || 0),
          });
        } else {
          const acc = linesMap.get(code);
          acc.total_qty += Number(r.total_qty || r.ordered_qty || r.qty || 0);
          if (!acc.cost_usd && r.cost_usd) acc.cost_usd = Number(r.cost_usd);
        }
      }
      setLines(Array.from(linesMap.values()));

      // 6) communications
      const commRes = await fetchJSON(`${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`);
      setComms(commRes.rows || []);
    } finally {
      setLoading(false);
    }
  }, [po, oci, seed]);

  useEffect(() => { if (open) loadAll().catch(console.error); }, [open, loadAll]);

  // estados/acciones para modales
  const [editLine, setEditLine] = useState(null);
  const [showComm, setShowComm] = useState(false);

  async function handleDeleteComm(c) {
    await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
      where: c.id ? { id: c.id } : { created_date: c.created_date, subject: c.subject },
    });
    await loadAll();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header: SOLO una vez “OCI-xxx / PO-xxx” */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-xl font-semibold text-slate-900">Order Details — {headerTitle}</div>
          <div className="text-sm text-slate-500">Created: {formatDate(header.created_date)}</div>
        </div>

        {/* Tabs propios */}
        <Tabs>
          <Tab title="Items">
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
              <InfoTile label="PO Number" value={po} />
              <InfoTile label="Created" value={formatDate(header.created_date)} />
              <InfoTile label="Total (USD)" value={formatCurrency(totalUSD)} />
            </div>

            <div className="px-5 pb-5">
              <div className="mb-2 text-sm font-medium text-slate-700">Products</div>
              <div className="grid grid-cols-1 gap-4">
                {lines.map(l => <ProductLine key={l.presentation_code} line={l} onEdit={setEditLine} />)}
                {lines.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">No items found.</div>}
              </div>
            </div>
          </Tab>

          <Tab title="Communications">
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="text-sm text-slate-600">
                Linked to <b>Orders</b> • <b>{po}</b>{header.oci_number ? <> — <b>Imports</b> • <b>{header.oci_number}</b></> : null}
              </div>
              <button className="rounded-lg bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700" onClick={()=>setShowComm(true)}>+ Add</button>
            </div>

            <div className="grid gap-4 p-5">
              {comms.map(c => <CommCard key={c.id || c._virtual_id || `${c.created_date}::${c.subject}`} c={c} onDelete={handleDeleteComm} />)}
              {comms.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">No communications for this PO.</div>}
            </div>
          </Tab>
        </Tabs>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button className="rounded-lg border px-4 py-2" onClick={onClose}>Close</button>
        </div>

        {loading && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
            <div className="animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 p-4" />
          </div>
        )}
      </div>

      {/* Modales secundarios */}
      <ItemEditModal open={!!editLine} onClose={()=>setEditLine(null)} line={editLine} onSaved={loadAll} />
      <CommunicationModal open={showComm} onClose={()=>setShowComm(false)} defaultLinked={{ type: 'orders', id: po }} onSaved={loadAll} />
    </div>
  );
}

/* ───────── Tabs minimal ───────── */
function Tabs({ children }) {
  const [idx, setIdx] = useState(0);
  const items = Array.isArray(children) ? children : [children];
  return (
    <>
      <div className="flex gap-6 border-b px-5 pt-3">
        {items.map((c, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`-mb-px border-b-2 px-1.5 py-2 text-sm ${i === idx ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {c.props.title}
          </button>
        ))}
      </div>
      <div>{items[idx]}</div>
    </>
  );
}
function Tab({ children }) { return children; }


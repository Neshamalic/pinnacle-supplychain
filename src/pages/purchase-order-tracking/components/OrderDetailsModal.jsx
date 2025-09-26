// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, postJSON, formatCurrency, formatDate, formatNumber, badgeClass } from '../../../lib/utils';

/* ───────────────── helpers ───────────────── */

// Normaliza "PO-PO-171" -> "PO-171", "OCI-OCI-171" -> "OCI-171"
function normalizeId(label = '') {
  const s = String(label).trim();
  const m = s.match(/(PO|OCI)[-\s_]*([A-Za-z0-9]+)$/i);
  return m ? `${m[1].toUpperCase()}-${m[2]}` : s;
}

// ✅ Convierte textos a número respetando coma o punto como separador decimal
//  "1,14" -> 1.14   "1.14" -> 1.14   "1.000,50" -> 1000.5   "1,000.50" -> 1000.5
function parseAmount(input) {
  if (input === null || input === undefined) return 0;
  let s = String(input).trim();
  if (s === '') return 0;

  const hasDot = s.includes('.');
  const hasComma = s.includes(',');

  if (hasDot && hasComma) {
    // Decidir cuál es decimal: si después de la última coma hay 1-2 dígitos, la coma es decimal (formato ES)
    const lastComma = s.lastIndexOf(',');
    const decLen = s.length - lastComma - 1;
    if (decLen >= 1 && decLen <= 3 && !s.slice(lastComma + 1).includes('.')) {
      // "1.234,56" -> quitar puntos (miles) y cambiar coma por punto
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // "1,234.56" -> quitar comas (miles), punto queda como decimal
      s = s.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Solo coma -> decimal
    s = s.replace(',', '.');
  } else {
    // Solo punto o ninguno -> parseFloat directo
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* ───────────────── UI ───────────────── */

function Modal({ open, onClose, children, title, rightInfo }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-xl font-semibold text-slate-900">{title}</div>
          <div className="text-sm text-slate-500">{rightInfo}</div>
        </div>
        {children}
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

/* ───────── Modal: Editar línea (soluciona 1,14 → 11,00) ───────── */
function ItemEditModal({ open, onClose, line, onSaved }) {
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (line) {
      setQty(line.total_qty ?? '');
      setPrice(line.cost_usd ?? '');
    }
  }, [line]);

  async function handleSave() {
    if (!line) return;
    const payload = {
      po_number: line.po_number,                // 🔑 clave 1
      presentation_code: line.presentation_code, // 🔑 clave 2
      total_qty: parseAmount(qty),
      cost_usd: parseAmount(price),
    };
    await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, { row: payload });
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Edit item — ${line?.product_name || line?.presentation_code || ''}`}>
      <div className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Total qty (requested)</span>
            <input
              type="text"
              inputMode="decimal"
              value={qty}
              onChange={(e)=>setQty(e.target.value)}
              className="rounded-lg border p-2"
              placeholder="1000"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Unit price (USD)</span>
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e)=>setPrice(e.target.value)}
              className="rounded-lg border p-2"
              placeholder="1,14 o 1.14"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Save</button>
        </div>
      </div>
    </Modal>
  );
}

/* ───────── Mostrar texto con “Show more / less” ───────── */
function ContentPreview({ text = '', max = 300 }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const short = text.length > max ? text.slice(0, max) + '…' : text;
  return (
    <div className="mt-2">
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
        {open ? text : short}
      </p>
      {text.length > max && (
        <button className="mt-1 text-sm text-blue-700 hover:underline" onClick={()=>setOpen(!open)}>
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/* ───────── Tarjetas ───────── */
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
            {line.import_status ? <Badge className="bg-purple-100 text-purple-800">{line.import_status}</Badge> : null}
            {line.transport_type ? <Badge className={transportCls}>{line.transport_type}</Badge> : null}
            {line.oci_number ? <Badge className="bg-indigo-100 text-indigo-800">{normalizeId(`OCI-${line.oci_number}`)}</Badge> : null}
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
  const isUnread = String(c.unread).toLowerCase() === 'true';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-base font-semibold text-slate-800">{c.subject || '(no subject)'}</div>
            {isUnread && <Badge className="bg-amber-100 text-amber-800">Unread</Badge>}
            <Badge className="bg-blue-100 text-blue-800 capitalize">{c.linked_type || 'orders'}</Badge>
          </div>
          <div className="text-xs text-slate-500">{(c.type || '').toLowerCase()} • {c.participants || ''}</div>
        </div>
        <div className="text-xs text-slate-500">{formatDate(c.created_date)}</div>
      </div>

      {/* contenido comprimible */}
      <ContentPreview text={c.content || c.preview || ''} max={420} />

      <div className="mt-3 text-xs text-slate-500">
        Linked: {c.linked_type} • {c.linked_id}
      </div>

      <div className="mt-3">
        <button className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700" onClick={()=>onDelete(c)}>Delete</button>
      </div>
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

/* ───────── Componente principal ───────── */
export default function OrderDetailsModal({ open, onClose, seed }) {
  const [loading, setLoading] = useState(false);
  const [header, setHeader]   = useState({ po_number: '', oci_number: '', created_date: '' });
  const [lines, setLines]     = useState([]);
  const [comms, setComms]     = useState([]);

  // Valores clave del PO
  const po  = String(seed?.po_number || seed?.po || '').trim();
  const oci = String(seed?.oci_number || seed?.oci || '').trim();

  // Título limpio
  const headerTitle = useMemo(() => {
    const a = oci ? normalizeId(`OCI-${oci}`) : '';
    const b = po  ? normalizeId(`PO-${po}`)   : '';
    return [a, b].filter(Boolean).join(' / ') || 'Order Details';
  }, [po, oci]);

  const totalUSD = useMemo(
    () => lines.reduce((acc, l) => acc + Number(l.cost_usd || 0) * Number(l.total_qty || 0), 0),
    [lines]
  );

  const loadAll = useCallback(async () => {
    if (!po) return;
    setLoading(true);
    try {
      // ⚡️ Pedimos en paralelo para acelerar
      const qsPO   = `${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(po)}${oci ? `&oci=${encodeURIComponent(oci)}` : ''}`;
      const qsComm = `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`;

      const [resPO, resComm] = await Promise.all([
        fetchJSON(qsPO).catch(()=>({rows:[]})),
        fetchJSON(qsComm).catch(()=>({rows:[]})),
      ]);

      const rowsPO = (resPO.rows || []).filter(r => String(r.po_number || '').trim() === po);
      const first  = rowsPO[0] || seed || {};
      const ociNow = String(first.oci_number || oci || '').trim();

      setHeader({
        po_number: po,
        oci_number: ociNow,
        created_date: first.created_date || seed?.created_date || '',
      });

      // Consolidar por presentation_code (sin pedir tablas extra → más rápido)
      const map = new Map();
      for (const r of rowsPO) {
        const code = String(r.presentation_code || '').trim();
        if (!code) continue;
        const key = code;
        if (!map.has(key)) {
          map.set(key, {
            po_number: po,
            oci_number: ociNow,
            presentation_code: code,
            product_name: r.product_name || '',   // usa nombre si tu hoja lo trae
            package_units: Number(r.package_units || 0),
            import_status: String(r.import_status || '').toLowerCase(),
            transport_type: String(r.transport_type || '').toLowerCase(),
            cost_usd: parseAmount(r.cost_usd ?? r.unit_price_usd ?? r.unit_price ?? 0),
            total_qty: Number(r.total_qty || r.ordered_qty || r.qty || 0),
            imported_qty: Number(r.imported_qty || 0), // si no lo tienes en la hoja, quedará 0
          });
        } else {
          const acc = map.get(key);
          acc.total_qty += Number(r.total_qty || r.ordered_qty || r.qty || 0);
          if (!acc.cost_usd && r.cost_usd) acc.cost_usd = parseAmount(r.cost_usd);
        }
      }
      setLines(Array.from(map.values()));

      // Communications
      setComms(resComm.rows || []);
    } finally {
      setLoading(false);
    }
  }, [po, oci, seed]);

  useEffect(() => { if (open) loadAll().catch(console.error); }, [open, loadAll]);

  // Modales
  const [editLine, setEditLine] = useState(null);

  async function handleDeleteComm(c) {
    await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
      where: c.id ? { id: c.id } : { created_date: c.created_date, subject: c.subject, linked_type: c.linked_type, linked_id: c.linked_id },
    });
    await loadAll();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Order Details — ${headerTitle}`} rightInfo={`Created: ${formatDate(header.created_date)}`}>
      <Tabs>
        <Tab title="Items">
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
            <InfoTile label="PO Number" value={normalizeId(`PO-${po}`)} />
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
          <POCommunications
            po={po}
            oci={header.oci_number}
            comms={comms}
            onDelete={handleDeleteComm}
            onCreated={loadAll}
          />
        </Tab>
      </Tabs>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <button className="rounded-lg border px-4 py-2" onClick={onClose}>Close</button>
      </div>

      {/* Overlay loading */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      )}

      {/* Modal editar */}
      <ItemEditModal open={!!editLine} onClose={()=>setEditLine(null)} line={editLine} onSaved={loadAll} />
    </Modal>
  );
}

/* ───────── Communications de PO (form completo + badges) ───────── */
function POCommunications({ po, oci, comms, onDelete, onCreated }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('meeting');
  const [subject, setSubject] = useState('');
  const [participants, setParticipants] = useState('');
  const [content, setContent] = useState('');

  async function handleSave() {
    await postJSON(`${API_BASE}?route=write&name=communications&action=create`, {
      row: {
        type, subject, participants, content,
        linked_type: 'orders',
        linked_id: po,
        unread: 'true',
        created_date: new Date().toISOString(),
      },
    });
    setOpen(false);
    setType('meeting'); setSubject(''); setParticipants(''); setContent('');
    onCreated?.();
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Linked to <b>Orders</b> • <b>{normalizeId(`PO-${po}`)}</b>{oci ? <> — <b>Imports</b> • <b>{normalizeId(`OCI-${oci}`)}</b></> : null}
        </div>
        <button className="rounded-lg bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700" onClick={()=>setOpen(true)}>+ Add</button>
      </div>

      <div className="mt-4 grid gap-4">
        {comms.map(c => <CommCard key={c.id || c._virtual_id || `${c.created_date}::${c.subject}`} c={c} onDelete={onDelete} />)}
        {comms.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">No communications for this PO.</div>}
      </div>

      {/* Modal crear comm */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-lg font-semibold">New Communication</div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Type</span>
                <select className="rounded-xl border px-3 py-2" value={type} onChange={(e)=>setType(e.target.value)}>
                  <option>meeting</option>
                  <option>mail</option>
                  <option>call</option>
                  <option>whatsapp</option>
                  <option>other</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Linked ID</span>
                <input className="rounded-xl border px-3 py-2" value={normalizeId(`PO-${po}`)} disabled />
                <div className="mt-1 text-xs text-slate-500">Linked Type: <b>Orders</b></div>
              </label>

              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-sm text-slate-600">Subject</span>
                <input className="rounded-xl border px-3 py-2" value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Ej: Weekly review – Q4 tenders" />
              </label>

              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-sm text-slate-600">Participants</span>
                <input className="rounded-xl border px-3 py-2" value={participants} onChange={(e)=>setParticipants(e.target.value)} placeholder="name1@…, name2@…" />
                <div className="mt-1 text-xs text-slate-500">Escribe nombres/correos separados por coma.</div>
              </label>

              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-sm text-slate-600">Content</span>
                <textarea className="h-36 w-full rounded-xl border px-3 py-2" value={content} onChange={(e)=>setContent(e.target.value)} placeholder="Escribe la nota, resumen de reunión, correo, etc." />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-lg border px-4 py-2" onClick={()=>setOpen(false)}>Cancel</button>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

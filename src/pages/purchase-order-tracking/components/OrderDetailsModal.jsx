// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, postJSON, formatDate, formatCurrency, badgeClass } from '../../../lib/utils';

/* --------------------------------- Mini UI -------------------------------- */
function Section({ title, children }) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}
function Chip({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`} >
      {children}
    </span>
  );
}
function ModalShell({ open, onClose, children, title, right }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/20">
      <div className="absolute inset-0 overflow-auto">
        <div className="mx-auto my-8 w-full max-w-5xl rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Order Details – PO</h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">{right}</div>
            <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Add Communication ---------------------------- */
function NewCommModal({ open, onClose, defaults, onCreated }) {
  const [type, setType] = useState('meeting');
  const [subject, setSubject] = useState('');
  const [participants, setParticipants] = useState('');
  const [content, setContent] = useState('');
  const [linkedType, setLinkedType] = useState(defaults.linked_type);
  const [linkedId, setLinkedId] = useState(defaults.linked_id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setType('meeting'); setSubject(''); setParticipants(''); setContent('');
      setLinkedType(defaults.linked_type); setLinkedId(defaults.linked_id);
    }
  }, [open, defaults]);

  async function handleSave() {
    if (!subject.trim() || !content.trim()) return alert('Subject y Content son obligatorios.');
    setBusy(true);
    try {
      const body = {
        route: 'write',
        action: 'create',
        name: 'communications',
        row: {
          type, subject, participants, content,
          linked_type: linkedType,
          linked_id: linkedId,
          unread: 'true',
        },
      };
      const res = await postJSON(API_BASE, body);
      if (!res?.ok) throw new Error(res?.error || 'Error creating communication');
      onCreated?.();
      onClose();
    } catch (err) {
      alert(`No se pudo crear: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/30">
      <div className="mx-auto mt-16 w-full max-w-xl rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="border-b px-5 py-3 text-base font-semibold">New Communication</div>
        <div className="space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Type</span>
              <select className="w-full rounded border p-2 text-sm" value={type} onChange={e => setType(e.target.value)}>
                <option value="meeting">Meeting</option>
                <option value="mail">Mail</option>
                <option value="call">Call</option>
                <option value="whatsapp">Whatsapp</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Linked Type</span>
              <select className="w-full rounded border p-2 text-sm" value={linkedType} onChange={e => setLinkedType(e.target.value)}>
                {/* Permitimos orders u imports para que también se puedan crear para el OCI si existe */}
                <option value="orders">Orders</option>
                <option value="imports">Imports</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">
              <span className="mb-1 block text-slate-600">Linked ID</span>
              <input className="w-full rounded border p-2 text-sm" value={linkedId} onChange={e => setLinkedId(e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">
                Orders: PO Number — Imports: Shipment ID (OCI)
              </p>
            </label>
          </div>

          <label className="text-sm block">
            <span className="mb-1 block text-slate-600">Subject</span>
            <input className="w-full rounded border p-2 text-sm" value={subject} onChange={e => setSubject(e.target.value)} />
          </label>
          <label className="text-sm block">
            <span className="mb-1 block text-slate-600">Participants</span>
            <input className="w-full rounded border p-2 text-sm" value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Name1@..., Name2@..." />
          </label>
          <label className="text-sm block">
            <span className="mb-1 block text-slate-600">Content</span>
            <textarea className="h-28 w-full rounded border p-2 text-sm" value={content} onChange={e => setContent(e.target.value)} />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
          <button className="rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-100" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
            onClick={handleSave} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Main Modal ------------------------------- */
export default function OrderDetailsModal({ open, onClose, order }) {
  const po = String(order?.po_number || '').trim();
  const oci = String(order?.oci_number || order?.oci || '').trim();

  const [tab, setTab] = useState('items');
  const [poItems, setPoItems] = useState([]); // tus items ya funcionaban; mantenemos la carga que tengas
  const [totalUsd, setTotalUsd] = useState(0);
  const [comms, setComms] = useState([]);
  const [adding, setAdding] = useState(false);
  const [undo, setUndo] = useState(null); // {row, timer}

  // -- LOAD ITEMS (como lo tenías funcionando) --------------------------------
  useEffect(() => {
    if (!open) return;
    (async () => {
      // Trae purchase_orders filtrado por po para construir los "products" (ahora todo está en la misma hoja)
      const url = `${API_BASE}?route=table&name=purchase_orders`;
      const res = await fetchJSON(url);
      const rows = (res?.rows || []).filter(r => String(r.po_number || '').trim() === po);

      // Armado de tarjetas (product_name/pack_units vía presentation master + imports + import_items ya lo tienes; aquí solo ejemplo)
      setPoItems(rows);

      // Total USD correcto: suma (cost_usd * total_qty) por fila
      const total = rows.reduce((acc, r) => {
        const cost = Number(r.cost_usd ?? r.unit_price_usd ?? 0);
        const qty = Number(r.total_qty ?? r.ordered_qty ?? r.qty ?? 0);
        return acc + cost * qty;
      }, 0);
      setTotalUsd(total);
    })().catch(console.error);
  }, [open, po]);

  // -- LOAD COMMUNICATIONS -----------------------------------------------------
  async function loadComms() {
    const calls = [];

    // 1) communications de orders: linked_id = PO
    calls.push(fetchJSON(
      `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`
    ).catch(() => ({ rows: [] })));

    // 2) si hay OCI, también las de imports: linked_id = OCI
    if (oci) {
      calls.push(fetchJSON(
        `${API_BASE}?route=table&name=communications&lt=imports&lid=${encodeURIComponent(oci)}&order=desc`
      ).catch(() => ({ rows: [] })));
    }

    const results = await Promise.all(calls);
    const merged = results.flatMap(r => r?.rows || []);

    // Sort por created_date desc (backstop por created/date)
    merged.sort((a, b) => {
      const ad = new Date(a.created_date || a.created || a.date || 0).getTime() || 0;
      const bd = new Date(b.created_date || b.created || b.date || 0).getTime() || 0;
      return bd - ad;
    });
    setComms(merged);
  }

  useEffect(() => { if (open) loadComms().catch(console.error); }, [open, po, oci]);

  // -- DELETE COMMUNICATION ----------------------------------------------------
  async function handleDelete(row) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    // Optimistic remove
    setComms(prev => prev.filter(x => x !== row));
    const timer = setTimeout(() => setUndo(null), 5000);
    setUndo({ row, timer });

    try {
      const where = row.id
        ? { id: row.id }
        : { created_date: row.created_date || row.created || row.date, subject: row.subject };

      const body = { route: 'write', action: 'delete', name: 'communications', where };
      const res = await postJSON(API_BASE, body);
      if (!res?.ok || (res.removed ?? 0) === 0) throw new Error(res?.error || 'delete failed');
      clearTimeout(timer);
      setUndo(null);
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`);
      clearTimeout(timer);
      // revert
      setComms(prev => [row, ...prev]);
      setUndo(null);
    }
  }

  function handleUndo() {
    if (!undo) return;
    clearTimeout(undo.timer);
    setComms(prev => [undo.row, ...prev]);
    setUndo(null);
  }

  /* ------------------------------- RENDER ---------------------------------- */
  const headerRight = (
    <>
      {po && <Chip className="bg-slate-100 text-slate-600">PO-{po.replace(/^PO-?/i,'')}</Chip>}
      {oci && <Chip className="bg-slate-100 text-slate-600">OCI-{oci.replace(/^OCI-?/i,'')}</Chip>}
      <span>Created: {formatDate(order?.created_date || order?.created)}</span>
    </>
  );

  return (
    <ModalShell open={open} onClose={onClose} title="Order Details" right={headerRight}>
      {/* Tabs */}
      <div className="border-b px-5">
        <nav className="-mb-px flex gap-6 text-sm">
          <button className={`border-b-2 px-1 py-3 ${tab === 'items' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`} onClick={() => setTab('items')}>Items</button>
          <button className={`border-b-2 px-1 py-3 ${tab === 'comms' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`} onClick={() => setTab('comms')}>Communications</button>
        </nav>
      </div>

      {/* Items tab */}
      {tab === 'items' && (
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">PO Number</div>
              <div className="font-medium">{po || '—'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Created</div>
              <div className="font-medium">{formatDate(order?.created_date || order?.created) || '—'}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Total (USD)</div>
              <div className="font-medium">{formatCurrency(totalUsd)}</div>
            </div>
          </div>

          <Section title="Products">
            {poItems.length === 0 && <div className="py-10 text-center text-slate-500">No items found.</div>}

            <div className="space-y-4">
              {poItems.map((it, idx) => {
                const req = Number(it.total_qty ?? it.ordered_qty ?? it.qty ?? 0);
                const imported = Number(it.imported_qty ?? 0); // si lo calculas antes, pásalo en it
                const remaining = Math.max(0, req - imported);
                const unit = Number(it.cost_usd ?? it.unit_price_usd ?? 0);
                const status = String(it.import_status || '').toLowerCase();
                const transport = String(it.transport_type || '').toLowerCase();

                return (
                  <div key={idx} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-base font-semibold">
                          {it.product_name || it.presentation_code || 'Product'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Code: {it.presentation_code || '—'}{it.package_units ? ` • ${it.package_units} units/pack` : ''}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatCurrency(unit)} <span className="text-xs">/ unit</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Chip className={badgeClass('import', status)}>{status || '—'}</Chip>
                      <Chip className={badgeClass('transport', transport)}>{transport || '—'}</Chip>
                      {oci && <Chip className="bg-slate-100 text-slate-600">OCI {oci}</Chip>}
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Requested</div>
                        <div className="text-lg font-semibold">{req.toLocaleString('en-US')}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Imported</div>
                        <div className="text-lg font-semibold">{imported.toLocaleString('en-US')}</div>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <div className="text-xs text-slate-500">Remaining</div>
                        <div className="text-lg font-semibold">{remaining.toLocaleString('en-US')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>
      )}

      {/* Communications tab */}
      {tab === 'comms' && (
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Linked to <b>Orders</b> • {po}
              {oci ? <> — <b>Imports</b> • {oci}</> : null}
            </div>
            <button
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700"
              onClick={() => setAdding(true)}
            >
              + Add
            </button>
          </div>

          {comms.length === 0 && (
            <div className="py-10 text-center text-slate-500">No communications yet.</div>
          )}

          <div className="space-y-4">
            {comms.map((c, i) => (
              <div key={`${c.id || c._virtual_id || i}`} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{c.subject || '(no subject)'}</div>
                    <div className="text-xs text-slate-500">
                      {c.type || 'note'} • {c.participants || '—'}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{formatDate(c.created_date || c.created || c.date)}</div>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{c.content || c.preview || ''}</div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Linked: {c.linked_type || '—'} • {c.linked_id || '—'}
                  </div>
                  <button
                    onClick={() => handleDelete(c)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {undo && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-sm text-slate-600">Message deleted.</span>
              <button className="text-sm font-medium text-indigo-600 hover:underline" onClick={handleUndo}>
                Undo
              </button>
            </div>
          )}

          <NewCommModal
            open={adding}
            onClose={() => setAdding(false)}
            defaults={{ linked_type: 'orders', linked_id: po }}
            onCreated={() => loadComms()}
          />
        </div>
      )}
    </ModalShell>
  );
}

// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, postJSON, formatCurrency, formatDate, formatNumber, badgeClass } from '../../../lib/utils';

function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`} >{children}</span>;
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {title ? <div className="border-b px-4 py-3 font-medium text-slate-700">{title}</div> : null}
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-slate-800 font-medium">{value ?? '—'}</div>
    </div>
  );
}

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
            Code: {line.presentation_code} {line.package_units ? `• ${formatNumber(line.package_units)} units/pack` : ''}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {line.import_status ? <Badge className="bg-emerald-50 text-emerald-700">{line.import_status}</Badge> : null}
            {line.transport_type ? <Badge className={transportCls}>{line.transport_type}</Badge> : null}
            {line.oci_number ? <Badge className="bg-indigo-50 text-indigo-700">OCI {line.oci_number}</Badge> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm text-slate-500">{formatCurrency(price)} <span className="text-xs">/ unit</span></div>
          <button
            className="mt-2 rounded-lg border px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            onClick={() => onEdit(line)}
          >
            Edit
          </button>
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

      <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">
        {c.content || c.preview || ''}
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Linked: {c.linked_type} • {c.linked_id}
      </div>

      <div className="mt-3">
        <button
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
          onClick={() => onDelete(c)}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function OrderDetailsModal({ open, onClose, seed }) {
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState({ po_number: '', oci_number: '', tender_ref: '', created_date: '' });
  const [lines, setLines] = useState([]);          // productos (una línea por presentation_code)
  const [comms, setComms] = useState([]);          // comunicaciones de esta PO
  const po = String(seed?.po_number || '').trim();
  const oci = String(seed?.oci_number || '').trim();

  const title = useMemo(() => {
    const left = [`PO-${po || '—'}`, oci ? `OCI-${oci}` : ''].filter(Boolean).join('  ');
    return left;
  }, [po, oci]);

  // ────────────────────────────────────────────────────────────────────────────────
  // Carga de datos
  // ────────────────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!po) return;

    setLoading(true);
    try {
      // 1) purchase_orders (filtrado por po/oci en backend si aplica)
      const poRes = await fetchJSON(`${API_BASE}?route=table&name=purchase_orders&po=${encodeURIComponent(po)}${oci ? `&oci=${encodeURIComponent(oci)}` : ''}`);
      const poRows = (poRes.rows || []).filter(r => String(r.po_number || '').trim() === po);

      // si en la cabecera aún no hay valores, los tomamos de la primera fila
      const first = poRows[0] || seed || {};
      setHeader({
        po_number: po,
        oci_number: first.oci_number || oci || '',
        tender_ref: first.tender_ref || seed?.tender_ref || '',
        created_date: first.created_date || seed?.created_date || '',
      });

      const ociNow = (first.oci_number || oci || '').trim();

      // 2) master de presentaciones (nombre + pack)
      // soporta nombre de hoja "product_presentation_master" o "producto_presentation_master"
      const masterTry1 = await fetchJSON(`${API_BASE}?route=table&name=product_presentation_master`).catch(() => ({ ok: false, rows: [] }));
      const masterTry2 = await fetchJSON(`${API_BASE}?route=table&name=producto_presentation_master`).catch(() => ({ ok: false, rows: [] }));
      const master = (masterTry1.rows || []).concat(masterTry2.rows || []);
      const mapMaster = new Map();
      for (const m of master) {
        const key = String(m.presentation_code || m.product_code || m.code || '').trim();
        if (!key) continue;
        mapMaster.set(key, {
          product_name: m.product_name || m.name || '',
          package_units: Number(m.package_units || m.units_per_package || m.units || 0),
        });
      }

      // 3) imports (estado + transporte) (filtrado por po/oci en backend)
      let importRow = null;
      if (ociNow || po) {
        const impRes = await fetchJSON(`${API_BASE}?route=table&name=imports${po ? `&po=${encodeURIComponent(po)}` : ''}${ociNow ? `&oci=${encodeURIComponent(ociNow)}` : ''}`);
        importRow = (impRes.rows || [])[0] || null;
      }

      // 4) import_items para calcular "Imported" por presentación
      const iiRes = await fetchJSON(`${API_BASE}?route=table&name=import_items${po ? `&po=${encodeURIComponent(po)}` : ''}${ociNow ? `&oci=${encodeURIComponent(ociNow)}` : ''}`);
      const iiRows = iiRes.rows || [];

      const sumImportedByCode = new Map();
      for (const it of iiRows) {
        const code = String(it.presentation_code || '').trim();
        const qty = Number(it.qty || it.quantity || 0);
        if (!code) continue;
        sumImportedByCode.set(code, (sumImportedByCode.get(code) || 0) + qty);
      }

      // 5) Construimos líneas de producto desde purchase_orders (una por presentation_code)
      const linesMap = new Map();
      for (const r of poRows) {
        const code = String(r.presentation_code || '').trim();
        if (!code) continue;
        if (!linesMap.has(code)) {
          const m = mapMaster.get(code) || {};
          linesMap.set(code, {
            po_number: po,
            oci_number: ociNow,
            presentation_code: code,
            product_name: m.product_name || '',
            package_units: m.package_units || 0,
            import_status: (importRow?.import_status || '').toLowerCase() || '',
            transport_type: (importRow?.transport_type || '').toLowerCase() || '',
            cost_usd: Number(r.cost_usd || r.unit_price_usd || r.unit_price || 0),
            total_qty: Number(r.total_qty || r.ordered_qty || r.qty || 0),
            imported_qty: Number(sumImportedByCode.get(code) || 0),
          });
        } else {
          // si hubiera filas duplicadas, acumulamos cantidades
          const acc = linesMap.get(code);
          acc.total_qty += Number(r.total_qty || r.ordered_qty || r.qty || 0);
          if (!acc.cost_usd && r.cost_usd) acc.cost_usd = Number(r.cost_usd);
        }
      }

      setLines(Array.from(linesMap.values()));

      // 6) communications (solo de esta PO)
      const commRes = await fetchJSON(`${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`);
      setComms(commRes.rows || []);
    } finally {
      setLoading(false);
    }
  }, [po, oci, seed]);

  useEffect(() => {
    if (open) loadAll().catch(console.error);
  }, [open, loadAll]);

  const totalUSD = useMemo(() => {
    return lines.reduce((acc, l) => acc + Number(l.cost_usd || 0) * Number(l.total_qty || 0), 0);
  }, [lines]);

  // ────────────────────────────────────────────────────────────────────────────────
  // Editar línea: cost_usd + total_qty
  // ────────────────────────────────────────────────────────────────────────────────
  async function handleEditLine(line) {
    const priceStr = window.prompt(
      `Unit price (USD)\nActual: ${line.cost_usd}\n\nDeja en blanco para no cambiar.`,
      line.cost_usd ? String(line.cost_usd) : ''
    );
    if (priceStr === null) return;

    const qtyStr = window.prompt(
      `Requested quantity\nActual: ${line.total_qty}\n\nDeja en blanco para no cambiar.`,
      line.total_qty ? String(line.total_qty) : ''
    );
    if (qtyStr === null) return;

    const newPrice = priceStr.trim() === '' ? line.cost_usd : Number(priceStr.replace(',', '.'));
    const newQty   = qtyStr.trim() === '' ? line.total_qty : Number(qtyStr.replace(',', '.'));

    await postJSON(`${API_BASE}?route=write&action=update&name=purchase_orders`, {
      row: {
        po_number: line.po_number,
        presentation_code: line.presentation_code,
        cost_usd: newPrice,
        total_qty: newQty,
      },
    });

    // refrescamos
    await loadAll();
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Communications: add / delete
  // ────────────────────────────────────────────────────────────────────────────────
  async function handleAddComm() {
    // Modal simple, igual a los otros formularios (type/subject/participants/content)
    // linked_type: 'orders', linked_id: po
    const type = window.prompt('Type (meeting, mail, call, whatsapp, other):', 'meeting');
    if (type == null) return;
    const subject = window.prompt('Subject:', '');
    if (subject == null) return;
    const participants = window.prompt('Participants (comma separated):', '');
    if (participants == null) return;
    const content = window.prompt('Content:', '');
    if (content == null) return;

    await postJSON(`${API_BASE}?route=write&action=create&name=communications`, {
      row: {
        type, subject, participants, content,
        linked_type: 'orders',
        linked_id: po,
        unread: 'true',
      },
    });
    await loadAll();
  }

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
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="text-xl font-semibold text-slate-900">Order Details — {oci ? `OCI-${oci} / ` : ''}PO-{po}</div>
            {po ? <Badge className="bg-slate-100 text-slate-700">PO-{po}</Badge> : null}
            {oci ? <Badge className="bg-slate-100 text-slate-700">OCI-{oci}</Badge> : null}
          </div>
          <div className="text-sm text-slate-500">Created: {formatDate(header.created_date)}</div>
        </div>

        {/* Tabs */}
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
                {lines.map(line => (
                  <ProductLine key={line.presentation_code} line={line} onEdit={handleEditLine} />
                ))}
                {lines.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
                    No items found.
                  </div>
                )}
              </div>
            </div>
          </Tab>

          <Tab title="Communications">
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="text-sm text-slate-600">
                Linked to <b>Orders</b> • <b>{po}</b>
                {oci ? <> — <b>Imports</b> • <b>{oci}</b></> : null}
              </div>
              <button className="rounded-lg bg-violet-600 px-3 py-1.5 text-white hover:bg-violet-700" onClick={handleAddComm}>+ Add</button>
            </div>

            <div className="grid gap-4 p-5">
              {comms.map(c => (
                <CommCard key={c.id || c._virtual_id || `${c.created_date}::${c.subject}`} c={c} onDelete={handleDeleteComm} />
              ))}
              {comms.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">
                  No communications for this PO.
                </div>
              )}
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
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`-mb-px border-b-2 px-1.5 py-2 text-sm ${i === idx ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {c.props.title}
          </button>
        ))}
      </div>
      <div>{items[idx]}</div>
    </>
  );
}
function Tab({ children }) { return children; }

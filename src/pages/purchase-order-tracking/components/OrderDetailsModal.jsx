// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import { useEffect, useMemo, useState } from 'react';
import { API_BASE, fetchJSON, formatDate, formatCurrency, badgeClass } from '../../../lib/utils';

// Simple iconos
function Tag({ children }) {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{children}</span>;
}

function Pill({ children, className = '' }) {
  return <span className={`rounded-lg px-3 py-2 text-sm ${className}`}>{children}</span>;
}

export default function OrderDetailsModal({ open, onClose, order }) {
  const po = order?.po_number || '';
  const oci = order?.oci_number || '';

  const [poRows, setPoRows] = useState([]);            // purchase_orders (toda la hoja)
  const [imports, setImports] = useState([]);          // imports (toda la hoja)
  const [importItems, setImportItems] = useState([]);  // import_items (toda la hoja)
  const [tab, setTab] = useState('items');

  // Communications
  const [comms, setComms] = useState([]);
  const [busy, setBusy] = useState(false);

  // Carga tablas necesarias una sola vez
  useEffect(() => {
    if (!open) return;
    (async () => {
      const [poRes, impRes, impItemRes] = await Promise.all([
        fetchJSON(`${API_BASE}?route=table&name=purchase_orders`),
        fetchJSON(`${API_BASE}?route=table&name=imports`),
        fetchJSON(`${API_BASE}?route=table&name=import_items`)
      ]);
      if (poRes?.ok) setPoRows(poRes.rows || []);
      if (impRes?.ok) setImports(impRes.rows || []);
      if (impItemRes?.ok) setImportItems(impItemRes.rows || []);
    })().catch(console.error);
  }, [open]);

  // Header chips corregidos
  const headerChips = (
    <div className="flex items-center gap-2">
      {po ? <Tag>PO-{po.replace(/^PO-?/i,'')}</Tag> : null}
      {oci ? <Tag>OCI-{oci.replace(/^OCI-?/i,'')}</Tag> : null}
    </div>
  );

  // Items: ahora están también en purchase_orders (una fila por línea)
  // Creamos las líneas del PO con toda la info que pides
  const lines = useMemo(() => {
    if (!po) return [];
    // Filas que pertenecen al mismo PO
    const related = (poRows || []).filter(r => String(r.po_number || '').trim() === po);

    // Para cada línea, armamos el objeto visible
    return related.map(r => {
      const presentation = String(r.presentation_code || '').trim();
      const unitName = Number(r.package_units || r.units_per_pack || 0) || 0;

      // Precio unitario USD ya corregido por toNumber en adapters (el backend nos lo manda tal cual).
      const unitUsd = Number(r.cost_usd || r.unit_price_usd || r.unit_price || 0) || 0;

      // Import status / transport: los resolvemos por OCI
      const impRow = (imports || []).find(ii => String(ii.oci_number || '').trim() === String(r.oci_number || '').trim());
      const importStatus = String(impRow?.import_status || '').toLowerCase();
      const transportType = String(impRow?.transport_type || '').toLowerCase();

      // Imported qty: suma import_items para este OCI + presentation
      const imported = (importItems || [])
        .filter(x =>
          String(x.oci_number || '').trim() === String(r.oci_number || '').trim() &&
          String(x.presentation_code || '').trim() === presentation
        )
        .reduce((acc, x) => acc + (Number(x.qty || 0) || 0), 0);

      const requested = Number(r.total_qty || r.ordered_qty || r.qty || 0) || 0;
      const remaining = Math.max(requested - imported, 0);

      return {
        productName: String(r.product_name || r.presentation_name || '').trim(),
        productCode: presentation,
        unitsPerPack: unitName || undefined,
        unitUsd,
        importStatus,
        transportType,
        requested,
        imported,
        remaining
      };
    });
  }, [po, poRows, imports, importItems]);

  // Total USD: sum(requested * unitUsd)
  const totalUsd = useMemo(() => {
    return lines.reduce((acc, l) => acc + (Number(l.requested) * Number(l.unitUsd)), 0);
  }, [lines]);

  // Communications (filtrado solo por Orders + PO)
  const loadComms = async () => {
    setBusy(true);
    try {
      const url = `${API_BASE}?route=table&name=communications&lt=orders&lid=${encodeURIComponent(po)}&order=desc`;
      const res = await fetchJSON(url);
      setComms(res?.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open && tab === 'comms' && po) loadComms();
  }, [open, tab, po]);

  const deleteComm = async (comm) => {
    if (!comm) return;
    if (!confirm('Are you sure you want to delete this communication?')) return;
    try {
      await fetchJSON(`${API_BASE}?route=write&name=communications&action=delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({ id: comm.id || comm._virtual_id, subject: comm.subject, created_date: comm.created_date }),
      });
      await loadComms();
    } catch (e) {
      alert('Delete failed');
      console.error(e);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 p-4">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Order Details – PO</h2>
            {headerChips}
          </div>
          <div className="text-sm text-slate-500">Created: {formatDate(order?.created_date)}</div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b px-4 pt-3">
          <button
            className={`pb-3 text-sm ${tab==='items' ? 'border-b-2 border-indigo-500 font-medium text-indigo-600' : 'text-slate-600'}`}
            onClick={() => setTab('items')}
          >Items</button>
          <button
            className={`pb-3 text-sm ${tab==='comms' ? 'border-b-2 border-indigo-500 font-medium text-indigo-600' : 'text-slate-600'}`}
            onClick={() => setTab('comms')}
          >Communications</button>
        </div>

        {tab === 'items' && (
          <div className="space-y-4 p-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Pill className="bg-slate-50 text-slate-700">
                <div className="text-xs">PO Number</div>
                <div className="text-base font-medium">PO-{po.replace(/^PO-?/i,'')}</div>
              </Pill>
              <Pill className="bg-slate-50 text-slate-700">
                <div className="text-xs">Created</div>
                <div className="text-base font-medium">{formatDate(order?.created_date) || '—'}</div>
              </Pill>
              <Pill className="bg-slate-50 text-slate-700">
                <div className="text-xs">Total (USD)</div>
                <div className="text-base font-medium">{formatCurrency(totalUsd)}</div>
              </Pill>
            </div>

            {/* Lines */}
            {lines.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">No items found.</div>
            )}

            <div className="space-y-4">
              {lines.map((l, idx) => (
                <div key={idx} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">
                        {l.productName || l.productCode}
                        {l.unitsPerPack ? <span className="text-slate-500"> • {l.unitsPerPack} units/pack</span> : null}
                      </div>
                      <div className="text-xs text-slate-500">Code: {l.productCode}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass('import', l.importStatus)}`}>{l.importStatus || '—'}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass('transport', l.transportType)}`}>{l.transportType || '—'}</span>
                        {oci ? <Tag>OCI-{oci.replace(/^OCI-?/i,'')}</Tag> : null}
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      <div className="text-right text-slate-600">{formatCurrency(l.unitUsd)} <span className="text-xs text-slate-400">/ unit</span></div>
                      <button
                        className="mt-2 rounded-lg border px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                        onClick={() => alert('Edit coming soon')}
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Pill className="bg-slate-50 text-slate-700">
                      <div className="text-xs">Requested</div>
                      <div className="text-2xl font-semibold tracking-tight">{l.requested.toLocaleString()}</div>
                    </Pill>
                    <Pill className="bg-slate-50 text-slate-700">
                      <div className="text-xs">Imported</div>
                      <div className="text-2xl font-semibold tracking-tight">{l.imported.toLocaleString()}</div>
                    </Pill>
                    <Pill className="bg-slate-50 text-slate-700">
                      <div className="text-xs">Remaining</div>
                      <div className="text-2xl font-semibold tracking-tight">{l.remaining.toLocaleString()}</div>
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'comms' && (
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm text-slate-500">Linked to Orders • {po}</div>
              <button
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
                onClick={() => window.dispatchEvent(new CustomEvent('open-new-communication', { detail: { linked_type: 'orders', linked_id: po } }))}
              >
                + Add
              </button>
            </div>

            {busy && <div className="p-6 text-center text-slate-500">Loading…</div>}

            {!busy && comms.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-slate-500">No communications.</div>
            )}

            <div className="space-y-3">
              {comms.map(c => (
                <div key={c.id || c._virtual_id} className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{c.subject || '(no subject)'}</div>
                      <div className="text-xs text-slate-500">{c.type || 'note'} • {c.participants || '—'}</div>
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(c.created_date || c.created || c.date)}</div>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                    {c.content || c.preview || ''}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-500">Linked: orders • {po}</div>
                    <button
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
                      onClick={() => deleteComm(c)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

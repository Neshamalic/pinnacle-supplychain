// src/pages/tender-management/index.jsx
import React, { useMemo, useState } from 'react';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

// Datos desde Google Sheets
import { useSheet } from '../../lib/sheetsApi';
import { mapTenders, mapTenderItems } from '../../lib/adapters';

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

// Badge simple para status
function TenderStatusBadge({ status = '' }) {
  const s = String(status).toLowerCase();
  const cls =
    s === 'awarded' ? 'bg-emerald-100 text-emerald-700' :
    s === 'in delivery' ? 'bg-amber-100 text-amber-700' :
    s === 'submitted' ? 'bg-blue-100 text-blue-700' :
    s === 'rejected' ? 'bg-rose-100 text-rose-700' :
    'bg-muted text-foreground';
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
      {status || '—'}
    </span>
  );
}

// Modal muy sencillo para crear/editar
function TenderModal({ isOpen, onClose, onSubmit, initial = {} }) {
  const [form, setForm] = useState({
    tender_id: initial.tenderId ?? '',
    title: initial.title ?? '',
    status: initial.status ?? '',
    delivery_date: initial.deliveryDate
      ? new Date(initial.deliveryDate).toISOString().slice(0,10)
      : '',
  });

  if (!isOpen) return null;

  const change = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-modal max-w-lg w-full mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {initial.tenderId ? 'Edit Tender' : 'New Tender'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={18} />
          </Button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tender ID</label>
            <input
              name="tender_id"
              value={form.tender_id}
              onChange={change}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder="CENABAST-2024-001"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Title</label>
            <input
              name="title"
              value={form.title}
              onChange={change}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder="Medicamentos..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={change}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="">—</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="In Delivery">In Delivery</option>
                <option value="Awarded">Awarded</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Delivery Date</label>
              <input
                type="date"
                name="delivery_date"
                value={form.delivery_date}
                onChange={change}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="default">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TenderManagementPage() {
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [edit, setEdit] = useState(null);

  // 1) Trae "tenders"
  const { rows: tenders = [], loading: loadingTenders, error: errTenders } =
    useSheet('tenders', mapTenders);

  // 2) Trae "tender_items" para calcular Products / Total Value
  const { rows: items = [], loading: loadingItems, error: errItems } =
    useSheet('tender_items', mapTenderItems);

  // 3) Agrupa por tenderNumber: productos y monto CLP
  const aggregates = useMemo(() => {
    const m = {};
    (items || []).forEach((it) => {
      const key = it.tenderNumber;
      if (!key) return;
      if (!m[key]) m[key] = { products: 0, totalClp: 0 };
      m[key].products += 1;
      m[key].totalClp += Number.isFinite(it.lineTotalClp) ? it.lineTotalClp : 0;
    });
    return m;
  }, [items]);

  // 4) Une agregados a los tenders
  const rows = useMemo(() => {
    return (tenders || []).map((t) => {
      const ag = aggregates[t.tenderId] || { products: 0, totalClp: 0 };
      return { ...t, products: ag.products, totalClp: ag.totalClp };
    });
  }, [tenders, aggregates]);

  const fmtCLP = (n) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
      .format(Number(n || 0));

  const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
    // cambia locale si quieres mostrar en ES
  };

  // CRUD helpers
  const createTender = async (payload) => {
    if (!API_URL) return alert('Falta VITE_SHEETS_API_URL');
    const res = await fetch(`${API_URL}?route=write&action=create&name=tenders`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Create failed');
    setIsNewOpen(false);
    window.location.reload();
  };

  const updateTender = async (payload) => {
    if (!API_URL) return alert('Falta VITE_SHEETS_API_URL');
    const res = await fetch(`${API_URL}?route=write&action=update&name=tenders`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // IMPORTANTE: aquí enviamos la KEY configurada en Apps Script
      body: JSON.stringify({ tender_id: edit.tenderId, ...payload }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Update failed');
    setEdit(null);
    window.location.reload();
  };

  const deleteTender = async (t) => {
    if (!API_URL) return alert('Falta VITE_SHEETS_API_URL');
    if (!confirm(`Delete tender ${t.tenderId}?`)) return;
    const res = await fetch(`${API_URL}?route=write&action=delete&name=tenders`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ tender_id: t.tenderId }), // coincide con KEYS.tenders
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Delete failed');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior de toda la app */}
      <Header />

      <main className="pt-16">
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {/* Encabezado de página */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Tender Management</h1>
              <p className="text-muted-foreground">
                Manage and oversee all CENABAST tenders from registration through delivery tracking.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" iconName="Download" iconPosition="left">Export</Button>
              <Button variant="default" iconName="Plus" iconPosition="left" onClick={() => setIsNewOpen(true)}>
                New Tender
              </Button>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium">Tender ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Title</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Products</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Delivery Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Stock Coverage</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Total Value</th>
                    <th className="px-6 py-4 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(rows || []).map((t) => (
                    <tr key={t.tenderId || t.id}>
                      <td className="px-6 py-4">{t.tenderId || '—'}</td>
                      <td className="px-6 py-4">{t.title || '—'}</td>
                      <td className="px-6 py-4">{t.products ?? 0}</td>
                      <td className="px-6 py-4"><TenderStatusBadge status={t.status} /></td>
                      <td className="px-6 py-4">{fmtDate(t.deliveryDate)}</td>
                      <td className="px-6 py-4">
                        {Number.isFinite(t.stockCoverageDays) ? (
                          <span className="inline-flex items-center gap-2">
                            <Icon name="Shield" size={14} /> {t.stockCoverageDays} days
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4">{fmtCLP(t.totalClp)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" iconName="Eye" onClick={() => setEdit(t)}>View</Button>
                          <Button variant="ghost" size="sm" iconName="Edit" onClick={() => setEdit(t)}>Edit</Button>
                          <Button variant="ghost" size="sm" iconName="Trash" onClick={() => deleteTender(t)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && !(loadingTenders || loadingItems) && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                        No tenders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {(loadingTenders || loadingItems) && (
              <div className="px-6 py-4 text-sm text-muted-foreground">Loading…</div>
            )}
            {(errTenders || errItems) && (
              <div className="px-6 py-4 text-sm text-red-600">
                Error: {String(errTenders || errItems)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modales */}
      <TenderModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSubmit={createTender}
      />
      <TenderModal
        isOpen={!!edit}
        onClose={() => setEdit(null)}
        initial={edit || {}}
        onSubmit={updateTender}
      />
    </div>
  );
}


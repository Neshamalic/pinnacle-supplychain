import React, { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderProgressBar from './OrderProgressBar';

import { useSheet } from '@/lib/sheetsApi.js';
import { mapCommunications } from '@/lib/adapters.js';

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

const OrderDetailsModal = ({ order, isOpen, onClose, currentLanguage = 'en' }) => {
  const [activeTab, setActiveTab] = useState('details');

  // Campos editables
  const [mfg, setMfg] = useState('');
  const [qc, setQc] = useState('');
  const [transport, setTransport] = useState('');
  const [eta, setEta] = useState('');
  const [costUsd, setCostUsd] = useState('');
  const [costClp, setCostClp] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !order) return;
    setActiveTab('details');
    setMfg(String(order?.manufacturingStatus || ''));
    setQc(String(order?.qcStatus || ''));
    setTransport(String(order?.transportType || ''));
    // normaliza fecha YYYY-MM-DD si viene con tiempo
    const d = order?.eta ? new Date(order.eta) : null;
    const ymd = d && !Number.isNaN(d.getTime())
      ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      : '';
    setEta(ymd);
    setCostUsd(order?.costUsd ?? '');
    setCostClp(order?.costClp ?? '');
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const t = (en, es) => (currentLanguage === 'es' ? es : en);

  /* ---------- Helpers de formato ---------- */
  const fmtMoney = (val, curr) => {
    const num = Number.isFinite(+val) ? +val : 0;
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency', currency: curr, minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
  };

  const fmtDateHuman = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  };

  /* ---------- Communications desde Sheets ---------- */
  const { rows: commRows = [], loading, error } = useSheet('communications', mapCommunications);
  const communications = useMemo(() => {
    const rows = commRows || [];
    const po = order?.poNumber || order?.id || '';
    if (!po) return [];

    let list = rows.filter((c) =>
      (c.linked_type === 'order' && String(c.linked_id) === String(po)) ||
      (String(c.linked_id) === String(po))
    );

    if (list.length === 0) {
      const p = String(po).toLowerCase();
      list = rows.filter((c) =>
        c.subject?.toLowerCase().includes(p) ||
        c.content?.toLowerCase().includes(p) ||
        c.preview?.toLowerCase().includes(p)
      );
    }

    return list.map((c) => {
      let from = '';
      if (c.participants) {
        const first = String(c.participants).split(/[,;]+/)[0]?.trim();
        from = first || '';
      }
      return {
        id: c.id,
        date: c.createdDate,
        type: (c.type || '').toLowerCase(),
        subject: c.subject || '',
        from,
        content: c.content || c.preview || ''
      };
    }).sort((a, b) => {
      const ta = a.date ? new Date(a.date).getTime() : 0;
      const tb = b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });
  }, [commRows, order]);

  /* ---------- Guardar cambios (UPDATE) ---------- */
  const handleUpdate = async () => {
    if (!API_URL) {
      alert(t('Missing VITE_SHEETS_API_URL', 'Falta VITE_SHEETS_API_URL'));
      return;
    }
    if (!order?.poNumber) {
      alert(t('Missing PO Number to update', 'Falta Número PO para actualizar'));
      return;
    }

    try {
      setSaving(true);

      // Respetar tus columnas reales en la hoja purchase_orders:
      const payload = {
        po_number: order.poNumber,              // KEY para update
        manufacturing_status: mfg || '',
        qc_status: qc || '',
        transport_type: transport || '',
        eta: eta || '',
        cost_usd: costUsd === '' ? '' : Number(costUsd),
        cost_clp: costClp === '' ? '' : Number(costClp),
      };

      const res = await fetch(`${API_URL}?route=write&action=update&name=purchase_orders`, {
        method: 'POST',
        // Importante: text/plain para evitar preflight CORS
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Unknown error');

      // Recargar para ver cambios (simple)
      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(`${t('Error updating order:', 'Error al actualizar:')} ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- UI ---------- */
  const tabs = [
    { id: 'details',        labelEn: 'Details',        labelEs: 'Detalles' },
    { id: 'products',       labelEn: 'Products',       labelEs: 'Productos' },
    { id: 'timeline',       labelEn: 'Timeline',       labelEs: 'Cronología' },
    { id: 'communications', labelEn: 'Communications', labelEs: 'Comunicaciones' }
  ];
  const getTabLabel = (tab) => (currentLanguage === 'es' ? tab.labelEs : tab.labelEn);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-modal max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t('Order Details', 'Detalles de la Orden')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {(order?.poNumber || '—')} {order?.tenderRef ? `- ${order.tenderRef}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* DETAILS (editables) */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('Manufacturing Status', 'Estado de Fabricación')}
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <select
                        value={mfg}
                        onChange={(e) => setMfg(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      >
                        <option value="">{t('— Select —', '— Selecciona —')}</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Completed</option>
                      </select>
                      <OrderStatusBadge status={mfg} type="manufacturing" currentLanguage={currentLanguage} />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('QC Status', 'Estado QC')}
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <select
                        value={qc}
                        onChange={(e) => setQc(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      >
                        <option value="">{t('— Select —', '— Selecciona —')}</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="approved">Approved</option>
                        <option value="completed">Completed</option>
                      </select>
                      <OrderStatusBadge status={qc} type="qc" currentLanguage={currentLanguage} />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('Transport Type', 'Tipo de Transporte')}
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      <select
                        value={transport}
                        onChange={(e) => setTransport(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      >
                        <option value="">{t('— Select —', '— Selecciona —')}</option>
                        <option value="sea">Sea</option>
                        <option value="air">Air</option>
                        <option value="land">Land</option>
                      </select>
                      <OrderStatusBadge status={transport} type="transport" currentLanguage={currentLanguage} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ETA</label>
                    <input
                      type="date"
                      value={eta}
                      onChange={(e) => setEta(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{fmtDateHuman(eta)}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('Cost USD', 'Costo USD')}
                    </label>
                    <input
                      type="number"
                      value={costUsd}
                      onChange={(e) => setCostUsd(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{fmtMoney(costUsd, 'USD')}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('Cost CLP', 'Costo CLP')}
                    </label>
                    <input
                      type="number"
                      value={costClp}
                      onChange={(e) => setCostClp(e.target.value)}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{fmtMoney(costClp, 'CLP')}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  {t('Production Progress', 'Progreso de Producción')}
                </label>
                <OrderProgressBar status={mfg} currentLanguage={currentLanguage} />
              </div>
            </div>
          )}

          {/* PRODUCTS (placeholder) */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                {t('No product breakdown available for this order.', 'No hay desglose de productos disponible para esta orden.')}
              </div>
            </div>
          )}

          {/* TIMELINE (derivada) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground">
                {t('Timeline info will be derived from order fields.', 'La cronología se deriva de los campos de la orden.')}
              </div>
            </div>
          )}

          {/* COMMUNICATIONS */}
          {activeTab === 'communications' && (
            <div className="space-y-4">
              {loading && <div className="text-sm text-muted-foreground">Loading communications…</div>}
              {error && <div className="text-sm text-red-600">Error: {String(error)}</div>}
              {!loading && !error && communications.length === 0 && (
                <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                  {t('No communications linked to this order.', 'No hay comunicaciones vinculadas a esta orden.')}
                </div>
              )}
              {!loading && !error && communications.map((c) => (
                <div key={c.id} className="bg-muted rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Icon name={c.type === 'email' ? 'Mail' : c.type === 'phone' ? 'Phone' : 'MessageSquare'} size={16} />
                      <h4 className="font-medium text-foreground">{c.subject || t('No subject', 'Sin asunto')}</h4>
                    </div>
                    <span className="text-sm text-muted-foreground">{fmtDateHuman(c.date)}</span>
                  </div>
                  {c.from && <p className="text-sm text-muted-foreground mb-2">{t('From', 'De')}: {c.from}</p>}
                  {c.content && <p className="text-sm text-foreground whitespace-pre-line">{c.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>{t('Close', 'Cerrar')}</Button>
          <Button variant="default" onClick={handleUpdate} disabled={saving}>
            {saving ? t('Saving…', 'Guardando…') : t('Update Status', 'Actualizar Estado')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;


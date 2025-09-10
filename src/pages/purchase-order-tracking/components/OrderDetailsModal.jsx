// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderProgressBar from './OrderProgressBar';

import { useSheet } from '@/lib/sheetsApi.js';
import { mapCommunications, mapPurchaseOrderItems, mapImportItems, mapImports } from '@/lib/adapters.js';

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

const OrderDetailsModal = ({ order, isOpen, onClose, currentLanguage = 'en' }) => {
  const [activeTab, setActiveTab] = useState('details');

  // Campos editables (encabezado de la PO)
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

  /* ---------- Helpers ---------- */
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

  /* ---------- Communications ---------- */
  const { rows: commRows = [], loading: commLoading, error: commError } = useSheet('communications', mapCommunications);
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

  /* ---------- Products: solicitado vs importado ---------- */
  const { rows: poItems = [] } = useSheet('purchase_order_items', mapPurchaseOrderItems);
  const { rows: importItems = [] } = useSheet('import_items', mapImportItems);
  const { rows: imports = [] } = useSheet('imports', mapImports);

  const importStatusByOCI = useMemo(() => {
    const m = new Map();
    (imports || []).forEach(r => {
      if (!r || !r.ociNumber) return;
      m.set(String(r.ociNumber), r.importStatus || '');
    });
    return m;
  }, [imports]);

  const productLines = useMemo(() => {
    if (order._poProductLines && order._poProductLines.length) {
      return order._poProductLines; // preferimos lo que viene precalculado desde la tabla
    }

    const po = String(order.poNumber || '').trim();
    if (!po) return [];

    const requested = new Map();
    (poItems || []).forEach(it => {
      if (String(it.poNumber || '').trim() !== po) return;
      const code = String(it.presentationCode || '').trim();
      if (!code) return;
      requested.set(code, (requested.get(code) || 0) + (it.qty || 0));
    });

    const imported = new Map();
    (importItems || []).forEach(it => {
      if (String(it.poNumber || '').trim() !== po) return; // <-- requiere poNumber en mapImportItems
      const code = String(it.presentationCode || '').trim();
      if (!code) return;
      const st = (importStatusByOCI.get(String(it.ociNumber || '').trim()) || '').toLowerCase();
      const prev = imported.get(code) || { inTransit: 0, arrived: 0 };
      const q = it.qty || 0;
      if (st === 'warehouse') prev.arrived += q;
      else prev.inTransit += q;
      imported.set(code, prev);
    });

    const allCodes = new Set([...requested.keys(), ...imported.keys()]);
    const arr = [];
    allCodes.forEach(code => {
      const rq = requested.get(code) || 0;
      const imp = imported.get(code) || { inTransit: 0, arrived: 0 };
      arr.push({
        presentationCode: code,
        requested: rq,
        inTransit: imp.inTransit || 0,
        arrived: imp.arrived || 0,
        remaining: Math.max(rq - ((imp.inTransit || 0) + (imp.arrived || 0)), 0),
      });
    });
    return arr.sort((a,b) => a.presentationCode.localeCompare(b.presentationCode));
  }, [order, poItems, importItems, importStatusByOCI]);

  /* ---------- Guardar cambios en encabezado ---------- */
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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Unknown error');

      onClose();
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(`${t('Error updating order:', 'Error al actualizar:')} ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

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
          {/* DETAILS */}
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
                        <option value="in-process">In-Process</option>
                        <option value="ready">Ready</option>
                        <option value="shipped">Shipped</option>
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

              {/* Resumen de cumplimiento por producto (solicitado vs importado) */}
              <div className="rounded-lg border border-border">
                <div className="px-4 py-3 border-b border-border font-medium text-foreground">
                  {t('Fulfillment by product', 'Cumplimiento por producto')}
                </div>
                <div className="p-4 space-y-3">
                  {productLines.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      {t('No product breakdown available for this order.', 'No hay desglose de productos disponible para esta orden.')}
                    </div>
                  )}
                  {productLines.map((p) => (
                    <div key={p.presentationCode} className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
                      <div className="font-medium text-foreground">{p.presentationCode}</div>
                      <div className="text-sm text-muted-foreground flex gap-4">
                        <span>{t('Requested', 'Solicitado')}: <strong className="text-foreground">{p.requested}</strong></span>
                        <span>{t('In transit', 'En tránsito')}: <strong className="text-foreground">{p.inTransit}</strong></span>
                        <span>{t('Arrived', 'Recibido')}: <strong className="text-foreground">{p.arrived}</strong></span>
                        <span>{t('Remaining', 'Faltante')}: <strong className="text-foreground">{p.remaining}</strong></span>
                      </div>
                    </div>
                  ))}
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

          {/* PRODUCTS (lista simple) */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              {productLines.length === 0 ? (
                <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                  {t('No product breakdown available for this order.', 'No hay desglose de productos disponible para esta orden.')}
                </div>
              ) : (
                productLines.map(p => (
                  <div key={p.presentationCode} className="bg-muted rounded-lg p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-foreground">{p.presentationCode}</h4>
                      <span className="text-sm text-muted-foreground">
                        {t('Remaining', 'Faltante')}: {p.remaining}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('Requested', 'Solicitado')}: {p.requested} · {t('In transit', 'En tránsito')}: {p.inTransit} · {t('Arrived', 'Recibido')}: {p.arrived}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TIMELINE */}
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
              {commLoading && <div className="text-sm text-muted-foreground">Loading communications…</div>}
              {commError && <div className="text-sm text-red-600">Error: {String(commError)}</div>}
              {!commLoading && !commError && communications.length === 0 && (
                <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                  {t('No communications linked to this order.', 'No hay comunicaciones vinculadas a esta orden.')}
                </div>
              )}
              {!commLoading && !commError && communications.map((c) => (
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

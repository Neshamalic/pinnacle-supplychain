import React, { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderProgressBar from './OrderProgressBar';

// ✅ Datos reales desde Google Sheets (communications)
import { useSheet } from '@/lib/sheetsApi.js';
import { mapCommunications } from '@/lib/adapters.js';

const MFG_OPTIONS = ['Unknown', 'Not started', 'Started', 'Ready'];
const QC_OPTIONS  = ['Unknown', 'Pending', 'Approved'];
const TPT_OPTIONS = ['Unknown', 'Air', 'Sea', 'Courier'];

function toISODateInput(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  // yyyy-mm-dd para <input type="date">
  return d.toISOString().slice(0, 10);
}

async function writePurchaseOrder(action, form) {
  // form usa las claves de UI; aquí mapeamos a columnas del Sheet
  const row = {
    po_number: String(form.poNumber || ''),
    tender_ref: form.tenderRef || '',
    manufacturing_status: form.manufacturingStatus || '',
    qc_status: form.qcStatus || '',
    transport_type: form.transportType || '',
    eta: form.eta ? new Date(form.eta).toISOString() : '',
    cost_usd: form.costUsd ?? 0,
    cost_clp: form.costClp ?? 0,
    created_date: form.createdDate ? new Date(form.createdDate).toISOString() : new Date().toISOString(),
  };

  const url = import.meta.env.VITE_SHEETS_API_URL;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route: 'write',
      action,                // 'create' | 'update'
      name: 'purchase_orders',
      row
    })
  });
  const json = await res.json();
  if (!json?.ok) {
    const msg = json?.error || 'Unknown error';
    throw new Error(msg);
  }
  return json;
}

const OrderDetailsModal = ({ order, isOpen, onClose, onSaved, currentLanguage, mode = 'view' }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [editing, setEditing] = useState(mode !== 'view');

  // form local (se rellena con la orden)
  const [form, setForm] = useState({
    poNumber: '',
    tenderRef: '',
    manufacturingStatus: 'Unknown',
    qcStatus: 'Unknown',
    transportType: 'Unknown',
    eta: '',
    costUsd: 0,
    costClp: 0,
    createdDate: ''
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setActiveTab('details');
    setEditing(mode !== 'view');
  }, [mode, isOpen]);

  useEffect(() => {
    if (!order) return;
    setForm({
      poNumber: order.poNumber || '',
      tenderRef: order.tenderRef || '',
      manufacturingStatus: order.manufacturingStatus || 'Unknown',
      qcStatus: order.qcStatus || 'Unknown',
      transportType: order.transportType || 'Unknown',
      eta: order.eta || '',
      costUsd: order.costUsd ?? 0,
      costClp: order.costClp ?? 0,
      createdDate: order.createdDate || new Date().toISOString()
    });
  }, [order]);

  if (!isOpen || !order) return null;

  /* ---------- Helpers de formato ---------- */
  const formatCurrency = (amount, currency) => {
    if (amount === undefined || amount === null || amount === '') return '—';
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(d);
  };

  /* ---------- Tabs ---------- */
  const tabs = [
    { id: 'details',        labelEn: 'Details',        labelEs: 'Detalles' },
    { id: 'products',       labelEn: 'Products',       labelEs: 'Productos' },
    { id: 'timeline',       labelEn: 'Timeline',       labelEs: 'Cronología' },
    { id: 'communications', labelEn: 'Communications', labelEs: 'Comunicaciones' }
  ];
  const getTabLabel = (tab) => (currentLanguage === 'es' ? tab.labelEs : tab.labelEn);

  /* ---------- Communications desde Sheets ---------- */
  const { rows: commRows, loading, error } = useSheet('communications', mapCommunications);
  const communications = useMemo(() => {
    const rows = commRows ?? [];
    const po = order?.poNumber || order?.id || '';

    let list = rows.filter(
      (c) =>
        (c.linked_type === 'order' && (String(c.linked_id) === String(po))) ||
        (String(c.linked_id) === String(po))
    );

    if (list.length === 0 && po) {
      const p = String(po).toLowerCase();
      list = rows.filter(
        (c) =>
          c.subject?.toLowerCase().includes(p) ||
          c.content?.toLowerCase().includes(p) ||
          c.preview?.toLowerCase().includes(p)
      );
    }

    return list
      .map((c) => {
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
      })
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });
  }, [commRows, order]);

  /* ---------- Timeline derivado de la orden ---------- */
  const timeline = useMemo(() => {
    const items = [];
    if (order?.createdDate) {
      items.push({
        id: 'created',
        date: order.createdDate,
        event: currentLanguage === 'es' ? 'Orden creada' : 'Order created',
        status: 'completed'
      });
    }
    if (order?.manufacturingStatus) {
      const ms = String(order.manufacturingStatus).toLowerCase();
      let status = 'in-progress';
      if (ms === 'ready' || ms === 'completed') status = 'completed';
      if (ms === 'pending' || ms === 'not-started') status = 'pending';
      items.push({
        id: 'mfg',
        date: order?.manufacturingDate || order?.createdDate || null,
        event: currentLanguage === 'es' ? 'Producción' : 'Manufacturing',
        status
      });
    }
    if (order?.qcStatus) {
      const qc = String(order.qcStatus).toLowerCase();
      let status = 'in-progress';
      if (qc === 'approved' || qc === 'completed') status = 'completed';
      if (qc === 'pending') status = 'pending';
      items.push({
        id: 'qc',
        date: order?.qcDate || null,
        event: currentLanguage === 'es' ? 'Control de calidad' : 'Quality control',
        status
      });
    }
    if (order?.transportType) {
      items.push({
        id: 'transport',
        date: order?.shipmentDate || null,
        event:
          currentLanguage === 'es'
            ? `Transporte: ${order.transportType}`
            : `Transport: ${order.transportType}`,
        status: 'in-progress'
      });
    }
    if (order?.eta) {
      items.push({
        id: 'eta',
        date: order.eta,
        event: 'ETA',
        status: 'pending'
      });
    }
    const cleaned = items.filter((i) => i.date);
    cleaned.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return cleaned.length ? cleaned : items;
  }, [order, currentLanguage]);

  const label = (en, es) => (currentLanguage === 'es' ? es : en);

  const onField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const trySave = async () => {
    setErrorMsg('');
    try {
      if (!form.poNumber || String(form.poNumber).trim() === '') {
        throw new Error(label('PO Number is required', 'El Número PO es obligatorio'));
      }
      setSaving(true);
      const action = mode === 'create' ? 'create' : 'update';
      await writePurchaseOrder(action, form);
      setSaving(false);
      onSaved?.();
    } catch (e) {
      setSaving(false);
      setErrorMsg(String(e.message || e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-card rounded-lg shadow-modal max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {label('Order Details', 'Detalles de la Orden')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {form?.poNumber} {form?.tenderRef ? `- ${form.tenderRef}` : ''}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
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
              {errorMsg && (
                <div className="text-sm text-red-600">{errorMsg}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* PO Number (solo edición/creación) */}
                  {editing && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {label('PO Number', 'Número PO')}
                      </label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                        value={form.poNumber}
                        onChange={(e) => onField('poNumber', e.target.value)}
                        placeholder={label('e.g. PO-001', 'ej: PO-001')}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {label('Manufacturing Status', 'Estado de Fabricación')}
                    </label>
                    <div className="mt-1">
                      {editing ? (
                        <select
                          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                          value={form.manufacturingStatus}
                          onChange={(e) => onField('manufacturingStatus', e.target.value)}
                        >
                          {MFG_OPTIONS.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      ) : (
                        <OrderStatusBadge
                          status={order?.manufacturingStatus}
                          type="manufacturing"
                          currentLanguage={currentLanguage}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {label('QC Status', 'Estado QC')}
                    </label>
                    <div className="mt-1">
                      {editing ? (
                        <select
                          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                          value={form.qcStatus}
                          onChange={(e) => onField('qcStatus', e.target.value)}
                        >
                          {QC_OPTIONS.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      ) : (
                        <OrderStatusBadge
                          status={order?.qcStatus}
                          type="qc"
                          currentLanguage={currentLanguage}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {label('Transport Type', 'Tipo de Transporte')}
                    </label>
                    <div className="mt-1">
                      {editing ? (
                        <select
                          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                          value={form.transportType}
                          onChange={(e) => onField('transportType', e.target.value)}
                        >
                          {TPT_OPTIONS.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                      ) : (
                        <OrderStatusBadge
                          status={order?.transportType}
                          type="transport"
                          currentLanguage={currentLanguage}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      ETA
                    </label>
                    {editing ? (
                      <input
                        type="date"
                        className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                        value={toISODateInput(form.eta)}
                        onChange={(e) => onField('eta', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      />
                    ) : (
                      <p className="text-foreground font-medium">{formatDate(order?.eta)}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {label('Cost USD', 'Costo USD')}
                    </label>
                    {editing ? (
                      <input
                        type="number"
                        step="1"
                        className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                        value={form.costUsd}
                        onChange={(e) => onField('costUsd', Number(e.target.value))}
                      />
                    ) : (
                      <p className="text-foreground font-medium">{formatCurrency(order?.costUsd, 'USD')}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {label('Cost CLP', 'Costo CLP')}
                    </label>
                    {editing ? (
                      <input
                        type="number"
                        step="1"
                        className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                        value={form.costClp}
                        onChange={(e) => onField('costClp', Number(e.target.value))}
                      />
                    ) : (
                      <p className="text-foreground font-medium">{formatCurrency(order?.costClp, 'CLP')}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  {label('Production Progress', 'Progreso de Producción')}
                </label>
                <OrderProgressBar status={order?.manufacturingStatus} currentLanguage={currentLanguage} />
              </div>
            </div>
          )}

          {/* PRODUCTS (placeholder sin breakdown) */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                {label('No product breakdown available for this order.', 'No hay desglose de productos disponible para esta orden.')}
              </div>
            </div>
          )}

          {/* TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                  {label('No events recorded for this order.', 'No hay eventos registrados para esta orden.')}
                </div>
              ) : (
                timeline.map((item, index) => (
                  <div key={item.id} className="flex items-start space-x-4">
                    <div
                      className={`w-3 h-3 rounded-full mt-2 ${
                        item.status === 'completed'
                          ? 'bg-green-500'
                          : item.status === 'in-progress'
                          ? 'bg-amber-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-foreground">{item.event}</h4>
                        <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                      </div>
                      {index < timeline.length - 1 && <div className="w-px h-8 bg-border ml-1.5 mt-2" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* COMMUNICATIONS */}
          {activeTab === 'communications' && (
            <div className="space-y-4">
              {loading && <div className="text-sm text-muted-foreground">Loading communications…</div>}
              {error && <div className="text-sm text-red-600">Error: {error}</div>}

              {!loading && !error && communications.length === 0 && (
                <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                  {label('No communications linked to this order.', 'No hay comunicaciones vinculadas a esta orden.')}
                </div>
              )}

              {!loading &&
                !error &&
                communications.map((comm) => (
                  <div key={comm.id} className="bg-muted rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Icon name={comm.type === 'email' ? 'Mail' : comm.type === 'phone' ? 'Phone' : 'MessageSquare'} size={16} />
                        <h4 className="font-medium text-foreground">{comm.subject || label('No subject', 'Sin asunto')}</h4>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(comm.date)}</span>
                    </div>
                    {comm.from && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {label('From', 'De')}: {comm.from}
                      </p>
                    )}
                    {comm.content && <p className="text-sm text-foreground whitespace-pre-line">{comm.content}</p>}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            {label('Close', 'Cerrar')}
          </Button>

          {/* Si estás en view, el botón habilita la edición; si estás en edit/create, guarda */}
          {editing ? (
            <Button variant="default" onClick={trySave} disabled={saving}>
              {saving ? label('Saving…', 'Guardando…') : label('Save', 'Guardar')}
            </Button>
          ) : (
            <Button variant="default" onClick={() => setEditing(true)}>
              {label('Update Status', 'Actualizar Estado')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;

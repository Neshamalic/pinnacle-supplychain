import React, { useMemo, useState } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderProgressBar from './OrderProgressBar';

// opcional: comunicaciones (si lo tienes en tu adapters)
import { useSheet } from '@/lib/sheetsApi.js';
import { mapCommunications } from '@/lib/adapters.js';

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

const OrderDetailsModal = ({ order, isOpen, onClose, currentLanguage, onUpdated }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // campos editables
  const [form, setForm] = useState({
    manufacturingStatus: '',
    qcStatus: '',
    transportType: '',
    eta: '',
    costUsd: '',
    costClp: '',
  });

  // sincroniza al abrir
  React.useEffect(() => {
    if (isOpen && order) {
      setEditing(false);
      setForm({
        manufacturingStatus: order?.manufacturingStatus ?? '',
        qcStatus: order?.qcStatus ?? '',
        transportType: order?.transportType ?? '',
        eta: order?.eta ? String(order.eta).slice(0, 10) : '',
        costUsd: order?.costUsd ?? '',
        costClp: order?.costClp ?? '',
      });
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const t = (en, es) => (currentLanguage === 'es' ? es : en);

  const formatCurrency = (amount, currency) => {
    if (amount === undefined || amount === null || amount === '') return '—';
    try {
      return new Intl.NumberFormat(
        currentLanguage === 'es' ? 'es-CL' : 'en-US',
        { style: 'currency', currency }
      ).format(amount);
    } catch {
      return amount;
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(
      currentLanguage === 'es' ? 'es-CL' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    ).format(d);
  };

  // Comunicaciones (defensivo si no tuvieras el mapeo)
  const { rows: commRows = [], loading: commLoading, error: commError } =
    useSheet ? useSheet('communications', mapCommunications) : { rows: [] };

  const communications = useMemo(() => {
    const rows = Array.isArray(commRows) ? commRows : [];
    const po = order?.poNumber || order?.id || '';
    if (!po) return [];
    const p = String(po).toLowerCase();

    return rows
      .filter((c) => {
        // por linked o por texto
        return (
          (c.linked_type === 'order' && String(c.linked_id) === String(po)) ||
          String(c.linked_id) === String(po) ||
          c.subject?.toLowerCase().includes(p) ||
          c.content?.toLowerCase().includes(p) ||
          c.preview?.toLowerCase().includes(p)
        );
      })
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
          content: c.content || c.preview || '',
        };
      })
      .sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });
  }, [commRows, order]);

  const timeline = useMemo(() => {
    const items = [];
    if (order?.createdDate) {
      items.push({
        id: 'created',
        date: order.createdDate,
        event: t('Order created', 'Orden creada'),
        status: 'completed'
      });
    }
    if (order?.manufacturingStatus) {
      const ms = String(order.manufacturingStatus).toLowerCase();
      let status = 'in-progress';
      if (ms === 'ready' || ms === 'completed') status = 'completed';
      if (ms === 'pending' || ms === 'not-started' || ms === 'unknown') status = 'pending';
      items.push({ id: 'mfg', date: order?.manufacturingDate || order?.createdDate || null, event: t('Manufacturing', 'Producción'), status });
    }
    if (order?.qcStatus) {
      const qc = String(order.qcStatus).toLowerCase();
      let status = 'in-progress';
      if (qc === 'approved' || qc === 'completed') status = 'completed';
      if (qc === 'pending' || qc === 'unknown') status = 'pending';
      items.push({ id: 'qc', date: order?.qcDate || null, event: t('Quality control', 'Control de calidad'), status });
    }
    if (order?.transportType) {
      items.push({ id: 'transport', date: order?.shipmentDate || null, event: t(`Transport: ${order.transportType}`, `Transporte: ${order.transportType}`), status: 'in-progress' });
    }
    if (order?.eta) {
      items.push({ id: 'eta', date: order.eta, event: 'ETA', status: 'pending' });
    }
    const cleaned = items.filter((i) => i.date);
    cleaned.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return cleaned.length ? cleaned : items;
  }, [order, currentLanguage]);

  const onChangeField = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // 🔐 SAVE: update a purchase_orders usando po_number como llave
  const saveUpdate = async () => {
    if (!API_URL) {
      alert('Falta VITE_SHEETS_API_URL');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        // LLAVE
        po_number: order?.poNumber ?? '',
        // Campos editables (en snake_case p/ tus headers)
        manufacturing_status: form.manufacturingStatus ?? '',
        qc_status: form.qcStatus ?? '',
        transport_type: form.transportType ?? '',
        eta: form.eta ?? '',
        cost_usd: form.costUsd ?? '',
        cost_clp: form.costClp ?? '',
      };

      const res = await fetch(`${API_URL}?route=write&action=update&name=purchase_orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Unknown error');

      setEditing(false);
      if (typeof onUpdated === 'function') onUpdated();
      else window.location.reload();
    } catch (err) {
      console.error(err);
      alert(`Error updating: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

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
              {order?.poNumber} {order?.tenderRef ? `- ${order.tenderRef}` : ''}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Tabs simplificadas: Details / Timeline / Communications */}
        <div className="p-6 overflow-y-auto max-h-[62vh]">
          {/* DETAILS */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('Manufacturing Status', 'Estado de Fabricación')}
                  </label>
                  {editing ? (
                    <input
                      name="manufacturingStatus"
                      value={form.manufacturingStatus}
                      onChange={onChangeField}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      placeholder={t('e.g. Draft/Ready/Completed', 'ej: Draft/Ready/Completed')}
                    />
                  ) : (
                    <div className="mt-1">
                      <OrderStatusBadge status={order?.manufacturingStatus} type="manufacturing" currentLanguage={currentLanguage} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('QC Status', 'Estado QC')}
                  </label>
                  {editing ? (
                    <input
                      name="qcStatus"
                      value={form.qcStatus}
                      onChange={onChangeField}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      placeholder={t('e.g. Pending/Approved', 'ej: Pending/Approved')}
                    />
                  ) : (
                    <div className="mt-1">
                      <OrderStatusBadge status={order?.qcStatus} type="qc" currentLanguage={currentLanguage} />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('Transport Type', 'Tipo de Transporte')}
                  </label>
                  {editing ? (
                    <input
                      name="transportType"
                      value={form.transportType}
                      onChange={onChangeField}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      placeholder={t('e.g. Air/Sea', 'ej: Air/Sea')}
                    />
                  ) : (
                    <div className="mt-1">
                      <OrderStatusBadge status={order?.transportType} type="transport" currentLanguage={currentLanguage} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ETA</label>
                  {editing ? (
                    <input
                      type="date"
                      name="eta"
                      value={form.eta}
                      onChange={onChangeField}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{formatDate(order?.eta)}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('Cost USD', 'Costo USD')}</label>
                  {editing ? (
                    <input
                      name="costUsd"
                      value={form.costUsd}
                      onChange={onChangeField}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{formatCurrency(order?.costUsd, 'USD')}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('Cost CLP', 'Costo CLP')}</label>
                  {editing ? (
                    <input
                      name="costClp"
                      value={form.costClp}
                      onChange={onChangeField}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
                      placeholder="0"
                    />
                  ) : (
                    <p className="text-foreground font-medium">{formatCurrency(order?.costClp, 'CLP')}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                {t('Production Progress', 'Progreso de Producción')}
              </label>
              <OrderProgressBar status={order?.manufacturingStatus} currentLanguage={currentLanguage} />
            </div>
          </div>

          {/* TIMELINE */}
          <div className="mt-8 space-y-4">
            <h3 className="text-base font-semibold text-foreground">{t('Timeline', 'Cronología')}</h3>
            {timeline.length === 0 ? (
              <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                {t('No events recorded for this order.', 'No hay eventos registrados para esta orden.')}
              </div>
            ) : (
              timeline.map((item, i) => (
                <div key={item.id} className="flex items-start space-x-4">
                  <div className={`w-3 h-3 rounded-full mt-2 ${
                    item.status === 'completed' ? 'bg-green-500' :
                    item.status === 'in-progress' ? 'bg-amber-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{item.event}</h4>
                      <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                    </div>
                    {i < timeline.length - 1 && <div className="w-px h-8 bg-border ml-1.5 mt-2" />}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* COMMUNICATIONS */}
          <div className="mt-8 space-y-4">
            <h3 className="text-base font-semibold text-foreground">{t('Communications', 'Comunicaciones')}</h3>
            {commLoading && <div className="text-sm text-muted-foreground">Loading communications…</div>}
            {commError && <div className="text-sm text-red-600">Error: {String(commError)}</div>}
            {!commLoading && !commError && communications.length === 0 && (
              <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                {t('No communications linked to this order.', 'No hay comunicaciones vinculadas a esta orden.')}
              </div>
            )}
            {!commLoading && !commError && communications.map((comm) => (
              <div key={comm.id} className="bg-muted rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon name={comm.type === 'email' ? 'Mail' : comm.type === 'phone' ? 'Phone' : 'MessageSquare'} size={16} />
                    <h4 className="font-medium text-foreground">{comm.subject || t('No subject', 'Sin asunto')}</h4>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatDate(comm.date)}</span>
                </div>
                {comm.from && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('From', 'De')}: {comm.from}
                  </p>
                )}
                {comm.content && <p className="text-sm text-foreground whitespace-pre-line">{comm.content}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          {!editing ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('Close', 'Cerrar')}
              </Button>
              <Button type="button" variant="default" onClick={() => setEditing(true)}>
                {t('Update Status', 'Actualizar Estado')}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                {t('Cancel', 'Cancelar')}
              </Button>
              <Button type="button" variant="default" onClick={saveUpdate} disabled={saving}>
                {saving ? t('Saving…', 'Guardando…') : t('Save', 'Guardar')}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;


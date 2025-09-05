import React, { useState, useEffect, useMemo } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderProgressBar from './OrderProgressBar';

// ✅ Datos reales desde Google Sheets (communications)
import { useSheet } from '@/lib/sheetsApi.js';
import { mapCommunications } from '@/lib/adapters.js';

const OrderDetailsModal = ({ order, isOpen, onClose, currentLanguage }) => {
  const [activeTab, setActiveTab] = useState('details');

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
  // Traemos TODO y luego filtramos la que corresponden a esta orden
  const { rows: commRows, loading, error } = useSheet('communications', mapCommunications);
  const communications = useMemo(() => {
    const rows = commRows ?? [];
    const po = order?.poNumber || order?.id || '';

    // 1) match explícito por entidad vinculada (linked_type/id)
    let list = rows.filter(
      (c) =>
        (c.linked_type === 'order' && (String(c.linked_id) === String(po))) ||
        (String(c.linked_id) === String(po)) // fallback si no hay linked_type
    );

    // 2) si no hay, hacemos fallback por texto (subject/content contiene poNumber)
    if (list.length === 0 && po) {
      const p = String(po).toLowerCase();
      list = rows.filter(
        (c) =>
          c.subject?.toLowerCase().includes(p) ||
          c.content?.toLowerCase().includes(p) ||
          c.preview?.toLowerCase().includes(p)
      );
    }

    // Adaptamos a la UI del modal
    return list
      .map((c) => {
        // "from": primer participante si existe; si no, vacío
        let from = '';
        if (c.participants) {
          // c.participants puede ser string "Nombre, Otro", lo partimos
          const first = String(c.participants).split(/[,;]+/)[0]?.trim();
          from = first || '';
        }
        return {
          id: c.id,
          date: c.createdDate,
          type: (c.type || '').toLowerCase(), // email / phone / whatsapp...
          subject: c.subject || '',
          from,
          content: c.content || c.preview || ''
        };
      })
      // más recientes primero
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

    // Estado de fabricación
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

    // QC
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

    // Envío / Transporte
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

    // ETA
    if (order?.eta) {
      items.push({
        id: 'eta',
        date: order.eta,
        event: 'ETA',
        status: 'pending'
      });
    }

    // Filtra nulos y ordena por fecha si hay
    const cleaned = items.filter((i) => i.date);
    cleaned.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return cleaned.length ? cleaned : items; // si todas sin fecha, deja el orden original
  }, [order, currentLanguage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-card rounded-lg shadow-modal max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {currentLanguage === 'es' ? 'Detalles de la Orden' : 'Order Details'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {order?.poNumber} {order?.tenderRef ? `- ${order.tenderRef}` : ''}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLanguage === 'es' ? 'Estado de Fabricación' : 'Manufacturing Status'}
                    </label>
                    <div className="mt-1">
                      <OrderStatusBadge
                        status={order?.manufacturingStatus}
                        type="manufacturing"
                        currentLanguage={currentLanguage}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLanguage === 'es' ? 'Estado QC' : 'QC Status'}
                    </label>
                    <div className="mt-1">
                      <OrderStatusBadge
                        status={order?.qcStatus}
                        type="qc"
                        currentLanguage={currentLanguage}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLanguage === 'es' ? 'Tipo de Transporte' : 'Transport Type'}
                    </label>
                    <div className="mt-1">
                      <OrderStatusBadge
                        status={order?.transportType}
                        type="transport"
                        currentLanguage={currentLanguage}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLanguage === 'es' ? 'ETA' : 'ETA'}
                    </label>
                    <p className="text-foreground font-medium">{formatDate(order?.eta)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLanguage === 'es' ? 'Costo USD' : 'Cost USD'}
                    </label>
                    <p className="text-foreground font-medium">{formatCurrency(order?.costUsd, 'USD')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {currentLanguage === 'es' ? 'Costo CLP' : 'Cost CLP'}
                    </label>
                    <p className="text-foreground font-medium">{formatCurrency(order?.costClp, 'CLP')}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  {currentLanguage === 'es' ? 'Progreso de Producción' : 'Production Progress'}
                </label>
                <OrderProgressBar status={order?.manufacturingStatus} currentLanguage={currentLanguage} />
              </div>
            </div>
          )}

          {/* PRODUCTS (sin mock; mostramos vacío elegante por ahora) */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                {currentLanguage === 'es'
                  ? 'No hay desglose de productos disponible para esta orden.'
                  : 'No product breakdown available for this order.'}
              </div>
            </div>
          )}

          {/* TIMELINE derivada de la orden */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                  {currentLanguage === 'es'
                    ? 'No hay eventos registrados para esta orden.'
                    : 'No events recorded for this order.'}
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

          {/* COMMUNICATIONS reales (filtradas por la orden) */}
          {activeTab === 'communications' && (
            <div className="space-y-4">
              {loading && <div className="text-sm text-muted-foreground">Loading communications…</div>}
              {error && <div className="text-sm text-red-600">Error: {error}</div>}

              {!loading && !error && communications.length === 0 && (
                <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
                  {currentLanguage === 'es'
                    ? 'No hay comunicaciones vinculadas a esta orden.'
                    : 'No communications linked to this order.'}
                </div>
              )}

              {!loading &&
                !error &&
                communications.map((comm) => (
                  <div key={comm.id} className="bg-muted rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Icon name={comm.type === 'email' ? 'Mail' : comm.type === 'phone' ? 'Phone' : 'MessageSquare'} size={16} />
                        <h4 className="font-medium text-foreground">{comm.subject || (currentLanguage === 'es' ? 'Sin asunto' : 'No subject')}</h4>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(comm.date)}</span>
                    </div>
                    {comm.from && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {currentLanguage === 'es' ? 'De' : 'From'}: {comm.from}
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
            {currentLanguage === 'es' ? 'Cerrar' : 'Close'}
          </Button>
          <Button variant="default">
            {currentLanguage === 'es' ? 'Actualizar Estado' : 'Update Status'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;

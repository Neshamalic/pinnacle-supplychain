import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../components/AppIcon';

const ImportTimeline = ({ importData }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const labels = {
    en: {
      timeline: 'Import Timeline',
      departure: 'Departure from origin',
      inTransit: 'In Transit',
      arrival: 'Arrival at Port',
      customsClearance: 'Customs Clearance',
      qualityControl: 'Quality Control',
      warehouseEntry: 'Warehouse Entry',
      inventoryIntegration: 'Inventory Integration',
      completed: 'Completed',
      inProgress: 'In Progress',
      pending: 'Pending',
      estimated: 'Estimated',
      currentLocation: 'Current location'
    },
    es: {
      timeline: 'Cronología de Importación',
      departure: 'Salida de origen',
      inTransit: 'En Tránsito',
      arrival: 'Llegada al Puerto',
      customsClearance: 'Despacho Aduanero',
      qualityControl: 'Control de Calidad',
      warehouseEntry: 'Entrada a Almacén',
      inventoryIntegration: 'Integración de Inventario',
      completed: 'Completado',
      inProgress: 'En Proceso',
      pending: 'Pendiente',
      estimated: 'Estimado',
      currentLocation: 'Ubicación actual'
    }
  };

  const t = labels[currentLanguage];

  // Helpers
  const fmtDate = (dateString, showEstimated = true) => {
    if (!dateString) return showEstimated ? t.estimated : '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return showEstimated ? t.estimated : '—';
    return d.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'pending': default: return 'text-gray-600 bg-gray-100';
    }
  };

  const connectorColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'in-progress': return 'bg-blue-600';
      default: return 'bg-gray-300';
    }
  };

  const labelForStatus = (status) => {
    if (status === 'completed') return t.completed;
    if (status === 'in-progress') return t.inProgress;
    return t.pending;
  };

  const steps = useMemo(() => {
    // Derivar estados lógicos a partir de fechas/estatus
    const hasDeparture = !!importData?.departureDate;
    const hasArrival = !!importData?.arrivalDate;

    // In transit: si hay salida pero aún no llega → in-progress; si ya llegó → completed; si no hay salida → pending
    const inTransitStatus = hasDeparture ? (hasArrival ? 'completed' : 'in-progress') : 'pending';

    // Customs mapeado a completed / in-progress / pending
    const customsRaw = String(importData?.customsStatus || '').toLowerCase();
    const customsStatus =
      customsRaw === 'cleared' ? 'completed'
      : customsRaw === 'in-clearance' ? 'in-progress'
      : 'pending';

    // QC mapeado a completed / in-progress / pending
    const qcRaw = String(importData?.qcStatus || '').toLowerCase();
    const qcStatus =
      qcRaw === 'approved' || qcRaw === 'completed' ? 'completed'
      : qcRaw === 'in-progress' ? 'in-progress'
      : 'pending';

    // Warehouse / Inventory se consideran completed si tienen fecha, si no → pending (puedes ajustarlo si manejas un estado textual)
    const warehouseStatus = importData?.warehouseEntryDate ? 'completed' : 'pending';
    const inventoryStatus = importData?.inventoryIntegrationDate ? 'completed' : 'pending';

    return [
      {
        id: 'departure',
        title: t.departure,
        icon: importData?.transportType === 'sea' ? 'Ship' : 'Plane',
        status: hasDeparture ? 'completed' : 'pending',
        date: importData?.departureDate,
        description:
          (importData?.originPort
            ? `${importData.originPort}`
            : currentLanguage === 'es' ? 'Origen' : 'Origin')
      },
      {
        id: 'in-transit',
        title: t.inTransit,
        icon: importData?.transportType === 'sea' ? 'Ship' : 'Plane',
        status: inTransitStatus,
        date: importData?.transitDate, // si no la tienes en Sheet, mostrará “Estimado”
        description:
          (importData?.transportType === 'sea'
            ? (currentLanguage === 'es' ? 'Tránsito marítimo' : 'Sea freight')
            : (currentLanguage === 'es' ? 'Tránsito aéreo' : 'Air freight'))
      },
      {
        id: 'arrival',
        title: t.arrival,
        icon: 'MapPin',
        status: hasArrival ? 'completed' : 'pending',
        date: importData?.arrivalDate,
        description:
          (importData?.destinationPort
            ? `${importData.destinationPort}`
            : currentLanguage === 'es' ? 'Puerto destino' : 'Destination port')
      },
      {
        id: 'customs',
        title: t.customsClearance,
        icon: 'FileCheck',
        status: customsStatus,
        date: importData?.customsClearanceDate,
        description:
          `${currentLanguage === 'es' ? 'Estado aduanas' : 'Customs status'}: ${importData?.customsStatus || '—'}`
      },
      {
        id: 'qc',
        title: t.qualityControl,
        icon: 'Shield',
        status: qcStatus,
        date: importData?.qcCompletionDate,
        description:
          `${currentLanguage === 'es' ? 'Estado QC' : 'QC status'}: ${importData?.qcStatus || '—'}`
      },
      {
        id: 'warehouse',
        title: t.warehouseEntry,
        icon: 'Building2', // más estándar que "Warehouse"
        status: warehouseStatus,
        date: importData?.warehouseEntryDate,
        description:
          currentLanguage === 'es' ? 'Entrada a centro de distribución' : 'Entry to distribution warehouse'
      },
      {
        id: 'integration',
        title: t.inventoryIntegration,
        icon: 'Database',
        status: inventoryStatus,
        date: importData?.inventoryIntegrationDate,
        description:
          currentLanguage === 'es' ? 'Integración con inventario' : 'Integration with inventory system'
      }
    ];
  }, [importData, currentLanguage]);

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPct = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center">
        <Icon name="Clock" size={20} className="mr-2" />
        {t.timeline}
      </h3>

      {/* Ubicación actual, si existe */}
      {importData?.currentLocation && (
        <div className="mb-4 text-sm text-muted-foreground flex items-center">
          <Icon name="MapPin" size={16} className="mr-2" />
          <span><strong>{t.currentLocation}:</strong> {importData.currentLocation}</span>
        </div>
      )}

      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex items-start mb-8 last:mb-0">
            {/* Conector vertical */}
            {index < steps.length - 1 && (
              <div className={`absolute left-6 top-12 w-0.5 h-16 ${connectorColor(step.status)}`} />
            )}

            {/* Icono del paso */}
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${statusColor(step.status)} mr-4 z-10`}>
              <Icon name={step.icon} size={20} />
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-foreground">{step.title}</h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(step.status)}`}>
                  {labelForStatus(step.status)}
                </span>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                {step.description}
              </p>

              <div className="flex items-center text-xs text-secondary">
                <Icon name="Calendar" size={14} className="mr-1" />
                <span>{fmtDate(step.date)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de progreso */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentLanguage === 'es' ? 'Progreso General' : 'Overall Progress'}
          </span>
          <span className="font-medium text-foreground">{progressPct}%</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImportTimeline;

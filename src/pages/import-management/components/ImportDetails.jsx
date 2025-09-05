import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ImportDetails = ({ importData, onClose }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  if (!importData) return null;

  // Helpers
  const t = (es, en) => (currentLanguage === 'es' ? es : en);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount, currency = 'CLP') => {
    const val = amount ?? 0;
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(val);
  };

  const statusChip = (label, tone) => {
    const tones = {
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800',
      purple: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tones[tone] || tones.gray}`}>
        {label}
      </span>
    );
  };

  // Derivar chips de estado desde importData (mapImports ya normaliza nombres)
  const customsLabel = (() => {
    const s = (importData.customsStatus || '').toLowerCase();
    if (s === 'cleared') return statusChip(t('Despachado', 'Cleared'), 'green');
    if (s === 'in-clearance') return statusChip(t('En despacho', 'In clearance'), 'orange');
    if (s === 'pending') return statusChip(t('Pendiente', 'Pending'), 'yellow');
    return statusChip(importData.customsStatus || '—', 'gray');
  })();

  const qcLabel = (() => {
    const s = (importData.qcStatus || '').toLowerCase();
    if (s === 'approved' || s === 'completed') return statusChip(t('QC Aprobado', 'QC Approved'), 'green');
    if (s === 'in-progress') return statusChip(t('QC en Progreso', 'QC in Progress'), 'purple');
    if (s === 'pending') return statusChip(t('QC Pendiente', 'QC Pending'), 'yellow');
    return statusChip(importData.qcStatus || '—', 'gray');
  })();

  const transportLabel = (() => {
    const s = (importData.transportType || '').toLowerCase();
    if (s === 'air') return statusChip(t('Aéreo', 'Air'), 'blue');
    if (s === 'sea') return statusChip(t('Marítimo', 'Sea'), 'blue');
    return statusChip(importData.transportType || t('Transporte', 'Transport'), 'blue');
  })();

  // Timeline derivado de campos disponibles
  const timeline = useMemo(() => {
    const items = [];

    if (importData.departureDate) {
      items.push({
        id: 'departed',
        date: importData.departureDate,
        event: t('Salida de origen', 'Departed origin'),
        status: 'completed',
      });
    }

    if (importData.arrivalDate) {
      // Si hoy < ETA → pendiente, si hoy >= ETA → completado (estimación simple)
      const eta = new Date(importData.arrivalDate);
      const today = new Date();
      items.push({
        id: 'eta',
        date: importData.arrivalDate,
        event: 'ETA',
        status: eta > today ? 'pending' : 'completed',
      });
    }

    if (importData.customsStatus) {
      const cs = (importData.customsStatus || '').toLowerCase();
      items.push({
        id: 'customs',
        date: importData.customsClearanceDate || importData.arrivalDate || null,
        event: t('Despacho Aduanero', 'Customs clearance'),
        status: cs === 'cleared' ? 'completed' : cs === 'in-clearance' ? 'in_progress' : 'pending',
    });
    }

    if (importData.qcStatus) {
      const qs = (importData.qcStatus || '').toLowerCase();
      items.push({
        id: 'qc',
        date: importData.qcCompletionDate || null,
        event: t('Control de Calidad', 'Quality control'),
        status: qs === 'approved' || qs === 'completed' ? 'completed' : qs === 'in-progress' ? 'in_progress' : 'pending',
      });
    }

    // Limpieza y orden
    const withDates = items.filter(i => i.date);
    withDates.sort((a, b) => new Date(a.date) - new Date(b.date));
    return withDates.length ? withDates : items;
  }, [
    importData.departureDate,
    importData.arrivalDate,
    importData.customsStatus,
    importData.customsClearanceDate,
    importData.qcStatus,
    importData.qcCompletionDate,
    currentLanguage,
  ]);

  const tabs = [
    { id: 'overview',   label: t('Resumen', 'Overview'),    icon: 'FileText' },
    { id: 'products',   label: t('Productos', 'Products'),  icon: 'Package' },
    { id: 'documents',  label: t('Documentos', 'Documents'),icon: 'FileText' },
    { id: 'timeline',   label: t('Cronología', 'Timeline'), icon: 'Clock' },
  ];

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('ID de Importación', 'Import ID')}</label>
            <p className="text-lg font-semibold text-foreground">
              {importData.id || '—'}
            </p>
            <p className="text-sm text-muted-foreground">{importData.shipmentId || '—'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('Estado Aduana', 'Customs Status')}</label>
            <div className="mt-1">{customsLabel}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('QC', 'QC')}</label>
            <div className="mt-1">{qcLabel}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('Transporte', 'Transport')}</label>
            <div className="mt-1">{transportLabel}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('Valor Total', 'Total Value')}</label>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(importData.totalCost, 'CLP')}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">ETA</label>
            <p className="text-foreground">{formatDate(importData.arrivalDate)}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">{t('Origen → Destino', 'Origin → Destination')}</label>
            <p className="text-foreground">
              {(importData.originPort || '—') + ' → ' + (importData.destinationPort || '—')}
            </p>
            {importData.currentLocation && (
              <p className="text-sm text-muted-foreground mt-1">
                {t('Ubicación actual:', 'Current location:')} {importData.currentLocation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProductsTab = () => (
    <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
      {t(
        'No hay productos detallados para esta importación.',
        'No product breakdown available for this import.'
      )}
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
      {t(
        'Sin documentos registrados. Si agregas columnas como invoice_url / bol_url en tu Sheet, los mostramos aquí.',
        'No documents available. If you add columns like invoice_url / bol_url in your Sheet, we can display them here.'
      )}
    </div>
  );

  const renderTimelineTab = () => (
    <div className="space-y-4">
      {timeline.length === 0 ? (
        <div className="bg-muted rounded-lg p-6 text-sm text-muted-foreground text-center">
          {t('Sin eventos registrados.', 'No events recorded.')}
        </div>
      ) : (
        timeline.map((item, index) => (
          <div key={item.id} className="flex items-start space-x-4">
            <div
              className={`w-3 h-3 rounded-full mt-2 ${
                item.status === 'completed'
                  ? 'bg-green-500'
                  : item.status === 'in_progress'
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
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':  return renderOverviewTab();
      case 'products':  return renderProductsTab();
      case 'documents': return renderDocumentsTab();
      case 'timeline':  return renderTimelineTab();
      default:          return renderOverviewTab();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-background/80 backdrop-blur-sm" onClick={onClose} />
        
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-card shadow-xl rounded-lg border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{importData.shipmentId || t('Importación', 'Import')}</h2>
              <p className="text-muted-foreground">{importData.id || '—'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 max-h-96 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDetails;

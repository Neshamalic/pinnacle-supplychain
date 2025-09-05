import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TenderDetailModal = ({ tender, isOpen, onClose, onEdit }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  if (!isOpen || !tender) return null;

  const tabs = [
    { id: 'overview',        label: currentLanguage === 'es' ? 'Resumen' : 'Overview',          icon: 'FileText' },
    { id: 'products',        label: currentLanguage === 'es' ? 'Productos' : 'Products',        icon: 'Package' },
    { id: 'delivery',        label: currentLanguage === 'es' ? 'Entrega' : 'Delivery',          icon: 'Truck' },
    { id: 'communications',  label: currentLanguage === 'es' ? 'Comunicaciones' : 'Communications', icon: 'MessageSquare' },
    { id: 'recommendations', label: currentLanguage === 'es' ? 'Recomendaciones' : 'Recommendations', icon: 'Lightbulb' }
  ];

  // Normaliza estados a un conjunto interno estable
  const normalizeStatus = (s) => {
    const raw = String(s ?? '').trim().toLowerCase();
    const clean = raw.replace(/\s+/g, '_').replace(/-+/g, '_');
    const dict = {
      borrador: 'draft',
      enviado: 'submitted',
      adjudicado: 'awarded',
      rechazado: 'rejected',
      en_entrega: 'in_delivery',
      'in_delivery': 'in_delivery',
      'in-delivery': 'in_delivery',
      'in delivery': 'in_delivery',
      completado: 'completed'
    };
    return dict[clean] || clean || 'draft';
  };

  const getStatusBadge = (status) => {
    const s = normalizeStatus(status);
    const statusConfig = {
      draft:       { color: 'bg-gray-100 text-gray-800',      label: currentLanguage === 'es' ? 'Borrador' : 'Draft' },
      submitted:   { color: 'bg-blue-100 text-blue-800',      label: currentLanguage === 'es' ? 'Enviado' : 'Submitted' },
      awarded:     { color: 'bg-green-100 text-green-800',    label: currentLanguage === 'es' ? 'Adjudicado' : 'Awarded' },
      rejected:    { color: 'bg-red-100 text-red-800',        label: currentLanguage === 'es' ? 'Rechazado' : 'Rejected' },
      in_delivery: { color: 'bg-yellow-100 text-yellow-800',  label: currentLanguage === 'es' ? 'En Entrega' : 'In Delivery' },
      completed:   { color: 'bg-emerald-100 text-emerald-800',label: currentLanguage === 'es' ? 'Completado' : 'Completed' }
    };
    const config = statusConfig[s] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatCurrency = (amount, currency = 'CLP') => {
    const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency', currency, minimumFractionDigits: 0
    }).format(safe);
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {currentLanguage === 'es' ? 'ID Licitación' : 'Tender ID'}
            </label>
            <p className="text-lg font-semibold text-foreground">{tender?.tenderId || '—'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {currentLanguage === 'es' ? 'Estado' : 'Status'}
            </label>
            <div className="mt-1">{getStatusBadge(tender?.status)}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {currentLanguage === 'es' ? 'Fecha de Creación' : 'Created Date'}
            </label>
            <p className="text-foreground">{formatDate(tender?.createdDate)}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {currentLanguage === 'es' ? 'Valor Total' : 'Total Value'}
            </label>
            <p className="text-lg font-semibold text-foreground">{formatCurrency(tender?.totalValue)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {currentLanguage === 'es' ? 'Cobertura de Stock' : 'Stock Coverage'}
            </label>
            <p className="text-foreground">
              {Number(tender?.stockCoverage ?? 0)} {currentLanguage === 'es' ? 'días' : 'days'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {currentLanguage === 'es' ? 'Fecha de Entrega' : 'Delivery Date'}
            </label>
            <p className="text-foreground">{formatDate(tender?.deliveryDate)}</p>
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {currentLanguage === 'es' ? 'Descripción' : 'Description'}
        </label>
        <p className="text-foreground mt-1">{tender?.description || '—'}</p>
      </div>
    </div>
  );

  const renderProductsTab = () => {
    const products = Array.isArray(tender?.products) ? tender.products : [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-foreground">
            {currentLanguage === 'es' ? 'Productos en la Licitación' : 'Products in Tender'}
          </h4>
          <span className="text-sm text-muted-foreground">
            {products.length} {currentLanguage === 'es' ? 'productos' : 'products'}
          </span>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <div className="space-y-3">
            {products.map((product, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-foreground">{product?.name || '—'}</h5>
                    <p className="text-sm text-muted-foreground">{product?.code || '—'}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        {currentLanguage === 'es' ? 'Cantidad:' : 'Quantity:'} {Number(product?.quantity ?? 0)}
                      </span>
                      <span className="text-muted-foreground">
                        {currentLanguage === 'es' ? 'Unidades por empaque:' : 'Units per package:'}{' '}
                        {Number(product?.packagingUnits ?? 0)} {currentLanguage === 'es' ? 'unidades' : 'units'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{formatCurrency(product?.unitPrice)}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentLanguage === 'es' ? 'por unidad' : 'per unit'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDeliveryTab = () => {
    const schedule = Array.isArray(tender?.deliverySchedule) ? tender.deliverySchedule : [];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">
              {currentLanguage === 'es' ? 'Cronograma de Entrega' : 'Delivery Schedule'}
            </h4>
            {schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <div className="space-y-3">
                {schedule.map((sc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{sc?.phase || '—'}</p>
                      <p className="text-sm text-muted-foreground">
                        {Number(sc?.quantity ?? 0)} {currentLanguage === 'es' ? 'unidades' : 'units'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground">{formatDate(sc?.date)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          sc?.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : sc?.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {sc?.status || '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">
              {currentLanguage === 'es' ? 'Información de Envío' : 'Shipping Information'}
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {currentLanguage === 'es' ? 'Dirección de Entrega' : 'Delivery Address'}
                </p>
                <p className="text-foreground">{tender?.deliveryAddress || '—'}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {currentLanguage === 'es' ? 'Método de Transporte' : 'Transport Method'}
                </p>
                <p className="text-foreground">{tender?.transportMethod || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommunicationsTab = () => {
    const comms = Array.isArray(tender?.communications) ? tender.communications : [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-foreground">
            {currentLanguage === 'es' ? 'Historial de Comunicaciones' : 'Communication History'}
          </h4>
          <Button variant="outline" size="sm" iconName="Plus" iconPosition="left">
            {currentLanguage === 'es' ? 'Agregar' : 'Add'}
          </Button>
        </div>

        {comms.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <div className="space-y-3">
            {comms.map((comm, index) => (
              <div key={index} className="border border-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <Icon name="MessageSquare" size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{comm?.subject || '—'}</p>
                      <p className="text-sm text-muted-foreground">{comm?.content || '—'}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>{comm?.type || '—'}</span>
                        <span>{formatDate(comm?.date)}</span>
                        <span>{comm?.sender || '—'}</span>
                      </div>
                    </div>
                  </div>
                  {comm?.hasAttachment ? <Icon name="Paperclip" size={16} className="text-muted-foreground" /> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRecommendationsTab = () => {
    const recs = Array.isArray(tender?.recommendations) ? tender.recommendations : [];
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">
          {currentLanguage === 'es' ? 'Recomendaciones del Sistema' : 'System Recommendations'}
        </h4>

        {recs.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <div className="space-y-3">
            {recs.map((rec, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  rec?.priority === 'high'
                    ? 'border-red-200 bg-red-50'
                    : rec?.priority === 'medium'
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon
                    name={rec?.priority === 'high' ? 'AlertTriangle' : rec?.priority === 'medium' ? 'AlertCircle' : 'Info'}
                    size={20}
                    className={
                      rec?.priority === 'high' ? 'text-red-600' : rec?.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{rec?.title || '—'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{rec?.description || '—'}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          rec?.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : rec?.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {(rec?.priority || 'low') + ' ' + (currentLanguage === 'es' ? 'prioridad' : 'priority')}
                      </span>
                      <Button variant="outline" size="sm">
                        {currentLanguage === 'es' ? 'Aplicar' : 'Apply'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':        return renderOverviewTab();
      case 'products':        return renderProductsTab();
      case 'delivery':        return renderDeliveryTab();
      case 'communications':  return renderCommunicationsTab();
      case 'recommendations': return renderRecommendationsTab();
      default:                return renderOverviewTab();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-card shadow-xl rounded-lg border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">{tender?.title || '—'}</h2>
              <p className="text-muted-foreground">{tender?.tenderId || '—'}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => onEdit?.(tender?.id)} iconName="Edit" iconPosition="left">
                {currentLanguage === 'es' ? 'Editar' : 'Edit'}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <Icon name="X" size={20} />
              </Button>
            </div>
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
          <div className="p-6 max-h-96 overflow-y-auto">{renderTabContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default TenderDetailModal;

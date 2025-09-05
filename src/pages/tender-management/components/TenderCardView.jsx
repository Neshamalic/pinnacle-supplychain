import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const TenderCardView = ({
  tenders,
  selectedTenders,
  onTenderSelect,
  onTenderView,
  onTenderEdit
}) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // Normaliza estados: minúsculas, reemplaza espacios y guiones, traduce variantes españolas
  const normalizeStatus = (s) => {
    const raw = String(s || '').trim().toLowerCase();
    const clean = raw.replace(/\s+/g, '_').replace(/-+/g, '_');
    const dict = {
      // español -> inglés interno
      'borrador': 'draft',
      'enviado': 'submitted',
      'adjudicado': 'awarded',
      'rechazado': 'rejected',
      'en_entrega': 'in_delivery',
      'completado': 'completed',
      // variantes en inglés
      'in': 'in_delivery',            // por si alguien deja "in delivery" cortado
      'in_delivery': 'in_delivery',
      'in-delivery': 'in_delivery',
      'in delivery': 'in_delivery'
    };
    return dict[clean] || clean;
  };

  const getStatusBadge = (status) => {
    const s = normalizeStatus(status);
    const statusConfig = {
      draft: {
        color: 'bg-gray-100 text-gray-800',
        label: currentLanguage === 'es' ? 'Borrador' : 'Draft',
        icon: 'FileText'
      },
      submitted: {
        color: 'bg-blue-100 text-blue-800',
        label: currentLanguage === 'es' ? 'Enviado' : 'Submitted',
        icon: 'Send'
      },
      awarded: {
        color: 'bg-green-100 text-green-800',
        label: currentLanguage === 'es' ? 'Adjudicado' : 'Awarded',
        icon: 'Award'
      },
      rejected: {
        color: 'bg-red-100 text-red-800',
        label: currentLanguage === 'es' ? 'Rechazado' : 'Rejected',
        icon: 'X'
      },
      in_delivery: {
        color: 'bg-yellow-100 text-yellow-800',
        label: currentLanguage === 'es' ? 'En Entrega' : 'In Delivery',
        icon: 'Truck'
      },
      completed: {
        color: 'bg-emerald-100 text-emerald-800',
        label: currentLanguage === 'es' ? 'Completado' : 'Completed',
        icon: 'CheckCircle'
      }
    };
    const config = statusConfig[s] || statusConfig.draft;
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon name={config.icon} size={12} className="mr-1" />
        {config.label}
      </div>
    );
  };

  const getStockCoverageColor = (days) => {
    const n = Number(days ?? 0);
    if (n < 15) return 'text-red-600';
    if (n < 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount, currency = 'CLP') => {
    const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(safe);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tenders?.map((tender) => (
        <div
          key={tender?.id ?? tender?.tenderId}
          className={`bg-card border rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${
            selectedTenders?.includes(tender?.id) ? 'border-primary ring-2 ring-primary/20' : 'border-border'
          }`}
          onClick={() => onTenderView(tender?.id)}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Checkbox
                  checked={selectedTenders?.includes(tender?.id)}
                  onChange={() => onTenderSelect(tender?.id)}
                  onClick={(e) => e?.stopPropagation()}
                />
                <h3 className="text-sm font-medium text-primary">
                  {tender?.tenderId || '—'}
                </h3>
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                {tender?.title || '—'}
              </h4>
              {getStatusBadge(tender?.status)}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {currentLanguage === 'es' ? 'Productos' : 'Products'}
              </div>
              <div className="flex items-center text-sm font-medium text-foreground">
                <Icon name="Package" size={14} className="mr-1" />
                {Number(tender?.productsCount ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {currentLanguage === 'es' ? 'Valor Total' : 'Total Value'}
              </div>
              <div className="text-sm font-medium text-foreground">
                {formatCurrency(tender?.totalValue)}
              </div>
            </div>
          </div>

          {/* Delivery & Stock Info */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentLanguage === 'es' ? 'Fecha Entrega' : 'Delivery Date'}
              </span>
              <div className="flex items-center text-sm text-foreground">
                <Icon name="Calendar" size={14} className="mr-1" />
                {formatDate(tender?.deliveryDate)}
                {tender?.isOverdue ? (
                  <Icon name="AlertTriangle" size={14} className="ml-1 text-red-600" />
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentLanguage === 'es' ? 'Cobertura Stock' : 'Stock Coverage'}
              </span>
              <div className={`flex items-center text-sm font-medium ${getStockCoverageColor(tender?.stockCoverage)}`}>
                <Icon
                  name={
                    Number(tender?.stockCoverage ?? 0) < 15
                      ? 'AlertTriangle'
                      : Number(tender?.stockCoverage ?? 0) < 30
                      ? 'AlertCircle'
                      : 'CheckCircle'
                  }
                  size={14}
                  className="mr-1"
                />
                {Number(tender?.stockCoverage ?? 0)} {currentLanguage === 'es' ? 'días' : 'days'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{currentLanguage === 'es' ? 'Progreso' : 'Progress'}</span>
              <span>{Number(tender?.completionPercentage ?? 0)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, Number(tender?.completionPercentage ?? 0)))}%` }}
              />
            </div>
          </div>

          {/* Tags */}
          {Array.isArray(tender?.tags) && tender.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {tender.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={`${tender?.id}-${index}`}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {tender.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-muted text-muted-foreground">
                  +{tender.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {currentLanguage === 'es' ? 'Creado' : 'Created'}: {formatDate(tender?.createdDate)}
            </div>
            <div className="flex items-center space-x-1" onClick={(e) => e?.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onTenderView(tender?.id)}
                className="h-8 w-8"
              >
                <Icon name="Eye" size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onTenderEdit(tender?.id)}
                className="h-8 w-8"
              >
                <Icon name="Edit" size={14} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Icon name="MoreHorizontal" size={14} />
              </Button>
            </div>
          </div>
        </div>
      ))}
      {(!tenders || tenders.length === 0) && (
        <div className="col-span-full text-center py-12">
          <Icon name="FileText" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {currentLanguage === 'es' ? 'No se encontraron licitaciones' : 'No tenders found'}
          </h3>
          <p className="text-muted-foreground">
            {currentLanguage === 'es'
              ? 'Intenta ajustar los filtros o crear una nueva licitación.'
              : 'Try adjusting your filters or create a new tender.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TenderCardView;

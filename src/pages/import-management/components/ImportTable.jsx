import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const ImportTable = ({ imports = [], onImportSelect, selectedImport }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [sortConfig, setSortConfig] = useState({ key: 'arrivalDate', direction: 'desc' });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const labels = {
    en: {
      shipmentId: 'Shipment ID',
      arrivalDate: 'Arrival Date',
      transportType: 'Transport',
      qcStatus: 'QC Status',
      customsStatus: 'Customs',
      totalCost: 'Total Cost',
      location: 'Location',
      actions: 'Actions',
      viewDetails: 'View Details',
      noImports: 'No imports found',
      noImportsDesc: 'Try adjusting your filters to see more results.'
    },
    es: {
      shipmentId: 'ID Envío',
      arrivalDate: 'Fecha Llegada',
      transportType: 'Transporte',
      qcStatus: 'Estado QC',
      customsStatus: 'Aduanas',
      totalCost: 'Costo Total',
      location: 'Ubicación',
      actions: 'Acciones',
      viewDetails: 'Ver Detalles',
      noImports: 'No se encontraron importaciones',
      noImportsDesc: 'Intenta ajustar tus filtros para ver más resultados.'
    }
  };
  const t = labels[currentLanguage];

  const getStatusBadge = (status, type) => {
    const s = String(status || '').toLowerCase();
    const statusConfig = {
      qc: {
        pending: { color: 'bg-yellow-100 text-yellow-800', label: currentLanguage === 'es' ? 'Pendiente' : 'Pending' },
        'in-progress': { color: 'bg-blue-100 text-blue-800', label: currentLanguage === 'es' ? 'En Proceso' : 'In Progress' },
        approved: { color: 'bg-green-100 text-green-800', label: currentLanguage === 'es' ? 'Aprobado' : 'Approved' },
        rejected: { color: 'bg-red-100 text-red-800', label: currentLanguage === 'es' ? 'Rechazado' : 'Rejected' }
      },
      customs: {
        pending: { color: 'bg-yellow-100 text-yellow-800', label: currentLanguage === 'es' ? 'Pendiente' : 'Pending' },
        'in-clearance': { color: 'bg-blue-100 text-blue-800', label: currentLanguage === 'es' ? 'En Despacho' : 'In Clearance' },
        cleared: { color: 'bg-green-100 text-green-800', label: currentLanguage === 'es' ? 'Despachado' : 'Cleared' },
        held: { color: 'bg-red-100 text-red-800', label: currentLanguage === 'es' ? 'Retenido' : 'Held' }
      }
    };
    const config = statusConfig?.[type]?.[s] || { color: 'bg-gray-100 text-gray-800', label: status || '—' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTransportIcon = (type) => (type === 'sea' ? 'Ship' : 'Plane');

  const formatCurrency = (amount, currency = 'CLP') =>
    new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount ?? 0);

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

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig?.key !== columnKey) return 'ArrowUpDown';
    return sortConfig?.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
    };

  // 🚀 Ordenamiento seguro y performante
  const sortedImports = useMemo(() => {
    const arr = Array.isArray(imports) ? [...imports] : [];
    const { key, direction } = sortConfig || {};
    const dir = direction === 'asc' ? 1 : -1;

    return arr.sort((a, b) => {
      if (key === 'arrivalDate') {
        const ta = a?.arrivalDate ? new Date(a.arrivalDate).getTime() : Number.NEGATIVE_INFINITY;
        const tb = b?.arrivalDate ? new Date(b.arrivalDate).getTime() : Number.NEGATIVE_INFINITY;
        return (ta - tb) * dir;
      }
      if (key === 'totalCost') {
        const va = Number(a?.totalCost ?? -Infinity);
        const vb = Number(b?.totalCost ?? -Infinity);
        return (va - vb) * dir;
      }
      const av = (a?.[key] ?? '').toString().toLowerCase();
      const bv = (b?.[key] ?? '').toString().toLowerCase();
      return av.localeCompare(bv) * dir;
    });
  }, [imports, sortConfig]);

  if (!imports || imports.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center shadow-soft">
        <Icon name="Package" size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">{t.noImports}</h3>
        <p className="text-muted-foreground">{t.noImportsDesc}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button onClick={() => handleSort('shipmentId')} className="flex items-center space-x-1 hover:text-foreground transition-colors">
                  <span>{t.shipmentId}</span>
                  <Icon name={getSortIcon('shipmentId')} size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button onClick={() => handleSort('arrivalDate')} className="flex items-center space-x-1 hover:text-foreground transition-colors">
                  <span>{t.arrivalDate}</span>
                  <Icon name={getSortIcon('arrivalDate')} size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.transportType}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.qcStatus}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.customsStatus}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button onClick={() => handleSort('totalCost')} className="flex items-center space-x-1 hover:text-foreground transition-colors">
                  <span>{t.totalCost}</span>
                  <Icon name={getSortIcon('totalCost')} size={14} />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.location}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.actions}</th>
            </tr>
          </thead>

          <tbody className="bg-card divide-y divide-border">
            {sortedImports.map((importItem) => (
              <tr
                key={importItem?.id ?? importItem?.shipmentId}
                className={`hover:bg-muted/50 transition-colors cursor-pointer ${
                  selectedImport?.id === importItem?.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                }`}
                onClick={() => onImportSelect(importItem)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">{importItem?.shipmentId || '—'}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{formatDate(importItem?.arrivalDate)}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Icon name={getTransportIcon(importItem?.transportType)} size={16} className="mr-2 text-muted-foreground" />
                    <span className="text-sm text-foreground capitalize">
                      {currentLanguage === 'es'
                        ? importItem?.transportType === 'sea'
                          ? 'Marítimo'
                          : 'Aéreo'
                        : importItem?.transportType || '—'}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(importItem?.qcStatus, 'qc')}</td>

                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(importItem?.customsStatus, 'customs')}</td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground">{formatCurrency(importItem?.totalCost)}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">{importItem?.currentLocation || '—'}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e?.stopPropagation();
                      onImportSelect(importItem);
                    }}
                    iconName="Eye"
                    iconPosition="left"
                  >
                    {t.viewDetails}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImportTable;

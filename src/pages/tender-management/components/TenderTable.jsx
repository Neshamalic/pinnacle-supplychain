import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';

const TenderTable = ({
  tenders,
  selectedTenders,
  onTenderSelect,
  onTenderSelectAll,
  onTenderView,
  onTenderEdit,
  sortConfig,
  onSort
}) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStockCoverageBadge = (daysRaw) => {
    const days = Number(daysRaw ?? 0);
    if (days < 15) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
          <Icon name="AlertTriangle" size={12} className="mr-1" />
          {days} {currentLanguage === 'es' ? 'días' : 'days'}
        </span>
      );
    } else if (days < 30) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <Icon name="AlertCircle" size={12} className="mr-1" />
          {days} {currentLanguage === 'es' ? 'días' : 'days'}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
          <Icon name="CheckCircle" size={12} className="mr-1" />
          {days} {currentLanguage === 'es' ? 'días' : 'days'}
        </span>
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
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

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) {
      return <Icon name="ArrowUpDown" size={14} className="opacity-50" />;
    }
    return sortConfig?.direction === 'asc'
      ? <Icon name="ArrowUp" size={14} />
      : <Icon name="ArrowDown" size={14} />;
  };

  const columns = [
    { key: 'tenderId',      label: currentLanguage === 'es' ? 'ID Licitación'   : 'Tender ID',     sortable: true },
    { key: 'title',         label: currentLanguage === 'es' ? 'Título'          : 'Title',         sortable: true },
    { key: 'productsCount', label: currentLanguage === 'es' ? 'Productos'       : 'Products',      sortable: true },
    { key: 'status',        label: currentLanguage === 'es' ? 'Estado'          : 'Status',        sortable: true },
    { key: 'deliveryDate',  label: currentLanguage === 'es' ? 'Fecha Entrega'   : 'Delivery Date', sortable: true },
    { key: 'stockCoverage', label: currentLanguage === 'es' ? 'Cobertura Stock' : 'Stock Coverage',sortable: true },
    { key: 'totalValue',    label: currentLanguage === 'es' ? 'Valor Total'     : 'Total Value',   sortable: true },
    { key: 'actions',       label: currentLanguage === 'es' ? 'Acciones'        : 'Actions',       sortable: false }
  ];

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  checked={selectedTenders?.length === tenders?.length && tenders?.length > 0}
                  onChange={onTenderSelectAll}
                />
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {column.sortable ? (
                    <button
                      onClick={() => onSort(column.key)}
                      className="flex items-center space-x-1 hover:text-foreground transition-colors"
                    >
                      <span>{column.label}</span>
                      {getSortIcon(column.key)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tenders?.map((tender) => (
              <tr
                key={tender?.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => onTenderView(tender?.id)}
              >
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTenders?.includes(tender?.id)}
                    onChange={() => onTenderSelect(tender?.id)}
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-foreground">
                    {tender?.tenderId || '—'}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-foreground max-w-xs truncate">
                    {tender?.title || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentLanguage === 'es' ? 'Creado' : 'Created'}: {formatDate(tender?.createdDate)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {getStatusBadge(tender?.status)}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-foreground">
                    {formatDate(tender?.deliveryDate)}
                  </div>
                  {tender?.isOverdue && (
                    <div className="flex items-center text-xs text-red-600 mt-1">
                      <Icon name="Clock" size={12} className="mr-1" />
                      {currentLanguage === 'es' ? 'Vencido' : 'Overdue'}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  {getStockCoverageBadge(tender?.stockCoverage)}
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-foreground">
                    {formatCurrency(tender?.totalValue)}
                  </div>
                  {tender?.currency && tender?.currency !== 'CLP' && Number.isFinite(Number(tender?.totalValueUSD)) && (
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(tender?.totalValueUSD, 'USD')}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-2">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Icon name="MoreHorizontal" size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(!tenders || tenders.length === 0) && (
        <div className="text-center py-12">
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

export default TenderTable;

import React, { useState } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderDetailsModal from './OrderDetailsModal';

// Datos reales
import { useSheet } from '@/lib/sheetsApi.js';
import { mapPurchaseOrders } from '@/lib/adapters.js';

const OrdersTable = ({ currentLanguage, filters }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const { rows: orders, loading, error } = useSheet('purchase_orders', mapPurchaseOrders);

  const columns = [
    { key: 'poNumber', labelEn: 'PO Number', labelEs: 'Número PO', sortable: true },
    { key: 'tenderRef', labelEn: 'Tender Ref', labelEs: 'Ref. Licitación', sortable: true },
    { key: 'manufacturingStatus', labelEn: 'Manufacturing', labelEs: 'Fabricación', sortable: true },
    { key: 'qcStatus', labelEn: 'QC Status', labelEs: 'Estado QC', sortable: true },
    { key: 'transportType', labelEn: 'Transport', labelEs: 'Transporte', sortable: true },
    { key: 'eta', labelEn: 'ETA', labelEs: 'ETA', sortable: true },
    { key: 'costUsd', labelEn: 'Cost (USD)', labelEs: 'Costo (USD)', sortable: true },
    { key: 'actions', labelEn: 'Actions', labelEs: 'Acciones', sortable: false }
  ];

  const getColumnLabel = (c) => (currentLanguage === 'es' ? c.labelEs : c.labelEn);

  const formatCurrency = (amount, currency) =>
    new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);

  const formatDate = (date) => {
    if (!date) return '—';
    return new Intl.DateTimeFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Abrir modal evitando cualquier navegación por defecto
  const openDetails = (e, order) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Filtro
  const filteredOrders = (orders ?? []).filter((o) => {
    if (
      filters?.search &&
      !o?.poNumber?.toLowerCase()?.includes(filters.search.toLowerCase()) &&
      !o?.tenderRef?.toLowerCase()?.includes(filters.search.toLowerCase())
    ) return false;
    if (filters?.manufacturingStatus && o?.manufacturingStatus !== filters.manufacturingStatus) return false;
    if (filters?.qcStatus && o?.qcStatus !== filters.qcStatus) return false;
    if (filters?.transportType && o?.transportType !== filters.transportType) return false;
    return true;
  });

  // Orden
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aVal = a?.[sortConfig.key];
    let bVal = b?.[sortConfig.key];
    if (sortConfig.key === 'eta' || sortConfig.key === 'createdDate') {
      aVal = aVal ? new Date(aVal) : 0;
      bVal = bVal ? new Date(bVal) : 0;
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) return <div style={{ padding: 16 }}>Loading orders…</div>;
  if (error)   return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;

  return (
    <>
      <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-6 py-4 text-left">
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200"
                      >
                        <span>{getColumnLabel(col)}</span>
                        {sortConfig.key === col.key && (
                          <Icon name={sortConfig.direction === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={16} />
                        )}
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-foreground">{getColumnLabel(col)}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedOrders.map((o) => (
                <tr key={o?.id ?? o?.poNumber} className="hover:bg-muted/50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{o?.poNumber}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(o?.createdDate)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{o?.tenderRef}</div>
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={o?.manufacturingStatus} type="manufacturing" currentLanguage={currentLanguage} />
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={o?.qcStatus} type="qc" currentLanguage={currentLanguage} />
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge status={o?.transportType} type="transport" currentLanguage={currentLanguage} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatDate(o?.eta)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatCurrency(o?.costUsd, 'USD')}</div>
                    <div className="text-sm text-muted-foreground">{formatCurrency(o?.costClp, 'CLP')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => openDetails(e, o)}
                        iconName="Eye"
                        iconPosition="left"
                      >
                        {currentLanguage === 'es' ? 'Ver' : 'View'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => openDetails(e, o)}
                        iconName="Edit"
                        iconPosition="left"
                      >
                        {currentLanguage === 'es' ? 'Editar' : 'Edit'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedOrders.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Package" size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {currentLanguage === 'es' ? 'No se encontraron órdenes' : 'No orders found'}
            </h3>
            <p className="text-muted-foreground">
              {currentLanguage === 'es'
                ? 'Intenta ajustar los filtros para ver más resultados.'
                : 'Try adjusting the filters to see more results.'}
            </p>
          </div>
        )}
      </div>

      {/* 👉 Ahora el modal SÓLO se monta cuando está abierto y hay orden */}
      {isModalOpen && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          currentLanguage={currentLanguage}
        />
      )}
    </>
  );
};

export default OrdersTable;


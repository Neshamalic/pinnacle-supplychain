import React, { useMemo, useState } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderDetailsModal from './OrderDetailsModal';

// Datos reales desde Google Sheets
import { useSheet } from '@/lib/sheetsApi.js';
import { mapPurchaseOrders } from '@/lib/adapters.js';

const OrdersTable = ({ currentLanguage, filters }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // GET real: purchase_orders
  const {
    rows: ordersRaw = [],
    loading,
    error,
    // si tu hook expone refetch úsalo; si no, refrescamos con reload
    refetch,
  } = useSheet('purchase_orders', mapPurchaseOrders);

  // defensivo: evita crashear si el mapeo falla
  const orders = useMemo(() => Array.isArray(ordersRaw) ? ordersRaw : [], [ordersRaw]);

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

  const getColumnLabel = (column) =>
    currentLanguage === 'es' ? column?.labelEs : column?.labelEn;

  const formatCurrency = (amount, currency) => {
    try {
      return new Intl.NumberFormat(
        currentLanguage === 'es' ? 'es-CL' : 'en-US',
        { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }
      ).format(amount ?? 0);
    } catch {
      return amount ?? 0;
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

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleView = (order) => {
    setSelectedOrder(order || null);
    setIsModalOpen(true);
  };

  const filteredOrders = useMemo(() => {
    return (orders ?? []).filter((order) => {
      if (
        filters?.search &&
        !order?.poNumber?.toLowerCase()?.includes(filters?.search?.toLowerCase()) &&
        !order?.tenderRef?.toLowerCase()?.includes(filters?.search?.toLowerCase())
      ) return false;

      if (filters?.manufacturingStatus && order?.manufacturingStatus !== filters?.manufacturingStatus) return false;
      if (filters?.qcStatus && order?.qcStatus !== filters?.qcStatus) return false;
      if (filters?.transportType && order?.transportType !== filters?.transportType) return false;
      return true;
    });
  }, [orders, filters]);

  const sortedOrders = useMemo(() => {
    const arr = [...filteredOrders];
    if (!sortConfig?.key) return arr;
    const { key, direction } = sortConfig;

    return arr.sort((a, b) => {
      let av = a?.[key];
      let bv = b?.[key];

      if (key === 'eta' || key === 'createdDate') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }

      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortConfig]);

  // 🔄 cuando el modal guarde cambios, refrescamos
  const refreshAfterSave = () => {
    if (typeof refetch === 'function') refetch();
    else window.location.reload();
  };

  if (loading) return <div style={{ padding: 16 }}>Loading orders…</div>;
  if (error)   return <div style={{ padding: 16, color: 'red' }}>Error: {String(error)}</div>;

  return (
    <>
      <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                {columns?.map((column) => (
                  <th key={column?.key} className="px-6 py-4 text-left">
                    {column?.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column?.key)}
                        className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200"
                      >
                        <span>{getColumnLabel(column)}</span>
                        {sortConfig?.key === column?.key && (
                          <Icon
                            name={sortConfig?.direction === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                            size={16}
                          />
                        )}
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {getColumnLabel(column)}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedOrders?.map((order) => (
                <tr key={order?.id ?? order?.poNumber} className="hover:bg-muted/50 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{order?.poNumber}</div>
                    <div className="text-sm text-muted-foreground">{formatDate(order?.createdDate)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{order?.tenderRef}</div>
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge
                      status={order?.manufacturingStatus}
                      type="manufacturing"
                      currentLanguage={currentLanguage}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge
                      status={order?.qcStatus}
                      type="qc"
                      currentLanguage={currentLanguage}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <OrderStatusBadge
                      status={order?.transportType}
                      type="transport"
                      currentLanguage={currentLanguage}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatDate(order?.eta)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatCurrency(order?.costUsd, 'USD')}</div>
                    <div className="text-sm text-muted-foreground">{formatCurrency(order?.costClp, 'CLP')}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(order)}
                        iconName="Eye"
                        iconPosition="left"
                      >
                        {currentLanguage === 'es' ? 'Ver' : 'View'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(order)} // mismo modal permite editar
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

        {sortedOrders?.length === 0 && (
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

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLanguage={currentLanguage}
        onUpdated={refreshAfterSave}
      />
    </>
  );
};

export default OrdersTable;

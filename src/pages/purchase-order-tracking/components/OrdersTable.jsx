import React, { useState, useMemo } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderDetailsModal from './OrderDetailsModal';

// Datos reales desde Google Sheets
import { useSheet } from '@/lib/sheetsApi.js';
import { mapPurchaseOrders } from '@/lib/adapters.js';

const OrdersTable = ({ currentLanguage = 'en', filters = {} }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Carga de órdenes (forzamos array para evitar .map sobre algo no-array)
  const sheetResp = useSheet('purchase_orders', mapPurchaseOrders);
  const orders = Array.isArray(sheetResp?.rows) ? sheetResp.rows : [];
  const loading = !!sheetResp?.loading;
  const error = sheetResp?.error;

  const columns = [
    { key: 'poNumber',             labelEn: 'PO Number',   labelEs: 'Número PO',       sortable: true },
    { key: 'tenderRef',            labelEn: 'Tender Ref',  labelEs: 'Ref. Licitación', sortable: true },
    { key: 'manufacturingStatus',  labelEn: 'Manufacturing', labelEs: 'Fabricación',   sortable: true },
    { key: 'qcStatus',             labelEn: 'QC Status',   labelEs: 'Estado QC',       sortable: true },
    { key: 'transportType',        labelEn: 'Transport',   labelEs: 'Transporte',      sortable: true },
    { key: 'eta',                  labelEn: 'ETA',         labelEs: 'ETA',             sortable: true },
    { key: 'costUsd',              labelEn: 'Cost (USD)',  labelEs: 'Costo (USD)',     sortable: true },
    { key: 'actions',              labelEn: 'Actions',     labelEs: 'Acciones',        sortable: false }
  ];

  const t = (en, es) => (currentLanguage === 'es' ? es : en);
  const getColumnLabel = (c) => (currentLanguage === 'es' ? c.labelEs : c.labelEn);

  const formatCurrency = (amount, currency) => {
    const num = Number.isFinite(+amount) ? +amount : 0;
    try {
      return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num);
    } catch {
      return `${currency} ${num.toLocaleString()}`;
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const openDetails = (order) => {
    if (!order) return;
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Filtrado + orden
  const sortedOrders = useMemo(() => {
    const list = (Array.isArray(orders) ? orders : []).filter((o) => {
      if (!o) return false;

      // search por PO o Tender
      const s = (filters?.search || '').toLowerCase().trim();
      if (s) {
        const po = String(o.poNumber || '').toLowerCase();
        const tr = String(o.tenderRef || '').toLowerCase();
        if (!po.includes(s) && !tr.includes(s)) return false;
      }

      if (filters?.manufacturingStatus && o.manufacturingStatus !== filters.manufacturingStatus) return false;
      if (filters?.qcStatus && o.qcStatus !== filters.qcStatus) return false;
      if (filters?.transportType && o.transportType !== filters.transportType) return false;

      return true;
    });

    if (!sortConfig?.key) return list;

    return [...list].sort((a, b) => {
      let av = a?.[sortConfig.key];
      let bv = b?.[sortConfig.key];

      if (sortConfig.key === 'eta' || sortConfig.key === 'createdDate') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }

      if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
      if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, filters, sortConfig]);

  if (loading) return <div style={{ padding: 16 }}>Loading orders…</div>;
  if (error)   return <div style={{ padding: 16, color: 'red' }}>Error: {String(error)}</div>;

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
                        onClick={() => handleSort(col.key)}
                        className="flex items-center space-x-1 text-sm font-medium text-foreground hover:text-primary transition-colors duration-200"
                      >
                        <span>{getColumnLabel(col)}</span>
                        {sortConfig.key === col.key && (
                          <Icon
                            name={sortConfig.direction === 'asc' ? 'ChevronUp' : 'ChevronDown'}
                            size={16}
                          />
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
              {sortedOrders.map((order, idx) => {
                // key estable sin crypto.randomUUID (mejor para SSR y navegadores antiguos)
                const rowKey =
                  order?.id ??
                  (order?.poNumber ? `po:${order.poNumber}` : `row-${idx}`);

                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-muted/50 transition-colors duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{order?.poNumber || '—'}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(order?.createdDate)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{order?.tenderRef || '—'}</div>
                    </td>

                    <td className="px-6 py-4">
                      <OrderStatusBadge
                        status={order?.manufacturingStatus || ''}
                        type="manufacturing"
                        currentLanguage={currentLanguage}
                      />
                    </td>

                    <td className="px-6 py-4">
                      <OrderStatusBadge
                        status={order?.qcStatus || ''}
                        type="qc"
                        currentLanguage={currentLanguage}
                      />
                    </td>

                    <td className="px-6 py-4">
                      <OrderStatusBadge
                        status={order?.transportType || ''}
                        type="transport"
                        currentLanguage={currentLanguage}
                      />
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{formatDate(order?.eta)}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">
                        {formatCurrency(order?.costUsd, 'USD')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(order?.costClp, 'CLP')}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(order)}
                          iconName="Eye"
                          iconPosition="left"
                        >
                          {t('View', 'Ver')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(order)} // Edit usa el mismo modal
                          iconName="Edit"
                          iconPosition="left"
                        >
                          {t('Edit', 'Editar')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedOrders.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Package" size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('No orders found', 'No se encontraron órdenes')}
            </h3>
            <p className="text-muted-foreground">
              {t(
                'Try adjusting the filters to see more results.',
                'Intenta ajustar los filtros para ver más resultados.'
              )}
            </p>
          </div>
        )}
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentLanguage={currentLanguage}
      />
    </>
  );
};

export default OrdersTable;

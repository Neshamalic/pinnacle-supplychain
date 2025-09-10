// src/pages/purchase-order-tracking/components/OrdersTable.jsx
import React, { useMemo, useState } from 'react';
import Icon from '@/components/AppIcon';
import Button from '@/components/ui/Button';
import OrderStatusBadge from './OrderStatusBadge';
import OrderDetailsModal from './OrderDetailsModal';

// Datos reales desde Google Sheets
import { useSheet } from '@/lib/sheetsApi.js';
import {
  mapPurchaseOrders,
  mapPurchaseOrderItems,
  mapImportItems,
  mapImports,
} from '@/lib/adapters.js';

/**
 * Esta tabla:
 * - Muestra UNA fila por PO (agrupado).
 * - La columna "Products" cuenta los productos únicos por PO.
 * - Calcula para cada producto de esa PO: solicitado (PO Items), en tránsito y recibido (Import Items + Imports.importStatus).
 * - Pasa ese detalle al modal para que "View" muestre los totales por producto.
 */

const OrdersTable = ({ currentLanguage = 'en', filters = {} }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const t = (en, es) => (currentLanguage === 'es' ? es : en);

  // ---------- Cargas de Sheets ----------
  const { rows: orders = [], loading, error } = useSheet('purchase_orders', mapPurchaseOrders);
  const { rows: poItems = [] } = useSheet('purchase_order_items', mapPurchaseOrderItems);
  const { rows: importItems = [] } = useSheet('import_items', mapImportItems);
  const { rows: imports = [] } = useSheet('imports', mapImports);

  // Lookup rápido OCI -> importStatus (transit | warehouse)
  const importStatusByOCI = useMemo(() => {
    const m = new Map();
    (imports || []).forEach(r => {
      if (!r || !r.ociNumber) return;
      // mapImports ya normaliza importStatus .toLowerCase()
      m.set(String(r.ociNumber), r.importStatus || '');
    });
    return m;
  }, [imports]);

  // Estructura por PO con desglose por producto
  const poAggregates = useMemo(() => {
    // 1) Agrupar PO Items: solicitado por (poNumber, presentationCode)
    const requestedByPO = new Map();
    (poItems || []).forEach(it => {
      const po = String(it.poNumber || '').trim();
      const code = String(it.presentationCode || '').trim();
      if (!po || !code) return;
      const key = `${po}__${code}`;
      requestedByPO.set(key, (requestedByPO.get(key) || 0) + (it.qty || 0));
    });

    // 2) Agrupar Import Items por status (según Imports)
    const importedByPO = new Map();
    (importItems || []).forEach(it => {
      const po = String(it.poNumber || '').trim();          // <— REQUIERE poNumber en mapImportItems
      const code = String(it.presentationCode || '').trim();
      const oci = String(it.ociNumber || '').trim();
      if (!po || !code) return;
      const st = (importStatusByOCI.get(oci) || '').toLowerCase(); // 'transit' | 'warehouse' | ''
      const key = `${po}__${code}`;
      const prev = importedByPO.get(key) || { inTransit: 0, arrived: 0, totalUsd: 0 };

      // qty
      const q = it.qty || 0;
      // importe USD si viene precio
      const unit = Number.isFinite(+it.unitPrice) ? +it.unitPrice : 0;
      const lineUsd = unit * q;

      if (st === 'transit') {
        prev.inTransit += q;
      } else if (st === 'warehouse') {
        prev.arrived += q;
      } else {
        // si no hay status, lo contamos como "inTransit" por defecto
        prev.inTransit += q;
      }
      prev.totalUsd += lineUsd;
      importedByPO.set(key, prev);
    });

    // 3) Armar detalle por PO
    const out = new Map(); // poNumber -> { products: Map(code -> {requested, inTransit, arrived}), totals... }
    (orders || []).forEach(ord => {
      const po = String(ord.poNumber || '').trim();
      if (!po) return;
      out.set(po, { po, products: new Map() });
    });

    // requested
    requestedByPO.forEach((qty, key) => {
      const [po, code] = key.split('__');
      if (!out.has(po)) out.set(po, { po, products: new Map() });
      const entry = out.get(po);
      const prod = entry.products.get(code) || { requested: 0, inTransit: 0, arrived: 0 };
      prod.requested += qty;
      entry.products.set(code, prod);
    });

    // imported
    importedByPO.forEach((agg, key) => {
      const [po, code] = key.split('__');
      if (!out.has(po)) out.set(po, { po, products: new Map() });
      const entry = out.get(po);
      const prod = entry.products.get(code) || { requested: 0, inTransit: 0, arrived: 0 };
      prod.inTransit += agg.inTransit;
      prod.arrived += agg.arrived;
      entry.products.set(code, prod);
      // guarda totalUsd por PO (para mostrar si quisieras)
      entry.totalUsd = (entry.totalUsd || 0) + (agg.totalUsd || 0);
    });

    return out; // Map
  }, [orders, poItems, importItems, importStatusByOCI]);

  // ordenar
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // abrir modal con la PO y su detalle pre-armado
  const openDetails = (order) => {
    if (!order) return;
    const po = String(order.poNumber || '').trim();
    const detail = poAggregates.get(po) || { po, products: new Map() };

    // convertir Map -> array para el modal
    const productLines = Array.from(detail.products.entries()).map(([presentationCode, vals]) => ({
      presentationCode,
      requested: vals.requested || 0,
      inTransit: vals.inTransit || 0,
      arrived: vals.arrived || 0,
      remaining: Math.max((vals.requested || 0) - ((vals.inTransit || 0) + (vals.arrived || 0)), 0),
    }));

    setSelectedOrder({
      ...order,
      _poProductLines: productLines,
      _poTotalUsd: detail.totalUsd || 0,
    });
    setIsModalOpen(true);
  };

  // filtrar + ordenar filas de la tabla (por PO)
  const rows = useMemo(() => {
    let base = (orders || []).slice();

    // filtros simples
    const s = (filters.search || '').toLowerCase();
    if (s) {
      base = base.filter(o => {
        const po = (o.poNumber || '').toLowerCase();
        const tr = (o.tenderRef || '').toLowerCase();
        return po.includes(s) || tr.includes(s);
      });
    }
    if (filters.manufacturingStatus) {
      base = base.filter(o => (o.manufacturingStatus || '') === filters.manufacturingStatus);
    }
    if (filters.qcStatus) {
      base = base.filter(o => (o.qcStatus || '') === filters.qcStatus);
    }
    if (filters.transportType) {
      base = base.filter(o => (o.transportType || '') === filters.transportType);
    }

    // ordenar
    if (sortConfig.key) {
      base.sort((a, b) => {
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
    }

    return base;
  }, [orders, filters, sortConfig]);

  const formatCurrency = (amount, currency) => {
    const num = Number.isFinite(+amount) ? +amount : 0;
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    }).format(d);
  };

  const columns = [
    { key: 'poNumber', labelEn: 'PO Number', labelEs: 'Número PO', sortable: true },
    { key: 'tenderRef', labelEn: 'Tender Ref', labelEs: 'Ref. Licitación', sortable: true },
    { key: 'products', labelEn: 'Products', labelEs: 'Productos', sortable: false },
    { key: 'manufacturingStatus', labelEn: 'Manufacturing', labelEs: 'Fabricación', sortable: true },
    { key: 'qcStatus', labelEn: 'QC Status', labelEs: 'Estado QC', sortable: true },
    { key: 'transportType', labelEn: 'Transport', labelEs: 'Transporte', sortable: true },
    { key: 'eta', labelEn: 'ETA', labelEs: 'ETA', sortable: true },
    { key: 'costUsd', labelEn: 'Cost (USD)', labelEs: 'Costo (USD)', sortable: true },
    { key: 'actions', labelEn: 'Actions', labelEs: 'Acciones', sortable: false }
  ];
  const getColumnLabel = (c) => (currentLanguage === 'es' ? c.labelEs : c.labelEn);

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
              {rows.map((order) => {
                const po = String(order.poNumber || '').trim();
                const agg = poAggregates.get(po);
                const productCount = agg ? agg.products.size : 0;

                return (
                  <tr key={order?.id || order?.poNumber || crypto.randomUUID()} className="hover:bg-muted/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{order?.poNumber || '—'}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(order?.createdDate)}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{order?.tenderRef || '—'}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{productCount}</div>
                    </td>

                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order?.manufacturingStatus || ''} type="manufacturing" currentLanguage={currentLanguage} />
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order?.qcStatus || ''} type="qc" currentLanguage={currentLanguage} />
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order?.transportType || ''} type="transport" currentLanguage={currentLanguage} />
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
                          onClick={() => openDetails(order)}
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

        {rows.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Package" size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">{t('No orders found', 'No se encontraron órdenes')}</h3>
            <p className="text-muted-foreground">
              {t('Try adjusting the filters to see more results.', 'Intenta ajustar los filtros para ver más resultados.')}
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

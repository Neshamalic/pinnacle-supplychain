// src/pages/purchase-order-tracking/index.jsx
import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import OrderSummaryCards from './components/OrderSummaryCards';
import OrderFilters from './components/OrderFilters';
import OrdersTable from './components/OrdersTable';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { sheetsApi } from '@/lib/sheetsApi.js';

/* ========== Modal: Crear Orden (guarda realmente) ========== */
function NewOrderModal({ isOpen, onClose, currentLanguage = 'en' }) {
  const [form, setForm] = useState({ poNumber: '', tenderRef: '', eta: '' });
  const [saving, setSaving] = useState(false);
  const t = (en, es) => (currentLanguage === 'es' ? es : en);

  useEffect(() => {
    if (!isOpen) setForm({ poNumber: '', tenderRef: '', eta: '' });
  }, [isOpen]);

  if (!isOpen) return null;

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Mapea a nombres REALES de la hoja "purchase_orders"
      const row = {
        po_number: form.poNumber,
        tender_ref: form.tenderRef,
        eta: form.eta || '', // YYYY-MM-DD
        created_date: new Date().toISOString(),
        manufacturing_status: 'Unknown',
        qc_status: 'Unknown',
        transport_type: 'Unknown',
        cost_usd: 0,
        cost_clp: 0,
      };
      await sheetsApi.create('purchase_orders', row);
      onClose();
    } catch (err) {
      alert(`Error creating order: ${String(err?.message || err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-modal max-w-lg w-full mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {t('New Order', 'Nueva Orden')}
          </h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <Icon name="X" size={18} />
          </Button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          <div>
            <label htmlFor="poNumber" className="text-sm font-medium text-muted-foreground">
              {t('PO Number', 'Número PO')}
            </label>
            <input
              id="poNumber"
              name="poNumber"
              type="text"
              value={form.poNumber}
              onChange={onChange}
              required
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder={t('e.g. PO-109', 'ej: PO-109')}
            />
          </div>

          <div>
            <label htmlFor="tenderRef" className="text-sm font-medium text-muted-foreground">
              {t('Tender Ref', 'Ref. Licitación')}
            </label>
            <input
              id="tenderRef"
              name="tenderRef"
              type="text"
              value={form.tenderRef}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              placeholder={t('e.g. 621-29-LR25', 'ej: 621-29-LR25')}
            />
          </div>

          <div>
            <label htmlFor="eta" className="text-sm font-medium text-muted-foreground">
              ETA
            </label>
            <input
              id="eta"
              name="eta"
              type="date"
              value={form.eta}
              onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t('Cancel', 'Cancelar')}
            </Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? t('Saving…', 'Guardando…') : t('Create', 'Crear')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========== Página principal ========== */
const PurchaseOrderTracking = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    manufacturingStatus: '',
    qcStatus: '',
    transportType: '',
    dateRange: '',
    productCategory: '',
  });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
    const onStorage = () => setCurrentLanguage(localStorage.getItem('language') || 'en');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <Breadcrumb />
            <div className="flex items-center justify-between mt-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {currentLanguage === 'es' ? 'Seguimiento de Órdenes de Compra' : 'Purchase Order Tracking'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {currentLanguage === 'es'
                    ? 'Monitorea el estado de producción y envío de órdenes a India'
                    : 'Monitor production status and shipment coordination for orders to India'}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button type="button" variant="outline" iconName="Download" iconPosition="left">
                  {currentLanguage === 'es' ? 'Exportar' : 'Export'}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setIsCreateOpen(true)}
                  iconName="Plus"
                  iconPosition="left"
                >
                  {currentLanguage === 'es' ? 'Nueva Orden' : 'New Order'}
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <OrderSummaryCards currentLanguage={currentLanguage} />

          {/* Filters */}
          <OrderFilters currentLanguage={currentLanguage} onFiltersChange={setFilters} />

          {/* Table */}
          <OrdersTable currentLanguage={currentLanguage} filters={filters} />
        </div>
      </main>

      {/* Modal Crear Orden */}
      <NewOrderModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        currentLanguage={currentLanguage}
      />
    </div>
  );
};

export default PurchaseOrderTracking;

// src/pages/purchase-order-tracking/index.jsx
import React, { useEffect, useState } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import OrderSummaryCards from './components/OrderSummaryCards';
import OrderFilters from './components/OrderFilters';
import OrdersTable from './components/OrdersTable';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { writeRow } from '../../lib/sheetsApi';

// -------- Modal Crear Orden (graba en Google Sheets) --------
function NewOrderModal({ isOpen, onClose, currentLanguage = 'en' }) {
  const [form, setForm] = useState({ poNumber: '', tenderRef: '', eta: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) setForm({ poNumber: '', tenderRef: '', eta: '' });
  }, [isOpen]);

  if (!isOpen) return null;
  const t = (en, es) => (currentLanguage === 'es' ? es : en);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Los nombres de columnas deben existir en la hoja "purchase_orders"
      const payload = {
        po_number: form.poNumber,           // <- clave (KEYS.purchase_orders)
        tender_ref: form.tenderRef || '',
        eta: form.eta || '',
        manufacturing_status: '',
        qc_status: '',
        transport_type: '',
        cost_usd: '',
        cost_clp: '',
      };
      await writeRow('purchase_orders', payload);
      onClose();
      window.location.reload(); // simple refresh para ver la nueva fila
    } catch (err) {
      alert(`${t('Error creating order:', 'Error al crear orden:')} ${String(err)}`);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-modal max-w-lg w-full mx-4 overflow-hidden border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t('New Order', 'Nueva Orden')}</h2>
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
              id="poNumber" name="poNumber" type="text" required
              value={form.poNumber} onChange={onChange}
              placeholder={t('e.g. PO-109', 'ej: PO-109')}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
            />
          </div>

          <div>
            <label htmlFor="tenderRef" className="text-sm font-medium text-muted-foreground">
              {t('Tender Ref', 'Ref. Licitación')}
            </label>
            <input
              id="tenderRef" name="tenderRef" type="text"
              value={form.tenderRef} onChange={onChange}
              placeholder={t('e.g. 621-29-LR25', 'ej: 621-29-LR25')}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
            />
          </div>

          <div>
            <label htmlFor="eta" className="text-sm font-medium text-muted-foreground">ETA</label>
            <input
              id="eta" name="eta" type="date"
              value={form.eta} onChange={onChange}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{t('Cancel', 'Cancelar')}</Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? t('Saving…', 'Guardando…') : t('Create', 'Crear')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------- Página principal ----------------------
const PurchaseOrderTracking = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '', manufacturingStatus: '', qcStatus: '', transportType: '',
    dateRange: '', productCategory: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('language') || 'en';
    setCurrentLanguage(saved);
    const onStorage = () => setCurrentLanguage(localStorage.getItem('language') || 'en');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
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
                <Button type="button" variant="default" onClick={() => setIsCreateOpen(true)} iconName="Plus" iconPosition="left">
                  {currentLanguage === 'es' ? 'Nueva Orden' : 'New Order'}
                </Button>
              </div>
            </div>
          </div>

          <OrderSummaryCards currentLanguage={currentLanguage} />
          <OrderFilters currentLanguage={currentLanguage} onFiltersChange={setFilters} />

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                {currentLanguage === 'es' ? 'Órdenes de Compra' : 'Purchase Orders'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="Clock" size={16} />
                <span>{currentLanguage === 'es' ? 'Última actualización: hace 5 minutos' : 'Last updated: 5 minutes ago'}</span>
              </div>
            </div>
            <OrdersTable currentLanguage={currentLanguage} filters={filters} />
          </div>

          {/* Acciones rápidas */}
          <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {currentLanguage === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button type="button" variant="outline" className="justify-start h-auto p-4" iconName="FileText" iconPosition="left">
                <div className="text-left">
                  <div className="font-medium">{currentLanguage === 'es' ? 'Generar Reporte' : 'Generate Report'}</div>
                  <div className="text-sm text-muted-foreground">{currentLanguage === 'es' ? 'Estado de órdenes' : 'Order status report'}</div>
                </div>
              </Button>
              <Button type="button" variant="outline" className="justify-start h-auto p-4" iconName="Bell" iconPosition="left">
                <div className="text-left">
                  <div className="font-medium">{currentLanguage === 'es' ? 'Configurar Alertas' : 'Setup Alerts'}</div>
                  <div className="text-sm text-muted-foreground">{currentLanguage === 'es' ? 'Notificaciones ETA' : 'ETA notifications'}</div>
                </div>
              </Button>
              <Button type="button" variant="outline" className="justify-start h-auto p-4" iconName="MessageSquare" iconPosition="left">
                <div className="text-left">
                  <div className="font-medium">{currentLanguage === 'es' ? 'Comunicaciones' : 'Communications'}</div>
                  <div className="text-sm text-muted-foreground">{currentLanguage === 'es' ? 'Con proveedores India' : 'With India suppliers'}</div>
                </div>
              </Button>
              <Button type="button" variant="outline" className="justify-start h-auto p-4" iconName="Settings" iconPosition="left">
                <div className="text-left">
                  <div className="font-medium">{currentLanguage === 'es' ? 'Configuración' : 'Settings'}</div>
                  <div className="text-sm text-muted-foreground">{currentLanguage === 'es' ? 'Preferencias sistema' : 'System preferences'}</div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Crear Orden */}
      <NewOrderModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} currentLanguage={currentLanguage} />
    </div>
  );
};

export default PurchaseOrderTracking;

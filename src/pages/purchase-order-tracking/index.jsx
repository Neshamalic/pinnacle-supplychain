import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import OrderSummaryCards from './components/OrderSummaryCards';
import OrderFilters from './components/OrderFilters';
import OrdersTable from './components/OrdersTable';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const PurchaseOrderTracking = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [filters, setFilters] = useState({
    search: '',
    manufacturingStatus: '',
    qcStatus: '',
    transportType: '',
    dateRange: '',
    productCategory: ''
  });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);

    const handleStorageChange = () => {
      const newLanguage = localStorage.getItem('language') || 'en';
      setCurrentLanguage(newLanguage);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleExportData = () => {
    // Mock export functionality
    console.log('Exporting order data...');
  };

  const handleCreateOrder = () => {
    // Mock create order functionality
    console.log('Creating new order...');
  };

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
                  {currentLanguage === 'es' ?'Monitorea el estado de producción y envío de órdenes a India' :'Monitor production status and shipment coordination for orders to India'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  iconName="Download"
                  iconPosition="left"
                >
                  {currentLanguage === 'es' ? 'Exportar' : 'Export'}
                </Button>
                <Button
                  variant="default"
                  onClick={handleCreateOrder}
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
          <OrderFilters 
            currentLanguage={currentLanguage} 
            onFiltersChange={handleFiltersChange}
          />

          {/* Orders Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                {currentLanguage === 'es' ? 'Órdenes de Compra' : 'Purchase Orders'}
              </h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="Clock" size={16} />
                <span>
                  {currentLanguage === 'es' ?'Última actualización: hace 5 minutos' :'Last updated: 5 minutes ago'
                  }
                </span>
              </div>
            </div>
            <OrdersTable 
              currentLanguage={currentLanguage} 
              filters={filters}
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {currentLanguage === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                iconName="FileText"
                iconPosition="left"
              >
                <div className="text-left">
                  <div className="font-medium">
                    {currentLanguage === 'es' ? 'Generar Reporte' : 'Generate Report'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLanguage === 'es' ? 'Estado de órdenes' : 'Order status report'}
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                iconName="Bell"
                iconPosition="left"
              >
                <div className="text-left">
                  <div className="font-medium">
                    {currentLanguage === 'es' ? 'Configurar Alertas' : 'Setup Alerts'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLanguage === 'es' ? 'Notificaciones ETA' : 'ETA notifications'}
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                iconName="MessageSquare"
                iconPosition="left"
              >
                <div className="text-left">
                  <div className="font-medium">
                    {currentLanguage === 'es' ? 'Comunicaciones' : 'Communications'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLanguage === 'es' ? 'Con proveedores India' : 'With India suppliers'}
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                iconName="Settings"
                iconPosition="left"
              >
                <div className="text-left">
                  <div className="font-medium">
                    {currentLanguage === 'es' ? 'Configuración' : 'Settings'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLanguage === 'es' ? 'Preferencias sistema' : 'System preferences'}
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PurchaseOrderTracking;
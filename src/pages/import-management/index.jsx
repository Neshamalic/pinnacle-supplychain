import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import ImportStatusCard from './components/ImportStatusCard';
import ImportFilters from './components/ImportFilters';
import ImportTable from './components/ImportTable';
import ImportTimeline from './components/ImportTimeline';
import ImportDetails from './components/ImportDetails';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

import { useSheet } from '../../lib/sheetsApi';
import { mapImports } from '../../lib/adapters';

const ImportManagement = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [selectedImport, setSelectedImport] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filteredImports, setFilteredImports] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // Datos reales
  const { rows: imports, loading, error } = useSheet('imports', mapImports);
  const data = imports ?? [];

  // Sincroniza la tabla con los datos
  useEffect(() => {
    setFilteredImports(data);
  }, [data]);

  const labels = {
    en: {
      title: 'Import Management',
      subtitle: 'Track incoming shipments from arrival through quality control completion',
      activeImports: 'Active Imports',
      pendingQC: 'Pending QC',
      customsClearance: 'Customs Clearance',
      totalValue: 'Total Import Value',
      exportData: 'Export Data',
      refreshData: 'Refresh Data',
      viewTimeline: 'View Timeline',
      closeTimeline: 'Close Timeline'
    },
    es: {
      title: 'Gestión de Importaciones',
      subtitle: 'Seguimiento de envíos desde llegada hasta finalización del control de calidad',
      activeImports: 'Importaciones Activas',
      pendingQC: 'QC Pendiente',
      customsClearance: 'Despacho Aduanero',
      totalValue: 'Valor Total Importaciones',
      exportData: 'Exportar Datos',
      refreshData: 'Actualizar Datos',
      viewTimeline: 'Ver Cronología',
      closeTimeline: 'Cerrar Cronología'
    }
  };

  const handleFiltersChange = (filters) => {
    setActiveFilters(filters);
    let filtered = [...data];

    // Search
    if (filters?.searchTerm) {
      filtered = filtered.filter(imp =>
        imp?.shipmentId?.toLowerCase()?.includes(filters?.searchTerm?.toLowerCase()) ||
        imp?.currentLocation?.toLowerCase()?.includes(filters?.searchTerm?.toLowerCase())
      );
    }

    // Transport type
    if (filters?.transportType) {
      filtered = filtered.filter(imp => imp?.transportType === filters?.transportType);
    }

    // QC status
    if (filters?.qcStatus) {
      filtered = filtered.filter(imp => imp?.qcStatus === filters?.qcStatus);
    }

    // Customs status
    if (filters?.customsStatus) {
      filtered = filtered.filter(imp => imp?.customsStatus === filters?.customsStatus);
    }

    // Date range (arrivalDate)
    if (filters?.dateRange?.start || filters?.dateRange?.end) {
      filtered = filtered.filter(imp => {
        const arrivalDate = imp?.arrivalDate ? new Date(imp.arrivalDate) : null;
        const startDate = filters?.dateRange?.start ? new Date(filters.dateRange.start) : null;
        const endDate = filters?.dateRange?.end ? new Date(filters.dateRange.end) : null;
        if (!arrivalDate) return false;
        if (startDate && arrivalDate < startDate) return false;
        if (endDate && arrivalDate > endDate) return false;
        return true;
      });
    }

    setFilteredImports(filtered);
  };

  const handleResetFilters = () => {
    setActiveFilters({});
    setFilteredImports(data);
  };

  const handleImportSelect = (importData) => {
    setSelectedImport(importData);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedImport(null);
  };

  const getStatusCounts = () => {
    return {
      activeImports: data.length,
      pendingQC: data.filter(imp => imp?.qcStatus === 'pending' || imp?.qcStatus === 'in-progress').length,
      customsClearance: data.filter(imp => imp?.customsStatus === 'in-clearance' || imp?.customsStatus === 'pending').length,
      totalValue: data.reduce((sum, imp) => sum + (imp?.totalCost || 0), 0)
    };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount ?? 0);
  };

  const statusCounts = getStatusCounts();
  const t = labels[currentLanguage];

  if (loading) return <div style={{ padding: 16 }}>Loading imports…</div>;
  if (error)   return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb />
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">{t.title}</h1>
                <p className="text-muted-foreground">{t.subtitle}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" iconName="Download" iconPosition="left">
                  {t.exportData}
                </Button>
                <Button variant="default" iconName="RefreshCw" iconPosition="left">
                  {t.refreshData}
                </Button>
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <ImportStatusCard
              title={t.activeImports}
              value={statusCounts.activeImports}
              subtitle="Total shipments in system"
              icon="Package"
              color="blue"
              trend={12}
            />
            <ImportStatusCard
              title={t.pendingQC}
              value={statusCounts.pendingQC}
              subtitle="Awaiting quality control"
              icon="Shield"
              color="orange"
              trend={-5}
            />
            <ImportStatusCard
              title={t.customsClearance}
              value={statusCounts.customsClearance}
              subtitle="In customs process"
              icon="FileCheck"
              color="purple"
              trend={8}
            />
            <ImportStatusCard
              title={t.totalValue}
              value={formatCurrency(statusCounts.totalValue)}
              subtitle="Combined import value"
              icon="DollarSign"
              color="green"
              trend={15}
            />
          </div>

          {/* Filters */}
          <ImportFilters onFiltersChange={handleFiltersChange} onReset={handleResetFilters} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Import Table */}
            <div className="lg:col-span-2">
              <ImportTable
                imports={filteredImports}
                onImportSelect={handleImportSelect}
                selectedImport={selectedImport}
              />
            </div>

            {/* Timeline Sidebar */}
            <div className="lg:col-span-1">
              {selectedImport ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">{t.viewTimeline}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedImport(null)}
                      iconName="X"
                    >
                      {t.closeTimeline}
                    </Button>
                  </div>
                  <ImportTimeline importData={selectedImport} />
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg p-8 text-center shadow-soft">
                  <Icon name="MousePointer" size={48} className="mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {currentLanguage === 'es' ? 'Selecciona una Importación' : 'Select an Import'}
                  </h3>
                  <p className="text-muted-foreground">
                    {currentLanguage === 'es'
                      ? 'Haz clic en cualquier importación para ver su cronología detallada'
                      : 'Click on any import to view its detailed timeline'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Import Details Modal */}
      {showDetails && selectedImport && (
        <ImportDetails importData={selectedImport} onClose={handleCloseDetails} />
      )}
    </div>
  );
};

export default ImportManagement;

import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import TenderFilters from './components/TenderFilters';
import TenderToolbar from './components/TenderToolbar';
import TenderTable from './components/TenderTable';
import TenderCardView from './components/TenderCardView';
import TenderDetailModal from './components/TenderDetailModal';

// ✅ Añadido: usa tu API de Sheets + adaptador
import { useSheet } from '../../lib/sheetsApi';
import { mapTenders } from '../../lib/adapters';

const TenderManagement = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [selectedTenders, setSelectedTenders] = useState([]);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'createdDate', direction: 'desc' });
  const [selectedTender, setSelectedTender] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // ✅ Datos reales desde Google Sheets (hoja: "tenders")
  const { rows: tenders, loading, error } = useSheet('tenders', mapTenders);
  const data = tenders ?? [];

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleTenderSelect = (tenderId) => {
    setSelectedTenders(prev =>
      prev?.includes(tenderId)
        ? prev?.filter(id => id !== tenderId)
        : [...prev, tenderId]
    );
  };

  const handleTenderSelectAll = () => {
    setSelectedTenders(
      selectedTenders?.length === data?.length ? [] : data?.map(t => t?.id)
    );
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev?.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleTenderView = (tenderId) => {
    const tender = data?.find(t => t?.id === tenderId);
    setSelectedTender(tender);
    setIsDetailModalOpen(true);
  };

  const handleTenderEdit = (tenderId) => {
    console.log('Edit tender:', tenderId);
  };

  const handleNewTender = () => {
    console.log('Create new tender');
  };

  const handleExport = (format) => {
    console.log('Export to:', format);
  };

  const handleBulkAction = (action) => {
    console.log('Bulk action:', action, 'on tenders:', selectedTenders);
  };

  // ✅ Filtrar y ordenar sobre datos reales
  const filteredAndSortedTenders = (data ?? [])
    ?.filter(tender => {
      if (
        filters?.search &&
        !tender?.title?.toLowerCase()?.includes(filters?.search?.toLowerCase()) &&
        !tender?.tenderId?.toLowerCase()?.includes(filters?.search?.toLowerCase())
      ) {
        return false;
      }
      if (filters?.status && tender?.status !== filters?.status) return false;

      // Packaging units (si no hay products, no filtra)
      if (filters?.packagingUnits) {
        const hasMatchingPackagingUnits = tender?.products?.some(product =>
          product?.packagingUnits?.toString() === filters?.packagingUnits
        );
        if (!hasMatchingPackagingUnits) return false;
      }

      if (filters?.stockCoverage) {
        const coverage = tender?.stockCoverage ?? 0;
        switch (filters?.stockCoverage) {
          case 'critical':
            if (coverage >= 15) return false;
            break;
          case 'low':
            if (coverage < 15 || coverage > 30) return false;
            break;
          case 'medium':
            if (coverage < 30 || coverage > 60) return false;
            break;
          case 'high':
            if (coverage <= 60) return false;
            break;
          default:
            break;
        }
      }
      return true;
    })
    ?.sort((a, b) => {
      const key = sortConfig?.key;
      if (!key) return 0;

      let aValue = a?.[key];
      let bValue = b?.[key];

      // Ordena fechas correctamente
      if (key === 'createdDate' || key === 'deliveryDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (sortConfig?.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // ✅ Estados de carga / error
  if (loading) return <div style={{ padding: 16 }}>Loading tenders…</div>;
  if (error)   return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <div className="flex">
          {/* Filters Sidebar */}
          <TenderFilters
            onFiltersChange={handleFiltersChange}
            isCollapsed={isFiltersCollapsed}
            onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
          />

          {/* Main Content */}
          <div className="flex-1 p-6">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Breadcrumb />
            </div>

            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">
                {currentLanguage === 'es' ? 'Gestión de Licitaciones' : 'Tender Management'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {currentLanguage === 'es'
                  ? 'Administra y supervisa todas las licitaciones de CENABAST desde el registro hasta la entrega.'
                  : 'Manage and oversee all CENABAST tenders from registration through delivery tracking.'}
              </p>
            </div>

            {/* Toolbar */}
            <TenderToolbar
              selectedCount={selectedTenders?.length}
              totalCount={filteredAndSortedTenders?.length}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onNewTender={handleNewTender}
              onExport={handleExport}
              onBulkAction={handleBulkAction}
            />

            {/* Content */}
            {viewMode === 'table' ? (
              <TenderTable
                tenders={filteredAndSortedTenders}
                selectedTenders={selectedTenders}
                onTenderSelect={handleTenderSelect}
                onTenderSelectAll={handleTenderSelectAll}
                onTenderView={handleTenderView}
                onTenderEdit={handleTenderEdit}
                sortConfig={sortConfig}
                onSort={handleSort}
              />
            ) : (
              <TenderCardView
                tenders={filteredAndSortedTenders}
                selectedTenders={selectedTenders}
                onTenderSelect={handleTenderSelect}
                onTenderView={handleTenderView}
                onTenderEdit={handleTenderEdit}
              />
            )}
          </div>
        </div>
      </div>
      {/* Detail Modal */}
      <TenderDetailModal
        tender={selectedTender}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={handleTenderEdit}
      />
    </div>
  );
};

export default TenderManagement;

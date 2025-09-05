import React, { useState } from 'react';

import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const OrderFilters = ({ currentLanguage, onFiltersChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    manufacturingStatus: '',
    qcStatus: '',
    transportType: '',
    dateRange: '',
    productCategory: ''
  });

  const manufacturingStatusOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos los Estados' : 'All Statuses' },
    { value: 'in-process', label: currentLanguage === 'es' ? 'En Proceso' : 'In Process' },
    { value: 'ready', label: currentLanguage === 'es' ? 'Listo' : 'Ready' },
    { value: 'shipped', label: currentLanguage === 'es' ? 'Enviado' : 'Shipped' }
  ];

  const qcStatusOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos los Estados QC' : 'All QC Statuses' },
    { value: 'pending', label: currentLanguage === 'es' ? 'Pendiente' : 'Pending' },
    { value: 'approved', label: currentLanguage === 'es' ? 'Aprobado' : 'Approved' },
    { value: 'rejected', label: currentLanguage === 'es' ? 'Rechazado' : 'Rejected' }
  ];

  const transportTypeOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos los Transportes' : 'All Transport Types' },
    { value: 'sea', label: currentLanguage === 'es' ? 'Marítimo' : 'Sea' },
    { value: 'air', label: currentLanguage === 'es' ? 'Aéreo' : 'Air' }
  ];

  const dateRangeOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos los Períodos' : 'All Periods' },
    { value: 'last-7-days', label: currentLanguage === 'es' ? 'Últimos 7 días' : 'Last 7 days' },
    { value: 'last-30-days', label: currentLanguage === 'es' ? 'Últimos 30 días' : 'Last 30 days' },
    { value: 'last-90-days', label: currentLanguage === 'es' ? 'Últimos 90 días' : 'Last 90 days' }
  ];

  const productCategoryOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todas las Categorías' : 'All Categories' },
    { value: 'antibiotics', label: currentLanguage === 'es' ? 'Antibióticos' : 'Antibiotics' },
    { value: 'analgesics', label: currentLanguage === 'es' ? 'Analgésicos' : 'Analgesics' },
    { value: 'cardiovascular', label: currentLanguage === 'es' ? 'Cardiovascular' : 'Cardiovascular' },
    { value: 'diabetes', label: currentLanguage === 'es' ? 'Diabetes' : 'Diabetes' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      search: '',
      manufacturingStatus: '',
      qcStatus: '',
      transportType: '',
      dateRange: '',
      productCategory: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {currentLanguage === 'es' ? 'Filtros' : 'Filters'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          iconName={isExpanded ? 'ChevronUp' : 'ChevronDown'}
          iconPosition="right"
        >
          {isExpanded 
            ? (currentLanguage === 'es' ? 'Ocultar' : 'Hide')
            : (currentLanguage === 'es' ? 'Mostrar' : 'Show')
          }
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <Input
          type="search"
          placeholder={currentLanguage === 'es' ? 'Buscar por PO, licitación...' : 'Search by PO, tender...'}
          value={filters?.search}
          onChange={(e) => handleFilterChange('search', e?.target?.value)}
          className="w-full"
        />
        
        <Select
          placeholder={currentLanguage === 'es' ? 'Estado de Fabricación' : 'Manufacturing Status'}
          options={manufacturingStatusOptions}
          value={filters?.manufacturingStatus}
          onChange={(value) => handleFilterChange('manufacturingStatus', value)}
        />

        <Select
          placeholder={currentLanguage === 'es' ? 'Estado QC' : 'QC Status'}
          options={qcStatusOptions}
          value={filters?.qcStatus}
          onChange={(value) => handleFilterChange('qcStatus', value)}
        />
      </div>
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-border">
          <Select
            placeholder={currentLanguage === 'es' ? 'Tipo de Transporte' : 'Transport Type'}
            options={transportTypeOptions}
            value={filters?.transportType}
            onChange={(value) => handleFilterChange('transportType', value)}
          />

          <Select
            placeholder={currentLanguage === 'es' ? 'Rango de Fechas' : 'Date Range'}
            options={dateRangeOptions}
            value={filters?.dateRange}
            onChange={(value) => handleFilterChange('dateRange', value)}
          />

          <Select
            placeholder={currentLanguage === 'es' ? 'Categoría de Producto' : 'Product Category'}
            options={productCategoryOptions}
            value={filters?.productCategory}
            onChange={(value) => handleFilterChange('productCategory', value)}
          />
        </div>
      )}
      <div className="flex justify-end mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          iconName="X"
          iconPosition="left"
        >
          {currentLanguage === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
        </Button>
      </div>
    </div>
  );
};

export default OrderFilters;
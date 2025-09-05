import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const ImportFilters = ({ onFiltersChange, onReset }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    transportType: '',
    qcStatus: '',
    customsStatus: '',
    productCategory: '',
    searchTerm: ''
  });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const labels = {
    en: {
      filters: 'Filters',
      searchPlaceholder: 'Search shipments...',
      dateRange: 'Date Range',
      startDate: 'Start Date',
      endDate: 'End Date',
      transportType: 'Transport Type',
      qcStatus: 'QC Status',
      customsStatus: 'Customs Status',
      productCategory: 'Product Category',
      reset: 'Reset Filters',
      apply: 'Apply Filters',
      showMore: 'Show More Filters',
      showLess: 'Show Less Filters'
    },
    es: {
      filters: 'Filtros',
      searchPlaceholder: 'Buscar envíos...',
      dateRange: 'Rango de Fechas',
      startDate: 'Fecha Inicio',
      endDate: 'Fecha Fin',
      transportType: 'Tipo de Transporte',
      qcStatus: 'Estado QC',
      customsStatus: 'Estado Aduanas',
      productCategory: 'Categoría de Producto',
      reset: 'Restablecer Filtros',
      apply: 'Aplicar Filtros',
      showMore: 'Mostrar Más Filtros',
      showLess: 'Mostrar Menos Filtros'
    }
  };

  const transportOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos' : 'All' },
    { value: 'sea', label: currentLanguage === 'es' ? 'Marítimo' : 'Sea' },
    { value: 'air', label: currentLanguage === 'es' ? 'Aéreo' : 'Air' }
  ];

  const qcStatusOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos' : 'All' },
    { value: 'pending', label: currentLanguage === 'es' ? 'Pendiente' : 'Pending' },
    { value: 'in-progress', label: currentLanguage === 'es' ? 'En Proceso' : 'In Progress' },
    { value: 'approved', label: currentLanguage === 'es' ? 'Aprobado' : 'Approved' },
    { value: 'rejected', label: currentLanguage === 'es' ? 'Rechazado' : 'Rejected' }
  ];

  const customsStatusOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos' : 'All' },
    { value: 'pending', label: currentLanguage === 'es' ? 'Pendiente' : 'Pending' },
    { value: 'in-clearance', label: currentLanguage === 'es' ? 'En Despacho' : 'In Clearance' },
    { value: 'cleared', label: currentLanguage === 'es' ? 'Despachado' : 'Cleared' },
    { value: 'held', label: currentLanguage === 'es' ? 'Retenido' : 'Held' }
  ];

  const productCategoryOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todas' : 'All' },
    { value: 'antibiotics', label: currentLanguage === 'es' ? 'Antibióticos' : 'Antibiotics' },
    { value: 'analgesics', label: currentLanguage === 'es' ? 'Analgésicos' : 'Analgesics' },
    { value: 'cardiovascular', label: currentLanguage === 'es' ? 'Cardiovascular' : 'Cardiovascular' },
    { value: 'diabetes', label: currentLanguage === 'es' ? 'Diabetes' : 'Diabetes' },
    { value: 'respiratory', label: currentLanguage === 'es' ? 'Respiratorio' : 'Respiratory' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (type, value) => {
    const newDateRange = { ...filters?.dateRange, [type]: value };
    const newFilters = { ...filters, dateRange: newDateRange };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      dateRange: { start: '', end: '' },
      transportType: '',
      qcStatus: '',
      customsStatus: '',
      productCategory: '',
      searchTerm: ''
    };
    setFilters(resetFilters);
    onReset();
  };

  const t = labels?.[currentLanguage];

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-soft mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center">
          <Icon name="Filter" size={20} className="mr-2" />
          {t?.filters}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
          iconPosition="right"
        >
          {isExpanded ? t?.showLess : t?.showMore}
        </Button>
      </div>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="w-full">
          <Input
            type="search"
            placeholder={t?.searchPlaceholder}
            value={filters?.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e?.target?.value)}
            className="w-full"
          />
        </div>

        {/* Basic Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label={t?.transportType}
            options={transportOptions}
            value={filters?.transportType}
            onChange={(value) => handleFilterChange('transportType', value)}
          />
          <Select
            label={t?.qcStatus}
            options={qcStatusOptions}
            value={filters?.qcStatus}
            onChange={(value) => handleFilterChange('qcStatus', value)}
          />
          <Select
            label={t?.customsStatus}
            options={customsStatusOptions}
            value={filters?.customsStatus}
            onChange={(value) => handleFilterChange('customsStatus', value)}
          />
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label={t?.startDate}
                value={filters?.dateRange?.start}
                onChange={(e) => handleDateRangeChange('start', e?.target?.value)}
              />
              <Input
                type="date"
                label={t?.endDate}
                value={filters?.dateRange?.end}
                onChange={(e) => handleDateRangeChange('end', e?.target?.value)}
              />
            </div>

            {/* Product Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label={t?.productCategory}
                options={productCategoryOptions}
                value={filters?.productCategory}
                onChange={(value) => handleFilterChange('productCategory', value)}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            iconName="RotateCcw"
            iconPosition="left"
          >
            {t?.reset}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImportFilters;
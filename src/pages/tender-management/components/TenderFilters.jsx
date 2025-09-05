import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Button from '../../../components/ui/Button';

const TenderFilters = ({ onFiltersChange, isCollapsed, onToggleCollapse }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    productCategory: '',
    packagingUnits: '',
    deliveryPeriod: '',
    contractDateFrom: '',
    contractDateTo: '',
    stockCoverage: '',
    selectedProducts: []
  });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const statusOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos los Estados' : 'All Statuses' },
    { value: 'draft', label: currentLanguage === 'es' ? 'Borrador' : 'Draft' },
    { value: 'submitted', label: currentLanguage === 'es' ? 'Enviado' : 'Submitted' },
    { value: 'awarded', label: currentLanguage === 'es' ? 'Adjudicado' : 'Awarded' },
    { value: 'rejected', label: currentLanguage === 'es' ? 'Rechazado' : 'Rejected' },
    { value: 'in_delivery', label: currentLanguage === 'es' ? 'En Entrega' : 'In Delivery' },
    { value: 'completed', label: currentLanguage === 'es' ? 'Completado' : 'Completed' }
  ];

  const productCategoryOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todas las Categorías' : 'All Categories' },
    { value: 'antibiotics', label: currentLanguage === 'es' ? 'Antibióticos' : 'Antibiotics' },
    { value: 'analgesics', label: currentLanguage === 'es' ? 'Analgésicos' : 'Analgesics' },
    { value: 'cardiovascular', label: currentLanguage === 'es' ? 'Cardiovascular' : 'Cardiovascular' },
    { value: 'diabetes', label: currentLanguage === 'es' ? 'Diabetes' : 'Diabetes' },
    { value: 'respiratory', label: currentLanguage === 'es' ? 'Respiratorio' : 'Respiratory' },
    { value: 'oncology', label: currentLanguage === 'es' ? 'Oncología' : 'Oncology' }
  ];

  const packagingOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todas las Unidades' : 'All Units' },
    { value: '10', label: currentLanguage === 'es' ? '10 unidades' : '10 units' },
    { value: '30', label: currentLanguage === 'es' ? '30 unidades' : '30 units' },
    { value: '100', label: currentLanguage === 'es' ? '100 unidades' : '100 units' },
    { value: '250', label: currentLanguage === 'es' ? '250 unidades' : '250 units' },
    { value: '500', label: currentLanguage === 'es' ? '500 unidades' : '500 units' }
  ];

  const deliveryPeriodOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Todos los Períodos' : 'All Periods' },
    { value: '30', label: currentLanguage === 'es' ? 'Próximos 30 días' : 'Next 30 days' },
    { value: '60', label: currentLanguage === 'es' ? 'Próximos 60 días' : 'Next 60 days' },
    { value: '90', label: currentLanguage === 'es' ? 'Próximos 90 días' : 'Next 90 days' },
    { value: 'overdue', label: currentLanguage === 'es' ? 'Vencidos' : 'Overdue' }
  ];

  const stockCoverageOptions = [
    { value: '', label: currentLanguage === 'es' ? 'Toda Cobertura' : 'All Coverage' },
    { value: 'critical', label: currentLanguage === 'es' ? 'Crítico (<15 días)' : 'Critical (<15 days)' },
    { value: 'low', label: currentLanguage === 'es' ? 'Bajo (15-30 días)' : 'Low (15-30 days)' },
    { value: 'medium', label: currentLanguage === 'es' ? 'Medio (30-60 días)' : 'Medium (30-60 days)' },
    { value: 'high', label: currentLanguage === 'es' ? 'Alto (>60 días)' : 'High (>60 days)' }
  ];

  const productList = [
    { id: 'amoxicillin', name: currentLanguage === 'es' ? 'Amoxicilina 500mg' : 'Amoxicillin 500mg' },
    { id: 'paracetamol', name: currentLanguage === 'es' ? 'Paracetamol 500mg' : 'Paracetamol 500mg' },
    { id: 'metformin', name: currentLanguage === 'es' ? 'Metformina 850mg' : 'Metformin 850mg' },
    { id: 'losartan', name: currentLanguage === 'es' ? 'Losartán 50mg' : 'Losartan 50mg' },
    { id: 'omeprazole', name: currentLanguage === 'es' ? 'Omeprazol 20mg' : 'Omeprazole 20mg' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleProductToggle = (productId) => {
    const newSelectedProducts = filters?.selectedProducts?.includes(productId)
      ? filters?.selectedProducts?.filter(id => id !== productId)
      : [...filters?.selectedProducts, productId];
    
    handleFilterChange('selectedProducts', newSelectedProducts);
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      search: '',
      status: '',
      productCategory: '',
      packagingUnits: '',
      deliveryPeriod: '',
      contractDateFrom: '',
      contractDateTo: '',
      stockCoverage: '',
      selectedProducts: []
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters)?.some(value => 
    Array.isArray(value) ? value?.length > 0 : value !== ''
  );

  return (
    <div className={`bg-card border-r border-border transition-all duration-300 ${
      isCollapsed ? 'w-12' : 'w-80'
    }`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h3 className="text-lg font-semibold text-foreground">
              {currentLanguage === 'es' ? 'Filtros' : 'Filters'}
            </h3>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8"
          >
            <Icon 
              name={isCollapsed ? "ChevronRight" : "ChevronLeft"} 
              size={16} 
            />
          </Button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Search */}
          <div>
            <Input
              type="search"
              placeholder={currentLanguage === 'es' ? 'Buscar licitaciones...' : 'Search tenders...'}
              value={filters?.search}
              onChange={(e) => handleFilterChange('search', e?.target?.value)}
              className="w-full"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              label={currentLanguage === 'es' ? 'Estado' : 'Status'}
              options={statusOptions}
              value={filters?.status}
              onChange={(value) => handleFilterChange('status', value)}
            />
          </div>

          {/* Product Category */}
          <div>
            <Select
              label={currentLanguage === 'es' ? 'Categoría de Producto' : 'Product Category'}
              options={productCategoryOptions}
              value={filters?.productCategory}
              onChange={(value) => handleFilterChange('productCategory', value)}
            />
          </div>

          {/* Packaging Type */}
          <div>
            <Select
              label={currentLanguage === 'es' ? 'Tipo de Envase' : 'Packaging Type'}
              options={packagingOptions}
              value={filters?.packagingType}
              onChange={(value) => handleFilterChange('packagingType', value)}
            />
          </div>

          {/* Packaging Units */}
          <div>
            <Select
              label={currentLanguage === 'es' ? 'Unidades por Empaque' : 'Units per Package'}
              options={packagingOptions}
              value={filters?.packagingUnits}
              onChange={(value) => handleFilterChange('packagingUnits', value)}
            />
          </div>

          {/* Delivery Period */}
          <div>
            <Select
              label={currentLanguage === 'es' ? 'Período de Entrega' : 'Delivery Period'}
              options={deliveryPeriodOptions}
              value={filters?.deliveryPeriod}
              onChange={(value) => handleFilterChange('deliveryPeriod', value)}
            />
          </div>

          {/* Contract Date Range */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {currentLanguage === 'es' ? 'Período de Contrato' : 'Contract Period'}
            </label>
            <div className="space-y-2">
              <Input
                type="date"
                placeholder={currentLanguage === 'es' ? 'Fecha de inicio' : 'Start date'}
                value={filters?.contractDateFrom}
                onChange={(e) => handleFilterChange('contractDateFrom', e?.target?.value)}
              />
              <Input
                type="date"
                placeholder={currentLanguage === 'es' ? 'Fecha de fin' : 'End date'}
                value={filters?.contractDateTo}
                onChange={(e) => handleFilterChange('contractDateTo', e?.target?.value)}
              />
            </div>
          </div>

          {/* Stock Coverage */}
          <div>
            <Select
              label={currentLanguage === 'es' ? 'Cobertura de Stock' : 'Stock Coverage'}
              options={stockCoverageOptions}
              value={filters?.stockCoverage}
              onChange={(value) => handleFilterChange('stockCoverage', value)}
            />
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              {currentLanguage === 'es' ? 'Productos Específicos' : 'Specific Products'}
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {productList?.map((product) => (
                <Checkbox
                  key={product?.id}
                  label={product?.name}
                  checked={filters?.selectedProducts?.includes(product?.id)}
                  onChange={() => handleProductToggle(product?.id)}
                />
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="w-full"
                iconName="X"
                iconPosition="left"
              >
                {currentLanguage === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TenderFilters;
import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const AnalyticsPanel = ({ currentLanguage }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPackaging, setSelectedPackaging] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('3months');
  const [selectedCoverage, setSelectedCoverage] = useState('all');

  const labels = {
    en: {
      filters: "Analytics Filters",
      category: "Product Category",
      packaging: "Packaging Type",
      period: "Demand Period",
      coverage: "Stock Coverage",
      applyFilters: "Apply Filters",
      resetFilters: "Reset",
      exportAnalytics: "Export Analytics",
      all: "All Categories",
      analgesics: "Analgesics",
      antibiotics: "Antibiotics",
      gastric: "Gastric",
      diabetes: "Diabetes",
      cardiovascular: "Cardiovascular",
      allPackaging: "All Packaging",
      blister: "Blister",
      bottle: "Bottle",
      vial: "Vial",
      oneMonth: "1 Month",
      threeMonths: "3 Months",
      sixMonths: "6 Months",
      oneYear: "1 Year",
      allCoverage: "All Coverage",
      critical: "Critical (<2 days)",
      low: "Low (2-5 days)",
      medium: "Medium (5-10 days)",
      high: "High (>10 days)"
    },
    es: {
      filters: "Filtros de Análisis",
      category: "Categoría de Producto",
      packaging: "Tipo de Empaque",
      period: "Período de Demanda",
      coverage: "Cobertura de Stock",
      applyFilters: "Aplicar Filtros",
      resetFilters: "Restablecer",
      exportAnalytics: "Exportar Análisis",
      all: "Todas las Categorías",
      analgesics: "Analgésicos",
      antibiotics: "Antibióticos",
      gastric: "Gástricos",
      diabetes: "Diabetes",
      cardiovascular: "Cardiovasculares",
      allPackaging: "Todos los Empaques",
      blister: "Blister",
      bottle: "Botella",
      vial: "Vial",
      oneMonth: "1 Mes",
      threeMonths: "3 Meses",
      sixMonths: "6 Meses",
      oneYear: "1 Año",
      allCoverage: "Toda Cobertura",
      critical: "Crítico (<2 días)",
      low: "Bajo (2-5 días)",
      medium: "Medio (5-10 días)",
      high: "Alto (>10 días)"
    }
  };

  const t = labels?.[currentLanguage];

  const categoryOptions = [
    { value: 'all', label: t?.all },
    { value: 'analgesics', label: t?.analgesics },
    { value: 'antibiotics', label: t?.antibiotics },
    { value: 'gastric', label: t?.gastric },
    { value: 'diabetes', label: t?.diabetes },
    { value: 'cardiovascular', label: t?.cardiovascular }
  ];

  const packagingOptions = [
    { value: 'all', label: t?.allPackaging },
    { value: 'blister', label: t?.blister },
    { value: 'bottle', label: t?.bottle },
    { value: 'vial', label: t?.vial }
  ];

  const periodOptions = [
    { value: '1month', label: t?.oneMonth },
    { value: '3months', label: t?.threeMonths },
    { value: '6months', label: t?.sixMonths },
    { value: '1year', label: t?.oneYear }
  ];

  const coverageOptions = [
    { value: 'all', label: t?.allCoverage },
    { value: 'critical', label: t?.critical },
    { value: 'low', label: t?.low },
    { value: 'medium', label: t?.medium },
    { value: 'high', label: t?.high }
  ];

  const handleApplyFilters = () => {
    // Filter logic would be implemented here
    console.log('Applying filters:', {
      category: selectedCategory,
      packaging: selectedPackaging,
      period: selectedPeriod,
      coverage: selectedCoverage
    });
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedPackaging('all');
    setSelectedPeriod('3months');
    setSelectedCoverage('all');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon name="Filter" size={20} className="mr-2 text-blue-600" />
            {t?.filters}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
            iconName="Download"
            iconPosition="left"
          >
            {t?.exportAnalytics}
          </Button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <Select
              label={t?.category}
              options={categoryOptions}
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
              className="w-full"
            />
          </div>

          <div>
            <Select
              label={t?.packaging}
              options={packagingOptions}
              value={selectedPackaging}
              onChange={(value) => setSelectedPackaging(value)}
              className="w-full"
            />
          </div>

          <div>
            <Select
              label={t?.period}
              options={periodOptions}
              value={selectedPeriod}
              onChange={(value) => setSelectedPeriod(value)}
              className="w-full"
            />
          </div>

          <div>
            <Select
              label={t?.coverage}
              options={coverageOptions}
              value={selectedCoverage}
              onChange={(value) => setSelectedCoverage(value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            iconName="RotateCcw"
            iconPosition="left"
          >
            {t?.resetFilters}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleApplyFilters}
            iconName="Search"
            iconPosition="left"
          >
            {t?.applyFilters}
          </Button>
        </div>
      </div>
      {/* Quick Stats */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-800">24</div>
            <div className="text-sm text-blue-600">
              {currentLanguage === 'es' ? 'Productos Activos' : 'Active Products'}
            </div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-800">3</div>
            <div className="text-sm text-red-600">
              {currentLanguage === 'es' ? 'Stock Crítico' : 'Critical Stock'}
            </div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-2xl font-bold text-amber-800">7</div>
            <div className="text-sm text-amber-600">
              {currentLanguage === 'es' ? 'Envío Aéreo' : 'Air Shipment'}
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-800">14</div>
            <div className="text-sm text-green-600">
              {currentLanguage === 'es' ? 'Stock Saludable' : 'Healthy Stock'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;
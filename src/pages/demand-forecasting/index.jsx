import React, { useState, useEffect } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import MetricsCard from './components/MetricsCard';
import DemandPlanningTable from './components/DemandPlanningTable';
import AnalyticsPanel from './components/AnalyticsPanel';
import DemandTrendsChart from './components/DemandTrendsChart';
import StockCoverageChart from './components/StockCoverageChart';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const DemandForecasting = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
    
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleLanguageChange = () => {
      const savedLanguage = localStorage.getItem('language') || 'en';
      setCurrentLanguage(savedLanguage);
    };

    window.addEventListener('storage', handleLanguageChange);
    return () => window.removeEventListener('storage', handleLanguageChange);
  }, []);

  const labels = {
    en: {
      pageTitle: "Demand Forecasting",
      pageDescription: "Automated monthly demand calculations and stock coverage analysis for optimized inventory planning",
      refreshData: "Refresh Data",
      generateReport: "Generate Report",
      stockCoverage: "Average Stock Coverage",
      stockCoverageSubtitle: "Days of inventory remaining",
      criticalItems: "Critical Stock Items",
      criticalItemsSubtitle: "Requiring immediate attention",
      airShipments: "Air Shipment Recommendations",
      airShipmentsSubtitle: "Products needing expedited delivery",
      monthlyDemand: "Monthly Demand Trend",
      monthlyDemandSubtitle: "Compared to last month",
      lastUpdated: "Last updated",
      dataRefreshed: "Data refreshed successfully"
    },
    es: {
      pageTitle: "Pronóstico de Demanda",
      pageDescription: "Cálculos automatizados de demanda mensual y análisis de cobertura de stock para planificación optimizada de inventario",
      refreshData: "Actualizar Datos",
      generateReport: "Generar Reporte",
      stockCoverage: "Cobertura Promedio de Stock",
      stockCoverageSubtitle: "Días de inventario restante",
      criticalItems: "Artículos de Stock Crítico",
      criticalItemsSubtitle: "Requieren atención inmediata",
      airShipments: "Recomendaciones de Envío Aéreo",
      airShipmentsSubtitle: "Productos que necesitan entrega expedita",
      monthlyDemand: "Tendencia de Demanda Mensual",
      monthlyDemandSubtitle: "Comparado con el mes pasado",
      lastUpdated: "Última actualización",
      dataRefreshed: "Datos actualizados exitosamente"
    }
  };

  const t = labels?.[currentLanguage];

  const handleRefreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Show success message (in a real app, you'd use a toast notification)
      console.log(t?.dataRefreshed);
    }, 2000);
  };

  const handleGenerateReport = () => {
    // Generate and download report logic
    console.log('Generating demand forecasting report...');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {currentLanguage === 'es' ? 'Cargando datos de pronóstico...' : 'Loading forecasting data...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <Breadcrumb />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t?.pageTitle}</h1>
                <p className="mt-2 text-gray-600">{t?.pageDescription}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleRefreshData}
                  iconName="RefreshCw"
                  iconPosition="left"
                  loading={isLoading}
                >
                  {t?.refreshData}
                </Button>
                <Button
                  variant="default"
                  onClick={handleGenerateReport}
                  iconName="FileText"
                  iconPosition="left"
                >
                  {t?.generateReport}
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricsCard
              title={t?.stockCoverage}
              value="6.2"
              subtitle={t?.stockCoverageSubtitle}
              trend="down"
              trendValue="8%"
              icon="Calendar"
              color="blue"
            />
            <MetricsCard
              title={t?.criticalItems}
              value="3"
              subtitle={t?.criticalItemsSubtitle}
              trend="up"
              trendValue="2"
              icon="AlertTriangle"
              color="red"
              alert={true}
            />
            <MetricsCard
              title={t?.airShipments}
              value="7"
              subtitle={t?.airShipmentsSubtitle}
              trend="up"
              trendValue="3"
              icon="Plane"
              color="amber"
            />
            <MetricsCard
              title={t?.monthlyDemand}
              value="+12%"
              subtitle={t?.monthlyDemandSubtitle}
              trend="up"
              trendValue="12%"
              icon="TrendingUp"
              color="green"
            />
          </div>

          {/* Analytics Panel */}
          <div className="mb-8">
            <AnalyticsPanel currentLanguage={currentLanguage} />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <DemandTrendsChart currentLanguage={currentLanguage} />
            <StockCoverageChart currentLanguage={currentLanguage} />
          </div>

          {/* Demand Planning Table */}
          <div className="mb-8">
            <DemandPlanningTable currentLanguage={currentLanguage} />
          </div>

          {/* Footer Info */}
          <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Icon name="Clock" size={16} />
                  <span>{t?.lastUpdated}: {new Date()?.toLocaleString(currentLanguage === 'es' ? 'es-ES' : 'en-US')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Database" size={16} />
                  <span>
                    {currentLanguage === 'es' ?'24 productos activos monitoreados' :'24 active products monitored'
                    }
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>
                  {currentLanguage === 'es' ?'Sistema en línea' :'System online'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandForecasting;
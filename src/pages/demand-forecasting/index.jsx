import React, { useEffect, useMemo, useState } from 'react';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import MetricsCard from './components/MetricsCard';
import DemandPlanningTable from './components/DemandPlanningTable';
import AnalyticsPanel from './components/AnalyticsPanel';
import DemandTrendsChart from './components/DemandTrendsChart';
import StockCoverageChart from './components/StockCoverageChart';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

import { useSheet } from '../../lib/sheetsApi';
import { mapDemand } from '../../lib/adapters';
import { usePresentationCatalog } from '../../lib/catalog';

const DemandForecasting = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Carga de datos de la hoja “demand”
  const { rows: rawDemand = [], loading: loadingDemand, error } = useSheet(
    'demand',
    mapDemand
  );
  // Enriquecemos con nombre de producto y unidades por paquete
  const { enrich } = usePresentationCatalog();
  const enrichedRows = useMemo(() => enrich(rawDemand || []), [rawDemand, enrich]);

  // Actualiza idioma al cambiar en localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);

    const handleLanguageChange = () => {
      const lang = localStorage.getItem('language') || 'en';
      setCurrentLanguage(lang);
    };
    window.addEventListener('storage', handleLanguageChange);
    return () => window.removeEventListener('storage', handleLanguageChange);
  }, []);

  // Calcula métricas clave para las tarjetas superiores
  const metrics = useMemo(() => {
    const daysList = [];
    let criticalCount = 0;
    let airShipments = 0;

    // Acumuladores por mes para la tendencia
    const monthlyTotals = {};

    enrichedRows.forEach((row) => {
      // Calcular daysSupply si no viene de la hoja
      let daysSupply = row.daysSupply;
      if (daysSupply === null || daysSupply === undefined) {
        const stock = Number(row.currentStockUnits || 0);
        const demand = Number(row.monthlyDemandUnits || row.forecastUnits || 0);
        daysSupply =
          demand > 0 ? Math.floor((stock / demand) * 30) : Infinity;
      }
      if (Number.isFinite(daysSupply)) daysList.push(daysSupply);

      // Contar críticos (< 2 días)
      if (daysSupply < 2) criticalCount += 1;
      // Envíos aéreos: < 5 días o estado urgente/crítico
      const status = String(row.status || '').toLowerCase();
      if (daysSupply < 5 || status.includes('urgent') || status.includes('crític')) {
        airShipments += 1;
      }

      // Acumular para tendencia mensual
      const monthKey = row.monthOfSupply;
      if (monthKey) {
        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { actual: 0, forecast: 0 };
        }
        monthlyTotals[monthKey].actual += Number(row.historicalUnits || 0);
        monthlyTotals[monthKey].forecast += Number(row.forecastUnits || 0);
      }
    });

    // Cobertura promedio
    const averageCoverage =
      daysList.length > 0
        ? daysList.reduce((a, b) => a + b, 0) / daysList.length
        : 0;

    // Calcular tendencia mensual (%): última suma vs la anterior
    const monthEntries = Object.entries(monthlyTotals).sort(
      ([a], [b]) => new Date(a) - new Date(b)
    );
    let trendPercent = 0;
    if (monthEntries.length >= 2) {
      const last = monthEntries[monthEntries.length - 1][1];
      const prev = monthEntries[monthEntries.length - 2][1];
      const prevTotal = prev.actual || prev.forecast;
      const lastTotal = last.actual || last.forecast;
      if (prevTotal > 0) {
        trendPercent = ((lastTotal - prevTotal) / prevTotal) * 100;
      }
    }

    return {
      averageCoverage,
      criticalCount,
      airShipments,
      trendPercent,
    };
  }, [enrichedRows]);

  // Determina dirección y valor del trend de demanda mensual
  const demandTrendDirection = metrics.trendPercent >= 0 ? 'up' : 'down';
  const demandTrendValue = `${Math.abs(metrics.trendPercent).toFixed(0)}%`;

  // Traducciones
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
  const t = labels[currentLanguage];

  // Manejadores de botones
  const handleRefreshData = () => {
    // Aquí podrías re‑llamar a useSheet o forzar recarga de datos
    console.log(t.dataRefreshed);
  };
  const handleGenerateReport = () => {
    console.log('Generating demand forecasting report…');
  };

  // Mientras cargan los datos mostramos un spinner
  if (loadingDemand) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                {currentLanguage === 'es' ? 'Cargando datos de pronóstico…' : 'Loading forecasting data…'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Header />
        <div className="pt-16 text-center text-red-600">
          {currentLanguage === 'es' ? 'Error al cargar datos de demanda.' : 'Error loading demand data.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Encabezado de página */}
          <div className="mb-8">
            <Breadcrumb />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t.pageTitle}</h1>
                <p className="mt-2 text-gray-600">{t.pageDescription}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleRefreshData}
                  iconName="RefreshCw"
                  iconPosition="left"
                >
                  {t.refreshData}
                </Button>
                <Button
                  variant="default"
                  onClick={handleGenerateReport}
                  iconName="FileText"
                  iconPosition="left"
                >
                  {t.generateReport}
                </Button>
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricsCard
              title={t.stockCoverage}
              value={metrics.averageCoverage.toFixed(1)}
              subtitle={t.stockCoverageSubtitle}
              trend="down"
              trendValue=""
              icon="Calendar"
              color="blue"
            />
            <MetricsCard
              title={t.criticalItems}
              value={String(metrics.criticalCount)}
              subtitle={t.criticalItemsSubtitle}
              trend="up"
              trendValue=""
              icon="AlertTriangle"
              color="red"
              alert={metrics.criticalCount > 0}
            />
            <MetricsCard
              title={t.airShipments}
              value={String(metrics.airShipments)}
              subtitle={t.airShipmentsSubtitle}
              trend="up"
              trendValue=""
              icon="Plane"
              color="amber"
            />
            <MetricsCard
              title={t.monthlyDemand}
              value={`${metrics.trendPercent >= 0 ? '+' : '-'}${Math.abs(metrics.trendPercent).toFixed(0)}%`}
              subtitle={t.monthlyDemandSubtitle}
              trend={demandTrendDirection}
              trendValue={demandTrendValue}
              icon="TrendingUp"
              color="green"
            />
          </div>

          {/* Panel de Analíticas */}
          <div className="mb-8">
            <AnalyticsPanel currentLanguage={currentLanguage} rows={enrichedRows} />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
            <DemandTrendsChart currentLanguage={currentLanguage} rows={enrichedRows} />
            <StockCoverageChart currentLanguage={currentLanguage} rows={enrichedRows} />
          </div>

          {/* Tabla de Planificación de Demanda */}
          <div className="mb-8">
            <DemandPlanningTable currentLanguage={currentLanguage} />
          </div>

          {/* Footer */}
          <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Icon name="Clock" size={16} />
                  <span>
                    {t.lastUpdated}: {new Date().toLocaleString(currentLanguage === 'es' ? 'es-ES' : 'en-US')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Database" size={16} />
                  <span>
                    {currentLanguage === 'es'
                      ? `${enrichedRows.length} productos activos monitoreados`
                      : `${enrichedRows.length} active products monitored`}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{currentLanguage === 'es' ? 'Sistema en línea' : 'System online'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandForecasting;

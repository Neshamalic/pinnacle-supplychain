import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import MetricsCard from './components/MetricsCard';
import UpcomingArrivals from './components/UpcomingArrivals';
import RecentCommunications from './components/RecentCommunications';
import LowStockAlerts from './components/LowStockAlerts';
import DemandChart from './components/DemandChart';
import QuickActions from './components/QuickActions';

// ✅ Conexión a Google Sheets
import { useSheet } from '../../lib/sheetsApi';
import { mapTenders, mapImports, mapDemand } from '../../lib/adapters';

const Dashboard = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const navigate = useNavigate();

  // Leer idioma guardado y escuchar cambios
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

  // ✅ Datos reales desde Google Sheets
  const { rows: tenderRows = [] } = useSheet('tenders', mapTenders);
  const { rows: importRows = [] } = useSheet('imports', mapImports);
  const { rows: demandRows = [] } = useSheet('demand', mapDemand);

  // ✅ Cálculo de métricas del Dashboard
  const metricsData = useMemo(() => {
    const isEs = currentLanguage === 'es';

    const tenders = tenderRows || [];
    const imports = importRows || [];
    const demand = demandRows || [];

    const normalizeStatus = (s) => String(s || '').toLowerCase().trim();

    // --- LICITACIONES ---
    const activeTenders = tenders.filter((t) => {
      const s = normalizeStatus(t.status);
      if (!s) return false;
      return !['rejected', 'closed', 'cancelled', 'cancelado', 'rechazado'].includes(s);
    });

    const pendingTenders = tenders.filter((t) => {
      const s = normalizeStatus(t.status);
      return ['draft', 'pending', 'submitted', 'borrador', 'pendiente'].includes(s);
    });

    // --- IMPORTACIONES ---
    const pendingImports = imports.filter((imp) => {
      const s = normalizeStatus(imp.status);
      if (!s) return false;
      return ![
        'delivered',
        'warehouse',
        'completed',
        'entregado',
        'en bodega',
        'completado',
      ].includes(s);
    });

    const seaPendingImports = pendingImports.filter((imp) => {
      const transport = String(imp.transportType || imp.mode || '').toLowerCase();
      return (
        transport.includes('sea') ||
        transport.includes('mar') ||
        transport.includes('marít')
      );
    });

    // --- DEMANDA / STOCK ---
    let lowAlerts = 0;
    let criticalAlerts = 0;
    const daysList = [];

    demand.forEach((row) => {
      let days = row.daysSupply;

      if (days === null || days === undefined || Number.isNaN(Number(days))) {
        const stock = Number(row.currentStockUnits || 0);
        const monthlyDemand = Number(
          row.monthlyDemandUnits || row.forecastUnits || 0
        );
        days =
          monthlyDemand > 0 ? Math.floor((stock / monthlyDemand) * 30) : null;
      } else {
        days = Number(days);
      }

      if (days !== null && Number.isFinite(days)) {
        daysList.push(days);
        if (days <= 10) lowAlerts += 1;
        if (days <= 5) criticalAlerts += 1;
      }
    });

    const averageCoverage =
      daysList.length > 0
        ? Math.round(
            daysList.reduce((acc, val) => acc + val, 0) / daysList.length
          )
        : 0;

    // Mes de referencia para la cobertura (último mes con datos)
    let coverageMonthLabel = '';
    if (demand.length > 0) {
      const sorted = [...demand].sort((a, b) => {
        const aDate = new Date(a.monthOfSupply || a.createdDate || 0).getTime();
        const bDate = new Date(b.monthOfSupply || b.createdDate || 0).getTime();
        return bDate - aDate;
      });
      const last = sorted[0];
      if (last) {
        const raw = last.monthOfSupply || last.createdDate;
        const d = raw ? new Date(raw) : null;
        if (d && !Number.isNaN(d.getTime())) {
          const formatter = new Intl.DateTimeFormat(
            isEs ? 'es-CL' : 'en-US',
            { month: 'long', year: 'numeric' }
          );
          coverageMonthLabel = formatter.format(d);
        } else if (raw) {
          coverageMonthLabel = raw;
        }
      }
    }

    return [
      {
        title: isEs ? 'Licitaciones Activas' : 'Active Tenders',
        value: String(activeTenders.length),
        subtitle: isEs
          ? `${pendingTenders.length} pendientes de respuesta`
          : `${pendingTenders.length} pending response`,
        icon: 'FileText',
        color: 'blue',
        trend: null,
        onClick: () => navigate('/tender-management'),
      },
      {
        title: isEs ? 'Importaciones Pendientes' : 'Pending Imports',
        value: String(pendingImports.length),
        subtitle: isEs
          ? `${seaPendingImports.length} en tránsito marítimo`
          : `${seaPendingImports.length} in sea transit`,
        icon: 'Truck',
        color: 'yellow',
        trend: null,
        onClick: () => navigate('/import-management'),
      },
      {
        title: isEs ? 'Alertas Stock Bajo' : 'Low Stock Alerts',
        value: String(lowAlerts),
        subtitle: isEs
          ? `${criticalAlerts} críticas`
          : `${criticalAlerts} critical`,
        icon: 'AlertTriangle',
        color: 'red',
        trend: null,
        onClick: () => navigate('/demand-forecasting'),
      },
      {
        title: isEs ? 'Cobertura Demanda Mensual' : 'Monthly Demand Coverage',
        value:
          daysList.length > 0
            ? `${averageCoverage} d`
            : isEs
            ? 'Sin datos'
            : 'No data',
        subtitle:
          coverageMonthLabel ||
          (isEs ? 'Mes no definido' : 'Month not defined'),
        icon: 'TrendingUp',
        color: 'green',
        trend: null,
        onClick: () => navigate('/demand-forecasting'),
      },
    ];
  }, [currentLanguage, tenderRows, importRows, demandRows, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Breadcrumb />
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {currentLanguage === 'es' ? 'Panel de Control' : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {currentLanguage === 'es'
                ? 'Visión general de las operaciones de la cadena de suministro de Pinnacle Chile'
                : 'Overview of Pinnacle Chile supply chain operations'}
            </p>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metricsData?.map((metric, index) => (
              <MetricsCard
                key={index}
                title={metric?.title}
                value={metric?.value}
                subtitle={metric?.subtitle}
                icon={metric?.icon}
                color={metric?.color}
                trend={metric?.trend}
                onClick={metric?.onClick}
              />
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left Column - Upcoming Arrivals */}
            <div className="lg:col-span-1">
              <UpcomingArrivals />
            </div>

            {/* Center Column - Recent Communications */}
            <div className="lg:col-span-1">
              <RecentCommunications />
            </div>

            {/* Right Column - Low Stock Alerts */}
            <div className="lg:col-span-1">
              <LowStockAlerts />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Demand Chart - Takes 2 columns on xl screens */}
            <div className="xl:col-span-2">
              <DemandChart />
            </div>

            {/* Quick Actions - Takes 1 column on xl screens */}
            <div className="xl:col-span-1">
              <QuickActions />
            </div>
          </div>

          {/* Real-time Status Indicator */}
          <div className="mt-8 flex items-center justify-center">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span>
                {currentLanguage === 'es'
                  ? 'Datos actualizados en tiempo real - Última actualización: '
                  : 'Real-time data updates - Last updated: '}
                {new Date().toLocaleTimeString(
                  currentLanguage === 'es' ? 'es-CL' : 'en-US'
                )}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

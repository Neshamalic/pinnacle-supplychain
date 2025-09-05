import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Breadcrumb from '../../components/ui/Breadcrumb';
import MetricsCard from './components/MetricsCard';
import UpcomingArrivals from './components/UpcomingArrivals';
import RecentCommunications from './components/RecentCommunications';
import LowStockAlerts from './components/LowStockAlerts';
import DemandChart from './components/DemandChart';
import QuickActions from './components/QuickActions';

const Dashboard = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const navigate = useNavigate();

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const metricsData = [
    {
      title: currentLanguage === 'es' ? 'Licitaciones Activas' : 'Active Tenders',
      value: '24',
      subtitle: currentLanguage === 'es' ? '6 pendientes de respuesta' : '6 pending response',
      icon: 'FileText',
      color: 'blue',
      trend: {
        direction: 'up',
        value: '+8%',
        label: currentLanguage === 'es' ? 'vs mes anterior' : 'vs last month'
      },
      onClick: () => navigate('/tender-management')
    },
    {
      title: currentLanguage === 'es' ? 'Importaciones Pendientes' : 'Pending Imports',
      value: '12',
      subtitle: currentLanguage === 'es' ? '3 en tránsito marítimo' : '3 in sea transit',
      icon: 'Truck',
      color: 'yellow',
      trend: {
        direction: 'down',
        value: '-2',
        label: currentLanguage === 'es' ? 'desde la semana pasada' : 'since last week'
      },
      onClick: () => navigate('/import-management')
    },
    {
      title: currentLanguage === 'es' ? 'Alertas Stock Bajo' : 'Low Stock Alerts',
      value: '8',
      subtitle: currentLanguage === 'es' ? '3 críticas' : '3 critical',
      icon: 'AlertTriangle',
      color: 'red',
      trend: {
        direction: 'up',
        value: '+3',
        label: currentLanguage === 'es' ? 'nuevas esta semana' : 'new this week'
      },
      onClick: () => navigate('/demand-forecasting')
    },
    {
      title: currentLanguage === 'es' ? 'Cobertura Demanda Mensual' : 'Monthly Demand Coverage',
      value: '87%',
      subtitle: currentLanguage === 'es' ? 'Agosto 2024' : 'August 2024',
      icon: 'TrendingUp',
      color: 'green',
      trend: {
        direction: 'up',
        value: '+5%',
        label: currentLanguage === 'es' ? 'vs objetivo' : 'vs target'
      },
      onClick: () => navigate('/demand-forecasting')
    }
  ];

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
              {currentLanguage === 'es' ?'Visión general de las operaciones de la cadena de suministro de Pinnacle Chile' :'Overview of Pinnacle Chile supply chain operations'
              }
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
                {currentLanguage === 'es' ?'Datos actualizados en tiempo real - Última actualización: ' :'Real-time data updates - Last updated: '
                }
                {new Date()?.toLocaleTimeString(currentLanguage === 'es' ? 'es-CL' : 'en-US')}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
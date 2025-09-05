import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Icon from '../../../components/AppIcon';

const DemandChart = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  const demandData = [
    {
      month: currentLanguage === 'es' ? 'Ene' : 'Jan',
      demand: 85000,
      coverage: 92,
      forecast: 88000
    },
    {
      month: currentLanguage === 'es' ? 'Feb' : 'Feb',
      demand: 92000,
      coverage: 88,
      forecast: 94000
    },
    {
      month: currentLanguage === 'es' ? 'Mar' : 'Mar',
      demand: 78000,
      coverage: 95,
      forecast: 82000
    },
    {
      month: currentLanguage === 'es' ? 'Abr' : 'Apr',
      demand: 105000,
      coverage: 82,
      forecast: 108000
    },
    {
      month: currentLanguage === 'es' ? 'May' : 'May',
      demand: 98000,
      coverage: 87,
      forecast: 102000
    },
    {
      month: currentLanguage === 'es' ? 'Jun' : 'Jun',
      demand: 112000,
      coverage: 79,
      forecast: 115000
    },
    {
      month: currentLanguage === 'es' ? 'Jul' : 'Jul',
      demand: 89000,
      coverage: 91,
      forecast: 92000
    },
    {
      month: currentLanguage === 'es' ? 'Ago' : 'Aug',
      demand: 0,
      coverage: 0,
      forecast: 96000
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-medium text-slate-900 mb-2">{label}</p>
          {payload?.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry?.color }}>
              {entry?.name}: {entry?.value?.toLocaleString()}
              {entry?.dataKey === 'coverage' ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">
          {currentLanguage === 'es' ? 'Tendencias de Demanda Mensual' : 'Monthly Demand Trends'}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              chartType === 'line' ?'bg-blue-100 text-blue-600' :'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon name="TrendingUp" size={16} />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              chartType === 'bar' ?'bg-blue-100 text-blue-600' :'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon name="BarChart3" size={16} />
          </button>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={demandData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="demand" 
                stroke="#1e40af" 
                strokeWidth={3}
                dot={{ fill: '#1e40af', strokeWidth: 2, r: 4 }}
                name={currentLanguage === 'es' ? 'Demanda Real' : 'Actual Demand'}
              />
              <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 3 }}
                name={currentLanguage === 'es' ? 'Pronóstico' : 'Forecast'}
              />
            </LineChart>
          ) : (
            <BarChart data={demandData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="demand" 
                fill="#1e40af"
                name={currentLanguage === 'es' ? 'Demanda Real' : 'Actual Demand'}
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="forecast" 
                fill="#0ea5e9"
                name={currentLanguage === 'es' ? 'Pronóstico' : 'Forecast'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">94.2K</p>
          <p className="text-sm text-slate-500">
            {currentLanguage === 'es' ? 'Promedio Mensual' : 'Monthly Average'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">+12.5%</p>
          <p className="text-sm text-slate-500">
            {currentLanguage === 'es' ? 'Crecimiento YoY' : 'YoY Growth'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">87%</p>
          <p className="text-sm text-slate-500">
            {currentLanguage === 'es' ? 'Cobertura Promedio' : 'Avg Coverage'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemandChart;
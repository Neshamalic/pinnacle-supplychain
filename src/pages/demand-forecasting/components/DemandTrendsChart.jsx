import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DemandTrendsChart = ({ currentLanguage, rows }) => {
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('6months');

  // Formatea un identificador "YYYY-MM" como "Jul 2024" o "Jul 2024" según idioma
  const formatMonthLabel = (ym) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const date = new Date(Number(y), Number(m) - 1);
    return date.toLocaleDateString(currentLanguage === 'es' ? 'es-ES' : 'en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Agregamos datos por mes para la gráfica
  const aggregatedData = useMemo(() => {
    const monthMap = {};
    rows?.forEach((r) => {
      if (!r.monthOfSupply) return;
      const key = r.monthOfSupply;
      if (!monthMap[key]) {
        monthMap[key] = {
          month: formatMonthLabel(key),
          actualDemand: 0,
          projectedDemand: 0,
          shipments: 0,
        };
      }
      monthMap[key].actualDemand += Number(r.historicalUnits || 0);
      monthMap[key].projectedDemand += Number(r.forecastUnits || 0);
      monthMap[key].shipments += Number(r.suggestedOrder || 0);
    });
    return Object.values(monthMap).sort(
      (a, b) => new Date(a.month) - new Date(b.month)
    );
  }, [rows, currentLanguage]);

  // Filtrado según rango de tiempo seleccionado
  const filteredData = useMemo(() => {
    if (!aggregatedData.length) return [];
    // Determina número de meses a mostrar
    const n = timeRange === '1year' ? 12 : timeRange === '6months' ? 6 : 3;
    return aggregatedData.slice(-n);
  }, [aggregatedData, timeRange]);

  const labels = {
    en: {
      title: "Demand Trends & Projections",
      actualDemand: "Actual Demand",
      projectedDemand: "Projected Demand",
      stockCoverage: "Stock Coverage (Days)",
      shipments: "Shipments",
      lineChart: "Line Chart",
      barChart: "Bar Chart",
      last3Months: "Last 3 Months",
      last6Months: "Last 6 Months",
      lastYear: "Last Year",
      exportChart: "Export Chart"
    },
    es: {
      title: "Tendencias y Proyecciones de Demanda",
      actualDemand: "Demanda Real",
      projectedDemand: "Demanda Proyectada",
      stockCoverage: "Cobertura Stock (Días)",
      shipments: "Envíos",
      lineChart: "Gráfico de Líneas",
      barChart: "Gráfico de Barras",
      last3Months: "Últimos 3 Meses",
      last6Months: "Últimos 6 Meses",
      lastYear: "Último Año",
      exportChart: "Exportar Gráfico"
    }
  };
  const t = labels[currentLanguage];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon name="TrendingUp" size={20} className="mr-2 text-blue-600" />
            {t.title}
          </h3>
          <div className="flex items-center space-x-3">
            {/* Botones de tipo de gráfico */}
            <div className="flex items-center space-x-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                iconName="TrendingUp"
                iconPosition="left"
              >
                {t.lineChart}
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                iconName="BarChart3"
                iconPosition="left"
              >
                {t.barChart}
              </Button>
            </div>
            {/* Botones de rango temporal */}
            <div className="flex items-center space-x-2">
              {['3months', '6months', '1year'].map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                >
                  {range === '3months'
                    ? t.last3Months
                    : range === '6months'
                    ? t.last6Months
                    : t.lastYear}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              iconName="Download"
              iconPosition="left"
            >
              {t.exportChart}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actualDemand"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name={t.actualDemand}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="projectedDemand"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  name={t.projectedDemand}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="shipments"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name={t.shipments}
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            ) : (
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="actualDemand"
                  fill="#3b82f6"
                  name={t.actualDemand}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="projectedDemand"
                  fill="#10b981"
                  name={t.projectedDemand}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="shipments"
                  fill="#f59e0b"
                  name={t.shipments}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        {/* Leyenda manual de colores */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700">{t.actualDemand}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">{t.projectedDemand}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-gray-700">{t.shipments}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemandTrendsChart;

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import Icon from '../../../components/AppIcon';

// ✅ Conecta con la hoja "demand"
import { useSheet } from '../../../lib/sheetsApi';
import { mapDemand } from '../../../lib/adapters';

const DemandChart = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // Datos reales desde Google Sheets (hoja: demand)
  const {
    rows: demandRows = [],
    loading,
    error,
  } = useSheet('demand', mapDemand);

  // Transformar filas → datos mensuales para el gráfico
  const demandData = useMemo(() => {
    const rows = demandRows || [];
    const monthlyTotals = {};

    rows.forEach((row) => {
      const monthKey = row.monthOfSupply || row.createdDate || 'N/A';

      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = {
          rawMonth: monthKey,
          demand: 0,
          forecast: 0,
          coverageSum: 0,
          coverageCount: 0,
        };
      }

      const demandUnits = Number(
        row.monthlyDemandUnits || row.historicalUnits || 0
      );
      const forecastUnits = Number(row.forecastUnits || 0);

      monthlyTotals[monthKey].demand += demandUnits;
      monthlyTotals[monthKey].forecast += forecastUnits;

      // Calcular cobertura (% de un mes) usando daysSupply o stock/demanda
      let daysSupply = row.daysSupply;
      if (daysSupply === null || daysSupply === undefined) {
        const stock = Number(row.currentStockUnits || 0);
        const demandForCoverage = Number(
          row.monthlyDemandUnits || row.forecastUnits || 0
        );
        daysSupply =
          demandForCoverage > 0
            ? Math.floor((stock / demandForCoverage) * 30)
            : null;
      } else {
        daysSupply = Number(daysSupply);
      }

      if (daysSupply !== null && Number.isFinite(daysSupply)) {
        const coveragePercent = (daysSupply / 30) * 100; // 30 días ~ 100%
        monthlyTotals[monthKey].coverageSum += coveragePercent;
        monthlyTotals[monthKey].coverageCount += 1;
      }
    });

    const lang = currentLanguage === 'es' ? 'es-CL' : 'en-US';

    // Pasar a arreglo ordenado por fecha
    const entries = Object.values(monthlyTotals).map((m) => {
      const d = new Date(m.rawMonth);
      let label = m.rawMonth;
      if (!Number.isNaN(d.getTime())) {
        const formatter = new Intl.DateTimeFormat(lang, {
          month: 'short',
          year: 'numeric',
        });
        label = formatter.format(d);
      }

      return {
        month: label,
        demand: m.demand,
        forecast: m.forecast,
        coverage:
          m.coverageCount > 0
            ? Math.round(m.coverageSum / m.coverageCount)
            : 0,
      };
    });

    entries.sort((a, b) => {
      const da = new Date(a.month).getTime();
      const db = new Date(b.month).getTime();
      if (Number.isNaN(da) || Number.isNaN(db)) {
        return a.month.localeCompare(b.month);
      }
      return da - db;
    });

    return entries;
  }, [demandRows, currentLanguage]);

  // Métricas resumen (abajo del gráfico)
  const summary = useMemo(() => {
    if (!demandData.length) {
      return {
        monthlyAverage: 0,
        trendPercent: 0,
        avgCoverage: 0,
      };
    }

    const totalDemand = demandData.reduce(
      (acc, item) => acc + (item.demand || 0),
      0
    );
    const monthlyAverage = totalDemand / demandData.length;

    let trendPercent = 0;
    if (demandData.length >= 2) {
      const last = demandData[demandData.length - 1].demand || 0;
      const prev = demandData[demandData.length - 2].demand || 0;
      if (prev > 0) {
        trendPercent = ((last - prev) / prev) * 100;
      }
    }

    const coverageList = demandData
      .map((d) => d.coverage)
      .filter((v) => Number.isFinite(v));
    const avgCoverage =
      coverageList.length > 0
        ? coverageList.reduce((a, b) => a + b, 0) / coverageList.length
        : 0;

    return {
      monthlyAverage,
      trendPercent,
      avgCoverage,
    };
  }, [demandData]);

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

  const isEs = currentLanguage === 'es';

  const monthlyAverageLabel = summary.monthlyAverage.toLocaleString();
  const trendSign = summary.trendPercent >= 0 ? '+' : '-';
  const trendValue = `${trendSign}${Math.abs(summary.trendPercent).toFixed(1)}%`;
  const coverageValue = `${summary.avgCoverage.toFixed(0)}%`;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between mb  -6">
        <h3 className="text-lg font-semibold text-slate-900">
          {isEs ? 'Tendencias de Demanda Mensual' : 'Monthly Demand Trends'}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              chartType === 'line'
                ? 'bg-blue-100 text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon name="TrendingUp" size={16} />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              chartType === 'bar'
                ? 'bg-blue-100 text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon name="BarChart3" size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 h-80 w-full">
        {loading || error ? (
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            {loading
              ? isEs
                ? 'Cargando datos de demanda…'
                : 'Loading demand data…'
              : isEs
              ? 'Error al cargar datos de demanda'
              : 'Error loading demand data'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart
                data={demandData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
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
                  name={isEs ? 'Demanda Real' : 'Actual Demand'}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 3 }}
                  name={isEs ? 'Pronóstico' : 'Forecast'}
                />
                <Line
                  type="monotone"
                  dataKey="coverage"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  name={isEs ? 'Cobertura (%)' : 'Coverage (%)'}
                />
              </LineChart>
            ) : (
              <BarChart
                data={demandData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
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
                  name={isEs ? 'Demanda Real' : 'Actual Demand'}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="forecast"
                  fill="#0ea5e9"
                  name={isEs ? 'Pronóstico' : 'Forecast'}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Resumen con datos reales */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-900">
            {monthlyAverageLabel}
          </p>
          <p className="text-sm text-slate-500">
            {isEs ? 'Promedio mensual (unidades)' : 'Monthly average (units)'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{trendValue}</p>
          <p className="text-sm text-slate-500">
            {isEs ? 'Cambio mensual' : 'Monthly change'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{coverageValue}</p>
          <p className="text-sm text-slate-500">
            {isEs ? 'Cobertura promedio' : 'Avg coverage'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemandChart;

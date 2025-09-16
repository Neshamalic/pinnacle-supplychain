import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const StockCoverageChart = ({ currentLanguage, rows }) => {
  const [viewType, setViewType] = useState('pie');

  // Calcula días de suministro por fila y clasifica el estado
  const items = useMemo(() => {
    return (rows || []).map((r) => {
      let daysSupply = r.daysSupply;
      if (daysSupply === null || daysSupply === undefined) {
        const stock = Number(r.currentStockUnits || 0);
        const demand = Number(r.monthlyDemandUnits || r.forecastUnits || 0);
        daysSupply = demand > 0 ? (stock / demand) * 30 : Infinity;
      }
      let status = 'high';
      if (daysSupply < 2) status = 'critical';
      else if (daysSupply >= 2 && daysSupply <= 5) status = 'low';
      else if (daysSupply > 5 && daysSupply <= 10) status = 'medium';
      return {
        product: r.productName || r.presentationCode || '',
        coverage: daysSupply,
        status,
      };
    });
  }, [rows]);

  // Distribución por rangos de cobertura
  const coverageDistribution = useMemo(() => {
    const dist = {
      critical: { count: 0, products: [] },
      low: { count: 0, products: [] },
      medium: { count: 0, products: [] },
      high: { count: 0, products: [] },
    };
    items.forEach((it) => {
      dist[it.status].count += 1;
      dist[it.status].products.push(it.product);
    });
    return [
      {
        category: currentLanguage === 'es' ? 'Crítico (<2 días)' : 'Critical (<2 days)',
        value: dist.critical.count,
        color: '#dc2626',
        products: dist.critical.products,
      },
      {
        category: currentLanguage === 'es' ? 'Bajo (2-5 días)' : 'Low (2-5 days)',
        value: dist.low.count,
        color: '#f59e0b',
        products: dist.low.products,
      },
      {
        category: currentLanguage === 'es' ? 'Medio (5-10 días)' : 'Medium (5-10 days)',
        value: dist.medium.count,
        color: '#3b82f6',
        products: dist.medium.products,
      },
      {
        category: currentLanguage === 'es' ? 'Alto (>10 días)' : 'High (>10 days)',
        value: dist.high.count,
        color: '#10b981',
        products: dist.high.products,
      },
    ];
  }, [items, currentLanguage]);

  // Datos para la barra: top 10 productos por cobertura
  const productCoverageData = useMemo(() => {
    // ordenamos por cobertura ascendente (críticos primero) y limitamos a 10
    return items
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 10)
      .map((it) => ({
        product: it.product,
        coverage: Number(it.coverage.toFixed(1)),
        status: it.status,
      }));
  }, [items]);

  // Métricas de cabecera
  const summary = useMemo(() => {
    const totalProducts = new Set(items.map((it) => it.product)).size;
    const averageCoverage =
      items.length > 0
        ? items.reduce((acc, it) => acc + it.coverage, 0) / items.length
        : 0;
    const criticalCount = items.filter((it) => it.status === 'critical').length;
    const healthyCount = items.filter((it) => it.status === 'high').length;
    return {
      totalProducts,
      averageCoverage: averageCoverage.toFixed(1),
      criticalItems: criticalCount,
      healthyStock: healthyCount,
    };
  }, [items]);

  const labels = {
    en: {
      title: "Stock Coverage Analysis",
      pieView: "Coverage Distribution",
      barView: "Product Coverage",
      totalProducts: "Total Products",
      averageCoverage: "Average Coverage",
      criticalItems: "Critical Items",
      healthyStock: "Healthy Stock",
      days: "days",
    },
    es: {
      title: "Análisis de Cobertura de Stock",
      pieView: "Distribución de Cobertura",
      barView: "Cobertura por Producto",
      totalProducts: "Total Productos",
      averageCoverage: "Cobertura Promedio",
      criticalItems: "Artículos Críticos",
      healthyStock: "Stock Saludable",
      days: "días",
    },
  };
  const t = labels[currentLanguage];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900 mb-2">{data?.category || label}</p>
          <p className="text-sm text-gray-600">
            {viewType === 'pie'
              ? `${data?.value} ${currentLanguage === 'es' ? 'productos' : 'products'}`
              : `${data?.coverage} ${t.days}`}
          </p>
          {data?.products && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">
                {currentLanguage === 'es' ? 'Productos:' : 'Products:'}
              </p>
              <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                {data.products.slice(0, 3).map((product, index) => (
                  <div key={index}>• {product}</div>
                ))}
                {data.products.length > 3 && (
                  <div className="text-gray-400">
                    +{data.products.length - 3} {currentLanguage === 'es' ? 'más' : 'more'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const getBarColor = (status) => {
    const colors = {
      critical: '#dc2626',
      low: '#f59e0b',
      medium: '#3b82f6',
      high: '#10b981',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon name="PieChart" size={20} className="mr-2 text-blue-600" />
            {t.title}
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('pie')}
              iconName="PieChart"
              iconPosition="left"
            >
              {t.pieView}
            </Button>
            <Button
              variant={viewType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('bar')}
              iconName="BarChart3"
              iconPosition="left"
            >
              {t.barView}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-800">{summary.totalProducts}</div>
            <div className="text-sm text-blue-600">{t.totalProducts}</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-800">{summary.averageCoverage}</div>
            <div className="text-sm text-green-600">{t.averageCoverage}</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-800">{summary.criticalItems}</div>
            <div className="text-sm text-red-600">{t.criticalItems}</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-800">{summary.healthyStock}</div>
            <div className="text-sm text-emerald-600">{t.healthyStock}</div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'pie' ? (
              <PieChart>
                <Pie
                  data={coverageDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value, percent }) =>
                    `${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {coverageDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={productCoverageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="product"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={12}
                  label={{ value: t.days, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="coverage"
                  radius={[2, 2, 0, 0]}
                  fill={(entry) => getBarColor(entry.status)}
                >
                  {productCoverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Leyenda Pie */}
        {viewType === 'pie' && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {coverageDistribution.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-700">{item.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockCoverageChart;

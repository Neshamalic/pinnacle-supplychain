import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const StockCoverageChart = ({ currentLanguage }) => {
  const [viewType, setViewType] = useState('pie');

  const stockCoverageData = [
    {
      category: currentLanguage === 'es' ? 'Crítico (<2 días)' : 'Critical (<2 days)',
      value: 3,
      color: '#dc2626',
      products: ['Metformin 850mg', 'Insulin 100IU', 'Warfarin 5mg']
    },
    {
      category: currentLanguage === 'es' ? 'Bajo (2-5 días)' : 'Low (2-5 days)',
      value: 7,
      color: '#f59e0b',
      products: ['Amoxicillin 250mg', 'Atorvastatin 20mg', 'Lisinopril 10mg', 'Metoprolol 50mg', 'Simvastatin 40mg', 'Amlodipine 5mg', 'Hydrochlorothiazide 25mg']
    },
    {
      category: currentLanguage === 'es' ? 'Medio (5-10 días)' : 'Medium (5-10 days)',
      value: 9,
      color: '#3b82f6',
      products: ['Paracetamol 500mg', 'Ibuprofen 400mg', 'Omeprazole 20mg', 'Losartan 50mg', 'Aspirin 100mg', 'Diclofenac 50mg', 'Cetirizine 10mg', 'Ranitidine 150mg', 'Furosemide 40mg']
    },
    {
      category: currentLanguage === 'es' ? 'Alto (>10 días)' : 'High (>10 days)',
      value: 5,
      color: '#10b981',
      products: ['Vitamin D3 1000IU', 'Calcium 500mg', 'Multivitamin', 'Omega-3 1000mg', 'Probiotics']
    }
  ];

  const productCoverageData = [
    { product: 'Metformin', coverage: 0.95, status: 'critical' },
    { product: 'Amoxicillin', coverage: 1.8, status: 'critical' },
    { product: 'Insulin', coverage: 1.2, status: 'critical' },
    { product: 'Atorvastatin', coverage: 3.2, status: 'low' },
    { product: 'Lisinopril', coverage: 4.1, status: 'low' },
    { product: 'Paracetamol', coverage: 6.0, status: 'medium' },
    { product: 'Omeprazole', coverage: 7.1, status: 'medium' },
    { product: 'Losartan', coverage: 8.0, status: 'medium' },
    { product: 'Vitamin D3', coverage: 15.2, status: 'high' },
    { product: 'Calcium', coverage: 12.8, status: 'high' }
  ];

  const labels = {
    en: {
      title: "Stock Coverage Analysis",
      pieView: "Coverage Distribution",
      barView: "Product Coverage",
      totalProducts: "Total Products",
      averageCoverage: "Average Coverage",
      criticalItems: "Critical Items",
      healthyStock: "Healthy Stock",
      days: "days"
    },
    es: {
      title: "Análisis de Cobertura de Stock",
      pieView: "Distribución de Cobertura",
      barView: "Cobertura por Producto",
      totalProducts: "Total Productos",
      averageCoverage: "Cobertura Promedio",
      criticalItems: "Artículos Críticos",
      healthyStock: "Stock Saludable",
      days: "días"
    }
  };

  const t = labels?.[currentLanguage];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload?.length) {
      const data = payload?.[0]?.payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <p className="font-medium text-gray-900 mb-2">{data?.category || label}</p>
          <p className="text-sm text-gray-600">
            {viewType === 'pie' 
              ? `${data?.value} ${currentLanguage === 'es' ? 'productos' : 'products'}`
              : `${data?.coverage} ${t?.days}`
            }
          </p>
          {data?.products && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">
                {currentLanguage === 'es' ? 'Productos:' : 'Products:'}
              </p>
              <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                {data?.products?.slice(0, 3)?.map((product, index) => (
                  <div key={index}>• {product}</div>
                ))}
                {data?.products?.length > 3 && (
                  <div className="text-gray-400">
                    +{data?.products?.length - 3} {currentLanguage === 'es' ? 'más' : 'more'}
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
      high: '#10b981'
    };
    return colors?.[status] || '#6b7280';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Icon name="PieChart" size={20} className="mr-2 text-blue-600" />
            {t?.title}
          </h3>
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewType === 'pie' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('pie')}
              iconName="PieChart"
              iconPosition="left"
            >
              {t?.pieView}
            </Button>
            <Button
              variant={viewType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewType('bar')}
              iconName="BarChart3"
              iconPosition="left"
            >
              {t?.barView}
            </Button>
          </div>
        </div>
      </div>
      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-800">24</div>
            <div className="text-sm text-blue-600">{t?.totalProducts}</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-800">6.2</div>
            <div className="text-sm text-green-600">{t?.averageCoverage}</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-800">3</div>
            <div className="text-sm text-red-600">{t?.criticalItems}</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-800">14</div>
            <div className="text-sm text-emerald-600">{t?.healthyStock}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'pie' ? (
              <PieChart>
                <Pie
                  data={stockCoverageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, value, percent }) => 
                    `${value} (${(percent * 100)?.toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockCoverageData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
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
                  label={{ value: t?.days, angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="coverage" 
                  radius={[2, 2, 0, 0]}
                  fill={(entry) => getBarColor(entry?.status)}
                >
                  {productCoverageData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry?.status)} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend for Pie Chart */}
        {viewType === 'pie' && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stockCoverageData?.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item?.color }}
                ></div>
                <span className="text-sm text-gray-700">{item?.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockCoverageChart;
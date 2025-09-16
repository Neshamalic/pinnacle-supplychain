import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// ✅ Conecta a tu Google Sheets
import { useSheet } from '../../../lib/sheetsApi';
import { mapDemand } from '../../../lib/adapters';

// Importa catálogo para enriquecer con productName y packageUnits
import { usePresentationCatalog } from '../../../lib/catalog';

const DemandPlanningTable = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // ✅ Trae filas desde la hoja "demand"
  const { rows: demandRows, loading, error } = useSheet('demand', mapDemand);

  // Enriquecemos las filas con productName y packageUnits a partir de la master table
  const { enrich } = usePresentationCatalog();
  const enrichedRows = useMemo(() => enrich(demandRows || []), [demandRows, enrich]);

  // Adaptamos los nombres que usa la UI
  const items = useMemo(() => {
    const safeNum = (v, d = 0) => (v === null || v === undefined || v === '' ? d : Number(v));
    return (enrichedRows ?? []).map((r) => {
      const currentStock  = safeNum(r.currentStockUnits);
      const monthlyDemand = safeNum(r.monthlyDemandUnits);
      const daysSupply =
        r.daysSupply !== null && r.daysSupply !== undefined
          ? Number(r.daysSupply)
          : monthlyDemand === 0
          ? Infinity
          : Math.floor((currentStock / monthlyDemand) * 30);

      return {
        id: `${r.monthOfSupply || 'NA'}-${r.presentationCode || Math.random()}`,
        product: r.productName || '',
        currentStock: currentStock,
        packagingUnits: safeNum(r.packageSize) || safeNum(r.packageUnits),
        forecastedDemand: monthlyDemand,
        suggestedOrder: safeNum(r.suggestedOrder),
        status: r.status || 'normal',
        daysSupply,
      };
    });
  }, [enrichedRows]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      critical: { color: 'bg-red-100 text-red-800', label: currentLanguage === 'es' ? 'Crítico' : 'Critical', icon: 'AlertTriangle' },
      urgent:   { color: 'bg-orange-100 text-orange-800', label: currentLanguage === 'es' ? 'Urgente' : 'Urgent',   icon: 'Clock' },
      normal:   { color: 'bg-blue-100 text-blue-800', label: currentLanguage === 'es' ? 'Normal' : 'Normal',       icon: 'Info' },
      optimal:  { color: 'bg-green-100 text-green-800', label: currentLanguage === 'es' ? 'Óptimo' : 'Optimal',    icon: 'CheckCircle' }
    };
    const config = statusConfig[status] || statusConfig.normal;
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon name={config.icon} size={12} className="mr-1" />
        {config.label}
      </div>
    );
  };

  const formatNumber = (num) =>
    new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US').format(num ?? 0);

  const formatPackagingInfo = (packagingUnits) =>
    `${packagingUnits ?? 0} ${currentLanguage === 'es' ? 'unidades' : 'units'}`;

  const calculateDaysOfSupply = (stock, demand) => {
    if (!demand) return Infinity;
    return Math.floor((stock / demand) * 30);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    const data = [...items];
    if (!sortConfig?.key) return data;
    data.sort((a, b) => {
      const aValue = a?.[sortConfig.key];
      const bValue = b?.[sortConfig.key];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [items, sortConfig]);

  const getSortIcon = (column) => {
    if (sortConfig?.key !== column) return <Icon name="ArrowUpDown" size={14} className="opacity-50" />;
    return sortConfig?.direction === 'asc' ? <Icon name="ArrowUp" size={14} /> : <Icon name="ArrowDown" size={14} />;
  };

  // ⏳ Loading / Error
  if (loading) return <div style={{ padding: 16 }}>Loading demand…</div>;
  if (error)   return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;

  return (
    <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">
          {currentLanguage === 'es' ? 'Planificación de Demanda' : 'Demand Planning'}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button onClick={() => handleSort('product')} className="flex items-center space-x-1 hover:text-foreground transition-colors">
                  <span>{currentLanguage === 'es' ? 'Producto' : 'Product'}</span>
                  {getSortIcon('product')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button onClick={() => handleSort('currentStock')} className="flex items-center space-x-1 hover:text-foreground transition-colors">
                  <span>{currentLanguage === 'es' ? 'Stock' : 'Stock'}</span>
                  {getSortIcon('currentStock')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>{currentLanguage === 'es' ? 'Empaque' : 'Package'}</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button onClick={() => handleSort('forecastedDemand')} className="flex items-center space-x-1 hover:text-foreground transition-colors">
                  <span>{currentLanguage === 'es' ? 'Demanda' : 'Demand'}</span>
                  {getSortIcon('forecastedDemand')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>{currentLanguage === 'es' ? 'Días Suministro' : 'Days Supply'}</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button onClick={() => handleSort('suggestedOrder')} className="flex items-center space-x-1 hover:text-foreground transition-colors">
                  <span>{currentLanguage === 'es' ? 'Orden Sugerida' : 'Suggested Order'}</span>
                  {getSortIcon('suggestedOrder')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>{currentLanguage === 'es' ? 'Estado' : 'Status'}</span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>{currentLanguage === 'es' ? 'Acciones' : 'Actions'}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((item) => {
              const days = item.daysSupply ?? calculateDaysOfSupply(item.currentStock, item.forecastedDemand);
              return (
                <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{item.product}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatNumber(item.currentStock)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-muted-foreground">{formatPackagingInfo(item.packagingUnits)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatNumber(item.forecastedDemand)}</div>
                    <div className="text-xs text-muted-foreground">
                      {currentLanguage === 'es' ? 'mensual' : 'monthly'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`font-medium ${
                        days === Infinity
                          ? ''
                          : days <= 15
                          ? 'text-red-600'
                          : days <= 30
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {days === Infinity ? '∞' : `${days}d`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{formatNumber(item.suggestedOrder)}</div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" iconName="ShoppingCart">
                        {currentLanguage === 'es' ? 'Ordenar' : 'Order'}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DemandPlanningTable;



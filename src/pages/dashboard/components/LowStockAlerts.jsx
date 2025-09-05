import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// ✅ Conecta a Google Sheets (hoja: "demand")
import { useSheet } from '../../../lib/sheetsApi';
import { mapDemand } from '../../../lib/adapters';

const LowStockAlerts = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const navigate = useNavigate();

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // Trae filas en formato normalizado por el adapter
  const { rows: demandRows, loading, error } = useSheet('demand', mapDemand);

  // Transformar filas de demanda → alertas de bajo stock
  const alerts = useMemo(() => {
    const rows = demandRows ?? [];

    const toNum = (v, d = 0) =>
      v === null || v === undefined || v === '' ? d : Number(v);

    return rows
      .map((r, idx) => {
        const product = r.productName || '';
        const currentStock = toNum(r.currentStockUnits);
        const packagingUnits = toNum(r.packageSize);
        const monthlyDemand = toNum(r.monthlyDemandUnits);
        // días de cobertura (si viene en la hoja lo usamos; si no, lo calculamos)
        const daysSupply =
          r.daysSupply !== null && r.daysSupply !== undefined
            ? Number(r.daysSupply)
            : monthlyDemand === 0
            ? Infinity
            : Math.floor((currentStock / monthlyDemand) * 30);

        // Umbral mínimo (simple): 1.25 meses de demanda
        const minThreshold = Math.round(monthlyDemand * 1.25);

        // Severidad según días restantes
        let status = 'warning';
        if (daysSupply <= 10) status = 'critical';
        else if (daysSupply <= 20) status = 'low';

        return {
          id: `${r.presentationCode || idx}`,
          product,
          currentStock,
          packagingUnits,
          minThreshold,
          daysRemaining: daysSupply,
          status,
        };
      })
      // solo alertas con <= 30 días de cobertura (como el mock)
      .filter(a => a.daysRemaining !== Infinity && a.daysRemaining <= 30)
      // las más críticas primero
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [demandRows]);

  const getStatusBadge = (status, days) => {
    const statusConfig = {
      critical: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: currentLanguage === 'es' ? 'Crítico' : 'Critical',
        icon: 'AlertTriangle'
      },
      low: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: currentLanguage === 'es' ? 'Bajo' : 'Low',
        icon: 'AlertCircle'
      },
      warning: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: currentLanguage === 'es' ? 'Alerta' : 'Warning',
        icon: 'Clock'
      }
    };

    const config = statusConfig[status] || statusConfig.warning;
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded border text-xs font-medium ${config.color}`}>
        <Icon name={config.icon} size={12} className="mr-1" />
        <span>{config.label}</span>
        <span className="ml-1">({days}d)</span>
      </div>
    );
  };

  const formatNumber = (num) =>
    new Intl.NumberFormat(currentLanguage === 'es' ? 'es-CL' : 'en-US').format(num ?? 0);

  const formatPackagingInfo = (packagingUnits) =>
    `${packagingUnits ?? 0} ${currentLanguage === 'es' ? 'unidades/empaque' : 'units/package'}`;

  // ⏳ Loading / Error
  if (loading) return <div className="bg-card rounded-lg border border-border p-6 shadow-soft">Loading alerts…</div>;
  if (error)   return <div className="bg-card rounded-lg border border-border p-6 shadow-soft text-red-600">Error: {error}</div>;

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Icon name="AlertTriangle" size={20} className="text-red-500" />
          <h3 className="text-lg font-semibold text-foreground">
            {currentLanguage === 'es' ? 'Alertas de Stock Bajo' : 'Low Stock Alerts'}
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/demand-forecasting')}
          iconName="ExternalLink"
          iconPosition="right"
        >
          {currentLanguage === 'es' ? 'Ver Todo' : 'View All'}
        </Button>
      </div>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-4 bg-muted/50 rounded-lg border-l-4 border-l-red-400 hover:bg-muted transition-colors cursor-pointer"
            onClick={() => navigate('/demand-forecasting')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground text-sm">{alert.product}</h4>
                  {getStatusBadge(alert.status, alert.daysRemaining)}
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{currentLanguage === 'es' ? 'Stock actual:' : 'Current stock:'}</span>
                    <span className="font-medium">{formatNumber(alert.currentStock)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{currentLanguage === 'es' ? 'Empaque:' : 'Package:'}</span>
                    <span className="font-medium">{formatPackagingInfo(alert.packagingUnits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{currentLanguage === 'es' ? 'Umbral mín:' : 'Min threshold:'}</span>
                    <span className="font-medium">{formatNumber(alert.minThreshold)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        alert.status === 'critical'
                          ? 'bg-red-500'
                          : alert.status === 'low'
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                      style={{
                        width: `${Math.max(10, (alert.currentStock / Math.max(1, alert.minThreshold)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="text-center py-8">
          <Icon name="CheckCircle" size={48} className="mx-auto text-green-500 mb-3" />
          <p className="text-sm text-muted-foreground">
            {currentLanguage === 'es' ? 'No hay alertas de stock bajo' : 'No low stock alerts'}
          </p>
        </div>
      )}
    </div>
  );
};

export default LowStockAlerts;

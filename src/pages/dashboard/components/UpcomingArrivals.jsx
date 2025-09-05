import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// ✅ Conecta a Google Sheets (hoja: "imports")
import { useSheet } from '../../../lib/sheetsApi';
import { mapImports } from '../../../lib/adapters';

const UpcomingArrivals = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const navigate = useNavigate();

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // Trae filas normalizadas por el adapter
  const { rows: importsRows, loading, error } = useSheet('imports', mapImports);

  // Transformamos imports → “arrivals” (lo más próximo primero)
  const arrivals = useMemo(() => {
    const rows = importsRows ?? [];
    const now = new Date();

    const daysTo = (d) => {
      if (!d) return 9999;
      const diff = (new Date(d).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return Math.ceil(diff);
    };

    const statusFrom = (row) => {
      const cs = (row.customsStatus || '').toLowerCase();
      if (cs === 'in-clearance' || cs === 'pending') return 'customs';
      const etaFuture = row.arrivalDate && new Date(row.arrivalDate) > now;
      return etaFuture ? 'in-transit' : 'scheduled';
    };

    const priorityFromDays = (d) => {
      if (d <= 7) return 'high';
      if (d <= 14) return 'medium';
      return 'low';
    };

    const transportLabel = (t) => {
      if (t === 'air') return currentLanguage === 'es' ? 'Aéreo' : 'Air';
      if (t === 'sea') return currentLanguage === 'es' ? 'Marítimo' : 'Sea';
      return currentLanguage === 'es' ? 'Transporte' : 'Transport';
    };

    return rows
      .map((r, idx) => {
        const dleft = daysTo(r.arrivalDate);
        return {
          id: r.id || r.shipmentId || idx,
          shipmentId: r.shipmentId || '—',
          eta: r.arrivalDate || null,
          port: r.destinationPort || '—',
          status: statusFrom(r),                // 'in-transit' | 'customs' | 'scheduled'
          priority: priorityFromDays(dleft),    // 'high' | 'medium' | 'low'
          // Descripción en lugar de “products” del mock
          description: `${transportLabel(r.transportType)} · ${r.originPort || '—'} → ${r.destinationPort || '—'}`,
        };
      })
      // solo futuras o en proceso (si no hay fecha, quedan al final)
      .filter(a => !a.eta || new Date(a.eta) >= new Date(new Date().toDateString()))
      // ordenar por ETA ascendente (sin ETA van al final)
      .sort((a, b) => {
        const ta = a.eta ? new Date(a.eta).getTime() : Infinity;
        const tb = b.eta ? new Date(b.eta).getTime() : Infinity;
        return ta - tb;
      });
  }, [importsRows, currentLanguage]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      'in-transit': {
        color: 'bg-blue-100 text-blue-800',
        label: currentLanguage === 'es' ? 'En Tránsito' : 'In Transit',
        icon: 'Truck'
      },
      'customs': {
        color: 'bg-yellow-100 text-yellow-800',
        label: currentLanguage === 'es' ? 'En Aduana' : 'At Customs',
        icon: 'Clock'
      },
      'scheduled': {
        color: 'bg-gray-100 text-gray-800',
        label: currentLanguage === 'es' ? 'Programado' : 'Scheduled',
        icon: 'Calendar'
      }
    };
    const config = statusConfig[status] || statusConfig.scheduled;
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon name={config.icon} size={12} className="mr-1" />
        {config.label}
      </div>
    );
  };

  const getPriorityIndicator = (priority) => {
    const colors = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' };
    return <div className={`w-2 h-2 rounded-full ${colors[priority] || colors.low}`} />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLanguage === 'es' ? 'es-CL' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // ⏳ Loading / Error
  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
        {currentLanguage === 'es' ? 'Cargando llegadas…' : 'Loading arrivals…'}
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 shadow-soft text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-soft">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Icon name="Ship" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            {currentLanguage === 'es' ? 'Próximas Llegadas' : 'Upcoming Arrivals'}
          </h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/import-management')}
          iconName="ExternalLink"
          iconPosition="right"
        >
          {currentLanguage === 'es' ? 'Ver Todo' : 'View All'}
        </Button>
      </div>

      <div className="space-y-4">
        {arrivals.map((arrival) => (
          <div
            key={arrival.id}
            className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            onClick={() => navigate('/import-management')}
          >
            <div className="flex-shrink-0">{getPriorityIndicator(arrival.priority)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-foreground truncate">{arrival.shipmentId}</p>
                <span className="text-xs text-muted-foreground">{formatDate(arrival.eta)}</span>
              </div>

              <p className="text-xs text-muted-foreground truncate">{arrival.description}</p>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{arrival.port}</span>
                {getStatusBadge(arrival.status)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {arrivals.length === 0 && (
        <div className="text-center py-8">
          <Icon name="Ship" size={48} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {currentLanguage === 'es' ? 'No hay llegadas programadas' : 'No scheduled arrivals'}
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingArrivals;

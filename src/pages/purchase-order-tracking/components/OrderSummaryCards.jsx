import React, { useMemo } from 'react';
import Icon from '../../../components/AppIcon';

import { useSheet } from '../../../lib/sheetsApi';
import { mapPurchaseOrders } from '../../../lib/adapters';

const OrderSummaryCards = ({ currentLanguage }) => {
  // 1) Traer órdenes reales desde Google Sheets
  const { rows: orders = [], loading, error } = useSheet('purchase_orders', mapPurchaseOrders);

  // Helpers
  const t = (es, en) => (currentLanguage === 'es' ? es : en);
  const toDate = (d) => (d ? new Date(d) : null);
  const daysBetween = (d1, d2) => {
    if (!d1 || !d2) return null;
    const ms = Math.abs(toDate(d2) - toDate(d1));
    return Math.round(ms / (1000 * 60 * 60 * 24));
  };

  // 2) Calcular KPIs y “tendencias” simples
  const {
    total,
    inProcess,
    ready,
    shipped,
    avgProdDaysLabel,
    totalChangePctLabel,
    inProcessChangeLabel,
    readyChangeLabel,
    shippedChangeLabel,
  } = useMemo(() => {
    const now = new Date();
    const start30 = new Date(now); start30.setDate(now.getDate() - 30);
    const prevStart30 = new Date(now); prevStart30.setDate(now.getDate() - 60);
    const prevEnd30 = new Date(now); prevEnd30.setDate(now.getDate() - 31);

    // Filtro por fecha de creación para comparar períodos
    const createdIn = (row, start, end) => {
      const d = row?.createdDate ? new Date(row.createdDate) : null;
      return d && d >= start && d <= end;
    };

    const all = orders;

    const totalNow = all.length;
    const totalPrev = all.filter(r => createdIn(r, prevStart30, prevEnd30)).length;
    const totalChangePct =
      totalPrev > 0 ? Math.round(((totalNow - totalPrev) / totalPrev) * 100) : null;

    const isStatus = (s) => (row) =>
      String(row?.manufacturingStatus || '').toLowerCase() === s;

    const nowRangeMatch = (row) => createdIn(row, start30, now);
    const prevRangeMatch = (row) => createdIn(row, prevStart30, prevEnd30);

    const inProcNow = all.filter(isStatus('in-process')).length;
    const readyNow  = all.filter(isStatus('ready')).length;
    const shippedNow= all.filter(isStatus('shipped')).length;

    const inProcPrev = all.filter((r) => isStatus('in-process')(r) && prevRangeMatch(r)).length;
    const readyPrev  = all.filter((r) => isStatus('ready')(r) && prevRangeMatch(r)).length;
    const shippedPrev= all.filter((r) => isStatus('shipped')(r) && prevRangeMatch(r)).length;

    const diffLabel = (nowVal, prevVal) => {
      if (prevVal === null || prevVal === undefined) return null;
      const diff = nowVal - prevVal;
      if (diff === 0) return '±0';
      return diff > 0 ? `+${diff}` : `${diff}`;
    };

    // Promedio de “tiempo de producción” ~ diferencia entre createdDate y eta (si existen)
    const diffs = all
      .map((r) => daysBetween(r.createdDate, r.eta))
      .filter((n) => typeof n === 'number' && isFinite(n));
    const avgDays =
      diffs.length > 0
        ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
        : null;

    const avgProdDaysLabel =
      avgDays !== null ? `${avgDays} ${t('días', 'days')}` : '—';

    return {
      total: totalNow,
      inProcess: inProcNow,
      ready: readyNow,
      shipped: shippedNow,
      avgProdDaysLabel,
      totalChangePctLabel:
        totalChangePct === null ? '—' : `${totalChangePct > 0 ? '+' : ''}${totalChangePct}%`,
      inProcessChangeLabel: diffLabel(inProcNow, inProcPrev) ?? '—',
      readyChangeLabel: diffLabel(readyNow, readyPrev) ?? '—',
      shippedChangeLabel: diffLabel(shippedNow, shippedPrev) ?? '—',
    };
  }, [orders, currentLanguage]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-6 shadow-soft animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: 16, color: 'red' }}>Error: {error}</div>;
  }

  // 3) Definición de tarjetas (icono/colores) + valores calculados
  const cards = [
    {
      id: 'total-orders',
      title: t('Órdenes Totales', 'Total Orders'),
      value: total,
      change: totalChangePctLabel,
      changeType: (totalChangePctLabel || '').startsWith('-') ? 'negative' : 'positive',
      icon: 'ShoppingCart',
      color: 'bg-blue-500',
    },
    {
      id: 'in-process',
      title: t('En Proceso', 'In Process'),
      value: inProcess,
      change: inProcessChangeLabel,
      changeType: (inProcessChangeLabel || '').startsWith('-') ? 'negative' : 'positive',
      icon: 'Clock',
      color: 'bg-amber-500',
    },
    {
      id: 'ready',
      title: t('Listo', 'Ready'),
      value: ready,
      change: readyChangeLabel,
      changeType: (readyChangeLabel || '').startsWith('-') ? 'negative' : 'positive',
      icon: 'CheckCircle',
      color: 'bg-green-500',
    },
    {
      id: 'shipped',
      title: t('Enviado', 'Shipped'),
      value: shipped,
      change: shippedChangeLabel,
      changeType: (shippedChangeLabel || '').startsWith('-') ? 'negative' : 'positive',
      icon: 'Truck',
      color: 'bg-purple-500',
    },
    {
      id: 'avg-timeline',
      title: t('Tiempo Promedio', 'Avg. Production Time'),
      value: avgProdDaysLabel,
      change: '—',
      changeType: 'positive',
      icon: 'Calendar',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {cards.map((item) => (
        <div key={item.id} className="bg-card rounded-lg border border-border p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <div className={`${item.color} rounded-lg p-3`}>
              <Icon name={item.icon} size={24} color="white" />
            </div>
            <div
              className={`text-sm font-medium ${
                item.changeType === 'negative' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {item.change}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-foreground">{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderSummaryCards;

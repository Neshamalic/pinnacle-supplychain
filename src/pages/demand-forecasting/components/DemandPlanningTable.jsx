import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

// Conecta a tu Google Sheets
import { useSheet } from '../../../lib/sheetsApi';
import { mapDemand } from '../../../lib/adapters';

// Importa el catálogo de presentaciones para añadir productName y packageUnits
import { usePresentationCatalog } from '../../../lib/catalog';

const DemandPlanningTable = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setCurrentLanguage(savedLanguage);
  }, []);

  // Lee la hoja "demand" con el adaptador mapDemand
  const { rows: demandRows, loading, error } = useSheet('demand', mapDemand);

  // Obtiene la función enrich para añadir productName y packageUnits a cada fila
  const { enrich } = usePresentationCatalog();
  // Aplica enrich a las filas de demand
  const enrichedRows = useMemo(() => enrich(demandRows || []), [demandRows, enrich]);

  // Adapta los nombres de las columnas para la UI
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
        product: r.productName || '',   // Ya no se mostrará en blanco
        currentStock: currentStock,
        packagingUnits: safeNum(r.packageSize) || safeNum(r.packageUnits), // usa packageUnits si packageSize no existe
        forecastedDemand: monthlyDemand,
        suggestedOrder: safeNum(r.suggestedOrder),
        status: r.status || 'normal',
        daysSupply,
      };
    });
  }, [enrichedRows]);

  const getStatusBadge = (status) => {
  ...

  // (El resto del componente permanece igual: ordenación, renderizado de la tabla, etc.)
  // Copia el código del mensaje anterior o conserva tu implementación actual.

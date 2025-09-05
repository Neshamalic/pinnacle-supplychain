import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';

const Breadcrumb = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const routeLabels = {
    '/dashboard': { en: 'Dashboard', es: 'Panel de Control' },
    '/tender-management': { en: 'Tender Management', es: 'Gestión de Licitaciones' },
    '/purchase-order-tracking': { en: 'Purchase Order Tracking', es: 'Seguimiento de Órdenes' },
    '/import-management': { en: 'Import Management', es: 'Gestión de Importaciones' },
    '/demand-forecasting': { en: 'Demand Forecasting', es: 'Pronóstico de Demanda' },
    '/communications-log': { en: 'Communications Log', es: 'Registro de Comunicaciones' }
  };

  const getCurrentLanguage = () => {
    return localStorage.getItem('language') || 'en';
  };

  const getLabel = (path) => {
    const language = getCurrentLanguage();
    return routeLabels?.[path]?.[language] || path?.replace('/', '')?.replace('-', ' ');
  };

  const generateBreadcrumbs = () => {
    const pathSegments = location?.pathname?.split('/')?.filter(segment => segment);
    const breadcrumbs = [
      { path: '/dashboard', label: getLabel('/dashboard'), isHome: true }
    ];

    if (location?.pathname !== '/dashboard') {
      breadcrumbs?.push({
        path: location?.pathname,
        label: getLabel(location?.pathname),
        isHome: false
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  const handleBreadcrumbClick = (path) => {
    navigate(path);
  };

  return (
    <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
      {breadcrumbs?.map((breadcrumb, index) => (
        <div key={breadcrumb?.path} className="flex items-center">
          {index > 0 && (
            <Icon 
              name="ChevronRight" 
              size={16} 
              className="breadcrumb-separator" 
            />
          )}
          
          {breadcrumb?.isHome ? (
            <button
              onClick={() => handleBreadcrumbClick(breadcrumb?.path)}
              className="breadcrumb-item flex items-center space-x-1"
              aria-label="Go to dashboard"
            >
              <Icon name="Home" size={16} />
              <span>{breadcrumb?.label}</span>
            </button>
          ) : index === breadcrumbs?.length - 1 ? (
            <span className="text-foreground font-medium">
              {breadcrumb?.label}
            </span>
          ) : (
            <button
              onClick={() => handleBreadcrumbClick(breadcrumb?.path)}
              className="breadcrumb-item"
            >
              {breadcrumb?.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
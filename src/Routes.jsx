// src/Routes.jsx
import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Páginas que SÍ existen en tu árbol
const Dashboard = lazy(() => import('./pages/dashboard'));
const DemandForecasting = lazy(() => import('./pages/demand-forecasting'));
const ImportManagement = lazy(() => import('./pages/import-management'));
const PurchaseOrderTracking = lazy(() => import('./pages/purchase-order-tracking'));
const TenderManagement = lazy(() => import('./pages/tender-management'));
const CommunicationsLog = lazy(() => import('./pages/communications-log'));

// Este archivo existe como archivo suelto (ojo con mayúsculas/minúsculas)
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Scroll al top en cada cambio de ruta (reemplaza al viejo "components/ScrollToTop")
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/demand-forecasting" element={<DemandForecasting />} />
          <Route path="/import-management" element={<ImportManagement />} />
          <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
          <Route path="/tender-management" element={<TenderManagement />} />
          <Route path="/communications-log" element={<CommunicationsLog />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

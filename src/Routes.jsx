// src/Routes.jsx
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/dashboard'));
const DemandForecasting = lazy(() => import('./pages/demand-forecasting'));
const ImportManagement = lazy(() => import('./pages/import-management'));
const PurchaseOrderTracking = lazy(() => import('./pages/purchase-order-tracking'));
const TenderManagement = lazy(() => import('./pages/tender-management'));
const CommunicationsLog = lazy(() => import('./pages/communications-log'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

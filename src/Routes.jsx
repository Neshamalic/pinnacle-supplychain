// src/Routes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";          // <- sin alias
import ScrollToTop from "./components/ScrollToTop";   // <- sin alias
import NotFound from "./pages/NotFound.jsx";

// Si no tienes /dashboard, cambia por "/communications-log"
const DEFAULT_HOME = "/dashboard";

// Lazy imports, usando index.jsx dentro de cada carpeta
const Dashboard             = lazy(() => import("./pages/dashboard/index.jsx"));
const TenderManagement      = lazy(() => import("./pages/tender-management/index.jsx"));
const PurchaseOrderTracking = lazy(() => import("./pages/purchase-order-tracking/index.jsx"));
const ImportManagement      = lazy(() => import("./pages/import-management/index.jsx"));
const DemandForecasting     = lazy(() => import("./pages/demand-forecasting/index.jsx"));
const CommunicationsLog     = lazy(() => import("./pages/communications-log/index.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <ScrollToTop />
      <Routes>
        {/* Todo lo que está dentro usa el header/sidebar del AppLayout */}
        <Route element={<AppLayout />}>
          {/* Home */}
          <Route index element={<Navigate to={DEFAULT_HOME} replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Secciones */}
          <Route path="/tender-management" element={<TenderManagement />} />
          <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
          <Route path="/import-management" element={<ImportManagement />} />
          <Route path="/demand-forecasting" element={<DemandForecasting />} />
          <Route path="/communications-log" element={<CommunicationsLog />} />

          {/* Aliases/compatibilidad */}
          <Route path="/communications" element={<Navigate to="/communications-log" replace />} />
          <Route path="/tenders" element={<Navigate to="/tender-management" replace />} />
          <Route path="/procurement" element={<Navigate to="/import-management" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

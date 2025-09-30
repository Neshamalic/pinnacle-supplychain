// src/Routes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound.jsx";

// Si no tienes /dashboard aún, cambia DEFAULT_HOME a "/communications-log"
const DEFAULT_HOME = "/dashboard";

// Carga diferida de páginas reales que existen en tu repo
const Dashboard             = lazy(() => import("./pages/dashboard/index.jsx"));
const TenderManagement      = lazy(() => import("./pages/tender-management/index.jsx"));
const PurchaseOrderTracking = lazy(() => import("./pages/purchase-order-tracking/index.jsx"));
const ImportManagement      = lazy(() => import("./pages/import-management/index.jsx"));
const CommunicationsLog     = lazy(() => import("./pages/communications-log/index.jsx"));
const DemandForecasting     = lazy(() => import("./pages/demand-forecasting/index.jsx"));

// Nueva página de analytics de ventas (usar index.jsx dentro de sales-analytics)
const SalesAnalytics        = lazy(() => import("./pages/sales-analytics/index.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <ScrollToTop />
      <Routes>
        {/* Todo cuelga del AppLayout para que SIEMPRE veas el header */}
        <Route element={<AppLayout />}>
          {/* Home */}
          <Route index element={<Navigate to={DEFAULT_HOME} replace />} />

          {/* Rutas válidas */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tender-management" element={<TenderManagement />} />
          <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
          <Route path="/import-management" element={<ImportManagement />} />
          <Route path="/communications-log" element={<CommunicationsLog />} />
          <Route path="/demand-forecasting" element={<DemandForecasting />} />

          {/* Nueva ruta de ventas */}
          <Route path="/sales-analytics" element={<SalesAnalytics />} />

          {/* Aliases por compatibilidad */}
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

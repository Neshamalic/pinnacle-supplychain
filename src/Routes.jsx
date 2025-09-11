// src/Routes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound.jsx";

// Si tu dashboard existe, déjalo como HOME; si no, cambia a "/communications-log"
const DEFAULT_HOME = "/dashboard";

const CommunicationsLog     = lazy(() => import("./pages/communications-log/index.jsx"));
const DemandForecasting     = lazy(() => import("./pages/demand-forecasting/index.jsx"));
const ImportManagement      = lazy(() => import("./pages/import-management/index.jsx"));
const PurchaseOrderTracking = lazy(() => import("./pages/purchase-order-tracking/index.jsx"));
const TenderManagement      = lazy(() => import("./pages/tender-management/index.jsx"));
const Dashboard             = lazy(() => import("./pages/dashboard/index.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <ScrollToTop />
      <Routes>
        {/* Toda la app bajo el layout => vuelve a aparecer la barra superior */}
        <Route element={<AppLayout />}>
          {/* home */}
          <Route path="/" element={<Navigate to={DEFAULT_HOME} replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* páginas */}
          <Route path="/communications-log" element={<CommunicationsLog />} />
          <Route path="/demand-forecasting" element={<DemandForecasting />} />
          <Route path="/import-management" element={<ImportManagement />} />
          <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
          <Route path="/tender-management" element={<TenderManagement />} />

          {/* aliases opcionales */}
          <Route path="/communications" element={<Navigate to="/communications-log" replace />} />
          <Route path="/tenders" element={<Navigate to="/tender-management" replace />} />
          <Route path="/procurement" element={<Navigate to="/import-management" replace />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

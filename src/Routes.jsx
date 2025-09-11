// src/Routes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import ScrollToTop from "@/components/ScrollToTop";
import NotFound from "@/pages/NotFound.jsx";

// Si no tienes /dashboard, cambia DEFAULT_HOME a la ruta que quieras por defecto.
const DEFAULT_HOME = "/dashboard";

// Lazy pages (usa los index.jsx de cada carpeta)
const Dashboard             = lazy(() => import("@/pages/dashboard"));
const TenderManagement      = lazy(() => import("@/pages/tender-management"));
const PurchaseOrderTracking = lazy(() => import("@/pages/purchase-order-tracking"));
const ImportManagement      = lazy(() => import("@/pages/import-management"));
const DemandForecasting     = lazy(() => import("@/pages/demand-forecasting"));
const CommunicationsLog     = lazy(() => import("@/pages/communications-log")); // wrapper con header

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <ScrollToTop />
      <Routes>
        {/* Todo lo interno usa el header/sidebar del AppLayout */}
        <Route element={<AppLayout />}>
          {/* Home */}
          <Route index element={<Navigate to={DEFAULT_HOME} replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Secciones */}
          <Route path="/tender-management" element={<TenderManagement />} />
          <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
          <Route path="/import-management" element={<ImportManagement />} />
          <Route path="/demand-forecasting" element={<DemandForecasting />} />
          <Route path="/communications" element={<CommunicationsLog />} />

          {/* Aliases/compatibilidad */}
          <Route path="/communications-log" element={<Navigate to="/communications" replace />} />
          <Route path="/tenders" element={<Navigate to="/tender-management" replace />} />
          <Route path="/procurement" element={<Navigate to="/import-management" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

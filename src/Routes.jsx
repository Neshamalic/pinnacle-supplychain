// src/Routes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound.jsx";

const CommunicationsLog = lazy(() => import("./pages/communications-log/index.jsx"));
const DemandForecasting = lazy(() => import("./pages/demand-forecasting/index.jsx"));
const ImportManagement = lazy(() => import("./pages/import-management/index.jsx"));
const PurchaseOrderTracking = lazy(() => import("./pages/purchase-order-tracking/index.jsx"));
const TenderManagement = lazy(() => import("./pages/tender-management/index.jsx"));
const Dashboard = lazy(() => import("./pages/dashboard/index.jsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <ScrollToTop />
      <Routes>
        {/* Redirige la raíz a /dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/communications-log" element={<CommunicationsLog />} />
        <Route path="/demand-forecasting" element={<DemandForecasting />} />
        <Route path="/import-management" element={<ImportManagement />} />
        <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
        <Route path="/tender-management" element={<TenderManagement />} />

        {/* Alias antiguos (si los usaste alguna vez) */}
        <Route path="/tenders" element={<Navigate to="/tender-management" replace />} />
        <Route path="/procurement" element={<Navigate to="/import-management" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

// src/Routes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import NotFound from "./pages/NotFound.jsx";

// 👇 Ajusta este HOME por una ruta que SÍ exista en tu repo.
// Si NO tienes /dashboard, cambia a "/communications-log".
const DEFAULT_HOME = "/dashboard";

const CommunicationsLog      = lazy(() => import("./pages/communications-log/index.jsx"));
const DemandForecasting      = lazy(() => import("./pages/demand-forecasting/index.jsx"));
const ImportManagement       = lazy(() => import("./pages/import-management/index.jsx"));
const PurchaseOrderTracking  = lazy(() => import("./pages/purchase-order-tracking/index.jsx"));
const TenderManagement       = lazy(() => import("./pages/tender-management/index.jsx"));
const Dashboard              = lazy(() => import("./pages/dashboard/index.jsx")); // si no existe, borra esta línea y su <Route>

export default function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading…</div>}>
      <ScrollToTop />
      <Routes>
        {/* Redirige la raíz a la sección que sí existe */}
        <Route path="/" element={<Navigate to={DEFAULT_HOME} replace />} />

        {/* Rutas (mantén sólo las que exista su carpeta+index.jsx) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/communications-log" element={<CommunicationsLog />} />
        <Route path="/demand-forecasting" element={<DemandForecasting />} />
        <Route path="/import-management" element={<ImportManagement />} />
        <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
        <Route path="/tender-management" element={<TenderManagement />} />

        {/* Aliases viejos, por si los usaste */}
        <Route path="/tenders" element={<Navigate to="/tender-management" replace />} />
        <Route path="/procurement" element={<Navigate to="/import-management" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

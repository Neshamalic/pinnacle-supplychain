// src/Routes.jsx
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";

// Lazy pages (asegúrate que existan esas carpetas con un index.jsx adentro)
const Home = lazy(() => import("./pages/home"));
const PurchaseOrderTracking = lazy(() => import("./pages/purchase-order-tracking"));
const ImportManagement = lazy(() => import("./pages/import-management"));
const Tenders = lazy(() => import("./pages/tenders"));
const Procurement = lazy(() => import("./pages/procurement"));
const CommunicationsLog = lazy(() => import("./pages/communications-log")); // 👈 esta es la clave
const NotFound = lazy(() => import("./pages/NotFound"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
        <Route path="/import-management" element={<ImportManagement />} />
        <Route path="/tenders" element={<Tenders />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/communications-log" element={<CommunicationsLog />} /> {/* 👈 */}
        {/* alias por si usaste singular en algún menú */}
        <Route path="/communication-log" element={<Navigate to="/communications-log" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

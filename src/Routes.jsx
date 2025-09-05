import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import NotFound from "./pages/not-found"; // ajusta si tu 404 se llama distinto

// IMPORTS: usa el mismo casing que en el filesystem
import CommunicationLogPage from "./pages/communication-log"; // <-- carpeta en minúsculas

// Ejemplos de otras páginas (ajusta según tu proyecto):
import Home from "./pages/home";
import Tenders from "./pages/tenders";             // Asegúrate que sea exactamente "pages/tenders"
import Procurement from "./pages/procurement";     // y que esas carpetas existan en minúsculas
import ImportManagement from "./pages/import-management";
import PurchaseOrderTracking from "./pages/purchase-order-tracking";

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando…</div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/communication-log" element={<CommunicationLogPage />} />
        <Route path="/tenders" element={<Tenders />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/import-management" element={<ImportManagement />} />
        <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

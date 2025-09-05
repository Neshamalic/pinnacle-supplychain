// src/Routes.jsx
import { Routes, Route, Navigate } from "react-router-dom";

// Si tienes estas páginas, mantenlas; si no, comenta las que no existan.
import Home from "./pages/home";
import PurchaseOrderTracking from "./pages/purchase-order-tracking";
import ImportManagement from "./pages/import-management";
import Tenders from "./pages/tenders";
import Procurement from "./pages/procurement";

// 👇 Importa la página de communications-log con la ruta EXACTA
import CommunicationsLog from "./pages/communications-log/index.jsx";

// (opcional) Si tienes un NotFound:
import NotFound from "./pages/NotFound";

// (opcional) Si tienes un ScrollToTop en src/components:
import ScrollToTop from "./components/ScrollToTop";

export default function AppRoutes() {
  return (
    <>
      {/* Si no existe ScrollToTop.jsx, borra esta línea */}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
        <Route path="/import-management" element={<ImportManagement />} />
        <Route path="/tenders" element={<Tenders />} />
        <Route path="/procurement" element={<Procurement />} />

        {/* 👇 Ruta que quieres que funcione */}
        <Route path="/communications-log" element={<CommunicationsLog />} />

        {/* Alias por si en algún lado usaste singular */}
        <Route path="/communication-log" element={<Navigate to="/communications-log" replace />} />

        {/* Ruta de prueba rápida para verificar router */}
        <Route path="/_router-ok" element={<div style={{padding:16}}>Router OK</div>} />

        {/* NotFound al final (si la tienes) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

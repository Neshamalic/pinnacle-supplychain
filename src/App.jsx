// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";

// Pages
import Dashboard from "@/pages/dashboard";
import TenderManagement from "@/pages/tender-management";
import PurchaseOrderTracking from "@/pages/purchase-order-tracking";
import ImportManagement from "@/pages/import-management";
import CommunicationsLogPage from "@/pages/communications-log"; // ⬅️ wrapper (index.jsx)

function NotFound() {
  // Cualquier ruta desconocida vuelve al dashboard
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Todo lo que está dentro usa el header/sidebar del AppLayout */}
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tender-management" element={<TenderManagement />} />
          <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
          <Route path="/import-management" element={<ImportManagement />} />
          {/* Communications con header y breadcrumb */}
          <Route path="/communications" element={<CommunicationsLogPage />} />
          {/* 404 -> dashboard */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

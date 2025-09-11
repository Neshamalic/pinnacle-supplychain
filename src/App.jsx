import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";

// Páginas (ajusta los imports a tus rutas reales)
import Dashboard from "@/pages/dashboard";
import TenderManagement from "@/pages/tender-management";
import PurchaseOrderTracking from "@/pages/purchase-order-tracking";
import ImportManagement from "@/pages/import-management";
import CommunicationTimeline from "@/pages/communications/CommunicationTimeline";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tender-management" element={<TenderManagement />} />
          <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
          <Route path="/import-management" element={<ImportManagement />} />
          <Route path="/communications" element={<CommunicationTimeline />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

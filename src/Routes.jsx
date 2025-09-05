// src/Routes.jsx
import React from "react";
import { Routes as Switch, Route } from "react-router-dom";

// ✅ Usa alias @ para rutas desde /src
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/NotFound";

// Rutas de pages (pueden ser relativas o con @; dejamos relativas como estaban)
import Dashboard from "./pages/dashboard";
import Procurement from "./pages/procurement";
import PurchaseOrderTracking from "./pages/purchase-order-tracking";
import ImportManagement from "./pages/import-management";
import Tenders from "./pages/tenders";
import CommunicationsLog from "./pages/communications-log";
import DemandForecasting from "./pages/demand-forecasting";
import Settings from "./pages/settings";

const Routes = () => {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Switch>
        <Route path="/" element={<Dashboard />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/purchase-order-tracking" element={<PurchaseOrderTracking />} />
        <Route path="/import-management" element={<ImportManagement />} />
        <Route path="/tenders" element={<Tenders />} />
        <Route path="/communications-log" element={<CommunicationsLog />} />
        <Route path="/demand-forecasting" element={<DemandForecasting />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Switch>
    </ErrorBoundary>
  );
};

export default Routes;

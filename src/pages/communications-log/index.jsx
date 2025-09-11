// src/pages/communications-log/index.jsx
import React from "react";
import { Link } from "react-router-dom";
import CommunicationTimeline from "./components/CommunicationTimeline";

export default function CommunicationsLogPage() {
  return (
    <div className="px-6 py-6">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center text-sm text-muted-foreground space-x-2">
        <Link to="/" className="hover:underline">Dashboard</Link>
        <span>›</span>
        <span className="text-foreground">Communications Log</span>
      </div>

      {/* Header */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-foreground">
          Communications Log
        </h1>
        <p className="text-muted-foreground">
          Track all communications linked to tenders, purchase orders, and imports.
        </p>
      </div>

      {/* Timeline */}
      <CommunicationTimeline />
    </div>
  );
}


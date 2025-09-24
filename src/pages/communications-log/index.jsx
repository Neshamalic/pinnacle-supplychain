// src/pages/communications-log/index.jsx
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import CommunicationTimeline from "./components/CommunicationTimeline";
import NewCommunicationModal from "./components/NewCommunicationModal";

export default function CommunicationsLogPage() {
  const [openNew, setOpenNew] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleSaved = () => {
    setOpenNew(false);
    setReloadKey(k => k + 1); // fuerza que CommunicationTimeline pida de nuevo
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Communications Timeline</h1>
          <p className="text-sm text-muted-foreground">All messages across tenders, orders and imports.</p>
        </div>
        <Button onClick={() => setOpenNew(true)} iconName="Plus">New Communication</Button>
      </div>

      {/* clave de recarga para forzar reread */}
      <div key={reloadKey}>
        <CommunicationTimeline />
      </div>

      {openNew && (
        <NewCommunicationModal
          open={openNew}
          onClose={() => setOpenNew(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}


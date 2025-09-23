// src/pages/communications-log/index.jsx
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import CommunicationTimeline from "./components/CommunicationTimeline.jsx";
import NewCommunicationModal from "./components/NewCommunicationModal.jsx";

export default function CommunicationsLog() {
  const { rows = [], loading, error, refresh, refetch } =
    useSheet("communications", mapCommunications); // ya existe en tu repo. :contentReference[oaicite:4]{index=4}

  const [open, setOpen] = useState(false);

  const doRefresh = async () => {
    // según versión del hook, puede existir refresh o refetch
    if (typeof refetch === "function") await refetch();
    else if (typeof refresh === "function") await refresh();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Cargando comunicaciones…</div>;
  if (error)   return <div className="p-6 text-sm text-red-600">Error: {String(error)}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Communications Log</h1>
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" className="mr-2" />
          New Communication
        </Button>
      </div>

      {/* Timeline (tu componente actual) */}
      <CommunicationTimeline items={rows} />

      {open && (
        <NewCommunicationModal
          open={open}
          onClose={() => setOpen(false)}
          onSaved={doRefresh}
        />
      )}
    </div>
  );
}

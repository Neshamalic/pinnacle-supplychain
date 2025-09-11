// src/pages/communications-log/index.jsx
import React, { useState } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import Button from "@/components/ui/Button";

// Tu timeline existente
import CommunicationTimeline from "./components/CommunicationTimeline.jsx";
// El modal que creaste en este directorio: ./components/NewCommunicationModal.jsx
import NewCommunicationModal from "./components/NewCommunicationModal.jsx";

export default function CommunicationsLogPage() {
  // Carga de comunicaciones
  const sheet = useSheet("communications", mapCommunications);
  const {
    rows: communications = [],
    loading,
    error,
    refetch, // si tu hook lo expone, lo usamos para refrescar después de guardar
  } = sheet;

  const [openCreate, setOpenCreate] = useState(false);

  const handleOpenCreate = () => setOpenCreate(true);
  const handleCloseCreate = () => setOpenCreate(false);

  const handleSaved = async () => {
    // Al guardar en el modal, cerramos y refrescamos
    if (typeof refetch === "function") {
      await refetch();
    }
    setOpenCreate(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Communications Log</h1>
          <p className="text-sm text-muted-foreground">
            Track communications and link them to tenders, POs, and imports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" iconName="Download">
            Export Report
          </Button>
          <Button iconName="Plus" onClick={handleOpenCreate}>
            New Communication
          </Button>
        </div>
      </div>

      {/* Listado / timeline */}
      {error ? (
        <div className="text-sm text-red-600">
          Failed to load communications: {String(error)}
        </div>
      ) : (
        <CommunicationTimeline rows={communications} loading={loading} />
      )}

      {/* Modal de creación */}
      <NewCommunicationModal
        open={openCreate}
        onClose={handleCloseCreate}
        onSaved={handleSaved}
      />
    </div>
  );
}

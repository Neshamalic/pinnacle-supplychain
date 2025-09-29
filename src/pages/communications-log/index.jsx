// src/pages/communications-log/index.jsx
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import CommunicationList from "@/components/CommunicationList";
import NewCommunicationModal from "./components/NewCommunicationModal";

export default function CommunicationsLogPage() {
  const [openNew, setOpenNew] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleSaved = () => {
    setOpenNew(false);
    setReloadKey((k) => k + 1); // fuerza que la lista recargue
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Communications</h1>
          <p className="text-sm text-muted-foreground">
            Click en cualquier mensaje para marcarlo como leído (Unread → Read). Usa “Show more” para expandir.
          </p>
        </div>
        <Button onClick={() => setOpenNew(true)} iconName="Plus">
          New Communication
        </Button>
      </div>

      {/* Clave de recarga para forzar refetch en la lista */}
      <div key={reloadKey}>
        {/* Sin filtros: lista completa (orden descendente por fecha desde el backend) */}
        <CommunicationList />
        {/*
          Si quisieras ver solo por entidad, puedes usar:
          <CommunicationList linkedType="orders" />
          <CommunicationList linkedType="orders" linkedId="PO-171" />
        */}
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

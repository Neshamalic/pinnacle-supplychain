// src/pages/communications-log/components/CommunicationEntry.jsx
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

export default function CommunicationEntry({ comm, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!comm?.id) {
      alert("No se puede eliminar: falta 'id'.");
      return;
    }
    if (!window.confirm("¿Eliminar esta comunicación?")) return;
    try {
      setBusy(true);
      await postJSON(
        `${API_BASE}?route=write&action=delete&name=communications`,
        { id: comm.id }
      );
      onDeleted && onDeleted(comm.id);
    } catch (err) {
      alert("Error al eliminar: " + String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 p-3">
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle"
        >
          <Icon name={open ? "ChevronDown" : "ChevronRight"} size={16} />
        </button>
        <div className="font-medium text-sm">{comm.subject || "(sin asunto)"}</div>
        <div className="ml-auto text-xs text-muted-foreground">
          {formatDate(comm.createdDate)}
        </div>
        <Button
          size="xs"
          variant="secondary"
          iconName="Trash2"
          onClick={handleDelete}
          disabled={busy}
        >
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
      {open && (
        <div className="px-4 pb-4 text-sm">
          <div className="text-xs text-muted-foreground mb-1">
            {comm.type || "—"} • {comm.participants || "—"}
          </div>
          <div className="whitespace-pre-wrap">
            {comm.content || comm.preview || "—"}
          </div>
        </div>
      )}
    </div>
  );
}

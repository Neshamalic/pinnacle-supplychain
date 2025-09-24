// src/components/CommunicationList.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

const pill = (txt) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">{txt}</span>
);

export default function CommunicationList({ linkedType, linkedId }) {
  const { rows = [], loading, refetch } = useSheet("communications", mapCommunications);

  // solo mensajes vinculados + no borrados
  const list = useMemo(() => {
    const t = String((linkedType || "").toLowerCase());
    const id = String(linkedId || "");
    return (rows || [])
      .filter(r =>
        String(r.deleted || "").toLowerCase() !== "true" &&
        (!t || String(r.linked_type || "").toLowerCase() === t) &&
        (!id || String(r.linked_id || "") === id)
      )
      .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
  }, [rows, linkedType, linkedId]);

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!list.length) return <div className="text-sm text-muted-foreground">No hay comunicaciones.</div>;

  return (
    <div className="space-y-2">
      {list.map(c => (
        <CommCard key={c.id || (c.createdDate + c.subject)} comm={c} onChange={refetch} />
      ))}
    </div>
  );
}

function CommCard({ comm, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justDeleted, setJustDeleted] = useState(false);
  const id = comm.id || ""; // puede venir vacío en legacy

  // marcar como leído al expandir
  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && String(comm.unread || "").toLowerCase() === "true") {
      try {
        await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
          id: id, created_date: comm.createdDate, subject: comm.subject, unread: "false"
        });
        onChange?.();
      } catch { /* no-op */ }
    }
  };

  const softDelete = async () => {
    // confirmación
    if (!window.confirm("Are you sure you want to delete?")) return;

    try {
      setBusy(true);
      // borrado suave
      await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
        id: id, created_date: comm.createdDate, subject: comm.subject, deleted: "true"
      });
      setJustDeleted(true);
      onChange?.();
      // auto-ocultar la barra de undo en 6s
      setTimeout(() => setJustDeleted(false), 6000);
    } catch (err) {
      alert("Error al eliminar: " + String(err));
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    try {
      setBusy(true);
      await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
        id: id, created_date: comm.createdDate, subject: comm.subject, deleted: ""
      });
      setJustDeleted(false);
      onChange?.();
    } catch (err) {
      alert("Error al restaurar: " + String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30">
      {/* Header compacto */}
      <div className="p-3 flex items-center gap-2">
        <button className="text-muted-foreground hover:text-foreground" onClick={toggle} aria-label="toggle">
          <Icon name={open ? "ChevronDown" : "ChevronRight"} size={16} />
        </button>
        <div className="font-medium text-sm">{comm.subject || "(sin asunto)"}</div>
        {String(comm.unread || "").toLowerCase() === "true" && pill("Unread")}
        <div className="ml-auto text-xs text-muted-foreground">{formatDate(comm.createdDate)}</div>
        <Button size="xs" variant="secondary" iconName="Trash2" onClick={softDelete} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>

      {/* Barra de UNDO */}
      {justDeleted && (
        <div className="px-3 pb-2">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[13px] flex items-center gap-2">
            <span>Deleted.</span>
            <Button size="xs" variant="secondary" onClick={undo}>Undo</Button>
          </div>
        </div>
      )}

      {/* Detalle expandible */}
      {open && (
        <div className="px-4 pb-4 text-sm">
          <div className="text-xs text-muted-foreground mb-1">
            {(comm.type || "—")} • {(comm.participants || "—")}
          </div>
          <div className="whitespace-pre-wrap">
            {comm.content || comm.preview || "—"}
          </div>
        </div>
      )}
    </div>
  );
}


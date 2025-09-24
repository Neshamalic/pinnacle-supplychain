// src/pages/communications-log/components/CommunicationEntry.jsx
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

export default function CommunicationEntry({ comm, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justDeleted, setJustDeleted] = useState(false);
  const id = comm.id || "";

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && String(comm.unread || "").toLowerCase() === "true") {
      try {
        await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
          id, created_date: comm.createdDate, subject: comm.subject, unread: "false"
        });
        onChange?.();
      } catch { /* ignore */ }
    }
  };

  const softDelete = async () => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    try {
      setBusy(true);
      await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
        id, created_date: comm.createdDate, subject: comm.subject, deleted: "true"
      });
      setJustDeleted(true);
      onChange?.();
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
        id, created_date: comm.createdDate, subject: comm.subject, deleted: ""
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
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 p-3">
        <button className="text-muted-foreground hover:text-foreground" onClick={toggle} aria-label="Toggle">
          <Icon name={open ? "ChevronDown" : "ChevronRight"} size={16} />
        </button>
        <div className="font-medium text-sm">{comm.subject || "(sin asunto)"}</div>
        {String(comm.unread || "").toLowerCase() === "true" && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700">Unread</span>
        )}
        <div className="ml-auto text-xs text-muted-foreground">{formatDate(comm.createdDate)}</div>
        <Button size="xs" variant="secondary" iconName="Trash2" onClick={softDelete} disabled={busy}>
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>

      {justDeleted && (
        <div className="px-3 pb-2">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[13px] flex items-center gap-2">
            <span>Deleted.</span>
            <Button size="xs" variant="secondary" onClick={undo}>Undo</Button>
          </div>
        </div>
      )}

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

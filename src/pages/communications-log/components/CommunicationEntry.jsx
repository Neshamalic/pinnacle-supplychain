// src/pages/communications-log/components/CommunicationEntry.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { commDelete, commMarkRead } from "@/lib/sheetsApi";
import { formatDate } from "@/lib/utils";

/**
 * Props:
 *  - comm: objeto comunicación (con los campos mapeados en adapters.mapCommunications)
 *  - onDeleted?: (comm) => void
 *  - onRestored?: (comm) => void
 *  - onChange?: () => void  // para pedir refetch al padre si quieres
 */
export default function CommunicationEntry({ comm, onDeleted, onRestored, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [justDeleted, setJustDeleted] = useState(false); // para Undo

  const when = useMemo(() => {
    return comm?.createdDate ? formatDate(comm.createdDate) : "";
  }, [comm?.createdDate]);

  const preview = comm?.preview || "";
  const content = comm?.content || "";

  async function handleToggle() {
    setExpanded((v) => !v);
    if (comm?.unread) {
      try {
        await commMarkRead(comm);
        // marcamos en el objeto en memoria
        comm.unread = false;
        onChange?.();
      } catch (_e) {
        // silencioso; no romper UI
      }
    }
  }

  async function handleDeleteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting || justDeleted) return;
    const ok = window.confirm("Are you sure you want to delete?");
    if (!ok) return;

    setDeleting(true);
    try {
      // Borrado optimista:
      setJustDeleted(true);
      onDeleted?.(comm);
      // Ejecuta borrado real:
      await commDelete(comm);
      // Mostramos “Undo” durante 5s
      setTimeout(() => setJustDeleted(false), 5000);
    } catch (err) {
      setJustDeleted(false);
      alert(`No se pudo eliminar: ${String(err?.message || err)}`);
      onChange?.(); // por si hace falta refetch
    } finally {
      setDeleting(false);
    }
  }

  function handleUndo(e) {
    e.preventDefault();
    e.stopPropagation();
    setJustDeleted(false);
    // Simplemente avisamos al padre que “deshaga” el borrado optimista (volver a mostrar la card).
    onRestored?.(comm);
  }

  // Badges de estilo
  const unreadBadge = comm?.unread ? (
    <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs">
      Unread
    </span>
  ) : null;

  return (
    <div className="rounded-lg border bg-muted/20">
      {/* Header clickable */}
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 rounded-t-lg"
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        <Icon name={expanded ? "ChevronDown" : "ChevronRight"} size={16} className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              {comm?.subject || "(sin asunto)"} {unreadBadge}
            </div>
            <div className="text-xs text-muted-foreground">{when}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {comm?.type || "—"} • {comm?.participants || "—"}
          </div>
          {!expanded && (
            <div className="mt-2 text-sm text-foreground line-clamp-2">{preview}</div>
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-3">
          <div className="text-sm whitespace-pre-wrap">{content || "—"}</div>

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Linked: <b>{comm?.linked_type || "—"}</b>
              {comm?.linked_id ? <> · {comm.linked_id}</> : null}
            </div>

            <div className="flex items-center gap-2">
              {justDeleted ? (
                <button
                  type="button"
                  onClick={handleUndo}
                  className="text-blue-600 hover:underline"
                >
                  Undo
                </button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  iconName="Trash2"
                  onClick={handleDeleteClick}
                  disabled={deleting}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/communications-log/components/CommunicationEntry.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { API_BASE, postJSON } from "@/lib/utils";

const iconByType = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "mail") return "Mail";
  if (v === "meeting") return "Calendar";
  if (v === "call") return "Phone";
  if (v === "whatsapp") return "MessageCircle";
  return "FileText";
};

const chipByLinked = (lt) => {
  const v = String(lt || "").toLowerCase();
  if (v === "orders")  return "bg-blue-100 text-blue-800";
  if (v === "imports") return "bg-emerald-100 text-emerald-800";
  if (v === "tender")  return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-800";
};

export default function CommunicationEntry({ comm, onDeleted, onRestored, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [undoTimer, setUndoTimer] = useState(null);
  const deletedRowRef = useRef(null);

  const created = useMemo(() => {
    const d = comm?.createdDate ? new Date(comm.createdDate) : null;
    if (!d || isNaN(d)) return "";
    return d.toLocaleDateString("es-CL");
  }, [comm?.createdDate]);

  function toggleExpand() {
    setExpanded((v) => !v);

    // Al abrir, marcar como leído si está unread
    if (comm?.unread) {
      markRead();
    }
  }

  async function markRead() {
    try {
      await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
        row: {
          id: comm.id || "",                    // si no hay id, usa llaves abajo
          created_date: comm.createdDate || "",
          subject: comm.subject || "",
          unread: false,
        },
      });
      onChange?.();
    } catch (e) {
      // Silencioso: si falla no es grave para UX
      console.warn("markRead failed", e);
    }
  }

  async function handleDelete() {
    if (deleting) return;

    const ok = window.confirm("Are you sure you want to delete?");
    if (!ok) return;

    setDeleting(true);
    deletedRowRef.current = comm;
    // borrado optimista
    onDeleted?.(comm);

    try {
      const res = await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
        where: {
          id: comm.id || "",
          created_date: comm.createdDate || "",
          subject: comm.subject || "",
        },
      });

      if (!res || res.removed !== 1) {
        // si backend no confirmó, restauro de inmediato
        onRestored?.(deletedRowRef.current);
        alert('No se pudo eliminar: intenta nuevamente.');
        setDeleting(false);
        return;
      }

      // Mostrar UNDO 5s
      const t = setTimeout(() => {
        setUndoTimer(null);
        setDeleting(false);
      }, 5000);
      setUndoTimer(t);
    } catch (err) {
      console.error(err);
      onRestored?.(deletedRowRef.current);
      alert('No se pudo eliminar: error de red.');
      setDeleting(false);
    }
  }

  async function undoDelete() {
    if (!deletedRowRef.current) return;
    const row = deletedRowRef.current;
    setUndoTimer((t) => {
      if (t) clearTimeout(t);
      return null;
    });
    try {
      await postJSON(`${API_BASE}?route=write&action=create&name=communications`, {
        row: {
          created_date: row.createdDate || new Date().toISOString(),
          type: row.type,
          subject: row.subject,
          participants: row.participants,
          content: row.content,
          preview: row.preview,
          linked_type: row.linked_type,
          linked_id: row.linked_id,
          unread: !!row.unread,
        },
      });
      onRestored?.(row);
      onChange?.();
    } catch (e) {
      console.error(e);
      alert("No se pudo deshacer (Undo).");
    } finally {
      deletedRowRef.current = null;
    }
  }

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-start gap-3 p-3">
        <div className="mt-0.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Icon name={iconByType(comm.type)} size={18} />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleExpand}
              className="text-sm font-medium hover:underline text-left truncate"
              title="Ver más"
            >
              {comm.subject || "(sin asunto)"}
            </button>
            {comm.unread && (
              <span className="text-[11px] px-2 py-[2px] rounded-full bg-amber-100 text-amber-800">
                Unread
              </span>
            )}
            <span className={`text-[11px] px-2 py-[2px] rounded-full ${chipByLinked(comm.linked_type)}`}>
              {comm.linked_type === "orders" ? "Orders" : comm.linked_type === "imports" ? "Imports" : "Tender"}
            </span>
            <div className="ml-auto text-xs text-muted-foreground">{created}</div>
          </div>

          {/* Encabezado secundario */}
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {String(comm.type || "")} • {comm.participants || "—"}
          </div>

          {/* Preview o contenido completo */}
          {!expanded ? (
            <div className="text-sm mt-2">{comm.preview || comm.content || "—"}</div>
          ) : (
            <div className="text-sm mt-2 whitespace-pre-wrap">{comm.content || comm.preview || "—"}</div>
          )}

          {/* Link (lectura) */}
          <div className="text-[11px] text-muted-foreground mt-2">
            Linked: <span className="font-medium">{comm.linked_type || "—"}</span> • {comm.linked_id || "—"}
          </div>

          {/* Botonera */}
          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              iconName="Trash2"
            >
              Delete
            </Button>

            {undoTimer && (
              <div className="text-xs">
                Deleted.{" "}
                <button type="button" className="underline text-blue-600" onClick={undoDelete}>
                  Undo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

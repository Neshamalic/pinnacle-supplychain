// src/components/CommunicationList.jsx
import React, { useMemo, useState, useCallback } from "react";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

function Pill({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${className}`} >
      {children}
    </span>
  );
}

export default function CommunicationList({
  linkedType,         // "tender" | "orders" | "imports" | undefined
  linkedId,           // el id de la entidad para filtrar (ej: "PO-171")
  maxItems,           // opcional: limitar cantidad
}) {
  const { rows = [], loading, refetch } = useSheet("communications", mapCommunications);
  const [lastDeleted, setLastDeleted] = useState(null); // {row, timer}

  const list = useMemo(() => {
    let out = rows;
    if (linkedType && linkedId) {
      out = out.filter(
        (r) => (r.linked_type || "") === String(linkedType).toLowerCase()
           && (r.linked_id || "") === String(linkedId)
      );
    }
    // orden por fecha desc
    out = [...out].sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    if (maxItems) out = out.slice(0, maxItems);
    return out;
  }, [rows, linkedType, linkedId, maxItems]);

  const handleDelete = useCallback(async (row) => {
    // evita submit/navegación accidental
    try {
      if (!row?.id) {
        alert("No se puede eliminar: falta 'id'.");
        return;
      }
      const ok = window.confirm("Are you sure you want to delete?");
      if (!ok) return;

      // optimista: quitamos de la UI
      const prev = { row, timer: null };
      setLastDeleted(prev);

      await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
        where: { id: row.id },
      });

      // mostramos UNDO 5s
      const timer = setTimeout(() => setLastDeleted(null), 5000);
      setLastDeleted({ ...prev, timer });

      // refrescamos del backend
      await refetch?.();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar. Revisa la consola.");
      await refetch?.();
    }
  }, [refetch]);

  const handleUndo = useCallback(async () => {
    if (!lastDeleted?.row) return;
    try {
      // limpiamos banner inmediatamente
      if (lastDeleted.timer) clearTimeout(lastDeleted.timer);
      const payload = { ...lastDeleted.row };
      // Si tu Apps Script genera id automáticamente, borra el id antes de crear:
      // delete payload.id;

      await postJSON(`${API_BASE}?route=write&action=create&name=communications`, {
        row: payload,
      });
      setLastDeleted(null);
      await refetch?.();
    } catch (err) {
      console.error(err);
      alert("No se pudo deshacer.");
      await refetch?.();
    }
  }, [lastDeleted, refetch]);

  return (
    <div className="space-y-3">
      {lastDeleted?.row && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 flex items-center justify-between">
          <div className="text-sm">Message deleted</div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleUndo(); }}
            className="text-amber-900 underline"
          >
            Undo
          </button>
        </div>
      )}

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {!loading && list.length === 0 && (
        <div className="text-sm text-muted-foreground">No communications.</div>
      )}

      {list.map((row) => (
        <CommCard key={row.id || `${row.createdDate}-${row.subject}`}
          row={row}
          onDelete={handleDelete}
          onMarked={async () => { await refetch?.(); }}
        />
      ))}
    </div>
  );
}

function CommCard({ row, onDelete, onMarked }) {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const toggleOpen = async (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    const next = !open;
    setOpen(next);

    // Si se abre por primera vez y está unread => marcar como leído
    if (next && row.unread) {
      try {
        setMarking(true);
        await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
          row: { id: row.id, unread: false },
        });
        setMarking(false);
        onMarked?.();
      } catch (err) {
        console.error(err);
        setMarking(false);
      }
    }
  };

  const deleteClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    onDelete?.(row);
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Header (solo título + meta) */}
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/50"
      >
        <div className="mt-0.5 text-muted-foreground">
          <Icon name={open ? "ChevronDown" : "ChevronRight"} size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{row.subject || "(no subject)"}</div>
            {row.unread ? (
              <Pill className="bg-blue-100 text-blue-800">Unread</Pill>
            ) : (
              <Pill className="bg-gray-100 text-gray-700">Read</Pill>
            )}
            {marking && <span className="text-xs text-muted-foreground">…</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{row.type || "other"}</span>
            {row.participants && <span>• {row.participants}</span>}
            <span className="ml-auto">{formatDate(row.createdDate)}</span>
          </div>

          {/* preview solo cuando está colapsado */}
          {!open && row.preview && (
            <div className="mt-1 text-sm text-muted-foreground truncate">{row.preview}</div>
          )}
        </div>
      </button>

      {/* Cuerpo (solo si open) */}
      {open && (
        <div className="px-4 pb-3">
          {row.content ? (
            <p className="text-sm whitespace-pre-line leading-6 mt-1">{row.content}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">—</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Linked: <b>{row.linked_type || "—"}</b>{row.linked_id ? ` · ${row.linked_id}` : ""}
            </div>
            <button
              type="button"
              onClick={deleteClick}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90"
            >
              <Icon name="Trash2" size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


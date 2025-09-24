// src/components/CommunicationList.jsx
import React, { useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

const Pill = ({ children, tone = "gray" }) => {
  const tones = {
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

function buildUpdatePayload(comm, patch) {
  const row = { ...patch };
  if (comm.id) row.id = comm.id;
  else {
    row.created_date = comm.createdDate || comm.created_date || "";
    row.subject = comm.subject || "";
  }
  return row;
}

export default function CommunicationList({ linkedType, linkedId, maxItems }) {
  const { rows = [], loading, refetch } = useSheet("communications", mapCommunications);
  const [undoRow, setUndoRow] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const list = useMemo(() => {
    const t = String(linkedType || "").toLowerCase();
    const id = String(linkedId || "");
    let out = (rows || [])
      .filter(r => !r.deleted)                                // << filtra borrados
      .filter(r => (!t || (r.linked_type || "") === t) && (!id || (r.linked_id || "") === id))
      .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
    if (maxItems) out = out.slice(0, maxItems);
    return out;
  }, [rows, linkedType, linkedId, maxItems]);

  const confirmDelete = async (row) => {
    if (!window.confirm("Are you sure you want to delete?")) return;
    await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
      row: buildUpdatePayload(row, { deleted: "true" })
    });
    setUndoRow(row);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => setUndoRow(null), 5000);
    setUndoTimer(t);
    await refetch?.();
  };

  const undoDelete = async (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    if (!undoRow) return;
    if (undoTimer) clearTimeout(undoTimer);
    await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
      row: buildUpdatePayload(undoRow, { deleted: "" })
    });
    setUndoRow(null);
    await refetch?.();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!list.length) return <div className="text-sm text-muted-foreground">No hay comunicaciones.</div>;

  return (
    <div className="space-y-2">
      {undoRow && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[13px] flex items-center justify-between">
          <span>Message deleted</span>
          <button type="button" onClick={undoDelete} className="underline">Undo</button>
        </div>
      )}
      {list.map((c) => (
        <CommCard key={c.id || c.createdDate + c.subject} comm={c} onDelete={confirmDelete} onMarked={refetch} />
      ))}
    </div>
  );
}

function CommCard({ comm, onDelete, onMarked }) {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const toggleOpen = async (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    const next = !open;
    setOpen(next);
    if (next && comm.unread) {
      try {
        setMarking(true);
        await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
          row: buildUpdatePayload(comm, { unread: "false" })
        });
        setMarking(false);
        onMarked?.();
      } catch {
        setMarking(false);
      }
    }
  };

  const handleDelete = (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    onDelete?.(comm);
  };

  return (
    <div className="rounded-lg border bg-muted/30">
      <button type="button" onClick={toggleOpen} className="w-full text-left p-3 flex items-start gap-2 hover:bg-muted/50">
        <div className="text-muted-foreground mt-0.5"><Icon name={open ? "ChevronDown" : "ChevronRight"} size={16} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm truncate">{comm.subject || "(sin asunto)"}</div>
            {comm.unread ? <Pill tone="blue">Unread</Pill> : <Pill>Read</Pill>}
            {marking && <span className="text-xs text-muted-foreground">…</span>}
            <div className="ml-auto text-xs text-muted-foreground">{formatDate(comm.createdDate)}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{(comm.type || "other")} • {(comm.participants || "—")}</div>
          {!open && comm.preview && (<div className="mt-1 text-sm text-muted-foreground truncate">{comm.preview}</div>)}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3">
          <div className="text-sm whitespace-pre-wrap">{comm.content || comm.preview || "—"}</div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Linked: <b>{comm.linked_type || "—"}</b>{comm.linked_id ? ` · ${comm.linked_id}` : ""}
            </div>
            <button type="button" onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90">
              <Icon name="Trash2" size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/communications-log/components/CommunicationEntry.jsx
import React, { useState } from "react";
import Icon from "@/components/AppIcon";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

const Pill = ({ children, tone = "gray" }) => {
  const tones = { blue: "bg-blue-100 text-blue-800", gray: "bg-gray-100 text-gray-700" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${tones[tone] || tones.gray}`}>{children}</span>;
};

function buildUpdatePayload(comm, patch) {
  const row = { ...patch };
  if (comm.id) row.id = comm.id;
  else { row.created_date = comm.createdDate || comm.created_date || ""; row.subject = comm.subject || ""; }
  return row;
}

export default function CommunicationEntry({ comm, onChange }) {
  const [open, setOpen] = useState(false);
  const [undoVisible, setUndoVisible] = useState(false);
  const [timer, setTimer] = useState(null);

  const toggle = async (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    const next = !open;
    setOpen(next);
    if (next && comm.unread) {
      await postJSON(`${API_BASE}?route=write&action=update&name=communications`, { row: buildUpdatePayload(comm, { unread: "false" }) });
      onChange?.();
    }
  };

  const doDelete = async (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    if (!window.confirm("Are you sure you want to delete?")) return;
    await postJSON(`${API_BASE}?route=write&action=update&name=communications`, { row: buildUpdatePayload(comm, { deleted: "true" }) });
    setUndoVisible(true);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setUndoVisible(false), 5000);
    setTimer(t);
    onChange?.();
  };

  const undo = async (e) => {
    e?.preventDefault?.(); e?.stopPropagation?.();
    if (timer) clearTimeout(timer);
    await postJSON(`${API_BASE}?route=write&action=update&name=communications`, { row: buildUpdatePayload(comm, { deleted: "" }) });
    setUndoVisible(false);
    onChange?.();
  };

  return (
    <div className="rounded-lg border bg-card">
      <button type="button" onClick={toggle} className="w-full text-left p-3 flex items-start gap-2 hover:bg-muted/50">
        <div className="text-muted-foreground mt-0.5"><Icon name={open ? "ChevronDown" : "ChevronRight"} size={16} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm truncate">{comm.subject || "(sin asunto)"}</div>
            {comm.unread ? <Pill tone="blue">Unread</Pill> : <Pill>Read</Pill>}
            <div className="ml-auto text-xs text-muted-foreground">{formatDate(comm.createdDate)}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">{(comm.type || "other")} • {(comm.participants || "—")}</div>
          {!open && comm.preview && (<div className="mt-1 text-sm text-muted-foreground truncate">{comm.preview}</div>)}
        </div>
      </button>

      {undoVisible && (
        <div className="px-3 pb-2">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 text-[13px] flex items-center gap-2">
            <span>Message deleted</span>
            <button type="button" className="underline" onClick={undo}>Undo</button>
          </div>
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 text-sm whitespace-pre-wrap">
          {comm.content || comm.preview || "—"}
          <div className="mt-3 flex items-center justify-end">
            <button type="button" onClick={doDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90">
              <Icon name="Trash2" size={14} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

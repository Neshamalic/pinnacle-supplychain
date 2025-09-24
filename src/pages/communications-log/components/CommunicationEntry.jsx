// src/pages/communications-log/components/CommunicationEntry.jsx
import React, { useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

const typeIcon = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "mail" || v === "email") return "Mail";
  if (v === "meeting") return "Calendar";
  if (v === "call") return "Phone";
  if (v === "whatsapp") return "MessageCircle";
  return "FileText";
};

const badgeByEntity = (ltRaw) => {
  const v = String(ltRaw || "").toLowerCase();
  if (["orders", "order", "po", "purchase_order"].includes(v))
    return { cls: "bg-blue-100 text-blue-800", label: "Orders" };
  if (["imports", "import", "shipment"].includes(v))
    return { cls: "bg-emerald-100 text-emerald-800", label: "Imports" };
  if (v === "tender" || v === "tenders")
    return { cls: "bg-purple-100 text-purple-800", label: "Tender" };
  return { cls: "bg-gray-100 text-gray-800", label: v || "—" };
};

export default function CommunicationEntry({ comm, onDeleted, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const ico = typeIcon(comm.type);
  const badge = badgeByEntity(comm.linked_type);

  const toggle = async () => {
    const now = !expanded;
    setExpanded(now);

    // marcar leído al expandir
    if (now && comm.unread) {
      try {
        await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
          id: comm.id,
          unread: false,
        });
        onUpdated?.({ ...comm, unread: false });
      } catch {
        // ignore
      }
    }
  };

  const handleDelete = async () => {
    if (!comm?.id) {
      alert('No se puede eliminar: falta "id" en esa fila de la planilla.');
      return;
    }
    if (!window.confirm("Are you sure you want to delete?")) return;

    setDeleting(true);
    try {
      await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
        where: { id: comm.id },
      });
      onDeleted?.(comm);
    } catch {
      alert("No se pudo eliminar. Intenta nuevamente.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 cursor-pointer" onClick={toggle}>
          <div className="flex items-center gap-2">
            <Icon name={ico} size={16} />
            <div className="font-medium text-foreground">
              {comm.subject || "(sin asunto)"}
              {comm.unread ? (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  Unread
                </span>
              ) : null}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {comm.type || "note"} • {comm.participants || "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">{formatDate(comm.createdDate)}</div>
          <Button
            variant="destructive"
            size="sm"
            iconName="Trash2"
            disabled={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* body */}
      <div className="mt-3 text-sm whitespace-pre-wrap">
        {!expanded ? (
          <span className="text-muted-foreground">{comm.preview || "—"}</span>
        ) : (
          <span>{comm.content || "—"}</span>
        )}
      </div>

      {/* link */}
      {comm.linked_type && comm.linked_id ? (
        <div className="mt-3 text-xs text-muted-foreground">
          Linked: {comm.linked_type} • {comm.linked_id}
        </div>
      ) : null}
    </div>
  );
}

// src/components/CommunicationList.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

function badge(kind) {
  const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ";
  if (kind === "unread") return base + "bg-blue-100 text-blue-700";
  return base + "bg-slate-100 text-slate-700";
}

function normalizeType(t) {
  const v = String(t || "").toLowerCase();
  if (v.startsWith("order")) return "order";
  if (v === "po" || v.includes("purchase")) return "order";
  if (v.startsWith("import")) return "import";
  if (v.startsWith("tender")) return "tender";
  return v;
}

export default function CommunicationList({ linkedType, linkedId }) {
  const { rows = [], loading, refetch } = useSheet("communications", mapCommunications);
  const [busyId, setBusyId] = useState(null);

  const list = useMemo(() => {
    const t = normalizeType(linkedType);
    const id = String(linkedId || "").trim();
    return (rows || [])
      .filter((r) => {
        const lt = normalizeType(r.linked_type);
        const lid = String(r.linked_id || "").trim();
        return (!t || lt === t) && (!id || lid === id);
      })
      .sort((a, b) => (b.createdDate || "").localeCompare(a.createdDate || ""));
  }, [rows, linkedType, linkedId]);

  const handleDelete = async (row) => {
    if (!row?.id) {
      alert("No se puede eliminar: falta 'id' en el registro.");
      return;
    }
    if (!window.confirm("¿Eliminar esta comunicación?")) return;
    try {
      setBusyId(row.id);
      const url = `${API_BASE}?route=write&action=delete&name=communications`;
      await postJSON(url, { id: row.id });
      await refetch();
    } catch (err) {
      alert("Error al eliminar: " + String(err));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Cargando…</div>;
  if (!list.length) return <div className="text-sm text-muted-foreground">No hay comunicaciones.</div>;

  return (
    <div className="space-y-2">
      {list.map((r) => (
        <div
          key={r.id || r.createdDate + r.subject}
          className="rounded-lg border bg-muted/30 p-3"
        >
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">{r.subject || "(sin asunto)"}</div>
            {String(r.unread) === "true" && <span className={badge("unread")}>Unread</span>}
            <div className="ml-auto text-xs text-muted-foreground">
              {formatDate(r.createdDate)}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {r.type ? r.type : "—"} • {r.participants || "—"}
          </div>
          {r.preview && <div className="text-sm mt-2">{r.preview}</div>}

          <div className="flex items-center gap-2 mt-3">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => handleDelete(r)}
              disabled={busyId === r.id}
              iconName="Trash2"
            >
              {busyId === r.id ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

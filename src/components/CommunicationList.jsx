// src/components/CommunicationList.jsx
import React, { useMemo } from "react";
import { format } from "date-fns";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { Mail, Phone, MessageSquare, Users } from "lucide-react";

function TypeIcon({ type = "" }) {
  const t = String(type).toLowerCase();
  if (t.includes("mail") || t === "email") return <Mail className="h-4 w-4" />;
  if (t.includes("call") || t === "phone") return <Phone className="h-4 w-4" />;
  if (t.includes("chat") || t.includes("whats") || t.includes("sms"))
    return <MessageSquare className="h-4 w-4" />;
  return <MessageSquare className="h-4 w-4" />;
}

/**
 * Props:
 * - linkedType: "tender" | "po" | "import"  (minúsculas recomendado)
 * - linkedId: string  (id exacto a machear)
 * - linkedIds?: string[] (si quieres pasar varias, ej. po + oci)
 * - emptyText?: string
 */
export default function CommunicationList({
  linkedType = "",
  linkedId = "",
  linkedIds = [],
  emptyText = "No communications yet.",
}) {
  const { rows = [], loading, error } = useSheet("communications", mapCommunications);

  const items = useMemo(() => {
    const ids = (Array.isArray(linkedIds) && linkedIds.length
      ? linkedIds
      : [linkedId]
    )
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase());

    const t = String(linkedType).trim().toLowerCase();

    const filtered = rows.filter((r) => {
      const rt = String(r.linked_type || "").toLowerCase();
      const rid = String(r.linked_id || "").trim().toLowerCase();
      const typeOk = !t || rt === t;
      const idOk = !ids.length || ids.includes(rid);
      return typeOk && idOk;
    });

    // orden: más recientes primero
    filtered.sort((a, b) => {
      const da = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const db = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return db - da;
    });

    return filtered;
  }, [rows, linkedType, linkedId, linkedIds]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="text-sm text-destructive">{String(error)}</div>;
  if (!items.length) return <div className="text-sm text-muted-foreground">{emptyText}</div>;

  return (
    <ul className="space-y-3">
      {items.map((c) => (
        <li
          key={c.id || `${c.linked_type}:${c.linked_id}:${c.createdDate}:${c.subject}`}
          className="rounded-lg border bg-card p-3"
        >
          <div className="flex items-start gap-2">
            <div className="mt-0.5 text-muted-foreground">
              <TypeIcon type={c.type} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h5 className="font-medium text-foreground">
                  {c.subject || "(no subject)"}
                </h5>
                <span className="text-xs text-muted-foreground">
                  {c.createdDate
                    ? format(new Date(c.createdDate), "PP, p")
                    : ""}
                </span>
              </div>
              {c.content ? (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                  {c.content}
                </p>
              ) : null}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>{c.participants || "—"}</span>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

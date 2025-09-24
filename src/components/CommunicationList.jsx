// src/components/CommunicationList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { API_BASE, postJSON, formatDate } from "@/lib/utils";

/* ---------------------- helpers ---------------------- */
const normalizeLinkedType = (t) => {
  const v = String(t || "").toLowerCase().trim();
  if (["order", "po", "purchase_order", "orders"].includes(v)) return "orders";
  if (["import", "imports", "shipment"].includes(v)) return "imports";
  if (["tender", "tenders"].includes(v)) return "tender";
  return v;
};

const typeIcon = (t) => {
  const v = String(t || "").toLowerCase();
  if (v === "mail" || v === "email") return "Mail";
  if (v === "meeting") return "Calendar";
  if (v === "call") return "Phone";
  if (v === "whatsapp") return "MessageCircle";
  return "FileText";
};

const entityBadge = (linkedType) => {
  const lt = normalizeLinkedType(linkedType);
  if (lt === "tender") return { cls: "bg-purple-100 text-purple-800", label: "Tender" };
  if (lt === "orders") return { cls: "bg-blue-100 text-blue-800", label: "Orders" };
  if (lt === "imports") return { cls: "bg-emerald-100 text-emerald-800", label: "Imports" };
  return { cls: "bg-gray-100 text-gray-800", label: lt || "—" };
};

const unreadBadge = (unread) =>
  unread ? (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
      Unread
    </span>
  ) : null;

/* ---------------------- main ---------------------- */
export default function CommunicationList({
  linkedType,     // "tender" | "orders" | "imports" (cualquier alias funciona)
  linkedId,       // tenderId | poNumber | shipmentId
  emptyMessage = "No communications yet.",
}) {
  const normType = normalizeLinkedType(linkedType);
  const { rows = [], loading, error } = useSheet("communications", mapCommunications);

  // estado local optimista
  const [items, setItems] = useState([]);
  const undoRef = useRef(null); // {item, index, timer}

  useEffect(() => setItems(rows), [rows]);

  // filtro por contexto si corresponde
  const filtered = useMemo(() => {
    if (!normType || !linkedId) return items;
    return (items || []).filter(
      (c) =>
        normalizeLinkedType(c.linked_type) === normType &&
        String(c.linked_id || "").trim() === String(linkedId || "").trim()
    );
  }, [items, normType, linkedId]);

  const handleToggleExpand = async (id) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, _expanded: !c._expanded } : c))
    );

    // marcar leído si estaba unread y se expande por primera vez
    const current = (items || []).find((x) => x.id === id);
    if (current && current.unread && !current._expanded) {
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
      try {
        await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
          id,
          unread: false,
        });
      } catch {
        // Si falla, revertir local
        setItems((prev) => prev.map((c) => (c.id === id ? { ...c, unread: true } : c)));
      }
    }
  };

  const handleDelete = async (item, idxInList) => {
    if (!item?.id) {
      alert('No se puede eliminar: falta "id" en esa fila de la planilla.');
      return;
    }
    const ok = window.confirm("Are you sure you want to delete?");
    if (!ok) return;

    // optimista
    setItems((prev) => prev.filter((x) => x.id !== item.id));

    // Mostrar barra de UNDO por 5s
    if (undoRef.current?.timer) clearTimeout(undoRef.current.timer);
    const timer = setTimeout(() => (undoRef.current = null), 5000);
    undoRef.current = { item, index: idxInList, timer };

    try {
      await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
        where: { id: item.id },
      });
      // si el usuario no hizo undo, dejamos así
    } catch (err) {
      // si falla el backend, devolvemos el item
      if (undoRef.current?.timer) clearTimeout(undoRef.current.timer);
      undoRef.current = null;
      setItems((prev) => {
        const clone = prev.slice();
        clone.splice(idxInList, 0, item);
        return clone;
      });
      alert("No se pudo eliminar. Intenta nuevamente.");
    }
  };

  const handleUndo = () => {
    if (!undoRef.current) return;
    const { item, index, timer } = undoRef.current;
    if (timer) clearTimeout(timer);
    undoRef.current = null;
    setItems((prev) => {
      const clone = prev.slice();
      clone.splice(index, 0, item);
      return clone;
    });
  };

  return (
    <div className="space-y-3">
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-red-600">Error loading communications.</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-sm text-muted-foreground">{emptyMessage}</div>
      )}

      {filtered.map((c, i) => {
        const badge = entityBadge(c.linked_type);
        const ico = typeIcon(c.type);
        return (
          <div
            key={c.id || i}
            className="rounded-lg border bg-muted/40 p-4 hover:bg-muted transition-colors"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-3">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleToggleExpand(c.id)}
                role="button"
              >
                <div className="flex items-center gap-2">
                  <Icon name={ico} size={16} />
                  <div className="font-medium text-foreground">
                    {c.subject || "(sin asunto)"} {unreadBadge(c.unread)}
                  </div>
                  <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.type || "note"} • {c.participants || "—"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground">{formatDate(c.createdDate)}</div>
                <Button
                  variant="destructive"
                  size="sm"
                  iconName="Trash2"
                  onClick={() => handleDelete(c, i)}
                >
                  Delete
                </Button>
              </div>
            </div>

            {/* body (preview / full) */}
            <div className="mt-3 text-sm whitespace-pre-wrap">
              {!c._expanded ? (
                <span className="text-muted-foreground">{c.preview || "—"}</span>
              ) : (
                <span>{c.content || "—"}</span>
              )}
            </div>

            {/* pie: link info */}
            {c.linked_type && c.linked_id ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Linked: {normalizeLinkedType(c.linked_type)} • {c.linked_id}
              </div>
            ) : null}
          </div>
        );
      })}

      {/* barra de undo */}
      {undoRef.current ? (
        <div className="sticky bottom-4 z-[5] mx-auto w-fit rounded-full bg-neutral-800/90 px-3 py-1.5 text-sm text-white shadow-lg">
          Deleted.{" "}
          <button className="underline underline-offset-2" onClick={handleUndo}>
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}

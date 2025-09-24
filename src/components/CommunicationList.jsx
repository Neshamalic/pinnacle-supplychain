// src/components/CommunicationList.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import { API_BASE, postJSON, fetchJSON, formatDate } from "@/lib/utils";

/* ---------------- helpers ---------------- */
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

/* ---- simple session cache ---- */
const COMMS_CACHE = (() => {
  if (!window.__COMMS_CACHE) window.__COMMS_CACHE = { all: null, byKey: {} };
  return window.__COMMS_CACHE;
})();

/* ---------------- component ---------------- */
export default function CommunicationList({
  linkedType, // "tender" | "orders" | "imports" (alias ok)
  linkedId,
  emptyMessage = "No communications yet.",
}) {
  const normType = normalizeLinkedType(linkedType);

  // Hook genérico (carga toda la hoja; lo usaremos sólo si no hay filtro)
  const { rows = [], loading: loadingAll, error } = useSheet("communications", mapCommunications);

  // Estado local
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Paginación “Load more”
  const PAGE = 20;
  const [visible, setVisible] = useState(PAGE);

  // Undo delete
  const undoRef = useRef(null);

  // 1) Carga optimizada: si hay contexto, pedimos al server SOLO esas filas
  useEffect(() => {
    let abort = false;

    const key = normType && linkedId ? `${normType}:${linkedId}` : null;

    const fromCache = () => {
      if (!key) return null;
      const entry = COMMS_CACHE.byKey[key];
      if (entry && Date.now() - entry.ts < 120000) return entry.rows; // 2 min TTL
      return null;
    };

    const load = async () => {
      setLoading(true);
      setVisible(PAGE);

      // si hay cache inmediato
      const cached = fromCache();
      if (cached && !abort) {
        setItems(cached);
        setLoading(false);
      }

      // si tenemos contexto, pedimos filtrado al Apps Script (rápido)
      if (normType && linkedId) {
        try {
          const res = await fetchJSON(
            `${API_BASE}?route=table&name=communications&lt=${encodeURIComponent(
              normType
            )}&lid=${encodeURIComponent(linkedId)}`
          );
          if (!abort && res?.ok) {
            const rows = (res.rows || []).map(mapCommunications);
            setItems(rows);
            COMMS_CACHE.byKey[key] = { rows, ts: Date.now() };
            setLoading(false);
            return;
          }
        } catch {
          // si falla, seguimos con el hook genérico
        }
      }

      // fallback: usamos la tabla completa (hook) y filtramos
      const all = (rows || []).map((r) => r);
      if (!abort) {
        if (normType && linkedId) {
          const filtered = all.filter(
            (c) =>
              normalizeLinkedType(c.linked_type) === normType &&
              String(c.linked_id || "").trim() === String(linkedId || "").trim()
          );
          setItems(filtered);
          if (key) COMMS_CACHE.byKey[key] = { rows: filtered, ts: Date.now() };
        } else {
          setItems(all);
          COMMS_CACHE.all = { rows: all, ts: Date.now() };
        }
        setLoading(false);
      }
    };

    // Primera carga rápida desde cache “global”
    if (!normType || !linkedId) {
      const entry = COMMS_CACHE.all;
      if (entry && Date.now() - entry.ts < 120000) {
        setItems(entry.rows);
        setLoading(false);
      }
    }

    load();
    return () => {
      abort = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normType, linkedId, rows]);

  // “Load more”
  const visibleItems = useMemo(() => items.slice(0, visible), [items, visible]);

  const handleToggleExpand = async (id) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, _expanded: !c._expanded } : c))
    );
    const current = (items || []).find((x) => x.id === id);
    if (current && current.unread && !current._expanded) {
      // marcar leído
      setItems((prev) => prev.map((c) => (c.id === id ? { ...c, unread: false } : c)));
      try {
        await postJSON(`${API_BASE}?route=write&action=update&name=communications`, {
          id,
          unread: false,
        });
      } catch {
        setItems((prev) => prev.map((c) => (c.id === id ? { ...c, unread: true } : c)));
      }
    }
  };

  const handleDelete = async (item, idxInList) => {
    if (!item?.id) {
      alert('No se puede eliminar: falta "id" en esa fila de la planilla.');
      return;
    }
    if (!window.confirm("Are you sure you want to delete?")) return;

    // optimista
    const globalIndex = items.findIndex((x) => x.id === item.id);
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    if (undoRef.current?.timer) clearTimeout(undoRef.current.timer);
    const timer = setTimeout(() => (undoRef.current = null), 5000);
    undoRef.current = { item, index: globalIndex, timer };

    try {
      await postJSON(`${API_BASE}?route=write&action=delete&name=communications`, {
        where: { id: item.id },
      });
    } catch {
      // revert si falló
      if (undoRef.current?.timer) clearTimeout(undoRef.current.timer);
      undoRef.current = null;
      setItems((prev) => {
        const clone = prev.slice();
        clone.splice(globalIndex, 0, item);
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
      {!loading && items.length === 0 && (
        <div className="text-sm text-muted-foreground">{emptyMessage}</div>
      )}

      {visibleItems.map((c, i) => {
        const badge = entityBadge(c.linked_type);
        const ico = typeIcon(c.type);
        const expanded = !!c._expanded;

        return (
          <div
            key={c.id || i}
            className="rounded-lg border bg-muted/40 p-4 hover:bg-muted transition-colors"
          >
            {/* header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
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

            {/* body con “Show more/less” (colapsable real) */}
            <div className="mt-3 text-sm relative">
              <div
                className={expanded ? "whitespace-pre-wrap" : "whitespace-pre-wrap overflow-hidden"}
                style={expanded ? {} : { maxHeight: 72 }} // ~3 líneas
              >
                {expanded ? (c.content || "—") : (c.preview || "—")}
              </div>

              {!expanded && (c.content || "").length > (c.preview || "").length ? (
                <div className="mt-2">
                  <button
                    className="text-primary text-sm underline underline-offset-2"
                    onClick={() => handleToggleExpand(c.id)}
                  >
                    Show more
                  </button>
                </div>
              ) : (
                (c.content || "").length > 0 && (
                  <div className="mt-2">
                    <button
                      className="text-primary text-sm underline underline-offset-2"
                      onClick={() => handleToggleExpand(c.id)}
                    >
                      Show less
                    </button>
                  </div>
                )
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

      {/* Load more */}
      {visible < items.length ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setVisible((v) => v + PAGE)}>
            Load more
          </Button>
        </div>
      ) : null}

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

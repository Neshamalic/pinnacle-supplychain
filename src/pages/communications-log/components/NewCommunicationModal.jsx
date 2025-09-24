// src/pages/communications-log/components/NewCommunicationModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Icon from "@/components/AppIcon";
import Button from "@/components/ui/Button";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrderItems, mapTenders, mapTenderItems, mapImports } from "@/lib/adapters";
import { API_BASE, postJSON } from "@/lib/utils";

const TYPES = ["Meeting", "Mail", "Call", "Whatsapp", "Other"];
const TYPE_VALUE = (t) => String(t || "").toLowerCase(); // meeting, mail, call, whatsapp, other

// Normaliza linkedType para guardar SIEMPRE en minúsculas/plural.
function normalizeLinkedType(v) {
  const s = String(v || "").toLowerCase().trim();
  if (s === "order") return "orders";
  if (s === "import") return "imports";
  if (s === "tenders") return "tender";
  return s; // tender | orders | imports
}

export default function NewCommunicationModal({
  open,
  onClose,
  onSaved,                // callback para refrescar lista/Drawer
  defaultLinkedType,      // "tender" | "orders" | "imports" (o "order"/"import")
  defaultLinkedId = "",
}) {
  const [saving, setSaving] = useState(false);

  // ====== Campos ======
  const [type, setType] = useState("Meeting");
  const [subject, setSubject] = useState("");
  const [participants, setParticipants] = useState("");
  const [content, setContent] = useState("");
  const [linkedType, setLinkedType] = useState(normalizeLinkedType(defaultLinkedType));
  const [linkedId, setLinkedId] = useState(defaultLinkedId);

  // ====== Datos para opciones del Linked ID ======
  // Orders: usar purchase_order_items (lista única de PO)
  const { rows: poItems = [] } = useSheet("purchase_order_items", mapPurchaseOrderItems);
  const orderOptions = useMemo(() => {
    const set = new Set();
    (poItems || []).forEach((r) => r.poNumber && set.add(r.poNumber));
    return Array.from(set).sort();
  }, [poItems]);

  // Imports: usar imports (shipment_id)
  const { rows: imps = [] } = useSheet("imports", mapImports);
  const importOptions = useMemo(() => {
    const set = new Set();
    (imps || []).forEach((r) => r.shipmentId && set.add(r.shipmentId));
    return Array.from(set).sort();
  }, [imps]);

  // Tenders: usar tender_items (tenderId)
  const { rows: tenderItems = [] } = useSheet("tender_items", mapTenderItems);
  const tenderOptions = useMemo(() => {
    const set = new Set();
    (tenderItems || []).forEach((r) => r.tenderId && set.add(r.tenderId));
    return Array.from(set).sort();
  }, [tenderItems]);

  // Si cambia default (por abrir modal con otra entidad), sincroniza
  useEffect(() => {
    setLinkedType(normalizeLinkedType(defaultLinkedType));
    setLinkedId(defaultLinkedId || "");
  }, [defaultLinkedType, defaultLinkedId]);

  if (!open) return null;

  const close = () => {
    if (!saving) onClose?.();
  };

  const linkedIdOptions = useMemo(() => {
    if (linkedType === "orders") return orderOptions;
    if (linkedType === "imports") return importOptions;
    if (linkedType === "tender")  return tenderOptions;
    return [];
  }, [linkedType, orderOptions, importOptions, tenderOptions]);

  async function handleSave(e) {
    e?.preventDefault(); // evita recarga por si está dentro de un form
    if (saving) return;

    // Validaciones básicas
    if (!subject.trim()) return alert("Subject es requerido.");
    if (!linkedType)     return alert("Selecciona Linked Type.");
    if (!linkedId)       return alert("Selecciona Linked ID.");

    setSaving(true);
    try {
      const row = {
        created_date: new Date().toISOString(),
        type: TYPE_VALUE(type),
        subject: subject.trim(),
        participants: participants.trim(),         // "Name1@..., Name2@..."
        content: content.trim(),
        preview: (content || "").slice(0, 160),
        linked_type: linkedType,                   // tender | orders | imports
        linked_id: linkedId,
        unread: true,
      };

      await postJSON(`${API_BASE}?route=write&action=create&name=communications`, { row });

      // notificar a quien abrió el modal
      await onSaved?.();
      // limpia y cierra
      setType("Meeting");
      setSubject("");
      setParticipants("");
      setContent("");
      setLinkedId(defaultLinkedId || "");
      close();
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar la comunicación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2200] bg-black/40 flex items-start justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-medium text-lg">New Communication</div>
          <button type="button" onClick={close} className="p-2 hover:bg-muted rounded-md">
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type</div>
            <div className="relative">
              <select
                className="w-full rounded-md border px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div className="absolute right-3 top-2.5 text-muted-foreground"><Icon name="ChevronDown" size={16} /></div>
            </div>
          </div>

          {/* Subject */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Subject</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ej: Weekly review – Q4 tenders"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Participants */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Participants</div>
            <input
              className="w-full rounded-md border px-3 py-2"
              placeholder="Name1@..., Name2@..."
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
            <div className="text-[11px] text-muted-foreground mt-1">
              Escribe nombres/correos separados por coma.
            </div>
          </div>

          {/* Linked Type + Linked ID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Linked Type</div>
              <div className="relative">
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={linkedType}
                  onChange={(e) => {
                    const v = normalizeLinkedType(e.target.value);
                    setLinkedType(v);
                    setLinkedId(""); // reset id al cambiar tipo
                  }}
                >
                  <option value="tender">Tender</option>
                  <option value="orders">Orders</option>
                  <option value="imports">Imports</option>
                </select>
                <div className="absolute right-3 top-2.5 text-muted-foreground"><Icon name="ChevronDown" size={16} /></div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Linked ID</div>
              <div className="relative">
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={linkedId}
                  onChange={(e) => setLinkedId(e.target.value)}
                >
                  <option value="" disabled>Selecciona…</option>
                  {linkedIdOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-2.5 text-muted-foreground"><Icon name="ChevronDown" size={16} /></div>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                • Orders: PO Number — • Imports: Shipment ID — • Tender: Tender ID
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Content</div>
            <textarea
              rows={6}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Escribe la nota, resumen de reunión, correo, etc."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving} iconName={saving ? "Loader2" : undefined}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}

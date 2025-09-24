// src/pages/communications-log/components/NewCommunicationModal.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { API_BASE, postJSON } from "@/lib/utils";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrders, mapTenders, mapImports } from "@/lib/adapters";

const TYPES = ["Meeting", "Mail", "Call", "Whatsapp", "Other"];
const LINKED = ["Orders", "Imports", "Tender"];

export default function NewCommunicationModal({
  open,
  onClose,
  onSaved,
  defaultLinkedType,
  defaultLinkedId,
}) {
  const [type, setType] = useState(TYPES[0]);
  const [subject, setSubject] = useState("");
  const [participants, setParticipants] = useState("");
  const [content, setContent] = useState("");
  const [linkedType, setLinkedType] = useState(defaultLinkedType || LINKED[0]);
  const [linkedId, setLinkedId] = useState(defaultLinkedId || "");
  const [saving, setSaving] = useState(false);

  // opciones para Linked ID
  const { rows: poRows = [] } = useSheet("purchase_orders", mapPurchaseOrders);
  const { rows: tenderRows = [] } = useSheet("tenders", mapTenders);
  const { rows: importRows = [] } = useSheet("imports", mapImports);

  const options = useMemo(() => {
    if (linkedType === "Orders") {
      return Array.from(new Set(poRows.map(r => r.poNumber))).filter(Boolean);
    }
    if (linkedType === "Imports") {
      return Array.from(new Set(importRows.map(r => r.shipmentId))).filter(Boolean);
    }
    if (linkedType === "Tender") {
      return Array.from(new Set(tenderRows.map(r => r.tenderId))).filter(Boolean);
    }
    return [];
  }, [linkedType, poRows, tenderRows, importRows]);

  const preview = useMemo(() => (content || "").slice(0, 160), [content]);

  if (!open) return null;

  const close = () => {
    if (!saving) onClose?.();
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const id = (crypto?.randomUUID?.() || String(Date.now()));
      const created_date = new Date().toISOString();

      const row = {
        id,
        created_date,
        type,
        subject,
        participants,
        content,
        preview,
        unread: "true",       // ← al crear queda sin leer
        deleted: "",          // ← soft delete
        linked_type: linkedType.toLowerCase(), // "orders" | "imports" | "tender"
        linked_id: linkedId || "",
      };

      await postJSON(`${API_BASE}?route=write&action=create&name=communications`, row);
      onSaved?.();
      onClose?.();
    } catch (err) {
      alert("Error guardando: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2300] bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-card rounded-lg shadow-2xl border border-border">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">New Communication</div>
          <Button variant="ghost" size="icon" onClick={close}><Icon name="X" size={18} /></Button>
        </div>

        <div className="p-4 space-y-3">
          {/* Type */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type</div>
            <select className="w-full rounded-md border p-2" value={type} onChange={e => setType(e.target.value)}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Subject</div>
            <input className="w-full rounded-md border p-2" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ej: Weekly review – Q4 tenders" />
          </div>

          {/* Participants */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Participants</div>
            <input className="w-full rounded-md border p-2" value={participants} onChange={e => setParticipants(e.target.value)} placeholder="Name1@..., Name2@..." />
            <div className="text-[11px] text-muted-foreground mt-1">Escribe nombres/correos separados por coma.</div>
          </div>

          {/* Linked */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Linked Type</div>
              <select className="w-full rounded-md border p-2" value={linkedType} onChange={e => setLinkedType(e.target.value)}>
                {LINKED.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Linked ID</div>
              <select className="w-full rounded-md border p-2" value={linkedId} onChange={e => setLinkedId(e.target.value)}>
                <option value="">Selecciona…</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <div className="text-[11px] text-muted-foreground mt-1">
                • Orders: PO Number — • Imports: Shipment ID — • Tender: Tender ID
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="text-xs text-muted-foreground mb-1">Content</div>
            <textarea className="w-full rounded-md border p-2 min-h-[160px]" value={content} onChange={e => setContent(e.target.value)} placeholder="Escribe la nota, resumen de reunión, correo, etc." />
          </div>
        </div>

        <div className="p-3 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} iconName="Save">{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </div>
  );
}

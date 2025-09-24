// src/pages/communications-log/components/NewCommunicationModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { API_BASE, postJSON } from "@/lib/utils";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrders, mapImports, mapTenders } from "@/lib/adapters";

const normalizeLinkedType = (t) => {
  const v = String(t || "").toLowerCase();
  if (["order", "po", "purchase_order", "orders"].includes(v)) return "orders";
  if (["import", "imports", "shipment"].includes(v)) return "imports";
  return "tender";
};

const uuid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();

export default function NewCommunicationModal({
  open,
  onClose,
  onSaved,
  defaultLinkedType,
  defaultLinkedId,
}) {
  const [type, setType] = useState("meeting");
  const [subject, setSubject] = useState("");
  const [participants, setParticipants] = useState("");
  const [content, setContent] = useState("");
  const [linkedType, setLinkedType] = useState(defaultLinkedType || "tender");
  const [linkedId, setLinkedId] = useState(defaultLinkedId || "");
  const [saving, setSaving] = useState(false);

  // opciones para linkedId
  const { rows: tenders = [] } = useSheet("tender_items", mapTenders); // tender ids pueden venir por items
  const { rows: poRows = [] } = useSheet("purchase_orders", mapPurchaseOrders);
  const { rows: impRows = [] } = useSheet("imports", mapImports);

  const tenderIds = useMemo(() => {
    const s = new Set();
    (tenders || []).forEach((r) => r.tenderId && s.add(r.tenderId));
    return Array.from(s);
  }, [tenders]);

  const poIds = useMemo(() => {
    const s = new Set();
    (poRows || []).forEach((r) => r.poNumber && s.add(r.poNumber));
    return Array.from(s);
  }, [poRows]);

  const shipmentIds = useMemo(() => {
    const s = new Set();
    (impRows || []).forEach((r) => r.shipmentId && s.add(r.shipmentId));
    return Array.from(s);
  }, [impRows]);

  useEffect(() => {
    setLinkedType(defaultLinkedType || "tender");
    setLinkedId(defaultLinkedId || "");
  }, [defaultLinkedType, defaultLinkedId, open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    const lt = normalizeLinkedType(linkedType);
    const row = {
      id: uuid(),
      created_date: new Date().toISOString(),
      type,
      subject,
      participants,
      content,
      preview: (content || "").slice(0, 160),
      linked_type: lt,
      linked_id: linkedId,
      unread: true,
    };
    try {
      await postJSON(`${API_BASE}?route=write&action=create&name=communications`, row);
      onSaved?.({
        id: row.id,
        createdDate: row.created_date,
        type: row.type,
        subject: row.subject,
        participants: row.participants,
        content: row.content,
        preview: row.preview,
        linked_type: row.linked_type,
        linked_id: row.linked_id,
        unread: true,
      });
      onClose?.();
      // limpiar
      setSubject(""); setParticipants(""); setContent("");
    } catch (e) {
      alert("No se pudo guardar. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const renderLinkedOptions = () => {
    const lt = normalizeLinkedType(linkedType);
    const opts =
      lt === "tender" ? tenderIds : lt === "orders" ? poIds : shipmentIds;
    return (
      <select
        className="w-full rounded-md border p-2 text-sm"
        value={linkedId}
        onChange={(e) => setLinkedId(e.target.value)}
      >
        <option value="">Selecciona…</option>
        {opts.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    );
  };

  return (
    <div className="fixed inset-0 z-[2200] bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">New Communication</div>
          <Button variant="ghost" size="icon" onClick={onClose}><Icon name="X" size={18} /></Button>
        </div>

        <div className="grid gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Type</div>
            <select className="w-full rounded-md border p-2 text-sm" value={type} onChange={(e)=>setType(e.target.value)}>
              <option value="meeting">Meeting</option>
              <option value="mail">Mail</option>
              <option value="call">Call</option>
              <option value="whatsapp">Whatsapp</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Subject</div>
            <input className="w-full rounded-md border p-2 text-sm" value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Ej: Weekly review – Q4 tenders" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Participants</div>
            <input className="w-full rounded-md border p-2 text-sm" value={participants} onChange={(e)=>setParticipants(e.target.value)} placeholder="Name1@…, Name2@…" />
            <div className="text-xs text-muted-foreground mt-1">Escribe nombres/correos separados por coma.</div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Linked Type</div>
              <select
                className="w-full rounded-md border p-2 text-sm"
                value={normalizeLinkedType(linkedType)}
                onChange={(e) => setLinkedType(e.target.value)}
              >
                <option value="tender">Tender</option>
                <option value="orders">Orders</option>
                <option value="imports">Imports</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Linked ID</div>
              {renderLinkedOptions()}
              <div className="text-xs text-muted-foreground mt-1">
                • Orders: PO Number — • Imports: Shipment ID — • Tender: Tender ID
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Content</div>
            <textarea className="w-full rounded-md border p-2 text-sm min-h-[120px]" value={content} onChange={(e)=>setContent(e.target.value)} placeholder="Escribe la nota, resumen de reunión, correo, etc." />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button iconName="Save" onClick={handleSave} disabled={saving}>Save</Button>
        </div>
      </div>
    </div>
  );
}

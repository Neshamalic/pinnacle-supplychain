// src/pages/communications-log/components/NewCommunicationModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet, writeRow } from "@/lib/sheetsApi";
import { mapTenderItems, mapPurchaseOrderItems, mapImports } from "@/lib/adapters";

/**
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSaved?: () => void  // callback para refrescar la lista
 */
export default function NewCommunicationModal({ open, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);

  // Form state
  const [type, setType] = useState("Meeting");
  const [subject, setSubject] = useState("");
  const [participants, setParticipants] = useState("");
  const [content, setContent] = useState("");
  const [linkedType, setLinkedType] = useState("Tender"); // Tender | Orders | Imports (labels UI)
  const [linkedId, setLinkedId] = useState("");

  // Cargar listas para el selector dependiente
  const { rows: tenderItems = [] } = useSheet("tender_items", mapTenderItems);
  const { rows: poItems = [] } = useSheet("purchase_order_items", mapPurchaseOrderItems);
  const { rows: importRows = [] } = useSheet("imports", mapImports);

  // Helpers para opciones únicas
  const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));

  const tenderOptions = useMemo(() => {
    const ids = unique((tenderItems || []).map((r) => r?.tenderId || r?.tender_id));
    return ids.sort();
  }, [tenderItems]);

  const orderOptions = useMemo(() => {
    const ids = unique((poItems || []).map((r) => r?.poNumber || r?.po_number));
    return ids.sort();
  }, [poItems]);

  const importOptions = useMemo(() => {
    const ids = unique((importRows || []).map((r) => r?.shipmentId || r?.shipment_id));
    return ids.sort();
  }, [importRows]);

  // Reiniciar linkedId cuando cambia linkedType
  useEffect(() => {
    setLinkedId("");
  }, [linkedType]);

  if (!open) return null;

  const handleClose = () => {
    if (!saving) onClose?.();
  };

  const nowIso = () => new Date().toISOString();
  const preview = (txt) => (txt || "").slice(0, 160);

  // Mapeo UI → valores que guardamos en la hoja
  const toSheetLinkedType = (label) => {
    const v = String(label || "").toLowerCase();
    if (v.startsWith("tender")) return "tender";
    if (v.startsWith("order")) return "order";
    if (v.startsWith("import")) return "import";
    return "";
  };

  const validate = () => {
    if (!type) return "Selecciona Type.";
    if (!subject.trim()) return "Escribe un Subject.";
    if (!linkedType) return "Selecciona Linked Type.";
    if (!linkedId) return "Selecciona Linked ID.";
    return "";
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    const err = validate();
    if (err) {
      alert(err);
      return;
    }

    const row = {
      created_date: nowIso(),
      type,
      subject,
      participants, // formato libre: Name1@..., Name2@...
      content,
      linked_type: toSheetLinkedType(linkedType), // 'tender' | 'order' | 'import'
      linked_id: linkedId,                         // tender_id | po_number | shipment_id
      unread: true,
      preview: preview(content),
    };

    try {
      setSaving(true);
      await writeRow("communications", row); // sheetsApi ya expone writeRow(name, row). :contentReference[oaicite:3]{index=3}
      setSaving(false);
      onSaved?.();
      onClose?.();
      // limpiar formulario para próxima vez
      setType("Meeting");
      setSubject("");
      setParticipants("");
      setContent("");
      setLinkedType("Tender");
      setLinkedId("");
    } catch (e) {
      setSaving(false);
      alert(`No se pudo guardar: ${e?.message || e}`);
    }
  };

  // Opciones para el selector de Linked ID según el tipo elegido
  const currentIdOptions =
    linkedType === "Orders" ? orderOptions :
    linkedType === "Imports" ? importOptions :
    tenderOptions; // Tender por defecto

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[720px] max-w-[95vw] rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">New Communication</h3>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <Icon name="x" />
          </button>
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 px-5 py-5">
          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>Meeting</option>
              <option>Mail</option>
              <option>Call</option>
              <option>Whatsapp</option>
              <option>Other</option>
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-sm font-medium">Subject</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Weekly review – Q4 tenders"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="mb-1 block text-sm font-medium">Participants</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Name1@..., Name2@..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Escribe nombres/correos separados por coma.
            </p>
          </div>

          {/* Linked Type + Linked ID */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Linked Type</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={linkedType}
                onChange={(e) => setLinkedType(e.target.value)}
              >
                <option>Tender</option>
                <option>Orders</option>
                <option>Imports</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Linked ID</label>
              <select
                className="w-full rounded-md border px-3 py-2"
                value={linkedId}
                onChange={(e) => setLinkedId(e.target.value)}
              >
                <option value="" disabled>Selecciona…</option>
                {currentIdOptions.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                • Orders: PO Number — • Imports: Shipment ID — • Tender: Tender ID
              </p>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-sm font-medium">Content</label>
            <textarea
              className="h-36 w-full rounded-md border px-3 py-2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe la nota, resumen de reunión, correo, etc."
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

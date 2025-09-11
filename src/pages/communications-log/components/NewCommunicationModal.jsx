import React, { useState } from "react";
import { writeRow } from "@/lib/sheetsApi";

const TYPES = ["email", "call", "meeting", "whatsapp", "note"];
const LINKED_TYPES = [
  { value: "tender", label: "Tender (tender_id)" },
  { value: "po", label: "Purchase Order (po_number)" },
  { value: "oci", label: "Internal Order (oci_number)" },
  { value: "import", label: "Import (shipment_id)" },
];

export default function NewCommunicationModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    type: "",
    subject: "",
    content: "",
    participants: "",
    linked_type: "",
    linked_id: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function handleSave() {
    setErr("");
    if (!form.type || !form.subject || !form.content) {
      setErr("Please complete Type, Subject and Content.");
      return;
    }
    try {
      setSaving(true);
      const nowIso = new Date().toISOString();
      await writeRow("communications", {
        type: form.type,
        subject: form.subject,
        content: form.content,
        participants: form.participants,
        linked_type: (form.linked_type || "").toLowerCase(),
        linked_id: (form.linked_id || "").trim(),
        created_date: nowIso,
        preview: form.content.slice(0, 200),
      });
      onSaved?.();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background border-l shadow-xl overflow-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Communication</h3>
          <button className="text-muted-foreground" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {err && <div className="text-red-600 text-sm">{err}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              Communication Type *
              <select
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="">Select an option</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Subject *
              <input
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Enter communication subject…"
              />
            </label>
          </div>

          <label className="text-sm block">
            Content *
            <textarea
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background min-h-[140px]"
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Enter communication details…"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              Participants
              <input
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
                value={form.participants}
                onChange={(e) => set("participants", e.target.value)}
                placeholder="e.g. juan@acme.com; ana@acme.com"
              />
            </label>

            <label className="text-sm">
              Linked Entity (optional)
              <select
                className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
                value={form.linked_type}
                onChange={(e) => set("linked_type", e.target.value)}
              >
                <option value="">None</option>
                {LINKED_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="text-sm block">
            Linked ID
            <input
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
              value={form.linked_id}
              onChange={(e) => set("linked_id", e.target.value)}
              placeholder="TEN-2024-001 / PO-2025-001 / OCI-123 / EXP-24-25-M-52…"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <button className="px-3 py-2 text-sm rounded-md border" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save Communication"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

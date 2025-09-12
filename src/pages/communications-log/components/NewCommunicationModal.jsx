// src/pages/communications-log/components/NewCommunicationModal.jsx
import React, { useState } from "react";
import Button from "@/components/ui/Button";
import { createCommunication } from "@/lib/sheetsApi";

const TYPES = ["email", "call", "meeting", "message"];
const LINKED_TYPES = [
  { label: "Tender", value: "tender" },
  { label: "Purchase Order (PO/OCI)", value: "po" },
  { label: "Import (Shipment)", value: "import" },
];

export default function NewCommunicationModal({ open, onClose, onSaved }) {
  const [type, setType] = useState("email");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [participants, setParticipants] = useState("");
  const [linkedType, setLinkedType] = useState("tender");
  const [linkedId, setLinkedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSave = async () => {
    setError("");
    if (!subject.trim() || !content.trim()) {
      setError("Subject and Content are required.");
      return;
    }
    if (!linkedId.trim()) {
      setError("Linked ID is required.");
      return;
    }

    const payload = {
      type,
      subject: subject.trim(),
      content: content.trim(),
      participants: participants.trim(),
      linked_type: linkedType, // tender | po | import
      linked_id: linkedId.trim(),
      created_date: new Date().toISOString(),
    };

    try {
      setSaving(true);
      await createCommunication(payload);
      setSaving(false);
      onSaved?.(); // refresca la lista
      onClose?.();
    } catch (e) {
      setSaving(false);
      setError(e.message || "Error saving communication");
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="border-b px-6 py-4">
          <div className="text-lg font-semibold">New Communication</div>
          {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
        </div>

        <div className="px-6 py-4 space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-muted-foreground">Communication Type *</span>
              <select
                className="w-full rounded border px-3 py-2"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-muted-foreground">Subject *</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-muted-foreground">Content *</span>
            <textarea
              rows={6}
              className="w-full rounded border px-3 py-2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter communication details…"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-muted-foreground">
              Participants (comma separated)
            </span>
            <input
              className="w-full rounded border px-3 py-2"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="e.g. Alice, Bob"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-muted-foreground">Linked Type</span>
              <select
                className="w-full rounded border px-3 py-2"
                value={linkedType}
                onChange={(e) => setLinkedType(e.target.value)}
              >
                {LINKED_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2 space-y-1">
              <span className="text-muted-foreground">Linked ID *</span>
              <input
                className="w-full rounded border px-3 py-2"
                value={linkedId}
                onChange={(e) => setLinkedId(e.target.value)}
                placeholder="Tender ID / PO/OCI / Shipment ID"
              />
            </label>
          </div>
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Communication"}
          </Button>
        </div>
      </div>
    </div>
  );
}

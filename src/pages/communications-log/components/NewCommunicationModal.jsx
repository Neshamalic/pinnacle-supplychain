import { useState } from "react";

// Usa tu endpoint de Apps Script.
// O bien define VITE_SHEETS_ENDPOINT en .env
const SCRIPT_URL =
  import.meta.env.VITE_SHEETS_ENDPOINT ||
  window.__GS_URL__ ||
  "PASTE_YOUR_APPS_SCRIPT_URL_HERE"; // <-- reemplázalo si no usas env

async function createCommunication(row) {
  const res = await fetch(`${SCRIPT_URL}?route=write&name=communications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      name: "communications",
      row,
    }),
  });

  // Aseguramos parseo robusto
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    const txt = await res.text();
    throw new Error(txt || "Empty response from Apps Script");
  }

  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.error || "Failed to save");
  }
  return payload;
}

const LINKED_TYPES = [
  { value: "tender", label: "Tender" },
  { value: "po", label: "Purchase Order (PO)" },
  { value: "oci", label: "OCI (internal PO)" },
  { value: "import", label: "Import (Shipment ID)" },
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
    setSaving(true);
    try {
      const row = {
        created_date: new Date().toISOString(),
        type,
        subject,
        content,
        participants,
        linked_type: linkedType, // tender | po | oci | import
        linked_id: linkedId,
        preview: (content || "").slice(0, 160),
      };
      await createCommunication(row);
      setSaving(false);
      onSaved?.();  // pide recargar la tabla en el padre
      onClose?.();
    } catch (e) {
      setSaving(false);
      setError(String(e.message || e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
      <div className="w-[720px] rounded-xl bg-white p-20 shadow-xl">
        <div className="flex items-center justify-between mb-12">
          <h3 className="text-lg font-semibold">New Communication</h3>
          <button onClick={onClose} className="text-slate-500">✕</button>
        </div>

        {error && (
          <div className="mb-12 rounded-md bg-red-50 p-12 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-12">
          <div>
            <label className="text-sm font-medium">Communication Type *</label>
            <select
              className="mt-2 w-full rounded-md border p-10"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="phone">Phone</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="note">Note</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Subject *</label>
            <input
              className="mt-2 w-full rounded-md border p-10"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Content *</label>
            <textarea
              rows={6}
              className="mt-2 w-full rounded-md border p-10"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter communication details..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Participants</label>
            <input
              className="mt-2 w-full rounded-md border p-10"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="Comma separated…"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Linked Type *</label>
            <select
              className="mt-2 w-full rounded-md border p-10"
              value={linkedType}
              onChange={(e) => setLinkedType(e.target.value)}
            >
              {LINKED_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Linked ID *</label>
            <input
              className="mt-2 w-full rounded-md border p-10"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              placeholder="e.g. 621-29-LR25, PO-2025-001, OCI-171, EXP-25-26-UK-14…"
            />
          </div>
        </div>

        <div className="mt-16 flex justify-end gap-8">
          <button className="rounded-md border px-16 py-10" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-md bg-blue-600 px-16 py-10 text-white disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Communication"}
          </button>
        </div>
      </div>
    </div>
  );
}

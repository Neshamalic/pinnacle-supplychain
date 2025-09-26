// src/pages/purchase-order-tracking/components/NewPOCommunicationModal.jsx
import { useState } from "react";
import { commCreate } from "@/lib/sheetsApi";

export default function NewPOCommunicationModal({ poNumber, onClose, onSaved }) {
  const [type, setType] = useState("Meeting");
  const [subject, setSubject] = useState("");
  const [participants, setParticipants] = useState("");
  const [content, setContent] = useState("");

  async function handleSave() {
    // participants: texto libre. Puedes transformarlo a array si lo manejas así en otro lado.
    await commCreate({
      type,
      subject,
      participants,
      content,
      linked_type: "orders",
      linked_id: poNumber,
    });
    onSaved?.();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center">
      <div className="bg-white w-full max-w-3xl rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold">New Communication</h3>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600">Type</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2"
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
          <div>
            <label className="text-sm text-gray-600">Linked ID</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={poNumber || ""}
              disabled
            />
            <div className="text-xs text-gray-500 mt-1">
              Linked Type: <b>Orders</b>
            </div>
          </div>

          <div className="col-span-2">
            <label className="text-sm text-gray-600">Subject</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ej: Weekly review – Q4 tenders"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="text-sm text-gray-600">Participants</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="name1@..., name2@..."
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-1">
              Escribe nombres/correos separados por coma.
            </div>
          </div>

          <div className="col-span-2">
            <label className="text-sm text-gray-600">Content</label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 h-36"
              placeholder="Escribe la nota, resumen de reunión, correo, etc."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// src/pages/communications-log/index.jsx
import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Icon from "@/components/AppIcon";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";

const API_BASE = import.meta.env.VITE_SHEETS_API; // el mismo que usas en useSheet

export default function CommunicationsLog() {
  const { rows = [], loading, error, refresh } = useSheet("communications", mapCommunications);

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.subject || "").toLowerCase().includes(q) ||
      (r.content || "").toLowerCase().includes(q) ||
      (r.participants || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const grouped = useMemo(() => {
    // agrupa por fecha (día)
    const byDay = new Map();
    for (const r of filtered) {
      const day = r.createdDate ? new Date(r.createdDate) : null;
      const key = day ? new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString() : "unknown";
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(r);
    }
    // orden descendente
    return Array.from(byDay.entries())
      .sort((a, b) => (a[0] > b[0] ? -1 : 1))
      .map(([k, arr]) => ({ day: k, items: arr.sort((a, b) => (a.createdDate > b.createdDate ? -1 : 1)) }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Communications Log</h1>
          <p className="text-muted-foreground">
            Track communications and link them to tenders, POs, and imports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Icon name="FileDown" className="mr-2" /> Export Report
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Icon name="Plus" className="mr-2" /> New Communication
          </Button>
        </div>
      </div>

      {/* Filtros básicos */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none"
            placeholder="Search communications…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* aquí puedes añadir selects para Type/Participants/Linked Entity si quieres */}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-6">
        {loading && <div>Loading communications…</div>}
        {error && <div className="text-red-600">Error: {String(error)}</div>}
        {!loading && grouped.length === 0 && (
          <div className="text-muted-foreground">No communications found.</div>
        )}

        {grouped.map(({ day, items }) => {
          const d = day !== "unknown" ? new Date(day) : null;
          return (
            <div key={day}>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                {d ? d.toLocaleDateString() : "Unknown date"}
              </div>
              <div className="space-y-3">
                {items.map((c) => (
                  <CommCard key={c.id || c.createdDate} comm={c} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal crear */}
      {isModalOpen && (
        <NewCommunicationModal
          onClose={() => setIsModalOpen(false)}
          onSaved={() => {
            setIsModalOpen(false);
            refresh?.(); // si useSheet expone refresh; si no, window.location.reload()
          }}
        />
      )}
    </div>
  );
}

function CommCard({ comm }) {
  const iconByType = {
    email: "Mail",
    meeting: "Users",
    call: "Phone",
    note: "FileText",
  };
  const icon = iconByType[comm.type] || "MessagesSquare";

  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon name={icon} />
        <span className="text-foreground font-medium">{comm.subject || "(no subject)"}</span>
        <span>•</span>
        <span>{comm.createdDate ? new Date(comm.createdDate).toLocaleString() : "—"}</span>
        {comm.linked_type && comm.linked_id && (
          <>
            <span>•</span>
            <span className="uppercase">{comm.linked_type}</span>
            <span>{comm.linked_id}</span>
          </>
        )}
      </div>
      <div className="text-sm mt-1 whitespace-pre-wrap">
        {comm.content || <span className="text-muted-foreground">(no content)</span>}
      </div>
      {!!comm.participants && (
        <div className="text-xs mt-2 text-muted-foreground">Participants: {comm.participants}</div>
      )}
    </div>
  );
}

function NewCommunicationModal({ onClose, onSaved }) {
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [participants, setParticipants] = useState("");
  const [linkedType, setLinkedType] = useState(""); // 'tender' | 'po' | 'import'
  const [linkedId, setLinkedId] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canSave = type && subject && content;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError("");

    try {
      const payload = {
        route: "write",
        action: "create",
        name: "communications",
        row: {
          created_date: new Date().toISOString(),
          type,
          subject,
          content,
          participants,
          linked_type: (linkedType || "").toLowerCase(), // tender | po | import
          linked_id: linkedId,
        },
      };

      const res = await fetch(`${API_BASE}?route=write&name=communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Unknown error");
      onSaved?.();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 p-4 flex items-start justify-center overflow-y-auto">
      <div className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">New Communication</h2>
          <button className="p-1" onClick={onClose}><Icon name="X" /></button>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Communication Type *</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Select an option</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="call">Call</option>
                <option value="note">Note</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Subject *</label>
              <input
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Subject…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Content *</label>
            <textarea
              rows={6}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Enter communication details…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Participants</label>
              <input
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Comma separated…"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm text-muted-foreground">Linked Type</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={linkedType}
                  onChange={(e) => setLinkedType(e.target.value)}
                >
                  <option value="">—</option>
                  <option value="tender">Tender</option>
                  <option value="po">Purchase Order</option>
                  <option value="import">Import</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Linked ID</label>
                <input
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="TEN-XXXX / PO-XXX / SHP-XXX…"
                  value={linkedId}
                  onChange={(e) => setLinkedId(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!canSave || saving} onClick={handleSave}>
            {saving ? "Saving…" : "Save Communication"}
          </Button>
        </div>
      </div>
    </div>
  );
}



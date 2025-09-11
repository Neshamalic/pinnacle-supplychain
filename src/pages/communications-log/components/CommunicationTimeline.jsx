import React, { useMemo, useState } from "react";
import { useSheet } from "@/lib/sheetsApi";
import { mapCommunications } from "@/lib/adapters";
import NewCommunicationModal from "./NewCommunicationModal";

// Agrupar por día (YYYY-MM-DD)
function groupByDate(items) {
  const by = {};
  for (const it of items) {
    const d = it.createdDate?.slice(0, 10) || "unknown";
    if (!by[d]) by[d] = [];
    by[d].push(it);
  }
  return Object.entries(by)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, arr]) => ({ day, items: arr }));
}

function DayHeader({ day }) {
  const d = new Date(day);
  const nice = isNaN(d)
    ? day
    : d.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  return (
    <div className="text-sm font-semibold text-muted-foreground mt-8 mb-2">
      {nice}
    </div>
  );
}

function CommunicationCard({ c }) {
  const icon =
    {
      email: "✉️",
      call: "📞",
      meeting: "👥",
      whatsapp: "💬",
      note: "📝",
    }[c.type] || "🗒️";

  const time = c.createdDate ? new Date(c.createdDate).toLocaleString() : "";
  const linked =
    c.linked_type && c.linked_id
      ? `${c.linked_type.toUpperCase()}: ${c.linked_id}`
      : "";

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/40 transition">
      <div className="flex items-start gap-3">
        <div className="text-xl">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-foreground">
              {c.subject || "(sin asunto)"}
            </div>
            <div className="text-xs text-muted-foreground">{time}</div>
          </div>
          {linked && (
            <div className="text-xs mt-1 text-muted-foreground">{linked}</div>
          )}
          {c.preview && (
            <div className="text-sm mt-2 text-muted-foreground line-clamp-2">
              {c.preview}
            </div>
          )}
          {!c.preview && c.content && (
            <div className="text-sm mt-2 text-muted-foreground line-clamp-2">
              {c.content}
            </div>
          )}
          {c.participants && (
            <div className="text-xs mt-2 text-muted-foreground">
              Participants: {c.participants}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommunicationTimeline() {
  const { rows: comms, loading, error, reload } = useSheet(
    "communications",
    mapCommunications
  );
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    let f = comms || [];
    if (type !== "all") {
      f = f.filter((c) => (c.type || "").toLowerCase() === type);
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      f = f.filter(
        (c) =>
          (c.subject || "").toLowerCase().includes(s) ||
          (c.content || "").toLowerCase().includes(s) ||
          (c.participants || "").toLowerCase().includes(s) ||
          (c.linked_id || "").toLowerCase().includes(s)
      );
    }
    return [...f].sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1));
  }, [comms, q, type]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">
            Dashboard › Communications Log
          </div>
          <h1 className="text-2xl font-semibold">Communications Timeline</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 text-sm rounded-md border bg-background hover:bg-accent"
            onClick={reload}
          >
            Refresh Data
          </button>
          <button
            className="px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
            onClick={() => setIsOpen(true)}
          >
            + New Communication
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          className="w-full md:w-96 px-3 py-2 border rounded-md bg-background"
          placeholder="Search communications…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="px-3 py-2 border rounded-md bg-background"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="email">Email</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="note">Note</option>
        </select>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">Error: {String(error)}</div>}

      {!loading && !error && grouped.length === 0 && (
        <div className="text-muted-foreground">No communications found.</div>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(({ day, items }) => (
            <div key={day}>
              <DayHeader day={day} />
              <div className="space-y-3">
                {items.map((c) => (
                  <CommunicationCard key={`${c.id}-${c.createdDate}`} c={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <NewCommunicationModal
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            setIsOpen(false);
            reload();
          }}
        />
      )}
    </div>
  );
}


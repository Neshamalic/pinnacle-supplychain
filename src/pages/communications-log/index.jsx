// src/pages/communications/index.jsx
import React, { useMemo, useState } from "react";
import { useSheet } from "@/lib/sheetsApi.js";
import { mapCommunications } from "@/lib/adapters.js";
import CommTimeline from "./components/CommTimeline";
import Icon from "@/components/AppIcon";

const CommunicationsPage = () => {
  const { rows = [], loading, error, refresh } = useSheet(
    "communications",
    mapCommunications
  );

  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all"); // all | order | tender
  const [selectedThread, setSelectedThread] = useState(null);

  const threads = useMemo(() => {
    const list = (rows || [])
      .filter(Boolean)
      .filter((r) => (entity === "all" ? true : r.linked_type === entity))
      .filter((r) => {
        const s = search.trim().toLowerCase();
        if (!s) return true;
        return [r.subject, r.participants, r.content, r.preview, r.linked_id]
          .map((x) => String(x || "").toLowerCase())
          .some((x) => x.includes(s));
      });

    // agrupar por hilo (linked_type + linked_id)
    const map = new Map();
    for (const r of list) {
      const key = `${r.linked_type}|${r.linked_id || "-"}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }

    const grouped = Array.from(map.entries()).map(([key, items]) => {
      const [linked_type, linked_id] = key.split("|");
      items.sort((a, b) =>
        String(b.createdDate || "").localeCompare(String(a.createdDate || ""))
      );
      const title = `${linked_type === "order"
        ? "PO"
        : linked_type === "tender"
        ? "Tender"
        : (linked_type || "Thread")
      } ${linked_id || ""}`.trim();
      return { key, linked_type, linked_id, title, items };
    });

    grouped.sort((a, b) =>
      String(b.items?.[0]?.createdDate || "").localeCompare(
        String(a.items?.[0]?.createdDate || "")
      )
    );
    return grouped;
  }, [rows, entity, search]);

  const current = selectedThread ?? threads[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Communications</h1>
        <button
          onClick={refresh}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
        >
          <Icon name="RefreshCw" size={16} /> Refresh
        </button>
      </div>

      <div className="flex gap-4">
        {/* Lista de hilos (izquierda) */}
        <aside className="w-80 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject, participants, PO/Tender…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="mt-2 flex gap-2">
              {["all", "order", "tender"].map((t) => (
                <button
                  key={t}
                  onClick={() => setEntity(t)}
                  className={`rounded-md px-3 py-1 text-sm ${
                    entity === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {t === "all" ? "All" : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <ul className="max-h-[70vh] overflow-auto">
            {threads.map((th) => (
              <li
                key={th.key}
                className={`cursor-pointer border-b border-border p-3 hover:bg-muted ${
                  current?.key === th.key ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedThread(th)}
              >
                <div className="text-sm font-medium">{th.title}</div>
                <div className="text-xs text-muted-foreground">
                  {th.items[0]?.subject || "(no subject)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(
                    th.items[0]?.createdDate || Date.now()
                  ).toLocaleString()}
                </div>
              </li>
            ))}
            {threads.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">
                No communications found.
              </li>
            )}
          </ul>
        </aside>

        {/* Timeline (derecha) */}
        <main className="flex-1 rounded-lg border border-border bg-card">
          {loading && <div className="p-6">Loading…</div>}
          {error && (
            <div className="p-6 text-red-600">Error: {String(error)}</div>
          )}
          {!loading && !error && current && <CommTimeline thread={current} />}
          {!loading && !error && !current && (
            <div className="p-6 text-muted-foreground">
              Select a thread on the left.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CommunicationsPage;


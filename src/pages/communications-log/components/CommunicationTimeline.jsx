// src/pages/communications/components/CommTimeline.jsx
import React from "react";
import Icon from "@/components/AppIcon";

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

const badge = (type) => {
  const t = String(type || "").toLowerCase();
  if (t === "email") return { label: "Email", cls: "bg-blue-100 text-blue-700" };
  if (t === "phone" || t === "call")
    return { label: "Call", cls: "bg-purple-100 text-purple-700" };
  if (t === "whatsapp")
    return { label: "WhatsApp", cls: "bg-green-100 text-green-700" };
  if (t === "meeting")
    return { label: "Meeting", cls: "bg-orange-100 text-orange-700" };
  return { label: t || "Note", cls: "bg-muted text-foreground" };
};

const CommTimeline = ({ thread }) => {
  const items = thread?.items ?? [];
  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="text-lg font-semibold">{thread?.title}</div>
        <div className="text-sm text-muted-foreground">
          {items.length} message{items.length === 1 ? "" : "s"}
        </div>
      </div>

      <ol className="relative ml-4 border-s border-border">
        {items.map((m, i) => {
          const b = badge(m.type);
          return (
            <li key={i} className="mb-6 ms-6">
              <span className="absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon name="MessageSquare" size={14} />
              </span>

              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {m.subject || "(no subject)"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(m.createdDate)}
                  </div>
                </div>

                {m.participants && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.participants}
                  </div>
                )}

                <div className="mt-3 whitespace-pre-wrap text-sm">
                  {m.content || m.preview || "(no content)"}
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.cls}`}
                  >
                    {b.label}
                  </span>
                </div>
              </div>
            </li>
          );
        })}

        {items.length === 0 && (
          <li className="ms-6">
            <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
              No communications in this thread.
            </div>
          </li>
        )}
      </ol>
    </div>
  );
};

export default CommTimeline;

// src/pages/tender-management/components/TenderStatusBadge.jsx
import React from "react";

const MAP = {
  draft: { bg: "bg-zinc-200/60", text: "text-zinc-800", label: "Draft" },
  submitted: { bg: "bg-blue-200/60", text: "text-blue-800", label: "Submitted" },
  rejected: { bg: "bg-red-200/60", text: "text-red-800", label: "Rejected" },
  "in delivery": {
    bg: "bg-amber-200/60",
    text: "text-amber-900",
    label: "In Delivery",
  },
  awarded: { bg: "bg-emerald-200/60", text: "text-emerald-900", label: "Awarded" },
};

export default function TenderStatusBadge({ status }) {
  const key = String(status || "").toLowerCase();
  const s = MAP[key] || { bg: "bg-zinc-200/60", text: "text-zinc-800", label: key || "—" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

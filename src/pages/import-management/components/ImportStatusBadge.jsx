// src/pages/import-management/components/ImportStatusBadge.jsx
import React from "react";

/**
 * Mapea estados a estilos de pill/badge con Tailwind.
 * type: 'qc' | 'customs'
 * value: string en minúscula (pending, in-progress, approved, in customs, cleared, etc.)
 */
const styles = {
  qc: {
    pending: "bg-yellow-100 text-yellow-800",
    "in-progress": "bg-blue-100 text-blue-800",
    approved: "bg-emerald-100 text-emerald-800",
    default: "bg-muted text-muted-foreground",
  },
  customs: {
    "in customs": "bg-orange-100 text-orange-800",
    cleared: "bg-emerald-100 text-emerald-800",
    default: "bg-muted text-muted-foreground",
  },
};

const label = (type, value) => {
  if (!value) return "—";
  const v = String(value).toLowerCase();
  if (type === "qc") {
    if (v === "in-progress" || v === "in progress") return "In Progress";
    if (v === "approved") return "Approved";
    if (v === "pending") return "Pending";
  }
  if (type === "customs") {
    if (v.includes("custom")) return "In Customs";
    if (v === "cleared") return "Cleared";
  }
  return value;
};

const ImportStatusBadge = ({ type = "qc", value = "" }) => {
  const v = String(value || "").toLowerCase();
  const cls =
    (styles[type] && styles[type][v]) ||
    (styles[type] && styles[type].default) ||
    "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label(type, v)}
    </span>
  );
};

export default ImportStatusBadge;


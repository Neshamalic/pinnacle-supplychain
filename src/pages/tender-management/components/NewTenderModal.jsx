// src/pages/tender-management/components/NewTenderModal.jsx
import React, { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { writeRow, updateRow } from "@/lib/sheetsApi";

const EMPTY = {
  tenderId: "",
  title: "",
  status: "draft",
  deliveryDate: "",
  stockCoverage: "",
  productsCount: "",
  totalValue: "",
  description: "",
};

export default function NewTenderModal({
  open = false,
  onClose = () => {},
  onSaved = () => {},
  mode = "create", // "create" | "edit"
  defaultValues = {},
}) {
  const [form, setForm] = useState(EMPTY);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, ...normalize(defaultValues) });
    }
  }, [open, defaultValues]);

  const save = async () => {
    const row = denormalize(form);
    try {
      if (isEdit) {
        await updateRow("tenders", row); // tu Apps Script la actualiza por id/tender_id
      } else {
        await writeRow("tenders", row);
      }
      onSaved?.();
    } catch (e) {
      alert("Error saving tender: " + String(e?.message || e));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-14 mx-auto w-full max-w-2xl rounded-xl bg-white shadow-xl border">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <div className="text-lg font-semibold">
            {isEdit ? "Edit Tender" : "New Tender"}
          </div>
          <Button variant="ghost" iconName="X" onClick={onClose} />
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <TextField
            label="Tender ID"
            value={form.tenderId}
            onChange={(v) => setForm((f) => ({ ...f, tenderId: v }))}
            required
            disabled={isEdit}
          />
          <TextField
            label="Title"
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
          />
          <SelectField
            label="Status"
            value={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            options={["draft", "submitted", "rejected", "awarded", "in delivery"]}
          />
          <TextField
            label="Delivery Date"
            type="date"
            value={form.deliveryDate}
            onChange={(v) => setForm((f) => ({ ...f, deliveryDate: v }))}
          />
          <TextField
            label="Stock Coverage (days)"
            value={form.stockCoverage}
            onChange={(v) => setForm((f) => ({ ...f, stockCoverage: v }))}
          />
          <TextField
            label="Products Count"
            value={form.productsCount}
            onChange={(v) => setForm((f) => ({ ...f, productsCount: v }))}
          />
          <TextField
            label="Total Value (CLP)"
            value={form.totalValue}
            onChange={(v) => setForm((f) => ({ ...f, totalValue: v }))}
          />

          <div className="md:col-span-2">
            <label className="block text-xs text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              className="w-full h-24 rounded border px-3 py-2"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} iconName="Save">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* --------- pequeños inputs simples --------- */
function TextField({ label, value, onChange, type = "text", required, disabled }) {
  return (
    <div className="text-sm">
      <label className="block text-xs text-muted-foreground mb-1">
        {label} {required ? "*" : ""}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md border px-3"
      />
    </div>
  );
}
function SelectField({ label, value, onChange, options = [] }) {
  return (
    <div className="text-sm">
      <label className="block text-xs text-muted-foreground mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-md border px-3"
      >
        {options.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    </div>
  );
}

/* --------- normaliza/denormaliza nombres con tus adapters --------- */
function normalize(row = {}) {
  return {
    tenderId: row.tenderId || row.id || "",
    title: row.title || "",
    status: (row.status || "draft").toLowerCase(),
    deliveryDate: row.deliveryDate ? new Date(row.deliveryDate).toISOString().slice(0, 10) : "",
    stockCoverage: row.stockCoverage ?? "",
    productsCount: row.productsCount ?? "",
    totalValue: row.totalValue ?? "",
    description: row.description ?? "",
  };
}
function denormalize(form = {}) {
  // tus Apps Script aceptan nombres flexibles; mantenemos tender_id + alias
  return {
    tender_id: form.tenderId,
    tenderId: form.tenderId,
    title: form.title,
    status: form.status,
    delivery_date: form.deliveryDate,
    stock_coverage: form.stockCoverage,
    products_count: form.productsCount,
    total_value: form.totalValue,
    description: form.description,
  };
}

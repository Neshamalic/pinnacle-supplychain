// src/lib/sheetsApi.js
import { useEffect, useState, useCallback } from "react";
import { API_BASE, fetchJSON, postJSON } from "@/lib/utils";

/* ====================== Utilidades internas ======================= */
function buildQuery(params = {}) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.append(k, String(v));
  });
  return usp.toString();
}

/* ====================== Core HTTP a tu Apps Script ======================= */
async function getTable(name, params = {}) {
  const q = buildQuery({ route: "table", name, ...params });
  const url = `${API_BASE}?${q}`;
  const json = await fetchJSON(url);
  if (!json?.ok) throw new Error(json?.error || "Failed to load sheet");
  return json.rows || [];
}

async function createRow(name, row) {
  const url = `${API_BASE}?route=write&action=create&name=${encodeURIComponent(name)}`;
  return postJSON(url, { row });
}

async function updateRow(name, row) {
  // row puede incluir id o llaves alternativas (según KEYS del Apps Script)
  const url = `${API_BASE}?route=write&action=update&name=${encodeURIComponent(name)}`;
  return postJSON(url, { row });
}

async function deleteRow(name, where) {
  // where puede ser { id } o las llaves alternativas que acepta tu Apps Script
  const url = `${API_BASE}?route=write&action=delete&name=${encodeURIComponent(name)}`;
  return postJSON(url, { where });
}

/* ====================== Hook de lectura con errores ======================= */
/**
 * useSheet(name, mapper?, params?)
 * - name: nombre de la hoja (ej: "tenders")
 * - mapper: función que transforma cada fila (por defecto identidad)
 * - params: filtros opcionales (ej: { po: "PO-123", presentation_code: "ABC-001" })
 */
export function useSheet(name, mapper = (r) => r, params = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // clave estable para saber cuándo cambian los filtros
  const paramsKey = JSON.stringify(params || {});

  const refetch = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await getTable(name, params);
      setRows(raw.map(mapper));
    } catch (e) {
      const msg = String(e?.message || e);
      console.error(`[useSheet:${name}]`, msg);
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [name, mapper, paramsKey]); // dependemos de paramsKey, no del objeto directamente

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { rows, loading, error, refetch };
}

/* ====================== Communications helpers ======================= */
function commWhereFromRow(row) {
  // Si viene id, perfecto
  if (row?.id) return { id: row.id };
  // Fallback aceptado por tu Apps Script
  const where = {};
  if (row?.createdDate) where.created_date = row.createdDate;
  if (row?.subject) where.subject = row.subject;
  if (row?.linked_type) where.linked_type = row.linked_type;
  if (row?.linked_id) where.linked_id = row.linked_id;
  return where;
}

export async function commMarkRead(row) {
  const payload = { unread: false };
  if (row?.id) payload.id = row.id;
  else Object.assign(payload, commWhereFromRow(row));
  await updateRow("communications", payload);
}

export async function commDelete(row) {
  await deleteRow("communications", commWhereFromRow(row));
}

export async function commCreate(row) {
  // Ejemplo: { type, subject, participants, content, linked_type, linked_id }
  return createRow("communications", row);
}

export async function commUpdate(row) {
  return updateRow("communications", row);
}

/* ====================== Exports útiles ======================= */
export { getTable, createRow, updateRow, deleteRow };

// src/lib/sheetsApi.js
import { useEffect, useMemo, useState } from "react";

// 👉 Ajusta esta URL a tu Web App de Google Apps Script (ya la usas en otras vistas)
const BASE_URL = import.meta.env.VITE_SHEETS_API_URL;

/* ----------------------------- Internos ----------------------------- */

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    // Mensaje claro cuando el Apps Script respondió texto vacío o HTML
    throw new Error(
      `Respuesta no-JSON del servidor (status ${res.status}). Body: ${String(text || "").slice(0, 200)}`
    );
  }
}

async function getTable(name) {
  const url = `${BASE_URL}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: "GET" });
  const json = await safeJson(res);
  if (!json.ok) throw new Error(json.error || `Error leyendo hoja: ${name}`);
  return json.rows || [];
}

async function postWrite(payload) {
  const res = await fetch(`${BASE_URL}?route=write`, {
    method: "POST",
    // 👇 text/plain evita problemas de CORS con Apps Script;
    // igual mandamos JSON en el body.
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const json = await safeJson(res);
  if (!json.ok) throw new Error(json.error || "Error de escritura");
  return json;
}

/* ------------------------------ Hook GET ---------------------------- */
/**
 * Hook genérico para leer una hoja y mapear filas
 * @param {string} sheetName
 * @param {(row:any)=>any} mapFn
 */
export function useSheet(sheetName, mapFn = (x) => x) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    try {
      setLoading(true);
      setError("");
      const raw = await getTable(sheetName);
      const mapped = Array.isArray(raw) ? raw.map((r) => mapFn(r)) : [];
      setRows(mapped);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetName]);

  // alias "refetch" por si el componente lo prefiere
  return useMemo(
    () => ({ rows, loading, error, reload, refetch: reload }),
    [rows, loading, error]
  );
}

/* ------------------------------ CRUD ------------------------------- */

export async function writeRow(sheetName, row) {
  return postWrite({ action: "create", name: sheetName, row });
}

export async function updateRow(sheetName, row) {
  return postWrite({ action: "update", name: sheetName, row });
}

export async function deleteRow(sheetName, where) {
  return postWrite({ action: "delete", name: sheetName, where });
}

/* --------------------- Comunicaciones (Create) ---------------------- */
/**
 * Crea una comunicación en la hoja "communications".
 * Acepta claves en camelCase o snake_case:
 * {
 *   type, subject, participants, content,
 *   linkedType/linked_type, linkedId/linked_id,
 *   createdDate (opcional), id (opcional)
 * }
 */
export async function createCommunication(data = {}) {
  const id =
    data.id ||
    `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const createdIso =
    data.createdDate ||
    data.created_date ||
    new Date().toISOString();

  const row = {
    id,
    created_date: createdIso,
    type: String(data.type || "").toLowerCase(),
    subject: data.subject || "",
    participants: data.participants || "",
    content: data.content || "",
    preview: (data.content || "").slice(0, 140),

    // normalizamos nombres
    linked_type: String(data.linked_type || data.linkedType || "").toLowerCase(),
    linked_id: String(data.linked_id || data.linkedId || ""),
  };

  // Se escribe en la hoja "communications"
  // (Apps Script appendRow_ usará los headers existentes)
  return writeRow("communications", row);
}

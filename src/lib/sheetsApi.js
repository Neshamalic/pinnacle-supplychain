import { useEffect, useMemo, useState } from "react";

// 👉 Ajusta esta URL a tu Web App del Apps Script (la que ya usas)
const BASE_URL = import.meta.env.VITE_SHEETS_API_URL;

// Helper para GET table
async function getTable(name) {
  const url = `${BASE_URL}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: "GET" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error fetching sheet: " + name);
  return json.rows || [];
}

// Helper para POST write/create/update/delete
async function postWrite(payload) {
  const res = await fetch(`${BASE_URL}?route=write`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Write error");
  return json;
}

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
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetName]);

  return useMemo(() => ({ rows, loading, error, reload }), [rows, loading, error]);
}

// Crear fila
export async function writeRow(sheetName, row) {
  return postWrite({ action: "create", name: sheetName, row });
}

// Actualizar fila (coincidencia por id o por claves del Apps Script)
export async function updateRow(sheetName, row) {
  return postWrite({ action: "update", name: sheetName, row });
}

// Eliminar fila (por id o claves)
export async function deleteRow(sheetName, where) {
  return postWrite({ action: "delete", name: sheetName, where });
}

// src/lib/sheetsApi.js
import { useEffect, useMemo, useState } from "react";

/** =============================
 *  CONFIG
 * ==============================*/
const BASE_URL = (import.meta.env.VITE_SHEETS_API_URL || "").replace(/\/+$/, "");
if (!BASE_URL) {
  // Aviso temprano para detectar falta de env var
  // (no lanzamos error para no romper el build)
  // eslint-disable-next-line no-console
  console.warn(
    "[sheetsApi] Missing VITE_SHEETS_API_URL. Set it in your .env or Vercel env."
  );
}

/** =============================
 *  HELPERS: fetch seguro + parseo tolerante
 * ==============================*/

// Timeout por defecto (ms)
const DEFAULT_TIMEOUT = 25000;

function withTimeout(ms = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(id) };
}

/**
 * fetchSafe: incluye timeout y errores claros
 */
async function fetchSafe(url, options = {}, { timeoutMs = DEFAULT_TIMEOUT } = {}) {
  const { controller, clear } = withTimeout(timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    clear();
    return res;
  } catch (err) {
    clear();
    // Mensaje consistente
    const msg =
      err?.name === "AbortError"
        ? `Request timeout after ${timeoutMs}ms: ${url}`
        : `Network error calling ${url}: ${err?.message || err}`;
    throw new Error(msg);
  }
}

/**
 * readJsonSafe: lee el cuerpo UNA SOLA VEZ,
 * si viene vacío o no es JSON, devuelve objeto tolerante.
 */
async function readJsonSafe(res) {
  const text = await res.text(); // leer una vez
  const trimmed = (text || "").trim();
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  // Sin contenido: tratamos como éxito si el status es 2xx
  if (!trimmed) {
    return { ok: res.ok, status: res.status, message: "" };
  }

  // Si parece JSON (header o forma), parseamos
  const looksJson =
    ct.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");
  if (looksJson) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Si el servidor devolvió JSON inválido
      throw new Error("Server returned invalid JSON.");
    }
  }

  // No es JSON: devolvemos como mensaje de texto
  return { ok: res.ok, status: res.status, message: trimmed };
}

/** =============================
 *  R/W genéricos
 * ==============================*/

/** GET de tabla (route=table&name=...) */
async function getTable(name) {
  const url = `${BASE_URL}?route=table&name=${encodeURIComponent(name)}`;
  const res = await fetchSafe(url, { method: "GET" });
  const data = await readJsonSafe(res);

  // Apps Script estándar: { ok: true, rows: [...] }
  if (!data.ok && res.ok) {
    // Si el servidor respondió 200 pero sin "ok", asumimos éxito y devolvemos rows vacío
    return Array.isArray(data.rows) ? data.rows : [];
  }
  if (!res.ok || data.ok === false) {
    throw new Error(
      data?.error || data?.message || `Error fetching sheet: ${name} (HTTP ${res.status})`
    );
  }
  return Array.isArray(data.rows) ? data.rows : [];
}

/** POST de escritura (create/update/delete) */
async function postWrite(payload) {
  // Mandamos como JSON; Apps Script puede leer e.postData.contents
  const res = await fetchSafe(`${BASE_URL}?route=write`, {
    method: "POST",
    headers: {
      // Accept por si tu Apps Script decide mandar JSON formal
      Accept: "application/json",
      "Content-Type": "application/json;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const data = await readJsonSafe(res);

  // Si el servidor no manda JSON pero fue 2xx y sin cuerpo -> tratamos como éxito
  if (res.ok && (data?.ok === undefined || data?.ok === null)) {
    return { ok: true, ...data };
  }

  if (!res.ok || data.ok === false) {
    throw new Error(data?.error || data?.message || "Write error");
  }
  return data;
}

/** =============================
 *  React Hook de lectura
 * ==============================*/

/**
 * useSheet: lee una hoja y mapea filas
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
    if (!sheetName) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetName]);

  return useMemo(() => ({ rows, loading, error, reload }), [rows, loading, error]);
}

/** =============================
 *  Helpers de escritura
 * ==============================*/

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

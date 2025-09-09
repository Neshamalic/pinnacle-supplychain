// src/lib/sheetsApi.js
import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_SHEETS_API_URL;

// ---------- low-level ----------
export async function readTable(name) {
  if (!API_URL) throw new Error("VITE_SHEETS_API_URL is missing");
  const url = `${API_URL}?name=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  const json = await res.json();
  const rows = Array.isArray(json?.rows) ? json.rows : [];
  return rows;
}

export async function writeRow(name, row) {
  if (!API_URL) throw new Error("VITE_SHEETS_API_URL is missing");
  const res = await fetch(`${API_URL}?route=write&action=create&name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita preflight CORS
    body: JSON.stringify(row),
  });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error || "Create failed");
  return json;
}

export async function updateRow(name, row) {
  if (!API_URL) throw new Error("VITE_SHEETS_API_URL is missing");
  const res = await fetch(`${API_URL}?route=write&action=update&name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(row),
  });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error || "Update failed");
  return json;
}

export async function deleteRow(name, where) {
  if (!API_URL) throw new Error("VITE_SHEETS_API_URL is missing");
  const res = await fetch(`${API_URL}?route=write&action=delete&name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(where),
  });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error || "Delete failed");
  return json;
}

// ---------- hook ----------
export function useSheet(name, mapFn) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const raw = await readTable(name);
        const arr = Array.isArray(raw) ? raw : [];
        const mapped = typeof mapFn === "function" ? arr.map(mapFn) : arr;
        if (!cancel) setRows(mapped);
      } catch (err) {
        if (!cancel) setError(String(err?.message || err));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [name, mapFn]);

  return useMemo(() => ({ rows, loading, error }), [rows, loading, error]);
}

// src/lib/sheetsApi.js
import { useEffect, useState } from 'react';

export const API_URL = import.meta.env.VITE_SHEETS_API_URL;

// ---------------- URLs ----------------
const readUrl = (name) => `${API_URL}?name=${encodeURIComponent(name)}`;
const writeUrl = (name, action) =>
  `${API_URL}?route=write&action=${encodeURIComponent(action)}&name=${encodeURIComponent(name)}`;

// ---------------- Hook de lectura ----------------
export function useSheet(name, mapper = (x) => x) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancel = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);

        if (!API_URL) throw new Error('Missing VITE_SHEETS_API_URL');

        const res = await fetch(readUrl(name), { cache: 'no-store' });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'Failed to fetch sheet');

        const out = Array.isArray(json?.rows) ? json.rows.map(mapper) : [];
        if (!cancel) setRows(out);
      } catch (e) {
        if (!cancel) setError(String(e));
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    run();
    return () => void (cancel = true);
  }, [name, mapper, tick]);

  const reload = () => setTick((t) => t + 1);
  return { rows, loading, error, reload };
}

// ---------------- Escritura genérica ----------------
export async function writeRow(name, payload, action = 'create') {
  if (!API_URL) throw new Error('Missing VITE_SHEETS_API_URL');

  const res = await fetch(writeUrl(name, action), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS
    body: JSON.stringify(payload),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Opaque/invalid response from Apps Script (CORS)');
  }
  if (!json?.ok) throw new Error(json?.error || 'Write failed');
  return json;
}

export const createRow = (name, row) => writeRow(name, row, 'create');
export const updateRow = (name, row) => writeRow(name, row, 'update');
export const deleteRow = (name, where) => writeRow(name, where, 'delete');

// (opcional) default export para usos accidentales
export default { API_URL, useSheet, writeRow, createRow, updateRow, deleteRow };

// src/lib/sheetsApi.js
import { useEffect, useMemo, useState } from 'react';

export const API_URL = import.meta.env.VITE_SHEETS_API_URL;

// ------- Helpers URL -------
const readUrl = (name) =>
  `${API_URL}?name=${encodeURIComponent(name)}`; // doGet: table por defecto con ?name

const writeUrl = (name, action) =>
  `${API_URL}?route=write&action=${encodeURIComponent(action)}&name=${encodeURIComponent(name)}`;

// ------- Hook de lectura -------
export function useSheet(name, mapper = (x) => x) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0); // para reload

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
    return () => { cancel = true; };
  }, [name, mapper, tick]);

  const reload = () => setTick((t) => t + 1);
  return { rows, loading, error, reload };
}

// ------- Escritura genérica (create/update/delete) -------
export async function writeRow(name, payload, action = 'create') {
  if (!API_URL) throw new Error('Missing VITE_SHEETS_API_URL');

  const res = await fetch(writeUrl(name, action), {
    method: 'POST',
    // text/plain evita preflight y tu Apps Script lo parsea como JSON
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });

  // Si hay CORS “opaque”, intenta parsear; si falla, lanza error legible
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Opaque/invalid response from Apps Script (CORS)');
  }

  if (!json?.ok) throw new Error(json?.error || 'Write failed');
  return json;
}

// Azúcares sintácticos
export const createRow = (name, row) => writeRow(name, row, 'create');
export const updateRow = (name, row) => writeRow(name, row, 'update');
export const deleteRow = (name, where) => writeRow(name, where, 'delete');

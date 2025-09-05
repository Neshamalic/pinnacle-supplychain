// src/lib/sheetsApi.js

import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_SHEETS_API_URL;

// Helper para parsear y validar la respuesta de la API
async function asJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data?.error || `API error (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return data; // { ok: true, ... }
}

// Lee todas las filas de una hoja: ?name=<nombre_hoja>
export async function readTable(name) {
  const url = `${BASE}?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: 'GET' });
  return asJson(res); // { ok:true, sheet, rows }
}

// Escribe (create | update | delete) usando las KEYS definidas en tu Apps Script
// payload típico para create: { values: { col1: '...', col2: '...' } }
// payload para update/delete: { keys: { ... }, values?: { ... } }
export async function writeRow(name, action, payload) {
  const url = `${BASE}?route=write&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  return asJson(res);
}

// Hook sencillo para usar en React: trae filas y maneja loading/error
export function useSheet(name, mapFn = (x) => x) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    readTable(name)
      .then(({ rows }) => { if (alive) setRows(mapFn(rows)); })
      .catch(err => { if (alive) setError(err.message || String(err)); })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [name, mapFn]);

  return { rows, loading, error };
}

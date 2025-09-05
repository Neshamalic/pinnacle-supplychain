// src/lib/sheetsApi.js
import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_SHEETS_API_URL;

/** LEE JSON DE VERDAD, SI NO => ERROR CLARO */
async function asJson(res) {
  const contentType = res.headers?.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!isJson) {
    const snippet = await res.text().then(t => t.slice(0, 120)).catch(() => '');
    throw new Error(`API returned non-JSON (HTTP ${res.status}). ${snippet}`);
  }

  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `API error (HTTP ${res.status})`);
  }
  return data; // esperado: { ok:true, rows:[...] }
}

/** LECTURA */
export async function readTable(name) {
  if (!BASE) {
    throw new Error('Missing VITE_SHEETS_API_URL (environment variable).');
  }
  const url = `${BASE}?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: 'GET' });
  return asJson(res);
}

/** ESCRITURA */
export async function writeRow(name, action, payload) {
  if (!BASE) {
    throw new Error('Missing VITE_SHEETS_API_URL (environment variable).');
  }
  const url = `${BASE}?route=write&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  return asJson(res);
}

/** HOOK REACT – SIEMPRE ENTREGA ARRAY Y MANEJA ERRORES */
export function useSheet(name, mapFn = (x) => x) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    readTable(name)
      .then((data) => {
        const raw = Array.isArray(data?.rows) ? data.rows : [];
        const mapped = (() => {
          try { return mapFn(raw); } catch (e) { throw new Error(`Mapper error: ${e.message}`); }
        })();
        if (alive) setRows(mapped || []);
      })
      .catch((err) => {
        if (alive) {
          setError(err?.message || String(err));
          setRows([]); // garantiza array
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [name, mapFn]);

  return { rows, loading, error };
}

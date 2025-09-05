import { useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_SHEETS_API_URL;

async function asJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data?.error || `API error (HTTP ${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function readTable(name) {
  if (!BASE) {
    throw new Error('VITE_SHEETS_API_URL no está definida (revisar Variables de Entorno en Vercel).');
  }
  const url = `${BASE}?name=${encodeURIComponent(name)}`;
  const res = await fetch(url, { method: 'GET' });
  return asJson(res);
}

export async function writeRow(name, action, payload) {
  if (!BASE) {
    throw new Error('VITE_SHEETS_API_URL no está definida (revisar Variables de Entorno en Vercel).');
  }
  const url = `${BASE}?route=write&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload })
  });
  return asJson(res);
}

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

// src/lib/sheetsApi.js
const BASE_URL = import.meta.env.VITE_SHEETS_API_URL?.trim();

/**
 * Devuelve [{...}] de una hoja.
 * mapper(row) -> adapta cada fila a la forma que usa la UI.
 */
export async function getSheet(name, mapper = (x) => x) {
  if (!BASE_URL) throw new Error('Falta VITE_SHEETS_API_URL');
  const url = `${BASE_URL}?name=${encodeURIComponent(name)}`; // doGet table por defecto

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`GET ${name} ${res.status}`);
  const data = await res.json(); // {ok, rows}
  if (!data?.ok) throw new Error(data?.error || 'GET failed');

  return (data.rows || []).map(mapper);
}

/**
 * Escribe en Apps Script evitando preflight CORS:
 * - NO 'application/json'; usamos 'text/plain'.
 * - name va en querystring; el body es JSON (string).
 */
async function writeRow(action, name, rowOrWhere) {
  if (!BASE_URL) throw new Error('Falta VITE_SHEETS_API_URL');

  const url =
    `${BASE_URL}?route=write&action=${encodeURIComponent(action)}&name=${encodeURIComponent(name)}`;

  const res = await fetch(url, {
    method: 'POST',
    // request “simple” para evitar preflight:
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ row: rowOrWhere, where: rowOrWhere }),
  });

  // Si tuvieras que depurar CORS, mira Network: la fila debe quedar “(200) fetch”
  if (!res.ok) throw new Error(`WRITE ${name} ${res.status}`);
  const data = await res.json(); // {ok:true,...}
  if (!data?.ok) throw new Error(data?.error || 'WRITE failed');
  return data;
}

export const sheetsApi = {
  list: getSheet,
  create: (name, row) => writeRow('create', name, row),
  update: (name, row) => writeRow('update', name, row),
  remove: (name, where) => writeRow('delete', name, where),
};

/* -------- Hook de conveniencia (opcional) -------- */
import { useEffect, useState } from 'react';
export function useSheet(name, mapper) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getSheet(name, mapper)
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(String(e?.message || e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [name, mapper]);

  return { rows, loading, error, refetch: () => getSheet(name, mapper) };
}

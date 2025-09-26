// src/lib/sheetsApi.js
import { useEffect, useState, useCallback } from "react";
import { API_BASE, fetchJSON, postJSON } from "@/lib/utils";

/** ========= Core HTTP helpers ========= */
async function getTable(name) {
  const url = `${API_BASE}?route=table&name=${encodeURIComponent(name)}`;
  const json = await fetchJSON(url);
  return Array.isArray(json.rows) ? json.rows : [];
}

async function createRow(name, row) {
  const url = `${API_BASE}?route=write&action=create&name=${encodeURIComponent(name)}`;
  return postJSON(url, { row });
}
async function updateRow(name, row) {
  const url = `${API_BASE}?route=write&action=update&name=${encodeURIComponent(name)}`;
  return postJSON(url, { row });
}
async function deleteRow(name, where) {
  const url = `${API_BASE}?route=write&action=delete&name=${encodeURIComponent(name)}`;
  return postJSON(url, { where });
}

/** ========= Hook de lectura ========= */
export function useSheet(name, mapper = (r) => r) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getTable(name);
      setRows(raw.map(mapper));
    } finally {
      setLoading(false);
    }
  }, [name, mapper]);

  useEffect(() => { refetch(); }, [refetch]);

  return { rows, loading, refetch };
}

/** ========= Helpers específicos de Communications ========= */
function commWhereFromRow(row) {
  if (row?.id) return { id: row.id };
  const where = {};
  if (row?.createdDate) where.created_date = row.createdDate;
  if (row?.subject) where.subject = row.subject;
  if (row?.linked_type) where.linked_type = row.linked_type;
  if (row?.linked_id) where.linked_id = row.linked_id;
  return where;
}

export async function commMarkRead(row) {
  const payload = { unread: false };
  if (row?.id) payload.id = row.id;
  else Object.assign(payload, commWhereFromRow(row));
  await updateRow("communications", payload);
}
export async function commDelete(row) {
  await deleteRow("communications", commWhereFromRow(row));
}
export async function commCreate(row) {
  return createRow("communications", row);
}
export async function commUpdate(row) {
  return updateRow("communications", row);
}


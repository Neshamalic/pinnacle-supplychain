// src/pages/communications-log/index.jsx
import React from 'react';
import { useSheet } from '../../lib/sheetsApi';
import { mapCommunications } from '../../lib/adapters';

export default function CommunicationsLog() {
  const { rows, loading, error } = useSheet('communications', mapCommunications);

  if (loading) return <div style={{ padding: 16 }}>Loading communications…</div>;

  if (error) {
    return (
      <div style={{ padding: 16, color: '#b00020' }}>
        <h3>Error</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error)}</pre>
      </div>
    );
  }

  const list = Array.isArray(rows) ? rows : [];

  if (list.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <h3>No communications found.</h3>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Communications</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {list.map((c) => (
          <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <strong>{c.subject || 'No subject'}</strong>
              <span style={{ color: '#6b7280' }}>{c.createdDate || ''}</span>
            </div>
            {c.from && <div style={{ color: '#6b7280', marginBottom: 6 }}>From: {c.from}</div>}
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {c.preview || c.content || '(no content)'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

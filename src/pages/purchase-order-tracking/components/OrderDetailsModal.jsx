// src/pages/purchase-order-tracking/components/OrderDetailsModal.jsx
import React from "react";

export default function OrderDetailsModal({ open, onClose, order }) {
  if (!open) return null; // si no está abierto, no se muestra

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: "100%",
          maxWidth: 700,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Order Details (TEST)</h2>
          <button onClick={onClose} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
            Close
          </button>
        </div>

        <p style={{ color: "#555", marginTop: 0 }}>
          Si estás viendo esto, el <strong>modal sí abre</strong>. El problema está en el contenido anterior (imports/errores en runtime).
        </p>

        <pre
          style={{
            background: "#f7f7f8",
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
            border: "1px solid #eee",
          }}
        >
{JSON.stringify(order, null, 2)}
        </pre>
      </div>
    </div>
  );
}

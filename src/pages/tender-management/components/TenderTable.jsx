// src/pages/tender-management/components/TenderTable.jsx
import React from "react";

export default function TenderTable({ rows = [], loading = false, onView, valueFormatter }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Tender ID</th>
            <th className="px-4 py-3 text-left">Title</th>
            <th className="px-4 py-3 text-right">Products</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Delivery Date</th>
            <th className="px-4 py-3 text-right">Stock Coverage</th>
            <th className="px-4 py-3 text-right">Total Value</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                Loading…
              </td>
            </tr>
          )}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                No tenders found.
              </td>
            </tr>
          )}

          {!loading &&
            rows.map((row) => (
              <tr key={row.tenderId} className="border-t">
                <td className="px-4 py-3 font-medium">{row.tenderId}</td>
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3 text-right">{row.products}</td>
                <td className="px-4 py-3 capitalize">{row.status || "—"}</td>
                <td className="px-4 py-3">
                  {row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString("es-CL") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {Number(row.stockCoverageDays || 0)} days
                </td>
                <td className="px-4 py-3 text-right">
                  {valueFormatter ? valueFormatter(row.totalValueCLP) : row.totalValueCLP}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="px-3 py-1 rounded-md bg-primary text-primary-foreground"
                    onClick={() => onView?.(row)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

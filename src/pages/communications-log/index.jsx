import React, { useMemo } from "react";
import Icon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import { useSheet } from "../../lib/sheetsApi";
import { mapCommunications } from "../../lib/adapters";

export default function CommunicationLogPage() {
  const { rows, loading, error } = useSheet("communications", mapCommunications);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Cargando comunicaciones…</div>;
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium mb-2">Error al cargar</div>
        <pre className="text-xs bg-muted p-3 rounded">{String(error)}</pre>
        <p className="text-sm text-muted-foreground mt-2">
          Verifica la variable <code>VITE_SHEETS_API_URL</code> en Vercel y los permisos CORS de tu API.
        </p>
      </div>
    );
  }

  const list = useMemo(() => rows ?? [], [rows]);

  if (!list.length) {
    return (
      <div className="p-12 text-center">
        <Icon name="MessageSquare" size={48} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No hay comunicaciones</h3>
        <p className="text-muted-foreground">Cuando existan, aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Communication Log</h1>
        <Button variant="outline" iconName="RefreshCcw" onClick={() => location.reload()}>
          Actualizar
        </Button>
      </div>

      <div className="space-y-3">
        {list.map((c) => (
          <div key={c.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Icon
                  name={c.type === "email" ? "Mail" : c.type === "phone" ? "Phone" : "MessageSquare"}
                  size={16}
                />
                <h4 className="font-medium text-foreground">
                  {c.subject || "Sin asunto"}
                </h4>
              </div>
              <span className="text-sm text-muted-foreground">{c.createdDate || ""}</span>
            </div>
            {c.participants && (
              <p className="text-xs text-muted-foreground mb-1">Participantes: {c.participants}</p>
            )}
            {(c.preview || c.content) && (
              <p className="text-sm text-foreground whitespace-pre-line">
                {c.content || c.preview}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import React from "react";
import { Eye, Edit, RefreshCcw, Search, ShoppingCart } from "lucide-react";
import { useSheet } from "@/lib/sheetsApi";
import {
  mapPurchaseOrders,
  mapTenderItems,
  mapTenders,
  mapPurchaseOrderItems,
} from "@/lib/adapters";
import { usePresentationCatalog } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

const norm = (v) => (v || "").toString().toLowerCase().trim();

/* Ya dispones de un formateador de USD (fmtUSD); aquí añadimos un formateador de fecha */
function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* Para colorear los estados de fabricación */
const mfBadge = (status) => {
  const s = (status || "").toLowerCase();
  const colors = {
    pending: "bg-orange-100 text-orange-700",
    ready: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-700",
    complete: "bg-green-100 text-green-700",
  };
  const color = colors[s] || "bg-gray-100 text-gray-700";
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", color)}>
      {status}
    </span>
  );
};

/* Para colorear los tipos de transporte (air, sea, land) */
const transportBadge = (type) => {
  const s = (type || "").toLowerCase();
  const colors = {
    air: "bg-cyan-100 text-cyan-700",
    sea: "bg-blue-100 text-blue-700",
    road: "bg-green-100 text-green-700",
  };
  const color = colors[s] || "bg-gray-100 text-gray-700";
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", color)}>
      {type}
    </span>
  );
};

export default function PurchaseOrderTracking() {
  const [manufacturingFilter, setManufacturingFilter] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const { rows: purchaseOrders = [], loading } = useSheet(
    "purchase_orders",
    mapPurchaseOrders
  );

  /* Agrupamos por poNumber y acumulamos campos */
  const groups = React.useMemo(() => {
    const map = new Map();
    for (const r of purchaseOrders) {
      const key = norm(r.poNumber);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          poNumber: r.poNumber,
          tenderRef: r.tenderRef,
          manufacturingStatus: r.manufacturingStatus,
          qcStatus: r.qcStatus,
          transportType: r.transportType,
          costUsd: 0,
          createdDate: r.createdDate,
          _rows: [],
        });
      }
      const g = map.get(key);
      g.costUsd += r.costUsd || 0;
      // Conservamos el primer manufacturingStatus/transportType no vacío
      if (!g.manufacturingStatus && r.manufacturingStatus)
        g.manufacturingStatus = r.manufacturingStatus;
      if (!g.transportType && r.transportType)
        g.transportType = r.transportType;
      // Si la fecha de creación es menor (más antigua), la mantenemos
      if (
        r.createdDate &&
        (!g.createdDate ||
          new Date(r.createdDate) < new Date(g.createdDate))
      ) {
        g.createdDate = r.createdDate;
      }
      g._rows.push(r);
    }
    return [...map.values()];
  }, [purchaseOrders]);

  /* Filtros y búsqueda */
  const filtered = React.useMemo(() => {
    return groups
      .filter((g) =>
        manufacturingFilter ? g.manufacturingStatus === manufacturingFilter : true
      )
      .filter((g) => {
        const q = norm(search);
        return (
          q === "" ||
          norm(g.poNumber).includes(q) ||
          norm(g.tenderRef).includes(q)
        );
      });
  }, [groups, manufacturingFilter, search]);

  /* KPIs (pueden mantenerse con lógica actual) */
  const kpis = React.useMemo(() => {
    const total = groups.length;
    const inProcess = groups.filter(
      (g) => g.manufacturingStatus === "in process"
    ).length;
    const ready = groups.filter((g) => g.manufacturingStatus === "ready").length;
    const shipped = groups.filter((g) => g.manufacturingStatus === "shipped")
      .length;
    const avgProduction =
      groups.reduce(
        (acc, g) => acc + (g.productionDays ? g.productionDays : 0),
        0
      ) / (groups.length || 1);
    return { total, inProcess, ready, shipped, avgProduction };
  }, [groups]);

  /* Abre el modal de detalles */
  const openDetails = (g) => {
    setSelected({
      poNumber: g.poNumber,
      tenderRef: g.tenderRef,
      manufacturingStatus: g.manufacturingStatus,
      transportType: g.transportType,
      createdDate: g.createdDate,
      // pasamos el primer registro para unitPrice y demás
      ...g._rows[0],
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Purchase Order Tracking</h2>
        <Button
          variant="ghost"
          iconName="RefreshCcw"
          onClick={() => {
            /* podrías volver a cargar useSheet aquí */
          }}
        >
          Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>In Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.inProcess}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.ready}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Shipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.shipped}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Input
          type="text"
          placeholder="Search by PO number or tender ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Select
          value={manufacturingFilter}
          onValueChange={(v) => setManufacturingFilter(v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Manufacturing (all)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="link"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          Show More Filters
        </Button>
        {showFilters && (
          <Button
            variant="link"
            onClick={() => {
              setManufacturingFilter("");
              setSearch("");
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Tabla */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PO Number</TableHead>
            <TableHead>Tender Ref</TableHead>
            <TableHead>Manufacturing</TableHead>
            <TableHead>Transport</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((g) => (
            <TableRow key={g.poNumber}>
              <TableCell>{g.poNumber}</TableCell>
              <TableCell>{g.tenderRef}</TableCell>
              <TableCell>{mfBadge(g.manufacturingStatus)}</TableCell>
              <TableCell>{transportBadge(g.transportType)}</TableCell>
              <TableCell>{fmtDate(g.createdDate)}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  onClick={() => openDetails(g)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                {/* Botón Edit: por ahora abre el mismo modal en modo lectura, se puede ocultar si no hay lógica de edición */}
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  onClick={() => openDetails(g)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Modal de Detalles */}
      {selected && (
        <OrderDetailsModal
          open={!!selected}
          onClose={() => setSelected(null)}
          order={selected}
        />
      )}
    </>
  );
}

// src/pages/purchase-order-tracking/index.jsx
import React from "react";
import { Eye, Edit } from "lucide-react";
import { useSheet } from "@/lib/sheetsApi";
import { mapPurchaseOrders } from "@/lib/adapters";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import OrderDetailsModal from "./components/OrderDetailsModal";

/* Normaliza texto a minúsculas y sin espacios */
const norm = (v) => (v || "").toString().toLowerCase().trim();

/* Formateador de fecha (dd-mm-aaaa) */
function fmtDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* Badge de estado de fabricación */
function mfBadge(status) {
  const s = (status || "").toLowerCase();
  const colors = {
    pending: "bg-orange-100 text-orange-700",
    "in process": "bg-yellow-100 text-yellow-700",
    ready: "bg-blue-100 text-blue-700",
    shipped: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-700",
    complete: "bg-green-100 text-green-700",
  };
  const color = colors[s] || "bg-gray-100 text-gray-700";
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", color)}>
      {status || "—"}
    </span>
  );
}

/* Badge de tipo de transporte */
function transportBadge(type) {
  const s = (type || "").toLowerCase();
  const colors = {
    air: "bg-cyan-100 text-cyan-700",
    sea: "bg-blue-100 text-blue-700",
    road: "bg-green-100 text-green-700",
  };
  const color = colors[s] || "bg-gray-100 text-gray-700";
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", color)}>
      {type || "—"}
    </span>
  );
}

export default function PurchaseOrderTracking() {
  const [manufacturingFilter, setManufacturingFilter] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState(null);
  const [showFilters, setShowFilters] = React.useState(false);

  // Obtener datos de purchase_orders
  const { rows: purchaseOrders = [] } = useSheet(
    "purchase_orders",
    mapPurchaseOrders
  );

  // Agrupar por poNumber
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
          transportType: r.transportType,
          costUsd: 0,
          createdDate: r.createdDate,
          _rows: [],
        });
      }
      const g = map.get(key);
      g.costUsd += r.costUsd || 0;
      if (!g.manufacturingStatus && r.manufacturingStatus)
        g.manufacturingStatus = r.manufacturingStatus;
      if (!g.transportType && r.transportType)
        g.transportType = r.transportType;
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

  // Filtrar por manufactura y búsqueda
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

  // KPIs
  const kpis = React.useMemo(() => {
    const total = groups.length;
    const inProcess = groups.filter(
      (g) => g.manufacturingStatus === "in process"
    ).length;
    const ready = groups.filter(
      (g) => g.manufacturingStatus === "ready"
    ).length;
    const shipped = groups.filter(
      (g) => g.manufacturingStatus === "shipped"
    ).length;
    return { total, inProcess, ready, shipped };
  }, [groups]);

  // Abrir modal
  const openDetails = (g) => {
    setSelected({
      poNumber: g.poNumber,
      tenderRef: g.tenderRef,
      manufacturingStatus: g.manufacturingStatus,
      transportType: g.transportType,
      createdDate: g.createdDate,
      ...g._rows[0],
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Purchase Order Tracking</h2>
        <Button variant="ghost" onClick={() => {}}>
          Refresh
        </Button>
      </div>

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
            <SelectItem value="in process">In Process</SelectItem>
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
                  onClick={() => openDetails(g)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDetails(g)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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

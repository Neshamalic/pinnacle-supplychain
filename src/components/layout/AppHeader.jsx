import { NavLink, Link } from "react-router-dom";

export default function AppHeader() {
  const item = (to, label) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-2 rounded-md text-sm font-medium ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`
      }
    >
      {label}
    </NavLink>
  );

  return (
    <header className="w-full border-b bg-background/80 backdrop-blur z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            PF
          </span>
          <span className="text-sm font-semibold">PinnacleFlow</span>
        </Link>
        <nav className="flex items-center gap-1">
          {item("/dashboard", "Dashboard")}
          {item("/tender-management", "Tenders")}
          {item("/purchase-order-tracking", "Orders")}
          {item("/import-management", "Imports")}
          {item("/forecasting", "Forecasting")}
          {item("/communications", "Communications")}
        </nav>
      </div>
    </header>
  );
}

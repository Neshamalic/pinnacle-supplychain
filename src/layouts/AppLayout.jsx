import { Outlet } from "react-router-dom";
import AppHeader from "@/components/layout/AppHeader";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

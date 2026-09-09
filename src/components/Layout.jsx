import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Wrench, Package, Bike } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/motocicletas", label: "Motocicletas", icon: Bike },
  { to: "/ordenes", label: "Órdenes de Servicio", icon: Wrench },
  { to: "/inventario", label: "Inventario", icon: Package },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 text-slate-300 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Bike className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">MotoTaller</h1>
            <p className="text-xs text-slate-400">Taller & Almacén</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-amber-500 text-slate-900"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-500">
          © 2026 MotoTaller
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Bike className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-bold">MotoTaller</span>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 flex justify-around py-2 border-t border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium",
                active ? "text-amber-400" : "text-slate-400"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 pb-16 md:pb-0 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
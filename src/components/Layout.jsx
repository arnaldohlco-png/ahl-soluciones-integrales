import React, { useState } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Wrench, Package, Bike,
  ShoppingCart, Receipt, CreditCard, Wallet, Landmark,
  Truck, HardHat, Building2, Menu, X, Tag, BarChart3, Store, FileText, HandCoins, Banknote, CalendarClock, LogOut, Undo2, ClipboardList } from
"lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { canAccess } from "@/lib/roles";
import BackupReminder from "@/components/BackupReminder";

const navGroups = [
{
  title: "Principal",
  items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }]
},
{
  title: "Gestión",
  items: [
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/motocicletas", label: "Motocicletas", icon: Bike },
  { to: "/ordenes", label: "Órdenes de Servicio", icon: Wrench },
  { to: "/citas", label: "Citas y Recordatorios", icon: CalendarClock },
  { to: "/servicios", label: "Catálogo de Servicios", icon: Wrench }]

},
{
  title: "Almacén",
  items: [
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/compras", label: "Compras", icon: Truck },
  { to: "/pedidos", label: "Pedidos a Proveedor", icon: ClipboardList },
  { to: "/facturas-proveedor", label: "Cargar Factura Proveedor", icon: FileText },
  { to: "/ventas", label: "Ventas / POS", icon: ShoppingCart },
  { to: "/devoluciones", label: "Devoluciones", icon: Undo2 }]

},
{
  title: "Finanzas",
  items: [
  { to: "/cotizaciones", label: "Cotizaciones", icon: FileText },
  { to: "/facturacion", label: "Facturación", icon: Receipt },
  { to: "/creditos", label: "Créditos y Cartera", icon: CreditCard },
  { to: "/gastos", label: "Gastos", icon: Wallet },
  { to: "/caja", label: "Caja y Bancos", icon: Landmark },
  { to: "/estado-resultados", label: "Estado de Resultados", icon: BarChart3 }]

},
{
  title: "Administración",
  items: [
  { to: "/tecnicos", label: "Técnicos", icon: HardHat },
  { to: "/proveedores", label: "Proveedores", icon: Building2 },
  { to: "/marcas", label: "Marcas y Líneas", icon: Tag },
  { to: "/empresa", label: "Mi Empresa", icon: Store },
  { to: "/prestamos-tecnicos", label: "Préstamos Técnicos", icon: HandCoins },
  { to: "/pago-comisiones", label: "Pago Comisiones", icon: Banknote }]
}];


export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const { roles } = useRoles();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleLogout() {
    setLeaving(true);
    try {
      await base44.auth.logout("/login");
    } catch {
      window.location.href = "/login";
    }
  }

  const role = user?.role;
  const visibleGroups = navGroups.
  map((g) => {
    return { ...g, items: g.items.filter((it) => canAccess(role, it.to, roles)) };
  }).
  filter((g) => g.items.length > 0);

  if (!canAccess(role, location.pathname, roles)) {
    return <Navigate to="/" replace />;
  }

  const NavContent = () =>
  <>
      {visibleGroups.map((group) =>
    <div key={group.title} className="mb-4">
          <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{group.title}</p>
          {group.items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active ?
              "bg-amber-500 text-slate-900" :
              "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}>
            
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>);

      })}
        </div>
    )}
    </>;


  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900 fixed inset-y-0 left-0 z-30 overflow-y-auto">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Bike className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">HR MOTOCICLETAS</h1>
            <p className="text-xs text-slate-400">Taller & Almacén</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4">
          <NavContent />
        </nav>
        <div className="px-3 pb-3">
          <BackupReminder />
        </div>
        <div className="px-3 py-3 border-t border-slate-800">
          {user &&
          <div className="mb-2 px-2 text-xs">
              <p className="truncate font-medium text-slate-200">{user.full_name || user.email}</p>
              <p className="capitalize text-slate-500">{user.role || "usuario"}</p>
            </div>
          }
          <button
            onClick={handleLogout}
            disabled={leaving}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-rose-600 hover:text-white disabled:opacity-60">
            
            <LogOut className="w-5 h-5" />
            Salir de la app
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Bike className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-bold">AHL Soluciones Integrales </span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 -mr-2">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen &&
      <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[80vw] bg-slate-900 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Bike className="w-6 h-6 text-slate-900" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg leading-tight text-center">HR MOTOCICLETAS</h1>
                  <p className="text-xs text-slate-400 text-center">Almacén & Taller</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4">
              <NavContent />
            </nav>
            <div className="px-3 pb-3">
              <BackupReminder />
            </div>
            <div className="px-3 py-3 border-t border-slate-800">
              {user &&
            <div className="mb-2 px-2 text-xs">
                  <p className="truncate font-medium text-slate-200">{user.full_name || user.email}</p>
                  <p className="capitalize text-slate-500">{user.role || "usuario"}</p>
                </div>
            }
              <button
              onClick={handleLogout}
              disabled={leaving}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-rose-600 hover:text-white disabled:opacity-60">
              
                <LogOut className="w-5 h-5" />
                Salir de la app
              </button>
            </div>
          </aside>
        </div>
      }

      {/* Main content */}
      <main className="md:ml-64 pt-14 md:pt-0 min-h-screen">
        <Outlet />
      </main>
    </div>);

}
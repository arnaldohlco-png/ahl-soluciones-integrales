import React, { useState } from "react";
import { Outlet, Link, useLocation, Navigate, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Wrench, Package, Bike,
  ShoppingCart, Receipt, CreditCard, Wallet, Landmark,
  Truck, HardHat, Building2, Menu, X, Tag, BarChart3, Store, FileText, HandCoins, Banknote, CalendarClock, LogOut, Undo2, ClipboardList, ChevronDown } from
"lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useRoles } from "@/hooks/useRoles";
import { canAccess } from "@/lib/roles";
import BackupReminder from "@/components/BackupReminder";
import PriceViewer from "@/components/PriceViewer";
import TurnoOpeningPrompt from "@/components/TurnoOpeningPrompt";

const navGroups = [
{
  title: "Principal",
  items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }]
},
{
  title: "Taller",
  items: [
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/motocicletas", label: "Motocicletas", icon: Bike },
  { to: "/ordenes", label: "Órdenes de Servicio", icon: Wrench },
  { to: "/citas", label: "Citas y Recordatorios", icon: CalendarClock },
  { to: "/servicios", label: "Catálogo de Servicios", icon: Wrench },
  { to: "/tecnicos", label: "Técnicos", icon: HardHat },
  { to: "/prestamos-tecnicos", label: "Préstamos Técnicos", icon: HandCoins },
  { to: "/pago-comisiones", label: "Pago Comisiones", icon: Banknote }]
},
{
  title: "Inventario y Ventas",
  items: [
  { to: "/ventas", label: "Ventas / POS", icon: ShoppingCart },
  { to: "/inventario", label: "Inventario", icon: Package },
  { to: "/devoluciones", label: "Devoluciones", icon: Undo2 },
  { to: "/compras", label: "Compras", icon: Truck },
  { to: "/pedidos", label: "Pedidos a Proveedor", icon: ClipboardList },
  { to: "/facturas-proveedor", label: "Cargar Factura Proveedor", icon: FileText },
  { to: "/proveedores", label: "Proveedores", icon: Building2 },
  { to: "/marcas", label: "Marcas y Líneas", icon: Tag }]
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
  { to: "/empresa", label: "Mi Empresa", icon: Store }]
}];


export default function Layout() {
  const location = useLocation();
  const { user } = useAuth();
  const { roles } = useRoles();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const navigate = useNavigate();
  const pathRef = React.useRef(location.pathname);
  pathRef.current = location.pathname;
  const mobileOpenRef = React.useRef(false);
  mobileOpenRef.current = mobileOpen;

  // Atajo global Ctrl+O: nueva orden de servicio
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        if (pathRef.current === "/ordenes") {
          window.dispatchEvent(new Event("new-service-order"));
        } else {
          navigate("/ordenes", { state: { newOrder: true } });
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        if (pathRef.current === "/motocicletas") {
          window.dispatchEvent(new Event("new-motorcycle"));
        } else {
          navigate("/motocicletas", { state: { newMoto: true } });
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        if (pathRef.current === "/inventario") {
          window.dispatchEvent(new Event("new-product"));
        } else {
          navigate("/inventario", { state: { newProduct: true } });
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "c") {
        // No interferir con copiar: campos de texto o texto seleccionado
        const t = e.target;
        if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
        if (window.getSelection()?.toString()) return;
        e.preventDefault();
        if (pathRef.current === "/cotizaciones") {
          window.dispatchEvent(new Event("new-quotation"));
        } else {
          navigate("/cotizaciones", { state: { newQuote: true } });
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "x") {
        const t = e.target;
        if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
        if (window.getSelection()?.toString()) return;
        e.preventDefault();
        if (pathRef.current !== "/creditos") navigate("/creditos");
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (pathRef.current !== "/servicios") navigate("/servicios");
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (pathRef.current === "/gastos") {
          window.dispatchEvent(new Event("new-expense"));
        } else {
          navigate("/gastos", { state: { newExpense: true } });
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (pathRef.current === "/facturacion") {
          window.dispatchEvent(new Event("new-invoice"));
        } else {
          navigate("/facturacion", { state: { newInvoice: true } });
        }
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (pathRef.current !== "/creditos") navigate("/creditos");
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === "KeyP") {
        e.preventDefault();
        if (pathRef.current !== "/compras") navigate("/compras");
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (pathRef.current === "/ventas") {
          window.dispatchEvent(new Event("new-sale"));
        } else {
          navigate("/ventas", { state: { newSale: true } });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  // El botón de menú del Dashboard dispara este evento para abrir el drawer
  React.useEffect(() => {
    const onOpen = () => setMobileOpen(true);
    window.addEventListener("open-app-menu", onOpen);
    return () => window.removeEventListener("open-app-menu", onOpen);
  }, []);

  // Escape: cierra overlay personalizado; si no, deja que un diálogo Radix se cierre;
  // si no, cierra el menú lateral; si no, reinicia la venta abierta y vuelve a la página anterior.
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      // 1. Overlay personalizado (vista de impresión, comisiones, etc.)
      const overlays = Array.from(document.querySelectorAll("div")).filter((d) => {
        const cs = d.classList;
        return (
          cs.contains("fixed") &&
          cs.contains("inset-0") &&
          cs.contains("z-50") &&
          !d.querySelector("aside") &&            // omite el drawer
          !d.querySelector('[role="dialog"]')      // omite los diálogos Radix
        );
      });
      const top = overlays[overlays.length - 1];
      if (top) {
        const btns = Array.from(top.querySelectorAll("button"));
        const closeBtn =
          btns.find((b) => /cerrar/i.test(b.textContent || "")) ||
          btns.find((b) => b.textContent.trim() === "×");
        if (closeBtn) {
          e.stopPropagation();
          closeBtn.click();
        }
        return; // hay un overlay abierto, no navegar
      }
      // 2. Diálogo/popover de Radix abierto: deja que se cierre solo
      if (document.querySelector('[role="dialog"]')) return;
      // 3. Si el foco está en un campo de entrada, libera el foco (no navega)
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.tagName === "SELECT" || ae.isContentEditable)) {
        ae.blur();
        return;
      }
      // 4. Menú lateral abierto: solo ciérralo
      if (mobileOpenRef.current) {
        setMobileOpen(false);
        return;
      }
      // 5. Reinicia la venta abierta y vuelve a la página anterior
      window.dispatchEvent(new Event("reset-sale"));
      if (window.history.length > 1) navigate(-1);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [navigate]);

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

  const isGroupOpen = (g) => openGroups[g.title] ?? g.items.some((it) => it.to === location.pathname);

  const NavContent = () =>
  <>
      {visibleGroups.map((group) =>
    <div key={group.title} className="mb-2">
          {group.title === "Principal" ?
      <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{group.title}</p> :
      <button
        onClick={() => {
          const willOpen = !isGroupOpen(group);
          const next = {};
          visibleGroups.forEach((g) => {next[g.title] = false;});
          next[group.title] = willOpen;
          setOpenGroups(next);
        }}
        className="flex w-full items-center justify-between px-3 py-2 mb-1 rounded-lg text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-800 hover:text-white transition-colors">
              {group.title}
              <ChevronDown className={cn("w-4 h-4 transition-transform", isGroupOpen(group) ? "" : "-rotate-90")} />
            </button>}
          <div className={group.title === "Principal" || isGroupOpen(group) ? "" : "hidden"}>
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
          {group.title === "Principal" &&
      <button
        onClick={() => {setMobileOpen(false);window.dispatchEvent(new Event("open-price-viewer"));}}
        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-slate-300 hover:bg-slate-800 hover:text-white">
              <Tag className="w-5 h-5" />
              Visor de precios
            </button>}
        </div>
    )}
    </>;


  const isDashboard = location.pathname === "/";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop: botón de tres rayitas (oculto en Dashboard, que lleva su propio menú) */}
      {!isDashboard &&
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        className="hidden md:flex fixed top-3 left-3 z-30 w-10 h-10 items-center justify-center rounded-lg bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-colors">
        <Menu className="w-5 h-5" />
      </button>}

      {/* Mobile top bar (oculta en Dashboard, que lleva su propio menú en el encabezado amarillo) */}
      {!isDashboard &&
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
      </div>}

      {/* Drawer (escritorio y móvil) */}
      {mobileOpen &&
      <div className="fixed inset-0 z-50 flex">
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

      <PriceViewer />
      <TurnoOpeningPrompt />

      {/* Main content */}
      <main className={`min-h-screen ${isDashboard ? "" : "pt-14 md:pt-0 md:pl-16"}`}>
        <Outlet />
      </main>
    </div>);

}
import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Wrench, ShoppingCart, Package, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ordenes", label: "Órdenes", icon: Wrench },
  { to: "/ventas", label: "Ventas", icon: ShoppingCart },
  { to: "/inventario", label: "Inventario", icon: Package },
];

// Barra inferior solo móvil. Recuerda la última ubicación de cada pestaña.
export default function BottomTabBar({ canAccess, onMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const last = useRef({});

  useEffect(() => {
    const tab = TABS.find((t) => t.to === location.pathname);
    if (tab) last.current[tab.to] = location.pathname + location.search;
  }, [location]);

  const tabs = TABS.filter((t) => canAccess(t.to));
  const itemCls = "flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-medium transition-colors";

  return (
    <nav
      className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border flex"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = location.pathname === t.to;
        return (
          <button
            key={t.to}
            onClick={() => !active && navigate(last.current[t.to] || t.to)}
            className={cn(itemCls, active ? "text-amber-500" : "text-muted-foreground")}>
            <Icon className="w-5 h-5" />
            {t.label}
          </button>
        );
      })}
      <button onClick={onMenu} className={cn(itemCls, "text-muted-foreground")}>
        <Menu className="w-5 h-5" />
        Menú
      </button>
    </nav>
  );
}
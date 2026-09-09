import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, Users, Package, Bike, AlertTriangle, TrendingUp, Clock, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeOrders: 0,
    completedOrders: 0,
    customers: 0,
    motorcycles: 0,
    products: 0,
    lowStock: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [orders, customers, motorcycles, products] = await Promise.all([
          base44.entities.ServiceOrder.list("-created_date", 100),
          base44.entities.Customer.list("-created_date", 100),
          base44.entities.Motorcycle.list("-created_date", 100),
          base44.entities.Product.list("-created_date", 200),
        ]);

        const active = orders.filter((o) => o.status === "Ingresado" || o.status === "En proceso");
        const completed = orders.filter((o) => o.status === "Completado" || o.status === "Entregado");
        const revenue = completed.reduce((sum, o) => sum + (o.cost || 0), 0);
        const low = products.filter((p) => (p.stock || 0) <= (p.min_stock || 5));

        setStats({
          activeOrders: active.length,
          completedOrders: completed.length,
          customers: customers.length,
          motorcycles: motorcycles.length,
          products: products.length,
          lowStock: low.length,
          revenue,
        });
        setRecentOrders(active.slice(0, 5));
        setLowStockProducts(low.slice(0, 5));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Órdenes Activas", value: stats.activeOrders, icon: Clock, color: "bg-blue-50 text-blue-600", to: "/ordenes" },
    { label: "Clientes", value: stats.customers, icon: Users, color: "bg-purple-50 text-purple-600", to: "/clientes" },
    { label: "Motocicletas", value: stats.motorcycles, icon: Bike, color: "bg-emerald-50 text-emerald-600", to: "/motocicletas" },
    { label: "Productos", value: stats.products, icon: Package, color: "bg-amber-50 text-amber-600", to: "/inventario" },
  ];

  const statusColors = {
    "Ingresado": "bg-blue-100 text-blue-700",
    "En proceso": "bg-amber-100 text-amber-700",
    "Completado": "bg-emerald-100 text-emerald-700",
    "Entregado": "bg-slate-100 text-slate-700",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Resumen general del taller y almacén</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm text-slate-500 mt-0.5">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Revenue + Low stock alert */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white lg:col-span-1">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <DollarSign className="w-5 h-5" />
            <span className="text-sm">Ingresos por servicios</span>
          </div>
          <p className="text-4xl font-bold">
            ${stats.revenue.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
          </p>
          <div className="flex items-center gap-2 mt-3 text-emerald-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>{stats.completedOrders} órdenes completadas</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-900">Stock bajo</h3>
            </div>
            <Link to="/inventario" className="text-sm text-amber-600 hover:underline font-medium">
              Ver inventario
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-slate-400 text-sm py-4 text-center">Todo el inventario está en niveles correctos ✓</p>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.brand} · {p.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {p.stock} unidades
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active orders */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-slate-700" />
            <h3 className="font-semibold text-slate-900">Órdenes activas recientes</h3>
          </div>
          <Link to="/ordenes" className="text-sm text-amber-600 hover:underline font-medium">
            Ver todas
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No hay órdenes activas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Mecánico</th>
                  <th className="pb-2 font-medium">Estado</th>
                  <th className="pb-2 font-medium text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{o.service_type}</td>
                    <td className="py-3 text-slate-600">{o.mechanic || "—"}</td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || "bg-slate-100 text-slate-600"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-800">
                      ${(o.cost || 0).toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
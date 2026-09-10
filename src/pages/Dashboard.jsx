import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Clock, Wrench,
  Package, AlertTriangle, Receipt, HardHat, ShoppingCart, Bike, CreditCard } from
"lucide-react";
import moment from "moment";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState({});
  const [company, setCompany] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [sales, orders, customers, motorcycles, products, expenses, receivables, invoices, technicians, companies] = await Promise.all([
        base44.entities.Sale.list("-created_date", 200),
        base44.entities.ServiceOrder.list("-created_date", 200),
        base44.entities.Customer.list("-created_date", 100),
        base44.entities.Motorcycle.list("-created_date", 100),
        base44.entities.Product.list("-created_date", 200),
        base44.entities.Expense.list("-created_date", 200),
        base44.entities.AccountReceivable.list("-created_date", 200),
        base44.entities.Invoice.list("-created_date", 200),
        base44.entities.Technician.list("-created_date", 100),
        base44.entities.Company.list("-created_date", 1)]
        );
        setCompany(companies[0] || null);

        const today = moment().format("YYYY-MM-DD");
        const startWeek = moment().startOf("isoWeek").format("YYYY-MM-DD");
        const startMonth = moment().startOf("month").format("YYYY-MM-DD");

        const salesToday = sales.filter((s) => (s.date || "") >= today).reduce((s, x) => s + (x.total || 0), 0);
        const salesWeek = sales.filter((s) => (s.date || "") >= startWeek).reduce((s, x) => s + (x.total || 0), 0);
        const salesMonth = sales.filter((s) => (s.date || "") >= startMonth).reduce((s, x) => s + (x.total || 0), 0);

        const workshopIncome = orders.filter((o) => o.status === "Completado" || o.status === "Entregado").reduce((s, o) => s + (o.cost || 0), 0);
        const storeIncome = sales.reduce((s, x) => s + (x.total || 0), 0);
        const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const monthExpenses = expenses.filter((e) => (e.date || "") >= startMonth).reduce((s, e) => s + (e.amount || 0), 0);
        const estimatedProfit = workshopIncome + storeIncome - totalExpenses;
        const totalReceivables = receivables.reduce((s, r) => s + (r.balance || 0), 0);

        const lowStock = products.filter((p) => (p.stock || 0) <= (p.min_stock || 5));

        const productSales = {};
        sales.forEach((s) => {
          try {
            const items = JSON.parse(s.items || "[]");
            items.forEach((item) => {
              const key = item.name || "N/A";
              if (!productSales[key]) productSales[key] = { qty: 0, revenue: 0 };
              productSales[key].qty += item.quantity || 0;
              productSales[key].revenue += item.subtotal || 0;
            });
          } catch (_) {}
        });
        const topProducts = Object.entries(productSales).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);

        const svcCount = {};
        orders.forEach((o) => {svcCount[o.service_type] = (svcCount[o.service_type] || 0) + 1;});
        const topServices = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const techMap = {};
        technicians.forEach((t) => {techMap[t.id] = t.name;});
        const techCommissions = {};
        orders.forEach((o) => {
          if (o.technician_id) {
            if (!techCommissions[o.technician_id]) techCommissions[o.technician_id] = { name: techMap[o.technician_id] || "—", commission: 0, count: 0 };
            techCommissions[o.technician_id].commission += o.technician_commission || 0;
            techCommissions[o.technician_id].count += 1;
          }
        });
        const topTechnicians = Object.values(techCommissions).sort((a, b) => b.commission - a.commission);

        const motosInWorkshop = orders.filter((o) => o.status === "Ingresado" || o.status === "En proceso");
        const pendingOrders = orders.filter((o) => o.status !== "Entregado");
        const pendingInvoices = invoices.filter((i) => i.status === "Pendiente");

        setD({
          salesToday, salesWeek, salesMonth,
          workshopIncome, storeIncome, totalExpenses, monthExpenses, estimatedProfit,
          totalReceivables,
          lowStock, topProducts, topServices, topTechnicians,
          motosInWorkshop: motosInWorkshop.slice(0, 5), motosInWorkshopCount: motosInWorkshop.length,
          pendingOrders: pendingOrders.length, pendingInvoices: pendingInvoices.length,
          customers: customers.length, motorcycles: motorcycles.length, products: products.length,
          lowStockProducts: lowStock.slice(0, 5),
          completedOrders: orders.filter((o) => o.status === "Completado" || o.status === "Entregado").length
        });
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
      </div>);

  }

  const statusColors = {
    "Ingresado": "bg-blue-100 text-blue-700",
    "En proceso": "bg-amber-100 text-amber-700",
    "Completado": "bg-emerald-100 text-emerald-700",
    "Entregado": "bg-slate-100 text-slate-700"
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Encabezado con datos de la empresa */}
      <div className="mb-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 md:p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {company?.logo ? (
            <img src={company.logo} alt="Logo" className="w-16 h-16 rounded-lg object-contain bg-white/95 p-1 shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <Bike className="w-8 h-8 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate">{company?.name || "Mi Taller"}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-300">
              {company?.document_number && <span>NIT/C.C.: {company.document_number}</span>}
              {company?.phone && <span className="flex items-center gap-1">· {company.phone}</span>}
              {company?.email && <span className="truncate">· {company.email}</span>}
            </div>
            {(company?.address || company?.city) && (
              <p className="text-sm text-slate-400 mt-0.5 truncate">
                {[company.address, company.city].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-400">{moment().format("dddd")}</p>
            <p className="text-lg font-semibold">{moment().format("DD/MM/YYYY")}</p>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Resumen</h2>
        <p className="mt-1 text-slate-500">Resumen financiero y operativo en tiempo real</p>
      </div>

      {/* Sales row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="w-4 h-4 opacity-80" />
            <p className="text-xs text-amber-100">Ventas del día</p>
          </div>
          <p className="text-lg font-bold leading-tight">{fmt(d.salesToday)}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 opacity-80" />
            <p className="text-xs text-slate-300">Ventas de la semana</p>
          </div>
          <p className="text-lg font-bold leading-tight">{fmt(d.salesWeek)}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 opacity-80" />
            <p className="text-xs text-slate-400">Ventas del mes</p>
          </div>
          <p className="text-lg font-bold leading-tight">{fmt(d.salesMonth)}</p>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Link to="/ordenes" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <Wrench className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-xl font-bold text-slate-900">{fmt(d.workshopIncome)}</p>
          <p className="text-xs text-slate-500">Ingresos taller</p>
        </Link>
        <Link to="/ventas" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <ShoppingCart className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-xl font-bold text-slate-900">{fmt(d.storeIncome)}</p>
          <p className="text-xs text-slate-500">Ingresos almacén</p>
        </Link>
        <Link to="/creditos" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <CreditCard className="w-5 h-5 text-purple-600 mb-2" />
          <p className="text-xl font-bold text-slate-900">{fmt(d.totalReceivables)}</p>
          <p className="text-xs text-slate-500">Cuentas por cobrar</p>
        </Link>
        <Link to="/gastos" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <TrendingDown className="w-5 h-5 text-red-600 mb-2" />
          <p className="text-xl font-bold text-slate-900">{fmt(d.totalExpenses)}</p>
          <p className="text-xs text-slate-500">Gastos totales</p>
        </Link>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
          <DollarSign className="w-5 h-5 mb-2 opacity-80" />
          <p className="text-xl font-bold">{fmt(d.estimatedProfit)}</p>
          <p className="text-xs text-emerald-100">Utilidad estimada</p>
        </div>
      </div>

      {/* Operational stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link to="/ordenes" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-amber-600" />
            <p className="text-2xl font-bold text-slate-900">{d.motosInWorkshopCount}</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">Motos en taller</p>
        </Link>
        <Link to="/ordenes" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <p className="text-2xl font-bold text-slate-900">{d.pendingOrders}</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">Órdenes pendientes</p>
        </Link>
        <Link to="/facturacion" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-purple-600" />
            <p className="text-2xl font-bold text-slate-900">{d.pendingInvoices}</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">Facturas pendientes</p>
        </Link>
        <Link to="/inventario" className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-2xl font-bold text-slate-900">{d.lowStock?.length || 0}</p>
          </div>
          <p className="text-xs text-slate-500 mt-1">Productos stock bajo</p>
        </Link>
      </div>

      {/* Two-column: Motos en taller + Stock bajo */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Bike className="w-5 h-5 text-amber-600" /> Motos en el taller</h3>
            <Link to="/ordenes" className="text-sm text-amber-600 hover:underline font-medium">Ver todas</Link>
          </div>
          {d.motosInWorkshop?.length === 0 ?
          <p className="text-slate-400 text-sm py-4 text-center">No hay motos en el taller</p> :

          <div className="space-y-2">
              {d.motosInWorkshop?.map((o) =>
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{o.service_type}</p>
                    <p className="text-xs text-slate-400">{o.description?.slice(0, 40) || "Sin descripción"}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || "bg-slate-100"}`}>{o.status}</span>
                </div>
            )}
            </div>
          }
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Inventario bajo</h3>
            <Link to="/inventario" className="text-sm text-amber-600 hover:underline font-medium">Ver inventario</Link>
          </div>
          {d.lowStockProducts?.length === 0 ?
          <p className="text-slate-400 text-sm py-4 text-center">Todo el inventario está en niveles correctos ✓</p> :

          <div className="space-y-2">
              {d.lowStockProducts?.map((p) =>
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.brand} · {p.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">{p.stock} u.</span>
                </div>
            )}
            </div>
          }
        </div>
      </div>

      {/* Top products + services */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" /> Productos más vendidos</h3>
          {d.topProducts?.length === 0 ?
          <p className="text-slate-400 text-sm py-4 text-center">Sin ventas registradas</p> :

          <div className="space-y-2">
              {d.topProducts?.map(([name, info], i) =>
            <div key={name} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{name}</p>
                    <p className="text-xs text-slate-400">{info.qty} unidades</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{fmt(info.revenue)}</span>
                </div>
            )}
            </div>
          }
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-600" /> Servicios más realizados</h3>
          {d.topServices?.length === 0 ?
          <p className="text-slate-400 text-sm py-4 text-center">Sin órdenes registradas</p> :

          <div className="space-y-2">
              {d.topServices?.map(([type, count], i) =>
            <div key={type} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <p className="flex-1 font-medium text-slate-800 text-sm">{type}</p>
                  <span className="text-sm text-slate-500">{count} órdenes</span>
                </div>
            )}
            </div>
          }
        </div>
      </div>

      {/* Technicians and commissions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><HardHat className="w-5 h-5 text-amber-600" /> Técnicos y comisiones</h3>
          <Link to="/tecnicos" className="text-sm text-amber-600 hover:underline font-medium">Ver técnicos</Link>
        </div>
        {d.topTechnicians?.length === 0 ?
        <p className="text-slate-400 text-sm py-4 text-center">No hay comisiones registradas</p> :

        <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Técnico</th>
                  <th className="pb-2 font-medium text-center">Servicios</th>
                  <th className="pb-2 font-medium text-right">Comisión generada</th>
                </tr>
              </thead>
              <tbody>
                {d.topTechnicians?.map((t, i) =>
              <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="py-3 text-center text-slate-600">{t.count}</td>
                    <td className="py-3 text-right font-semibold text-amber-600">{fmt(t.commission)}</td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>);

}
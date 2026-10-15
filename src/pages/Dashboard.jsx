import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Clock, Wrench,
  Package, AlertTriangle, Receipt, HardHat, ShoppingCart, Bike, CreditCard,
  CalendarClock, FileText, Users, HandCoins, Upload, Undo2, BarChart3, ClipboardList, Menu } from
"lucide-react";
import moment from "moment";
import { momentBogota } from "@/lib/localDate";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState({});
  const [company, setCompany] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [sales, orders, customers, motorcycles, products, expenses, receivables, invoices, technicians, companies, appointments] = await Promise.all([
        fetchAll("Sale"),
        fetchAll("ServiceOrder"),
        fetchAll("Customer"),
        fetchAll("Motorcycle"),
        fetchAll("Product"),
        fetchAll("Expense"),
        fetchAll("AccountReceivable"),
        fetchAll("Invoice"),
        fetchAll("Technician"),
        base44.entities.Company.list("-created_date", 1),
        fetchAll("Appointment", "-date")]
        );
        setCompany(companies[0] || null);
        const today = momentBogota().format("YYYY-MM-DD");
        const startWeek = momentBogota().startOf("isoWeek").format("YYYY-MM-DD");
        const startMonth = momentBogota().startOf("month").format("YYYY-MM-DD");

        // Órdenes ya convertidas en cotización/factura/venta no cuentan en el dashboard (igual que en el módulo Órdenes)
        const convertedOrderIds = new Set([
        ...invoices.map((i) => i.related_order_id).filter(Boolean),
        ...sales.map((s) => s.related_order_id).filter(Boolean)]
        );
        const visibleOrders = orders.filter((o) => !convertedOrderIds.has(o.id));

        const salesToday = sales.filter((s) => (s.date || "") >= today).reduce((s, x) => s + (x.total || 0), 0);
        const salesWeek = sales.filter((s) => (s.date || "") >= startWeek).reduce((s, x) => s + (x.total || 0), 0);
        const salesMonth = sales.filter((s) => (s.date || "") >= startMonth).reduce((s, x) => s + (x.total || 0), 0);

        // Mapa de costos de productos para calcular el COGS del almacén
        const productCostMap = {};
        products.forEach((p) => {productCostMap[p.id] = p.cost || 0;});

        // Ingresos taller: solo servicios (items tipo Servicio) de órdenes finalizadas
        const techPctMap = {};
        technicians.forEach((t) => {techPctMap[t.id] = t.commission_percentage || 0;});
        // Base de comisión: solo servicios, excluyendo los denominados "terceros" (igual que Pago de Comisiones)
        const commissionBaseOf = (o) => {
          let items = [];
          try {items = JSON.parse(o.service_items || "[]");} catch (_) {}
          return items.
          filter((it) => String(it.type || "").toLowerCase() === "servicio").
          filter((it) => !/tercero/i.test((it.name || "").trim())).
          reduce((s, it) => s + (it.subtotal || 0), 0);
        };
        const finalizedOrders = orders.filter((o) => ["Terminado", "Entregado"].includes(o.status));
        const visibleCompleted = visibleOrders.filter((o) => o.status === "Terminado" || o.status === "Entregado");
        let workshopIncome = 0;
        let workshopCost = 0;
        finalizedOrders.forEach((o) => {
          let items = [];
          try {items = JSON.parse(o.service_items || "[]");} catch (_) {}
          const svcItems = items.filter((it) => it.type === "Servicio");
          if (items.length > 0) {
            workshopIncome += svcItems.reduce((s, it) => s + (it.subtotal || 0), 0);
          } else {
            // Órdenes sin items detallados: aproximar porción de servicios = total - repuestos - lubricantes
            workshopIncome += Math.max(0, (o.cost || 0) - (o.parts_cost || 0) - (o.lubricants_cost || 0));
          }
          // Restar comisiones efectivamente pagadas (base × % del técnico) para órdenes marcadas como pagadas
          if (o.commission_paid) {
            workshopCost += commissionBaseOf(o) * (techPctMap[o.technician_id] || 0) / 100;
          }
        });
        const workshopProfit = workshopIncome - workshopCost;

        // Ingresos almacén: solo productos (items con product_id o tipo Producto) de ventas y de órdenes no convertidas
        let storeIncome = 0;
        let storeCost = 0;
        const addProductItem = (it) => {
          if (it.product_id || it.type === "Producto") {
            storeIncome += it.subtotal || 0;
            const unitCost = it.product_id ? productCostMap[it.product_id] || 0 : 0;
            storeCost += unitCost * (it.quantity || 0);
          }
        };
        sales.forEach((s) => {let items = [];try {items = JSON.parse(s.items || "[]");} catch (_) {}items.forEach(addProductItem);});
        visibleCompleted.forEach((o) => {let items = [];try {items = JSON.parse(o.service_items || "[]");} catch (_) {}items.forEach(addProductItem);});
        const storeProfit = storeIncome - storeCost;

        const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const monthExpenses = expenses.filter((e) => (e.date || "") >= startMonth).reduce((s, e) => s + (e.amount || 0), 0);
        const estimatedProfit = workshopProfit + storeProfit - totalExpenses;
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
        visibleOrders.forEach((o) => {svcCount[o.service_type] = (svcCount[o.service_type] || 0) + 1;});
        const topServices = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const techMap = {};
        technicians.forEach((t) => {techMap[t.id] = t.name;});
        const techCommissions = {};
        visibleOrders.forEach((o) => {
          if (o.technician_id) {
            if (!techCommissions[o.technician_id]) techCommissions[o.technician_id] = { name: techMap[o.technician_id] || "—", commission: 0, count: 0 };
            techCommissions[o.technician_id].commission += o.technician_commission || 0;
            techCommissions[o.technician_id].count += 1;
          }
        });
        const topTechnicians = Object.values(techCommissions).sort((a, b) => b.commission - a.commission);

        const motosInWorkshop = visibleOrders.filter((o) => o.status === "Ingresado" || o.status === "En proceso");
        const pendingOrders = visibleOrders.filter((o) => o.status !== "Entregado");
        const pendingInvoices = invoices.filter((i) => i.status === "Pendiente");

        const activeAppointments = appointments.filter((a) => a.status === "Pendiente" || a.status === "Confirmada");
        const appointmentsToday = activeAppointments.filter((a) => (a.date || "") === today);
        const upcomingAppointments = activeAppointments.
        filter((a) => (a.date || "") >= today).
        sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`)).
        slice(0, 5);

        // Conteo de órdenes por estado (solo visibles, no convertidas)
        const ordersByStatus = {
          "Ingresado": visibleOrders.filter((o) => o.status === "Ingresado").length,
          "En proceso": visibleOrders.filter((o) => o.status === "En proceso").length,
          "Terminado": visibleOrders.filter((o) => o.status === "Terminado").length,
          "Entregado": visibleOrders.filter((o) => o.status === "Entregado").length
        };

        setD({
          salesToday, salesWeek, salesMonth,
          workshopIncome, workshopProfit, storeIncome, storeProfit, totalExpenses, monthExpenses, estimatedProfit,
          totalReceivables,
          lowStock, topProducts, topServices, topTechnicians,
          motosInWorkshop: motosInWorkshop.slice(0, 5), motosInWorkshopCount: motosInWorkshop.length,
          pendingOrders: pendingOrders.length, pendingInvoices: pendingInvoices.length,
          customers: customers.length, motorcycles: motorcycles.length, products: products.length,
          lowStockProducts: lowStock.slice(0, 5),
          completedOrders: visibleOrders.filter((o) => o.status === "Terminado" || o.status === "Entregado").length,
          appointmentsTodayCount: appointmentsToday.length,
          upcomingAppointments,
          ordersByStatus
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

  const openMenu = () => window.dispatchEvent(new Event("open-app-menu"));

  const statusMeta = {
    "Ingresado": { color: "#60a5fa", icon: ClipboardList },
    "En proceso": { color: "#EAB308", icon: Wrench },
    "Terminado": { color: "#34d399", icon: HardHat },
    "Entregado": { color: "#cbd5e1", icon: Bike }
  };

  return (
    <div className="min-h-screen bg-[#090D16] p-4 md:p-8 flex flex-col gap-5 md:gap-6 text-white">
      {/* Encabezado amarillo a todo lo ancho, con menú dentro */}
      <div
        className="bg-[#EAB308] rounded-[20px] p-4 md:p-5 flex items-center gap-4 md:gap-5 text-[#090D16] shadow-[0_10px_30px_rgba(234,179,8,0.22)] dash-rise">
        <button
          onClick={openMenu}
          aria-label="Abrir menú"
          className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#090D16] text-white border-2 border-[#1E293B] flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:bg-[#1E293B] active:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white shadow-[0_4px_10px_rgba(9,13,22,0.4)]">
          <Menu className="w-5 h-5 md:w-6 md:h-6" />
        </button>
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
          {company?.logo ?
          <img src={company.logo} alt="Logo" className="w-full h-full object-contain" /> :
          <Bike className="w-7 h-7 text-[#090D16]" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-black uppercase tracking-[0.02em] leading-tight truncate">
            {company?.name || "Mi Taller"}
          </h1>
          <p className="text-[11px] md:text-[13px] font-semibold mt-1 leading-tight truncate">
            {[
            company?.document_number && `NIT/C.C.: ${company.document_number}`,
            company?.phone,
            company?.email,
            [company?.address, company?.city].filter(Boolean).join(" · ")].
            filter(Boolean).join("  ·  ")}
          </p>
        </div>
        <div className="text-right shrink-0 hidden sm:block">
          <span className="block text-[13px] font-semibold opacity-80 capitalize">{momentBogota().format("dddd")}</span>
          <b className="block text-lg md:text-xl font-black mt-0.5">{momentBogota().format("DD/MM/YYYY")}</b>
        </div>
      </div>

      {/* Recuadro: Órdenes por estado */}
      <div className="dash-rise" style={{ animationDelay: "0.05s" }}>
        <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Órdenes por estado</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {Object.entries(statusMeta).map(([status, meta]) => {
            const Icon = meta.icon;
            const count = d.ordersByStatus?.[status] || 0;
            return (
              <Link
                key={status}
                to="/ordenes"
                className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] flex flex-col gap-2 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308]">
                <div className="flex items-center gap-3">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 shrink-0" style={{ color: meta.color }} />
                  <span className="text-4xl md:text-5xl font-black leading-none">{count}</span>
                </div>
                <p className="text-sm md:text-[15px] font-medium text-slate-300 mt-1">{status}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sales row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        <div className="bg-[#EAB308] text-[#090D16] rounded-[18px] p-5 md:p-6 border border-[#EAB308] flex flex-col gap-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.35)] dash-rise" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2 text-sm font-semibold opacity-85">
            <ShoppingCart className="w-5 h-5" />
            Ventas del día
          </div>
          <div className="text-3xl md:text-[44px] font-black leading-tight tracking-tight">{fmt(d.salesToday)}</div>
        </div>
        <div className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] flex flex-col gap-1.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] dash-rise" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 text-sm font-semibold opacity-85">
            <TrendingUp className="w-5 h-5" />
            Ventas de la semana
          </div>
          <div className="text-3xl md:text-[44px] font-black leading-tight tracking-tight">{fmt(d.salesWeek)}</div>
        </div>
        <div className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] flex flex-col gap-1.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] dash-rise" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-2 text-sm font-semibold opacity-85">
            <DollarSign className="w-5 h-5" />
            Ventas del mes
          </div>
          <div className="text-3xl md:text-[44px] font-black leading-tight tracking-tight">{fmt(d.salesMonth)}</div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <Link to="/ordenes" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] flex flex-col gap-1.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.1s" }}>
          <Wrench className="w-5 h-5" style={{ color: "#60a5fa" }} />
          <div className="text-2xl md:text-[30px] font-black leading-tight mt-2">{fmt(d.workshopIncome)}</div>
          <p className="text-[13px] font-medium opacity-80">Ingresos taller (servicios)</p>
          <p className="text-[13px] font-extrabold text-[#EAB308] mt-1">Utilidad: {fmt(d.workshopProfit)}</p>
        </Link>
        <Link to="/ventas" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] flex flex-col gap-1.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.2s" }}>
          <ShoppingCart className="w-5 h-5" style={{ color: "#34d399" }} />
          <div className="text-2xl md:text-[30px] font-black leading-tight mt-2">{fmt(d.storeIncome)}</div>
          <p className="text-[13px] font-medium opacity-80">Ingresos almacén (productos)</p>
          <p className="text-[13px] font-extrabold text-[#EAB308] mt-1">Utilidad: {fmt(d.storeProfit)}</p>
        </Link>
        <Link to="/creditos" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] flex flex-col gap-1.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.3s" }}>
          <CreditCard className="w-5 h-5" style={{ color: "#c084fc" }} />
          <div className="text-2xl md:text-[30px] font-black leading-tight mt-2">{fmt(d.totalReceivables)}</div>
          <p className="text-[13px] font-medium opacity-80">Cuentas por cobrar</p>
        </Link>
        <Link to="/gastos" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] flex flex-col gap-1.5 text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.4s" }}>
          <TrendingDown className="w-5 h-5" style={{ color: "#f87171" }} />
          <div className="text-2xl md:text-[30px] font-black leading-tight mt-2">{fmt(d.totalExpenses)}</div>
          <p className="text-[13px] font-medium opacity-80">Gastos totales</p>
        </Link>
        <div className="bg-[#EAB308] text-[#090D16] rounded-[18px] p-5 md:p-6 border border-[#EAB308] flex flex-col gap-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.35)] dash-rise" style={{ animationDelay: "0.5s" }}>
          <DollarSign className="w-5 h-5" />
          <div className="text-2xl md:text-[30px] font-black leading-tight mt-2">{fmt(d.estimatedProfit)}</div>
          <p className="text-[13px] font-bold opacity-90">Utilidad estimada</p>
        </div>
      </div>

      {/* Operational stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <Link to="/ordenes" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] min-h-[160px] justify-between flex flex-col text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3">
            <Bike className="w-7 h-7 md:w-8 md:h-8" style={{ color: "#EAB308" }} />
            <span className="text-4xl md:text-[56px] font-black leading-none">{d.motosInWorkshopCount}</span>
          </div>
          <p className="text-sm md:text-[15px] font-medium text-slate-300">Motos en taller</p>
        </Link>
        <Link to="/ordenes" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] min-h-[160px] justify-between flex flex-col text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7 md:w-8 md:h-8" style={{ color: "#60a5fa" }} />
            <span className="text-4xl md:text-[56px] font-black leading-none">{d.pendingOrders}</span>
          </div>
          <p className="text-sm md:text-[15px] font-medium text-slate-300">Órdenes pendientes</p>
        </Link>
        <Link to="/facturacion" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] min-h-[160px] justify-between flex flex-col text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center gap-3">
            <Receipt className="w-7 h-7 md:w-8 md:h-8" style={{ color: "#c084fc" }} />
            <span className="text-4xl md:text-[56px] font-black leading-none">{d.pendingInvoices}</span>
          </div>
          <p className="text-sm md:text-[15px] font-medium text-slate-300">Facturas pendientes</p>
        </Link>
        <Link to="/inventario" className="bg-[#1E293B] rounded-[18px] p-5 md:p-6 border border-[#2b3a52] min-h-[160px] justify-between flex flex-col text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] transition-colors hover:border-[#EAB308] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#EAB308] dash-rise" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 md:w-8 md:h-8" style={{ color: "#f87171" }} />
            <span className="text-4xl md:text-[56px] font-black leading-none">{d.lowStock?.length || 0}</span>
          </div>
          <p className="text-sm md:text-[15px] font-medium text-slate-300">Productos stock bajo</p>
        </Link>
      </div>
    </div>);

}
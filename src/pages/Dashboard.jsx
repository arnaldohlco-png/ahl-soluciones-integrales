import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Clock, Wrench,
  Package, AlertTriangle, HardHat, ShoppingCart, Bike, CreditCard,
  FileText, ClipboardList, Menu } from
"lucide-react";
import { momentBogota } from "@/lib/localDate";
import { Image } from "@/components/ui/image";
import AreaPanel from "@/components/dashboard/AreaPanel";

const HERO_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/42f289adc_generated_77deb9b2.jpg";
const ALMACEN_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/1ee1362a1_generated_a3115d3f.jpg";
const CAJA_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/16ce35a1d_generated_748468fb.jpg";

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
    "En proceso": { color: "#F0B429", icon: Wrench },
    "Terminado": { color: "#34d399", icon: HardHat },
    "Entregado": { color: "#cbd5e1", icon: Bike }
  };

  const cardBase =
  "flex flex-col gap-2 bg-[#18212B] border border-[#34475a] border-l-4 border-l-[#F0B429] rounded-md p-5 text-[#EAF0F4] no-underline cursor-pointer min-h-[150px] justify-between transition-colors hover:bg-[#1f2b37] hover:border-[#F0B429] active:bg-[#141c24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0B429]";
  const cardHL =
  "flex flex-col gap-2 bg-[#F0B429] text-[#18212B] border border-[#F0B429] border-l-4 border-l-[#18212B] rounded-md p-5 cursor-pointer min-h-[150px] justify-between transition-colors hover:bg-[#f5c04a] hover:border-[#f5c04a] active:bg-[#d99f1f]";
  const grid3 = "grid grid-cols-1 sm:grid-cols-3 gap-4";
  const big = "text-[34px] font-black leading-[1.1] tracking-[-0.01em] mt-1.5";
  const bigXl = "text-[44px] md:text-[52px] font-black leading-none";
  const lb = "text-xs font-bold tracking-[0.16em] uppercase text-[#b9c6d1]";
  const ut = "text-[13px] font-extrabold text-[#F0B429] tracking-[0.04em]";

  return (
    <div className="min-h-screen bg-[#18212B] text-[#EAF0F4] flex flex-col">
      {/* HERO */}
      <div className="relative px-4 md:px-6 lg:px-12 pt-4 md:pt-8 pb-8 md:pb-14 flex flex-col gap-6 md:gap-9">
        <div className="absolute inset-0 z-0">
          <Image src={HERO_IMG} alt="Taller" fittingType="fill" className="w-full h-full" />
        </div>
        <div
          className="absolute inset-0 z-[1]"
          style={{ background: "linear-gradient(180deg,rgba(24,33,43,.78) 0%,rgba(24,33,43,.9) 70%,#18212B 100%)" }} />
        
        <div className="relative z-[2] flex flex-col gap-6 md:gap-9">
          {/* Barra de navegación */}
          <div className="flex items-center gap-3 md:gap-4 bg-[#F0B429] text-[#18212B] rounded-md p-3 md:px-5 md:py-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-b-4 border-[#18212B] dash-rise">
            <button
              onClick={openMenu}
              aria-label="Abrir menú"
              className="w-11 h-11 rounded-md bg-[#18212B] text-[#EAF0F4] border-2 border-[#263442] flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:bg-[#263442] active:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 md:w-[52px] md:h-[52px] rounded-md bg-[#EAF0F4] flex items-center justify-center shrink-0 overflow-hidden">
              {company?.logo ?
              <img src={company.logo} alt="Logo" className="w-full h-full object-contain" /> :

              <Bike className="w-7 h-7 text-[#18212B]" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base md:text-[22px] font-black uppercase tracking-[0.14em] leading-tight truncate text-center">
                {company?.name || "Mi Taller"}
              </h1>
              <p className="text-[11px] md:text-xs font-semibold mt-1 leading-tight truncate text-center">
                {[
                company?.document_number && `NIT/C.C.: ${company.document_number}`,
                company?.phone,
                company?.email,
                [company?.address, company?.city].filter(Boolean).join(" · ")].
                filter(Boolean).join("  ·  ")}
              </p>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <span className="block text-[11px] md:text-xs font-semibold tracking-[0.12em] uppercase opacity-80 capitalize">
                {momentBogota().format("dddd")}
              </span>
              <b className="block text-base md:text-xl font-black mt-0.5">{momentBogota().format("DD/MM/YYYY")}</b>
            </div>
          </div>

          {/* Órdenes por estado */}
          <div className="dash-rise" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-3 mb-4 md:mb-[18px] text-[#F0B429] text-[11px] md:text-xs font-bold tracking-[0.28em] uppercase">
              <span>Órdenes por estado</span>
              <span className="flex-1 h-[3px] bg-[#F0B429]/90" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {Object.entries(statusMeta).map(([status, meta]) => {
                const Icon = meta.icon;
                const count = d.ordersByStatus?.[status] || 0;
                return (
                  <Link
                    key={status}
                    to="/ordenes"
                    className="flex flex-col gap-2.5 bg-[#263442]/[0.88] border border-[#34475a] rounded-md p-4 md:p-5 text-[#EAF0F4] no-underline shadow-[0_10px_24px_rgba(0,0,0,0.4)] transition-colors hover:bg-[#2d3d4e] hover:shadow-[0_14px_30px_rgba(0,0,0,0.5)] active:bg-[#223040] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F0B429]"
                    style={{ borderTop: `4px solid ${meta.color}` }}>
                    
                    <div className="flex items-center gap-3 md:gap-3.5">
                      <Icon className="w-7 h-7 md:w-8 md:h-8 shrink-0" style={{ color: meta.color }} />
                      <span className="text-4xl md:text-[52px] font-black leading-none">{count}</span>
                    </div>
                    <p className="text-[13px] font-bold tracking-[0.16em] uppercase text-[#b9c6d1]">{status}</p>
                  </Link>);

              })}
            </div>
          </div>
        </div>
      </div>

      {/* CUERPO POR ÁREAS */}
      <div className="px-4 md:px-6 lg:px-12 pb-12 md:pb-16 flex flex-col gap-7 md:gap-9">
        {/* Taller */}
        <AreaPanel title="Taller" icon={Wrench} image={HERO_IMG} imageAlt="Taller" delay={0.2}>
          <div className={grid3}>
            <Link to="/ordenes" className={cardBase}>
              <div className="flex items-center gap-3">
                <Bike className="w-7 h-7" style={{ color: "#F0B429" }} />
                <span className={bigXl}>{d.motosInWorkshopCount}</span>
              </div>
              <span className={lb}>Motos en taller</span>
            </Link>
            <Link to="/ordenes" className={cardBase}>
              <div className="flex items-center gap-3">
                <Clock className="w-7 h-7" style={{ color: "#60a5fa" }} />
                <span className={bigXl}>{d.pendingOrders}</span>
              </div>
              <span className={lb}>Órdenes pendientes</span>
            </Link>
            <Link to="/ordenes" className={cardBase}>
              <Wrench className="w-5 h-5" style={{ color: "#60a5fa" }} />
              <span className={big}>{fmt(d.workshopIncome)}</span>
              <span className={lb}>Ingresos taller (servicios)</span>
              <span className={ut}>Utilidad: {fmt(d.workshopProfit)}</span>
            </Link>
          </div>
        </AreaPanel>

        <div className="h-1.5 rounded-sm opacity-90" style={{ background: "repeating-linear-gradient(135deg,#F0B429 0 14px,#18212B 14px 28px)" }} />

        {/* Almacén */}
        <AreaPanel title="Almacén" icon={Package} image={ALMACEN_IMG} imageAlt="Almacén" delay={0.3}>
          <div className={grid3}>
            <Link to="/ventas" className={cardBase}>
              <ShoppingCart className="w-5 h-5" style={{ color: "#34d399" }} />
              <span className={big}>{fmt(d.storeIncome)}</span>
              <span className={lb}>Ingresos almacén (productos)</span>
              <span className={ut}>Utilidad: {fmt(d.storeProfit)}</span>
            </Link>
            <Link to="/inventario" className={cardBase}>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-7 h-7" style={{ color: "#f87171" }} />
                <span className={bigXl}>{d.lowStock?.length || 0}</span>
              </div>
              <span className={lb}>Productos stock bajo</span>
            </Link>
            <Link to="/facturacion" className={cardBase}>
              <FileText className="w-5 h-5" style={{ color: "#c084fc" }} />
              <span className={bigXl} style={{ marginTop: 6 }}>{d.pendingInvoices}</span>
              <span className={lb}>Facturas pendientes</span>
            </Link>
          </div>
        </AreaPanel>

        <div className="h-1.5 rounded-sm opacity-90" style={{ background: "repeating-linear-gradient(135deg,#F0B429 0 14px,#18212B 14px 28px)" }} />

        {/* Caja */}
        <AreaPanel title="Caja" icon={Wallet} image={CAJA_IMG} imageAlt="Caja" delay={0.4}>
          <div className={grid3}>
            <div className={cardHL}>
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5" />
                <span className="text-xs font-bold tracking-[0.16em] uppercase">Ventas del día</span>
              </div>
              <span className="text-[34px] md:text-[42px] font-black leading-tight">{fmt(d.salesToday)}</span>
            </div>
            <div className={cardBase}>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5" style={{ color: "#EAF0F4" }} />
                <span className="text-xs font-bold tracking-[0.16em] uppercase text-[#b9c6d1]">Ventas de la semana</span>
              </div>
              <span className="text-[34px] md:text-[42px] font-black leading-tight">{fmt(d.salesWeek)}</span>
            </div>
            <div className={cardBase}>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5" style={{ color: "#EAF0F4" }} />
                <span className="text-xs font-bold tracking-[0.16em] uppercase text-[#b9c6d1]">Ventas del mes</span>
              </div>
              <span className="text-[34px] md:text-[42px] font-black leading-tight">{fmt(d.salesMonth)}</span>
            </div>
          </div>
          <div className={grid3}>
            <Link to="/creditos" className={cardBase}>
              <CreditCard className="w-5 h-5" style={{ color: "#c084fc" }} />
              <span className={big}>{fmt(d.totalReceivables)}</span>
              <span className={lb}>Cuentas por cobrar</span>
            </Link>
            <Link to="/gastos" className={cardBase}>
              <TrendingDown className="w-5 h-5" style={{ color: "#f87171" }} />
              <span className={big}>{fmt(d.totalExpenses)}</span>
              <span className={lb}>Gastos totales</span>
            </Link>
            <div className={cardHL}>
              <DollarSign className="w-5 h-5" />
              <span className={big}>{fmt(d.estimatedProfit)}</span>
              <span className="text-xs font-bold tracking-[0.16em] uppercase">Utilidad estimada</span>
            </div>
          </div>
        </AreaPanel>
      </div>
    </div>);

}
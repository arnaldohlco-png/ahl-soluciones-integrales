import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { momentBogota } from "@/lib/localDate";
import { useAuth } from "@/lib/AuthContext";
import CloseShiftDialog from "@/components/shift/CloseShiftDialog";
import EditorialDashboard from "@/components/dashboard/EditorialDashboard";
import RestoreBackupDialog from "@/components/RestoreBackupDialog";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState({});
  const [company, setCompany] = useState(null);
  const { user } = useAuth();
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const canClose = ["admin", "administrador", "gerente"].includes(user?.role);

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

        const COBRABLES = ["Factura de venta", "Factura de taller", "Recibo de pago", "Comprobante de abono"];
        const paidInvoices = invoices.filter((i) => i.status === "Pagada" && COBRABLES.includes(i.type) && !i.related_sale_id);
        const sumFrom = (start) =>
        sales.filter((s) => (s.date || "") >= start).reduce((s, x) => s + (x.total || 0), 0) +
        paidInvoices.filter((i) => (i.date || "") >= start).reduce((s, x) => s + (x.total || 0), 0);
        const salesToday = sumFrom(today);
        const salesWeek = sumFrom(startWeek);
        const salesMonth = sumFrom(startMonth);

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

  return (
    <>
      <EditorialDashboard
        d={d}
        company={company}
        fmt={fmt}
        canClose={canClose}
        onCloseShift={() => setCloseShiftOpen(true)}
        onOpenMenu={openMenu}
        canRestore={user?.role === "admin"}
        onRestore={() => setRestoreOpen(true)} />
      {canClose && <CloseShiftDialog open={closeShiftOpen} onOpenChange={setCloseShiftOpen} />}
      {user?.role === "admin" && <RestoreBackupDialog open={restoreOpen} onOpenChange={setRestoreOpen} />}
    </>);

}
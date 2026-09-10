import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import moment from "moment";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;

export default function IncomeStatement() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [from, setFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(moment().format("YYYY-MM-DD"));

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sales, orders, expenses, purchases, invoices, products, technicians] = await Promise.all([
          base44.entities.Sale.list("-created_date", 5000),
          base44.entities.ServiceOrder.list("-created_date", 5000),
          base44.entities.Expense.list("-created_date", 5000),
          base44.entities.Purchase.list("-created_date", 5000),
          base44.entities.Invoice.list("-created_date", 5000),
          base44.entities.Product.list("-created_date", 5000),
          base44.entities.Technician.list("-created_date", 5000),
        ]);
        setData({ sales, orders, expenses, purchases, invoices, products, technicians });
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  if (loading || !data) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  const inRange = (date) => (!from || !to) || ((date || "") >= from && (date || "") <= to);

  const fSales = data.sales.filter((s) => inRange(s.date));
  const fOrders = data.orders.filter((o) => inRange(o.entry_date || o.created_date?.slice(0, 10)));
  const fExpenses = data.expenses.filter((e) => inRange(e.date));
  const fPurchases = data.purchases.filter((p) => inRange(p.date));
  const fInvoices = (data.invoices || []).filter((i) => inRange(i.date));

  const productsById = {};
  (data.products || []).forEach((p) => { productsById[p.id] = p; });
  const techniciansById = {};
  (data.technicians || []).forEach((t) => { techniciansById[t.id] = t; });
  const ordersById = {};
  data.orders.forEach((o) => { ordersById[o.id] = o; });

  const itemsOf = (str) => { try { const p = JSON.parse(str || "[]"); return Array.isArray(p) ? p : []; } catch { return []; } };
  // Costo de productos: se toma del catálogo (los items no guardan el costo)
  const productCogsOf = (items) => items
    .filter((it) => it.product_id)
    .reduce((s, it) => s + ((productsById[it.product_id]?.cost) || 0) * (it.quantity || 0), 0);
  // Comisión de servicios: % del técnico responsable sobre el subtotal de ítems de servicio
  const serviceCommissionOf = (items, technicianId) => {
    if (!technicianId) return 0;
    const tech = techniciansById[technicianId];
    if (!tech || !tech.commission_percentage) return 0;
    const serviceSub = items
      .filter((it) => (it.type || "Servicio") === "Servicio")
      .reduce((s, it) => s + (it.subtotal || 0), 0);
    return Math.round(serviceSub * (tech.commission_percentage / 100));
  };

  // Facturas cobradas en Facturación (no provenientes del POS)
  const COBRABLES = ["Factura de venta", "Factura de taller", "Recibo de pago", "Comprobante de abono"];
  const invoiceSales = fInvoices.filter(
    (i) => i.status === "Pagada" && COBRABLES.includes(i.type) && !i.related_sale_id
  );
  const orderIdsWithPaidInvoice = new Set(invoiceSales.map((i) => i.related_order_id).filter(Boolean));
  // Órdenes ya convertidas en venta POS: se contabilizan como ingreso POS, no como taller (evita duplicidad)
  const orderIdsWithSale = new Set(fSales.filter((s) => s.status === "Pagada" && s.related_order_id).map((s) => s.related_order_id));
  const invoiceRevenue = invoiceSales.reduce((s, i) => s + (i.total || 0), 0);
  const invoiceCOGS = invoiceSales.reduce((s, i) => s + productCogsOf(itemsOf(i.items)), 0);
  const invoiceCommissions = invoiceSales.reduce((s, i) => {
    const techId = i.related_order_id ? (ordersById[i.related_order_id]?.technician_id) : null;
    return s + serviceCommissionOf(itemsOf(i.items), techId);
  }, 0);

  const posRevenue = fSales.filter((s) => s.status === "Pagada").reduce((s, x) => s + (x.total || 0), 0);
  const posCOGS = fSales.filter((s) => s.status === "Pagada").reduce((s, x) => s + productCogsOf(itemsOf(x.items)), 0);

  // Órdenes contabilizadas como ingreso de taller (excluye las que ya se facturaron y cobraron)
  const countedOrders = fOrders.filter((o) => ["Completado", "Entregado", "Cobrada"].includes(o.status) && !orderIdsWithPaidInvoice.has(o.id) && !orderIdsWithSale.has(o.id));

  const workshopRevenue = countedOrders.reduce((s, o) => s + (o.cost || 0), 0);
  const workshopParts = countedOrders.reduce((s, o) => s + productCogsOf(itemsOf(o.service_items)), 0);
  const workshopLabor = countedOrders.reduce((s, o) => s + (o.labor_cost || 0), 0);
  const workshopLubricants = countedOrders.reduce((s, o) => s + (o.lubricants_cost || 0), 0);
  const workshopCommissions = countedOrders.reduce((s, o) => s + serviceCommissionOf(itemsOf(o.service_items), o.technician_id), 0);

  const purchaseCosts = fPurchases.filter((p) => p.status === "Pagada").reduce((s, p) => s + (p.subtotal || 0), 0);
  const operatingExpenses = fExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const salesCOGS = posCOGS + invoiceCOGS;
  const totalRevenue = posRevenue + invoiceRevenue + workshopRevenue;
  const totalCOGS = salesCOGS + workshopParts + workshopLubricants + purchaseCosts;
  const grossProfit = totalRevenue - totalCOGS;
  const operatingCosts = operatingExpenses + workshopLabor + workshopCommissions + invoiceCommissions;
  const netProfit = grossProfit - operatingCosts;

  const Row = ({ label, value, bold, indent, color }) => (
    <div className={`flex justify-between py-2 ${indent ? "pl-6" : ""} ${bold ? "border-t border-slate-200 font-bold" : ""}`}>
      <span className={`text-sm ${bold ? "text-slate-900" : "text-slate-600"}`}>{label}</span>
      <span className={`text-sm font-semibold ${color || (bold ? "text-slate-900" : "text-slate-700")}`}>{value < 0 ? `(${fmt(Math.abs(value))})` : fmt(value)}</span>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Estado de Resultados</h1>
          <p className="text-slate-500 mt-0.5">Ingresos, costos y utilidad del período</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 bg-white rounded-xl border border-slate-200 p-4">
        <div>
          <Label>Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white">
          <TrendingUp className="w-7 h-7 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{fmt(totalRevenue)}</p>
          <p className="text-sm text-emerald-100">Ingresos totales</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white">
          <TrendingDown className="w-7 h-7 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{fmt(totalCOGS + operatingCosts)}</p>
          <p className="text-sm text-red-100">Costos y gastos</p>
        </div>
        <div className={`bg-gradient-to-br ${netProfit >= 0 ? "from-amber-500 to-amber-600" : "from-red-700 to-red-800"} rounded-2xl p-5 text-white`}>
          <DollarSign className="w-7 h-7 mb-2 opacity-80" />
          <p className="text-2xl font-bold">{fmt(netProfit)}</p>
          <p className="text-sm opacity-90">{netProfit >= 0 ? "Utilidad neta" : "Pérdida neta"}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Detalle del período</h3>

        <Row label="Ventas POS (almacén)" value={posRevenue} bold />
        <Row label="Facturas cobradas (Facturación)" value={invoiceRevenue} bold />
        <Row label="Ingresos de taller (Completadas/Entregadas/Cobradas)" value={workshopRevenue} bold />
        <Row label="Total Ingresos" value={totalRevenue} bold color="text-emerald-600" />

        <div className="my-3" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Costo de ventas</p>
        <Row label="Costo productos vendidos" value={salesCOGS} indent />
        <Row label="Repuestos utilizados en taller" value={workshopParts} indent />
        <Row label="Lubricantes utilizados en taller" value={workshopLubricants} indent />
        <Row label="Compras de inventario" value={purchaseCosts} indent />
        <Row label="Total Costo de Ventas" value={totalCOGS} bold color="text-red-600" />

        <div className="my-3" />
        <Row label="Utilidad Bruta" value={grossProfit} bold color={grossProfit >= 0 ? "text-emerald-600" : "text-red-600"} />

        <div className="my-3" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Gastos operacionales</p>
        <Row label="Mano de obra taller" value={workshopLabor} indent />
        <Row label="Comisiones de servicios" value={workshopCommissions + invoiceCommissions} indent />
        <Row label="Gastos generales" value={operatingExpenses} indent />
        <Row label="Total Gastos Operacionales" value={operatingCosts} bold color="text-red-600" />

        <div className="my-3" />
        <Row label="Utilidad / (Pérdida) Neta" value={netProfit} bold color={netProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>
    </div>
  );
}
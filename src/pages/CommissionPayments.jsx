import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2, CheckCircle2, Clock, Printer, Search } from "lucide-react";
import moment from "moment";
import WhatsAppButton from "@/components/WhatsAppButton";
import PrintableDocument from "@/components/PrintableDocument";
import { buildDocMessage } from "@/lib/docMessages";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function CommissionPayments() {
  const [techs, setTechs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTech, setSelectedTech] = useState("");
  const [from, setFrom] = useState(moment().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(moment().format("YYYY-MM-DD"));
  const [calc, setCalc] = useState(null);
  const [paying, setPaying] = useState(false);
  const [motos, setMotos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [printPay, setPrintPay] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [t, p, m, c] = await Promise.all([
          base44.entities.Technician.list("-created_date", 200),
          base44.entities.CommissionPayment.list("-created_date", 200),
          base44.entities.Motorcycle.list("-created_date", 500),
          base44.entities.Customer.list("-created_date", 500),
        ]);
        setTechs(t.filter((x) => x.status === "Activo"));
        setPayments(p);
        setMotos(m);
        setCustomers(c);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const techPhone = (id) => techs.find((t) => t.id === id)?.phone || "";

  // Base de comisión: solo servicios (type "service"), excluyendo los denominados "terceros"
  const commissionBase = (o) => {
    let items = [];
    try { items = JSON.parse(o.service_items || "[]"); } catch { items = []; }
    return items
      .filter((i) => i.type === "service")
      .filter((i) => !/tercero/i.test((i.name || "").trim()))
      .reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  };

  const printPayment = async (p) => {
    try {
      const orders = await base44.entities.ServiceOrder.filter({ technician_id: p.technician_id }, "-created_date", 500);
      const inRange = orders.filter((o) => {
        const d = o.entry_date || (o.created_date || "").slice(0, 10);
        return d >= p.period_start && d <= p.period_end && (o.status === "Completado" || o.status === "Entregado");
      });
      setPrintPay({ doc: p, orders: inRange });
    } catch (e) { console.error(e); alert("Error al cargar detalle"); }
  };

  const calculate = async () => {
    if (!selectedTech) return;
    setPaying(true);
    try {
      const [orders, loans] = await Promise.all([
        base44.entities.ServiceOrder.filter({ technician_id: selectedTech }, "-created_date", 500),
        base44.entities.TechnicianLoan.filter({ technician_id: selectedTech, status: "Pendiente" }, "-created_date", 100),
      ]);

      const inRange = orders.filter((o) => {
        const d = o.entry_date || (o.created_date || "").slice(0, 10);
        return d >= from && d <= to && (o.status === "Completado" || o.status === "Entregado");
      });

      const pct = techs.find((t) => t.id === selectedTech)?.commission_percentage || 0;
      const totalCommission = inRange.reduce((s, o) => {
        const base = commissionBase(o);
        if (base > 0) return s + (base * pct / 100);
        if (o.technician_commission) return s + o.technician_commission;
        return s;
      }, 0);

      const pendingLoans = loans.filter((l) => (l.balance || 0) > 0);
      const loansDeducted = pendingLoans.reduce((s, l) => s + (l.balance || 0), 0);
      const netAmount = totalCommission - loansDeducted;

      setCalc({
        techId: selectedTech, techName: techs.find((t) => t.id === selectedTech)?.name || "",
        orders: inRange, totalCommission, loans: pendingLoans, loansDeducted, netAmount,
      });
    } catch (e) { console.error(e); alert("Error al calcular"); }
    setPaying(false);
  };

  const payCommission = async () => {
    if (!calc) return;
    setPaying(true);
    try {
      await base44.entities.CommissionPayment.create({
        technician_id: calc.techId, technician_name: calc.techName,
        date: moment().format("YYYY-MM-DD"), period_start: from, period_end: to,
        orders_count: calc.orders.length, total_commission: calc.totalCommission,
        loans_deducted: calc.loansDeducted, net_amount: calc.netAmount,
        status: "Pagado",
      });

      // Mark loans as deducted
      for (const l of calc.loans) {
        await base44.entities.TechnicianLoan.update(l.id, {
          deducted_amount: l.amount, balance: 0, status: "Descontado",
        });
      }

      // Reload payments
      const p = await base44.entities.CommissionPayment.list("-created_date", 200);
      setPayments(p);
      setCalc(null);
      alert("Comisión pagada y préstamos descontados");
    } catch (e) { console.error(e); alert("Error al pagar"); }
    setPaying(false);
  };

  const filteredPayments = payments.filter((p) =>
    !search ||
    (p.technician_name || "").toLowerCase().includes(search.toLowerCase()) ||
    moment(p.date).format("DD/MM/YYYY").includes(search)
  );

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Pago de Comisiones</h1>
          <p className="text-slate-500 mt-0.5">Calcula y paga comisiones, descuenta préstamos automáticamente</p>
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Técnico</Label>
            <Select value={selectedTech} onValueChange={setSelectedTech}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
          </div>
          <Button onClick={calculate} disabled={!selectedTech || paying} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Calcular
          </Button>
        </div>
      </div>

      {/* Calculation result */}
      {calc && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">{calc.techName} — {from} a {to}</h3>
            <Button onClick={payCommission} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Pagar y descontar
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Órdenes completadas: <strong className="text-slate-900">{calc.orders.length}</strong></span>
              <span className="font-semibold text-slate-900">{fmt(calc.totalCommission)}</span>
            </div>
            {calc.loans.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 mb-2">Préstamos a descontar ({calc.loans.length})</p>
                {calc.loans.map((l) => (
                  <div key={l.id} className="flex justify-between text-sm py-1">
                    <span className="text-slate-600">{l.description || "Préstamo"} — {moment(l.date).format("DD/MM")}</span>
                    <span className="font-medium text-amber-700">-{fmt(l.balance)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1 border-t border-amber-200">
                  <span className="text-sm font-semibold text-amber-700">Total descuentos</span>
                  <span className="font-bold text-amber-700">-{fmt(calc.loansDeducted)}</span>
                </div>
              </div>
            )}
            <div className="flex justify-between py-3 border-t-2 border-slate-200">
              <span className="text-lg font-bold text-slate-900">Neto a pagar</span>
              <span className="text-xl font-bold text-emerald-600">{fmt(calc.netAmount)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment history */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold text-slate-900">Historial de pagos</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar por técnico o fecha..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No hay pagos registrados</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Técnico</th>
                  <th className="px-4 py-3 text-center font-medium">Órdenes</th>
                  <th className="px-4 py-3 text-right font-medium">Comisiones</th>
                  <th className="px-4 py-3 text-right font-medium">Descuentos</th>
                  <th className="px-4 py-3 text-right font-medium">Neto</th>
                  <th className="px-4 py-3 text-center font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-600">{moment(p.date).format("DD/MM/YYYY")}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.technician_name}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{p.orders_count}</td>
                    <td className="px-4 py-3 text-right">{fmt(p.total_commission)}</td>
                    <td className="px-4 py-3 text-right text-red-500">-{fmt(p.loans_deducted)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(p.net_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700">{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <WhatsAppButton phone={techPhone(p.technician_id)} message={buildDocMessage("commission", p, null, { technician: techs.find((t) => t.id === p.technician_id), motos, customers, orders: [] })} />
                        <button onClick={() => printPayment(p)} title="Imprimir detalle" className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"><Printer className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {printPay && (
        <PrintableDocument
          type="commission"
          doc={printPay.doc}
          company={null}
          extras={{ technician: techs.find((t) => t.id === printPay.doc.technician_id), motos, customers, orders: printPay.orders }}
          onClose={() => setPrintPay(null)}
        />
      )}
    </div>
  );
}
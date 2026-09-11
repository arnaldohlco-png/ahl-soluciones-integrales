import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { fetchAllCustomers } from "@/lib/customersLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Loader2, CheckCircle2, Clock, Printer, Search, Hourglass, BadgeDollarSign } from "lucide-react";
import moment from "moment";
import WhatsAppButton from "@/components/WhatsAppButton";
import SignaturePad from "@/components/SignaturePad";
import PrintableDocument from "@/components/PrintableDocument";
import { buildDocMessage } from "@/lib/docMessages";
import { matchAny } from "@/lib/search";
import SearchableSelect from "@/components/SearchableSelect";
import { useConfirm } from "@/components/ConfirmProvider";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function CommissionPayments() {
  const confirm = useConfirm();
  const [techs, setTechs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
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
  const [company, setCompany] = useState(null);
  const [techSig, setTechSig] = useState("");
  const [adminSig, setAdminSig] = useState("");
  const [tab, setTab] = useState("pendientes");

  useEffect(() => {
    (async () => {
      try {
        const [t, p, o, m, c, comp] = await Promise.all([
          fetchAll("Technician"),
          fetchAll("CommissionPayment"),
          fetchAll("ServiceOrder"),
          fetchAll("Motorcycle"),
          fetchAllCustomers(),
          base44.entities.Company.list("-created_date", 10),
        ]);
        setTechs(t.filter((x) => x.status === "Activo"));
        setPayments(p);
        setOrders(o);
        setMotos(m);
        setCustomers(c);
        if (comp.length > 0) setCompany(comp[0]);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const techPhone = (id) => techs.find((t) => t.id === id)?.phone || "";
  const techName = (id) => techs.find((t) => t.id === id)?.name || "—";
  const techPct = (id) => techs.find((t) => t.id === id)?.commission_percentage || 0;

  // Base de comisión: solo servicios (type "Servicio"), excluyendo los denominados "terceros"
  const commissionBase = (o) => {
    let items = [];
    try { items = JSON.parse(o.service_items || "[]"); } catch { items = []; }
    return items
      .filter((i) => String(i.type || "").toLowerCase() === "servicio")
      .filter((i) => !/tercero/i.test((i.name || "").trim()))
      .reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
  };

  const inPeriod = (dStr) => {
    const d = (dStr || "").slice(0, 10);
    return d >= from && d <= to;
  };

  // Órdenes pendientes de pago de comisión en el período seleccionado
  const pendingOrders = orders.filter((o) => {
    const d = o.entry_date || (o.created_date || "").slice(0, 10);
    return d >= from && d <= to && (o.status === "Entregado" || o.status === "Cobrada") && commissionBase(o) > 0 && !o.commission_paid;
  });

  // Agrupar pendientes por técnico
  const pendingByTech = {};
  pendingOrders.forEach((o) => {
    const tid = o.technician_id || "_sin";
    if (!pendingByTech[tid]) pendingByTech[tid] = { techId: tid, orders: [], totalBase: 0, totalCommission: 0 };
    const base = commissionBase(o);
    const pct = techPct(tid);
    pendingByTech[tid].orders.push({ ...o, base, commission: base * pct / 100 });
    pendingByTech[tid].totalBase += base;
    pendingByTech[tid].totalCommission += base * pct / 100;
  });
  const pendingGroups = Object.values(pendingByTech);

  const printPayment = async (p) => {
    try {
      const ords = await base44.entities.ServiceOrder.filter({ technician_id: p.technician_id }, "-created_date", 500);
      const inRange = ords.filter((o) => {
        const d = o.entry_date || (o.created_date || "").slice(0, 10);
        return d >= p.period_start && d <= p.period_end && (o.status === "Entregado" || o.status === "Cobrada");
      });
      setPrintPay({ doc: p, orders: inRange });
    } catch (e) { console.error(e); alert("Error al cargar detalle"); }
  };

  const calculate = async (techIdArg) => {
    const techId = techIdArg || selectedTech;
    if (!techId) return;
    setPaying(true);
    setTechSig(""); setAdminSig("");
    setSelectedTech(techId);
    try {
      const [ords, loans] = await Promise.all([
        base44.entities.ServiceOrder.filter({ technician_id: techId }, "-created_date", 500),
        base44.entities.TechnicianLoan.filter({ technician_id: techId, status: "Pendiente" }, "-created_date", 100),
      ]);

      const inRange = ords.filter((o) => {
        const d = o.entry_date || (o.created_date || "").slice(0, 10);
        return d >= from && d <= to && (o.status === "Entregado" || o.status === "Cobrada") && !o.commission_paid && commissionBase(o) > 0;
      });

      const pct = techPct(techId);
      const breakdown = inRange.map((o) => {
        const base = commissionBase(o);
        return {
          id: o.id, number: o.number || "—",
          date: o.entry_date || (o.created_date || "").slice(0, 10),
          service_type: o.service_type, status: o.status,
          base, commission: base * pct / 100,
        };
      });
      const totalCommission = breakdown.reduce((s, b) => s + b.commission, 0);

      const pendingLoans = loans.filter((l) => (l.balance || 0) > 0);
      const loansDeducted = pendingLoans.reduce((s, l) => s + (l.balance || 0), 0);
      const netAmount = totalCommission - loansDeducted;

      setCalc({
        techId, techName: techName(techId),
        orders: inRange, breakdown, totalCommission, loans: pendingLoans, loansDeducted, netAmount,
      });
      setTab("pendientes");
    } catch (e) { console.error(e); alert("Error al calcular"); }
    setPaying(false);
  };

  const payCommission = async () => {
    if (!calc) return;
    if (!(await confirm({ title: "¿Confirmar el pago de comisiones?", description: `Neto a pagar: ${fmt(calc.netAmount)}`, confirmText: "Sí, pagar", cancelText: "No" }))) return;
    setPaying(true);
    try {
      const payment = await base44.entities.CommissionPayment.create({
        technician_id: calc.techId, technician_name: calc.techName,
        date: moment().format("YYYY-MM-DD"), period_start: from, period_end: to,
        orders_count: calc.orders.length, total_commission: calc.totalCommission,
        loans_deducted: calc.loansDeducted, net_amount: calc.netAmount,
        status: "Pagado",
        technician_signature: techSig, admin_signature: adminSig,
      });

      // Registrar salida de caja por el pago de comisiones al técnico
      if ((calc.netAmount || 0) > 0) {
        await base44.entities.CashMovement.create({
          date: new Date().toISOString(),
          type: "Salida",
          category: "Pago",
          amount: calc.netAmount,
          description: `Pago de comisiones - ${calc.techName} (${calc.orders.map((o) => o.number || "—").join(", ")})`,
          payment_method: "Efectivo",
          register_type: "Caja principal",
          reference_id: payment.id,
        });
      }

      // Mark orders as commission paid
      for (const o of calc.orders) {
        await base44.entities.ServiceOrder.update(o.id, { commission_paid: true });
      }

      // Mark loans as deducted
      for (const l of calc.loans) {
        await base44.entities.TechnicianLoan.update(l.id, {
          deducted_amount: l.amount, balance: 0, status: "Descontado",
        });
      }

      // Reload
      const [p, o] = await Promise.all([
        base44.entities.CommissionPayment.list("-created_date", 200),
        fetchAll("ServiceOrder"),
      ]);
      setPayments(p);
      setOrders(o);
      setCalc(null);
      alert("Comisión pagada y préstamos descontados");
    } catch (e) { console.error(e); alert("Error al pagar"); }
    setPaying(false);
  };

  // Pagadas filtradas por período (fecha de pago) y búsqueda
  const filteredPayments = payments.filter((p) => {
    const inRange = inPeriod(p.date);
    return inRange && matchAny(search, p.technician_name, moment(p.date).format("DD/MM/YYYY"));
  });
  const totalPaid = filteredPayments.reduce((s, p) => s + (p.net_amount || 0), 0);
  const totalPending = pendingGroups.reduce((s, g) => s + g.totalCommission, 0);

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
          <p className="text-slate-500 mt-0.5">Comisiones pendientes y pagadas por período</p>
        </div>
      </div>

      {/* Selector de período */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Período desde</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Período hasta</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFrom(moment().startOf("month").format("YYYY-MM-DD")); setTo(moment().format("YYYY-MM-DD")); }} className="flex-1">Mes actual</Button>
            <Button variant="outline" onClick={() => { setFrom(moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD")); setTo(moment().subtract(1, "month").endOf("month").format("YYYY-MM-DD")); }} className="flex-1">Mes anterior</Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab("pendientes")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "pendientes" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
          <Hourglass className="w-4 h-4" /> Pendientes por pagar
          {pendingOrders.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-amber-500 text-white">{pendingOrders.length}</span>}
        </button>
        <button onClick={() => setTab("pagadas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "pagadas" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
          <BadgeDollarSign className="w-4 h-4" /> Pagadas a técnicos
        </button>
      </div>

      {/* PENDIENTES POR PAGAR */}
      {tab === "pendientes" && (
        <div className="space-y-4">
          {/* Calculadora (pago de un técnico) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <SearchableSelect
                label="Técnico a pagar"
                placeholder="Buscar técnico..."
                value={selectedTech}
                onValueChange={setSelectedTech}
                items={techs.map((t) => ({ id: t.id, label: t.name, sublabel: t.specialty || t.document_number }))}
              />
              <div className="md:col-span-2">
                <Button onClick={() => calculate()} disabled={!selectedTech || paying} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900">
                  {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Wallet className="w-4 h-4 mr-1" />}
                  Calcular comisión del técnico
                </Button>
              </div>
            </div>
          </div>

          {/* Resumen pendiente */}
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-slate-900">Órdenes con comisión pendiente ({pendingOrders.length})</h3>
            <span className="text-sm text-slate-500">Total comisiones pendientes: <strong className="text-amber-600">{fmt(totalPending)}</strong></span>
          </div>

          {pendingGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No hay comisiones pendientes en este período</p>
            </div>
          ) : (
            pendingGroups.map((g) => (
              <div key={g.techId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-900">{techName(g.techId)}</p>
                    <p className="text-xs text-slate-500">{g.orders.length} órdenes · base {fmt(g.totalBase)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-amber-600">{fmt(g.totalCommission)}</span>
                    <Button size="sm" onClick={() => calculate(g.techId)} disabled={paying} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                      <Wallet className="w-3.5 h-3.5 mr-1" /> Pagar
                    </Button>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Orden</th>
                      <th className="px-4 py-2 text-left font-medium">Fecha</th>
                      <th className="px-4 py-2 text-left font-medium">Servicio</th>
                      <th className="px-4 py-2 text-left font-medium">Estado</th>
                      <th className="px-4 py-2 text-right font-medium">Base</th>
                      <th className="px-4 py-2 text-right font-medium">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.orders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-700">{o.number || "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{o.entry_date ? moment(o.entry_date).format("DD/MM/YYYY") : "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{o.service_type}</td>
                        <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{o.status}</span></td>
                        <td className="px-4 py-2 text-right text-slate-600">{fmt(o.base)}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-900">{fmt(o.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}

      {/* PAGADAS A TÉCNICOS */}
      {tab === "pagadas" && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-slate-900">Historial de pagos</h3>
              <span className="text-sm text-slate-500">Total: <strong className="text-emerald-600">{fmt(totalPaid)}</strong></span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar por técnico o fecha..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No hay pagos en este período</p>
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
      )}

      {/* Resultado del cálculo (pago) */}
      {calc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setCalc(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">{calc.techName} — {from} a {to}</h3>
              <button onClick={() => setCalc(null)} className="text-slate-400 hover:text-slate-900 text-xl leading-none">×</button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Órdenes a pagar: <strong className="text-slate-900">{calc.orders.length}</strong></span>
                <span className="font-semibold text-slate-900">{fmt(calc.totalCommission)}</span>
              </div>

              {calc.breakdown && calc.breakdown.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Orden</th>
                        <th className="px-3 py-2 text-left font-medium">Fecha</th>
                        <th className="px-3 py-2 text-left font-medium">Servicio</th>
                        <th className="px-3 py-2 text-left font-medium">Estado</th>
                        <th className="px-3 py-2 text-right font-medium">Base servicios</th>
                        <th className="px-3 py-2 text-right font-medium">Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.breakdown.map((b) => (
                        <tr key={b.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{b.number}</td>
                          <td className="px-3 py-2 text-slate-600">{b.date ? moment(b.date).format("DD/MM/YYYY") : "—"}</td>
                          <td className="px-3 py-2 text-slate-600">{b.service_type}</td>
                          <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">{b.status}</span></td>
                          <td className="px-3 py-2 text-right text-slate-600">{fmt(b.base)}</td>
                          <td className="px-3 py-2 text-right font-medium text-slate-900">{fmt(b.commission)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <SignaturePad label="Firma del técnico (recibido)" value={techSig} onChange={setTechSig} height={110} />
                <SignaturePad label="Firma del administrador (autoriza)" value={adminSig} onChange={setAdminSig} height={110} />
              </div>
              <div className="flex justify-between py-3 border-t-2 border-slate-200">
                <span className="text-lg font-bold text-slate-900">Neto a pagar</span>
                <span className="text-xl font-bold text-emerald-600">{fmt(calc.netAmount)}</span>
              </div>
              <Button onClick={payCommission} disabled={paying} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {paying ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                Confirmar pago y descontar
              </Button>
            </div>
          </div>
        </div>
      )}

      {printPay && (
        <PrintableDocument
          type="commission"
          doc={printPay.doc}
          company={company}
          extras={{ technician: techs.find((t) => t.id === printPay.doc.technician_id), motos, customers, orders: printPay.orders }}
          onClose={() => setPrintPay(null)}
        />
      )}
    </div>
  );
}
// Créditos y Cartera
import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { fetchAllCustomers } from "@/lib/customersLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Search, DollarSign, CheckCircle } from "lucide-react";
import WhatsAppButton from "@/components/WhatsAppButton";
import moment from "moment";
import { matchAny } from "@/lib/search";
import { useConfirm } from "@/components/ConfirmProvider";

export default function Credits() {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [payModal, setPayModal] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [data, cust] = await Promise.all([
        fetchAll("AccountReceivable"),
        fetchAllCustomers(),
      ]);
      setList(data); setCustomers(cust);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const daysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const diff = moment().diff(moment(dueDate), "days");
    return diff > 0 ? diff : 0;
  };

  const computeStatus = (r) => {
    if ((r.balance || 0) <= 0) return "Pagada";
    const days = daysOverdue(r.due_date);
    if (days > 0) return "En mora";
    return "Al día";
  };

  const filtered = useMemo(() => list.filter(r => {
    const matchSearch = matchAny(search, r.customer_name, r.invoice_number);
    const st = computeStatus(r);
    const matchStatus = filterStatus === "all" || st === filterStatus;
    return matchSearch && matchStatus;
  }), [list, search, filterStatus]);

  const customerPhone = (id) => { const c = customers.find((x) => x.id === id); return c?.whatsapp || c?.phone || ""; };
  const buildReminderMsg = (r) => `Hola ${r.customer_name}, te recordamos que tienes un saldo pendiente de $${(r.balance || 0).toLocaleString("es-CO")}.${r.invoice_number ? " Factura: " + r.invoice_number + "." : ""}${r.due_date ? " Vencimiento: " + moment(r.due_date).format("DD/MM/YYYY") + "." : ""} Saludos, HR MOTOCICLETAS`;

  const totalBalance = filtered.reduce((s, r) => s + (r.balance || 0), 0);
  const totalOverdue = filtered.filter(r => computeStatus(r) === "En mora").reduce((s, r) => s + (r.balance || 0), 0);

  const openPay = (r) => {
    setPayModal(r);
    setPayAmount(r.balance || 0);
    setPayMethod("Efectivo");
  };

  const registerPayment = async () => {
    if (!payAmount || payAmount <= 0) return;
    if (!(await confirm({ title: "¿Registrar este abono?", description: `Monto: $${payAmount.toLocaleString("es-CO")} · ${payMethod}`, confirmText: "Sí, registrar", cancelText: "No" }))) return;
    setSaving(true);
    try {
      const payments = JSON.parse(payModal.payments || "[]");
      payments.push({ date: new Date().toISOString(), amount: payAmount, method: payMethod });
      const newBalance = Math.max(0, (payModal.balance || 0) - payAmount);
      const fullyPaid = newBalance <= 0;
      await base44.entities.AccountReceivable.update(payModal.id, {
        payments: JSON.stringify(payments),
        balance: newBalance,
        status: fullyPaid ? "Pagada" : "Al día",
      });

      // Al pagar totalmente, marcar la factura relacionada como Pagada
      if (fullyPaid && payModal.invoice_id) {
        try {
          const inv = await base44.entities.Invoice.get(payModal.invoice_id);
          if (inv && inv.status !== "Pagada") {
            await base44.entities.Invoice.update(payModal.invoice_id, {
              status: "Pagada",
              amount_paid: inv.total || 0,
            });
          }
        } catch (e) { console.error(e); }
      }

      // Actualizar saldo del cliente
      if (payModal.customer_id) {
        try {
          const c = await base44.entities.Customer.get(payModal.customer_id);
          if (c) await base44.entities.Customer.update(payModal.customer_id, { balance: Math.max(0, (c.balance || 0) - payAmount) });
        } catch (e) { console.error(e); }
      }

      await base44.entities.CashMovement.create({
        date: new Date().toISOString(),
        type: "Entrada",
        category: "Abono",
        amount: payAmount,
        description: `Abono - ${payModal.customer_name}`,
        payment_method: payMethod,
        register_type: "Caja principal",
        reference_id: payModal.id,
      });

      setPayModal(null);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors = {
    "Al día": "bg-emerald-100 text-emerald-700",
    "En mora": "bg-red-100 text-red-700",
    "Pagada": "bg-slate-100 text-slate-500",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Créditos y Cartera</h1>
        <p className="text-slate-500 mt-1">
          Saldo total: <span className="font-semibold text-purple-600">${totalBalance.toLocaleString("es-CO")}</span>
          {totalOverdue > 0 && <> · En mora: <span className="font-semibold text-red-600">${totalOverdue.toLocaleString("es-CO")}</span></>}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por cliente o factura..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Al día">Al día</SelectItem>
            <SelectItem value="En mora">En mora</SelectItem>
            <SelectItem value="Pagada">Pagada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay créditos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Factura</th>
                  <th className="px-4 py-3 font-medium text-right">Valor inicial</th>
                  <th className="px-4 py-3 font-medium text-right">Saldo</th>
                  <th className="px-4 py-3 font-medium">Vencimiento</th>
                  <th className="px-4 py-3 font-medium">Días mora</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const st = computeStatus(r);
                  const days = daysOverdue(r.due_date);
                  return (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.customer_name}</td>
                      <td className="px-4 py-3 text-slate-600">{r.invoice_number || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">${(r.initial_amount || 0).toLocaleString("es-CO")}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">${(r.balance || 0).toLocaleString("es-CO")}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.due_date ? moment(r.due_date).format("DD/MM/YYYY") : "—"}</td>
                      <td className="px-4 py-3 text-center">{days > 0 ? <span className="text-red-600 font-medium">{days}</span> : "—"}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[st]}`}>{st}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {r.balance > 0 && (
                            <>
                              <WhatsAppButton phone={customerPhone(r.customer_id)} message={buildReminderMsg(r)} label="Recordar por WhatsApp" />
                              <Button size="sm" variant="outline" onClick={() => openPay(r)} className="h-7 text-xs">Registrar abono</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!payModal} onOpenChange={(v) => !v && setPayModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar abono - {payModal?.customer_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between mb-1"><span className="text-slate-500">Saldo actual</span><span className="font-semibold text-slate-800">${(payModal?.balance || 0).toLocaleString("es-CO")}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Vencimiento</span><span className="text-slate-700">{payModal?.due_date ? moment(payModal.due_date).format("DD/MM/YYYY") : "—"}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto del abono *</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Medio de pago</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-700">Nuevo saldo: <strong>${Math.max(0, (payModal?.balance || 0) - payAmount).toLocaleString("es-CO")}</strong></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal(null)}>Cancelar</Button>
            <Button onClick={registerPayment} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Registrar abono"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
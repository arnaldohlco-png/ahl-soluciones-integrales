import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HandCoins, Plus, Pencil, Trash2, Loader2, Printer, Search } from "lucide-react";
import moment from "moment";
import WhatsAppButton from "@/components/WhatsAppButton";
import PrintableDocument from "@/components/PrintableDocument";
import { buildDocMessage } from "@/lib/docMessages";
import { matchAny } from "@/lib/search";
import SearchableSelect from "@/components/SearchableSelect";
import { useConfirm } from "@/components/ConfirmProvider";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function TechnicianLoans() {
  const confirm = useConfirm();
  const [loans, setLoans] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterTech, setFilterTech] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ technician_id: "", date: moment().format("YYYY-MM-DD"), amount: "", description: "" });
  const [printL, setPrintL] = useState(null);
  const [payLoan, setPayLoan] = useState(null);
  const [payMode, setPayMode] = useState("abono");
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState(moment().format("YYYY-MM-DD"));
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  const techPhone = (id) => techs.find((t) => t.id === id)?.phone || "";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [l, t] = await Promise.all([
        fetchAll("TechnicianLoan"),
        fetchAll("Technician"),
      ]);
      setLoans(l); setTechs(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const techName = (id) => techs.find((t) => t.id === id)?.name || "—";

  const createTechnician = async (name) => {
    const t = await base44.entities.Technician.create({ name, status: "Activo" });
    setTechs((prev) => [t, ...prev]);
    return { id: t.id, label: t.name, sublabel: [t.document_number, t.specialty].filter(Boolean).join(" · ") };
  };

  const filtered = loans.filter((l) => {
    const matchTech = filterTech === "all" || l.technician_id === filterTech;
    const matchSearch = matchAny(search, l.technician_name || techName(l.technician_id), l.description);
    return matchTech && matchSearch;
  });
  const totalPending = filtered.filter((l) => l.status === "Pendiente").reduce((s, l) => s + (l.balance || 0), 0);

  const openNew = () => {
    setEditing(null);
    setForm({ technician_id: "", date: moment().format("YYYY-MM-DD"), amount: "", description: "" });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.technician_id || !form.amount) return;
    setSaving(true);
    try {
      const amt = Number(form.amount) || 0;
      const payload = {
        ...form, amount: amt,
        technician_name: techName(form.technician_id),
        balance: amt, deducted_amount: 0, status: "Pendiente",
      };
      if (editing) {
        await base44.entities.TechnicianLoan.update(editing.id, payload);
        try {
          const linked = await base44.entities.CashMovement.filter({ reference_id: editing.id });
          if (linked.length > 0) {
            await base44.entities.CashMovement.update(linked[0].id, { amount: amt, description: `Préstamo - ${payload.technician_name}` });
          }
        } catch (e) { console.error(e); }
      } else {
        const saved = await base44.entities.TechnicianLoan.create(payload);
        // Registrar salida de caja por el préstamo entregado al técnico
        await base44.entities.CashMovement.create({
          date: new Date().toISOString(),
          type: "Salida",
          category: "Pago",
          amount: amt,
          description: `Préstamo - ${payload.technician_name}`,
          payment_method: "Efectivo",
          register_type: "Caja principal",
          reference_id: saved.id,
        });
      }
      setModalOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!(await confirm({ title: "¿Eliminar este préstamo?", confirmText: "Sí, eliminar", cancelText: "No", variant: "destructive" }))) return;
    // Revertir el movimiento de caja solo si el préstamo aún no fue descontado vía comisión
    const loan = loans.find((l) => l.id === id);
    if (loan && loan.status === "Pendiente") {
      try {
        const linked = await base44.entities.CashMovement.filter({ reference_id: id });
        await Promise.all(linked.map((m) => base44.entities.CashMovement.delete(m.id)));
      } catch (e) { console.error(e); }
    }
    await base44.entities.TechnicianLoan.delete(id);
    await load();
  };

  const openPay = (l) => {
    setPayLoan(l);
    setPayMode("abono");
    setPayAmount(0);
    setPayDate(moment().format("YYYY-MM-DD"));
    setPayMethod("Efectivo");
    setPayNote("");
  };

  const onPayModeChange = (mode) => {
    setPayMode(mode);
    setPayAmount(mode === "total" ? (payLoan?.balance || 0) : 0);
  };

  const applyPay = async () => {
    if (!payLoan) return;
    const amount = Number(payAmount) || 0;
    const balance = Number(payLoan.balance) || 0;
    if (amount <= 0) { alert("Ingresa un monto válido"); return; }
    if (amount > balance) { alert("El abono no puede exceder el saldo pendiente"); return; }
    if (!(await confirm({ title: "¿Confirmar abono?", description: `${fmt(amount)} · ${payMethod}`, confirmText: "Sí, registrar", cancelText: "No" }))) return;
    setPaySaving(true);
    try {
      const payments = (() => { try { return JSON.parse(payLoan.payments || "[]"); } catch { return []; } })();
      payments.push({ date: new Date(payDate + "T00:00:00").toISOString(), amount, method: payMethod, note: payNote });
      const newDeducted = (Number(payLoan.deducted_amount) || 0) + amount;
      const newBalance = Math.max(0, balance - amount);
      const newStatus = newBalance <= 0 ? "Descontado" : payLoan.status;
      await base44.entities.TechnicianLoan.update(payLoan.id, {
        payments: JSON.stringify(payments),
        deducted_amount: newDeducted,
        balance: newBalance,
        status: newStatus,
      });
      await base44.entities.CashMovement.create({
        date: new Date().toISOString(),
        type: "Entrada",
        category: "Abono",
        amount,
        description: `Abono préstamo - ${payLoan.technician_name || techName(payLoan.technician_id)}`,
        payment_method: payMethod,
        register_type: "Caja principal",
        reference_id: payLoan.id,
      });
      setPayLoan(null);
      await load();
    } catch (e) { console.error(e); alert("Error al registrar el abono"); }
    setPaySaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <HandCoins className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Préstamos a Técnicos</h1>
            <p className="text-slate-500 mt-0.5">{loans.length} préstamos · Saldo pendiente: {fmt(totalPending)}</p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-1" /> Nuevo Préstamo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por técnico o descripción..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterTech} onValueChange={setFilterTech}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Filtrar por técnico..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los técnicos</SelectItem>
            {techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <HandCoins className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay préstamos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-left font-medium">Técnico</th>
                <th className="px-4 py-3 text-left font-medium">Descripción</th>
                <th className="px-4 py-3 text-right font-medium">Monto</th>
                <th className="px-4 py-3 text-right font-medium">Descontado</th>
                <th className="px-4 py-3 text-right font-medium">Saldo</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{moment(l.date).format("DD/MM/YYYY")}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{l.technician_name || techName(l.technician_id)}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate" title={l.description || ""}>{l.description || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(l.amount)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{fmt(l.deducted_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(l.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${l.status === "Pendiente" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {l.status === "Pendiente" && (l.balance || 0) > 0 && (
                        <button onClick={() => openPay(l)} title="Abonar / Pagar" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"><HandCoins className="w-4 h-4" /></button>
                      )}
                      <WhatsAppButton phone={techPhone(l.technician_id)} message={buildDocMessage("loan", l, null, { technician: techs.find((t) => t.id === l.technician_id) })} />
                      <button onClick={() => setPrintL(l)} title="Imprimir" className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"><Printer className="w-4 h-4" /></button>
                      <button onClick={() => remove(l.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Dialog open={!!payLoan} onOpenChange={(o) => !o && setPayLoan(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Abonar / Pagar préstamo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Técnico</span><span className="font-medium text-slate-800">{payLoan?.technician_name || techName(payLoan?.technician_id)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Saldo pendiente</span><span className="font-semibold text-slate-900">{fmt(payLoan?.balance || 0)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onPayModeChange("abono")} className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${payMode === "abono" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>Abono parcial</button>
              <button onClick={() => onPayModeChange("total")} className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${payMode === "total" ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>Pago total</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto *</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Forma de pago</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nota (opcional)</Label>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="mt-1" />
            </div>
            <div className="flex justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
              <span className="text-emerald-700">Nuevo saldo</span>
              <span className="font-bold text-emerald-700">{fmt(Math.max(0, (payLoan?.balance || 0) - (Number(payAmount) || 0)))}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayLoan(null)}>Cancelar</Button>
            <Button onClick={applyPay} disabled={paySaving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {paySaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <HandCoins className="w-4 h-4 mr-1" />}
              {paySaving ? "Guardando..." : "Registrar abono"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Préstamo" : "Nuevo Préstamo"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <SearchableSelect
              label="Técnico"
              required
              placeholder="Buscar técnico..."
              value={form.technician_id}
              onValueChange={(v) => setForm({ ...form, technician_id: v })}
              onCreate={createTechnician}
              createLabel="Crear técnico"
              items={techs.map((t) => ({ id: t.id, label: t.name, sublabel: [t.document_number, t.specialty].filter(Boolean).join(" · ") }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Monto *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Descripción / Motivo</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" placeholder="Ej: Anticipo de salario, emergencia médica..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.technician_id || !form.amount} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printL && (
        <PrintableDocument
          type="loan"
          doc={printL}
          company={null}
          extras={{ technician: techs.find((t) => t.id === printL.technician_id) }}
          onClose={() => setPrintL(null)}
        />
      )}
    </div>
  );
}
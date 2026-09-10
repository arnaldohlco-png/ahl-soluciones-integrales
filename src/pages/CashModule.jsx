// Caja y Bancos
import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Landmark, Plus, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import moment from "moment";
import { matchAny } from "@/lib/search";

const REGISTERS = ["Caja principal", "Caja taller", "Caja almacén", "Bancos"];
const METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Otros"];
const ENTRY_CATS = ["Venta", "Abono", "Otro ingreso"];
const EXIT_CATS = ["Gasto", "Compra", "Retiro", "Pago", "Otro egreso"];

export default function Cash() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRegister, setFilterRegister] = useState("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "Entrada", category: "Otro ingreso", amount: 0, description: "",
    payment_method: "Efectivo", register_type: "Caja principal",
    date: new Date().toISOString(),
  });
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingForm, setOpeningForm] = useState({ register_type: "Caja principal", amount: 0, payment_method: "Efectivo" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await base44.entities.CashMovement.list("-date", 200);
      setList(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const balances = useMemo(() => {
    const result = {};
    REGISTERS.forEach(r => result[r] = 0);
    list.forEach(m => {
      const reg = m.register_type || "Caja principal";
      if (!result[reg]) result[reg] = 0;
      result[reg] += m.type === "Entrada" ? (m.amount || 0) : -(m.amount || 0);
    });
    return result;
  }, [list]);

  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);

  const filtered = list.filter(m => {
    const matchReg = filterRegister === "all" || m.register_type === filterRegister;
    const matchSearch = matchAny(search, m.description, m.category, m.amount);
    return matchReg && matchSearch;
  });

  const openNew = () => {
    setForm({ type: "Entrada", category: "Otro ingreso", amount: 0, description: "", payment_method: "Efectivo", register_type: "Caja principal", date: new Date().toISOString() });
    setModalOpen(true);
  };

  const openOpening = () => {
    setOpeningForm({ register_type: "Caja principal", amount: 0, payment_method: "Efectivo" });
    setOpeningOpen(true);
  };

  const saveOpening = async () => {
    if (!openingForm.amount || openingForm.amount <= 0) return;
    setSaving(true);
    try {
      await base44.entities.CashMovement.create({
        type: "Entrada", category: "Otro ingreso",
        amount: Number(openingForm.amount),
        description: `Apertura de caja - ${openingForm.register_type}`,
        payment_method: openingForm.payment_method,
        register_type: openingForm.register_type,
        date: new Date().toISOString(),
      });
      setOpeningOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const save = async () => {
    if (!form.amount || form.amount <= 0) return;
    setSaving(true);
    try {
      await base44.entities.CashMovement.create({ ...form, amount: Number(form.amount) });
      setModalOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cats = form.type === "Entrada" ? ENTRY_CATS : EXIT_CATS;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Caja y Bancos</h1>
          <p className="text-slate-500 mt-1">Saldo total: <span className={`font-semibold ${totalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>${totalBalance.toLocaleString("es-CO")}</span></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openOpening} variant="outline">
            <ArrowDownCircle className="w-4 h-4" /> Apertura de Caja
          </Button>
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {REGISTERS.map(reg => (
          <div key={reg} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500">{reg}</p>
            </div>
            <p className={`text-xl font-bold ${balances[reg] >= 0 ? "text-slate-900" : "text-red-600"}`}>
              ${balances[reg].toLocaleString("es-CO")}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por descripción, categoría o monto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterRegister} onValueChange={setFilterRegister}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cajas</SelectItem>
            {REGISTERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Movements */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Caja</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-slate-400 py-8">Sin movimientos</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{m.date ? moment(m.date).format("DD/MM/YYYY HH:mm") : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{m.register_type}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{m.category}</span></td>
                  <td className="px-4 py-3 text-slate-800">{m.description || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{m.payment_method}</td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${m.type === "Entrada" ? "text-emerald-600" : "text-red-600"}`}>
                    {m.type === "Entrada" ? "+" : "-"}${(m.amount || 0).toLocaleString("es-CO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo movimiento de caja</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: v === "Entrada" ? "Otro ingreso" : "Otro egreso" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem>
                    <SelectItem value="Salida">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Caja</Label>
                <Select value={form.register_type} onValueChange={(v) => setForm({ ...form, register_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGISTERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Forma de pago</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openingOpen} onOpenChange={setOpeningOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apertura de Caja</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Caja</Label>
              <Select value={openingForm.register_type} onValueChange={(v) => setOpeningForm({ ...openingForm, register_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGISTERS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto inicial *</Label>
              <Input type="number" value={openingForm.amount} onChange={(e) => setOpeningForm({ ...openingForm, amount: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Forma de pago</Label>
              <Select value={openingForm.payment_method} onValueChange={(v) => setOpeningForm({ ...openingForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpeningOpen(false)}>Cancelar</Button>
            <Button onClick={saveOpening} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Abrir Caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// Gastos
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import BankAccountSelect, { needsBank } from "@/components/BankAccountSelect";
import { fetchAll } from "@/lib/entityLoader";
import { registerForPayment } from "@/lib/cashRegister";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, Plus, Pencil, Trash2, Search, TrendingDown } from "lucide-react";
import moment from "moment";
import { useNavigate, useLocation } from "react-router-dom";
import { nowLocalISO, momentBogota } from "@/lib/localDate";
import { matchAny } from "@/lib/search";
import { useConfirm } from "@/components/ConfirmProvider";

import ExpenseCategoriesManager from "@/components/ExpenseCategoriesManager";
import { Settings2 } from "lucide-react";

const DEFAULT_CATEGORIES = ["Arriendo", "Servicios públicos", "Nómina", "Transporte", "Herramientas", "Papelería", "Publicidad", "Mantenimiento", "Compras menores", "Otros"];
const METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Otros"];

export default function Expenses() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bankAccount, setBankAccount] = useState("");
  useEffect(() => { if (modalOpen) setBankAccount(""); }, [modalOpen]);
  const [form, setForm] = useState({
    date: momentBogota().format("YYYY-MM-DD"), category: "Otros", description: "",
    amount: 0, responsible: "", payment_method: "Efectivo", support_photo: ""
  });

  const [catRecords, setCatRecords] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  // Categorías: las guardadas + las usadas en gastos existentes (por si fueron eliminadas)
  const CATEGORIES = [...new Set([...catRecords.map((c) => c.name), ...list.map((e) => e.category).filter(Boolean)])];

  const loadCategories = async () => {
    const me = await base44.auth.me();
    const admin = me?.role === "admin" || me?.role === "administrador";
    setIsAdmin(admin);
    let cats = await base44.entities.ExpenseCategory.list("created_date", 200);
    if (cats.length === 0 && admin) {
      await base44.entities.ExpenseCategory.bulkCreate(DEFAULT_CATEGORIES.map((name) => ({ name })));
      cats = await base44.entities.ExpenseCategory.list("created_date", 200);
    }
    setCatRecords(cats);
  };

  useEffect(() => { load(); loadCategories(); }, []);

  const load = async () => {
    try {
      const data = await fetchAll("Expense", "-date");
      setList(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = list.filter(e => {
    const matchSearch = matchAny(search, e.description, e.responsible);
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalAmount = filtered.reduce((sum, e) => sum + (e.amount || 0), 0);

  const openNew = () => {
    setEditing(null);
    setForm({ date: momentBogota().format("YYYY-MM-DD"), category: "Otros", description: "", amount: 0, responsible: "", payment_method: "Efectivo", support_photo: "" });
    setModalOpen(true);
  };

  // Atajo global Ctrl+G (lo dispara el Layout)
  const openNewRef = React.useRef(openNew);
  openNewRef.current = openNew;
  useEffect(() => {
    const h = () => openNewRef.current();
    window.addEventListener("new-expense", h);
    return () => window.removeEventListener("new-expense", h);
  }, []);
  useEffect(() => {
    if (!loading && location.state?.newExpense) {
      openNewRef.current();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [loading, location.state]);

  const openEdit = (e) => {
    setEditing(e);
    setForm({ ...e, amount: e.amount || 0 });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.amount || form.amount <= 0) return;
    if (needsBank(form.payment_method) && !bankAccount) { alert("Selecciona la cuenta bancaria."); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) {
        await base44.entities.Expense.update(editing.id, payload);
        // Sincronizar el movimiento de caja vinculado
        try {
          const linked = await base44.entities.CashMovement.filter({ reference_id: editing.id });
          if (linked.length > 0) {
            await base44.entities.CashMovement.update(linked[0].id, {
              amount: payload.amount,
              description: payload.description || payload.category,
              payment_method: payload.payment_method || "Efectivo",
              ...(bankAccount ? { bank_account: bankAccount } : {}),
            });
          }
        } catch (e) { console.error(e); }
      } else {
        const saved = await base44.entities.Expense.create(payload);
        // Registrar salida de caja por el gasto
        await base44.entities.CashMovement.create({
          date: nowLocalISO(),
          type: "Salida",
          category: "Gasto",
          amount: payload.amount,
          description: payload.description || payload.category,
          payment_method: payload.payment_method || "Efectivo",
          register_type: registerForPayment(payload.payment_method || "Efectivo", "Caja principal"),
          bank_account: bankAccount || undefined,
          reference_id: saved.id,
        });
      }
      setModalOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title: "¿Eliminar este gasto?", confirmText: "Sí, eliminar", cancelText: "No", variant: "destructive" }))) return;
    try {
      const linked = await base44.entities.CashMovement.filter({ reference_id: id });
      await Promise.all(linked.map((m) => base44.entities.CashMovement.delete(m.id)));
    } catch (e) { console.error(e); }
    await base44.entities.Expense.delete(id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gastos</h1>
          <p className="text-slate-500 mt-1">{list.length} gastos registrados · Total: <span className="font-semibold text-red-600">${totalAmount.toLocaleString("es-CO")}</span></p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <Button variant="outline" onClick={() => setCatsOpen(true)}><Settings2 className="w-4 h-4" /> Categorías</Button>}
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4" /> Nuevo Gasto <span className="ml-2 text-[10px] opacity-60 hidden md:inline">Ctrl+G</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por descripción o responsable..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay gastos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Responsable</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.date ? moment(e.date).format("DD/MM/YYYY") : "—"}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{e.category}</span></td>
                    <td className="px-4 py-3 text-slate-800">{e.description || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{e.responsible || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{e.payment_method}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600 whitespace-nowrap">${(e.amount || 0).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openEdit(e)} className="p-1.5 text-slate-400 hover:text-amber-600"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(e.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ExpenseCategoriesManager open={catsOpen} onOpenChange={setCatsOpen} categories={catRecords} onChanged={async () => { await loadCategories(); await load(); }} />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Categoría *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Responsable</Label>
                <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Forma de pago</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <BankAccountSelect method={form.payment_method} value={bankAccount} onChange={setBankAccount} label="Cuenta bancaria de origen *" />
            </div>
            <div>
              <Label>Soporte / Foto (URL)</Label>
              <Input value={form.support_photo} onChange={(e) => setForm({ ...form, support_photo: e.target.value })} placeholder="URL de la foto del soporte" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
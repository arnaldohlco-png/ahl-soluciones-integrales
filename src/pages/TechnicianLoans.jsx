import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HandCoins, Plus, Pencil, Trash2, Loader2, Printer } from "lucide-react";
import moment from "moment";
import WhatsAppButton from "@/components/WhatsAppButton";
import PrintableDocument from "@/components/PrintableDocument";
import { buildDocMessage } from "@/lib/docMessages";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function TechnicianLoans() {
  const [loans, setLoans] = useState([]);
  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterTech, setFilterTech] = useState("all");
  const [form, setForm] = useState({ technician_id: "", date: moment().format("YYYY-MM-DD"), amount: "", description: "" });
  const [printL, setPrintL] = useState(null);

  const techPhone = (id) => techs.find((t) => t.id === id)?.phone || "";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [l, t] = await Promise.all([
        base44.entities.TechnicianLoan.list("-created_date", 500),
        base44.entities.Technician.list("-created_date", 200),
      ]);
      setLoans(l); setTechs(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const techName = (id) => techs.find((t) => t.id === id)?.name || "—";

  const filtered = loans.filter((l) => filterTech === "all" || l.technician_id === filterTech);
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
      const payload = {
        ...form, amount: Number(form.amount) || 0,
        technician_name: techName(form.technician_id),
        balance: Number(form.amount) || 0, deducted_amount: 0, status: "Pendiente",
      };
      if (editing) await base44.entities.TechnicianLoan.update(editing.id, payload);
      else await base44.entities.TechnicianLoan.create(payload);
      setModalOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este préstamo?")) return;
    await base44.entities.TechnicianLoan.delete(id);
    await load();
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

      <div className="mb-4 max-w-xs">
        <Select value={filterTech} onValueChange={setFilterTech}>
          <SelectTrigger><SelectValue placeholder="Filtrar por técnico..." /></SelectTrigger>
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
                  <td className="px-4 py-3 text-slate-600">{l.description || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(l.amount)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{fmt(l.deducted_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(l.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${l.status === "Pendiente" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
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
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Préstamo" : "Nuevo Préstamo"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Técnico *</Label>
              <Select value={form.technician_id} onValueChange={(v) => setForm({ ...form, technician_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar técnico..." /></SelectTrigger>
                <SelectContent>
                  {techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
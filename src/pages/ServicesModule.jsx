import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wrench, Search } from "lucide-react";

const categories = ["Mantenimiento", "Reparación", "Diagnóstico", "Cambio de aceite", "Frenos", "Motor", "Eléctrico", "Lubricación", "Afinación", "Otros"];

const empty = { name: "", category: "Mantenimiento", price: "", cost: 0, estimated_hours: 0, iva_rate: 0, description: "", status: "Activo" };

export default function ServicesModule() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Service.list("-created_date", 500);
      setServices(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (s) => {
    setForm({ name: s.name || "", category: s.category || "Mantenimiento", price: s.price ?? "", cost: s.cost ?? 0, estimated_hours: s.estimated_hours ?? 0, iva_rate: s.iva_rate ?? 0, description: s.description || "", status: s.status || "Activo" });
    setEditing(s); setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    const payload = { ...form, price: Number(form.price) || 0, cost: Number(form.cost) || 0, estimated_hours: Number(form.estimated_hours) || 0, iva_rate: Number(form.iva_rate) || 0 };
    try {
      if (editing) { await base44.entities.Service.update(editing.id, payload); }
      else { await base44.entities.Service.create(payload); }
      setOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (s) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    await base44.entities.Service.delete(s.id);
    await load();
  };

  const filtered = services.filter((s) => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || s.category === filterCategory;
    return matchSearch && matchCat;
  });

  const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Catálogo de Servicios</h1>
          <p className="text-slate-500 mt-1">{services.length} servicios registrados</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-1" /> Nuevo Servicio
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar servicio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto">
          <button onClick={() => setFilterCategory("all")} className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${filterCategory === "all" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>Todas</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setFilterCategory(c)} className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${filterCategory === c ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>{c}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay servicios registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Servicio</th>
                <th className="px-4 py-3 text-left font-medium">Categoría</th>
                <th className="px-4 py-3 text-left font-medium">Descripción</th>
                <th className="px-4 py-3 text-center font-medium">Horas est.</th>
                <th className="px-4 py-3 text-right font-medium">Costo</th>
                <th className="px-4 py-3 text-right font-medium">Precio</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">{s.category}</span></td>
                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{s.description || "—"}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{s.estimated_hours || 0}h</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(s.cost)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(s.price)}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(s)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nombre del servicio *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Ej: Cambio de aceite" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Precio *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
              <div><Label>Costo estimado</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" /></div>
              <div><Label>Horas estimadas</Label><Input type="number" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>IVA (%)</Label><Input type="number" value={form.iva_rate} onChange={(e) => setForm({ ...form, iva_rate: e.target.value })} className="mt-1" /></div>
            <div><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name || !form.price} className="bg-amber-500 hover:bg-amber-600 text-slate-900">{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
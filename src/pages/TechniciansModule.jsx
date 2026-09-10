// Técnicos
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HardHat, Plus, Pencil, Trash2, Search, Phone } from "lucide-react";
import { matchAny } from "@/lib/search";

export default function Technicians() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", document_number: "", phone: "", specialty: "",
    hire_date: "", salary: 0, commission_percentage: 0, status: "Activo"
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await base44.entities.Technician.list("-created_date", 200);
      setList(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = list.filter(t =>
    matchAny(search, t.name, t.specialty, t.phone, t.document_number)
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", document_number: "", phone: "", specialty: "", hire_date: "", salary: 0, commission_percentage: 0, status: "Activo" });
    setModalOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setForm({ ...t, salary: t.salary || 0, commission_percentage: t.commission_percentage || 0 });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) await base44.entities.Technician.update(editing.id, form);
      else await base44.entities.Technician.create(form);
      setModalOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este técnico?")) return;
    await base44.entities.Technician.delete(id);
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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Técnicos</h1>
          <p className="text-slate-500 mt-1">{list.length} técnicos registrados</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4" /> Nuevo Técnico
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o especialidad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <HardHat className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay técnicos registrados</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <HardHat className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.specialty || "Sin especialidad"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-amber-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(t.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {t.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> {t.phone}
                  </div>
                )}
                {t.document_number && (
                  <div className="text-slate-600">Cédula: {t.document_number}</div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Comisión: <strong className="text-slate-800">{t.commission_percentage || 0}%</strong></span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {t.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Técnico" : "Nuevo Técnico"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Nombre completo *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cédula</Label>
                <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Especialidad</Label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Ej: Mecánica general, Eléctrica..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de ingreso</Label>
                <Input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
              </div>
              <div>
                <Label>Salario</Label>
                <Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Comisión (%)</Label>
                <Input type="number" value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
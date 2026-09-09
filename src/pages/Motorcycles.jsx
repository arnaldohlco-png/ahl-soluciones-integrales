import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Bike, Search } from "lucide-react";

const empty = {
  customer_id: "", brand: "", line: "", model: "", year: "", plate: "", vin: "",
  engine_number: "", color: "", displacement: "", mileage: "", registration_date: "",
};

export default function Motorcycles() {
  const [motos, setMotos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [m, c, b] = await Promise.all([
        base44.entities.Motorcycle.list("-created_date", 200),
        base44.entities.Customer.list("-created_date", 200),
        base44.entities.Brand.list("-created_date", 200),
      ]);
      setMotos(m); setCustomers(c); setBrands(b);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const customerName = (id) => customers.find((c) => c.id === id)?.name || "—";

  const brandLines = (() => {
    if (!form.brand) return [];
    const b = brands.find((x) => x.name?.toLowerCase() === form.brand.toLowerCase());
    if (!b || !b.lines) return [];
    return b.lines.split(",").map((l) => l.trim()).filter(Boolean);
  })();

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (m) => {
    setForm({
      customer_id: m.customer_id || "", brand: m.brand || "", line: m.line || "",
      model: m.model || "", year: m.year || "", plate: m.plate || "", vin: m.vin || "",
      engine_number: m.engine_number || "", color: m.color || "",
      displacement: m.displacement ?? "", mileage: m.mileage ?? "", registration_date: m.registration_date || "",
    });
    setEditing(m); setOpen(true);
  };

  const save = async () => {
    if (!form.brand.trim() || !form.model.trim() || !form.customer_id) return;
    setSaving(true);
    const payload = {
      ...form,
      year: form.year ? Number(form.year) : undefined,
      displacement: form.displacement ? Number(form.displacement) : undefined,
      mileage: form.mileage ? Number(form.mileage) : undefined,
    };
    try {
      if (editing) { await base44.entities.Motorcycle.update(editing.id, payload); }
      else { await base44.entities.Motorcycle.create(payload); }

      // If a new line was entered, add it to the brand (or create the brand)
      if (form.line && form.brand) {
        const b = brands.find((x) => x.name?.toLowerCase() === form.brand.toLowerCase());
        if (b) {
          const existing = (b.lines || "").split(",").map((l) => l.trim()).filter(Boolean);
          if (!existing.map((l) => l.toLowerCase()).includes(form.line.toLowerCase())) {
            await base44.entities.Brand.update(b.id, { lines: [...existing, form.line].join(", ") });
          }
        } else {
          await base44.entities.Brand.create({ name: form.brand.trim(), lines: form.line.trim() });
        }
      }

      setOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (m) => {
    if (!confirm(`¿Eliminar la motocicleta ${m.brand} ${m.model}?`)) return;
    await base44.entities.Motorcycle.delete(m.id);
    await load();
  };

  const filtered = motos.filter((m) =>
    m.brand?.toLowerCase().includes(search.toLowerCase()) ||
    m.model?.toLowerCase().includes(search.toLowerCase()) ||
    m.plate?.toLowerCase().includes(search.toLowerCase()) ||
    m.line?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Motocicletas</h1>
          <p className="text-slate-500 mt-1">{motos.length} motocicletas registradas</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-1" /> Nueva Motocicleta
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar por marca, modelo, placa o línea..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Bike className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay motocicletas registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Motocicleta</th>
                  <th className="px-4 py-3 text-left font-medium">Placa</th>
                  <th className="px-4 py-3 text-left font-medium">Año</th>
                  <th className="px-4 py-3 text-left font-medium">Cil.</th>
                  <th className="px-4 py-3 text-left font-medium">Km</th>
                  <th className="px-4 py-3 text-left font-medium">Propietario</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                          <Bike className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{m.brand} {m.model}</p>
                          {m.line && <p className="text-xs text-slate-400">{m.line}{m.color ? ` · ${m.color}` : ""}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-700">{m.plate || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.year || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.displacement ? `${m.displacement}cc` : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{m.mileage ? m.mileage.toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{customerName(m.customer_id)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(m)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Motocicleta" : "Nueva Motocicleta"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Propietario *</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Marca *</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1" placeholder="Honda, Yamaha..." /></div>
              <div>
                <Label>Línea</Label>
                <Input value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} className="mt-1" placeholder="CB, YBR..." list="lines-list" />
                <datalist id="lines-list">
                  {brandLines.map((l) => <option key={l} value={l} />)}
                </datalist>
                {form.line && !brandLines.map((l) => l.toLowerCase()).includes(form.line.toLowerCase()) && form.brand && (
                  <p className="text-xs text-amber-600 mt-1">Línea nueva — se agregará a {form.brand} al guardar</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Modelo *</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1" /></div>
              <div><Label>Año</Label><Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Placa</Label><Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} className="mt-1" /></div>
              <div><Label>Color</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cilindraje (cc)</Label><Input type="number" value={form.displacement} onChange={(e) => setForm({ ...form, displacement: e.target.value })} className="mt-1" /></div>
              <div><Label>Kilometraje</Label><Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>VIN / Chasis</Label><Input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} className="mt-1" /></div>
              <div><Label>Número de motor</Label><Input value={form.engine_number} onChange={(e) => setForm({ ...form, engine_number: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>Fecha de matrícula</Label><Input type="date" value={form.registration_date} onChange={(e) => setForm({ ...form, registration_date: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.brand.trim() || !form.model.trim() || !form.customer_id} className="bg-amber-500 hover:bg-amber-600 text-slate-900">{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
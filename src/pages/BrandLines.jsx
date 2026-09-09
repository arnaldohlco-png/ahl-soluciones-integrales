import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Bike, X, Globe } from "lucide-react";

const empty = { name: "", country: "", lines: [] };

export default function BrandLines() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [lineInput, setLineInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Brand.list("-created_date", 200);
      setBrands(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const parseLines = (str) => (str || "").split(",").map(s => s.trim()).filter(Boolean);

  const openNew = () => { setForm(empty); setLineInput(""); setEditing(null); setOpen(true); };
  const openEdit = (b) => {
    setForm({ name: b.name || "", country: b.country || "", lines: parseLines(b.lines) });
    setLineInput(""); setEditing(b); setOpen(true);
  };

  const addLine = () => {
    const val = lineInput.trim();
    if (val && !form.lines.includes(val)) {
      setForm({ ...form, lines: [...form.lines, val] });
    }
    setLineInput("");
  };

  const removeLine = (idx) => {
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      country: form.country.trim(),
      lines: form.lines.join(", "),
    };
    try {
      if (editing) { await base44.entities.Brand.update(editing.id, payload); }
      else { await base44.entities.Brand.create(payload); }
      setOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (b) => {
    if (!confirm(`¿Eliminar la marca "${b.name}"?`)) return;
    await base44.entities.Brand.delete(b.id);
    await load();
  };

  const filtered = brands.filter((b) =>
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    (b.lines || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Marcas y Líneas</h1>
          <p className="text-slate-500 mt-1">{brands.length} marcas registradas</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-1" /> Nueva Marca
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar por marca o línea..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Bike className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay marcas registradas</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b) => {
            const lines = parseLines(b.lines);
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
                      <Bike className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{b.name}</p>
                      {b.country && (
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {b.country}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(b)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {lines.length === 0 ? (
                    <span className="text-xs text-slate-400">Sin líneas registradas</span>
                  ) : (
                    lines.map((l, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">{l}</span>
                    ))
                  )}
                </div>
                {lines.length > 0 && (
                  <p className="text-xs text-slate-400 mt-2">{lines.length} línea{lines.length !== 1 ? "s" : ""}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Marca" : "Nueva Marca"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nombre de la marca *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="Honda, Yamaha, AKT..." />
            </div>
            <div>
              <Label>País de origen</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1" placeholder="Japón, Colombia, Italia..." />
            </div>
            <div>
              <Label>Líneas / Modelos</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={lineInput}
                  onChange={(e) => setLineInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLine(); } }}
                  placeholder="Escribe una línea y presiona Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addLine} className="shrink-0"><Plus className="w-4 h-4" /></Button>
              </div>
              {form.lines.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {form.lines.map((l, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                      {l}
                      <button onClick={() => removeLine(i)} className="hover:text-red-600"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2">Ej: CB190, CG125, XR150, NMAX...</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-900">{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
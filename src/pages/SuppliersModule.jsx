// Proveedores
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2, Search, Phone, Mail, MapPin } from "lucide-react";
import ExportImport from "@/components/ExportImport";
import { matchAny } from "@/lib/search";

export default function Suppliers() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", document_number: "", phone: "", email: "", address: "", notes: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await fetchAll("Supplier");
      setList(data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = list.filter(s =>
    matchAny(search, s.name, s.document_number, s.phone, s.email)
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", document_number: "", phone: "", email: "", address: "", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ ...s });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      if (editing) await base44.entities.Supplier.update(editing.id, form);
      else await base44.entities.Supplier.create(form);
      setModalOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await base44.entities.Supplier.delete(id);
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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Proveedores</h1>
          <p className="text-slate-500 mt-1">{list.length} proveedores registrados</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportImport entityName="Supplier" fields={["name", "document_number", "phone", "email", "address", "notes"]} />
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre o NIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay proveedores registrados</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-sm text-slate-500">NIT: {s.document_number || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {s.phone && (
                    <a href={`tel:${s.phone.replace(/\s+/g, "")}`} title="Llamar" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Phone className="w-4 h-4" /></a>
                  )}
                  <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-amber-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {s.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4 text-slate-400" /> {s.phone}</div>}
                {s.email && <div className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4 text-slate-400" /> {s.email}</div>}
                {s.address && <div className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" /> {s.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Razón social *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>NIT</Label>
                <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
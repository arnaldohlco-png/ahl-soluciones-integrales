import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Phone, Mail, Search, Users, MessageCircle, CreditCard, FileText } from "lucide-react";
import ExportImport from "@/components/ExportImport";
import { matchAny } from "@/lib/search";

const docTypes = ["Cédula", "NIT", "Cédula de extranjería", "Pasaporte"];

const empty = {
  name: "", document_type: "Cédula", document_number: "", phone: "", whatsapp: "",
  email: "", address: "", credit_limit: "", balance: "", notes: "",
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAll("Customer");
      setCustomers(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (c) => {
    setForm({
      name: c.name || "", document_type: c.document_type || "Cédula", document_number: c.document_number || "",
      phone: c.phone || "", whatsapp: c.whatsapp || "", email: c.email || "",
      address: c.address || "", credit_limit: c.credit_limit ?? "", balance: c.balance ?? "", notes: c.notes || "",
    });
    setEditing(c); setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      credit_limit: Number(form.credit_limit) || 0,
      balance: Number(form.balance) || 0,
    };
    try {
      if (editing) {
        await base44.entities.Customer.update(editing.id, payload);
      } else {
        await base44.entities.Customer.create(payload);
      }
      setOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (c) => {
    if (!confirm(`¿Eliminar al cliente "${c.name}"?`)) return;
    await base44.entities.Customer.delete(c.id);
    await load();
  };

  const filtered = customers.filter((c) =>
    matchAny(search, c.name, c.phone, c.email, c.document_number)
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Clientes</h1>
          <p className="text-slate-500 mt-1">{customers.length} clientes registrados</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportImport entityName="Customer" fields={["name", "document_type", "document_number", "phone", "whatsapp", "email", "address", "credit_limit", "balance", "notes"]} />
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input placeholder="Buscar por nombre, teléfono, email o documento..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay clientes registrados</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold">
                    {c.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    {c.document_number && <p className="text-xs text-slate-400">{c.document_type}: {c.document_number}</p>}
                    {c.address && <p className="text-xs text-slate-400">{c.address}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {c.phone && (
                    <a href={`tel:${c.phone.replace(/\s+/g, "")}`} title="Llamar" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Phone className="w-4 h-4" /></a>
                  )}
                  <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(c)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm">
                {c.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400" /> {c.phone}</div>}
                {c.whatsapp && <div className="flex items-center gap-2 text-slate-600"><MessageCircle className="w-3.5 h-3.5 text-green-500" /> {c.whatsapp}</div>}
                {c.email && <div className="flex items-center gap-2 text-slate-600 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {c.email}</div>}
              </div>
              {(c.credit_limit > 0 || c.balance > 0) && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-slate-500"><CreditCard className="w-3.5 h-3.5" /> Crédito: ${(c.credit_limit || 0).toLocaleString("es-CO")}</div>
                  <div className={c.balance > 0 ? "text-red-600 font-semibold" : "text-emerald-600 font-semibold"}>
                    Saldo: ${(c.balance || 0).toLocaleString("es-CO")}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Nombre / Razón social *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de documento</Label>
                <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{docTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cédula / NIT</Label>
                <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Límite de crédito</Label><Input type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} className="mt-1" placeholder="0" /></div>
              <div><Label>Saldo pendiente</Label><Input type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="mt-1" placeholder="0" /></div>
            </div>
            <div>
              <Label>Notas</Label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" rows={2} />
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
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save, Loader2 } from "lucide-react";

const empty = {
  name: "", document_type: "Persona jurídica", document_number: "", phone: "",
  email: "", address: "", city: "", logo: "", footer_text: "", credit_default_days: 30,
};

export default function Company() {
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.Company.list("-created_date", 10);
        if (data.length > 0) {
          setCompany(data[0]);
          setForm({
            name: data[0].name || "", document_type: data[0].document_type || "Persona jurídica",
            document_number: data[0].document_number || "", phone: data[0].phone || "",
            email: data[0].email || "", address: data[0].address || "", city: data[0].city || "",
            logo: data[0].logo || "", footer_text: data[0].footer_text || "",
            credit_default_days: data[0].credit_default_days ?? 30,
          });
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, credit_default_days: Number(form.credit_default_days) || 30 };
      if (company) {
        await base44.entities.Company.update(company.id, payload);
      } else {
        const created = await base44.entities.Company.create(payload);
        setCompany(created);
      }
      alert("Empresa guardada");
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Datos de la Empresa</h1>
          <p className="text-slate-500 mt-0.5">Información que aparece en órdenes, facturas y documentos</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo de persona</Label>
            <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Persona natural">Persona natural</SelectItem>
                <SelectItem value="Persona jurídica">Persona jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nombre / Razón social *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>NIT / Cédula</Label>
            <Input value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
          </div>
        </div>
        <div>
          <Label>Dirección</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Días de crédito por defecto</Label>
            <Input type="number" value={form.credit_default_days} onChange={(e) => setForm({ ...form, credit_default_days: e.target.value })} className="mt-1" />
          </div>
          <div>
            <Label>Logo (URL)</Label>
            <Input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="mt-1" placeholder="https://..." />
          </div>
        </div>
        <div>
          <Label>Pie de página para órdenes de servicio</Label>
          <Textarea value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="mt-1" rows={3}
            placeholder="Ej: Garantía de 3 meses en repuestos. No nos hacemos responsables por objetos dejados en la motocicleta..." />
          <p className="text-xs text-slate-400 mt-1">Este texto aparecerá al final de cada orden de servicio impresa</p>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving || !form.name.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
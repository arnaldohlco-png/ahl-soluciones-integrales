import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save, Loader2, Cloud, Upload, RotateCcw } from "lucide-react";
import RestoreBackupDialog from "@/components/RestoreBackupDialog";
import RolesManager from "@/components/RolesManager";
import BankAccountsManager from "@/components/BankAccountsManager";
import UsersManager from "@/components/UsersManager";
import VerseSettings from "@/components/VerseSettings";
import LocalBackupButton from "@/components/LocalBackupButton";
import AdminSignatureDialog from "@/components/AdminSignatureDialog";
import { useAuth } from "@/lib/AuthContext";

const FOOTER_FIELDS = [
  ["footer_text", "Órdenes de servicio", "Ej: Garantía de 3 meses en repuestos. No nos hacemos responsables por objetos dejados en la motocicleta..."],
  ["receipt_footer_text", "POS y facturas", "Ej: Gracias por su compra. Cambios dentro de 8 días con factura."],
  ["quotation_footer_text", "Cotizaciones", "Ej: Precios válidos por 15 días."],
  ["purchase_footer_text", "Compras y pedidos a proveedor", "Ej: Recibido conforme. Revisar mercancía al recibir."],
  ["loan_footer_text", "Comprobantes de préstamo", "Ej: El descuento se aplicará en el próximo pago de comisiones."],
  ["commission_footer_text", "Comprobantes de comisiones", "Ej: Recibí a satisfacción el valor neto indicado."],
  ["warranty_footer_text", "Comprobantes de garantía", "Ej: La garantía aplica presentando este comprobante."],
];

const empty = {
  name: "", document_type: "Persona jurídica", document_number: "", phone: "",
  email: "", address: "", city: "", logo: "", admin_signature: "", footer_text: "", receipt_footer_text: "",
  quotation_footer_text: "", purchase_footer_text: "", loan_footer_text: "", commission_footer_text: "", warranty_footer_text: "",
  warranty_terms: "", warranty_coverage: "", warranty_exclusions: "", credit_default_days: 30,
  verse_text: "", verse_reference: "",
  charges_iva: true,
  dian_resolution: "", dian_resolution_date: "", dian_range_from: 0, dian_range_to: 0,
  pos_prefix: "VTA", quote_prefix: "COT", purchase_prefix: "COMP", order_prefix: "ORD", invoice_prefix: "FAC",
};

export default function Company() {
  const { user } = useAuth();
  const isAdmin = ["admin", "administrador"].includes(user?.role);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backing, setBacking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

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
            logo: data[0].logo || "", admin_signature: data[0].admin_signature || "", footer_text: data[0].footer_text || "",
            receipt_footer_text: data[0].receipt_footer_text || "",
            quotation_footer_text: data[0].quotation_footer_text || "",
            purchase_footer_text: data[0].purchase_footer_text || "",
            loan_footer_text: data[0].loan_footer_text || "",
            commission_footer_text: data[0].commission_footer_text || "",
            warranty_footer_text: data[0].warranty_footer_text || "",
            warranty_terms: data[0].warranty_terms || "", warranty_coverage: data[0].warranty_coverage || "", warranty_exclusions: data[0].warranty_exclusions || "",
            credit_default_days: data[0].credit_default_days ?? 30,
            verse_text: data[0].verse_text || "", verse_reference: data[0].verse_reference || "",
            charges_iva: data[0].charges_iva ?? (data[0].document_type === "Persona jurídica"),
            dian_resolution: data[0].dian_resolution || "", dian_resolution_date: data[0].dian_resolution_date || "",
            dian_range_from: data[0].dian_range_from ?? 0, dian_range_to: data[0].dian_range_to ?? 0,
            pos_prefix: data[0].pos_prefix || "VTA", quote_prefix: data[0].quote_prefix || "COT",
            purchase_prefix: data[0].purchase_prefix || "COMP", order_prefix: data[0].order_prefix || "ORD",
            invoice_prefix: data[0].invoice_prefix || "FAC",
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
        const verseChanged = (form.verse_text || "") !== (company.verse_text || "") || (form.verse_reference || "") !== (company.verse_reference || "");
        if (verseChanged) payload.verse_rotation_active = false;
        const updated = await base44.entities.Company.update(company.id, payload);
        setCompany({ ...company, ...payload, ...(updated || {}) });
      } else {
        const created = await base44.entities.Company.create(payload);
        setCompany(created);
      }
      alert("Empresa guardada");
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const backupToDrive = async () => {
    setBacking(true);
    try {
      const res = await base44.functions.invoke('backupToDrive', {});
      if (res.data?.success) {
        alert(`Respaldo creado en Google Drive: ${res.data.file?.name || 'archivo'}`);
      } else {
        alert("Error: " + (res.data?.error || "desconocido"));
      }
    } catch (e) {
      console.error(e);
      alert("Error al respaldar: " + e.message);
    }
    setBacking(false);
  };

  const resumeVerse = async () => {
    if (!company) return;
    const next = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.Company.update(company.id, { verse_rotation_active: true, verse_next_change: next });
    setCompany({ ...company, verse_rotation_active: true, verse_next_change: next });
  };

  const saveSignature = async (url) => {
    setForm((f) => ({ ...f, admin_signature: url }));
    if (company) await base44.entities.Company.update(company.id, { admin_signature: url });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/svg+xml"].includes(file.type)) {
      alert("El logo debe ser PNG o SVG");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setForm({ ...form, logo: file_url });
    } catch (err) {
      console.error(err);
      alert("Error al subir el logo");
    }
    setUploading(false);
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
            <Select value={form.document_type} onValueChange={(v) => setForm({ ...form, document_type: v, charges_iva: v === "Persona jurídica" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Persona natural">Persona natural</SelectItem>
                  <SelectItem value="Persona jurídica">Persona jurídica</SelectItem>
                </SelectContent>
              </Select>
              <p className={`text-xs mt-1.5 font-medium ${form.charges_iva ? "text-emerald-600" : "text-slate-400"}`}>
                {form.charges_iva ? "Responsable de IVA (19%)" : "No responsable de IVA"}
              </p>
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
            <Label>Logo de la empresa</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.logo ? (
                <img src={form.logo} alt="Logo" className="w-16 h-16 rounded-lg object-contain border border-slate-200 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%),linear-gradient(45deg,#e2e8f0_25%,#fff_25%,#fff_75%,#e2e8f0_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px] p-1" />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-300">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Subiendo..." : "Cargar logo"}
                  <input type="file" accept="image/png,image/svg+xml,.png,.svg" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                </label>
                {form.logo && (
                  <button onClick={() => setForm({ ...form, logo: "" })} className="block text-xs text-red-500 mt-1 hover:underline">Quitar logo</button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div>
          <Label>Firma digital del administrador</Label>
          <div className="mt-1 flex items-center gap-3">
            {form.admin_signature ? (
              <img src={form.admin_signature} alt="Firma" className="h-14 object-contain border border-slate-200 rounded bg-white p-1" />
            ) : (
              <span className="text-xs text-slate-400">Sin firma registrada</span>
            )}
            {isAdmin && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setSigOpen(true)}>
                  {form.admin_signature ? "Reemplazar firma" : "Capturar firma"}
                </Button>
                {form.admin_signature && (
                  <button type="button" onClick={() => saveSignature("")} className="text-xs text-red-500 hover:underline">Quitar</button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Se muestra en todos los documentos impresos</p>
        </div>
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pies de página de documentos</p>
          {FOOTER_FIELDS.map(([key, label, hint]) => (
            <div key={key}>
              <Label>{label}</Label>
              <Textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="mt-1 py-1 resize-y" rows={2}
                disabled={!isAdmin} placeholder={hint} />
            </div>
          ))}
          <p className="text-xs text-slate-400">{isAdmin ? "El texto aparece al final de cada documento impreso o enviado en PDF" : "Solo un administrador puede editar estos textos"}</p>
        </div>

        <VerseSettings form={form} setForm={setForm} isAdmin={isAdmin} active={company?.verse_rotation_active !== false}
          nextChange={company?.verse_next_change} onResume={resumeVerse} />

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Garantía de servicios (plantilla)</p>
          {[["warranty_terms", "Términos y condiciones"], ["warranty_coverage", "Cobertura"], ["warranty_exclusions", "Exclusiones"]].map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Textarea value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 resize-y" rows={3} disabled={!isAdmin}
                placeholder="Si lo dejas vacío se usa un texto por defecto" />
            </div>
          ))}
          <p className="text-xs text-slate-400">{isAdmin ? "Cada orden guarda una copia del texto usado; cambiar la plantilla no altera garantías ya emitidas." : "Solo un administrador puede editar la plantilla."}</p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resolución DIAN</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Número de resolución</Label>
              <Input value={form.dian_resolution} onChange={(e) => setForm({ ...form, dian_resolution: e.target.value })} className="mt-1" placeholder="Ej: 18764000" />
            </div>
            <div>
              <Label>Fecha de resolución</Label>
              <Input type="date" value={form.dian_resolution_date} onChange={(e) => setForm({ ...form, dian_resolution_date: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <Label>Rango desde</Label>
              <Input type="number" value={form.dian_range_from} onChange={(e) => setForm({ ...form, dian_range_from: Number(e.target.value) || 0 })} className="mt-1" />
            </div>
            <div>
              <Label>Rango hasta</Label>
              <Input type="number" value={form.dian_range_to} onChange={(e) => setForm({ ...form, dian_range_to: Number(e.target.value) || 0 })} className="mt-1" />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Prefijos de numeración</p>
          <div className="grid grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Ventas (POS)</Label>
              <Input value={form.pos_prefix} onChange={(e) => setForm({ ...form, pos_prefix: e.target.value })} className="mt-1" maxLength={6} />
            </div>
            <div>
              <Label className="text-xs">Facturas</Label>
              <Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} className="mt-1" maxLength={6} />
            </div>
            <div>
              <Label className="text-xs">Cotizaciones</Label>
              <Input value={form.quote_prefix} onChange={(e) => setForm({ ...form, quote_prefix: e.target.value })} className="mt-1" maxLength={6} />
            </div>
            <div>
              <Label className="text-xs">Compras</Label>
              <Input value={form.purchase_prefix} onChange={(e) => setForm({ ...form, purchase_prefix: e.target.value })} className="mt-1" maxLength={6} />
            </div>
            <div>
              <Label className="text-xs">Órdenes</Label>
              <Input value={form.order_prefix} onChange={(e) => setForm({ ...form, order_prefix: e.target.value })} className="mt-1" maxLength={6} />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Estos prefijos se usan al generar automáticamente la numeración consecutiva de cada documento.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving || !form.name.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <AdminSignatureDialog open={sigOpen} onOpenChange={setSigOpen} current={form.admin_signature} onSaved={saveSignature} />
      {isAdmin && <UsersManager />}
      <BankAccountsManager />
      <RolesManager />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Respaldo en Google Drive</h3>
              <p className="text-sm text-slate-500">Guarda una copia de todos los datos del taller en tu Google Drive</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <LocalBackupButton />
            <Button onClick={backupToDrive} disabled={backing} variant="outline">
              {backing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Cloud className="w-4 h-4 mr-1" />}
              {backing ? "Respaldando..." : "Respaldar ahora"}
            </Button>
            <Button onClick={() => setRestoreOpen(true)} variant="outline" className="text-slate-700 border-slate-300 hover:bg-slate-50">
              <RotateCcw className="w-4 h-4 mr-1" />
              Restaurar desde copia
            </Button>
          </div>
        </div>
      </div>

      <RestoreBackupDialog open={restoreOpen} onOpenChange={setRestoreOpen} />
    </div>
  );
}
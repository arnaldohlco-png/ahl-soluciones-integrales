import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Save, Loader2, Cloud, Upload, RotateCcw, FileDown, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import RolesManager from "@/components/RolesManager";
import AdminSignatureDialog from "@/components/AdminSignatureDialog";
import { useConfirm } from "@/components/ConfirmProvider";
import { useAuth } from "@/lib/AuthContext";

const empty = {
  name: "", document_type: "Persona jurídica", document_number: "", phone: "",
  email: "", address: "", city: "", logo: "", admin_signature: "", footer_text: "", receipt_footer_text: "", warranty_terms: "", warranty_coverage: "", warranty_exclusions: "", credit_default_days: 30,
  charges_iva: true,
  dian_resolution: "", dian_resolution_date: "", dian_range_from: 0, dian_range_to: 0,
  pos_prefix: "VTA", quote_prefix: "COT", purchase_prefix: "COMP", order_prefix: "ORD", invoice_prefix: "FAC",
};

export default function Company() {
  const confirm = useConfirm();
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
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backups, setBackups] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

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
            warranty_terms: data[0].warranty_terms || "", warranty_coverage: data[0].warranty_coverage || "", warranty_exclusions: data[0].warranty_exclusions || "",
            credit_default_days: data[0].credit_default_days ?? 30,
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
        await base44.entities.Company.update(company.id, payload);
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

  const openRestore = async () => {
    setRestoreOpen(true);
    setRestoreResult(null);
    setSelectedFile(null);
    setLoadingBackups(true);
    try {
      const res = await base44.functions.invoke('restoreFromDrive', { action: 'list' });
      if (res.data?.success) {
        setBackups(res.data.files || []);
      } else {
        alert("Error al listar respaldos: " + (res.data?.error || "desconocido"));
      }
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
    setLoadingBackups(false);
  };

  const doRestore = async () => {
    if (!selectedFile) return;
    if (!(await confirm({ title: "⚠️ Restaurar respaldo", description: "Esta acción reemplazará TODOS los datos actuales con los del respaldo seleccionado. ¿Está seguro?", confirmText: "Sí, restaurar", cancelText: "No", variant: "destructive" }))) return;
    setRestoring(true);
    setRestoreResult(null);
    try {
      const res = await base44.functions.invoke('restoreFromDrive', { action: 'restore', fileId: selectedFile });
      if (res.data?.success) {
        setRestoreResult(res.data.results);
      } else {
        alert("Error al restaurar: " + (res.data?.error || "desconocido"));
      }
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
    setRestoring(false);
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
        <div>
          <Label>Pie de página para órdenes de servicio</Label>
          <Textarea value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="mt-1 py-1 resize-y" rows={1}
            placeholder="Ej: Garantía de 3 meses en repuestos. No nos hacemos responsables por objetos dejados en la motocicleta..." />
          <p className="text-xs text-slate-400 mt-1">Este texto aparecerá al final de cada orden de servicio impresa</p>
        </div>
        <div>
          <Label>Pie de página para POS y facturas</Label>
          <Textarea value={form.receipt_footer_text} onChange={(e) => setForm({ ...form, receipt_footer_text: e.target.value })} className="mt-1 py-1 resize-y" rows={2}
            disabled={!isAdmin} placeholder="Ej: Gracias por su compra. Cambios dentro de 8 días con factura." />
          <p className="text-xs text-slate-400 mt-1">{isAdmin ? "Aparece al final de los comprobantes del POS y de las facturas" : "Solo un administrador puede editar este texto"}</p>
        </div>

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
          <div className="flex gap-2">
            <Button onClick={backupToDrive} disabled={backing} variant="outline">
              {backing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Cloud className="w-4 h-4 mr-1" />}
              {backing ? "Respaldando..." : "Respaldar ahora"}
            </Button>
            <Button onClick={openRestore} disabled={restoring} variant="outline" className="text-slate-700 border-slate-300 hover:bg-slate-50">
              <RotateCcw className="w-4 h-4 mr-1" />
              Restaurar desde copia
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={restoreOpen} onOpenChange={(v) => !restoring && setRestoreOpen(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              Restaurar desde copia de seguridad
            </DialogTitle>
            <DialogDescription>
              Selecciona un respaldo de Google Drive para reemplazar los datos actuales.
            </DialogDescription>
          </DialogHeader>

          {restoreResult ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <FileDown className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-sm text-emerald-800">
                  Restauración completada. Resumen por módulo:
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
                {Object.entries(restoreResult).map(([entity, res]) => (
                  <div key={entity} className="flex justify-between px-2 py-1 rounded hover:bg-slate-50">
                    <span className="text-slate-600">{entity}</span>
                    <span className={res.error ? "text-red-500" : "text-emerald-600 font-medium"}>
                      {res.error ? `Error: ${res.error}` : res.restored != null ? `${res.restored} registros` : "omitido"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                  Esta acción <strong>eliminará y reemplazará</strong> todos los datos actuales del taller con los del respaldo. Proceder con precaución.
                </p>
              </div>

              {loadingBackups ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No se encontraron respaldos en Google Drive.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1.5">
                  {backups.map((f) => (
                    <label
                      key={f.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedFile === f.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      <input type="radio" name="backup" checked={selectedFile === f.id} onChange={() => setSelectedFile(f.id)} className="accent-amber-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(f.createdTime).toLocaleString("es-CO")}
                          {f.size ? ` · ${Math.round(Number(f.size) / 1024)} KB` : ""}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          <DialogFooter>
            {restoreResult ? (
              <Button onClick={() => setRestoreOpen(false)} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                Cerrar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setRestoreOpen(false)} disabled={restoring}>
                  Cancelar
                </Button>
                <Button onClick={doRestore} disabled={!selectedFile || restoring} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                  {restoring ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                  {restoring ? "Restaurando..." : "Restaurar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
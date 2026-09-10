import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Shield, Plus, Pencil, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { MODULE_OPTIONS, DEFAULT_ROLE_DEFS, parseRoutes, routesToStorage } from "@/lib/roles";

export default function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", label: "", allAccess: false, routes: [] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await base44.entities.Role.list();
      setRoles(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("roles-updated", handler);
    return () => window.removeEventListener("roles-updated", handler);
  }, []);

  const notify = () => window.dispatchEvent(new Event("roles-updated"));

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", label: "", allAccess: false, routes: [] });
    setOpen(true);
  };

  const openEdit = (r) => {
    const parsed = parseRoutes(r.routes);
    setEditing(r);
    setForm({ name: r.name, label: r.label, allAccess: parsed === "*", routes: parsed === "*" ? [] : parsed });
    setOpen(true);
  };

  const toggleRoute = (path) => {
    setForm((f) => ({
      ...f,
      routes: f.routes.includes(path) ? f.routes.filter((p) => p !== path) : [...f.routes, path],
    }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.label.trim()) return;
    setSaving(true);
    const routesValue = form.allAccess ? "*" : routesToStorage(form.routes);
    const payload = { name: form.name.trim().toLowerCase().replace(/\s+/g, "_"), label: form.label.trim(), routes: routesValue };
    try {
      if (editing) {
        await base44.entities.Role.update(editing.id, payload);
      } else {
        await base44.entities.Role.create(payload);
      }
      notify();
      setOpen(false);
      await load();
    } catch (e) { console.error(e); alert("Error al guardar el rol"); }
    setSaving(false);
  };

  const remove = async (r) => {
    if (!confirm(`¿Eliminar el rol "${r.label}"? Los usuarios con este rol podrían quedar sin acceso.`)) return;
    try {
      await base44.entities.Role.delete(r.id);
      notify();
      await load();
    } catch (e) { console.error(e); alert("Error al eliminar"); }
  };

  const seedDefaults = async () => {
    setSaving(true);
    try {
      await base44.entities.Role.bulkCreate(
        DEFAULT_ROLE_DEFS.map((d) => ({ name: d.name, label: d.label, routes: routesToStorage(d.routes) }))
      );
      notify();
      await load();
    } catch (e) { console.error(e); alert("Error al cargar roles por defecto"); }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Roles y Permisos</h3>
            <p className="text-sm text-slate-500">Define los roles de usuario y los módulos a los que accede cada uno</p>
          </div>
        </div>
        <div className="flex gap-2">
          {roles.length === 0 && (
            <Button onClick={seedDefaults} disabled={saving} variant="outline">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Cargar roles por defecto
            </Button>
          )}
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4 mr-1" /> Nuevo rol
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : roles.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No hay roles definidos. Carga los roles por defecto o crea uno nuevo.</p>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => {
            const parsed = parseRoutes(r.routes);
            const summary = parsed === "*" ? "Acceso total" : Array.isArray(parsed) && parsed.length ? `${parsed.length} módulos` : "Sin acceso";
            return (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{r.label}</span>
                    <code className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{r.name}</code>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{summary}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-red-500" onClick={() => remove(r)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar rol" : "Nuevo rol"}</DialogTitle>
            <DialogDescription>Asigna un nombre y selecciona los módulos a los que este rol podrá acceder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Identificador (clave) *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" placeholder="ej: vendedor" disabled={!!editing} />
                <p className="text-xs text-slate-400 mt-1">Se usa al asignar el rol a un usuario. Minúsculas, sin espacios.</p>
              </div>
              <div>
                <Label>Etiqueta *</Label>
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-1" placeholder="ej: Vendedor" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.allAccess} onChange={(e) => setForm({ ...form, allAccess: e.target.checked })} className="accent-amber-500 w-4 h-4" />
              <span className="text-sm font-medium text-slate-700">Acceso total a todos los módulos</span>
            </label>
            {!form.allAccess && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Módulos permitidos</p>
                <div className="grid grid-cols-2 gap-1 max-h-60 overflow-y-auto p-1">
                  {MODULE_OPTIONS.map((m) => (
                    <label key={m.path} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={form.routes.includes(m.path)} onChange={() => toggleRoute(m.path)} className="accent-amber-500 w-4 h-4" />
                      <span className="text-sm text-slate-700">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.name.trim() || !form.label.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
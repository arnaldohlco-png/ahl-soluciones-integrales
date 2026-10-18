import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserCog, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useRoles } from "@/hooks/useRoles";
import { useConfirm } from "@/components/ConfirmProvider";

export default function UsersManager() {
  const confirm = useConfirm();
  const { roles } = useRoles();
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: "", role: "user" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      setUsers(await base44.entities.User.list());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    base44.auth.me().then(setMe).catch(() => {});
  }, []);

  const roleOptions = [
    { name: "admin", label: "Administrador (acceso total)" },
    { name: "user", label: "Usuario" },
    ...roles.filter((r) => !["admin", "user"].includes(r.name)).map((r) => ({ name: r.name, label: r.label })),
  ];
  const labelOf = (n) => roleOptions.find((r) => r.name === n)?.label || n || "Usuario";

  const openNew = () => { setEditing(null); setForm({ email: "", role: "user" }); setMsg(""); setOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ email: u.email, role: u.role || "user" }); setMsg(""); setOpen(true); };

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      if (editing) {
        await base44.entities.User.update(editing.id, { role: form.role });
      } else {
        const email = form.email.trim();
        if (!email) { setSaving(false); return; }
        try {
          await base44.users.inviteUser(email, form.role);
        } catch (err) {
          // La plataforma solo invita como admin/user: se invita como usuario y luego se asigna el rol
          await base44.users.inviteUser(email, "user");
        }
      }
      setOpen(false);
      await load();
    } catch (e) { console.error(e); setMsg("No se pudo guardar. Verifica tus permisos de administrador."); }
    setSaving(false);
  };

  const remove = async (u) => {
    if (u.id === me?.id) return;
    if (!(await confirm({ title: `¿Eliminar la cuenta de "${u.full_name || u.email}"?`, description: "La persona perderá el acceso a la aplicación.", confirmText: "Sí, eliminar", variant: "destructive" }))) return;
    try {
      await base44.entities.User.delete(u.id);
    } catch (e) { console.error(e); alert("No se pudo eliminar la cuenta"); }
    await load();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><UserCog className="w-5 h-5 text-slate-700" /></div>
          <div>
            <h3 className="font-semibold text-slate-900">Usuarios de acceso</h3>
            <p className="text-sm text-slate-500">Cuentas que ingresan a la aplicación (distintas de los clientes del taller)</p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900"><Plus className="w-4 h-4 mr-1" /> Invitar usuario</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">No hay usuarios.</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{u.full_name || u.email}{u.id === me?.id && <span className="ml-2 text-xs text-slate-400">(tú)</span>}</p>
                <p className="text-xs text-slate-500 truncate">{u.email} · {labelOf(u.role)}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="text-red-500" disabled={u.id === me?.id} onClick={() => remove(u)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuario" : "Invitar usuario"}</DialogTitle>
            <DialogDescription>{editing ? "Cambia el rol de esta cuenta." : "Se enviará una invitación al correo indicado."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Correo *</Label>
              <Input type="email" value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Rol</Label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                {roleOptions.map((r) => <option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
              {!editing && <p className="text-xs text-slate-400 mt-1">Si el rol no se puede asignar en la invitación, entra como Usuario y luego edítalo aquí.</p>}
            </div>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving || (!editing && !form.email.trim())} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : editing ? "Guardar" : "Invitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
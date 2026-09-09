import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wrench, Search } from "lucide-react";

const serviceTypes = ["Mantenimiento", "Reparación", "Diagnóstico", "Cambio de aceite", "Frenos", "Motor", "Eléctrico", "Personalizado"];
const statuses = ["Ingresado", "En proceso", "Completado", "Entregado"];

const empty = {
  motorcycle_id: "", customer_id: "", service_type: "Mantenimiento", description: "",
  status: "Ingresado", mechanic: "", entry_date: "", delivery_date: "", cost: "", parts_used: "",
};

export default function ServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [motos, setMotos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const [o, m, c] = await Promise.all([
        base44.entities.ServiceOrder.list("-created_date", 200),
        base44.entities.Motorcycle.list("-created_date", 200),
        base44.entities.Customer.list("-created_date", 200),
      ]);
      setOrders(o);
      setMotos(m);
      setCustomers(c);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const motoLabel = (id) => {
    const m = motos.find((x) => x.id === id);
    return m ? `${m.brand} ${m.model} (${m.plate || "sin placa"})` : "—";
  };
  const customerName = (id) => customers.find((c) => c.id === id)?.name || "—";

  const openNew = () => {
    const today = new Date().toISOString().split("T")[0];
    setForm({ ...empty, entry_date: today });
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (o) => {
    setForm({
      motorcycle_id: o.motorcycle_id || "",
      customer_id: o.customer_id || "",
      service_type: o.service_type || "Mantenimiento",
      description: o.description || "",
      status: o.status || "Ingresado",
      mechanic: o.mechanic || "",
      entry_date: o.entry_date || "",
      delivery_date: o.delivery_date || "",
      cost: o.cost || "",
      parts_used: o.parts_used || "",
    });
    setEditing(o);
    setOpen(true);
  };

  const onMotoChange = (motoId) => {
    const m = motos.find((x) => x.id === motoId);
    setForm({ ...form, motorcycle_id: motoId, customer_id: m?.customer_id || form.customer_id });
  };

  const save = async () => {
    if (!form.motorcycle_id || !form.customer_id) return;
    setSaving(true);
    const payload = { ...form, cost: form.cost ? Number(form.cost) : 0 };
    try {
      if (editing) {
        await base44.entities.ServiceOrder.update(editing.id, payload);
      } else {
        await base44.entities.ServiceOrder.create(payload);
      }
      setOpen(false);
      await load();
    } catch (e) { console.error(e); alert("Error al guardar"); }
    setSaving(false);
  };

  const remove = async (o) => {
    if (!confirm("¿Eliminar esta orden de servicio?")) return;
    await base44.entities.ServiceOrder.delete(o.id);
    await load();
  };

  const cycleStatus = async (o) => {
    const idx = statuses.indexOf(o.status);
    const next = statuses[(idx + 1) % statuses.length];
    await base44.entities.ServiceOrder.update(o.id, { status: next });
    await load();
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.service_type?.toLowerCase().includes(search.toLowerCase()) ||
      motoLabel(o.motorcycle_id).toLowerCase().includes(search.toLowerCase()) ||
      customerName(o.customer_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusColors = {
    "Ingresado": "bg-blue-100 text-blue-700 border-blue-200",
    "En proceso": "bg-amber-100 text-amber-700 border-amber-200",
    "Completado": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Entregado": "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Órdenes de Servicio</h1>
          <p className="text-slate-500 mt-1">{orders.length} órdenes registradas</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-1" /> Nueva Orden
        </Button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar orden..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {["all", ...statuses].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === s ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {s === "all" ? "Todas" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay órdenes de servicio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">{o.service_type}</h3>
                      <button
                        onClick={() => cycleStatus(o)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 ${statusColors[o.status] || "bg-slate-100"}`}
                        title="Click para cambiar estado"
                      >
                        {o.status}
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{motoLabel(o.motorcycle_id)}</p>
                    <p className="text-xs text-slate-400">Cliente: {customerName(o.customer_id)}</p>
                    {o.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{o.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">${(o.cost || 0).toLocaleString("es-CO")}</p>
                    {o.mechanic && <p className="text-xs text-slate-400">{o.mechanic}</p>}
                    {o.entry_date && <p className="text-xs text-slate-400">Ingreso: {o.entry_date}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(o)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Orden de Servicio" : "Nueva Orden de Servicio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Motocicleta *</Label>
              <Select value={form.motorcycle_id} onValueChange={onMotoChange}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar motocicleta" /></SelectTrigger>
                <SelectContent>
                  {motos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.brand} {m.model} — {m.plate || "sin placa"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente *</Label>
              <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de servicio</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción del trabajo</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mecánico asignado</Label>
                <Input value={form.mechanic} onChange={(e) => setForm({ ...form, mechanic: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Costo total</Label>
                <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de ingreso</Label>
                <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Fecha de entrega</Label>
                <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Repuestos utilizados</Label>
              <Input value={form.parts_used} onChange={(e) => setForm({ ...form, parts_used: e.target.value })} className="mt-1" placeholder="Ej: aceite, filtro, pastillas..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.motorcycle_id || !form.customer_id} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
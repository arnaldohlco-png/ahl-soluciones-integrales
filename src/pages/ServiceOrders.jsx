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
const fuelLevels = ["1/4", "1/2", "3/4", "Full"];

const empty = {
  motorcycle_id: "", customer_id: "", service_type: "Mantenimiento", description: "",
  status: "Ingresado", technician_id: "", mechanic: "", entry_date: "", entry_time: "",
  fuel_level: "1/2", visual_condition: "", accessories: "",
  customer_complaint: "", reported_fault: "", technical_diagnosis: "", recommendations: "",
  tests_performed: "", labor_description: "", labor_cost: "", parts_cost: "", lubricants_cost: "",
  hours_worked: "", technician_commission: "", work_done: "", delivery_recommendations: "",
  warranty: "", delivery_date: "", cost: "", parts_used: "",
};

export default function ServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [motos, setMotos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
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
      const [o, m, c, t] = await Promise.all([
        base44.entities.ServiceOrder.list("-created_date", 200),
        base44.entities.Motorcycle.list("-created_date", 200),
        base44.entities.Customer.list("-created_date", 200),
        base44.entities.Technician.list("-created_date", 100),
      ]);
      setOrders(o); setMotos(m); setCustomers(c); setTechnicians(t);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const motoLabel = (id) => {
    const m = motos.find((x) => x.id === id);
    return m ? `${m.brand} ${m.model} (${m.plate || "sin placa"})` : "—";
  };
  const customerName = (id) => customers.find((c) => c.id === id)?.name || "—";
  const technicianName = (id) => technicians.find((t) => t.id === id)?.name || "";

  const openNew = () => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toTimeString().slice(0, 5);
    setForm({ ...empty, entry_date: today, entry_time: now });
    setEditing(null); setOpen(true);
  };
  const openEdit = (o) => {
    setForm({
      motorcycle_id: o.motorcycle_id || "", customer_id: o.customer_id || "",
      service_type: o.service_type || "Mantenimiento", description: o.description || "",
      status: o.status || "Ingresado", technician_id: o.technician_id || "",
      mechanic: o.mechanic || "", entry_date: o.entry_date || "", entry_time: o.entry_time || "",
      fuel_level: o.fuel_level || "1/2", visual_condition: o.visual_condition || "", accessories: o.accessories || "",
      customer_complaint: o.customer_complaint || "", reported_fault: o.reported_fault || "",
      technical_diagnosis: o.technical_diagnosis || "", recommendations: o.recommendations || "",
      tests_performed: o.tests_performed || "", labor_description: o.labor_description || "",
      labor_cost: o.labor_cost ?? "", parts_cost: o.parts_cost ?? "", lubricants_cost: o.lubricants_cost ?? "",
      hours_worked: o.hours_worked ?? "", technician_commission: o.technician_commission ?? "",
      work_done: o.work_done || "", delivery_recommendations: o.delivery_recommendations || "",
      warranty: o.warranty || "", delivery_date: o.delivery_date || "",
      cost: o.cost ?? "", parts_used: o.parts_used || "",
    });
    setEditing(o); setOpen(true);
  };

  const onMotoChange = (motoId) => {
    const m = motos.find((x) => x.id === motoId);
    setForm({ ...form, motorcycle_id: motoId, customer_id: m?.customer_id || form.customer_id });
  };

  const numFields = ["labor_cost", "parts_cost", "lubricants_cost", "hours_worked", "technician_commission", "cost"];

  const save = async () => {
    if (!form.motorcycle_id || !form.customer_id) return;
    setSaving(true);
    const payload = { ...form };
    numFields.forEach((f) => { payload[f] = Number(payload[f]) || 0; });
    try {
      if (editing) { await base44.entities.ServiceOrder.update(editing.id, payload); }
      else { await base44.entities.ServiceOrder.create(payload); }
      setOpen(false); await load();
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
          <Input placeholder="Buscar orden..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto">
          {["all", ...statuses].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${filterStatus === s ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
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
                      <button onClick={() => cycleStatus(o)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 ${statusColors[o.status] || "bg-slate-100"}`}
                        title="Click para cambiar estado">{o.status}</button>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{motoLabel(o.motorcycle_id)}</p>
                    <p className="text-xs text-slate-400">Cliente: {customerName(o.customer_id)}</p>
                    {technicianName(o.technician_id) && <p className="text-xs text-slate-400">Técnico: {technicianName(o.technician_id)}</p>}
                    {o.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{o.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">${(o.cost || 0).toLocaleString("es-CO")}</p>
                    {o.mechanic && <p className="text-xs text-slate-400">{o.mechanic}</p>}
                    {o.entry_date && <p className="text-xs text-slate-400">Ingreso: {o.entry_date}</p>}
                    {o.delivery_date && <p className="text-xs text-slate-400">Entrega: {o.delivery_date}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(o)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar Orden de Servicio" : "Nueva Orden de Servicio"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Motocicleta *</Label>
                <Select value={form.motorcycle_id} onValueChange={onMotoChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{motos.map((m) => <SelectItem key={m.id} value={m.id}>{m.brand} {m.model} — {m.plate || "sin placa"}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente *</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo de servicio</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{serviceTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Técnico responsable</Label>
                <Select value={form.technician_id} onValueChange={(v) => setForm({ ...form, technician_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    {technicians.filter(t => t.status === "Activo").map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descripción del trabajo</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={2} /></div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Recepción</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><Label>Fecha ingreso</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} className="mt-1" /></div>
                <div><Label>Hora</Label><Input type="time" value={form.entry_time} onChange={(e) => setForm({ ...form, entry_time: e.target.value })} className="mt-1" /></div>
                <div>
                  <Label>Combustible</Label>
                  <Select value={form.fuel_level} onValueChange={(v) => setForm({ ...form, fuel_level: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{fuelLevels.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Fecha entrega</Label><Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><Label>Estado visual</Label><Input value={form.visual_condition} onChange={(e) => setForm({ ...form, visual_condition: e.target.value })} className="mt-1" placeholder="Rayones, abolladuras..." /></div>
                <div><Label>Accesorios entregados</Label><Input value={form.accessories} onChange={(e) => setForm({ ...form, accessories: e.target.value })} className="mt-1" placeholder="Espejos, llaves, etc." /></div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Diagnóstico</p>
              <div className="space-y-3">
                <div><Label>Queja del cliente</Label><Textarea value={form.customer_complaint} onChange={(e) => setForm({ ...form, customer_complaint: e.target.value })} className="mt-1" rows={2} /></div>
                <div><Label>Falla reportada</Label><Textarea value={form.reported_fault} onChange={(e) => setForm({ ...form, reported_fault: e.target.value })} className="mt-1" rows={2} /></div>
                <div><Label>Diagnóstico técnico</Label><Textarea value={form.technical_diagnosis} onChange={(e) => setForm({ ...form, technical_diagnosis: e.target.value })} className="mt-1" rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Pruebas realizadas</Label><Textarea value={form.tests_performed} onChange={(e) => setForm({ ...form, tests_performed: e.target.value })} className="mt-1" rows={2} /></div>
                  <div><Label>Recomendaciones</Label><Textarea value={form.recommendations} onChange={(e) => setForm({ ...form, recommendations: e.target.value })} className="mt-1" rows={2} /></div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Mano de obra y costos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><Label>Horas trabajadas</Label><Input type="number" value={form.hours_worked} onChange={(e) => setForm({ ...form, hours_worked: e.target.value })} className="mt-1" /></div>
                <div><Label>Costo mano de obra</Label><Input type="number" value={form.labor_cost} onChange={(e) => setForm({ ...form, labor_cost: e.target.value })} className="mt-1" /></div>
                <div><Label>Comisión técnico</Label><Input type="number" value={form.technician_commission} onChange={(e) => setForm({ ...form, technician_commission: e.target.value })} className="mt-1" /></div>
                <div><Label>Costo repuestos</Label><Input type="number" value={form.parts_cost} onChange={(e) => setForm({ ...form, parts_cost: e.target.value })} className="mt-1" /></div>
                <div><Label>Costo lubricantes</Label><Input type="number" value={form.lubricants_cost} onChange={(e) => setForm({ ...form, lubricants_cost: e.target.value })} className="mt-1" /></div>
                <div><Label>Costo total</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" /></div>
              </div>
              <div className="mt-3"><Label>Descripción de mano de obra</Label><Textarea value={form.labor_description} onChange={(e) => setForm({ ...form, labor_description: e.target.value })} className="mt-1" rows={2} /></div>
              <div className="mt-3"><Label>Repuestos utilizados</Label><Input value={form.parts_used} onChange={(e) => setForm({ ...form, parts_used: e.target.value })} className="mt-1" placeholder="Ej: aceite, filtro, pastillas..." /></div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Entrega</p>
              <div><Label>Trabajo realizado</Label><Textarea value={form.work_done} onChange={(e) => setForm({ ...form, work_done: e.target.value })} className="mt-1" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div><Label>Recomendaciones de entrega</Label><Textarea value={form.delivery_recommendations} onChange={(e) => setForm({ ...form, delivery_recommendations: e.target.value })} className="mt-1" rows={2} /></div>
                <div><Label>Garantía</Label><Input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} className="mt-1" placeholder="Ej: 3 meses / 5000 km" /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.motorcycle_id || !form.customer_id} className="bg-amber-500 hover:bg-amber-600 text-slate-900">{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { fetchAllCustomers } from "@/lib/customersLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  CalendarPlus, MessageCircle, Check, X, CheckCheck, Pencil, Trash2,
  Calendar, Clock, User, Bike, Loader2
} from "lucide-react";
import moment from "moment";
import { matchAny } from "@/lib/search";
import { useConfirm } from "@/components/ConfirmProvider";
import { wrapWhatsApp } from "@/lib/whatsappTemplate";

const STATUS = {
  Pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700 border-amber-300" },
  Confirmada: { label: "Confirmada", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  Cancelada: { label: "Cancelada", cls: "bg-rose-100 text-rose-700 border-rose-300" },
  Completada: { label: "Completada", cls: "bg-slate-200 text-slate-600 border-slate-300" },
};

const fmtDate = (d) => (d ? moment(d).format("DD/MM/YYYY") : "—");

const sanitizePhone = (p) => {
  let n = (p || "").replace(/\D/g, "");
  if (n.length === 10) n = "57" + n;
  return n;
};

const emptyForm = {
  customer_id: "",
  motorcycle_id: "",
  type: "Cita",
  date: "",
  time: "",
  service_requested: "",
  message: "",
  notes: "",
};

export default function Citas() {
  const confirm = useConfirm();
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [motorcycles, setMotorcycles] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("Todas");
  const [search, setSearch] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [custOpen, setCustOpen] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [apts, custs, motos, comps] = await Promise.all([
      fetchAll("Appointment", "-date"),
      fetchAllCustomers(),
      fetchAll("Motorcycle"),
      base44.entities.Company.list(),
    ]);
    setAppointments(apts);
    setCustomers(custs);
    setMotorcycles(motos);
    setCompany(comps[0] || null);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const customerById = useMemo(() => {
    const m = {};
    customers.forEach((c) => (m[c.id] = c));
    return m;
  }, [customers]);

  const motoById = useMemo(() => {
    const m = {};
    motorcycles.forEach((c) => (m[c.id] = c));
    return m;
  }, [motorcycles]);

  const customerMotos = useMemo(
    () => motorcycles.filter((m) => m.customer_id === form.customer_id),
    [motorcycles, form.customer_id]
  );

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      if (filter !== "Todas" && a.status !== filter) return false;
      if (search) {
        const moto = motoById[a.motorcycle_id];
        const motoStr = moto ? `${moto.brand} ${moto.model} ${moto.plate || ""}` : "";
        if (!matchAny(search, a.customer_name, customerById[a.customer_id]?.name, a.service_requested, motoStr)) return false;
      }
      return true;
    });
  }, [appointments, filter, search, customerById]);

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setCustSearch("");
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setForm({
      customer_id: a.customer_id || "",
      motorcycle_id: a.motorcycle_id || "",
      type: a.type || "Cita",
      date: a.date || "",
      time: a.time || "",
      service_requested: a.service_requested || "",
      message: a.message || "",
      notes: a.notes || "",
    });
    setEditingId(a.id);
    setCustSearch(a.customer_name || customerById[a.customer_id]?.name || "");
    setModalOpen(true);
  };

  const onCustomerChange = (cid) => {
    const c = customerById[cid];
    setCustSearch(c?.name || "");
    setForm((f) => ({
      ...f,
      customer_id: cid,
      motorcycle_id: "",
      phone: c?.whatsapp || c?.phone || "",
    }));
  };

  const customerMatches = customers.filter((c) =>
    c.name?.toLowerCase().includes(custSearch.toLowerCase())
  );

  const buildMessage = (a) => {
    const c = customerById[a.customer_id];
    const name = a.customer_name || c?.name || "";
    const fecha = fmtDate(a.date);
    const hora = a.time || "";
    const svc = a.service_requested || "";
    if (a.message) return a.message;
    if (a.type === "Recordatorio") {
      const intro = `su motocicleta podría necesitar${svc ? `: ${svc}` : " un servicio"}.`;
      const body = "Agende su cita respondiendo a este mensaje.";
      return wrapWhatsApp({ name, intro, body, status: a.status, statusLabel: "Estado de la cita" });
    }
    const intro = `su cita está agendada para el ${fecha}${hora ? ` a las ${hora}` : ""}${svc ? ` para ${svc}` : ""}.`;
    const body = "Por favor confirme su asistencia respondiendo a este mensaje.";
    return wrapWhatsApp({ name, intro, body, status: a.status, statusLabel: "Estado de la cita" });
  };

  const sendWhatsApp = async (a) => {
    const c = customerById[a.customer_id];
    const phone = sanitizePhone(a.phone || c?.whatsapp || c?.phone);
    if (!phone) { alert("El cliente no tiene teléfono/WhatsApp"); return; }
    const text = encodeURIComponent(buildMessage(a));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
    if (!a.whatsapp_sent) {
      await base44.entities.Appointment.update(a.id, { whatsapp_sent: true });
      setAppointments((arr) => arr.map((x) => (x.id === a.id ? { ...x, whatsapp_sent: true } : x)));
    }
  };

  const setStatus = async (a, status, extra = {}) => {
    if (!(await confirm({ title: "¿Cambiar el estado de la cita?", description: `De "${a.status}" a "${status}"`, confirmText: "Sí", cancelText: "No" }))) return;
    await base44.entities.Appointment.update(a.id, { status, ...extra });
    setAppointments((arr) => arr.map((x) => (x.id === a.id ? { ...x, status, ...extra } : x)));
  };

  const buildRescheduleMessage = (a) => {
    const c = customerById[a.customer_id];
    const name = a.customer_name || c?.name || "";
    const fecha = fmtDate(a.date);
    const hora = a.time || "";
    const intro = `su cita del ${fecha}${hora ? ` a las ${hora}` : ""} ha sido cancelada.`;
    const body = "¿Desea reagendarla? Responda a este mensaje para coordinar una nueva fecha.";
    return wrapWhatsApp({ name, intro, body, status: "Cancelada", statusLabel: "Estado de la cita" });
  };

  const cancelAppointment = async (a) => {
    if (!(await confirm({ title: "¿Cancelar la cita?", description: "Se preguntará al cliente si desea reagendar.", confirmText: "Sí, cancelar", cancelText: "No", variant: "destructive" }))) return;
    await base44.entities.Appointment.update(a.id, { status: "Cancelada" });
    setAppointments((arr) => arr.map((x) => (x.id === a.id ? { ...x, status: "Cancelada" } : x)));
    const c = customerById[a.customer_id];
    const phone = sanitizePhone(a.phone || c?.whatsapp || c?.phone);
    if (!phone) { alert("El cliente no tiene teléfono para enviar el mensaje de reagendamiento"); return; }
    const text = encodeURIComponent(buildRescheduleMessage(a));
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  };

  const completeAppointment = async (a) => {
    if (!(await confirm({ title: "¿Marcar como completada y eliminar?", confirmText: "Sí", cancelText: "No", variant: "destructive" }))) return;
    await base44.entities.Appointment.delete(a.id);
    setAppointments((arr) => arr.filter((x) => x.id !== a.id));
  };

  const save = async () => {
    if (!form.customer_id) { alert("Seleccione un cliente"); return; }
    if (!form.date) { alert("Seleccione una fecha"); return; }
    setSaving(true);
    const c = customerById[form.customer_id];
    const payload = {
      customer_id: form.customer_id,
      customer_name: c?.name || "",
      motorcycle_id: form.motorcycle_id || null,
      phone: form.phone || c?.whatsapp || c?.phone || "",
      type: form.type,
      date: form.date,
      time: form.time,
      service_requested: form.service_requested,
      message: form.message,
      notes: form.notes,
    };
    try {
      if (editingId) {
        await base44.entities.Appointment.update(editingId, payload);
      } else {
        payload.status = "Pendiente";
        const created = await base44.entities.Appointment.create(payload);
        setAppointments((arr) => [created, ...arr]);
        setModalOpen(false);
        setSaving(false);
        return;
      }
      setAppointments((arr) => arr.map((x) => (x.id === editingId ? { ...x, ...payload } : x)));
      setModalOpen(false);
    } catch (e) {
      alert("No se pudo guardar: " + (e?.message || e));
    }
    setSaving(false);
  };

  const remove = async (a) => {
    if (!(await confirm({ title: "¿Eliminar esta cita/recordatorio?", confirmText: "Sí, eliminar", cancelText: "No", variant: "destructive" }))) return;
    await base44.entities.Appointment.delete(a.id);
    setAppointments((arr) => arr.filter((x) => x.id !== a.id));
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-amber-500" /> Citas y Recordatorios
          </h1>
          <p className="text-sm text-slate-500">{appointments.length} registros</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900 w-full sm:w-auto">
          <CalendarPlus className="w-4 h-4 mr-1" /> Nueva cita
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Buscar por cliente o servicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {["Todas", "Pendiente", "Confirmada", "Cancelada", "Completada"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                filter === s
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-lg">
          No hay citas ni recordatorios
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const st = STATUS[a.status] || STATUS.Pendiente;
            const moto = motoById[a.motorcycle_id];
            return (
              <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {a.type}
                      </span>
                      {a.whatsapp_sent && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
                          <CheckCheck className="w-3 h-3" /> Enviado
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {a.customer_name || customerById[a.customer_id]?.name || "—"}
                    </p>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" /> {fmtDate(a.date)}
                        {a.time && <span className="flex items-center gap-1 ml-2"><Clock className="w-3.5 h-3.5" /> {a.time}</span>}
                      </p>
                      {a.service_requested && <p> Servicio: {a.service_requested}</p>}
                      {moto && <p className="flex items-center gap-1.5"><Bike className="w-3.5 h-3.5" /> {moto.brand} {moto.model}{moto.plate ? ` · ${moto.plate}` : ""}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => sendWhatsApp(a)} title="Enviar por WhatsApp" className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    {a.status === "Pendiente" && (
                      <button onClick={() => setStatus(a, "Confirmada", { confirmed_at: new Date().toISOString() })} title="Confirmar" className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-600">
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    {a.status !== "Cancelada" && a.status !== "Completada" && (
                      <button onClick={() => cancelAppointment(a)} title="Cancelar y reagendar" className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {a.status === "Confirmada" && (
                      <button onClick={() => completeAppointment(a)} title="Marcar completada y eliminar" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600">
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} title="Editar" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(a)} title="Eliminar" className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Nueva"} cita / recordatorio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cita">Cita (con fecha y servicio)</SelectItem>
                  <SelectItem value="Recordatorio">Recordatorio (solo avisa que necesita servicio)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente *</Label>
              <div className="relative">
                <Input
                  placeholder="Buscar cliente por nombre..."
                  value={custSearch}
                  onChange={(e) => {
                    setCustSearch(e.target.value);
                    setForm((f) => ({ ...f, customer_id: "", motorcycle_id: "" }));
                    setCustOpen(true);
                  }}
                  onFocus={() => setCustOpen(true)}
                  onBlur={() => setTimeout(() => setCustOpen(false), 150)}
                />
                {custOpen && customerMatches.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                    {customerMatches.slice(0, 50).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); onCustomerChange(c.id); setCustOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 ${c.id === form.customer_id ? "bg-amber-50 font-medium" : ""}`}
                      >
                        {c.name}{c.phone ? <span className="text-slate-400 ml-1">· {c.phone}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {form.customer_id && customerMotos.length > 0 && (
              <div>
                <Label>Motocicleta (opcional)</Label>
                <Select value={form.motorcycle_id || ""} onValueChange={(v) => setForm((f) => ({ ...f, motorcycle_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin motocicleta" /></SelectTrigger>
                  <SelectContent>
                    {customerMotos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.brand} {m.model}{m.plate ? ` · ${m.plate}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Hora</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Servicio solicitado</Label>
              <Input
                placeholder={form.type === "Recordatorio" ? "Ej: cambio de aceite, mantenimiento..." : "Ej: Mantenimiento, revisión de frenos..."}
                value={form.service_requested}
                onChange={(e) => setForm((f) => ({ ...f, service_requested: e.target.value }))}
              />
            </div>
            <div>
              <Label>Mensaje personalizado (opcional)</Label>
              <Textarea
                rows={3}
                placeholder="Si lo deja vacío se generará un mensaje automático al enviar por WhatsApp."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notas internas</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
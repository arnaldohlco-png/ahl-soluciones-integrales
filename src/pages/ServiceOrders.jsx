import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { fetchAllCustomers } from "@/lib/customersLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Wrench, Search, FileText, ShoppingCart, Printer, AlertTriangle } from "lucide-react";
import ExportImport from "@/components/ExportImport";
import ServiceItemsEditor from "@/components/ServiceItemsEditor";
import OrderPhotosUploader from "@/components/OrderPhotosUploader";
import WhatsAppButton from "@/components/WhatsAppButton";
import SearchableSelect from "@/components/SearchableSelect";
import PrintableDocument from "@/components/PrintableDocument";
import { buildDocMessage } from "@/lib/docMessages";
import { getNextDocNumber, getPrefix } from "@/lib/docNumbering";
import { fetchAllProducts } from "@/lib/productsLoader";
import { matchAny } from "@/lib/search";

const serviceTypes = ["Mantenimiento", "Reparación", "Diagnóstico", "Cambio de aceite", "Frenos", "Motor", "Eléctrico", "Personalizado"];
const statuses = ["Ingresado", "En proceso", "Completado", "Entregado", "Cobrada"];
const fuelLevels = ["1/4", "1/2", "3/4", "Full"];

const empty = {
  motorcycle_id: "", customer_id: "", service_type: "Mantenimiento", description: "",
  status: "Ingresado", technician_id: "", mechanic: "", entry_date: "", entry_time: "",
  fuel_level: "1/2", visual_condition: "", accessories: "",
  customer_complaint: "", reported_fault: "", technical_diagnosis: "", recommendations: "",
  tests_performed: "", labor_description: "", labor_cost: "", parts_cost: "", lubricants_cost: "",
  hours_worked: "", technician_commission: "", work_done: "", delivery_recommendations: "",
  warranty: "", delivery_date: "", cost: "", parts_used: "",
  previous_mileage: "", current_mileage: "", kms_traveled: 0, oil_change_interval: 1000, next_oil_change: "",
  photos: "[]", admin_footer: "",
};

export default function ServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [motos, setMotos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [company, setCompany] = useState(null);
  const [serviceItems, setServiceItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [printOrder, setPrintOrder] = useState(null);
  const [invoices, setInvoices] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [o, m, c, t, p, sv, comp, inv] = await Promise.all([
        fetchAll("ServiceOrder"),
        fetchAll("Motorcycle"),
        fetchAllCustomers(),
        fetchAll("Technician"),
        fetchAllProducts(),
        fetchAll("Service"),
        base44.entities.Company.list("-created_date", 10),
        fetchAll("Invoice"),
      ]);
      setOrders(o); setMotos(m); setCustomers(c); setTechnicians(t);
      setProducts(p); setServices(sv); if (comp.length > 0) setCompany(comp[0]);
      setInvoices(inv);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Auto-fill cost from selected products/services
  useEffect(() => {
    const total = serviceItems.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    if (total > 0) setForm((f) => ({ ...f, cost: total }));
  }, [serviceItems]);

  const motoLabel = (id) => {
    const m = motos.find((x) => x.id === id);
    return m ? `${m.brand} ${m.model} (${m.plate || "sin placa"})` : "—";
  };
  const customerName = (id) => customers.find((c) => c.id === id)?.name || "—";
  const customerPhone = (id) => { const c = customers.find((x) => x.id === id); return c?.whatsapp || c?.phone || ""; };
  const buildOrderMsg = (o) => {
    const moto = motos.find((m) => m.id === o.motorcycle_id);
    const motoInfo = moto ? `${moto.brand} ${moto.model}${moto.plate ? ` (Placa: ${moto.plate})` : ""}` : "";
    return `Hola ${customerName(o.customer_id)}, te informamos que tu motocicleta ${motoInfo} tiene el estado: ${o.status}. Tipo de servicio: ${o.service_type}. Saludos, HR MOTOCICLETAS`;
  };
  const technicianName = (id) => technicians.find((t) => t.id === id)?.name || "";

  const itemsTotal = (o) => {
    try {
      const items = JSON.parse(o.service_items || "[]");
      const t = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
      return t > 0 ? t : (o.cost || 0);
    } catch { return o.cost || 0; }
  };

  const openNew = () => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toTimeString().slice(0, 5);
    setForm({ ...empty, entry_date: today, entry_time: now, admin_footer: company?.footer_text || "" });
    setServiceItems([]); setEditing(null); setOpen(true);
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
      previous_mileage: o.previous_mileage ?? "", current_mileage: o.current_mileage ?? "", kms_traveled: o.kms_traveled ?? 0,
      oil_change_interval: o.oil_change_interval || 1000, next_oil_change: o.next_oil_change ?? "",
      photos: o.photos || "[]", admin_footer: o.admin_footer || company?.footer_text || "",
    });
    try { setServiceItems(JSON.parse(o.service_items || "[]")); } catch { setServiceItems([]); }
    setEditing(o); setOpen(true);
  };

  const onMotoChange = (motoId) => {
    const m = motos.find((x) => x.id === motoId);
    // Km anterior = current_mileage de la última orden de esta moto
    const motoOrders = orders.filter((o) => o.motorcycle_id === motoId && o.current_mileage);
    const lastOrder = motoOrders.sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || ""))[0];
    const prevKm = lastOrder ? Number(lastOrder.current_mileage) : "";
    setForm({ ...form, motorcycle_id: motoId, customer_id: m?.customer_id || form.customer_id, previous_mileage: prevKm, kms_traveled: prevKm ? Math.max(0, (Number(form.current_mileage) || 0) - Number(prevKm)) : 0 });
  };

  const onCurrentMileageChange = (val) => {
    const prev = Number(form.previous_mileage) || 0;
    const cur = Number(val) || 0;
    setForm({ ...form, current_mileage: val, kms_traveled: Math.max(0, cur - prev), next_oil_change: cur + (Number(form.oil_change_interval) || 0) });
  };

  const numFields = ["labor_cost", "parts_cost", "lubricants_cost", "hours_worked", "technician_commission", "cost", "previous_mileage", "current_mileage", "kms_traveled", "oil_change_interval", "next_oil_change"];

  const save = async () => {
    if (!form.motorcycle_id || !form.customer_id) return;
    setSaving(true);
    const nextOil = (Number(form.current_mileage) || 0) + (Number(form.oil_change_interval) || 0);
    const payload = { ...form, service_items: JSON.stringify(serviceItems), next_oil_change: nextOil };
    if (payload.status === "Entregado" && !payload.delivery_date) payload.delivery_date = new Date().toISOString().split("T")[0];
    numFields.forEach((f) => { payload[f] = Number(payload[f]) || 0; });
    try {
      if (editing) { await base44.entities.ServiceOrder.update(editing.id, payload); }
      else {
        const orderNumber = await getNextDocNumber("ServiceOrder", getPrefix(company, "order"));
        await base44.entities.ServiceOrder.create({ ...payload, number: orderNumber });
      }
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
    const payload = { status: next };
    if (next === "Entregado") payload.delivery_date = new Date().toISOString().split("T")[0];
    await base44.entities.ServiceOrder.update(o.id, payload);
    await load();
  };

  const convertToQuotation = async (o) => {
    try {
      const items = JSON.parse(o.service_items || "[]");
      const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0) || (o.cost || 0);
      const iva = Math.round(subtotal * 0.19);
      await base44.entities.Invoice.create({
        customer_id: o.customer_id, customer_name: customerName(o.customer_id),
        type: "Cotización", number: await getNextDocNumber("Invoice", getPrefix(company, "quote")),
        date: new Date().toISOString().slice(0, 10),
        items: o.service_items || JSON.stringify([{ name: o.service_type, quantity: 1, unit_price: o.cost, subtotal: o.cost }]),
        subtotal, iva, total: subtotal + iva, status: "Pendiente", related_order_id: o.id,
      });
      await load();
      alert("Cotización creada correctamente");
    } catch (e) { console.error(e); alert("Error al crear cotización"); }
  };

  const convertToSale = async (o) => {
    try {
      const items = JSON.parse(o.service_items || "[]");
      const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0) || (o.cost || 0);
      const iva = Math.round(subtotal * 0.19);
      const saleNumber = await getNextDocNumber("Sale", getPrefix(company, "sale"));
      await base44.entities.Sale.create({
        number: saleNumber,
        customer_id: o.customer_id, customer_name: customerName(o.customer_id),
        date: new Date().toISOString().slice(0, 10),
        items: o.service_items || JSON.stringify([{ name: o.service_type, quantity: 1, unit_price: o.cost, subtotal: o.cost }]),
        subtotal, iva_total: iva, discount: 0, total: subtotal + iva,
        payment_method: "Efectivo", payment_type: "Contado", status: "Pagada", balance: 0,
      });
      await load();
      alert("Venta creada correctamente");
    } catch (e) { console.error(e); alert("Error al crear venta"); }
  };

  // Órdenes que ya se convirtieron en cotización/factura no deben seguir apareciendo
  const convertedOrderIds = new Set(invoices.map((i) => i.related_order_id).filter(Boolean));
  const filtered = orders.filter((o) => {
    if (convertedOrderIds.has(o.id)) return false;
    const matchSearch = matchAny(search, o.service_type, motoLabel(o.motorcycle_id), customerName(o.customer_id), o.number, o.description);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusColors = {
    "Ingresado": "bg-blue-100 text-blue-700 border-blue-200",
    "En proceso": "bg-amber-100 text-amber-700 border-amber-200",
    "Completado": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Entregado": "bg-slate-100 text-slate-600 border-slate-200",
    "Cobrada": "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Órdenes de Servicio</h1>
            <p className="text-slate-500 mt-1">{filtered.length} {filtered.length === 1 ? "orden" : "órdenes"} en lista</p>
          </div>
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Nueva Orden</span><span className="sm:hidden">Nueva</span>
          </Button>
        </div>
        <div className="mt-3">
          <ExportImport entityName="ServiceOrder" fields={["motorcycle_id", "customer_id", "service_type", "description", "status", "technician_id", "mechanic", "entry_date", "delivery_date", "cost", "previous_mileage", "current_mileage", "oil_change_interval", "next_oil_change", "parts_used"]} />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar orden..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 overflow-x-auto -mx-1 px-1">
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
                    <p className="text-lg font-bold text-slate-900">${itemsTotal(o).toLocaleString("es-CO")}</p>
                    {o.mechanic && <p className="text-xs text-slate-400">{o.mechanic}</p>}
                    {o.entry_date && <p className="text-xs text-slate-400">Ingreso: {o.entry_date}</p>}
                    {o.delivery_date && <p className="text-xs text-slate-400">Entrega: {o.delivery_date}</p>}
                  </div>
                  <div className="flex gap-1">
                    <WhatsAppButton phone={customerPhone(o.customer_id)} message={buildDocMessage("order", o, company, { motorcycle: motos.find((m) => m.id === o.motorcycle_id), customer: customers.find((c) => c.id === o.customer_id) })} label="Enviar por WhatsApp" />
                    <button onClick={() => setPrintOrder(o)} title="Imprimir" className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"><Printer className="w-4 h-4" /></button>
                    {o.status !== "Cobrada" && (
                      <>
                        <button onClick={() => convertToQuotation(o)} title="Convertir a cotización" className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => convertToSale(o)} title="Convertir a venta" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><ShoppingCart className="w-4 h-4" /></button>
                      </>
                    )}
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
              <SearchableSelect
                label="Motocicleta"
                placeholder="Buscar por placa, marca o modelo..."
                value={form.motorcycle_id}
                onValueChange={(id) => onMotoChange(id)}
                required
                items={motos.map((m) => ({ id: m.id, label: `${m.brand} ${m.model}`, sublabel: m.plate ? `Placa: ${m.plate}` : "Sin placa" }))}
              />
              <SearchableSelect
                label="Cliente"
                placeholder="Buscar cliente..."
                value={form.customer_id}
                onValueChange={(v) => setForm({ ...form, customer_id: v })}
                required
                items={customers.map((c) => ({ id: c.id, label: c.name, sublabel: c.document_number || c.phone }))}
              />
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
              <SearchableSelect
                label="Técnico responsable"
                placeholder="Buscar técnico..."
                value={form.technician_id}
                onValueChange={(v) => setForm({ ...form, technician_id: v })}
                items={technicians.filter(t => t.status === "Activo").map((t) => ({ id: t.id, label: t.name, sublabel: [t.document_number, t.specialty].filter(Boolean).join(" · ") }))}
              />
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
              <div className="mt-3">
                <Label>Fotos de la moto</Label>
                <div className="mt-1">
                  <OrderPhotosUploader value={form.photos} onChange={(v) => setForm({ ...form, photos: v })} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Kilometraje y mantenimiento</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div><Label>Km anterior</Label><Input type="number" value={form.previous_mileage} onChange={(e) => setForm({ ...form, previous_mileage: e.target.value, kms_traveled: Math.max(0, (Number(form.current_mileage) || 0) - (Number(e.target.value) || 0)) })} className="mt-1" /></div>
                <div><Label>Km actual</Label><Input type="number" value={form.current_mileage} onChange={(e) => onCurrentMileageChange(e.target.value)} className="mt-1" /></div>
                <div><Label>Km recorridos</Label><Input type="number" value={form.kms_traveled} readOnly className="mt-1 bg-amber-50 font-semibold" placeholder="Auto" /></div>
                <div>
                  <Label>Intervalo aceite</Label>
                  <Select value={String(form.oil_change_interval)} onValueChange={(v) => setForm({ ...form, oil_change_interval: Number(v), next_oil_change: (Number(form.current_mileage) || 0) + Number(v) })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1000 km</SelectItem>
                      <SelectItem value="1500">1500 km</SelectItem>
                      <SelectItem value="2000">2000 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Próx. cambio</Label><Input type="number" value={form.current_mileage && form.oil_change_interval ? Number(form.current_mileage) + Number(form.oil_change_interval) : ""} readOnly className="mt-1 bg-slate-50" placeholder="Auto" /></div>
              </div>
              {form.current_mileage && form.oil_change_interval && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Próximo cambio de aceite: {(Number(form.current_mileage) + Number(form.oil_change_interval)).toLocaleString()} km</p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Productos y servicios</p>
              <ServiceItemsEditor items={serviceItems} setItems={setServiceItems} products={products} services={services} /> 

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

      {printOrder && (
        <PrintableDocument
          type="order"
          doc={printOrder}
          company={company}
          extras={{ motorcycle: motos.find((m) => m.id === printOrder.motorcycle_id), customer: customers.find((c) => c.id === printOrder.customer_id), technician: technicians.find((t) => t.id === printOrder.technician_id) }}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}
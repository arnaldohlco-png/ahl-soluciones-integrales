import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { fetchAllCustomers } from "@/lib/customersLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Plus, Trash2, FileCheck, Loader2, Pencil, Printer, MessageCircle, Search, Phone } from "lucide-react";
import moment from "moment";
import { momentBogota } from "@/lib/localDate";
import { getNextDocNumber, getPrefix } from "@/lib/docNumbering";
import WhatsAppButton from "@/components/WhatsAppButton";
import PrintableDocument from "@/components/PrintableDocument";
import LiveItemSearch from "@/components/LiveItemSearch";
import { buildDocMessage } from "@/lib/docMessages";
import { fetchAllProducts } from "@/lib/productsLoader";
import { matchAny } from "@/lib/search";
import SearchableSelect from "@/components/SearchableSelect";
import { useConfirm } from "@/components/ConfirmProvider";
import { Image } from "@/components/ui/image";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function Quotations() {
  const confirm = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ customer_id: "", date: momentBogota().format("YYYY-MM-DD") });
  const [items, setItems] = useState([]);
  const [printQ, setPrintQ] = useState(null);
  const [search, setSearch] = useState("");

  const customerPhone = (id) => { const c = customers.find((x) => x.id === id); return c?.whatsapp || c?.phone || ""; };
  const custName = (id) => customers.find((c) => c.id === id)?.name || "—";

  const createCustomer = async (name) => {
    const c = await base44.entities.Customer.create({ name });
    setCustomers((prev) => [c, ...prev]);
    return { id: c.id, label: c.name, sublabel: [c.document_number, c.phone].filter(Boolean).join(" · ") };
  };

  const filtered = quotes.filter((q) =>
    matchAny(search, q.number, q.customer_name, custName(q.customer_id))
  );

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [q, c, p, s, comps] = await Promise.all([
        base44.entities.Invoice.filter({ type: "Cotización" }, "-created_date", 5000),
        fetchAllCustomers(),
        fetchAllProducts(),
        fetchAll("Service"),
        base44.entities.Company.list("-created_date", 1),
      ]);
      setQuotes(q); setCustomers(c); setProducts(p); setServices(s.filter((x) => x.status === "Activo"));
      if (comps.length > 0) setCompany(comps[0]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ customer_id: "", date: momentBogota().format("YYYY-MM-DD") });
    setItems([]);
    setModalOpen(true);
  };

  // Atajo global Ctrl+C (lo dispara el Layout): evento si ya estamos aquí, o estado de navegación si venimos de otra página
  const openNewRef = useRef(openNew);
  openNewRef.current = openNew;
  useEffect(() => {
    const h = () => openNewRef.current();
    window.addEventListener("new-quotation", h);
    return () => window.removeEventListener("new-quotation", h);
  }, []);
  useEffect(() => {
    if (!loading && location.state?.newQuote) {
      openNewRef.current();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [loading, location.state]);

  const openEdit = (q) => {
    setEditing(q);
    let parsedItems = [];
    try { parsedItems = JSON.parse(q.items || "[]"); } catch { parsedItems = []; }
    setItems(parsedItems);
    setForm({ customer_id: q.customer_id || "", date: q.date ? moment(q.date).format("YYYY-MM-DD") : momentBogota().format("YYYY-MM-DD") });
    setModalOpen(true);
  };

  const addItem = (product) => {
    setItems([{ name: product.name, quantity: 1, unit_price: product.price || 0, subtotal: product.price || 0, product_id: product.id }, ...items]);
  };

  const addService = (service) => {
    setItems([{ name: service.name, quantity: 1, unit_price: service.price || 0, subtotal: service.price || 0, service_id: service.id }, ...items]);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    updated[idx].subtotal = (Number(updated[idx].quantity) || 0) * (Number(updated[idx].unit_price) || 0);
    setItems(updated);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const iva = 0;
  const total = subtotal;

  const save = async () => {
    if (!form.customer_id || items.length === 0) return;
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Invoice.update(editing.id, {
          customer_id: form.customer_id, customer_name: custName(form.customer_id),
          date: form.date, items: JSON.stringify(items),
          subtotal, iva, discount: 0, total,
        });
      } else {
        await base44.entities.Invoice.create({
          customer_id: form.customer_id, customer_name: custName(form.customer_id),
          type: "Cotización", number: await getNextDocNumber("Invoice", getPrefix(company, "quote")),
          date: form.date, items: JSON.stringify(items),
          subtotal, iva, discount: 0, total, status: "Pendiente",
          payment_terms: "Contado",
        });
      }
      setModalOpen(false); await load();
    } catch (e) { console.error(e); alert("Error al guardar cotización"); }
    setSaving(false);
  };

  const convertToInvoice = async (q) => {
    if (!(await confirm({ title: "¿Convertir esta cotización en factura de venta?", confirmText: "Sí, convertir", cancelText: "No" }))) return;
    try {
      await base44.entities.Invoice.update(q.id, {
        type: "Factura de venta", status: "Pendiente",
        number: await getNextDocNumber("Invoice", getPrefix(company, "invoice")),
      });
      await load();
      alert("Cotización convertida en factura");
    } catch (e) { console.error(e); alert("Error al convertir"); }
  };

  const remove = async (id) => {
    if (!(await confirm({ title: "¿Eliminar esta cotización?", confirmText: "Sí, eliminar", cancelText: "No", variant: "destructive" }))) return;
    await base44.entities.Invoice.delete(id);
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Cotizaciones</h1>
            <p className="text-slate-500 mt-0.5">{quotes.length} cotizaciones registradas</p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4 mr-1" /> Nueva Cotización <span className="ml-2 text-[10px] opacity-60 hidden md:inline">Ctrl+C</span>
        </Button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por número o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay cotizaciones registradas</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((q) => {
            const parsed = (() => { try { return JSON.parse(q.items || "[]"); } catch { return []; } })();
            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{q.number}</p>
                    <p className="text-sm text-slate-500">{q.customer_name || custName(q.customer_id)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{moment(q.date).format("DD/MM/YYYY")}</p>
                  </div>
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700">{q.status}</span>
                </div>
                <div className="space-y-1 mb-3 text-sm">
                  {parsed.slice(0, 3).map((it, i) => (
                    <div key={i} className="flex justify-between text-slate-600">
                      <span className="truncate">{it.name || "—"} ×{it.quantity}</span>
                      <span>{fmt(it.subtotal)}</span>
                    </div>
                  ))}
                  {parsed.length > 3 && <p className="text-xs text-slate-400">+{parsed.length - 3} items más...</p>}
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 mb-3">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="font-bold text-slate-900">{fmt(q.total)}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(q)} className="flex-1 min-w-[80px]">
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => convertToInvoice(q)} className="flex-1 min-w-[80px]">
                    <FileCheck className="w-3.5 h-3.5 mr-1" /> Facturar
                  </Button>
                  {customerPhone(q.customer_id) && (
                    <a href={`tel:${customerPhone(q.customer_id).replace(/\s+/g, "")}`} title="Llamar al cliente" className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md border border-slate-200"><Phone className="w-3.5 h-3.5" /></a>
                  )}
                  <WhatsAppButton size="sm" phone={customerPhone(q.customer_id)} message={buildDocMessage("quotation", q, company, { customer: customers.find((c) => c.id === q.customer_id) })} variant="outline" label="WhatsApp" />
                  <button onClick={() => setPrintQ(q)} title="Imprimir" className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200"><Printer className="w-3.5 h-3.5" /></button>
                  <Button size="sm" variant="ghost" onClick={() => remove(q.id)} className="text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0">
          <DialogHeader className="sr-only"><DialogTitle>{editing ? "Editar Cotización" : "Nueva Cotización"}</DialogTitle></DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto">
            {/* Encabezado del documento */}
            <div className="text-center px-5 pt-6 pb-4 border-b border-slate-300">
              {company?.logo && <Image src={company.logo} alt="Logo" fittingType="fit" className="h-16 w-40 mx-auto mb-2" />}
              <p className="text-lg font-bold text-slate-900 uppercase">{company?.name || "Mi empresa"}</p>
              {company?.document_number && <p className="text-xs text-slate-500">NIT/CC: {company.document_number}</p>}
              <p className="text-xs text-slate-500">{[company?.address, company?.city, company?.phone].filter(Boolean).join(" · ")}</p>
              <div className="mt-3 inline-block border border-slate-300 px-4 py-1.5">
                <p className="text-sm font-bold text-slate-900 tracking-wide">{editing ? `COTIZACIÓN ${editing.number || ""}` : "COTIZACIÓN"}</p>
              </div>
            </div>

            {/* Datos del cliente */}
            <div className="px-5 py-4 border-b border-slate-300 grid sm:grid-cols-2 gap-3">
              <SearchableSelect
                label="Cliente"
                required
                placeholder="Buscar cliente..."
                value={form.customer_id}
                onValueChange={(v) => setForm({ ...form, customer_id: v })}
                onCreate={createCustomer}
                createLabel="Crear cliente"
                items={customers.map((c) => ({ id: c.id, label: c.name, sublabel: [c.document_number, c.phone].filter(Boolean).join(" · ") }))}
              />
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
              </div>
            </div>

            {/* Agregar items */}
            <div className="px-5 py-3 border-b border-slate-300 flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-xs uppercase text-slate-500">Items ({items.length} ítems · {items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} uds)</Label>
              <div className="flex-1 min-w-[220px] max-w-md">
                <LiveItemSearch
                  options={[
                    ...services.map((s) => ({ ...s, _type: "Servicio" })),
                    ...products.map((p) => ({ ...p, _type: "Producto" })),
                  ]}
                  onSelect={(o) => (o._type === "Producto" ? addItem(o) : addService(o))}
                  placeholder="Buscar repuesto o servicio..."
                />
              </div>
            </div>

            {/* Renglones */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 text-xs uppercase border-b border-slate-300">
                    <th className="px-3 py-2 text-left font-semibold">Descripción</th>
                    <th className="px-3 py-2 text-center font-semibold">Cant.</th>
                    <th className="px-3 py-2 text-right font-semibold">Vr. unit.</th>
                    <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Agregue productos o servicios</td></tr>
                  )}
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-1">
                        <input value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} className="w-full border-0 px-1 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 rounded" />
                        {(() => {
                          const prod = it.product_id ? products.find((p) => p.id === it.product_id) : null;
                          if (!prod) return null;
                          const det = [
                            prod.sku && `SKU: ${prod.sku}`,
                            prod.reference && `Ref: ${prod.reference}`,
                            prod.brand && `Marca: ${prod.brand}`,
                            prod.category,
                            prod.stock != null && `Stock: ${prod.stock}`,
                            prod.compatibility && `Compat.: ${prod.compatibility}`,
                          ].filter(Boolean);
                          return det.length ? <p className="text-xs text-slate-400 mt-0.5 px-1">{det.join(" · ")}</p> : null;
                        })()}
                      </td>
                      <td className="px-3 py-1 text-center"><input type="number" value={it.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="w-14 text-center border border-slate-200 rounded px-1 py-0.5" /></td>
                      <td className="px-3 py-1 text-right"><input type="number" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", Number(e.target.value))} className="w-24 text-right border border-slate-200 rounded px-1 py-0.5" /></td>
                      <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmt(it.subtotal)}</td>
                      <td className="px-2 py-1"><button onClick={() => removeItem(i)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="px-5 py-4 border-t border-slate-300 flex justify-end">
              <div className="w-full sm:w-72 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between font-bold text-slate-900 text-base pt-1 border-t border-slate-300"><span>TOTAL</span><span>{fmt(total)}</span></div>
              </div>
            </div>
          </div>
          <DialogFooter className="px-5 py-4 border-t border-slate-300 bg-slate-50 gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.customer_id || items.length === 0} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {saving ? "Guardando..." : editing ? "Guardar Cambios" : "Crear Cotización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printQ && (
        <PrintableDocument
          type="quotation"
          doc={printQ}
          company={company}
          extras={{ customer: customers.find((c) => c.id === printQ.customer_id) }}
          onClose={() => setPrintQ(null)}
        />
      )}
    </div>
  );
}
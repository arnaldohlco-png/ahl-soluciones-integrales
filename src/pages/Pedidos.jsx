// Pedidos a Proveedor
import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { registerForPayment } from "@/lib/cashRegister";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardList, Plus, Search, Trash2, Pencil, Send, PackageCheck, Printer, ChevronDown, ChevronRight, PackagePlus } from "lucide-react";
import moment from "moment";
import { getNextDocNumber, getPrefix } from "@/lib/docNumbering";
import WhatsAppButton from "@/components/WhatsAppButton";
import PrintableDocument from "@/components/PrintableDocument";
import { matchAny } from "@/lib/search";
import SearchableSelect from "@/components/SearchableSelect";
import InlineProductSearch from "@/components/InlineProductSearch";
import { useConfirm } from "@/components/ConfirmProvider";

const STATUS_STYLES = {
  Borrador: "bg-slate-100 text-slate-600",
  Enviado: "bg-blue-100 text-blue-700",
  Recibido: "bg-emerald-100 text-emerald-700",
};

export default function Pedidos() {
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(moment().format("YYYY-MM-DD"));
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [printP, setPrintP] = useState(null);

  // Crear producto al vuelo
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ sku: "", name: "", quantity: 1 });
  const [savingProduct, setSavingProduct] = useState(false);

  // Convertir en compra
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertOrder, setConvertOrder] = useState(null);
  const [convertItems, setConvertItems] = useState([]);
  const [convertPaymentType, setConvertPaymentType] = useState("Contado");
  const [convertPaymentMethod, setConvertPaymentMethod] = useState("Efectivo");
  const [convertInvoiceNumber, setConvertInvoiceNumber] = useState("");
  const [converting, setConverting] = useState(false);

  const supplierPhone = (id) => suppliers.find((s) => s.id === id)?.phone || "";

  const createSupplier = async (name) => {
    const s = await base44.entities.Supplier.create({ name });
    setSuppliers((prev) => [s, ...prev]);
    return { id: s.id, label: s.name, sublabel: s.document_number || s.phone || "" };
  };

  useEffect(() => {
    (async () => {
      try {
        const [ords, supls, prods, comps] = await Promise.all([
          fetchAll("SupplierOrder", "-date"),
          fetchAll("Supplier"),
          fetchAll("Product"),
          base44.entities.Company.list("-created_date", 1),
        ]);
        setList(ords);
        setSuppliers(supls);
        setProducts(prods);
        if (comps.length > 0) setCompany(comps[0]);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = list.filter(p =>
    matchAny(search, p.supplier_name, p.number)
  );

  const chargesIva = company ? (company.charges_iva ?? (company.document_type === "Persona jurídica")) : true;

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
    const iva = chargesIva ? subtotal * 0.19 : 0;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  }, [items, chargesIva]);

  const addItem = (product) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => i.product_id === product.id
        ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_cost }
        : i));
    } else {
      setItems([...items, { product_id: product.id, sku: product.sku || "", name: product.name, quantity: 1, unit_cost: product.cost || 0, subtotal: product.cost || 0 }]);
    }
  };

  const updateItem = (productId, field, value) => {
    setItems(items.map(i => {
      if (i.product_id !== productId) return i;
      const updated = { ...i, [field]: Number(value) };
      updated.subtotal = updated.quantity * updated.unit_cost;
      return updated;
    }));
  };

  const removeItem = (productId) => setItems(items.filter(i => i.product_id !== productId));

  const openNew = () => {
    setEditingId(null);
    setSupplierId(""); setDate(moment().format("YYYY-MM-DD"));
    setItems([]); setNotes("");
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setSupplierId(p.supplier_id || "");
    setDate(p.date || moment().format("YYYY-MM-DD"));
    setItems(p.items ? (typeof p.items === "string" ? JSON.parse(p.items) : p.items) : []);
    setNotes(p.notes || "");
    setModalOpen(true);
  };

  const save = async () => {
    if (items.length === 0) { alert("Agrega al menos un producto"); return; }
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      const payload = {
        supplier_id: supplierId || "",
        supplier_name: supplier?.name || "Sin proveedor",
        number: editingId ? (list.find(p => p.id === editingId)?.number || "") : await getNextDocNumber("SupplierOrder", getPrefix(company, "supplier_order")),
        date,
        items: JSON.stringify(items),
        subtotal: totals.subtotal,
        iva_total: totals.iva,
        total: totals.total,
        status: "Borrador",
        notes,
      };
      if (editingId) {
        await base44.entities.SupplierOrder.update(editingId, payload);
      } else {
        await base44.entities.SupplierOrder.create(payload);
      }
      const ords = await base44.entities.SupplierOrder.list("-date", 5000);
      setList(ords);
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const sendOrder = async (p) => {
    if (!(await confirm({ title: "¿Marcar pedido como Enviado?", description: "Una vez enviado, el pedido ya no podrá editarse.", confirmText: "Sí, enviar", cancelText: "No" }))) return;
    try {
      await base44.entities.SupplierOrder.update(p.id, { status: "Enviado" });
      setList(list.map(x => x.id === p.id ? { ...x, status: "Enviado" } : x));
    } catch (e) { alert("Error: " + e.message); }
  };

  const openConvert = (p) => {
    const parsed = p.items ? (typeof p.items === "string" ? JSON.parse(p.items) : p.items) : [];
    setConvertOrder(p);
    setConvertItems(parsed.map(i => ({ ...i })));
    setConvertPaymentType("Contado");
    setConvertPaymentMethod("Efectivo");
    setConvertInvoiceNumber("");
    setConvertOpen(true);
  };

  const updateConvertItem = (productId, field, value) => {
    setConvertItems(convertItems.map(i => {
      if (i.product_id !== productId) return i;
      const updated = { ...i, [field]: Number(value) };
      updated.subtotal = updated.quantity * updated.unit_cost;
      return updated;
    }));
  };

  const convertTotals = useMemo(() => {
    const subtotal = convertItems.reduce((s, i) => s + (i.subtotal || 0), 0);
    const iva = chargesIva ? subtotal * 0.19 : 0;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  }, [convertItems, chargesIva]);

  const confirmConvert = async () => {
    if (convertItems.length === 0) { alert("No hay items para convertir"); return; }
    setConverting(true);
    try {
      const supplier = suppliers.find(s => s.id === convertOrder.supplier_id);
      const purchasePayload = {
        supplier_id: convertOrder.supplier_id || "",
        supplier_name: convertOrder.supplier_name || supplier?.name || "Sin proveedor",
        invoice_number: convertInvoiceNumber,
        number: await getNextDocNumber("Purchase", getPrefix(company, "purchase")),
        date: moment().format("YYYY-MM-DD"),
        items: JSON.stringify(convertItems.map(i => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, unit_cost: i.unit_cost, subtotal: i.subtotal }))),
        subtotal: convertTotals.subtotal,
        iva_total: convertTotals.iva,
        transport_cost: 0,
        discount: 0,
        total: convertTotals.total,
        payment_method: convertPaymentMethod,
        payment_type: convertPaymentType,
        status: convertPaymentType === "Contado" ? "Pagada" : "Pendiente",
      };

      const purchase = await base44.entities.Purchase.create(purchasePayload);

      // Actualizar stock y costo
      await Promise.all(convertItems.map(item =>
        base44.entities.Product.update(item.product_id, {
          stock: (products.find(p => p.id === item.product_id)?.stock || 0) + item.quantity,
          cost: item.unit_cost,
        })
      ));

      // Egreso de caja si es contado
      if (convertPaymentType === "Contado") {
        await base44.entities.CashMovement.create({
          date: new Date().toISOString(),
          type: "Salida",
          category: "Compra",
          amount: convertTotals.total,
          description: "Compra - " + (convertOrder.supplier_name || "Sin proveedor"),
          payment_method: convertPaymentMethod,
          register_type: registerForPayment(convertPaymentMethod, "Caja principal"),
          reference_id: purchase.id,
        });
      }

      // Marcar pedido como Recibido y vincular compra
      await base44.entities.SupplierOrder.update(convertOrder.id, {
        status: "Recibido",
        related_purchase_id: purchase.id,
      });

      const prods = await base44.entities.Product.list("-created_date", 5000);
      setProducts(prods);
      const ords = await base44.entities.SupplierOrder.list("-date", 5000);
      setList(ords);
      setConvertOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      setConverting(false);
    }
  };

  const deleteOrder = async (p) => {
    if (!(await confirm({ title: "¿Eliminar este pedido?", description: "Esta acción no se puede deshacer.", confirmText: "Sí, eliminar", cancelText: "No", variant: "destructive" }))) return;
    try {
      await base44.entities.SupplierOrder.delete(p.id);
      setList(list.filter(x => x.id !== p.id));
    } catch (e) { alert("Error: " + e.message); }
  };

  const createProduct = async () => {
    if (!newProduct.name.trim()) { alert("Ingresa el nombre del producto"); return; }
    setSavingProduct(true);
    try {
      const prod = await base44.entities.Product.create({
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim(),
        price: 0,
        cost: 0,
        stock: 0,
        category: "Repuestos",
      });
      setProducts((prev) => [prod, ...prev]);
      const qty = Number(newProduct.quantity) || 1;
      setItems((prev) => [...prev, { product_id: prod.id, sku: prod.sku || "", name: prod.name, quantity: qty, unit_cost: 0, subtotal: 0 }]);
      setNewProduct({ sku: "", name: "", quantity: 1 });
      setProductModalOpen(false);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSavingProduct(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Pedidos a Proveedor</h1>
          <p className="text-slate-500 mt-1">{list.length} pedidos registrados</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4" /> Nuevo Pedido
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por proveedor o número..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 max-w-md" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay pedidos registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium w-8"></th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Número</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Total est.</th>
                  <th className="px-4 py-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const parsedItems = p.items ? (typeof p.items === "string" ? JSON.parse(p.items) : p.items) : [];
                  const isOpen = expandedId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-center align-top">
                          {parsedItems.length > 0 && (
                            <button onClick={() => setExpandedId(isOpen ? null : p.id)} className="p-1 text-slate-400 hover:text-slate-700 rounded" title="Ver items">
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.date ? moment(p.date).format("DD/MM/YYYY") : "—"}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{p.number || "—"}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.supplier_name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {parsedItems.length === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="max-w-xs">
                              <span className="text-xs font-medium text-slate-500">{parsedItems.length} {parsedItems.length === 1 ? "producto" : "productos"}</span>
                              <p className="text-sm text-slate-700 truncate" title={parsedItems[0]?.name}>{parsedItems[0]?.name}{parsedItems.length > 1 ? ` +${parsedItems.length - 1}` : ""}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_STYLES[p.status] || "bg-slate-100 text-slate-600"}`}>{p.status}</span></td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">${(p.total || 0).toLocaleString("es-CO")}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {p.status === "Borrador" && (
                              <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                            )}
                            {p.status === "Borrador" && (
                              <button onClick={() => sendOrder(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Marcar enviado"><Send className="w-4 h-4" /></button>
                            )}
                            {p.status === "Enviado" && (
                              <button onClick={() => openConvert(p)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Convertir en compra"><PackageCheck className="w-4 h-4" /></button>
                            )}
                            <WhatsAppButton phone={supplierPhone(p.supplier_id)} message={`Hola, adjunto su pedido N° ${p.number || ""}${company?.name ? " de " + company.name : ""}.`} />
                            <button onClick={() => setPrintP(p)} title="Imprimir" className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"><Printer className="w-4 h-4" /></button>
                            {p.status !== "Recibido" && (
                              <button onClick={() => deleteOrder(p)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={8} className="px-4 py-3">
                            {parsedItems.length === 0 ? (
                              <p className="text-sm text-slate-400">Este pedido no tiene items.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-slate-400 border-b border-slate-200">
                                      <th className="px-3 py-1.5 font-medium">SKU</th>
                                      <th className="px-3 py-1.5 font-medium">Producto</th>
                                      <th className="px-3 py-1.5 font-medium text-right">Cant.</th>
                                      <th className="px-3 py-1.5 font-medium text-right">Costo u.</th>
                                      <th className="px-3 py-1.5 font-medium text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parsedItems.map((it, i) => (
                                      <tr key={i} className="border-b border-slate-100 last:border-0">
                                        <td className="px-3 py-1.5 text-slate-500 font-mono text-xs">{it.sku || "—"}</td>
                                        <td className="px-3 py-1.5 text-slate-700">{it.name || "—"}</td>
                                        <td className="px-3 py-1.5 text-right text-slate-600">{it.quantity}</td>
                                        <td className="px-3 py-1.5 text-right text-slate-600">${(it.unit_cost || 0).toLocaleString("es-CO")}</td>
                                        <td className="px-3 py-1.5 text-right font-medium text-slate-800">${(it.subtotal || 0).toLocaleString("es-CO")}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {p.notes && <p className="mt-2 text-sm text-slate-500">Notas: {p.notes}</p>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear/editar pedido */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar pedido" : "Nuevo pedido a proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Proveedor"
                placeholder="Buscar proveedor..."
                value={supplierId}
                onValueChange={setSupplierId}
                onCreate={createSupplier}
                createLabel="Crear proveedor"
                items={suppliers.map(s => ({ id: s.id, label: s.name, sublabel: [s.document_number, s.phone].filter(Boolean).join(" · ") }))}
              />
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {/* Buscador + crear producto */}
            <div>
              <Label>Agregar producto</Label>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <InlineProductSearch
                    options={products}
                    onSelect={(p) => addItem(p)}
                    placeholder="Nombre, SKU, marca..."
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => setProductModalOpen(true)} title="Crear producto al vuelo">
                  <PackagePlus className="w-4 h-4" /> Crear
                </Button>
              </div>
            </div>

            {/* Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">SKU</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Producto</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-400">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-400">Costo u.</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-400">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400 text-sm">No has agregado productos a este pedido</td></tr>
                  ) : items.map(item => (
                    <tr key={item.product_id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.sku || "—"}</td>
                      <td className="px-3 py-2 text-slate-800">{item.name}</td>
                      <td className="px-3 py-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(item.product_id, "quantity", e.target.value)} className="w-16 text-right border border-slate-200 rounded px-1 py-0.5 text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.unit_cost} onChange={(e) => updateItem(item.product_id, "unit_cost", e.target.value)} className="w-24 text-right border border-slate-200 rounded px-1 py-0.5 text-sm" /></td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">${(item.subtotal || 0).toLocaleString("es-CO")}</td>
                      <td className="px-3 py-2 text-right"><button onClick={() => removeItem(item.product_id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observaciones internas..." />
            </div>

            <div className="space-y-1 text-sm bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${totals.subtotal.toLocaleString("es-CO")}</span></div>
              {chargesIva && <div className="flex justify-between text-slate-600"><span>IVA (19%)</span><span>${totals.iva.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>Total estimado</span><span>${totals.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar borrador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal crear producto al vuelo */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear producto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>SKU / Código</Label>
              <Input value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} placeholder="SKU" />
            </div>
            <div>
              <Label>Nombre</Label>
              <Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Nombre del producto" />
            </div>
            <div>
              <Label>Cantidad para este pedido</Label>
              <Input type="number" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) || 1 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductModalOpen(false)}>Cancelar</Button>
            <Button onClick={createProduct} disabled={savingProduct} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {savingProduct ? "Creando..." : "Crear y agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal convertir en compra */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Recibir y convertir en compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 flex-1 overflow-y-auto min-h-0">
            <p className="text-sm text-slate-500">Ajusta las cantidades y costos recibidos, luego confirma para crear la compra, actualizar el inventario y registrar el egreso en caja.</p>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">SKU</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-400">Producto</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-400">Cant.</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-400">Costo u.</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-400">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {convertItems.map(item => (
                    <tr key={item.product_id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.sku || "—"}</td>
                      <td className="px-3 py-2 text-slate-800">{item.name}</td>
                      <td className="px-3 py-2"><input type="number" value={item.quantity} onChange={(e) => updateConvertItem(item.product_id, "quantity", e.target.value)} className="w-16 text-right border border-slate-200 rounded px-1 py-0.5 text-sm" /></td>
                      <td className="px-3 py-2"><input type="number" value={item.unit_cost} onChange={(e) => updateConvertItem(item.product_id, "unit_cost", e.target.value)} className="w-24 text-right border border-slate-200 rounded px-1 py-0.5 text-sm" /></td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">${(item.subtotal || 0).toLocaleString("es-CO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Factura proveedor</Label>
                <Input value={convertInvoiceNumber} onChange={(e) => setConvertInvoiceNumber(e.target.value)} placeholder="N° factura" />
              </div>
              <div>
                <Label>Tipo de pago</Label>
                <Select value={convertPaymentType} onValueChange={setConvertPaymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contado">Contado</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de pago</Label>
                <Select value={convertPaymentMethod} onValueChange={setConvertPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1 text-sm bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${convertTotals.subtotal.toLocaleString("es-CO")}</span></div>
              {chargesIva && <div className="flex justify-between text-slate-600"><span>IVA (19%)</span><span>${convertTotals.iva.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>Total</span><span>${convertTotals.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancelar</Button>
            <Button onClick={confirmConvert} disabled={converting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {converting ? "Convirtiendo..." : "Confirmar recepción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printP && (
        <PrintableDocument
          type="supplier_order"
          doc={printP}
          company={company}
          extras={{ supplier: suppliers.find((s) => s.id === printP.supplier_id) }}
          onClose={() => setPrintP(null)}
        />
      )}
    </div>
  );
}
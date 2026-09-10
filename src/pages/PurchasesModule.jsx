// Compras
import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, Plus, Search, Trash2, Pencil, CheckCircle, Printer } from "lucide-react";
import moment from "moment";
import { getNextDocNumber, getPrefix } from "@/lib/docNumbering";
import WhatsAppButton from "@/components/WhatsAppButton";
import PrintableDocument from "@/components/PrintableDocument";
import { buildDocMessage } from "@/lib/docMessages";
import { matchAny } from "@/lib/search";
import SearchableSelect from "@/components/SearchableSelect";

export default function Purchases() {
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
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(moment().format("YYYY-MM-DD"));
  const [items, setItems] = useState([]);
  const [transportCost, setTransportCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [paymentType, setPaymentType] = useState("Contado");
  const [productSearch, setProductSearch] = useState("");
  const [printP, setPrintP] = useState(null);

  const supplierPhone = (id) => suppliers.find((s) => s.id === id)?.phone || "";

  useEffect(() => {
    (async () => {
      try {
        const [purchs, supls, prods, comps] = await Promise.all([
          fetchAll("Purchase", "-date"),
          fetchAll("Supplier"),
          fetchAll("Product"),
          base44.entities.Company.list("-created_date", 1),
        ]);
        setList(purchs);
        setSuppliers(supls);
        setProducts(prods);
        if (comps.length > 0) setCompany(comps[0]);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const filtered = list.filter(p =>
    matchAny(search, p.supplier_name, p.invoice_number, p.number)
  );

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 8), [products, productSearch]);

  const addItem = (product) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_cost } : i));
    } else {
      setItems([...items, { product_id: product.id, name: product.name, quantity: 1, unit_cost: product.cost || 0, subtotal: product.cost || 0 }]);
    }
    setProductSearch("");
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

  const chargesIva = company ? (company.charges_iva ?? (company.document_type === "Persona jurídica")) : true;

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const iva = chargesIva ? subtotal * 0.19 : 0;
    const total = Math.max(0, subtotal + iva + (transportCost || 0) - (discount || 0));
    return { subtotal, iva, total };
  }, [items, transportCost, discount, chargesIva]);

  const openNew = () => {
    setEditingId(null);
    setSupplierId(""); setInvoiceNumber(""); setDate(moment().format("YYYY-MM-DD"));
    setItems([]); setTransportCost(0); setDiscount(0);
    setPaymentMethod("Efectivo"); setPaymentType("Contado");
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditingId(p.id);
    setSupplierId(p.supplier_id || "");
    setInvoiceNumber(p.invoice_number || "");
    setDate(p.date || moment().format("YYYY-MM-DD"));
    setItems(p.items ? (typeof p.items === "string" ? JSON.parse(p.items) : p.items) : []);
    setTransportCost(p.transport_cost || 0);
    setDiscount(p.discount || 0);
    setPaymentMethod(p.payment_method || "Efectivo");
    setPaymentType(p.payment_type || "Contado");
    setModalOpen(true);
  };

  const deletePurchase = async (p) => {
    if (!confirm("¿Eliminar esta compra? El stock de los productos será ajustado.")) return;
    try {
      const parsedItems = p.items ? (typeof p.items === "string" ? JSON.parse(p.items) : p.items) : [];
      await Promise.all(parsedItems.map(item =>
        base44.entities.Product.update(item.product_id, {
          stock: Math.max(0, (products.find(pr => pr.id === item.product_id)?.stock || 0) - item.quantity),
        })
      ));
      await base44.entities.Purchase.delete(p.id);
      const prods = await base44.entities.Product.list("-created_date", 5000);
      setProducts(prods);
      const purchs = await base44.entities.Purchase.list("-date", 5000);
      setList(purchs);
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    }
  };

  const save = async () => {
    if (items.length === 0) { alert("Agrega al menos un producto"); return; }
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === supplierId);
      const payload = {
        supplier_id: supplierId || "",
        supplier_name: supplier?.name || "Sin proveedor",
        invoice_number: invoiceNumber,
        number: editingId ? (list.find(p => p.id === editingId)?.number || "") : await getNextDocNumber("Purchase", getPrefix(company, "purchase")),
        date,
        items: JSON.stringify(items),
        subtotal: totals.subtotal,
        iva_total: totals.iva,
        transport_cost: transportCost || 0,
        discount: discount || 0,
        total: totals.total,
        payment_method: paymentMethod,
        payment_type: paymentType,
        status: paymentType === "Contado" ? "Pagada" : "Pendiente",
      };

      let purchase;
      if (editingId) {
        const oldPurchase = list.find(p => p.id === editingId);
        const oldItems = oldPurchase && oldPurchase.items ? (typeof oldPurchase.items === "string" ? JSON.parse(oldPurchase.items) : oldPurchase.items) : [];
        await Promise.all(oldItems.map(item =>
          base44.entities.Product.update(item.product_id, {
            stock: Math.max(0, (products.find(p => p.id === item.product_id)?.stock || 0) - item.quantity),
          })
        ));
        purchase = await base44.entities.Purchase.update(editingId, payload);
        await Promise.all(items.map(item =>
          base44.entities.Product.update(item.product_id, {
            stock: Math.max(0, (products.find(p => p.id === item.product_id)?.stock || 0) - 0) + item.quantity,
            cost: item.unit_cost,
          })
        ));
      } else {
        purchase = await base44.entities.Purchase.create(payload);
        await Promise.all(items.map(item =>
          base44.entities.Product.update(item.product_id, {
            stock: (products.find(p => p.id === item.product_id)?.stock || 0) + item.quantity,
            cost: item.unit_cost,
          })
        ));
        if (paymentType === "Contado") {
          await base44.entities.CashMovement.create({
            date: new Date().toISOString(),
            type: "Salida",
            category: "Compra",
            amount: totals.total,
            description: "Compra - " + (supplier?.name || "Sin proveedor"),
            payment_method: paymentMethod,
            register_type: "Caja principal",
            reference_id: purchase.id,
          });
        }
      }

      const prods = await base44.entities.Product.list("-created_date", 5000);
      setProducts(prods);
      const purchs = await base44.entities.Purchase.list("-date", 5000);
      setList(purchs);
      setModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
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
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Compras</h1>
          <p className="text-slate-500 mt-1">{list.length} compras registradas</p>
        </div>
        <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
          <Plus className="w-4 h-4" /> Nueva Compra
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por proveedor o factura..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 max-w-md" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay compras registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Proveedor</th>
                  <th className="px-4 py-3 font-medium">Factura</th>
                  <th className="px-4 py-3 font-medium">Pago</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{p.date ? moment(p.date).format("DD/MM/YYYY") : "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.supplier_name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.invoice_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{p.payment_type} · {p.payment_method}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${p.status === "Pagada" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">${(p.total || 0).toLocaleString("es-CO")}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Editar"><Pencil className="w-4 h-4" /></button>
                        <WhatsAppButton phone={supplierPhone(p.supplier_id)} message={buildDocMessage("purchase", p, company, { supplier: suppliers.find((s) => s.id === p.supplier_id) })} />
                        <button onClick={() => setPrintP(p)} title="Imprimir" className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => deletePurchase(p)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar compra" : "Nueva compra"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <SearchableSelect
                label="Proveedor"
                placeholder="Buscar proveedor..."
                value={supplierId}
                onValueChange={setSupplierId}
                items={suppliers.map(s => ({ id: s.id, label: s.name, sublabel: [s.document_number, s.phone].filter(Boolean).join(" · ") }))}
              />
              <div>
                <Label>Factura de compra</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="N° de factura" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label>Tipo de pago</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contado">Contado</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product search */}
            <div>
              <Label>Buscar producto para agregar</Label>
              <Input placeholder="Nombre o SKU..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              {productSearch && filteredProducts.length > 0 && (
                <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden">
                  {filteredProducts.map(p => (
                    <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-100 last:border-0">
                      {p.name} <span className="text-slate-400">· {p.brand} · Stock: {p.stock}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            {items.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-400">Producto</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-400">Cant.</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-400">Costo u.</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-400">Subtotal</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.product_id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-800">{item.name}</td>
                        <td className="px-3 py-2"><input type="number" value={item.quantity} onChange={(e) => updateItem(item.product_id, "quantity", e.target.value)} className="w-16 text-right border border-slate-200 rounded px-1 py-0.5 text-sm" /></td>
                        <td className="px-3 py-2"><input type="number" value={item.unit_cost} onChange={(e) => updateItem(item.product_id, "unit_cost", e.target.value)} className="w-24 text-right border border-slate-200 rounded px-1 py-0.5 text-sm" /></td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">${item.subtotal.toLocaleString("es-CO")}</td>
                        <td className="px-3 py-2 text-right"><button onClick={() => removeItem(item.product_id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Transporte</Label>
                <Input type="number" value={transportCost} onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Descuento</Label>
                <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <Label>Forma de pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 text-sm bg-slate-50 rounded-lg p-3">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${totals.subtotal.toLocaleString("es-CO")}</span></div>
              {chargesIva && <div className="flex justify-between text-slate-600"><span>IVA (19%)</span><span>${totals.iva.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>}
              <div className="flex justify-between text-slate-600"><span>Transporte</span><span>${(transportCost || 0).toLocaleString("es-CO")}</span></div>
              <div className="flex justify-between text-slate-600"><span>Descuento</span><span>-${(discount || 0).toLocaleString("es-CO")}</span></div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>Total</span><span>${totals.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {printP && (
        <PrintableDocument
          type="purchase"
          doc={printP}
          company={company}
          extras={{ supplier: suppliers.find((s) => s.id === printP.supplier_id) }}
          onClose={() => setPrintP(null)}
        />
      )}
    </div>
  );
}
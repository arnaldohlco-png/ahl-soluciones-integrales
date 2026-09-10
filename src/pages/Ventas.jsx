import React, { useEffect, useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAllCustomers } from "@/lib/customersLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, Trash2, Plus, Minus, CheckCircle, Pause, Play, FilePlus2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getNextDocNumber, getPrefix } from "@/lib/docNumbering";
import ColombianInvoice from "@/components/ColombianInvoice";
import SearchableSelect from "@/components/SearchableSelect";

export default function Ventas() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("Cliente mostrador");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [paymentType, setPaymentType] = useState("Contado");
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [company, setCompany] = useState(null);
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [parkedSales, setParkedSales] = useState([]);
  const searchRef = useRef(null);
  const location = useLocation();
  const [pendingQuote, setPendingQuote] = useState(null);
  const quoteIdRef = useRef(null);
  const quoteOrderIdRef = useRef(null);

  useEffect(() => {
    const st = location.state;
    if (st && st.fromQuote) {
      setPendingQuote(st.fromQuote);
      quoteIdRef.current = st.fromQuote.id || null;
      quoteOrderIdRef.current = st.fromQuote.related_order_id || null;
    }
  }, [location]);

  useEffect(() => {
    if (!pendingQuote || products.length === 0) return;
    const qItems = pendingQuote.items || [];
    const newCart = qItems.map((it) => {
      const prod = products.find((p) => p.id === it.product_id);
      return {
        product_id: it.product_id || null,
        name: it.name || "—",
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        iva_rate: it.iva_rate ?? prod?.iva_rate ?? 19,
        subtotal: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
      };
    }).filter((it) => it.quantity > 0);
    setCart(newCart);
    if (pendingQuote.customer_id) {
      const c = customers.find((x) => x.id === pendingQuote.customer_id);
      setCustomerId(pendingQuote.customer_id);
      setCustomerName(c?.name || pendingQuote.customer_name || "Cliente mostrador");
    }
    setPendingQuote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuote, products, customers]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_parked_sales");
      if (saved) setParkedSales(JSON.parse(saved));
    } catch (e) { /* ignore */ }
  }, []);

  const persistParked = (list) => {
    setParkedSales(list);
    try { localStorage.setItem("pos_parked_sales", JSON.stringify(list)); } catch (e) { /* ignore */ }
  };

  const parkSale = () => {
    if (cart.length === 0) return;
    const label = `${customerName} · ${cart.length} ítem(s)`;
    const entry = {
      id: Date.now().toString(),
      label,
      cart,
      customerId,
      customerName,
      paymentMethod,
      paymentType,
      discount,
      amountPaid,
      savedAt: new Date().toISOString(),
    };
    persistParked([entry, ...parkedSales]);
    setCart([]); setCustomerId(""); setCustomerName("Cliente mostrador");
    setDiscount(0); setAmountPaid(0); setPaymentMethod("Efectivo"); setPaymentType("Contado");
    searchRef.current?.focus();
  };

  const resumeSale = (id) => {
    const entry = parkedSales.find(p => p.id === id);
    if (!entry) return;
    setCart(entry.cart);
    setCustomerId(entry.customerId || "");
    setCustomerName(entry.customerName || "Cliente mostrador");
    setPaymentMethod(entry.paymentMethod || "Efectivo");
    setPaymentType(entry.paymentType || "Contado");
    setDiscount(entry.discount || 0);
    setAmountPaid(entry.amountPaid || 0);
    persistParked(parkedSales.filter(p => p.id !== id));
  };

  const deleteParkedSale = (id) => persistParked(parkedSales.filter(p => p.id !== id));

  const startNewSale = () => {
    setCart([]); setCustomerId(""); setCustomerName("Cliente mostrador");
    setDiscount(0); setAmountPaid(0); setPaymentMethod("Efectivo"); setPaymentType("Contado");
    setSearch("");
    quoteIdRef.current = null;
    quoteOrderIdRef.current = null;
    searchRef.current?.focus();
  };

  useEffect(() => {
    (async () => {
      try {
        const fetchAllProducts = async () => {
          const batch = 500;
          let skip = 0;
          const all = [];
          while (true) {
            const part = await base44.entities.Product.list("-created_date", batch, skip);
            all.push(...part);
            if (part.length < batch) break;
            skip += batch;
          }
          return all;
        };
        const [prods, custs, comps] = await Promise.all([
          fetchAllProducts(),
          fetchAllCustomers(),
          base44.entities.Company.list("-created_date", 1),
        ]);
        setProducts(prods);
        setCustomers(custs);
        if (comps.length > 0) setCompany(comps[0]);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, []);

  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const filtered = useMemo(() => {
    const q = norm(search);
    if (!q) return products;
    return products.filter(p =>
      norm(p.name).includes(q) ||
      norm(p.sku).includes(q) ||
      (p.barcode || "").includes(q)
    );
  }, [products, search]);

  const addToCart = (product) => {
    if ((product.stock || 0) <= 0) return;
    const existing = cart.find(c => c.product_id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return;
      setCart(cart.map(c => c.product_id === product.id ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unit_price } : c));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.price,
        iva_rate: product.iva_rate || 19,
        subtotal: product.price,
      }]);
    }
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const updateQty = (productId, delta) => {
    setCart(cart.map(c => {
      if (c.product_id !== productId) return c;
      const product = products.find(p => p.id === productId);
      const newQty = Math.max(0, Math.min(c.quantity + delta, product?.stock || 999));
      return { ...c, quantity: newQty, subtotal: newQty * c.unit_price };
    }).filter(c => c.quantity > 0));
  };

  const setQtyDirect = (productId, qty) => {
    const product = products.find(p => p.id === productId);
    const clamped = Math.max(1, Math.min(qty, product?.stock || 999));
    setCart(cart.map(c => c.product_id === productId ? { ...c, quantity: clamped, subtotal: clamped * c.unit_price } : c));
  };

  const removeFromCart = (productId) => setCart(cart.filter(c => c.product_id !== productId));

  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
    const chargesIva = company ? (company.charges_iva ?? (company.document_type === "Persona jurídica")) : true;
    const iva = chargesIva ? cart.reduce((s, c) => s + (c.subtotal * (c.iva_rate || 19) / 100), 0) : 0;
    const total = Math.max(0, subtotal + iva - (discount || 0));
    return { subtotal, iva, total };
  }, [cart, discount, company]);

  const checkout = async () => {
    if (cart.length === 0) return;
    const insufficient = cart.find(item => {
      if (!item.product_id) return false;
      const prod = products.find(p => p.id === item.product_id);
      return !prod || (prod.stock || 0) < item.quantity;
    });
    if (insufficient) {
      const prod = products.find(p => p.id === insufficient.product_id);
      alert(`Stock insuficiente para "${prod?.name || "un producto"}". No se puede completar la venta.`);
      return;
    }
    setProcessing(true);
    try {
      const cust = customers.find(c => c.id === customerId);
      const saleNumber = await getNextDocNumber("Sale", getPrefix(company, "sale"));
      const sale = await base44.entities.Sale.create({
        number: saleNumber,
        customer_id: customerId || "",
        customer_name: cust?.name || customerName,
        date: new Date().toISOString().split("T")[0],
        items: JSON.stringify(cart),
        subtotal: totals.subtotal,
        iva_total: totals.iva,
        discount: discount || 0,
        total: totals.total,
        payment_method: paymentMethod,
        payment_type: paymentType,
        status: paymentType === "Contado" ? "Pagada" : "Pendiente",
        balance: paymentType === "Crédito" ? totals.total : 0,
        amount_paid: paymentMethod === "Efectivo" && paymentType === "Contado" ? amountPaid : 0,
        change: paymentMethod === "Efectivo" && paymentType === "Contado" ? Math.max(0, amountPaid - totals.total) : 0,
        related_order_id: quoteOrderIdRef.current || undefined,
      });

      await Promise.all(cart.filter(item => item.product_id).map(item =>
        base44.entities.Product.update(item.product_id, {
          stock: (products.find(p => p.id === item.product_id)?.stock || 0) - item.quantity
        })
      ));

      if (paymentType === "Contado") {
        await base44.entities.CashMovement.create({
          date: new Date().toISOString(),
          type: "Entrada",
          category: "Venta",
          amount: totals.total,
          description: `Venta POS - ${sale.customer_name}`,
          payment_method: paymentMethod,
          register_type: "Caja almacén",
          reference_id: sale.id,
        });
      } else {
        await base44.entities.AccountReceivable.create({
          customer_id: customerId || "",
          customer_name: cust?.name || customerName,
          initial_amount: totals.total,
          payments: "[]",
          balance: totals.total,
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          status: "Al día",
        });
      }

      let skip = 0, prods = [];
      const batch = 500;
      while (true) {
        const part = await base44.entities.Product.list("-created_date", batch, skip);
        prods.push(...part);
        if (part.length < batch) break;
        skip += batch;
      }
      setProducts(prods);

      setCart([]);
      setCustomerId("");
      setCustomerName("Cliente mostrador");
      setDiscount(0);
      setAmountPaid(0);
      setCheckoutMsg("¡Venta registrada! Stock actualizado.");
      if (quoteIdRef.current) {
        try { await base44.entities.Invoice.update(quoteIdRef.current, { status: "Pagada", related_sale_id: sale.id }); } catch (e) { /* ignore */ }
        quoteIdRef.current = null;
      }
      if (quoteOrderIdRef.current) {
        try { await base44.entities.ServiceOrder.update(quoteOrderIdRef.current, { status: "Cobrada" }); } catch (e) { /* ignore */ }
        quoteOrderIdRef.current = null;
      }
      setInvoiceSale(sale);
      setTimeout(() => setCheckoutMsg(""), 3000);
    } catch (e) {
      console.error(e);
      alert("Error al procesar la venta: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading && cart.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Ventas / POS</h1>
        <p className="text-slate-500 mt-1">Punto de venta del almacén</p>
      </div>

      {checkoutMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {checkoutMsg}
        </div>
      )}

      {parkedSales.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <Pause className="w-3.5 h-3.5" /> Ventas guardadas ({parkedSales.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {parkedSales.map(p => (
              <div key={p.id} className="bg-white border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 shrink-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{p.label}</p>
                  <p className="text-xs text-slate-400">{new Date(p.savedAt).toLocaleString("es-CO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <button onClick={() => resumeSale(p.id)} className="text-emerald-600 hover:text-emerald-700" title="Retomar">
                  <Play className="w-4 h-4" />
                </button>
                <button onClick={() => deleteParkedSale(p.id)} className="text-slate-300 hover:text-red-500" title="Descartar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              ref={searchRef}
              placeholder="Buscar por nombre, SKU o código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {search ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filtered.map(p => {
                  const out = (p.stock || 0) <= 0;
                  return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out}
                    className={`rounded-xl border p-4 text-left transition-all ${out ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed" : "bg-white border-slate-200 hover:border-amber-400 hover:shadow-md"}`}
                  >
                    <p className="font-medium text-slate-800 text-sm line-clamp-2">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.brand} · {p.sku || ""}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-slate-900">${(p.price || 0).toLocaleString("es-CO")}</span>
                      {out
                        ? <span className="text-xs font-semibold text-red-500">Sin stock</span>
                        : <span className="text-xs text-slate-400">Stock: {p.stock}</span>}
                    </div>
                  </button>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <p className="text-center text-slate-400 py-12">No se encontraron productos</p>
              )}
            </>
          ) : (
            <p className="text-center text-slate-400 py-12 text-sm">Busca un producto por nombre, SKU o código de barras para agregarlo al carrito</p>
          )}
        </div>

        {/* Cart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 h-fit lg:sticky lg:top-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-600" /> Carrito ({cart.length})
          </h3>

          {cart.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">Selecciona productos para vender</p>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product_id} className="py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm leading-tight line-clamp-2">{item.name}</p>
                        <p className="text-xs text-slate-400">${item.unit_price.toLocaleString("es-CO")} c/u</p>
                      </div>
                      <button onClick={() => removeFromCart(item.product_id)} className="text-slate-300 hover:text-red-500 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.product_id, -1)} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setQtyDirect(item.product_id, parseInt(e.target.value) || 1)}
                          className="w-11 text-center text-sm border-0 p-0 focus:ring-0"
                        />
                        <button onClick={() => updateQty(item.product_id, 1)} className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 text-right">${item.subtotal.toLocaleString("es-CO")}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 text-sm border-t border-slate-100 pt-3">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${totals.subtotal.toLocaleString("es-CO")}</span></div>
                <div className="flex justify-between text-slate-600"><span>IVA</span><span>${totals.iva.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Descuento</span>
                  <Input type="number" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-20 h-7 text-right text-sm" />
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-base pt-1"><span>Total</span><span>${totals.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span></div>
                {paymentMethod === "Efectivo" && paymentType === "Contado" && (
                  <>
                    <div className="flex justify-between items-center text-slate-600 pt-1">
                      <span>Recibido</span>
                      <Input type="number" value={amountPaid || ""} onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)} className="w-24 h-7 text-right text-sm" placeholder="0" />
                    </div>
                    {amountPaid > 0 && (
                      <div className="flex justify-between font-semibold text-emerald-700">
                        <span>Cambio/Vueltas</span>
                        <span>${Math.max(0, amountPaid - totals.total).toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-3 mt-4">
                <div>
                  <Label className="text-xs">Cliente</Label>
                  <SearchableSelect
                    placeholder="Buscar cliente..."
                    value={customerId || "walkin"}
                    onValueChange={(v) => { setCustomerId(v === "walkin" ? "" : v); const c = customers.find(c => c.id === v); if (c) setCustomerName(c.name); }}
                    items={[{ id: "walkin", label: "Cliente mostrador" }, ...customers.map(c => ({ id: c.id, label: c.name, sublabel: [c.document_number, c.phone].filter(Boolean).join(" · ") }))]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tipo de pago</Label>
                    <Select value={paymentType} onValueChange={setPaymentType}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Contado">Contado</SelectItem>
                        <SelectItem value="Crédito">Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Medio de pago</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                        <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="Otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={parkSale} disabled={cart.length === 0 || processing} variant="outline" className="h-10 border-amber-300 text-amber-700 hover:bg-amber-50">
                    <Pause className="w-4 h-4" /> Guardar
                  </Button>
                  <Button onClick={startNewSale} disabled={cart.length === 0 || processing} variant="outline" className="h-10">
                    <FilePlus2 className="w-4 h-4" /> Nueva
                  </Button>
                  <Button onClick={checkout} disabled={processing || cart.some(i => (products.find(p => p.id === i.product_id)?.stock || 0) < i.quantity)} className="h-10 bg-amber-500 hover:bg-amber-600 text-slate-900">
                    {processing ? "..." : "Cobrar"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {invoiceSale && (
        <ColombianInvoice
          sale={invoiceSale}
          company={company}
          customer={customers.find((c) => c.id === invoiceSale.customer_id)}
          onClose={() => setInvoiceSale(null)}
        />
      )}
    </div>
  );
}
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirm } from "@/components/ConfirmProvider";
import { useToast } from "@/components/ui/use-toast";
import { Upload, FileText, Loader2, Trash2, Plus, CheckCircle2, ArrowLeft, AlertCircle } from "lucide-react";
import { getNextDocNumber, getPrefix } from "@/lib/docNumbering";
import { chargesIva, calcIvaFlat } from "@/lib/iva";
import { addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_MARGIN = 30;

const fmtMoney = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n) || 0);

const emptyLine = () => ({ sku: "", description: "", quantity: 1, unit_price: 0 });

export default function SupplierInvoices() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);

  const [stage, setStage] = useState("idle"); // idle | uploading | extracting | review | saving | done
  const [error, setError] = useState("");
  const [pdfUri, setPdfUri] = useState("");
  const [pdfName, setPdfName] = useState("");

  // Encabezado
  const [supplierName, setSupplierName] = useState("");
  const [supplierDoc, setSupplierDoc] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState([emptyLine()]);
  const [margin, setMargin] = useState(DEFAULT_MARGIN);
  const [paymentType, setPaymentType] = useState("Contado");
  const [creditDays, setCreditDays] = useState(0);

  const [company, setCompany] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const [cos, sups, prods] = await Promise.all([
          base44.entities.Company.list(null, 1),
          base44.entities.Supplier.list(null, 1000),
          base44.entities.Product.list(null, 1000),
        ]);
        setCompany(cos[0] || null);
        setSuppliers(sups);
        setProducts(prods);
      } catch (e) {
        // sin empresa, igual permite funcionar
      }
    })();
  }, []);

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);
  const ivaTotal = chargesIva(company) ? calcIvaFlat(subtotal, company) : 0;
  const total = subtotal + ivaTotal;

  async function handleSelectPdf(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("El archivo debe ser un PDF.");
      return;
    }
    setError("");
    setPdfName(file.name);
    setStage("uploading");
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      setPdfUri(file_uri);
      setStage("extracting");
      const res = await base44.functions.invoke("extractSupplierInvoice", { file_uri });
      const data = res?.data;
      if (data?.error) throw new Error(data.error);
      // ExtractDataFromUploadedFile retorna { status, output } o un objeto directo
      const payload = data?.output || data || {};
      const prov = payload.proveedor || {};
      setSupplierName(prov.nombre || "");
      setSupplierDoc(prov.document_number || "");
      setInvoiceNumber(payload.numero || "");
      if (payload.fecha) {
        const d = String(payload.fecha).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(d)) setInvoiceDate(d.slice(0, 10));
      }
      const extractedLines = Array.isArray(payload.lineas) ? payload.lineas : [];
      if (extractedLines.length > 0) {
        setLines(extractedLines.map((l) => ({
          sku: String(l.sku || "").trim(),
          description: String(l.descripcion || "").trim(),
          quantity: Number(l.cantidad) || 0,
          unit_price: Number(l.precio_unitario) || 0,
        })));
      } else {
        setLines([emptyLine()]);
      }
      setStage("review");
    } catch (err) {
      setError("No se pudo extraer el PDF: " + (err.message || "error desconocido") + ". Puedes ingresar los datos manualmente.");
      setStage("review");
    }
  }

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function resetAll() {
    setStage("idle");
    setError("");
    setPdfUri("");
    setPdfName("");
    setSupplierName("");
    setSupplierDoc("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setLines([emptyLine()]);
    setMargin(DEFAULT_MARGIN);
    setPaymentType("Contado");
    setCreditDays(0);
  }

  const missingSku = lines.some((l) => !String(l.sku || "").trim());

  async function handleConfirm() {
    if (!supplierName.trim()) {
      toast({ title: "Falta el nombre del proveedor", variant: "destructive" });
      return;
    }
    if (lines.length === 0 || lines.every((l) => !l.sku && !l.description)) {
      toast({ title: "La factura no tiene líneas", variant: "destructive" });
      return;
    }
    if (missingSku) {
      toast({ title: "Todas las líneas deben tener un SKU", variant: "destructive" });
      return;
    }
    const ok = await confirm({
      title: "Confirmar factura de proveedor",
      description: `Se actualizará el stock de ${lines.length} producto(s), se creará la factura y la compra vinculada. ¿Continuar?`,
      confirmLabel: "Sí, guardar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;

    const isCredit = paymentType === "Crédito";
    const days = isCredit ? (Number(creditDays) || 0) : 0;
    const dueDate = isCredit && days > 0
      ? addDays(new Date(invoiceDate + "T00:00:00"), days).toISOString().slice(0, 10)
      : "";

    setStage("saving");
    try {
      // 1. Buscar/crear proveedor
      let supplier = suppliers.find(
        (s) => (s.name || "").trim().toLowerCase() === supplierName.trim().toLowerCase() ||
               (supplierDoc && s.document_number === supplierDoc)
      );
      if (!supplier) {
        supplier = await base44.entities.Supplier.create({
          name: supplierName.trim(),
          document_number: supplierDoc || "",
        });
        setSuppliers((prev) => [...prev, supplier]);
      }

      // 2. Refrescar productos para tener stock actual
      let allProducts = await base44.entities.Product.list(null, 1000);

      // 3. Por cada línea: buscar producto por sku, actualizar o crear
      for (const line of lines) {
        const sku = String(line.sku).trim();
        const qty = Number(line.quantity) || 0;
        const cost = Number(line.unit_price) || 0;
        const match = allProducts.find(
          (p) => String(p.sku || "").trim().toLowerCase() === sku.toLowerCase()
        );
        if (match) {
          const newStock = (Number(match.stock) || 0) + qty;
          await base44.entities.Product.update(match.id, { stock: newStock, cost });
        } else {
          const newProd = await base44.entities.Product.create({
            name: line.description || sku,
            sku,
            cost,
            price: Math.round(cost * (1 + (Number(margin) || 0) / 100)),
            stock: qty,
            supplier_id: supplier.id,
            iva_rate: 19,
          });
          allProducts = [...allProducts, newProd];
        }
      }

      // 4. Crear Purchase vinculado
      const prefix = getPrefix(company, "purchase");
      const number = await getNextDocNumber("Purchase", prefix);
      const purchaseItems = JSON.stringify(lines.map((l) => ({
        product_id: "",
        name: l.description || l.sku,
        quantity: Number(l.quantity) || 0,
        unit_cost: Number(l.unit_price) || 0,
        subtotal: (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
      })));
      const purchase = await base44.entities.Purchase.create({
        number,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        invoice_number: invoiceNumber,
        date: invoiceDate,
        items: purchaseItems,
        subtotal,
        iva_total: ivaTotal,
        total,
        payment_method: "Efectivo",
        payment_type: isCredit ? "Crédito" : "Contado",
        status: isCredit ? "Pendiente" : "Pagada",
      });

      // 5. Crear FacturaProveedor
      await base44.entities.FacturaProveedor.create({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        invoice_number: invoiceNumber,
        date: invoiceDate,
        items: JSON.stringify(lines.map((l) => ({
          sku: l.sku,
          description: l.description,
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          subtotal: (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
        }))),
        subtotal,
        iva_total: ivaTotal,
        total,
        pdf_url: pdfUri,
        purchase_id: purchase.id,
        payment_type: isCredit ? "Crédito" : "Contado",
        credit_days: days,
        payment_due_date: dueDate,
        status: "Aplicada",
      });

      toast({ title: "Factura guardada y stock actualizado", description: `Compra ${number} creada.` });
      setStage("done");
    } catch (err) {
      setError("Error al guardar: " + (err.message || "desconocido"));
      setStage("review");
    }
  }

  const busy = stage === "uploading" || stage === "extracting" || stage === "saving";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Cargar factura de proveedor</h1>
          <p className="text-sm text-slate-500">Sube un PDF, revisa los datos extraídos y actualiza inventario.</p>
        </div>
        {stage !== "idle" && stage !== "done" && (
          <Button variant="outline" size="sm" onClick={resetAll} disabled={busy}>
            <ArrowLeft className="w-4 h-4" /> Empezar de nuevo
          </Button>
        )}
      </div>

      {stage === "idle" && (
        <Card>
          <CardContent className="pt-6">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/30 transition-colors"
            >
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="font-medium text-slate-700">Selecciona el PDF de la factura</p>
              <p className="text-sm text-slate-400 mt-1">Se extraerán proveedor, número, fecha y líneas automáticamente</p>
            </div>
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleSelectPdf} />
          </CardContent>
        </Card>
      )}

      {(stage === "uploading" || stage === "extracting") && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center py-10">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mb-3" />
            <p className="font-medium">{stage === "uploading" ? "Subiendo PDF..." : "Extrayendo datos de la factura..."}</p>
            <p className="text-sm text-slate-400">{pdfName}</p>
          </CardContent>
        </Card>
      )}

      {stage === "done" && (
        <Card>
          <CardContent className="pt-6 flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <p className="font-semibold text-lg">Factura guardada correctamente</p>
            <p className="text-sm text-slate-500 mb-4">El inventario se actualizó y se creó la compra vinculada.</p>
            <Button onClick={resetAll}><Plus className="w-4 h-4" /> Cargar otra factura</Button>
          </CardContent>
        </Card>
      )}

      {stage === "review" && (
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Datos de la factura {pdfName && <span className="text-xs font-normal text-slate-400">· {pdfName}</span>}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Proveedor</Label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nombre del proveedor" />
              </div>
              <div>
                <Label>NIT / Documento</Label>
                <Input value={supplierDoc} onChange={(e) => setSupplierDoc(e.target.value)} placeholder="NIT" />
              </div>
              <div>
                <Label>Número de factura</Label>
                <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="N° factura" />
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <Label>Margen de venta para productos nuevos (%)</Label>
                <Input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} min={0} />
                <p className="text-xs text-slate-400 mt-1">Precio de venta = costo × (1 + margen). Solo aplica a productos nuevos.</p>
              </div>
              <div>
                <Label>Modo de compra</Label>
                <Select
                  value={paymentType}
                  onValueChange={(v) => {
                    setPaymentType(v);
                    if (v === "Crédito" && (!creditDays || creditDays === 0)) {
                      setCreditDays(company?.credit_default_days || 30);
                    }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contado">Contado</SelectItem>
                    <SelectItem value="Crédito">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentType === "Crédito" && (
                <div>
                  <Label>Plazo (días)</Label>
                  <Input type="number" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} min={1} />
                  <p className="text-xs text-slate-400 mt-1">Vencimiento: {invoiceDate && creditDays > 0 ? addDays(new Date(invoiceDate + "T00:00:00"), Number(creditDays) || 0).toLocaleDateString("es-CO") : "—"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Líneas de la factura</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b">
                      <th className="py-2 pr-2">SKU</th>
                      <th className="py-2 pr-2">Descripción</th>
                      <th className="py-2 pr-2 w-20">Cantidad</th>
                      <th className="py-2 pr-2 w-28">Precio unit.</th>
                      <th className="py-2 pr-2 w-28">Subtotal</th>
                      <th className="py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-1.5 pr-2">
                          <Input value={line.sku} onChange={(e) => updateLine(idx, "sku", e.target.value)} className={missingSku && !line.sku.trim() ? "border-rose-400" : ""} placeholder="SKU" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} placeholder="Descripción" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input type="number" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input type="number" value={line.unit_price} onChange={(e) => updateLine(idx, "unit_price", e.target.value)} />
                        </td>
                        <td className="py-1.5 pr-2 text-right font-medium">{fmtMoney((Number(line.quantity) || 0) * (Number(line.unit_price) || 0))}</td>
                        <td className="py-1.5">
                          <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={addLine}><Plus className="w-4 h-4" /> Agregar línea</Button>

              <div className="flex flex-col md:flex-row md:justify-end gap-2 mt-4 pt-4 border-t">
                <div className="flex justify-between md:w-64 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">{fmtMoney(subtotal)}</span>
                </div>
                {chargesIva(company) && (
                  <div className="flex justify-between md:w-64 text-sm">
                    <span className="text-slate-500">IVA</span>
                    <span className="font-medium">{fmtMoney(ivaTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between md:w-64 text-sm">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold">{fmtMoney(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="sticky bottom-0 bg-white/90 backdrop-blur border-t py-3 flex justify-end gap-2">
            <Button variant="outline" onClick={resetAll} disabled={busy}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar y guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
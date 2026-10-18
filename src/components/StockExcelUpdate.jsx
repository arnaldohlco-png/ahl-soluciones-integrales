import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";

const norm = (s) => String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const pick = (row, names) => {
  const k = Object.keys(row).find((key) => names.includes(norm(key)));
  return k ? row[k] : undefined;
};
const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

export default function StockExcelUpdate({ onDone }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      const existing = await fetchAll("Product");
      const bySku = new Map(existing.filter((p) => p.sku).map((p) => [String(p.sku).trim(), p]));
      const updates = [], creates = [], seen = new Set();
      let skipped = 0;
      for (const r of rows) {
        const sku = String(pick(r, ["codigo", "sku", "codigo sku"]) ?? "").trim();
        const stockRaw = pick(r, ["existencia", "cantidad", "stock"]);
        if (!sku || stockRaw === undefined || stockRaw === "" || seen.has(sku)) { skipped++; continue; }
        seen.add(sku);
        const stock = num(stockRaw);
        const found = bySku.get(sku);
        if (found) { updates.push({ id: found.id, stock }); continue; }
        const name = String(pick(r, ["repuesto", "descripcion", "nombre"]) ?? "").trim();
        creates.push({
          sku, name: name || sku, stock,
          price: num(pick(r, ["precio", "precio de venta"])),
          cost: num(pick(r, ["costo"])),
          brand: String(pick(r, ["marca"]) ?? ""),
        });
      }
      for (let i = 0; i < updates.length; i += 200) await base44.entities.Product.bulkUpdate(updates.slice(i, i + 200));
      for (let i = 0; i < creates.length; i += 200) await base44.entities.Product.bulkCreate(creates.slice(i, i + 200));
      setResult({ updated: updates.length, created: creates.length, skipped });
      onDone?.();
    } catch (err) {
      setResult({ error: err.message || "No se pudo leer el archivo" });
    }
    setBusy(false);
  }

  return (
    <>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <Button variant="outline" onClick={() => ref.current?.click()} disabled={busy}>
        <RefreshCw className={`w-4 h-4 mr-2 ${busy ? "animate-spin" : ""}`} />
        {busy ? "Actualizando..." : "Actualizar inventario"}
      </Button>
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resultado de la actualización</DialogTitle></DialogHeader>
          {result?.error ? <p className="text-sm text-red-600">{result.error}</p> : (
            <div className="text-sm space-y-1">
              <p>Productos actualizados: <b>{result?.updated}</b></p>
              <p>Referencias nuevas creadas: <b>{result?.created}</b></p>
              <p>Filas omitidas (sin código o cantidad): <b>{result?.skipped}</b></p>
              <p className="text-slate-500 pt-2">Columnas: Código, Existencia (opcional: Repuesto, Precio, Costo, Marca).</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
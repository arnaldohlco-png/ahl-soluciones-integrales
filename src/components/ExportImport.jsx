import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";

function toCSV(rows, fields) {
  const headers = fields.join(",");
  const lines = rows.map((r) =>
    fields.map((f) => {
      let v = r[f];
      if (v === null || v === undefined) v = "";
      if (typeof v === "object") v = JSON.stringify(v);
      v = String(v).replace(/"/g, '""');
      if (v.includes(",") || v.includes('"') || v.includes("\n")) v = `"${v}"`;
      return v;
    }).join(",")
  );
  return [headers, ...lines].join("\n");
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (ch !== "\r") { cell += ch; }
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export default function ExportImport({ entityName, fields, label = "Exportar" }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const doExport = async () => {
    setBusy(true);
    try {
      const data = await base44.entities[entityName].list("-created_date", 5000);
      const csv = toCSV(data, fields);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entityName}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert("Error al exportar"); }
    setBusy(false);
  };

  const doImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) { alert("Archivo vacío"); setBusy(false); return; }
      const headers = rows[0].map((h) => h.trim());
      const records = rows.slice(1).map((r) => {
        const obj = {};
        headers.forEach((h, i) => {
          let v = r[i] || "";
          const f = fields.find((x) => x === h);
          if (!f) return;
          const numFields = ["price", "cost", "stock", "min_stock", "iva_rate", "balance", "credit_limit", "salary", "commission_percentage", "labor_cost", "parts_cost", "lubricants_cost", "hours_worked", "technician_commission", "cost", "previous_mileage", "current_mileage", "oil_change_interval", "next_oil_change", "amount", "credit_default_days"];
          if (numFields.includes(h) && v !== "") v = Number(v) || 0;
          if (v === "") v = undefined;
          obj[h] = v;
        });
        return obj;
      }).filter((r) => r && Object.keys(r).length > 0);
      if (records.length === 0) { alert("No se encontraron registros válidos"); setBusy(false); return; }
      await base44.entities[entityName].bulkCreate(records);
      alert(`${records.length} registros importados`);
      window.location.reload();
    } catch (e) { console.error(e); alert("Error al importar: " + e.message); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={doExport} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="ml-1">{label}</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
        <Upload className="w-4 h-4" />
        <span className="ml-1">Importar</span>
      </Button>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={doImport} />
    </div>
  );
}
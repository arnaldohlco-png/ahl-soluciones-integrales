import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

const NUM_FIELDS = [
  "price", "cost", "stock", "min_stock", "iva_rate", "balance", "credit_limit",
  "salary", "commission_percentage", "labor_cost", "parts_cost", "lubricants_cost",
  "hours_worked", "technician_commission", "previous_mileage", "current_mileage",
  "oil_change_interval", "next_oil_change", "amount", "credit_default_days",
  "subtotal", "iva", "iva_total", "discount", "total", "amount_paid", "change",
  "installment_amount", "credit_days", "installments", "year", "displacement", "mileage"
];
const ITEM_NUM_KEYS = ["quantity", "unit_price", "unit_cost", "subtotal"];

function toCSV(rows, headers) {
  const headerLine = headers.join(",");
  const lines = rows.map((r) =>
    headers.map((h) => {
      let v = r[h];
      if (v === null || v === undefined) v = "";
      if (typeof v === "object") v = JSON.stringify(v);
      v = String(v).replace(/"/g, '""');
      if (v.includes(",") || v.includes('"') || v.includes("\n")) v = `"${v}"`;
      return v;
    }).join(",")
  );
  return [headerLine, ...lines].join("\n");
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

function flattenRecords(records, fields, itemFields) {
  const maxItems = {};
  const subkeys = {};
  itemFields.forEach((f) => {
    maxItems[f] = 0;
    const keySet = new Set();
    records.forEach((r) => {
      let items = [];
      try { items = JSON.parse(r[f] || "[]"); } catch { items = []; }
      if (items.length > maxItems[f]) maxItems[f] = items.length;
      items.forEach((item) => {
        if (typeof item === "object") Object.keys(item).forEach((k) => keySet.add(k));
      });
    });
    subkeys[f] = Array.from(keySet);
  });
  const headers = [];
  fields.forEach((f) => {
    if (itemFields.includes(f) && maxItems[f] > 0) {
      for (let i = 1; i <= maxItems[f]; i++) subkeys[f].forEach((k) => headers.push(`${f}_${i}_${k}`));
    } else if (!itemFields.includes(f)) {
      headers.push(f);
    } else {
      headers.push(f);
    }
  });
  const flatRows = records.map((r) => {
    const row = {};
    fields.forEach((f) => {
      if (itemFields.includes(f) && maxItems[f] > 0) {
        let items = [];
        try { items = JSON.parse(r[f] || "[]"); } catch { items = []; }
        for (let i = 1; i <= maxItems[f]; i++) subkeys[f].forEach((k) => { row[`${f}_${i}_${k}`] = items[i - 1]?.[k] ?? ""; });
      } else {
        row[f] = r[f];
      }
    });
    return row;
  });
  return { headers, flatRows };
}

function reassembleItems(obj, itemFields) {
  const result = {};
  Object.keys(obj).forEach((k) => { if (obj[k] !== undefined && obj[k] !== "") result[k] = obj[k]; });
  itemFields.forEach((f) => {
    const items = [];
    let i = 1;
    while (true) {
      const prefix = `${f}_${i}_`;
      const keys = Object.keys(result).filter((k) => k.startsWith(prefix));
      if (keys.length === 0) break;
      const item = {};
      keys.forEach((k) => {
        const subkey = k.slice(prefix.length);
        let val = result[k];
        if (ITEM_NUM_KEYS.includes(subkey) && val !== "") val = Number(val) || 0;
        if (val !== "" && val !== undefined) item[subkey] = val;
      });
      if (Object.keys(item).length > 0) items.push(item);
      i++;
    }
    if (items.length > 0) result[f] = JSON.stringify(items);
    Object.keys(result).forEach((k) => { if (k.startsWith(f + "_")) delete result[k]; });
  });
  return result;
}

async function fetchLookupMap(lookup, reverse) {
  const { entity, labelField, valueField } = lookup;
  const records = await base44.entities[entity].list("-created_date", 5000);
  const map = {};
  records.forEach((r) => { if (reverse) map[r[labelField]] = r[valueField]; else map[r[valueField]] = r[labelField]; });
  return map;
}

export default function ExportImport({ entityName, fields, columns, itemFields = [], lookups = {}, label = "Exportar" }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const cols = columns || (fields || []).map((f) => ({ header: f, field: f }));

  const doExport = async () => {
    setBusy(true);
    try {
      const data = await base44.entities[entityName].list("-created_date", 5000);
      const lookupMaps = {};
      for (const field of Object.keys(lookups)) lookupMaps[field] = await fetchLookupMap(lookups[field], false);
      const resolvedData = data.map((r) => {
        const row = { ...r };
        Object.keys(lookups).forEach((field) => { if (row[field] && lookupMaps[field][row[field]]) row[field] = lookupMaps[field][row[field]]; });
        return row;
      });

      let headers, flatRows;
      if (columns) {
        headers = cols.map((c) => c.header);
        flatRows = resolvedData.map((r) => { const row = {}; cols.forEach((c) => { row[c.header] = r[c.field] ?? ""; }); return row; });
      } else {
        const result = flattenRecords(resolvedData, fields, itemFields);
        headers = result.headers; flatRows = result.flatRows;
      }

      const ws = XLSX.utils.json_to_sheet(flatRows, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Datos");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entityName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert("Error al exportar: " + e.message); }
    setBusy(false);
  };

  const doImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      let rows;
      const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      if (isXlsx) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
      } else {
        const text = await file.text();
        rows = parseCSV(text);
      }
      if (rows.length < 2) { alert("Archivo vacío"); setBusy(false); return; }
      const headers = rows[0].map((h) => String(h).trim());

      const lookupMaps = {};
      for (const field of Object.keys(lookups)) lookupMaps[field] = await fetchLookupMap(lookups[field], true);

      const records = rows.slice(1).map((r) => {
        const obj = {};
        headers.forEach((h, i) => {
          const col = cols.find((c) => c.header === h);
          if (!col) return;
          let v = r[i];
          if (v === null || v === undefined || v === "") return;
          if (NUM_FIELDS.includes(col.field)) v = Number(v) || 0;
          else v = String(v);
          if (lookups[col.field] && lookupMaps[col.field][v]) v = lookupMaps[col.field][v];
          obj[col.field] = v;
        });
        return reassembleItems(obj, itemFields);
      }).filter((r) => r && Object.keys(r).length > 0);

      if (records.length === 0) { alert("No se encontraron registros válidos"); setBusy(false); return; }

      // BulkCreate in batches of 500
      for (let i = 0; i < records.length; i += 500) {
        await base44.entities[entityName].bulkCreate(records.slice(i, i + 500));
      }
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
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doImport} />
    </div>
  );
}
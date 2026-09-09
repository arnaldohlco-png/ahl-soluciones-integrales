import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

function parseLines(str) {
  return (str || "").split(",").map((s) => s.trim()).filter(Boolean);
}

export default function BrandExportImport({ onDone }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const doExport = async () => {
    setBusy(true);
    try {
      const brands = await base44.entities.Brand.list("-created_date", 5000);
      // Build transposed structure: each column = a brand
      // Row 0 = headers (brand names), Row 1 = country, Row 2+ = lines
      const maxLines = Math.max(0, ...brands.map((b) => parseLines(b.lines).length));
      const matrix = [];

      // Header row: brand names
      matrix.push(brands.map((b) => b.name || ""));
      // Country row
      matrix.push(brands.map((b) => b.country || ""));
      // Lines rows
      for (let i = 0; i < maxLines; i++) {
        matrix.push(brands.map((b) => {
          const lines = parseLines(b.lines);
          return lines[i] || "";
        }));
      }

      // Build worksheet from array-of-arrays (transposed: columns are brands)
      const ws = XLSX.utils.aoa_to_sheet(matrix);
      // Set column widths
      brands.forEach((_, idx) => {
        ws["!cols"] = ws["!cols"] || [];
        ws["!cols"][idx] = { wch: 22 };
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Marcas");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Marcas_Lineas_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
      } else {
        const text = await file.text();
        rows = text.split("\n").map((line) => line.split(",").map((c) => c.trim()));
      }
      if (rows.length < 2) { alert("Archivo vacío"); setBusy(false); return; }

      const headerRow = rows[0].map((h) => String(h).trim());
      const countryRow = (rows[1] || []).map((c) => String(c || "").trim());
      const existing = await base44.entities.Brand.list("-created_date", 5000);
      const existingMap = {};
      existing.forEach((b) => { if (b.name) existingMap[b.name.toLowerCase()] = b; });

      const records = [];
      const updates = [];

      for (let col = 0; col < headerRow.length; col++) {
        const name = headerRow[col];
        if (!name) continue;
        const country = countryRow[col] || "";
        const lines = [];
        for (let r = 2; r < rows.length; r++) {
          const val = rows[r][col];
          if (val !== undefined && val !== null && String(val).trim()) {
            lines.push(String(val).trim());
          }
        }
        const payload = { name, country, lines: lines.join(", ") };
        const existingBrand = existingMap[name.toLowerCase()];
        if (existingBrand) {
          updates.push({ id: existingBrand.id, ...payload });
        } else {
          records.push(payload);
        }
      }

      if (records.length > 0) {
        await base44.entities.Brand.bulkCreate(records);
      }
      for (const u of updates) {
        const { id, ...data } = u;
        await base44.entities.Brand.update(id, data);
      }
      alert(`${records.length + updates.length} marcas procesadas (${records.length} nuevas, ${updates.length} actualizadas)`);
      if (onDone) onDone();
      else window.location.reload();
    } catch (e) { console.error(e); alert("Error al importar: " + e.message); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={doExport} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="ml-1">Exportar</span>
      </Button>
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
        <Upload className="w-4 h-4" />
        <span className="ml-1">Importar</span>
      </Button>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doImport} />
    </div>
  );
}
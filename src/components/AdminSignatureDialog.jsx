import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Upload, PenLine } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { fileToSignatureDataUrl, dataUrlToFile } from "@/lib/signatureFile";

export default function AdminSignatureDialog({ open, onOpenChange, current, onSaved }) {
  const [mode, setMode] = useState("draw");
  const [drawn, setDrawn] = useState("");
  const [fileImg, setFileImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pending = mode === "draw" ? drawn : fileImg;

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(""); setBusy(true);
    try { setFileImg(await fileToSignatureDataUrl(f)); }
    catch (err) { console.error(err); setError("No se pudo leer el archivo. Use una imagen o PDF válido."); }
    setBusy(false);
    e.target.value = "";
  };

  const save = async () => {
    if (!pending) return;
    setBusy(true); setError("");
    try {
      const file = await dataUrlToFile(pending);
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      await onSaved(file_url);
      setDrawn(""); setFileImg("");
      onOpenChange(false);
    } catch (err) { console.error(err); setError("Error al guardar la firma."); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Firma digital del administrador</DialogTitle>
          <DialogDescription>Dibuje la firma o cárguela desde una imagen o PDF. Se usará en todos los documentos.</DialogDescription>
        </DialogHeader>

        {current && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Firma actual</p>
            <img src={current} alt="Firma actual" className="h-16 object-contain border border-slate-200 rounded bg-white p-1" />
          </div>
        )}

        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === "draw" ? "default" : "outline"} onClick={() => setMode("draw")}><PenLine className="w-4 h-4 mr-1" />Dibujar</Button>
          <Button type="button" size="sm" variant={mode === "file" ? "default" : "outline"} onClick={() => setMode("file")}><Upload className="w-4 h-4 mr-1" />Imagen o PDF</Button>
        </div>

        {mode === "draw" ? (
          <SignaturePad value={drawn} onChange={setDrawn} height={140} />
        ) : (
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Seleccionar archivo
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} disabled={busy} />
            </label>
            {fileImg && <img src={fileImg} alt="Vista previa" className="max-h-40 object-contain border border-slate-200 rounded bg-white p-1" />}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={save} disabled={!pending || busy} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Guardar firma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, FileDown, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ConfirmProvider";

export default function RestoreBackupDialog({ open, onOpenChange }) {
  const confirm = useConfirm();
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backups, setBackups] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setRestoreResult(null);
      setSelectedFile(null);
      setLoadingBackups(true);
      try {
        const res = await base44.functions.invoke('restoreFromDrive', { action: 'list' });
        if (res.data?.success) {
          setBackups(res.data.files || []);
        } else {
          alert("Error al listar respaldos: " + (res.data?.error || "desconocido"));
        }
      } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
      }
      setLoadingBackups(false);
    })();
  }, [open]);

  const doRestore = async () => {
    if (!selectedFile) return;
    if (!(await confirm({ title: "⚠️ Restaurar respaldo", description: "Esta acción reemplazará TODOS los datos actuales con los del respaldo seleccionado. ¿Está seguro?", confirmText: "Sí, restaurar", cancelText: "No", variant: "destructive" }))) return;
    setRestoring(true);
    setRestoreResult(null);
    try {
      const res = await base44.functions.invoke('restoreFromDrive', { action: 'restore', fileId: selectedFile });
      if (res.data?.results) {
        setRestoreResult(res.data.results);
      } else {
        alert("Error al restaurar: " + (res.data?.error || "desconocido"));
      }
    } catch (e) {
      console.error(e);
      alert("Error al restaurar: " + (e.response?.data?.error || e.message));
    }
    setRestoring(false);
  };

  const doRestoreLocal = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) { alert("Selecciona un archivo .json de respaldo."); return; }
    if (!(await confirm({ title: "Restaurar copia local", description: `Se actualizarán los registros existentes y se crearán los faltantes con el archivo "${file.name}". No se duplican datos. ¿Continuar?`, confirmText: "Sí, restaurar", cancelText: "No", variant: "destructive" }))) return;
    setRestoring(true);
    setRestoreResult(null);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const res = await base44.functions.invoke('restoreFromDrive', { action: 'restore_local', fileUri: file_uri });
      if (res.data?.results) setRestoreResult(res.data.results);
      else alert("Error al restaurar: " + (res.data?.error || "desconocido"));
    } catch (err) {
      console.error(err);
      alert("Error al restaurar: " + (err.response?.data?.error || err.message));
    }
    setRestoring(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !restoring && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            Restaurar desde copia de seguridad
          </DialogTitle>
          <DialogDescription>
            Selecciona un respaldo de Google Drive para reemplazar los datos actuales.
          </DialogDescription>
        </DialogHeader>

        {restoreResult ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <FileDown className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800">Restauración completada. Resumen por módulo:</div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
              {Object.entries(restoreResult).map(([entity, res]) => (
                <div key={entity} className="flex justify-between px-2 py-1 rounded hover:bg-slate-50">
                  <span className="text-slate-600">{entity}</span>
                  <span className={res.error ? "text-red-500" : "text-emerald-600 font-medium"}>
                    {res.error ? `Error: ${res.error}` : res.restored != null ? `${res.restored} registros` : "omitido"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Esta acción <strong>reemplazará</strong> los datos actuales del taller con los del respaldo. Proceder con precaución.
              </p>
            </div>
            {loadingBackups ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No se encontraron respaldos en Google Drive.</div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {backups.map((f) => (
                  <label
                    key={f.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedFile === f.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <input type="radio" name="backup" checked={selectedFile === f.id} onChange={() => setSelectedFile(f.id)} className="accent-amber-500" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{f.name}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(f.createdTime).toLocaleString("es-CO")}
                        {f.size ? ` · ${Math.round(Number(f.size) / 1024)} KB` : ""}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </>
        )}

        <DialogFooter>
          {restoreResult ? (
            <Button onClick={() => onOpenChange(false)} className="bg-amber-500 hover:bg-amber-600 text-slate-900">Cerrar</Button>
          ) : (
            <>
              <label className={`inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-input text-sm font-medium cursor-pointer hover:bg-accent ${restoring ? "opacity-50 pointer-events-none" : ""}`}>
                <FileDown className="w-4 h-4" />Desde copia local (.json)
                <input type="file" accept=".json,application/json" className="hidden" onChange={doRestoreLocal} disabled={restoring} />
              </label>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={restoring}>Cancelar</Button>
              <Button onClick={doRestore} disabled={!selectedFile || restoring} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
                {restoring ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                {restoring ? "Restaurando..." : "Restaurar"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
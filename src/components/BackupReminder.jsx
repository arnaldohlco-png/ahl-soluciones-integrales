import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { HardDriveDownload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "motocontrol_last_backup";
const REMIND_DAYS = 7;

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

export function isBackupDue() {
  return daysSince(localStorage.getItem(STORAGE_KEY)) >= REMIND_DAYS;
}

export default function BackupReminder({ open, onContinue, onCancel }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const last = localStorage.getItem(STORAGE_KEY);

  async function runBackup() {
    setRunning(true);
    setError("");
    try {
      const res = await base44.functions.invoke("backupToDrive", {});
      if (res?.error) throw new Error(res.error);
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      onContinue();
    } catch (e) {
      setError(e.message || "No se pudo completar el respaldo");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !running && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDriveDownload className="w-5 h-5 text-amber-600" /> Copia de seguridad
          </DialogTitle>
          <DialogDescription>
            {last
              ? `Tu último respaldo fue hace ${Math.floor(daysSince(last))} días.`
              : "Aún no has hecho un respaldo de tu información."}{" "}
            ¿Quieres hacerlo antes de salir?
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onContinue} disabled={running}>Salir sin respaldo</Button>
          <Button onClick={runBackup} disabled={running} className="bg-amber-500 text-slate-900 hover:bg-amber-400">
            {running && <Loader2 className="w-4 h-4 animate-spin" />}
            {running ? "Respaldando..." : "Hacer respaldo y salir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
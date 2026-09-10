import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { HardDriveDownload, X, Loader2, CheckCircle2 } from "lucide-react";

const STORAGE_KEY = "motocontrol_last_backup";
const REMIND_DAYS = 7;

function daysSince(iso) {
  if (!iso) return Infinity;
  const diff = Date.now() - new Date(iso).getTime();
  return diff / 86400000;
}

export default function BackupReminder() {
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [dismissed, setDismissed] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const due = daysSince(lastBackup) >= REMIND_DAYS;

  async function runBackup() {
    setRunning(true);
    setError("");
    try {
      const res = await base44.functions.invoke("backupToDrive", {});
      if (res?.error) throw new Error(res.error);
      const iso = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, iso);
      setLastBackup(iso);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } catch (e) {
      setError(e.message || "No se pudo completar el respaldo");
    } finally {
      setRunning(false);
    }
  }

  if (!due || dismissed) return null;

  return (
    <div className="mx-4 mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
      <div className="flex items-start gap-2">
        <HardDriveDownload className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-semibold">Recordatorio de copia de seguridad</p>
          <p className="mt-0.5 text-amber-800">
            {lastBackup
              ? `Último respaldo hace ${Math.floor(daysSince(lastBackup))} días.`
              : "Aún no has hecho un respaldo de tu información."}
          </p>
          {error && <p className="mt-1 text-red-600">{error}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={runBackup}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-2.5 py-1 font-semibold text-slate-900 hover:bg-amber-400 disabled:opacity-60"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {running ? "Respaldando..." : "Hacer respaldo ahora"}
            </button>
            {done && (
              <span className="inline-flex items-center gap-1 text-green-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Respaldo creado en Google Drive
              </span>
            )}
            <button
              onClick={() => setDismissed(true)}
              className="ml-auto inline-flex items-center gap-1 text-amber-700 hover:text-amber-900"
            >
              <X className="w-3.5 h-3.5" /> Posponer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
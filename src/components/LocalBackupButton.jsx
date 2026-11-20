import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

export default function LocalBackupButton() {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("exportBackup", {});
      if (!res.data || res.data.error) throw new Error(res.data?.error || "Error al generar la copia");
      const blob = new Blob([JSON.stringify(res.data)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      a.href = url;
      a.download = `AHL_backup_${d.toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || "No se pudo generar la copia");
    }
    setBusy(false);
  };

  return (
    <Button onClick={run} disabled={busy} variant="outline">
      {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
      {busy ? "Generando..." : "Descargar copia local"}
    </Button>
  );
}
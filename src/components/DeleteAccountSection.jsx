import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, UserX, AlertTriangle } from "lucide-react";

export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const doDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("deleteMyAccount", {});
      if (!res.data?.success) throw new Error(res.data?.error || "No se pudo eliminar la cuenta");
      await base44.auth.logout("/login");
    } catch (e) {
      setError(e.response?.data?.error || e.message);
      setDeleting(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <UserX className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Eliminar mi cuenta</h3>
            <p className="text-sm text-muted-foreground">Elimina tu acceso a la aplicación. Los datos del taller se conservan.</p>
          </div>
        </div>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setError(""); setOpen(true); }}>
          Eliminar mi cuenta
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => !deleting && setOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" />¿Eliminar mi cuenta?</DialogTitle>
            <DialogDescription>
              Se eliminará únicamente tu cuenta de acceso y perderás el ingreso a la aplicación. Los registros del taller
              (clientes, órdenes, ventas, inventario, etc.) NO se borran. Para volver a entrar necesitarás una nueva invitación.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {deleting ? "Eliminando..." : "Sí, eliminar mi cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
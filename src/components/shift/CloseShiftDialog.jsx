import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, User, Clock, FileText, Ban } from "lucide-react";
import nowLocalISO, { fmtBogota } from "@/lib/localDate";
import { findCurrentTurno, turnoSummary } from "@/lib/turnos";
import { buildShiftReport, loadVoids } from "@/lib/shiftReport";
import ShiftReportView from "@/components/shift/ShiftReportView";
import VoidSaleDialog from "@/components/shift/VoidSaleDialog";

const REGISTERS = ["Caja almacén", "Bancos"];
const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function CloseShiftDialog({ open, onOpenChange, onClosed, initialRegister = "Caja almacén" }) {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [register, setRegister] = useState(initialRegister);
  const [counted, setCounted] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voids, setVoids] = useState([]);
  const [savedClosure, setSavedClosure] = useState(null);
  const [report, setReport] = useState(null);
  const [voidOpen, setVoidOpen] = useState(false);

  const turno = useMemo(() => findCurrentTurno(list, register), [list, register]);
  const open_ = turno && !turno.alreadyClosed;
  const summary = useMemo(() => (open_ ? turnoSummary(list, register, turno, null) : null), [list, register, turno, open_]);

  const reload = async () => {
    setLoading(true);
    const data = await fetchAll("CashMovement", "-date");
    setList(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    setCounted(""); setError(""); setRegister(initialRegister);
    reload();
  }, [open]);

  useEffect(() => {
    if (!open || !turno) { setVoids([]); setSavedClosure(null); return; }
    loadVoids(register, turno.openDate, turno.closeDate).then(setVoids);
    if (turno.alreadyClosed) {
      base44.entities.ShiftClosure.filter({ apertura_id: turno.apertura.id }, { limit: 1 }).then((p) => setSavedClosure(p.items?.[0] || null));
    } else setSavedClosure(null);
  }, [open, turno?.apertura?.id, turno?.alreadyClosed, list.length]);

  const countedN = Number(counted);
  const diff = summary ? countedN - summary.esperado : 0;

  const confirmClose = async () => {
    if (!open_ || counted === "" || countedN < 0) return;
    setSaving(true);
    setError("");
    let closure = null;
    try {
      // Revalidar contra datos frescos para evitar cierres duplicados
      const fresh = await fetchAll("CashMovement", "-date");
      const t = findCurrentTurno(fresh, register);
      if (!t || t.alreadyClosed) { setList(fresh); throw new Error("Este turno ya fue cerrado."); }
      const freshVoids = await loadVoids(register, t.openDate, null);
      const sum = turnoSummary(fresh, register, t, null);
      const closeDate = nowLocalISO();
      const rep = await buildShiftReport({ list: fresh, register, turno: t, counted: countedN, responsible: user?.full_name || user?.email || "", closeDate, voids: freshVoids });
      closure = await base44.entities.ShiftClosure.create({
        register_type: register, turno_number: t.turno, apertura_id: t.apertura.id, responsible: rep.responsible,
        open_date: t.openDate, close_date: closeDate, base: t.base || 0, expected: sum.esperado, counted: countedN,
        difference: countedN - sum.esperado, report: JSON.stringify(rep),
      });
      const base = { payment_method: "Efectivo", register_type: register, date: closeDate };
      const tv = `Turno ${t.turno} | ${t.vendedor || "Sin vendedor"}`;
      const d = countedN - sum.esperado;
      const movs = [];
      if (d > 0) movs.push({ ...base, type: "Entrada", category: "Otro ingreso", amount: d, description: `Cierre de caja - Sobrante | ${tv}` });
      else if (d < 0) movs.push({ ...base, type: "Salida", category: "Otro egreso", amount: Math.abs(d), description: `Cierre de caja - Faltante | ${tv}` });
      if (countedN > 0) movs.push({ ...base, type: "Salida", category: "Retiro", amount: countedN, description: `Cierre de caja - Retiro de efectivo | ${tv}` });
      if (movs.length === 0) movs.push({ ...base, type: "Salida", category: "Otro egreso", amount: 0, description: `Cierre de caja - Cuadre exacto | ${tv}` });
      await base44.entities.CashMovement.bulkCreate(movs);
      setReport(rep);
      onOpenChange(false);
      onClosed?.();
    } catch (e) {
      if (closure) await base44.entities.ShiftClosure.delete(closure.id).catch(() => {});
      setError(e.message || "No se pudo cerrar el turno");
    } finally { setSaving(false); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cerrar turno</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Caja</Label>
              <Select value={register} onValueChange={(v) => { setRegister(v); setCounted(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REGISTERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : !turno ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 text-center">No hay turno para <b>{register}</b>. Abre uno antes de cerrar.</div>
            ) : turno.alreadyClosed ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                <p>El turno {turno.turno} de {register} ya fue cerrado. No hay un turno abierto.</p>
                {savedClosure && <Button size="sm" variant="outline" onClick={() => setReport(JSON.parse(savedClosure.report))}><FileText className="w-4 h-4" /> Ver reporte del cierre</Button>}
              </div>
            ) : (
              <>
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <p className="font-bold text-slate-900">Turno {turno.turno}</p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-600"><User className="w-3.5 h-3.5" /> Responsable del cierre: {user?.full_name || user?.email}</p>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock className="w-3.5 h-3.5" /> Abierto: {fmtBogota(turno.openDate)}</p>
                </div>
                <div>
                  <Label>Efectivo contado físicamente *</Label>
                  <Input type="number" min="0" placeholder="0" value={counted} onChange={(e) => setCounted(e.target.value)} />
                </div>
                {summary && counted !== "" && (
                  <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between"><span>Base + entradas − salidas</span><span className="font-semibold">{fmt(summary.esperado)}</span></div>
                    <div className="flex justify-between"><span>Contado</span><span>{fmt(countedN)}</span></div>
                    <div className={`flex justify-between font-bold ${diff === 0 ? "text-emerald-700" : diff > 0 ? "text-amber-700" : "text-red-700"}`}>
                      <span>Diferencia</span><span>{diff === 0 ? "Cuadre exacto" : `${diff > 0 ? "Sobrante" : "Faltante"}: ${fmt(Math.abs(diff))}`}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Anulaciones del turno: <b>{voids.length}</b></span>
                  <Button size="sm" variant="outline" onClick={() => setVoidOpen(true)}><Ban className="w-4 h-4" /> Anular venta</Button>
                </div>
              </>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={confirmClose} disabled={saving || !open_ || counted === "" || countedN < 0} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Cerrando..." : "Cerrar turno y generar reporte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {open_ && (
        <VoidSaleDialog open={voidOpen} onOpenChange={setVoidOpen} list={list} register={register} turno={turno} voids={voids}
          userName={user?.full_name} onDone={reload} />
      )}
      {report && <ShiftReportView report={report} onClose={() => setReport(null)} />}
    </>
  );
}
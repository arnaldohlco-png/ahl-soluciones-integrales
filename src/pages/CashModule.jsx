// Caja y Bancos — Apertura y cierre por turnos
import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Landmark, Plus, ArrowDownCircle, ArrowUpCircle, Search, User, Clock } from "lucide-react";
import moment from "moment";
import { matchAny } from "@/lib/search";
import nowLocalISO, { todayLocalKey, localDateKey } from "@/lib/localDate";
import {
  isApertura, isCierre, nextTurnoNumber, findCurrentTurno, findOpenTurno,
  turnoWindow, turnoSummary, turnoLabel, buildAperturaDescription, parseTurnoDesc,
} from "@/lib/turnos";

const REGISTERS = ["Caja principal", "Caja taller", "Caja almacén", "Bancos"];
const METHODS = ["Efectivo", "Transferencia", "Tarjeta", "Otros"];
const ENTRY_CATS = ["Venta", "Abono", "Otro ingreso"];
const EXIT_CATS = ["Gasto", "Compra", "Retiro", "Pago", "Otro egreso"];
const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

export default function Cash() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState("");
  const [filterRegister, setFilterRegister] = useState("all");
  const [filterTurnoId, setFilterTurnoId] = useState("all");
  const [filterDay, setFilterDay] = useState("hoy");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "Entrada", category: "Otro ingreso", amount: 0, description: "",
    payment_method: "Efectivo", register_type: "Caja principal",
    date: nowLocalISO(),
  });
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingForm, setOpeningForm] = useState({ register_type: "Caja principal", amount: 0, payment_method: "Efectivo", vendedor: "" });
  const [closingOpen, setClosingOpen] = useState(false);
  const [closingForm, setClosingForm] = useState({ register_type: "Caja principal", counted: 0 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [data, me] = await Promise.all([
        fetchAll("CashMovement", "-date"),
        base44.auth.me().catch(() => null),
      ]);
      setList(data);
      if (me?.full_name) setCurrentUser(me.full_name);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // Saldos por caja: solo el neto del turno abierto. Bancos acumula sin turno
  // (las transferencias/tarjeta no son efectivo físico y no se cuadran por turno).
  const balances = useMemo(() => {
    const result = {};
    REGISTERS.forEach((r) => (result[r] = 0));
    REGISTERS.forEach((reg) => {
      if (reg === "Bancos") {
        // Bancos: acumulado histórico (no tiene turno de efectivo)
        result[reg] = list
          .filter((m) => (m.register_type || "Caja principal") === "Bancos")
          .reduce((s, m) => s + (m.type === "Entrada" ? m.amount || 0 : -(m.amount || 0)), 0);
      } else {
        // Cajas de efectivo: solo el neto del turno abierto
        const turno = findOpenTurno(list, reg);
        if (!turno) {
          // Sin turno abierto: mostrar el neto de los movimientos de HOY (hora Bogotá)
          // para que las ventas hechas sin abrir turno no queden invisibles.
          const today = todayLocalKey();
          result[reg] = list
            .filter((m) => m.register_type === reg && !isCierre(m) && localDateKey(new Date(m.date)) === today)
            .reduce((s, m) => s + (m.type === "Entrada" ? m.amount || 0 : -(m.amount || 0)), 0);
          return;
        }
        const movs = turnoWindow(list, reg, turno.apertura.date, null);
        const apertura = turno.base || 0;
        const entradas = movs
          .filter((m) => !isApertura(m) && !isCierre(m) && m.type === "Entrada")
          .reduce((s, m) => s + (m.amount || 0), 0);
        const salidas = movs
          .filter((m) => !isCierre(m) && m.type === "Salida")
          .reduce((s, m) => s + (m.amount || 0), 0);
        result[reg] = apertura + entradas - salidas;
      }
    });
    return result;
  }, [list]);

  const totalBalance = Object.values(balances).reduce((s, v) => s + v, 0);

  // Open turnos per register (for active-turno cards)
  const openTurnos = useMemo(() => {
    return REGISTERS.map((r) => findOpenTurno(list, r)).filter(Boolean);
  }, [list]);

  // All turnos (for the turno filter)
  const turnos = useMemo(() => {
    const aps = list.filter(isApertura).sort((a, b) => new Date(b.date) - new Date(a.date));
    return aps.map((ap) => {
      const info = parseTurnoDesc(ap.description);
      const apDate = new Date(ap.date);
      const ci = list.find((m) => m.register_type === ap.register_type && isCierre(m) && new Date(m.date) > apDate);
      return {
        id: ap.id,
        turno: info.turno,
        vendedor: info.vendedor,
        register: ap.register_type,
        open: !ci,
        openDate: ap.date,
        closeDate: ci?.date || null,
      };
    });
  }, [list]);

  const openApIds = useMemo(() => new Set(openTurnos.map((t) => t.apertura.id)), [openTurnos]);
  const todayKey = useMemo(() => todayLocalKey(), []);

  const filtered = list.filter((m) => {
    const matchReg = filterRegister === "all" || m.register_type === filterRegister;
    let matchTurno = true;
    if (filterTurnoId !== "all") {
      const t = turnos.find((x) => x.id === filterTurnoId);
      if (t) {
        const start = new Date(t.openDate).getTime();
        const end = t.closeDate ? new Date(t.closeDate).getTime() : Date.now();
        const ts = new Date(m.date).getTime();
        matchTurno = ts >= start && ts <= end && m.register_type === t.register;
      }
    }
    let matchDay = true;
    if (filterDay === "hoy") {
      const isToday = localDateKey(new Date(m.date)) === todayKey;
      const isBase = openApIds.has(m.id);
      matchDay = isToday || isBase;
    }
    const matchSearch = matchAny(search, m.description, m.category, m.amount);
    return matchReg && matchTurno && matchDay && matchSearch;
  });

  const openNew = () => {
    setForm({
      type: "Entrada", category: "Otro ingreso", amount: 0, description: "",
      payment_method: "Efectivo", register_type: "Caja principal", date: nowLocalISO(),
    });
    setModalOpen(true);
  };

  const openOpening = () => {
    setOpeningForm({ register_type: "Caja principal", amount: 0, payment_method: "Efectivo", vendedor: currentUser });
    setOpeningOpen(true);
  };

  const openClosing = () => {
    setClosingForm({ register_type: "Caja principal", counted: 0 });
    setClosingOpen(true);
  };

  const currentClosingTurno = useMemo(() => {
    if (!closingOpen) return null;
    return findCurrentTurno(list, closingForm.register_type);
  }, [closingOpen, closingForm.register_type, list]);

  const closingSummary = useMemo(() => {
    if (!currentClosingTurno) return null;
    // Cierre abarca TODO el turno (sin filtro de día) para que el saldo esperado
    // incluya los movimientos de días anteriores dentro del mismo turno.
    return turnoSummary(list, closingForm.register_type, currentClosingTurno, null);
  }, [list, closingForm.register_type, currentClosingTurno]);

  const saveClosing = async () => {
    const turno = currentClosingTurno;
    if (!turno) return;
    const summary = closingSummary;
    if (!summary) return;
    const saldoEsperado = summary.esperado;
    const counted = Number(closingForm.counted);
    const diferencia = counted - saldoEsperado;
    setSaving(true);
    try {
      // Borrar cierres anteriores de este turno (permite re-cerrar)
      const start = new Date(turno.apertura.date).getTime();
      const oldCierres = list.filter(
        (m) => m.register_type === closingForm.register_type && isCierre(m) && new Date(m.date).getTime() >= start
      );
      if (oldCierres.length > 0) {
        await base44.entities.CashMovement.deleteMany({ id: { $in: oldCierres.map((m) => m.id) } });
      }
      const base = { payment_method: "Efectivo", register_type: closingForm.register_type, date: nowLocalISO() };
      const tv = `Turno ${turno.turno} | ${turno.vendedor || "Sin vendedor"}`;
      const movs = [];
      if (diferencia > 0) {
        movs.push({ ...base, type: "Entrada", category: "Otro ingreso", amount: diferencia, description: `Cierre de caja - Sobrante | ${tv}` });
      } else if (diferencia < 0) {
        movs.push({ ...base, type: "Salida", category: "Otro egreso", amount: Math.abs(diferencia), description: `Cierre de caja - Faltante | ${tv}` });
      }
      if (counted > 0) {
        movs.push({ ...base, type: "Salida", category: "Retiro", amount: counted, description: `Cierre de caja - Retiro de efectivo | ${tv}` });
      }
      if (movs.length === 0) {
        movs.push({ ...base, type: "Salida", category: "Otro egreso", amount: 0, description: `Cierre de caja - Cuadre exacto | ${tv}` });
      }
      const created = await base44.entities.CashMovement.bulkCreate(movs);
      // Actualización optimista: agrega los movimientos de cierre a la lista local
      // para que findOpenTurno detecte el cierre y la tarjeta "Abierto" desaparezca
      // de inmediato, sin esperar al re-fetch.
      const createdRecords = Array.isArray(created) && created.length > 0
        ? created
        : movs.map((m, i) => ({ ...m, id: `tmp-cierre-${Date.now()}-${i}` }));
      setList((prev) => [...createdRecords, ...prev]);
      setClosingOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const saveOpening = async () => {
    if (!openingForm.amount || openingForm.amount <= 0) return;
    if (!openingForm.vendedor || !openingForm.vendedor.trim()) return;
    setSaving(true);
    try {
      const n = nextTurnoNumber(list, openingForm.register_type);
      await base44.entities.CashMovement.create({
        type: "Entrada",
        category: "Otro ingreso",
        amount: Number(openingForm.amount),
        description: buildAperturaDescription(n, openingForm.vendedor.trim(), openingForm.register_type),
        payment_method: openingForm.payment_method,
        register_type: openingForm.register_type,
        reference_id: `TURNO-${n}`,
        date: nowLocalISO(),
      });
      setOpeningOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const save = async () => {
    if (!form.amount || form.amount <= 0) return;
    setSaving(true);
    try {
      await base44.entities.CashMovement.create({ ...form, amount: Number(form.amount) });
      setModalOpen(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const cats = form.type === "Entrada" ? ENTRY_CATS : EXIT_CATS;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Caja y Bancos</h1>
          <p className="text-slate-500 mt-1">Saldo total: <span className={`font-semibold ${totalBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>${totalBalance.toLocaleString("es-CO")}</span></p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openOpening} variant="outline">
            <ArrowDownCircle className="w-4 h-4" /> Apertura de Turno
          </Button>
          <Button onClick={openClosing} variant="outline">
            <ArrowUpCircle className="w-4 h-4" /> Cierre de Turno
          </Button>
          <Button onClick={openNew} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Turnos activos */}
      {openTurnos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {openTurnos.map((t) => (
            <div key={t.apertura.id} className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 uppercase tracking-wide">Abierto</span>
                <span className="text-xs text-slate-400">{t.apertura.register_type}</span>
              </div>
              <p className="text-sm font-bold text-slate-900">Turno {t.turno}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{t.vendedor || "Sin vendedor"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{moment(t.openDate).format("DD/MM/YYYY HH:mm")}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Base inicial: <span className="font-semibold text-slate-800">{fmt(t.base)}</span></p>
            </div>
          ))}
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {REGISTERS.map((reg) => (
          <div key={reg} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Landmark className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500">{reg}</p>
            </div>
            <p className={`text-xl font-bold ${balances[reg] >= 0 ? "text-slate-900" : "text-red-600"}`}>
              ${balances[reg].toLocaleString("es-CO")}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por descripción, categoría o monto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterRegister} onValueChange={setFilterRegister}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las cajas</SelectItem>
            {REGISTERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDay} onValueChange={setFilterDay}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hoy">Hoy</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTurnoId} onValueChange={setFilterTurnoId}>
          <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los turnos</SelectItem>
            {turnos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.register} · Turno {t.turno} · {t.vendedor || "—"} {t.open ? "(Abierto)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Movements */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Caja</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Pago</th>
                <th className="px-4 py-3 font-medium text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-slate-400 py-8">Sin movimientos</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{m.date ? moment(m.date).format("DD/MM/YYYY HH:mm") : "—"}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{m.register_type}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{m.category}</span></td>
                  <td className="px-4 py-3 text-slate-800 max-w-xs truncate" title={m.description || ""}>{m.description || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{m.payment_method}</td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${m.type === "Entrada" ? "text-emerald-600" : "text-red-600"}`}>
                    {m.type === "Entrada" ? "+" : "-"}${(m.amount || 0).toLocaleString("es-CO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo movimiento de caja</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: v === "Entrada" ? "Otro ingreso" : "Otro egreso" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem>
                    <SelectItem value="Salida">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoría</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto *</Label>
                <Input type="number" placeholder="0" value={form.amount === 0 ? "" : form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value === "" ? 0 : (parseFloat(e.target.value) || 0) })} />
              </div>
              <div>
                <Label>Caja</Label>
                <Select value={form.register_type} onValueChange={(v) => setForm({ ...form, register_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGISTERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Forma de pago</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openingOpen} onOpenChange={setOpeningOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apertura de Turno</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Caja</Label>
              <Select value={openingForm.register_type} onValueChange={(v) => setOpeningForm({ ...openingForm, register_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGISTERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendedor responsable *</Label>
              <Input placeholder="Nombre del vendedor" value={openingForm.vendedor} onChange={(e) => setOpeningForm({ ...openingForm, vendedor: e.target.value })} />
            </div>
            <div>
              <Label>Base inicial (manual) *</Label>
              <Input type="number" placeholder="0" value={openingForm.amount === 0 ? "" : openingForm.amount} onChange={(e) => setOpeningForm({ ...openingForm, amount: e.target.value === "" ? 0 : (parseFloat(e.target.value) || 0) })} />
              <p className="text-xs text-slate-400 mt-1">Cada turno arranca desde cero ventas; sólo se anexa esta base.</p>
            </div>
            <div>
              <Label>Forma de pago</Label>
              <Select value={openingForm.payment_method} onValueChange={(v) => setOpeningForm({ ...openingForm, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {findOpenTurno(list, openingForm.register_type) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                Esta caja ya tiene un turno abierto. Si abres uno nuevo, el turno actual quedará sin cerrar.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpeningOpen(false)}>Cancelar</Button>
            <Button onClick={saveOpening} disabled={saving || !openingForm.vendedor?.trim()} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : "Abrir Turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closingOpen} onOpenChange={setClosingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cierre de Turno</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Caja</Label>
              <Select value={closingForm.register_type} onValueChange={(v) => setClosingForm({ ...closingForm, register_type: v, counted: 0 })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGISTERS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {!currentClosingTurno ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 text-center">
                No hay un turno abierto para <span className="font-semibold">{closingForm.register_type}</span>.
                Abre un turno antes de cerrar.
              </div>
            ) : (
              <>
                <div className="bg-slate-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">Turno {currentClosingTurno.turno}</span>
                    {currentClosingTurno.alreadyClosed && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600 uppercase">Ya cerrado</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {currentClosingTurno.vendedor || "Sin vendedor"}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {moment(currentClosingTurno.openDate).format("DD/MM/YYYY HH:mm")}
                  </div>
                </div>

                {closingSummary?.alreadyClosed && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    Este turno ya está cerrado. Al confirmar se reemplazará el cuadre anterior.
                  </div>
                )}

                {closingSummary && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Base inicial</span><span className="font-medium">{fmt(closingSummary.apertura)}</span></div>
                    <div className="flex justify-between text-emerald-600"><span>(+) Entradas del turno</span><span>{fmt(closingSummary.entradas)}</span></div>
                    <div className="flex justify-between text-red-600"><span>(−) Salidas del turno</span><span>{fmt(closingSummary.salidas)}</span></div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-slate-900"><span>Saldo esperado del turno</span><span>{fmt(closingSummary.esperado)}</span></div>
                    <div className="flex justify-between text-slate-600"><span>(−) Monto contado</span><span>{fmt(Number(closingForm.counted))}</span></div>
                    <div className={`flex justify-between border-t border-slate-200 pt-1.5 font-bold ${Number(closingForm.counted) - closingSummary.esperado === 0 ? "text-emerald-700" : Number(closingForm.counted) - closingSummary.esperado > 0 ? "text-amber-700" : "text-red-700"}`}>
                      <span>Diferencia</span>
                      <span>{(() => { const d = Number(closingForm.counted) - closingSummary.esperado; return d === 0 ? "Cuadre exacto" : `${d > 0 ? "Sobrante" : "Faltante"}: ${fmt(Math.abs(d))}`; })()}</span>
                    </div>
                    <p className="text-xs text-slate-400 pt-0.5">{closingSummary.count} movimientos en el turno</p>
                  </div>
                )}

                <div>
                  <Label>Monto contado (efectivo físico) *</Label>
                  <Input type="number" placeholder="0" value={closingForm.counted === 0 ? "" : closingForm.counted} onChange={(e) => setClosingForm({ ...closingForm, counted: e.target.value === "" ? 0 : (parseFloat(e.target.value) || 0) })} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingOpen(false)}>Cancelar</Button>
            <Button onClick={saveClosing} disabled={saving || !currentClosingTurno} className="bg-amber-500 hover:bg-amber-600 text-slate-900">
              {saving ? "Guardando..." : closingSummary?.alreadyClosed ? "Re-cerrar turno" : "Confirmar Cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
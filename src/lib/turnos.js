import moment from "moment";
import { localDateKey, fmtBogota } from "@/lib/localDate";

const APERTURA_KEY = "Apertura de caja";
const CIERRE_KEY = "Cierre de caja";

export const isApertura = (m) => (m?.description || "").includes(APERTURA_KEY);
export const isCierre = (m) => (m?.description || "").includes(CIERRE_KEY);

// Parse "Apertura de caja | Turno 3 | Juan Pérez | Caja almacén"
// or legacy "Apertura de caja - Caja almacén"
export function parseTurnoDesc(description) {
  if (!description) return { turno: null, vendedor: "", register: "" };
  if (description.includes("|")) {
    const parts = description.split("|").map((s) => s.trim());
    const turnoMatch = (parts[1] || "").match(/Turno\s+(\d+)/i);
    return {
      turno: turnoMatch ? parseInt(turnoMatch[1], 10) : null,
      vendedor: parts[2] || "",
      register: parts[3] || "",
    };
  }
  const rest = description.replace(APERTURA_KEY, "").replace(CIERRE_KEY, "").replace(/^[\s\-]+/, "");
  return { turno: null, vendedor: "", register: rest };
}

// Next sequential turno number for a register
export function nextTurnoNumber(list, register) {
  const aps = list.filter((m) => m.register_type === register && isApertura(m));
  let max = 0;
  aps.forEach((m) => {
    const info = parseTurnoDesc(m.description);
    if (info.turno && info.turno > max) max = info.turno;
  });
  return max + 1;
}

// The current (last) aperture for a register, with whether it's still open.
export function findCurrentTurno(list, register) {
  const regMovs = list
    .filter((m) => m.register_type === register)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let lastAp = null;
  for (let i = regMovs.length - 1; i >= 0; i--) {
    if (isApertura(regMovs[i])) {
      lastAp = regMovs[i];
      break;
    }
  }
  if (!lastAp) return null;
  const apDate = new Date(lastAp.date);
  const cierre = regMovs.find((m) => isCierre(m) && new Date(m.date) > apDate);
  const info = parseTurnoDesc(lastAp.description);
  return {
    apertura: lastAp,
    turno: info.turno ?? nextTurnoNumber(
      list.filter((m) => new Date(m.date) <= apDate.getTime()),
      register
    ),
    vendedor: info.vendedor || "",
    openDate: lastAp.date,
    base: lastAp.amount || 0,
    alreadyClosed: !!cierre,
    closeDate: cierre ? cierre.date : null,
  };
}

export function findOpenTurno(list, register) {
  const t = findCurrentTurno(list, register);
  if (!t || t.alreadyClosed) return null;
  return t;
}

// Movements within a turno window (from apertura inclusive to cierre or now)
export function turnoWindow(list, register, openDate, closeDate) {
  const start = new Date(openDate).getTime();
  const end = closeDate ? new Date(closeDate).getTime() : Date.now();
  return list.filter((m) => {
    if (m.register_type !== register) return false;
    const t = new Date(m.date).getTime();
    return t >= start && t <= end;
  });
}

// Summary for the current turno. Cierre adjustment movements are excluded
// from entradas/salidas so re-closing yields the same expected balance.
export function turnoSummary(list, register, turno, onlyDayKey = null) {
  if (!turno) return null;
  const start = new Date(turno.apertura.date).getTime();
  let movs = list.filter((m) => m.register_type === register && new Date(m.date).getTime() >= start);
  if (onlyDayKey) {
    movs = movs.filter((m) => localDateKey(new Date(m.date)) === onlyDayKey);
  }
  const apertura = turno.base;
  const entradas = movs
    .filter((m) => !isApertura(m) && !isCierre(m) && m.type === "Entrada")
    .reduce((s, m) => s + (m.amount || 0), 0);
  const salidas = movs
    .filter((m) => !isCierre(m) && m.type === "Salida")
    .reduce((s, m) => s + (m.amount || 0), 0);
  const esperado = apertura + entradas - salidas;
  return {
    apertura,
    entradas,
    salidas,
    esperado,
    count: movs.length,
    alreadyClosed: turno.alreadyClosed,
  };
}

export function turnoLabel(turno) {
  if (!turno) return "";
  const when = fmtBogota(turno.openDate);
  return `Turno ${turno.turno} · ${turno.vendedor || "Sin vendedor"} · ${when}`;
}

export function buildAperturaDescription(n, vendedor, register) {
  return `${APERTURA_KEY} | Turno ${n} | ${vendedor || "Sin vendedor"} | ${register}`;
}
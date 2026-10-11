// Zona horaria local de Bogotá (America/Bogota, UTC-5 fijo, sin DST).
// Toda la app debe usar estos helpers en lugar de new Date().toISOString() o
// moment() "a secas", que dependen del reloj/zona del dispositivo o de UTC y
// desplazan al día siguiente los registros hechos en la noche.

import moment from "moment";

const BOGOTA_OFFSET_MIN = -300; // -05:00 en minutos

const shift = (date) => new Date(new Date(date).getTime() + BOGOTA_OFFSET_MIN * 60 * 1000);
const p2 = (n) => String(n).padStart(2, "0");

// ISO de "ahora" en hora local de Bogotá, p. ej. "2026-09-15T21:46:00-05:00".
export function nowLocalISO(date = new Date()) {
  const s = shift(date);
  return `${s.getUTCFullYear()}-${p2(s.getUTCMonth() + 1)}-${p2(s.getUTCDate())}T${p2(s.getUTCHours())}:${p2(s.getUTCMinutes())}:${p2(s.getUTCSeconds())}-05:00`;
}

// Clave de día calendario local de Bogotá ("YYYY-MM-DD") para un instante dado.
export function localDateKey(date = new Date()) {
  const s = shift(date);
  return `${s.getUTCFullYear()}-${p2(s.getUTCMonth() + 1)}-${p2(s.getUTCDate())}`;
}

export function todayLocalKey() {
  return localDateKey(new Date());
}

// Hora local de Bogotá "HH:mm".
export function nowLocalTime(date = new Date()) {
  const s = shift(date);
  return `${p2(s.getUTCHours())}:${p2(s.getUTCMinutes())}`;
}

// Hora local de Bogotá (0-23) para saludos, etc.
export function localHour(date = new Date()) {
  return shift(date).getUTCHours();
}

// moment() fijado en hora de Bogotá (offset -05:00). Úsalo en lugar de moment()
// para "hoy", inicios de mes/semana, formatos de hora actual, etc.
export function momentBogota(input) {
  return (input === undefined ? moment() : moment(input)).utcOffset(-5);
}

// Fecha (YYYY-MM-DD) de Bogotá sumando N días a hoy.
export function addDaysLocalKey(days = 0, from = new Date()) {
  return localDateKey(new Date(new Date(from).getTime() + days * 86400000));
}

// Formatea un instante (timestamp) en hora de Bogotá. Las fechas "solo calendario"
// (YYYY-MM-DD) se formatean sin conversión de zona para no moverlas de día.
export function fmtBogota(value, format = "DD/MM/YYYY HH:mm") {
  if (!value) return "—";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return moment(value, "YYYY-MM-DD").format(format);
  }
  return moment(value).utcOffset(-5).format(format);
}

export default nowLocalISO;
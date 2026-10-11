// Zona horaria local de Bogotá (America/Bogota, UTC-5 fijo, sin DST).
// Devuelve un ISO con offset -05:00 para que el día del calendario de la
// cadena almacenada coincida con el reloj del usuario, evitando que los
// movimientos nocturnos se desplacen al día siguiente por guardarse en UTC.

const BOGOTA_OFFSET_MIN = -300; // -05:00 en minutos

// ISO de "ahora" en hora local de Bogotá, p. ej. "2026-09-15T21:46:00-05:00".
export function nowLocalISO(date = new Date()) {
  const shifted = new Date(date.getTime() + BOGOTA_OFFSET_MIN * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  const h = String(shifted.getUTCHours()).padStart(2, "0");
  const mi = String(shifted.getUTCMinutes()).padStart(2, "0");
  const s = String(shifted.getUTCSeconds()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}:${s}-05:00`;
}

// Clave de día calendario local de Bogotá ("YYYY-MM-DD") para un instante dado.
export function localDateKey(date = new Date()) {
  const shifted = new Date(new Date(date).getTime() + BOGOTA_OFFSET_MIN * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

// Formatea un instante en hora de Bogotá como "DD/MM/YYYY HH:mm".
export function formatBogota(value) {
  if (!value) return "—";
  const shifted = new Date(new Date(value).getTime() + BOGOTA_OFFSET_MIN * 60 * 1000);
  if (isNaN(shifted.getTime())) return "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(shifted.getUTCDate())}/${p(shifted.getUTCMonth() + 1)}/${shifted.getUTCFullYear()} ${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}`;
}

export function todayLocalKey() {
  return localDateKey(new Date());
}

export default nowLocalISO;
// Plantilla unificada para mensajes de WhatsApp del taller.

export const BRAND = "HR SOLUCIONES INTEGRALES";
export const SLOGAN = "HR SOLUCIONES INTEGRALES, nacidos para rodar.";

// Saludo según la hora del día (hora local del dispositivo).
// 5–12: Buenos días · 12–19: Buenas tardes · resto: Buenas noches
export function greetingByHour(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Envuelve el contenido de un mensaje con saludo, intro de marca y eslogan.
export function wrapWhatsApp({ name = "", intro = "", body = "", status = "", statusLabel = "Estado" }) {
  const salute = greetingByHour();
  const head = name ? `Hola ${name}, ${salute}.` : `${salute}.`;
  const lines = [
    head,
    "",
    `El equipo de ${BRAND} le informa que ${intro}`,
  ];
  if (body) {
    lines.push("");
    lines.push(body);
  }
  if (status) {
    lines.push("");
    lines.push(`${statusLabel}: ${status}`);
  }
  lines.push("");
  lines.push(SLOGAN);
  return lines.join("\n");
}
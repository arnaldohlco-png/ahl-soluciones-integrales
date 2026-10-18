// Caja destino de un CashMovement según el medio de pago.
// Transferencia/Tarjeta → Bancos; cualquier otro (efectivo) → Caja almacén.
export function registerForPayment(paymentMethod) {
  if (paymentMethod === "Transferencia" || paymentMethod === "Tarjeta") {
    return "Bancos";
  }
  return "Caja almacén";
}
// Determina la caja destino de un CashMovement según el medio de pago.
// Efectivo/Otros → la caja de venta; Transferencia/Tarjeta → Bancos (banco, no cajón).
// register_type de venta es la caja donde se hace la operación (Caja principal/Caja almacén/Caja taller).
export function registerForPayment(paymentMethod, ventaRegister = "Caja almacén") {
  if (paymentMethod === "Transferencia" || paymentMethod === "Tarjeta") {
    return "Bancos";
  }
  return ventaRegister;
}
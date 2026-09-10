// Roles y permisos por módulo para AHL MotoControl
export const ROLES = ["administrador", "gerente", "vendedor", "tecnico"];

export const ROLE_LABELS = {
  administrador: "Administrador",
  gerente: "Gerente",
  vendedor: "Vendedor",
  tecnico: "Técnico",
};

// "*" = acceso a todo (administrador). En остальных casos, lista de rutas permitidas.
const MODULE_ACCESS = {
  administrador: "*",
  gerente: [
    "/", "/clientes", "/motocicletas", "/ordenes", "/servicios",
    "/inventario", "/compras", "/ventas", "/cotizaciones", "/facturacion",
    "/creditos", "/gastos", "/caja", "/estado-resultados",
    "/tecnicos", "/proveedores", "/marcas",
    "/prestamos-tecnicos", "/pago-comisiones",
  ],
  vendedor: [
    "/", "/clientes", "/motocicletas", "/ordenes",
    "/cotizaciones", "/ventas", "/facturacion", "/creditos",
  ],
  tecnico: [
    "/", "/ordenes", "/motocicletas", "/clientes",
    "/prestamos-tecnicos", "/pago-comisiones",
  ],
};

// Compatibilidad: usuarios creados antes con el rol legacy "admin" conservan acceso total.
export function normalizeRole(role) {
  if (role === "admin") return "administrador";
  if (role === "user") return "vendedor";
  return role;
}

// Devuelve null cuando el rol tiene acceso a todo.
export function getAccessibleRoutes(role) {
  const r = normalizeRole(role);
  const access = MODULE_ACCESS[r];
  if (!access) return ["/"];
  if (access === "*") return null;
  return access;
}

export function canAccess(role, path) {
  const access = getAccessibleRoutes(role);
  if (access === null) return true;
  return access.includes(path);
}
// Roles y permisos por módulo para AHL MotoControl

// Opciones de módulos disponibles para asignar a roles
export const MODULE_OPTIONS = [
  { path: "/", label: "Dashboard" },
  { path: "/clientes", label: "Clientes" },
  { path: "/motocicletas", label: "Motocicletas" },
  { path: "/ordenes", label: "Órdenes de Servicio" },
  { path: "/servicios", label: "Catálogo de Servicios" },
  { path: "/inventario", label: "Inventario" },
  { path: "/compras", label: "Compras" },
  { path: "/ventas", label: "Ventas / POS" },
  { path: "/cotizaciones", label: "Cotizaciones" },
  { path: "/facturacion", label: "Facturación" },
  { path: "/creditos", label: "Créditos y Cartera" },
  { path: "/gastos", label: "Gastos" },
  { path: "/caja", label: "Caja y Bancos" },
  { path: "/estado-resultados", label: "Estado de Resultados" },
  { path: "/tecnicos", label: "Técnicos" },
  { path: "/proveedores", label: "Proveedores" },
  { path: "/marcas", label: "Marcas y Líneas" },
  { path: "/empresa", label: "Mi Empresa" },
  { path: "/prestamos-tecnicos", label: "Préstamos Técnicos" },
  { path: "/pago-comisiones", label: "Pago Comisiones" },
];

// Definiciones por defecto (se usan si no hay roles guardados en BD)
export const DEFAULT_ROLE_DEFS = [
  { name: "administrador", label: "Administrador", routes: "*" },
  { name: "gerente", label: "Gerente", routes: [
    "/", "/clientes", "/motocicletas", "/ordenes", "/servicios",
    "/inventario", "/compras", "/ventas", "/cotizaciones", "/facturacion",
    "/creditos", "/gastos", "/caja", "/estado-resultados",
    "/tecnicos", "/proveedores", "/marcas",
    "/prestamos-tecnicos", "/pago-comisiones",
  ] },
  { name: "vendedor", label: "Vendedor", routes: [
    "/", "/clientes", "/motocicletas", "/ordenes",
    "/cotizaciones", "/ventas", "/facturacion", "/creditos",
  ] },
  { name: "tecnico", label: "Técnico", routes: [
    "/", "/ordenes", "/motocicletas", "/clientes",
    "/prestamos-tecnicos", "/pago-comisiones",
  ] },
];

// Compatibilidad: usuarios creados antes con el rol legacy "admin" conservan acceso total.
export function normalizeRole(role) {
  if (role === "admin") return "administrador";
  if (role === "user") return "vendedor";
  return role;
}

// Convierte el valor almacenado de routes a "*" o array de rutas
export function parseRoutes(r) {
  if (r == null || r === "") return [];
  if (r === "*") return "*";
  if (Array.isArray(r)) return r;
  try {
    const v = JSON.parse(r);
    if (v === "*") return "*";
    if (Array.isArray(v)) return v;
    return [];
  } catch {
    return [];
  }
}

export function routesToStorage(r) {
  if (r === "*") return "*";
  return JSON.stringify(r || []);
}

// Resuelve acceso desde definiciones de rol (de BD). Devuelve null = acceso total.
export function resolveAccessFromDefs(roleDefs, role) {
  const r = normalizeRole(role);
  const def = (roleDefs || []).find((d) => d.name === r);
  if (!def) return null;
  return parseRoutes(def.routes);
}

// Devuelve null cuando el rol tiene acceso a todo (fallback a definiciones por defecto).
export function getAccessibleRoutes(role) {
  const r = normalizeRole(role);
  const def = DEFAULT_ROLE_DEFS.find((d) => d.name === r);
  if (!def) return ["/"];
  const routes = parseRoutes(def.routes);
  if (routes === "*") return null;
  return routes;
}

export function canAccess(role, path, roleDefs) {
  if (roleDefs && roleDefs.length > 0) {
    const access = resolveAccessFromDefs(roleDefs, role);
    if (access === null) return true;
    return access.includes(path);
  }
  const access = getAccessibleRoutes(role);
  if (access === null) return true;
  return access.includes(path);
}
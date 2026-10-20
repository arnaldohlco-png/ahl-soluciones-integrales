export const BACKUP_VERSION = 2;

export const ENTITY_NAMES = [
  "AccountReceivable", "Appointment", "BankAccount", "Brand", "CashMovement",
  "CommissionPayment", "Company", "Customer", "Expense", "ExpenseCategory",
  "FacturaProveedor", "Invoice", "Motorcycle", "Product", "Purchase", "Return",
  "Role", "Sale", "Service", "ServiceOrder", "Supplier", "SupplierOrder",
  "Technician", "TechnicianLoan", "ShiftClosure", "SaleVoid",
];

// Entidades añadidas después de la versión 2: opcionales al validar respaldos antiguos.
export const OPTIONAL_ENTITIES = ["ShiftClosure", "SaleVoid"];

export const BUILT_IN_FIELDS = ["id", "created_date", "updated_date", "created_by_id"];

export const MAX_BACKUP_BYTES = 200 * 1024 * 1024;
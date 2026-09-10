// Accent-insensitive (and case-insensitive) search helpers used across all
// list modules, so searching "jose" matches "José", "nuñez" matches "Nuñez", etc.
export const norm = (s) =>
  (s == null ? "" : String(s)).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Returns true when `needle` is empty, or when any of the fields contains it
// (accent/case-insensitive). Numbers are stringified automatically.
export const matchAny = (needle, ...fields) =>
  !needle || fields.some((f) => norm(f).includes(norm(needle)));
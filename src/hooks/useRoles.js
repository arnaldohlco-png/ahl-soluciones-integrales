import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { DEFAULT_ROLE_DEFS } from "@/lib/roles";

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await base44.entities.Role.list();
      setRoles(data.length > 0 ? data : DEFAULT_ROLE_DEFS);
    } catch {
      setRoles(DEFAULT_ROLE_DEFS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("roles-updated", handler);
    return () => window.removeEventListener("roles-updated", handler);
  }, [refresh]);

  return { roles, loading, refresh };
}
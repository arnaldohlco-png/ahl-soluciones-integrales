import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const needsBank = (method) => method === "Transferencia" || method === "Tarjeta";

// Selector de cuenta bancaria receptora; solo aparece para transferencia o tarjeta.
export default function BankAccountSelect({ method, value, onChange, label = "Cuenta bancaria *" }) {
  const [accounts, setAccounts] = useState([]);
  const show = needsBank(method);

  useEffect(() => {
    if (!show) return;
    base44.entities.BankAccount.filter({ active: true }, { sort: "name", limit: 100 }).then((p) => setAccounts(p.items || []));
  }, [show]);

  useEffect(() => {
    if (!show && value) onChange("");
  }, [show]);

  if (!show) return null;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="mt-1"><SelectValue placeholder={accounts.length ? "Selecciona la cuenta" : "Sin cuentas (créalas en Empresa)"} /></SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.name}>{a.name}{a.bank ? ` · ${a.bank}` : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
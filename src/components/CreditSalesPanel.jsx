import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { matchAny } from "@/lib/search";
import { isCreditSale } from "@/lib/creditSales";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO")}`;

// Vista informativa de ventas a crédito (no afecta saldos de caja ni bancos).
export default function CreditSalesPanel({ sales }) {
  const [search, setSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const rows = sales
    .filter(isCreditSale)
    .filter((s) => !onlyPending || (s.balance || 0) > 0)
    .filter((s) => matchAny(search, s.customer_name, s.number, s.total))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const pending = rows.reduce((t, s) => t + (s.balance || 0), 0);

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row gap-3 mb-3 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por cliente, número o valor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Solo con saldo
        </label>
        <span className="text-sm text-slate-500">Saldo pendiente: <b className="text-slate-900">{fmt(pending)}</b></span>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2 font-medium">Fecha</th>
              <th className="px-4 py-2 font-medium">Número</th>
              <th className="px-4 py-2 font-medium">Cliente</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
              <th className="px-4 py-2 font-medium text-right">Abonado</th>
              <th className="px-4 py-2 font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="6" className="text-center text-slate-400 py-8">Sin ventas a crédito</td></tr>
            ) : rows.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-2 whitespace-nowrap text-slate-600">{s.date}</td>
                <td className="px-4 py-2">{s.number || "—"}</td>
                <td className="px-4 py-2">{s.customer_name || "—"}</td>
                <td className="px-4 py-2 text-right">{fmt(s.total)}</td>
                <td className="px-4 py-2 text-right text-emerald-600">{fmt((s.total || 0) - (s.balance || 0))}</td>
                <td className={`px-4 py-2 text-right font-semibold ${(s.balance || 0) > 0 ? "text-red-600" : "text-slate-400"}`}>{fmt(s.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
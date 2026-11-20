import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAll } from "@/lib/entityLoader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Search } from "lucide-react";
import PrintableDocument from "@/components/PrintableDocument";
import { matchAny } from "@/lib/search";

const money = (n) => `$${(Number(n) || 0).toLocaleString("es-CO")}`;

export default function DocumentHistory({ open, onOpenChange, customer }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState({ company: null, customers: [], motos: [], technicians: [] });
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const q = customer ? { customer_id: customer.id } : null;
      const [orders, invoices, comp, customers, motos, techs] = await Promise.all([
        q ? base44.entities.ServiceOrder.filter(q, "-created_date", 500) : fetchAll("ServiceOrder"),
        q ? base44.entities.Invoice.filter(q, "-date", 500) : fetchAll("Invoice", "-date"),
        base44.entities.Company.list("-created_date", 1),
        customer ? Promise.resolve([customer]) : fetchAll("Customer"),
        q ? base44.entities.Motorcycle.filter(q, "-created_date", 500) : fetchAll("Motorcycle"),
        base44.entities.Technician.list("-created_date", 500),
      ]);
      setCtx({ company: comp[0] || null, customers, motos, technicians: techs });
      const cname = (id) => customers.find((c) => c.id === id)?.name || "";
      setRows([
        ...orders.map((o) => ({ key: "o" + o.id, kind: "order", doc: o, label: "Orden de servicio", number: o.number || "", date: o.entry_date || (o.created_date || "").slice(0, 10), customer: cname(o.customer_id), status: o.status, total: o.cost })),
        ...invoices.map((i) => ({ key: "i" + i.id, kind: "invoice", doc: i, label: i.type, number: i.number || "", date: i.date || "", customer: i.customer_name || cname(i.customer_id), status: i.status, total: i.total })),
      ].sort((a, b) => (b.date || "").localeCompare(a.date || "")));
      setLoading(false);
    })();
  }, [open, customer]);

  const filtered = rows.filter((r) =>
    (kind === "all" || r.kind === kind) &&
    (!from || r.date >= from) && (!to || r.date <= to) &&
    matchAny(search, r.number, r.customer, r.label)
  );

  const extras = !printing ? {}
    : printing.kind === "order"
      ? { motorcycle: ctx.motos.find((m) => m.id === printing.doc.motorcycle_id), customer: ctx.customers.find((c) => c.id === printing.doc.customer_id), technician: ctx.technicians.find((t) => t.id === printing.doc.technician_id), technicians: ctx.technicians }
      : { customer: ctx.customers.find((c) => c.id === printing.doc.customer_id) };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader><DialogTitle>Historial de órdenes y facturas{customer ? ` · ${customer.name}` : ""}</DialogTitle></DialogHeader>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Buscar por número o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Órdenes y facturas</SelectItem>
                <SelectItem value="order">Solo órdenes</SelectItem>
                <SelectItem value="invoice">Solo facturas</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" title="Desde" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" title="Hasta" />
          </div>
          <div className="max-h-[55vh] overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-slate-400 py-12">No hay documentos con esos filtros</p>
            ) : filtered.map((r) => (
              <div key={r.key} className="flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{r.label} {r.number && `· ${r.number}`}</p>
                  <p className="text-xs text-slate-500 truncate">{r.date} · {r.customer} · {r.status}</p>
                </div>
                <span className="font-semibold text-slate-800">{money(r.total)}</span>
                <button onClick={() => setPrinting(r)} title="Reimprimir / reenviar" className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"><Printer className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {printing && (
        <PrintableDocument type={printing.kind} doc={printing.doc} company={ctx.company} extras={extras} onClose={() => setPrinting(null)} />
      )}
    </>
  );
}
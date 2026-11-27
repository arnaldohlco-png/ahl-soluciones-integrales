import React from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, Clock, Wrench, Package, AlertTriangle,
  ShoppingCart, Bike, CreditCard, FileText, ClipboardList, Menu, Lock, HardHat, Wallet } from
"lucide-react";
import { Image } from "@/components/ui/image";
import { momentBogota } from "@/lib/localDate";

const TALLER_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/a556eaa89_generated_26d55a75.jpg";
const ALMACEN_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/879ac11be_generated_0e1d5e15.jpg";
const CAJA_IMG = "https://media.base44.com/images/public/6aa16a1f0b9991c625ec0ea5/20c32a444_generated_d9adb1cd.jpg";

const fmt = (n) => `$${(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}`;
const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const STATUS_META = {
  "Ingresado": { color: "#60a5fa", icon: ClipboardList },
  "En proceso": { color: "#FFB703", icon: Wrench },
  "Terminado": { color: "#34d399", icon: HardHat },
  "Entregado": { color: "#cbd5e1", icon: Bike }
};

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB703]";
const card = `flex flex-col gap-1.5 bg-[#F3F5F7] border border-[#dde2e6] border-l-4 border-l-[#FFB703] rounded-[10px] px-4 py-3.5 text-[#1E232A] no-underline cursor-pointer transition-[background-color,box-shadow] duration-[180ms] hover:bg-white hover:shadow-[0_6px_16px_rgba(30,35,42,0.12)] active:bg-[#e8ecef] ${focus}`;
const kBase = `flex flex-col justify-between gap-2 min-h-[132px] rounded-xl p-[18px] no-underline cursor-pointer border transition-[background-color,box-shadow] duration-[180ms] ${focus}`;
const kDark = `${kBase} bg-[#2a313a] border-[#3a434e] text-white hover:bg-[#343c47] hover:shadow-[0_6px_16px_rgba(0,0,0,0.35)] active:bg-[#20262d]`;
const lb = "text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#5b646d]";
const lbK = "text-[11px] font-extrabold tracking-[0.14em] uppercase text-[#aeb8c1]";
const num = "text-[44px] font-black leading-none tracking-[-0.04em]";
const mid = "text-[26px] font-black leading-[1.1] tracking-[-0.025em]";
const kv = "text-[30px] font-black leading-[1.05] tracking-[-0.03em]";
const ut = "text-xs font-black tracking-[0.04em] text-[#a87300]";

function Bars({ heights }) {
  return (
    <div className="flex items-end gap-1 h-[26px] ml-auto">
      {heights.map((h, i) =>
      <i key={i} className={`w-2 rounded-t-sm bd-grow ${i % 2 === 0 ? "bg-[#1E232A]" : "bg-[#FFB703]"}`} style={{ height: `${h}%` }} />
      )}
    </div>);

}

function AreaHeader({ icon: Icon, title, image, dark }) {
  return (
    <div className={`flex items-stretch overflow-hidden border-b-[3px] border-[#FFB703] ${dark ? "rounded-xl bg-[#2a313a]" : "bg-[#1E232A]"} text-white`}>
      <div className="w-[50px] bg-[#FFB703] text-[#1E232A] flex items-center justify-center shrink-0"><Icon className="w-6 h-6" strokeWidth={2.4} /></div>
      <h2 className="flex-1 flex items-center px-4 text-sm font-black tracking-[0.3em] uppercase">{title}</h2>
      <Image src={image} alt={title} fittingType="fill" className="w-[150px] h-14 shrink-0 hidden sm:block" />
    </div>);

}

export default function BipolarDashboard({ d, company, canClose, onCloseShift, onOpenMenu, onRestore }) {
  const now = momentBogota();
  const info = [
  company?.document_number && `NIT/C.C.: ${company.document_number}`,
  company?.phone,
  company?.email,
  [company?.address, company?.city].filter(Boolean).join(" · ")].
  filter(Boolean).join("  ·  ");

  return (
    <div className="min-h-screen bg-[#E5E9EC] text-[#1E232A] px-4 md:px-8 pt-5 md:pt-7 pb-12 flex flex-col gap-5 font-sans">
      {/* Encabezado */}
      <div className="dash-rise flex flex-col md:flex-row md:items-center gap-4 md:gap-[22px] bg-white border border-[#d3d9de] rounded-2xl px-5 py-4 shadow-[0_6px_18px_rgba(30,35,42,0.08)]">
        {company?.logo ?
        <img src={company.logo} alt="Logo" className="w-[92px] h-[92px] object-contain shrink-0 rounded-full self-center md:self-auto" /> :

        <div className="w-[92px] h-[92px] rounded-full bg-[#E5E9EC] flex items-center justify-center shrink-0 self-center md:self-auto"><Bike className="w-9 h-9" /></div>
        }
        <div className="flex-1 min-w-0 text-center md:text-left">
          <h1 className="text-[22px] font-black tracking-[0.06em] uppercase leading-[1.15]">{company?.name || "Mi Taller"}</h1>
          <p className="text-xs font-semibold text-[#5b646d] leading-[1.4] mt-1.5">{info}</p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
          <div className="flex gap-2 flex-wrap justify-center">
            {canClose &&
            <button type="button" onClick={onCloseShift} className={`bd-pulse h-11 px-4 rounded-[10px] bg-[#FFB703] text-[#1E232A] flex items-center gap-[9px] text-xs font-black tracking-[0.1em] uppercase cursor-pointer transition-[background-color,box-shadow,color] duration-[180ms] hover:bg-[#ffc83a] hover:shadow-[0_4px_12px_rgba(255,183,3,0.4)] active:bg-[#e5a200] hidden ${focus}`}>
                <Lock className="w-[17px] h-[17px]" strokeWidth={2.2} /><span>Cerrar turno</span>
              </button>
            }
            <button type="button" onClick={onOpenMenu} aria-label="Abrir menú" className={`h-11 px-4 rounded-[10px] bg-[#1E232A] text-white flex items-center gap-[9px] text-xs font-black tracking-[0.1em] uppercase cursor-pointer transition-[background-color,box-shadow,color] duration-[180ms] hover:bg-[#2e353e] hover:shadow-[0_4px_12px_rgba(30,35,42,0.3)] active:bg-[#12161a] ${focus}`}>
              <Menu className="w-[17px] h-[17px] text-[#FFB703]" strokeWidth={2.4} /><span>Abrir menú</span>
            </button>
          </div>
          {canClose &&
          <button type="button" onClick={onRestore} className={`flex items-center gap-[7px] bg-transparent text-[#8a939c] text-[11px] font-bold tracking-[0.04em] cursor-pointer px-1.5 py-1 rounded-md transition-[color,background-color] duration-[180ms] hover:text-[#1E232A] hover:bg-[#eef1f3] active:bg-[#e0e5e8] hidden ${focus}`}>
              <Lock className="w-3.5 h-3.5" strokeWidth={2} />Restaurar copia de seguridad
            </button>
          }
        </div>
      </div>

      {/* Fecha */}
      <div className="dash-rise flex items-center gap-3 px-1" style={{ animationDelay: "0.08s" }}>
        <i className="w-1 h-9 bg-[#FFB703] rounded-sm" />
        <div className="flex flex-col gap-[3px]">
          <b className="text-[11px] font-black tracking-[0.16em] uppercase text-[#b07d00]">{DAYS[now.day()]}</b>
          <span className="text-2xl font-black tracking-[-0.01em] leading-[1.1]">{now.format("DD/MM/YYYY")}</span>
        </div>
      </div>

      {/* Cinta de órdenes por estado */}
      <div className="dash-rise flex flex-col lg:flex-row lg:items-center gap-3.5 bg-[#1E232A] rounded-[14px] px-[18px] py-3.5 shadow-[0_8px_20px_rgba(30,35,42,0.2)]" style={{ animationDelay: "0.14s" }}>
        <div className="text-[11px] font-black tracking-[0.22em] uppercase text-[#FFB703] whitespace-nowrap pr-1.5">Órdenes por estado</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 flex-1">
          {Object.entries(STATUS_META).map(([status, meta]) => {
            const Icon = meta.icon;
            return (
              <Link key={status} to="/ordenes" className={`flex items-center gap-3 bg-[#2a313a] border border-[#3a434e] rounded-full px-[18px] py-2.5 no-underline text-white cursor-pointer transition-[background-color,box-shadow] duration-[180ms] hover:bg-[#343c47] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:bg-[#20262d] ${focus}`}>
                <Icon className="w-[22px] h-[22px] shrink-0" style={{ color: meta.color }} strokeWidth={2} />
                <b className="text-[30px] font-black leading-none tracking-[-0.03em]">{d.ordersByStatus?.[status] || 0}</b>
                <span className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#c3ccd4]">{status}</span>
              </Link>);

          })}
        </div>
      </div>

      {/* Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-5 items-stretch">
        <div className="flex flex-col gap-4">
          <div className="dash-rise bg-white border border-[#d3d9de] rounded-2xl overflow-hidden shadow-[0_8px_22px_rgba(30,35,42,0.08)]" style={{ animationDelay: "0.22s" }}>
            <AreaHeader icon={Wrench} title="Taller" image={TALLER_IMG} />
            <div className="p-3.5 flex flex-col gap-2.5">
              <Link to="/ordenes" className={card}>
                <div className="flex items-center gap-3">
                  <Bike className="w-6 h-6 shrink-0 text-[#FFB703]" />
                  <span className={num}>{d.motosInWorkshopCount}</span>
                  <Bars heights={[30, 55, 40, 80, 60]} />
                </div>
                <span className={lb}>Motos en taller</span>
              </Link>
              <Link to="/ordenes" className={card}>
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 shrink-0 text-blue-500" />
                  <span className={num}>{d.pendingOrders}</span>
                  <Bars heights={[50, 35, 70, 45, 90]} />
                </div>
                <span className={lb}>Órdenes pendientes</span>
              </Link>
              <Link to="/ordenes" className={card}>
                <Wrench className="w-5 h-5 text-blue-500" />
                <span className={mid}>{fmt(d.workshopIncome)}</span>
                <span className={lb}>Ingresos taller (servicios)</span>
                <span className={ut}>Utilidad: {fmt(d.workshopProfit)}</span>
              </Link>
            </div>
          </div>

          <div className="dash-rise bg-white border border-[#d3d9de] rounded-2xl overflow-hidden shadow-[0_8px_22px_rgba(30,35,42,0.08)]" style={{ animationDelay: "0.32s" }}>
            <AreaHeader icon={Package} title="Almacén" image={ALMACEN_IMG} />
            <div className="p-3.5 flex flex-col gap-2.5">
              <Link to="/ventas" className={card}>
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                <span className={mid}>{fmt(d.storeIncome)}</span>
                <span className={lb}>Ingresos almacén (productos)</span>
                <span className={ut}>Utilidad: {fmt(d.storeProfit)}</span>
              </Link>
              <Link to="/inventario" className={card}>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 shrink-0 text-red-500" />
                  <span className={num}>{d.lowStock?.length || 0}</span>
                  <Bars heights={[85, 60, 95, 70, 100]} />
                </div>
                <span className={lb}>Productos stock bajo</span>
              </Link>
              <Link to="/facturacion" className={card}>
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 shrink-0 text-purple-500" />
                  <span className={num}>{d.pendingInvoices}</span>
                </div>
                <span className={lb}>Facturas pendientes</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Caja */}
        <div className="dash-rise bg-[#1E232A] rounded-[18px] p-[22px] flex flex-col gap-4 shadow-[0_14px_34px_rgba(30,35,42,0.3)] text-white" style={{ animationDelay: "0.4s" }}>
          <AreaHeader icon={Wallet} title="Caja" image={CAJA_IMG} dark />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`${kBase} sm:col-span-2 min-h-[172px] bg-[#FFB703] border-[#FFB703] text-[#1E232A] hover:bg-[#ffc42e] active:bg-[#e5a200]`}>
              <div className="flex items-center gap-[9px]"><ShoppingCart className="w-5 h-5 shrink-0" strokeWidth={2.2} /><span className="text-[11px] font-extrabold tracking-[0.14em] uppercase">Ventas del día</span></div>
              <span className="text-[44px] lg:text-[62px] font-black leading-[1.05] tracking-[-0.045em]">{fmt(d.salesToday)}</span>
            </div>
            <div className={kDark}>
              <div className="flex items-center gap-[9px]"><TrendingUp className="w-5 h-5 shrink-0" strokeWidth={2.2} /><span className={lbK}>Ventas de la semana</span></div>
              <span className={kv}>{fmt(d.salesWeek)}</span>
            </div>
            <div className={kDark}>
              <div className="flex items-center gap-[9px]"><DollarSign className="w-5 h-5 shrink-0" strokeWidth={2.2} /><span className={lbK}>Ventas del mes</span></div>
              <span className={`${kv} !text-2xl`}>{fmt(d.salesMonth)}</span>
            </div>
            <Link to="/creditos" className={kDark}>
              <CreditCard className="w-5 h-5 text-purple-400" strokeWidth={2.2} />
              <span className={kv}>{fmt(d.totalReceivables)}</span>
              <span className={lbK}>Cuentas por cobrar</span>
            </Link>
            <Link to="/gastos" className={kDark}>
              <TrendingDown className="w-5 h-5 text-red-400" strokeWidth={2.2} />
              <span className={kv}>{fmt(d.totalExpenses)}</span>
              <span className={lbK}>Gastos totales</span>
            </Link>
            <div className={`${kBase} sm:col-span-3 sm:flex-row sm:items-center min-h-[96px] bg-white border-white text-[#1E232A] hover:bg-[#f3f5f7] active:bg-[#e5e9ec]`}>
              <div className="flex items-center gap-[9px]"><DollarSign className="w-5 h-5 shrink-0" strokeWidth={2.2} /><span className={lb}>Utilidad estimada</span></div>
              <span className="text-[34px] md:text-[44px] font-black leading-[1.05] tracking-[-0.04em]">{fmt(d.estimatedProfit)}</span>
            </div>
          </div>
          <div className="h-2 rounded-sm" style={{ background: "repeating-linear-gradient(135deg,#FFB703 0 14px,#1E232A 14px 28px)" }} />
        </div>
      </div>
    </div>);

}
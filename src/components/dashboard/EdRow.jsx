import React from "react";
import { Link } from "react-router-dom";

export default function EdRow({ label, value, to, red, sub, hl }) {
  const cls = `grid grid-cols-[1fr_auto] items-baseline gap-4 py-[18px] no-underline text-[#111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A1C1C] ${
    hl ? "bg-[#D6CBB5] border-b border-[#111] px-4" : "border-b border-[#D6CBB5]"
  }`;
  const inner = (
    <>
      <span
        className={`ed-sans text-[12px] md:text-[14px] tracking-[0.14em] uppercase ${
          sub ? "pl-7 text-[#8A1C1C] font-semibold" : "font-medium"
        }`}>
        {label}
      </span>
      <span
        className={`text-[24px] md:text-[36px] text-right tabular-nums ${hl ? "font-bold" : "font-normal"} ${
          red ? "text-[#8A1C1C]" : ""
        }`}>
        {value}
      </span>
    </>
  );
  return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
}
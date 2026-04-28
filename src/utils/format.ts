export function bankersRound(num: number, dec = 2): number {
  const f    = Math.pow(10, dec);
  const s    = num * f;
  const fl   = Math.floor(s);
  const diff = s - fl;
  if (Math.abs(diff - 0.5) < 1e-10) return (fl % 2 === 0 ? fl : fl + 1) / f;
  return Math.round(s) / f;
}

export const fmtMoney = (val: number) =>
  `฿${val.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtQty = (val: number) =>
  val.toLocaleString("en", { maximumFractionDigits: 2 });

export const fmtPct = (val: number) =>
  `${val.toFixed(1)}%`;
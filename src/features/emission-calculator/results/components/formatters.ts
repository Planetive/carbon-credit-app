export const formatKg = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export const formatTonnes = (valueKg: number) => {
  const t = valueKg / 1000;
  if (t >= 100) {
    return t.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  if (t >= 10) {
    return t.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return t.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

export const pctOfTotal = (part: number, total: number) => {
  if (!total || !Number.isFinite(total)) return 0;
  return (part / total) * 100;
};

export const formatPct = (pct: number) => {
  if (pct === 0) return "0";
  if (pct >= 10) return pct.toFixed(1);
  if (pct >= 1) return pct.toFixed(1);
  if (pct >= 0.01) return pct.toFixed(3);
  return pct.toFixed(3);
};

export const SCOPE_COLORS = {
  scope1: { solid: "#E24B4A", soft: "bg-[#FEECEC] text-[#C23530]", icon: "bg-[#FEECEC] text-[#E24B4A]" },
  scope2: { solid: "#F5A524", soft: "bg-[#FFF6E5] text-[#B7791F]", icon: "bg-[#FFF6E5] text-[#F5A524]" },
  scope3: { solid: "#3B82F6", soft: "bg-[#EBF2FE] text-[#2563EB]", icon: "bg-[#EBF2FE] text-[#3B82F6]" },
  total: { solid: "#1D9E75", soft: "bg-[#EAF7F1] text-[#0F6E56]", icon: "bg-[#EAF7F1] text-[#1D9E75]" },
} as const;

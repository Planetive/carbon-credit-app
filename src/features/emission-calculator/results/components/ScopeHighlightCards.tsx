import { Factory, Leaf, Truck, Zap } from "lucide-react";
import { SCOPE_COLORS, formatPct, formatTonnes, pctOfTotal } from "./formatters";

type ScopeHighlightCardsProps = {
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  grandKg: number;
};

const cards = [
  {
    key: "scope1" as const,
    title: "Scope 1",
    description: "Direct emissions from owned or controlled sources.",
    Icon: Factory,
  },
  {
    key: "scope2" as const,
    title: "Scope 2",
    description: "Indirect emissions from purchased electricity, steam, heating and cooling.",
    Icon: Zap,
  },
  {
    key: "scope3" as const,
    title: "Scope 3",
    description: "All other indirect emissions that occur in your value chain.",
    Icon: Truck,
  },
  {
    key: "total" as const,
    title: "Total Emissions",
    description: "Total calculated emissions across all scopes.",
    Icon: Leaf,
  },
];

const ScopeHighlightCards = ({ scope1Kg, scope2Kg, scope3Kg, grandKg }: ScopeHighlightCardsProps) => {
  const values = {
    scope1: scope1Kg,
    scope2: scope2Kg,
    scope3: scope3Kg,
    total: grandKg,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(({ key, title, description, Icon }) => {
        const colors = SCOPE_COLORS[key];
        const valueKg = values[key];
        const pct = key === "total" ? 100 : pctOfTotal(valueKg, grandKg);

        return (
          <article
            key={key}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${colors.soft}`}>
                {formatPct(pct)}% of total
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-slate-900 tabular-nums">
              {formatTonnes(valueKg)} <span className="text-base font-semibold text-slate-500">tCO₂e</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
          </article>
        );
      })}
    </div>
  );
};

export default ScopeHighlightCards;

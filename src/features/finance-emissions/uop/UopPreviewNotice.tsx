import { cn } from "@/lib/utils";
import { canCalculateUop } from "./reportableGuard";

export function UopPreviewNotice({ compact = false }: { compact?: boolean }) {
  if (!canCalculateUop()) {
    return <p className="text-xs text-slate-500">Totals cannot be calculated yet.</p>;
  }
  return (
    <p
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-white text-slate-600",
        compact ? "px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide" : "px-2.5 py-1 text-xs"
      )}
    >
      Preview only
    </p>
  );
}

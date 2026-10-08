import { useState, type ReactNode } from "react";
import { ChevronDown, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  /** One short line under the title — keep under ~12 words. */
  subtitle: string;
  /** Optional longer notes; collapsed by default. */
  details?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Shared header + optional collapsible details so forms stay scannable. */
export function ActivitySectionShell({
  icon: Icon,
  title,
  subtitle,
  details,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("space-y-6", className)}>
      <header className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1D9E75]">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h4>
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
          {details != null && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#0F6E56] hover:text-[#1D9E75] transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
              {open ? "Hide details" : "More about this section"}
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
              />
            </button>
          )}
          {open && details != null && (
            <div className="mt-2 rounded-lg border border-[#BFE3D3]/80 bg-[#EAF7F1]/40 px-3 py-2.5 text-xs leading-relaxed text-[#0A4D3E]">
              {details}
            </div>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

type StepProps = {
  step: number;
  label: string;
  children: ReactNode;
  className?: string;
};

/** Numbered step block for guided multi-step forms. */
export function FormStep({ step, label, children, className }: StepProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1D9E75] text-[11px] font-bold text-white">
          {step}
        </span>
        <h5 className="text-sm font-semibold text-gray-900">{label}</h5>
      </div>
      {children}
    </section>
  );
}

type ChoiceCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  disabled?: boolean;
};

/** Large clickable choice — replaces dense radio rows. */
export function ChoiceCard({
  selected,
  onSelect,
  title,
  description,
  disabled,
}: ChoiceCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl border px-3.5 py-3 text-left transition-all",
        selected
          ? "border-[#1D9E75] bg-[#EAF7F1]/70 shadow-sm ring-1 ring-[#1D9E75]/30"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2",
            selected ? "border-[#1D9E75] bg-[#1D9E75]" : "border-gray-300 bg-white"
          )}
          aria-hidden
        />
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", selected ? "text-[#0F6E56]" : "text-gray-900")}>
            {title}
          </p>
          {description ? (
            <p className="mt-0.5 text-xs text-gray-500 leading-snug">{description}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

type PendingSourcesProps = {
  title?: string;
  items: string[];
};

/** Collapsed-by-default pending sources list — avoids dumping caveats into the main flow. */
export function PendingSourcesNote({
  title = "Other sources (not calculable yet)",
  items,
}: PendingSourcesProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul className="space-y-1.5 border-t border-gray-100 px-4 pb-3 pt-2 text-sm text-gray-600">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>
                {item}{" "}
                <span className="text-amber-800/90 font-medium">· pending</span>
              </span>
            </li>
          ))}
          <li className="pt-1 text-xs text-gray-400">
            Pending does not mean zero emissions.
          </li>
        </ul>
      )}
    </div>
  );
}

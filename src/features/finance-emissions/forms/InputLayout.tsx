import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { FieldTooltip } from "@/components/shared/finance/FieldTooltip";
import { cn } from "@/lib/utils";

export const FIELD_INPUT =
  "h-11 border-[#E2E8F0] bg-white text-[#0F172A] focus-visible:border-[#0F6E56] focus-visible:ring-[#0F6E56]/15";

export function InputSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-[#E8EEF0] bg-[#F8FAFC] p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-[#64748B]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">{children}</div>;
}

export function FormField({
  label,
  unit,
  required,
  tooltip,
  span,
  children,
}: {
  label: string;
  unit?: string;
  required?: boolean;
  tooltip?: string;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", span && "sm:col-span-2")}>
      <div className="flex min-h-[20px] items-center gap-1.5">
        <Label className="text-sm font-medium text-[#334155]">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </Label>
        {unit && <span className="text-xs text-[#94A3B8]">{unit}</span>}
        {tooltip && <FieldTooltip content={tooltip} />}
      </div>
      {children}
    </div>
  );
}

export function ComputedBox({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#DCEAE2] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-[-0.02em] text-[#0F172A] truncate">
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-[#64748B]">{unit}</span>}
      </p>
      {hint && <p className="mt-0.5 text-xs text-[#94A3B8]">{hint}</p>}
    </div>
  );
}

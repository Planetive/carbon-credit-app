import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CLIMATE_TRACE_EMISSIONS_YEAR,
  CLIMATE_TRACE_SOURCE_URL,
  formatEmissionsMillions,
  type ClimateTraceVerifiedEmission,
} from "../api/climateTraceCountryEmissions";
import { FIELD_INPUT } from "./InputLayout";

type SovereignVerifiedEmissionSelectProps = {
  value: string;
  emissionsTons?: number;
  rows: ClimateTraceVerifiedEmission[];
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onSelect: (row: ClimateTraceVerifiedEmission) => void;
};

export function SovereignVerifiedEmissionSelect({
  value,
  emissionsTons = 0,
  rows,
  loading = false,
  disabled = false,
  error = null,
  onRetry,
  onSelect,
}: SovereignVerifiedEmissionSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.countryName.toLowerCase().includes(q));
  }, [rows, search]);

  const selected = rows.find((row) => row.countryName === value);

  return (
    <div className="space-y-1.5">
      {error && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-red-700">{error}</p>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading || !!error || rows.length === 0}
            className={cn(
              FIELD_INPUT,
              "w-full justify-between font-normal",
              !value && "text-[#94A3B8]"
            )}
          >
            <span className="truncate">
              {loading
                ? "Loading verified emissions…"
                : selected
                  ? `${selected.countryName} · ${formatEmissionsMillions(selected.emissionsTons)}`
                  : "Choose Pakistan or UAE"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Pakistan or UAE…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-56">
              <CommandEmpty>No matching country.</CommandEmpty>
              <CommandGroup>
                {filtered.map((row) => (
                  <CommandItem
                    key={row.countryCode}
                    value={row.countryName}
                    onSelect={() => {
                      onSelect(row);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === row.countryName ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">
                      {row.countryName} · {formatEmissionsMillions(row.emissionsTons)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && emissionsTons > 0 && (
        <p className="text-xs text-[#64748B]">
          {formatEmissionsMillions(emissionsTons)} (
          {Math.round(emissionsTons).toLocaleString()} tCO₂e, {CLIMATE_TRACE_EMISSIONS_YEAR})
        </p>
      )}

      <p className="text-[11px] leading-snug text-[#94A3B8]">
        Source:{" "}
        <a
          href={CLIMATE_TRACE_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[#CBD5E1] underline-offset-2 hover:text-[#64748B]"
        >
          Climate TRACE
        </a>
        {" · "}
        Pakistan &amp; UAE only
      </p>
    </div>
  );
}

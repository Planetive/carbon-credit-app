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
  formatEmissionsMillions,
  WORLDOMETER_EMISSIONS_SOURCE_URL,
  WORLDOMETER_EMISSIONS_YEAR,
  WORLDOMETER_VERIFIED_EMISSIONS,
  type WorldometerVerifiedEmission,
} from "../data/worldometerVerifiedEmissions";
import { FIELD_INPUT } from "./InputLayout";

type SovereignVerifiedEmissionSelectProps = {
  value: string;
  emissionsTons?: number;
  disabled?: boolean;
  onSelect: (row: WorldometerVerifiedEmission) => void;
};

export function SovereignVerifiedEmissionSelect({
  value,
  emissionsTons = 0,
  disabled = false,
  onSelect,
}: SovereignVerifiedEmissionSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return WORLDOMETER_VERIFIED_EMISSIONS;
    return WORLDOMETER_VERIFIED_EMISSIONS.filter((row) =>
      row.countryName.toLowerCase().includes(q)
    );
  }, [search]);

  const selected = WORLDOMETER_VERIFIED_EMISSIONS.find(
    (row) => row.countryName === value
  );

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              FIELD_INPUT,
              "w-full justify-between font-normal",
              !value && "text-[#94A3B8]"
            )}
          >
            <span className="truncate">
              {selected
                ? `${selected.countryName} · ${formatEmissionsMillions(selected.emissionsTons)}`
                : "Choose country emissions"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to filter…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-56">
              <CommandEmpty>No matching country.</CommandEmpty>
              <CommandGroup>
                {filtered.map((row) => (
                  <CommandItem
                    key={row.countryName}
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
          {formatEmissionsMillions(emissionsTons)} ({emissionsTons.toLocaleString()} tCO₂e, {WORLDOMETER_EMISSIONS_YEAR})
        </p>
      )}

      <p className="text-[11px] leading-snug text-[#94A3B8]">
        Source:{" "}
        <a
          href={WORLDOMETER_EMISSIONS_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[#CBD5E1] underline-offset-2 hover:text-[#64748B]"
        >
          Worldometer
        </a>
      </p>
    </div>
  );
}

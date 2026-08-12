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
import type { SectorOption } from "../types/countrySectorIntensity";
import { FIELD_INPUT } from "./InputLayout";

function formatIntensity(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
}

type SovereignSectorSelectProps = {
  value: string;
  intensity?: number;
  unit?: string;
  sectors: SectorOption[];
  loading?: boolean;
  disabled?: boolean;
  onSelect: (sector: SectorOption) => void;
};

export function SovereignSectorSelect({
  value,
  intensity = 0,
  unit = "kgCO2e/PKR",
  sectors,
  loading = false,
  disabled = false,
  onSelect,
}: SovereignSectorSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sectors;
    return sectors.filter(
      (s) =>
        s.sectorName.toLowerCase().includes(q) ||
        s.sectorCode.toLowerCase().includes(q)
    );
  }, [sectors, search]);

  const selected = sectors.find((s) => s.sectorKey === value);

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              FIELD_INPUT,
              "w-full justify-between font-normal",
              !value && "text-[#94A3B8]"
            )}
          >
            <span className="truncate">
              {loading
                ? "Loading sectors…"
                : selected
                  ? selected.sectorName
                  : "Choose sector"}
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
              <CommandEmpty>No matching sector.</CommandEmpty>
              <CommandGroup>
                {filtered.map((sector) => (
                  <CommandItem
                    key={sector.sectorKey}
                    value={sector.sectorKey}
                    onSelect={() => {
                      onSelect(sector);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === sector.sectorKey ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">
                      {sector.sectorName}
                      {sector.sectorCode ? ` · ${sector.sectorCode}` : ""}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && intensity > 0 && (
        <p className="text-xs text-[#64748B]">
          Intensity:{" "}
          <span className="font-medium text-[#334155]">{formatIntensity(intensity)}</span>
          {" · "}
          {unit}
        </p>
      )}
    </div>
  );
}

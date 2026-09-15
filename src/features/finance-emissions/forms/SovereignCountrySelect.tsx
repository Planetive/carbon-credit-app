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
import type { SovereignCountryOption } from "../types/pppAdjustedGdp";
import { cleanCountryName } from "../utils/cleanCountryName";
import { FIELD_INPUT } from "./InputLayout";

function formatGdp(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

type SovereignCountrySelectProps = {
  value: string;
  gdpValue?: number;
  gdpYear?: number;
  usedFallback?: boolean;
  countries: SovereignCountryOption[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onSelect: (countryName: string) => void;
};

export function SovereignCountrySelect({
  value,
  gdpValue = 0,
  gdpYear = 0,
  usedFallback = false,
  countries,
  loading = false,
  disabled = false,
  placeholder = "Choose country",
  onSelect,
}: SovereignCountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) =>
      cleanCountryName(c.countryName).toLowerCase().includes(q)
    );
  }, [countries, search]);

  const handleSelect = (name: string) => {
    onSelect(name);
    setOpen(false);
    setSearch("");
  };

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
                ? "Loading countries…"
                : value
                  ? cleanCountryName(value)
                  : placeholder}
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
                {filtered.map((country) => {
                  const label = cleanCountryName(country.countryName);
                  return (
                  <CommandItem
                    key={country.countryName}
                    value={label}
                    onSelect={() => handleSelect(country.countryName)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === country.countryName ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && gdpValue > 0 && (
        <p className="text-xs text-[#64748B]">
          PPP-adjusted GDP: <span className="font-medium text-[#334155]">{formatGdp(gdpValue)}</span>
          {" · year "}
          {gdpYear}
          {usedFallback ? " (2025 unavailable)" : ""}
        </p>
      )}
    </div>
  );
}

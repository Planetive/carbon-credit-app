import React, { useState, useEffect, useCallback } from "react";
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
import { searchSuppliers } from "./suppliers";
import { Supplier } from "./types";

interface SupplierAutocompleteProps {
  value?: Supplier | null;
  onSelect: (supplier: Supplier | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const SupplierAutocomplete: React.FC<SupplierAutocompleteProps> = ({
  value,
  onSelect,
  placeholder = "Search supplier...",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search function
  const performSearch = useCallback(
    async (term: string) => {
      if (!term || term.trim().length < 1) {
        setSuppliers([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchSuppliers(term, 20);
        setSuppliers(results);
      } catch (error) {
        console.error("Error searching suppliers:", error);
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        performSearch(searchTerm);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, open, performSearch]);

  // Load initial results when popover opens
  useEffect(() => {
    if (open && searchTerm.length >= 1) {
      performSearch(searchTerm);
    } else if (open && searchTerm.length === 0) {
      // Load some initial results when opening with empty search
      performSearch("");
    }
  }, [open]);

  const handleSelect = (supplier: Supplier) => {
    onSelect(supplier);
    setOpen(false);
    setSearchTerm("");
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {value ? (
            <span className="truncate">{value.supplier_name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search suppliers..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {!loading && suppliers.length === 0 && searchTerm.length >= 1 && (
              <CommandEmpty>No suppliers found.</CommandEmpty>
            )}
            {!loading && suppliers.length === 0 && searchTerm.length === 0 && (
              <CommandEmpty>
                Type to search suppliers...
              </CommandEmpty>
            )}
            {!loading && suppliers.length > 0 && (
              <CommandGroup>
                {suppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.id}
                    onSelect={() => handleSelect(supplier)}
                    className="flex items-start py-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0 mt-0.5",
                        value?.id === supplier.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="text-left line-clamp-2 break-words">
                      {supplier.supplier_name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};


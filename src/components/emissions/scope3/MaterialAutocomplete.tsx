import React, { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
import { searchWasteMaterials, WasteMaterial } from "./wasteTypes";

interface MaterialAutocompleteProps {
  value?: WasteMaterial | null;
  onSelect: (material: WasteMaterial | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MaterialAutocomplete: React.FC<MaterialAutocompleteProps> = ({
  value,
  onSelect,
  placeholder = "Search material...",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [materials, setMaterials] = useState<WasteMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search function
  const performSearch = useCallback(
    async (term: string) => {
      setLoading(true);
      try {
        console.log("🔍 MaterialAutocomplete: Searching for:", term);
        const results = await searchWasteMaterials(term, 20);
        console.log("🔍 MaterialAutocomplete: Found", results.length, "materials");
        setMaterials(results);
      } catch (error) {
        console.error("❌ MaterialAutocomplete: Error searching materials:", error);
        setMaterials([]);
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
    if (open) {
      performSearch(searchTerm);
    }
  }, [open]);

  const handleSelect = (material: WasteMaterial) => {
    onSelect(material);
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
            <span className="truncate">{value[" Material "] || value.Material}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1">
            {value && (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search materials..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            )}
            {!loading && materials.length === 0 && searchTerm.length >= 1 && (
              <CommandEmpty>No materials found.</CommandEmpty>
            )}
            {!loading && materials.length === 0 && searchTerm.length === 0 && (
              <CommandEmpty>Type to search materials...</CommandEmpty>
            )}
            {!loading && materials.length > 0 && (
              <CommandGroup>
                {materials.map((material) => (
                  <CommandItem
                    key={material.id}
                    value={material.id}
                    onSelect={() => handleSelect(material)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === material.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{material[" Material "] || material.Material}</div>
                    </div>
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


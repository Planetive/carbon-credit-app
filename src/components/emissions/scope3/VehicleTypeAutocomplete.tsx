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
import { searchVehicleTypes, VehicleType } from "./vehicleTypes";

interface VehicleTypeAutocompleteProps {
  value?: VehicleType | null;
  onSelect: (vehicle: VehicleType | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const VehicleTypeAutocomplete: React.FC<VehicleTypeAutocompleteProps> = ({
  value,
  onSelect,
  placeholder = "Search vehicle type...",
  disabled = false,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search function
  const performSearch = useCallback(
    async (term: string) => {
      setLoading(true);
      try {
        const results = await searchVehicleTypes(term, 20);
        setVehicles(results);
      } catch (error) {
        console.error("Error searching vehicle types:", error);
        setVehicles([]);
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

  const handleSelect = (vehicle: VehicleType) => {
    onSelect(vehicle);
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
            <span className="truncate">{value.vehicle_type}</span>
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
            placeholder="Search vehicle types..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            )}
            {!loading && vehicles.length === 0 && searchTerm.length >= 1 && (
              <CommandEmpty>No vehicle types found.</CommandEmpty>
            )}
            {!loading && vehicles.length === 0 && searchTerm.length === 0 && (
              <CommandEmpty>Type to search vehicle types...</CommandEmpty>
            )}
            {!loading && vehicles.length > 0 && (
              <CommandGroup>
                {vehicles.map((vehicle) => (
                  <CommandItem
                    key={vehicle.id}
                    value={vehicle.id}
                    onSelect={() => handleSelect(vehicle)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === vehicle.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{vehicle.vehicle_type}</div>
                      <div className="text-xs text-muted-foreground">
                        CO2 Factor: {vehicle.co2_factor} {vehicle.unit}
                      </div>
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


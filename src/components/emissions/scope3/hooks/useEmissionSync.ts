import { useEffect } from "react";
import type { EmissionData } from "@/components/emissions/shared/types";

type Scope3Category =
  | "purchased_goods_services"
  | "capital_goods"
  | "upstream_transportation"
  | "downstream_transportation"
  | "waste_generated"
  | "business_travel"
  | "employee_commuting"
  | "investments"
  | "end_of_life_treatment"
  | "fuel_energy_activities"
  | "processing_sold_products"
  | "use_of_sold_products";

type EmissionEntry = EmissionData["scope3"][number];

interface UseEmissionSyncOptions<Row> {
  category: Scope3Category;
  rows: Row[];
  isInitialLoad?: boolean;
  enabled?: boolean;
  deps?: any[];
  mapRowToEntry: (row: Row) => EmissionEntry | null;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
}

export function useEmissionSync<Row>({
  category,
  rows,
  isInitialLoad = false,
  enabled = true,
  deps = [],
  mapRowToEntry,
  setEmissionData,
}: UseEmissionSyncOptions<Row>) {
  useEffect(() => {
    if (isInitialLoad || !enabled) return;

    const entries = rows
      .map(mapRowToEntry)
      .filter((e): e is EmissionEntry => e !== null);

    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== category),
        ...entries,
      ],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, rows, isInitialLoad, enabled, setEmissionData, ...deps]);
}



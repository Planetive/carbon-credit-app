import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { FormulaConfig } from "../types/formula";
import { FieldTooltip } from "@/components/shared/finance/FieldTooltip";
import {
  passengerTypeTooltipText,
  type UkPassengerTypeDescriptions,
  UK_PASSENGER_BASIS_LABEL,
  availableUkPassengerBasises,
  getUkPassengerFactorCell,
} from "@/components/emissions/shared/ukPassengerFactors";
import type { UkFactorBasis } from "@/components/emissions/shared/types";
import {
  availableUkDeliveryBasises,
  getUkDeliveryFactorCell,
  ukDeliveryBasisValue,
} from "@/components/emissions/shared/ukDeliveryFactors";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";
import { ComputedBox, FIELD_INPUT, InputSection } from "./InputLayout";
import { computeMotorVehiclePcafFinanced } from "../utils/motorVehiclePcaf";
import { normalizeEpaModelYear, sortEpaModelYears } from "@/components/emissions/shared/epaModelYear";
import {
  DEFRA_SOURCE_LABELS,
  EPA_SOURCE_LABELS,
  defraSourcesForPcafOption,
  epaSourcesForPcafOption,
  isScore1aDefraFuel,
  isScore1aMobileFuel,
  loadMotorVehicleFactorLibraries,
  type DefraVehicleSource,
  type EpaVehicleSource,
  type MotorVehicleFactorLibraries,
  type VehicleSource,
} from "../utils/motorVehicleFactorLoaders";
import {
  computeMotorVehicleEntryEmissions,
  type DistanceUnit,
  type NonRoadUnit,
  type OnRoadEmissionSelection,
} from "../utils/motorVehicleEmissionsCalc";

type FactorLibrary = "EPA" | "DEFRA";

interface MotorVehicleLoanFormProps {
  selectedFormula: FormulaConfig | null;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
}

interface VehicleEntry {
  id: string;
  name: string;
  vehicleSource: VehicleSource;
  activity: string;
  vehicleType: string;
  unit: string;
  fuelType: string;
  modelYear: string;
  ladenLevel: string;
  ukFactorBasis: UkFactorBasis;
  emissionSelection: OnRoadEmissionSelection;
  distanceUnit: DistanceUnit;
  nonRoadUnit: NonRoadUnit;
  inputUnit: "gallon" | "liter";
  distance: number;
  fuelConsumption: number;
  dieselLitres: number;
  petrolLitres: number;
  efficiency: number;
  factorKg: number;
  factor: number;
  emissions: number;
  formulaHint: string;
  totalValueAtOrigination: number;
  outstandingAmount: number;
}

const AVERAGE_VEHICLE_EFFICIENCY = 0.08;

const isFuelConsumptionOption = (formula: FormulaConfig | null) => formula?.optionCode === "1a";
const isTypeEfficiencyOption = (formula: FormulaConfig | null) => formula?.optionCode === "3a";
const isAverageEfficiencyOption = (formula: FormulaConfig | null) => formula?.optionCode === "3b";
const usesEfficiencyFormula = (formula: FormulaConfig | null) => {
  const code = formula?.optionCode;
  return code === "1b" || code === "2a" || code === "2b" || code === "3a" || code === "3b";
};

const distanceLabelFor = (formula: FormulaConfig | null) => {
  switch (formula?.optionCode) {
    case "1b":
      return "Actual distance traveled";
    case "2a":
      return "Local statistical distance";
    case "2b":
      return "Regional statistical distance";
    case "3a":
    case "3b":
      return "Statistical distance";
    default:
      return "Distance traveled";
  }
};

const defaultSource = (lib: FactorLibrary, fuelPath: boolean, optionCode?: string): VehicleSource => {
  if (lib === "DEFRA") return defraSourcesForPcafOption(optionCode, fuelPath)[0] ?? "passenger";
  return epaSourcesForPcafOption(optionCode, fuelPath)[0] ?? "mobile_combustion";
};

const factorDatasetFor = (lib: FactorLibrary, source: VehicleSource) => {
  if (lib === "DEFRA") {
    if (source === "delivery") return "uk_delivery_factors";
    if (source === "fuel") return "uk_fuel_factors";
    return "uk_passenger_factors";
  }
  switch (source) {
    case "on_road_gasoline":
      return "on_road_gasoline";
    case "on_road_diesel":
      return "on_road_diesel_alt_fuel";
    case "non_road":
      return "non_road_vehicle";
    case "vehicular_footprint":
      return "vehicular_carbon_footprints";
    default:
      return "mobile_combustion";
  }
};

const isDefraSource = (source: VehicleSource) =>
  source === "passenger" || source === "delivery" || source === "fuel";

const entryMatchesLibrary = (entry: VehicleEntry, lib: FactorLibrary) =>
  lib === "DEFRA" ? isDefraSource(entry.vehicleSource) : !isDefraSource(entry.vehicleSource);

export const MotorVehicleLoanForm: React.FC<MotorVehicleLoanFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData,
}) => {
  const onUpdateRef = useRef(onUpdateFormData);
  onUpdateRef.current = onUpdateFormData;

  const fuelPath = isFuelConsumptionOption(selectedFormula);
  const efficiencyPath = usesEfficiencyFormula(selectedFormula);
  const typeEfficiencyPath = isTypeEfficiencyOption(selectedFormula);
  const averageEfficiencyPath = isAverageEfficiencyOption(selectedFormula);

  const factorLibrary = (formData.factor_library as FactorLibrary) || "EPA";
  const [activeLibrary, setActiveLibrary] = useState<FactorLibrary>(factorLibrary);
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>([]);
  const [libs, setLibs] = useState<MotorVehicleFactorLibraries | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<{
    value: string;
    description: string;
    position: { x: number; y: number };
  } | null>(null);

  const availableSources = useMemo((): VehicleSource[] => {
    if (activeLibrary === "DEFRA") return defraSourcesForPcafOption(selectedFormula?.optionCode, fuelPath);
    return epaSourcesForPcafOption(selectedFormula?.optionCode, fuelPath);
  }, [activeLibrary, selectedFormula?.optionCode, fuelPath]);

  const sourceLabel = (source: VehicleSource) =>
    activeLibrary === "DEFRA"
      ? DEFRA_SOURCE_LABELS[source as DefraVehicleSource]
      : EPA_SOURCE_LABELS[source as EpaVehicleSource];

  useEffect(() => {
    setActiveLibrary(factorLibrary);
  }, [factorLibrary]);

  useEffect(() => {
    let cancelled = false;
    setLibraryReady(false);
    setLibraryError(null);
    void loadMotorVehicleFactorLibraries(activeLibrary).then(({ libs: loaded, error }) => {
      if (cancelled) return;
      setLibs(loaded);
      setLibraryError(error);
      setLibraryReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeLibrary]);

  useEffect(() => {
    const handleClickOutside = () => setHoveredInfo(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHoveredInfo(null);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const passengerActivities = useMemo(
    () => Object.keys(libs?.passengerMap ?? {}).sort((a, b) => a.localeCompare(b)),
    [libs]
  );
  const deliveryActivities = useMemo(
    () => Object.keys(libs?.deliveryMap ?? {}).sort((a, b) => a.localeCompare(b)),
    [libs]
  );
  const ukFuelActivities = useMemo(() => {
    const map = libs?.ukFuelMap ?? {};
    return Object.keys(map)
      .filter((activity) => Object.keys(map[activity] || {}).some(isScore1aDefraFuel))
      .sort((a, b) => a.localeCompare(b));
  }, [libs]);
  const ukFuelFuelsFor = (activity: string) =>
    Object.keys(libs?.ukFuelMap[activity] ?? {})
      .filter(isScore1aDefraFuel)
      .sort((a, b) => a.localeCompare(b));
  const ukFuelUnitsFor = (activity: string, fuel: string) =>
    Object.keys(libs?.ukFuelMap[activity]?.[fuel] ?? {}).sort((a, b) => a.localeCompare(b));
  const epaFuelTypes = useMemo(() => {
    const all = Array.from(new Set((libs?.mobileFuels ?? []).map((f) => f.fuelType)));
    const filtered = fuelPath ? all.filter(isScore1aMobileFuel) : all;
    return filtered.sort((a, b) => a.localeCompare(b));
  }, [libs, fuelPath]);
  const gasolineTypes = useMemo(
    () => Array.from(new Set((libs?.onRoadGasoline ?? []).map((f) => f.vehicleType))).sort((a, b) => a.localeCompare(b)),
    [libs]
  );
  const gasolineYearsFor = (vehicleType: string) =>
    sortEpaModelYears(
      Array.from(
        new Set(
          (libs?.onRoadGasoline ?? [])
            .filter((f) => f.vehicleType === vehicleType)
            .map((f) => f.modelYear)
        )
      )
    );
  const dieselTypes = useMemo(
    () => Array.from(new Set((libs?.onRoadDiesel ?? []).map((f) => f.vehicleType))).sort((a, b) => a.localeCompare(b)),
    [libs]
  );
  const dieselFuelsFor = (vehicleType: string) =>
    Array.from(
      new Set((libs?.onRoadDiesel ?? []).filter((f) => f.vehicleType === vehicleType).map((f) => f.fuelType))
    ).sort((a, b) => a.localeCompare(b));
  const dieselYearsFor = (vehicleType: string, fuelType: string) =>
    sortEpaModelYears(
      Array.from(
        new Set(
          (libs?.onRoadDiesel ?? [])
            .filter((f) => f.vehicleType === vehicleType && f.fuelType === fuelType && f.modelYear)
            .map((f) => f.modelYear as string)
        )
      )
    );
  const nonRoadTypes = useMemo(
    () => Array.from(new Set((libs?.nonRoad ?? []).map((f) => f.vehicleType))).sort((a, b) => a.localeCompare(b)),
    [libs]
  );
  const nonRoadFuelsFor = (vehicleType: string) =>
    Array.from(
      new Set((libs?.nonRoad ?? []).filter((f) => f.vehicleType === vehicleType).map((f) => f.fuelType))
    ).sort((a, b) => a.localeCompare(b));

  const passengerTypesFor = (activity: string) =>
    Object.keys(libs?.passengerMap[activity] ?? {}).sort((a, b) => a.localeCompare(b));
  const passengerUnitsFor = (activity: string, vehicleType: string) =>
    Object.keys(libs?.passengerMap[activity]?.[vehicleType] ?? {}).sort((a, b) => a.localeCompare(b));
  const passengerFuelsFor = (activity: string, vehicleType: string, unit: string) =>
    Object.keys(libs?.passengerMap[activity]?.[vehicleType]?.[unit] ?? {}).sort((a, b) => a.localeCompare(b));
  const deliveryTypesFor = (activity: string) =>
    Object.keys(libs?.deliveryMap[activity] ?? {}).sort((a, b) => a.localeCompare(b));
  const deliveryUnitsFor = (activity: string, vehicleType: string) =>
    Object.keys(libs?.deliveryMap[activity]?.[vehicleType] ?? {}).sort((a, b) => a.localeCompare(b));
  const deliveryFuelsFor = (activity: string, vehicleType: string, unit: string) =>
    Object.keys(libs?.deliveryMap[activity]?.[vehicleType]?.[unit] ?? {}).sort((a, b) => a.localeCompare(b));
  const deliveryLadenFor = (activity: string, vehicleType: string, unit: string, fuelType: string) =>
    Object.keys(libs?.deliveryMap[activity]?.[vehicleType]?.[unit]?.[fuelType] ?? {}).sort((a, b) =>
      a.localeCompare(b)
    );

  const applyDerived = useCallback(
    (entry: VehicleEntry): VehicleEntry => {
      if (!libs) return entry;
      let next = entry;
      if (fuelPath && activeLibrary === "EPA" && next.vehicleSource !== "mobile_combustion") {
        next = { ...next, vehicleSource: "mobile_combustion", inputUnit: next.inputUnit || "gallon" };
      }
      if (fuelPath && activeLibrary === "DEFRA" && next.vehicleSource !== "fuel") {
        next = { ...next, vehicleSource: "fuel" };
      }
      if (fuelPath && next.vehicleSource === "mobile_combustion") {
        const allowed = (libs.mobileFuels ?? []).map((f) => f.fuelType).filter(isScore1aMobileFuel);
        if (allowed.length > 0 && !allowed.includes(next.fuelType)) {
          const fuelType = allowed[0];
          const opt = libs.mobileFuels.find((f) => f.fuelType === fuelType);
          next = {
            ...next,
            fuelType,
            unit: opt?.unit || next.unit,
            inputUnit: (opt?.unit || "").toLowerCase().includes("gallon") ? next.inputUnit || "gallon" : next.inputUnit,
          };
        }
      }
      if (fuelPath && next.vehicleSource === "fuel") {
        const activity =
          next.activity && ukFuelActivities.includes(next.activity) ? next.activity : ukFuelActivities[0] || "";
        const fuels = ukFuelFuelsFor(activity);
        const fuelType = fuels.includes(next.fuelType) ? next.fuelType : fuels[0] || "";
        const units = ukFuelUnitsFor(activity, fuelType);
        const unit = units.includes(next.unit) ? next.unit : units[0] || "";
        if (activity !== next.activity || fuelType !== next.fuelType || unit !== next.unit) {
          next = { ...next, activity, fuelType, unit };
        }
      }
      const derived = computeMotorVehicleEntryEmissions(next, libs, {
        fuelPath,
        typeEfficiencyPath,
        averageEfficiencyPath,
      });
      return {
        ...next,
        modelYear: normalizeEpaModelYear(next.modelYear),
        efficiency: derived.efficiency,
        factorKg: derived.factorKg,
        factor: derived.factor,
        emissions: derived.emissions,
        formulaHint: derived.formulaHint,
        unit: derived.unit || next.unit,
      };
    },
    [libs, fuelPath, typeEfficiencyPath, averageEfficiencyPath, activeLibrary, ukFuelActivities]
  );

  const pushTotals = (entries: VehicleEntry[]) => {
    const primarySource = entries[0]?.vehicleSource;
    const totalEmissionsT = entries.reduce((sum, entry) => sum + entry.emissions, 0);
    const totalDistance = entries.reduce((sum, entry) => sum + entry.distance, 0);
    const totalFuel = entries.reduce((sum, entry) => sum + entry.fuelConsumption, 0);
    const totalValueAtOrigination = entries.reduce(
      (sum, entry) => sum + (entry.totalValueAtOrigination || 0),
      0
    );
    const avgFactor = entries.length > 0 ? entries.reduce((sum, e) => sum + e.factor, 0) / entries.length : 0;
    const avgEfficiency =
      entries.length > 0 ? entries.reduce((sum, e) => sum + e.efficiency, 0) / entries.length : 0;

    const vehicleEntriesPayload = entries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      vehicle_source: entry.vehicleSource,
      value_at_origination: entry.totalValueAtOrigination || 0,
      emissions_tco2e: entry.emissions,
      outstanding_amount: entry.outstandingAmount > 0 ? entry.outstandingAmount : undefined,
      fuel_consumption: entry.fuelConsumption || undefined,
      diesel_litres: entry.dieselLitres || undefined,
      petrol_litres: entry.petrolLitres || undefined,
      distance_traveled: entry.distance || undefined,
      efficiency: entry.efficiency || undefined,
      emission_factor: entry.factor || undefined,
      fuel_type: entry.fuelType || undefined,
      activity: entry.activity || undefined,
      vehicle_type: entry.vehicleType || undefined,
      model_year: entry.modelYear || undefined,
      laden_level: entry.ladenLevel || undefined,
    }));

    onUpdateRef.current("total_vehicle_emissions", totalEmissionsT);
    onUpdateRef.current("total_distance_traveled", totalDistance);
    onUpdateRef.current("distance_traveled", totalDistance);
    onUpdateRef.current("fuel_consumption", totalFuel);
    onUpdateRef.current("total_value_at_origination", totalValueAtOrigination);
    onUpdateRef.current("average_factor", avgFactor);
    onUpdateRef.current("efficiency", avgEfficiency);
    onUpdateRef.current("emission_factor", avgFactor);
    onUpdateRef.current("vehicle_entries", vehicleEntriesPayload as unknown as FinanceFormValue);
    onUpdateRef.current("factor_library", activeLibrary);
    onUpdateRef.current(
      "factor_dataset",
      primarySource ? factorDatasetFor(activeLibrary, primarySource) : "mobile_combustion"
    );
  };

  const setLibrary = (lib: FactorLibrary) => {
    if (lib === activeLibrary) return;
    setActiveLibrary(lib);
    onUpdateRef.current("factor_library", lib);
    onUpdateRef.current("energy_type", "vehicle");
    const src = defaultSource(lib, fuelPath, selectedFormula?.optionCode);
    onUpdateRef.current("factor_dataset", factorDatasetFor(lib, src));
  };

  const blankEntry = (
    index: number,
    sourceOverride?: VehicleSource,
    libraryOverride?: FactorLibrary
  ): VehicleEntry => {
    const lib = libraryOverride ?? activeLibrary;
    const source = sourceOverride ?? defaultSource(lib, fuelPath, selectedFormula?.optionCode);
    const draft: VehicleEntry = {
      id: crypto.randomUUID(),
      name: `Vehicle ${index}`,
      vehicleSource: source,
      activity: "",
      vehicleType: "",
      unit: source === "on_road_gasoline" || source === "on_road_diesel" ? "mile" : "km",
      fuelType: "",
      modelYear: "",
      ladenLevel: "",
      ukFactorBasis: "total",
      emissionSelection: "co2e",
      distanceUnit: "mile",
      nonRoadUnit: "gallon",
      inputUnit: "gallon",
      distance: 0,
      fuelConsumption: 0,
      dieselLitres: 0,
      petrolLitres: 0,
      efficiency: AVERAGE_VEHICLE_EFFICIENCY,
      factorKg: 0,
      factor: 0,
      emissions: 0,
      formulaHint: "",
      totalValueAtOrigination: 0,
      outstandingAmount: 0,
    };

    if (lib === "DEFRA") {
      if (source === "fuel") {
        draft.activity = ukFuelActivities[0] || "";
        draft.fuelType = ukFuelFuelsFor(draft.activity)[0] || "";
        draft.unit = ukFuelUnitsFor(draft.activity, draft.fuelType)[0] || "";
      } else {
        const activities = source === "delivery" ? deliveryActivities : passengerActivities;
        draft.activity = activities[0] || "";
        if (source === "passenger" && draft.activity) {
          draft.vehicleType = passengerTypesFor(draft.activity)[0] || "";
          draft.unit = passengerUnitsFor(draft.activity, draft.vehicleType)[0] || "km";
          draft.fuelType = passengerFuelsFor(draft.activity, draft.vehicleType, draft.unit)[0] || "";
        }
        if (source === "delivery" && draft.activity) {
          draft.vehicleType = deliveryTypesFor(draft.activity)[0] || "";
          draft.unit = deliveryUnitsFor(draft.activity, draft.vehicleType)[0] || "km";
          draft.fuelType = deliveryFuelsFor(draft.activity, draft.vehicleType, draft.unit)[0] || "";
          draft.ladenLevel =
            deliveryLadenFor(draft.activity, draft.vehicleType, draft.unit, draft.fuelType)[0] || "";
        }
      }
    } else if (source === "mobile_combustion" && epaFuelTypes[0]) {
      draft.fuelType = epaFuelTypes[0];
      draft.unit = libs?.mobileFuels.find((f) => f.fuelType === epaFuelTypes[0])?.unit || "gallon";
      draft.inputUnit = (draft.unit || "").toLowerCase().includes("gallon") ? "gallon" : "gallon";
    } else if (source === "on_road_gasoline" && gasolineTypes[0]) {
      draft.vehicleType = gasolineTypes[0];
      draft.modelYear = gasolineYearsFor(gasolineTypes[0])[0] || "";
    } else if (source === "on_road_diesel" && dieselTypes[0]) {
      draft.vehicleType = dieselTypes[0];
      draft.fuelType = dieselFuelsFor(dieselTypes[0])[0] || "";
      draft.modelYear = dieselYearsFor(draft.vehicleType, draft.fuelType)[0] || "";
    } else if (source === "non_road" && nonRoadTypes[0]) {
      draft.vehicleType = nonRoadTypes[0];
      draft.fuelType = nonRoadFuelsFor(nonRoadTypes[0])[0] || "";
    }

    return applyDerived(draft);
  };

  const addVehicleEntry = () => {
    const updated = [...vehicleEntries, blankEntry(vehicleEntries.length + 1, undefined, activeLibrary)];
    setVehicleEntries(updated);
    pushTotals(updated);
  };

  const removeVehicleEntry = (id: string) => {
    const updated = vehicleEntries.filter((entry) => entry.id !== id);
    setVehicleEntries(updated);
    pushTotals(updated);
  };

  const cascadeDefra = (entry: VehicleEntry, field: keyof VehicleEntry, value: unknown): VehicleEntry => {
    const next = { ...entry, [field]: value } as VehicleEntry;
    if (entry.vehicleSource === "fuel") {
      if (field === "activity") {
        next.fuelType = ukFuelFuelsFor(String(value))[0] || "";
        next.unit = ukFuelUnitsFor(String(value), next.fuelType)[0] || "";
      } else if (field === "fuelType") {
        next.unit = ukFuelUnitsFor(next.activity, String(value))[0] || "";
      }
    }
    if (entry.vehicleSource === "passenger") {
      if (field === "activity") {
        next.vehicleType = passengerTypesFor(String(value))[0] || "";
        next.unit = passengerUnitsFor(String(value), next.vehicleType)[0] || "";
        next.fuelType = passengerFuelsFor(String(value), next.vehicleType, next.unit)[0] || "";
      } else if (field === "vehicleType") {
        next.unit = passengerUnitsFor(next.activity, String(value))[0] || "";
        next.fuelType = passengerFuelsFor(next.activity, String(value), next.unit)[0] || "";
      } else if (field === "unit") {
        next.fuelType = passengerFuelsFor(next.activity, next.vehicleType, String(value))[0] || "";
      }
    }
    if (entry.vehicleSource === "delivery") {
      if (field === "activity") {
        next.vehicleType = deliveryTypesFor(String(value))[0] || "";
        next.unit = deliveryUnitsFor(String(value), next.vehicleType)[0] || "";
        next.fuelType = deliveryFuelsFor(String(value), next.vehicleType, next.unit)[0] || "";
        next.ladenLevel =
          deliveryLadenFor(String(value), next.vehicleType, next.unit, next.fuelType)[0] || "";
      } else if (field === "vehicleType") {
        next.unit = deliveryUnitsFor(next.activity, String(value))[0] || "";
        next.fuelType = deliveryFuelsFor(next.activity, String(value), next.unit)[0] || "";
        next.ladenLevel = deliveryLadenFor(next.activity, String(value), next.unit, next.fuelType)[0] || "";
      } else if (field === "unit") {
        next.fuelType = deliveryFuelsFor(next.activity, next.vehicleType, String(value))[0] || "";
        next.ladenLevel =
          deliveryLadenFor(next.activity, next.vehicleType, String(value), next.fuelType)[0] || "";
      } else if (field === "fuelType") {
        next.ladenLevel =
          deliveryLadenFor(next.activity, next.vehicleType, next.unit, String(value))[0] || "";
      }
    }
    return next;
  };

  const cascadeEpa = (entry: VehicleEntry, field: keyof VehicleEntry, value: unknown): VehicleEntry => {
    const next = { ...entry, [field]: value } as VehicleEntry;
    if (entry.vehicleSource === "mobile_combustion" && field === "fuelType") {
      const opt = libs?.mobileFuels.find((f) => f.fuelType === String(value));
      next.unit = opt?.unit || next.unit;
      if ((next.unit || "").toLowerCase().includes("gallon")) {
        next.inputUnit = next.inputUnit || "gallon";
      }
    }
    if (entry.vehicleSource === "on_road_gasoline" && field === "vehicleType") {
      next.modelYear = gasolineYearsFor(String(value))[0] || "";
    }
    if (entry.vehicleSource === "on_road_diesel") {
      if (field === "vehicleType") {
        next.fuelType = dieselFuelsFor(String(value))[0] || "";
        next.modelYear = dieselYearsFor(String(value), next.fuelType)[0] || "";
      } else if (field === "fuelType") {
        next.modelYear = dieselYearsFor(next.vehicleType, String(value))[0] || "";
      }
    }
    if (entry.vehicleSource === "non_road" && field === "vehicleType") {
      next.fuelType = nonRoadFuelsFor(String(value))[0] || "";
    }
    return next;
  };

  const updateVehicleEntry = (id: string, field: keyof VehicleEntry, value: VehicleEntry[keyof VehicleEntry]) => {
    const updated = vehicleEntries.map((entry) => {
      if (entry.id !== id) return entry;
      let next: VehicleEntry = { ...entry, [field]: value };
      if (field === "vehicleSource") {
        next = blankEntry(1, value as VehicleSource, activeLibrary);
        next.id = entry.id;
        next.name = entry.name;
        next.totalValueAtOrigination = entry.totalValueAtOrigination;
        next.outstandingAmount = entry.outstandingAmount;
      } else if (activeLibrary === "DEFRA") {
        next = cascadeDefra(next, field, value);
      } else {
        next = cascadeEpa(next, field, value);
      }
      return applyDerived(next);
    });
    setVehicleEntries(updated);
    pushTotals(updated);
  };

  useEffect(() => {
    if (vehicleEntries.length === 0 || !libraryReady || !libs) return;
    if (vehicleEntries.some((e) => !entryMatchesLibrary(e, activeLibrary))) return;
    const recalculated = vehicleEntries.map((entry) => applyDerived(entry));
    setVehicleEntries(recalculated);
    pushTotals(recalculated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryReady, libs, activeLibrary, fuelPath, typeEfficiencyPath, averageEfficiencyPath]);

  useEffect(() => {
    if (!libraryReady || !libs || vehicleEntries.length === 0) return;
    const sourcesOk = vehicleEntries.every(
      (e) => entryMatchesLibrary(e, activeLibrary) && availableSources.includes(e.vehicleSource)
    );
    if (sourcesOk) return;

    const reset = vehicleEntries.map((e, i) => {
      const fresh = blankEntry(i + 1, undefined, activeLibrary);
      return applyDerived({
        ...fresh,
        id: e.id,
        name: e.name,
        totalValueAtOrigination: e.totalValueAtOrigination,
        outstandingAmount: e.outstandingAmount,
      });
    });
    setVehicleEntries(reset);
    pushTotals(reset);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild rows after EPA/DEFRA datasets load
  }, [libraryReady, libs, activeLibrary, fuelPath, availableSources]);

  const efficiencyLocked =
    typeEfficiencyPath || averageEfficiencyPath;
  const showMobileEfficiency =
    efficiencyPath && activeLibrary === "EPA" && vehicleEntries.some((e) => e.vehicleSource === "mobile_combustion");
  const libraryLocked = !libraryReady || !!libraryError;
  const typeDescriptions: UkPassengerTypeDescriptions = libs?.passengerTypeDescriptions ?? {};

  const outstandingLoan = Number(formData.outstandingLoan) || 0;
  const pcafPreview = useMemo(() => {
    if (vehicleEntries.length === 0 || outstandingLoan <= 0) return null;
    const rows = vehicleEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      value_at_origination: entry.totalValueAtOrigination || 0,
      emissions_tco2e: entry.emissions,
      outstanding_amount: entry.outstandingAmount > 0 ? entry.outstandingAmount : undefined,
    }));
    if (rows.some((r) => r.value_at_origination <= 0 || r.emissions_tco2e <= 0)) return null;
    return computeMotorVehiclePcafFinanced(outstandingLoan, rows);
  }, [vehicleEntries, outstandingLoan]);

  const sectionDescription =
    activeLibrary === "DEFRA"
      ? fuelPath
        ? "DEFRA Scope 1 Fuel — mineral petrol, mineral diesel, CNG, or LPG"
        : "DEFRA passenger or delivery vehicles — distance × UK factor"
      : fuelPath
        ? "EPA Mobile Fuel — actual consumption in gallons or liters"
        : "EPA On-Road Gasoline/Diesel, Mobile Fuel, or Non-Road";

  const renderDefraFields = (entry: VehicleEntry) => {
    const showSourcePicker = availableSources.length > 1;
    if (entry.vehicleSource === "fuel") {
      return (
        <>
          {showSourcePicker && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Data source</Label>
              <Select
                value={entry.vehicleSource}
                onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleSource", v as VehicleSource)}
                disabled={libraryLocked}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSources.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DEFRA_SOURCE_LABELS[s as DefraVehicleSource]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Activity</Label>
            <Select
              value={entry.activity || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "activity", v)}
              disabled={libraryLocked}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Select activity" />
              </SelectTrigger>
              <SelectContent>
                {ukFuelActivities.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fuel</Label>
            <Select
              value={entry.fuelType || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
              disabled={libraryLocked || !entry.activity}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Select fuel" />
              </SelectTrigger>
              <SelectContent>
                {ukFuelFuelsFor(entry.activity).map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select
              value={entry.unit || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "unit", v)}
              disabled={libraryLocked || !entry.fuelType}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                {ukFuelUnitsFor(entry.activity, entry.fuelType).map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Actual fuel consumption ({entry.unit || "unit"})</Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={entry.fuelConsumption || ""}
              onChange={(e) =>
                updateVehicleEntry(entry.id, "fuelConsumption", parseFloat(e.target.value) || 0)
              }
              className={FIELD_INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Emission factor</Label>
            <Input type="number" value={entry.factor || ""} disabled className={`${FIELD_INPUT} bg-muted`} />
          </div>
        </>
      );
    }

    const isDelivery = entry.vehicleSource === "delivery";
    const activities = isDelivery ? deliveryActivities : passengerActivities;
    return (
      <>
        {showSourcePicker && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Data source</Label>
          <Select
            value={entry.vehicleSource}
            onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleSource", v as VehicleSource)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSources.map((s) => (
                <SelectItem key={s} value={s}>
                  {DEFRA_SOURCE_LABELS[s as DefraVehicleSource]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        )}
        <div className="space-y-1.5">
          <Label>Activity</Label>
          <Select
            value={entry.activity || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "activity", v)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select activity" />
            </SelectTrigger>
            <SelectContent>
              {activities.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Vehicle type
            {!isDelivery && (
              <Info
                className="h-4 w-4 text-muted-foreground cursor-help"
                onMouseEnter={(e) =>
                  setHoveredInfo({
                    value: entry.vehicleType,
                    description: passengerTypeTooltipText(typeDescriptions, entry.activity, entry.vehicleType),
                    position: { x: e.clientX, y: e.clientY },
                  })
                }
                onMouseLeave={() => setHoveredInfo(null)}
              />
            )}
          </Label>
          <Select
            value={entry.vehicleType || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleType", v)}
            disabled={libraryLocked || !entry.activity}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {(isDelivery ? deliveryTypesFor(entry.activity) : passengerTypesFor(entry.activity)).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Unit</Label>
          <Select
            value={entry.unit || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "unit", v)}
            disabled={libraryLocked || !entry.vehicleType}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {(isDelivery
                ? deliveryUnitsFor(entry.activity, entry.vehicleType)
                : passengerUnitsFor(entry.activity, entry.vehicleType)
              ).map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Fuel type</Label>
          <Select
            value={entry.fuelType || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
            disabled={libraryLocked || !entry.unit}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select fuel" />
            </SelectTrigger>
            <SelectContent>
              {(isDelivery
                ? deliveryFuelsFor(entry.activity, entry.vehicleType, entry.unit)
                : passengerFuelsFor(entry.activity, entry.vehicleType, entry.unit)
              ).map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isDelivery && (
          <div className="space-y-1.5">
            <Label>Laden level</Label>
            <Select
              value={entry.ladenLevel || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "ladenLevel", v)}
              disabled={libraryLocked || !entry.fuelType}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Select laden" />
              </SelectTrigger>
              <SelectContent>
                {deliveryLadenFor(entry.activity, entry.vehicleType, entry.unit, entry.fuelType).map((l) => (
                  <SelectItem key={l || "empty"} value={l}>
                    {l || "(default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Factor basis</Label>
          <Select
            value={entry.ukFactorBasis}
            onValueChange={(v) => updateVehicleEntry(entry.id, "ukFactorBasis", v as UkFactorBasis)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(isDelivery
                ? availableUkDeliveryBasises(
                    getUkDeliveryFactorCell(
                      libs!.deliveryMap,
                      entry.activity,
                      entry.vehicleType,
                      entry.unit,
                      entry.fuelType,
                      entry.ladenLevel
                    )
                  )
                : availableUkPassengerBasises(
                    getUkPassengerFactorCell(
                      libs!.passengerMap,
                      entry.activity,
                      entry.vehicleType,
                      entry.unit,
                      entry.fuelType
                    )
                  )
              ).map((b) => (
                <SelectItem key={b} value={b}>
                  {UK_PASSENGER_BASIS_LABEL[b]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{distanceLabelFor(selectedFormula)} ({entry.unit || "km"})</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={entry.distance || ""}
            onChange={(e) => updateVehicleEntry(entry.id, "distance", parseFloat(e.target.value) || 0)}
            className={FIELD_INPUT}
          />
        </div>
      </>
    );
  };

  const renderEpaFields = (entry: VehicleEntry) => {
    const src = entry.vehicleSource as EpaVehicleSource;
    const showSourcePicker = availableSources.length > 1;
    const gallonBase = (entry.unit || "").toLowerCase().includes("gallon");
    return (
      <>
        {showSourcePicker && (
        <div className="space-y-1.5 sm:col-span-2">
          <Label>EPA data source</Label>
          <Select
            value={entry.vehicleSource}
            onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleSource", v as VehicleSource)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSources.map((s) => (
                <SelectItem key={s} value={s}>
                  {EPA_SOURCE_LABELS[s as EpaVehicleSource]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        )}

        {src === "mobile_combustion" && (
          <>
            <div className="space-y-1.5">
              <Label>Fuel type</Label>
              <Select
                value={entry.fuelType || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
                disabled={libraryLocked}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select fuel" />
                </SelectTrigger>
                <SelectContent>
                  {epaFuelTypes.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{gallonBase ? "Input unit" : "Unit"}</Label>
              {gallonBase ? (
                <Select
                  value={entry.inputUnit || "gallon"}
                  onValueChange={(v) => updateVehicleEntry(entry.id, "inputUnit", v as "gallon" | "liter")}
                >
                  <SelectTrigger className={FIELD_INPUT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gallon">gallon</SelectItem>
                    <SelectItem value="liter">liter</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input value={entry.unit || ""} readOnly className={`${FIELD_INPUT} bg-[#F8FAFC]`} />
              )}
            </div>
          </>
        )}

        {src === "on_road_gasoline" && (
          <>
            <div className="space-y-1.5">
              <Label>Vehicle type</Label>
              <Select
                value={entry.vehicleType || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleType", v)}
                disabled={libraryLocked}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {gasolineTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model year</Label>
              <Select
                value={entry.modelYear || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "modelYear", v)}
                disabled={libraryLocked || !entry.vehicleType}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {gasolineYearsFor(entry.vehicleType).map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Distance unit</Label>
              <Select
                value={entry.distanceUnit}
                onValueChange={(v) => updateVehicleEntry(entry.id, "distanceUnit", v as DistanceUnit)}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mile">mile</SelectItem>
                  <SelectItem value="km">km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {src === "on_road_diesel" && (
          <>
            <div className="space-y-1.5">
              <Label>Vehicle type</Label>
              <Select
                value={entry.vehicleType || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleType", v)}
                disabled={libraryLocked}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {dieselTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel type</Label>
              <Select
                value={entry.fuelType || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
                disabled={libraryLocked || !entry.vehicleType}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select fuel" />
                </SelectTrigger>
                <SelectContent>
                  {dieselFuelsFor(entry.vehicleType).map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model year</Label>
              <Select
                value={entry.modelYear || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "modelYear", v)}
                disabled={libraryLocked || !entry.fuelType}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {dieselYearsFor(entry.vehicleType, entry.fuelType).map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Distance unit</Label>
              <Select
                value={entry.distanceUnit}
                onValueChange={(v) => updateVehicleEntry(entry.id, "distanceUnit", v as DistanceUnit)}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mile">mile</SelectItem>
                  <SelectItem value="km">km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {src === "non_road" && (
          <>
            <div className="space-y-1.5">
              <Label>Vehicle type</Label>
              <Select
                value={entry.vehicleType || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleType", v)}
                disabled={libraryLocked}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {nonRoadTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel type</Label>
              <Select
                value={entry.fuelType || undefined}
                onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
                disabled={libraryLocked || !entry.vehicleType}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue placeholder="Select fuel" />
                </SelectTrigger>
                <SelectContent>
                  {nonRoadFuelsFor(entry.vehicleType).map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel unit</Label>
              <Select
                value={entry.nonRoadUnit}
                onValueChange={(v) => updateVehicleEntry(entry.id, "nonRoadUnit", v as NonRoadUnit)}
              >
                <SelectTrigger className={FIELD_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gallon">gallon</SelectItem>
                  <SelectItem value="liter">liter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {src === "vehicular_footprint" && (
          <>
            <div className="space-y-1.5">
              <Label>Diesel consumption (L)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={entry.dieselLitres || ""}
                onChange={(e) => updateVehicleEntry(entry.id, "dieselLitres", parseFloat(e.target.value) || 0)}
                className={FIELD_INPUT}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Petrol consumption (L)</Label>
              <Input
                type="number"
                min={0}
                step="any"
                value={entry.petrolLitres || ""}
                onChange={(e) => updateVehicleEntry(entry.id, "petrolLitres", parseFloat(e.target.value) || 0)}
                className={FIELD_INPUT}
              />
            </div>
          </>
        )}

        {(src === "mobile_combustion" && fuelPath) || src === "non_road" ? (
          <div className="space-y-1.5">
            <Label>
              {src === "non_road"
                ? `Fuel quantity (${entry.nonRoadUnit})`
                : `Actual fuel consumption (${gallonBase ? entry.inputUnit || "gallon" : entry.unit || "unit"})`}
            </Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={entry.fuelConsumption || ""}
              onChange={(e) =>
                updateVehicleEntry(entry.id, "fuelConsumption", parseFloat(e.target.value) || 0)
              }
              className={FIELD_INPUT}
            />
          </div>
        ) : src !== "vehicular_footprint" ? (
          <div className="space-y-1.5">
            <Label>
              {distanceLabelFor(selectedFormula)} (
              {src === "on_road_gasoline" || src === "on_road_diesel"
                ? entry.distanceUnit
                : entry.unit || "km"}
              )
            </Label>
            <Input
              type="number"
              min={0}
              step="any"
              value={entry.distance || ""}
              onChange={(e) => updateVehicleEntry(entry.id, "distance", parseFloat(e.target.value) || 0)}
              className={FIELD_INPUT}
            />
          </div>
        ) : null}

        {showMobileEfficiency && entry.vehicleSource === "mobile_combustion" && !fuelPath && (
          <div className="space-y-1.5">
            <Label>Fuel efficiency (L/km)</Label>
            <Input
              type="number"
              step="0.001"
              value={entry.efficiency || ""}
              disabled={efficiencyLocked}
              className={efficiencyLocked ? `${FIELD_INPUT} bg-muted` : FIELD_INPUT}
              onChange={(e) => updateVehicleEntry(entry.id, "efficiency", parseFloat(e.target.value) || 0)}
            />
          </div>
        )}

        {entry.vehicleSource !== "vehicular_footprint" && (
          <div className="space-y-1.5">
            <Label>Emission factor</Label>
            <Input type="number" value={entry.factor || ""} disabled className={`${FIELD_INPUT} bg-muted`} />
          </div>
        )}
      </>
    );
  };

  return (
    <InputSection
      title="Vehicles"
      description={sectionDescription}
      action={
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
            {(["EPA", "DEFRA"] as const).map((lib) => (
              <button
                key={lib}
                type="button"
                className={`px-2.5 py-1 text-xs rounded-md ${activeLibrary === lib ? "bg-[#0F6E56] text-white" : "text-[#64748B]"}`}
                onClick={() => setLibrary(lib)}
              >
                {lib}
              </button>
            ))}
          </div>
          <Button
            type="button"
            onClick={addVehicleEntry}
            size="sm"
            className="h-8 border-[#E2E8F0]"
            variant="outline"
            disabled={libraryLocked}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      }
    >
      {!libraryReady && (
        <p className="text-sm text-[#64748B]">
          Loading {activeLibrary === "DEFRA" ? "DEFRA passenger & delivery factors" : "EPA mobile & vehicle tables"}…
        </p>
      )}
      {libraryError && (
        <p className="text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{libraryError}</p>
      )}

      <div className="space-y-3">
        {vehicleEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white py-8 text-center text-sm text-[#94A3B8]">
            Add a vehicle — choose an EPA or DEFRA data source per row.
          </div>
        ) : (
          <div className="space-y-4">
            {vehicleEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-[#E8EEF0] bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <Input
                    type="text"
                    value={entry.name}
                    onChange={(e) => updateVehicleEntry(entry.id, "name", e.target.value)}
                    className="font-medium text-base border-none shadow-none p-0 h-auto focus-visible:ring-0 max-w-[200px] bg-transparent"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeVehicleEntry(entry.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeLibrary === "DEFRA" ? renderDefraFields(entry) : renderEpaFields(entry)}

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      Value at origination (PKR)
                      <FieldTooltip content="Vehicle value at origination for PCAF attribution." />
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={entry.totalValueAtOrigination || ""}
                      onChange={(e) =>
                        updateVehicleEntry(
                          entry.id,
                          "totalValueAtOrigination",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={FIELD_INPUT}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      Outstanding share (PKR)
                      <FieldTooltip content="Optional — leave blank to allocate loan outstanding by value." />
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Auto by value"
                      value={entry.outstandingAmount || ""}
                      onChange={(e) =>
                        updateVehicleEntry(entry.id, "outstandingAmount", parseFloat(e.target.value) || 0)
                      }
                      className={FIELD_INPUT}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-[#E8EEF0] bg-[#F8FAFC] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#334155]">
                      {sourceLabel(entry.vehicleSource)} — emissions
                    </span>
                    <span className="text-lg font-semibold text-[#0F172A]">
                      {entry.emissions.toFixed(6)} tCO₂e
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8]">{entry.formulaHint}</p>
                  {pcafPreview && (() => {
                    const vr = pcafPreview.vehicleResults.find((r) => r.id === entry.id);
                    if (!vr) return null;
                    return (
                      <div className="pt-2 border-t border-[#E2E8F0]">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[#334155]">Financed emissions</span>
                          <span className="text-base font-semibold text-[#0F6E56]">
                            {vr.financedEmissions.toFixed(6)} tCO₂e
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          ({vr.outstandingAllocated.toFixed(2)} / {vr.valueAtOrigination.toFixed(2)}) ×{" "}
                          {vr.vehicleEmissions.toFixed(6)}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {vehicleEntries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
          <ComputedBox
            label="Emissions"
            value={vehicleEntries.reduce((sum, e) => sum + e.emissions, 0).toFixed(4)}
            unit="tCO₂e"
          />
          <ComputedBox
            label="Value at origination"
            value={vehicleEntries
              .reduce((sum, e) => sum + (e.totalValueAtOrigination || 0), 0)
              .toLocaleString()}
            unit="PKR"
          />
          <ComputedBox label="Vehicles" value={String(vehicleEntries.length)} />
          {pcafPreview && (
            <ComputedBox
              label="Financed emissions"
              value={pcafPreview.totalFinancedEmissions.toFixed(6)}
              unit="tCO₂e"
            />
          )}
        </div>
      )}

      {hoveredInfo && (
        <div
          className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ left: `${hoveredInfo.position.x}px`, top: `${hoveredInfo.position.y}px` }}
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm -translate-y-2">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 shrink-0">
                <Info className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-2">{hoveredInfo.value}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{hoveredInfo.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </InputSection>
  );
};

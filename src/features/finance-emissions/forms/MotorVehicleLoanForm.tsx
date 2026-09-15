import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  efficiencyForEpaFuelType,
  loadMotorVehicleFactorLibraries,
  type DefraVehicleSource,
  type EpaVehicleSource,
  type MotorVehicleFactorLibraries,
  type VehicleSource,
} from "../utils/motorVehicleFactorLoaders";
import {
  classesForDistance,
  findDistanceStat,
  formatDistanceStatHint,
  loadVehicleDistanceStats,
  preferredDistanceClass,
  usesForStats,
  type DistanceScope,
  type DistanceUseClass,
  type PublicRoute,
  type VehicleDistanceStat,
} from "../utils/motorVehicleDistanceLoaders";
import {
  brandsFromMakeModel,
  findMakeModelRow,
  formatMakeModelHint,
  loadVehicleMakeModelRows,
  matchEpaFuelFromSheet,
  modelNamesForBrand,
  yearsForBrandModel,
  type VehicleMakeModelRow,
} from "../utils/motorVehicleMakeModelLoaders";
import {
  efficiencyForScore5Cc,
  findCcEfficiency,
  formatCcEfficiencyHint,
  loadVehicleCcEfficiencyRows,
  type VehicleCcEfficiencyRow,
} from "../utils/motorVehicleCcEfficiencyLoaders";
import {
  efficiencyForScore4Type,
  findTypeEfficiency,
  formatTypeEfficiencyHint,
  fuelsForVehicleType,
  loadVehicleTypeEfficiencyRows,
  vehicleTypesFromSheet,
  type VehicleTypeEfficiencyRow,
} from "../utils/motorVehicleTypeEfficiencyLoaders";
import {
  computeMotorVehicleEntryEmissions,
  type DistanceUnit,
  type NonRoadUnit,
  type OnRoadEmissionSelection,
} from "../utils/motorVehicleEmissionsCalc";
import {
  allowedInputUnits,
  defaultInputUnit,
  factorBaseKind,
  FUEL_INPUT_UNIT_LABELS,
  supportsInputUnitConversion,
  type FuelQuantityUnit,
} from "../utils/fuelQuantityConversions";

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
  /** Make / brand — from make/model sheet on Scores 1a / 1b / 2 / 3 */
  make: string;
  /** Model name — from make/model sheet on Scores 1a / 1b / 2 / 3 */
  model: string;
  /** Score 2–5: private / public (matches distance stats sheet) */
  vehicleUseClass: DistanceUseClass | "";
  /** Score 2–5 public only: intercity vs outercity (intracity) */
  publicRoute: PublicRoute | "";
  /** Score 4–5: local vs regional statistical distance */
  distanceScope: DistanceScope | "";
  /** Vehicle class from distance stats sheet */
  distanceClass: string;
  /** Score 5: engine cubic capacity (cc) */
  engineCc: number;
  /** Score 4: market segment from type-efficiency sheet (Hatchback, Sedan, …) */
  marketVehicleType: string;
  /** Score 4: fuel label from type-efficiency sheet (Petrol, CNG, …) */
  typeSheetFuel: string;
  modelYear: string;
  ladenLevel: string;
  ukFactorBasis: UkFactorBasis;
  emissionSelection: OnRoadEmissionSelection;
  distanceUnit: DistanceUnit;
  nonRoadUnit: NonRoadUnit;
  inputUnit: FuelQuantityUnit;
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

/** One row in Score 4’s combined vehicle/fuel picker (Tables 3+4 + Mobile + Non-Road). */
type Score4CombinedOption = {
  key: string;
  label: string;
  group: string;
  source: EpaVehicleSource;
  vehicleType: string;
  fuelType: string;
  needsModelYear: boolean;
  needsFuelQuantity: boolean;
  needsDistanceUnit: boolean;
};

function buildScore4CombinedOptions(libs: MotorVehicleFactorLibraries | null): Score4CombinedOption[] {
  if (!libs) return [];
  const out: Score4CombinedOption[] = [];

  const gasTypes = Array.from(new Set(libs.onRoadGasoline.map((f) => f.vehicleType))).sort((a, b) =>
    a.localeCompare(b)
  );
  for (const vehicleType of gasTypes) {
    out.push({
      key: `gas::${vehicleType}`,
      label: vehicleType,
      group: "Gasoline vehicles",
      source: "on_road_gasoline",
      vehicleType,
      fuelType: "",
      needsModelYear: true,
      needsFuelQuantity: false,
      needsDistanceUnit: true,
    });
  }

  const dieselPairs = new Map<string, { vehicleType: string; fuelType: string }>();
  for (const f of libs.onRoadDiesel) {
    const k = `${f.vehicleType}::${f.fuelType}`;
    if (!dieselPairs.has(k)) dieselPairs.set(k, { vehicleType: f.vehicleType, fuelType: f.fuelType });
  }
  Array.from(dieselPairs.values())
    .sort((a, b) => a.vehicleType.localeCompare(b.vehicleType) || a.fuelType.localeCompare(b.fuelType))
    .forEach(({ vehicleType, fuelType }) => {
      out.push({
        key: `diesel::${vehicleType}::${fuelType}`,
        label: `${vehicleType} — ${fuelType}`,
        group: "Diesel & alternative-fuel vehicles",
        source: "on_road_diesel",
        vehicleType,
        fuelType,
        needsModelYear: true,
        needsFuelQuantity: false,
        needsDistanceUnit: true,
      });
    });

  const fuels = Array.from(new Set(libs.mobileFuels.map((f) => f.fuelType))).sort((a, b) => a.localeCompare(b));
  for (const fuelType of fuels) {
    let label = fuelType;
    const t = fuelType.toLowerCase();
    if (t.includes("motor gasoline") || (t.includes("gasoline") && !t.includes("aviation"))) {
      label = `${fuelType} (Petrol)`;
    } else if (/\bcng\b/.test(t) || t.includes("compressed natural")) {
      label = fuelType.includes("(") ? fuelType : `${fuelType} (CNG)`;
    } else if (/\blpg\b/.test(t) || t.includes("liquefied petroleum")) {
      label = fuelType.includes("(") ? fuelType : `${fuelType} (LPG)`;
    }
    out.push({
      key: `mobile::${fuelType}`,
      label,
      group: "By fuel type",
      source: "mobile_combustion",
      vehicleType: "",
      fuelType,
      needsModelYear: false,
      needsFuelQuantity: false,
      needsDistanceUnit: false,
    });
  }

  const nonRoadPairs = new Map<string, { vehicleType: string; fuelType: string }>();
  for (const f of libs.nonRoad) {
    const k = `${f.vehicleType}::${f.fuelType}`;
    if (!nonRoadPairs.has(k)) nonRoadPairs.set(k, { vehicleType: f.vehicleType, fuelType: f.fuelType });
  }
  Array.from(nonRoadPairs.values())
    .sort((a, b) => a.vehicleType.localeCompare(b.vehicleType) || a.fuelType.localeCompare(b.fuelType))
    .forEach(({ vehicleType, fuelType }) => {
      out.push({
        key: `nonroad::${vehicleType}::${fuelType}`,
        label: `${vehicleType} — ${fuelType}`,
        group: "Equipment & off-road",
        source: "non_road",
        vehicleType,
        fuelType,
        needsModelYear: false,
        needsFuelQuantity: true,
        needsDistanceUnit: false,
      });
    });

  return out;
}

function score4KeyFromEntry(entry: {
  vehicleSource: string;
  vehicleType: string;
  fuelType: string;
}): string | undefined {
  switch (entry.vehicleSource) {
    case "on_road_gasoline":
      return entry.vehicleType ? `gas::${entry.vehicleType}` : undefined;
    case "on_road_diesel":
      return entry.vehicleType && entry.fuelType
        ? `diesel::${entry.vehicleType}::${entry.fuelType}`
        : undefined;
    case "mobile_combustion":
      return entry.fuelType ? `mobile::${entry.fuelType}` : undefined;
    case "non_road":
      return entry.vehicleType && entry.fuelType
        ? `nonroad::${entry.vehicleType}::${entry.fuelType}`
        : undefined;
    default:
      return undefined;
  }
}

const isFuelConsumptionOption = (formula: FormulaConfig | null) => formula?.optionCode === "1a";
const isScore1bOption = (formula: FormulaConfig | null) => formula?.optionCode === "1b";
const isScore2Option = (formula: FormulaConfig | null) => formula?.optionCode === "2a";
const isScore3Option = (formula: FormulaConfig | null) => formula?.optionCode === "2b";
/** Score 2 (local) and Score 3 (regional) share the same EPA fuel-type form. */
const isDistanceStatsScore = (formula: FormulaConfig | null) =>
  isScore2Option(formula) || isScore3Option(formula);
const isTypeEfficiencyOption = (formula: FormulaConfig | null) => formula?.optionCode === "3a";
const isAverageEfficiencyOption = (formula: FormulaConfig | null) => formula?.optionCode === "3b";
const usesEpaFuelTypeOnly = (formula: FormulaConfig | null) =>
  isFuelConsumptionOption(formula) || isScore1bOption(formula) || isDistanceStatsScore(formula);

/** Display labels for EPA fuel names (DB value stays unchanged). */
const formatEpaFuelLabel = (fuelType: string) => {
  const t = fuelType.toLowerCase();
  if (t.includes("motor gasoline") || (t.includes("gasoline") && !t.includes("aviation"))) {
    return `${fuelType} (Petrol)`;
  }
  if (/\bcng\b/.test(t) || t.includes("compressed natural")) {
    return fuelType.includes("(") ? fuelType : `${fuelType} (CNG)`;
  }
  if (/\blpg\b/.test(t) || t.includes("liquefied petroleum")) {
    return fuelType.includes("(") ? fuelType : `${fuelType} (LPG)`;
  }
  return fuelType;
};
const usesEfficiencyFormula = (formula: FormulaConfig | null) => {
  const code = formula?.optionCode;
  return code === "1b" || code === "2a" || code === "2b" || code === "3a" || code === "3b";
};

const distanceLabelFor = (formula: FormulaConfig | null) => {
  switch (formula?.optionCode) {
    case "1b":
      return "Actual distance traveled";
    case "2a":
      return "Distance traveled (local)";
    case "2b":
      return "Distance traveled (regional)";
    case "3a":
      return "Distance traveled";
    case "3b":
      return "Distance traveled";
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
  const score1bPath = isScore1bOption(selectedFormula);
  const score3Path = isScore3Option(selectedFormula);
  const distanceStatsPath = isDistanceStatsScore(selectedFormula);
  const typeEfficiencyPath = isTypeEfficiencyOption(selectedFormula);
  const averageEfficiencyPath = isAverageEfficiencyOption(selectedFormula);
  const statisticalDistancePath = distanceStatsPath || typeEfficiencyPath || averageEfficiencyPath;
  const mobileFuelPath = fuelPath || score1bPath || distanceStatsPath || averageEfficiencyPath;
  /** Scores that pick Brand / Model / Year from the make/model sheet */
  const makeModelPath = fuelPath || score1bPath || distanceStatsPath;
  /** Scores that use sheet efficiency_average (→ L/km) */
  const makeModelEfficiencyPath = score1bPath || distanceStatsPath;
  /** Scores 1a / 1b / 2 / 3 / 4 / 5 — EPA-only (no DEFRA toggle). */
  const epaLockedPath =
    usesEpaFuelTypeOnly(selectedFormula) || typeEfficiencyPath || averageEfficiencyPath;
  /** Scores that use EPA Mobile Fuel + Score 1a fuel filter */
  const epaFuelOnlyPath = usesEpaFuelTypeOnly(selectedFormula) || averageEfficiencyPath;
  const efficiencyPath = usesEfficiencyFormula(selectedFormula);

  const factorLibrary = (formData.factor_library as FactorLibrary) || "EPA";
  const [activeLibrary, setActiveLibrary] = useState<FactorLibrary>(factorLibrary);
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>([]);
  const [libs, setLibs] = useState<MotorVehicleFactorLibraries | null>(null);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [distanceStats, setDistanceStats] = useState<VehicleDistanceStat[]>([]);
  const [distanceStatsError, setDistanceStatsError] = useState<string | null>(null);
  const [makeModelRows, setMakeModelRows] = useState<VehicleMakeModelRow[]>([]);
  const [makeModelError, setMakeModelError] = useState<string | null>(null);
  const [ccEfficiencyRows, setCcEfficiencyRows] = useState<VehicleCcEfficiencyRow[]>([]);
  const [ccEfficiencyError, setCcEfficiencyError] = useState<string | null>(null);
  const [typeEfficiencyRows, setTypeEfficiencyRows] = useState<VehicleTypeEfficiencyRow[]>([]);
  const [typeEfficiencyError, setTypeEfficiencyError] = useState<string | null>(null);
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
    // Score 1a / 2 / 3 / 4 / 5: EPA only
    if (epaLockedPath && factorLibrary !== "EPA") {
      onUpdateRef.current("factor_library", "EPA");
      setActiveLibrary("EPA");
      return;
    }
    setActiveLibrary(epaLockedPath ? "EPA" : factorLibrary);
  }, [factorLibrary, epaLockedPath]);

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
    if (!statisticalDistancePath) return;
    let cancelled = false;
    void loadVehicleDistanceStats()
      .then((rows) => {
        if (cancelled) return;
        setDistanceStats(rows);
        setDistanceStatsError(
          rows.length === 0
            ? "No distance stats found. Import motor_vehicle_distance_stats in pgAdmin."
            : null
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setDistanceStatsError(err instanceof Error ? err.message : "Failed to load distance stats.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [statisticalDistancePath]);

  useEffect(() => {
    if (!makeModelPath) return;
    let cancelled = false;
    void loadVehicleMakeModelRows()
      .then((rows) => {
        if (cancelled) return;
        setMakeModelRows(rows);
        setMakeModelError(
          rows.length === 0
            ? "No make/model rows found. Import motor_vehicle_make_model in pgAdmin."
            : null
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setMakeModelError(err instanceof Error ? err.message : "Failed to load make/model sheet.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [makeModelPath]);

  useEffect(() => {
    if (!averageEfficiencyPath) return;
    let cancelled = false;
    void loadVehicleCcEfficiencyRows()
      .then((rows) => {
        if (cancelled) return;
        setCcEfficiencyRows(rows);
        setCcEfficiencyError(
          rows.length === 0
            ? "No CC efficiency rows found. Import motor_vehicle_cc_efficiency in pgAdmin."
            : null
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setCcEfficiencyError(err instanceof Error ? err.message : "Failed to load CC efficiency sheet.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [averageEfficiencyPath]);

  useEffect(() => {
    if (!typeEfficiencyPath) return;
    let cancelled = false;
    void loadVehicleTypeEfficiencyRows()
      .then((rows) => {
        if (cancelled) return;
        setTypeEfficiencyRows(rows);
        setTypeEfficiencyError(
          rows.length === 0
            ? "No type-efficiency rows found. Import motor_vehicle_type_efficiency in pgAdmin."
            : null
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setTypeEfficiencyError(
            err instanceof Error ? err.message : "Failed to load type-efficiency sheet."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [typeEfficiencyPath]);

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
    const filtered = epaFuelOnlyPath ? all.filter(isScore1aMobileFuel) : all;
    return filtered.sort((a, b) => a.localeCompare(b));
  }, [libs, epaFuelOnlyPath]);
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

  const score4CombinedOptions = useMemo(() => buildScore4CombinedOptions(libs), [libs]);
  const score4OptionsByGroup = useMemo(() => {
    const map = new Map<string, Score4CombinedOption[]>();
    for (const opt of score4CombinedOptions) {
      const list = map.get(opt.group) ?? [];
      list.push(opt);
      map.set(opt.group, list);
    }
    return map;
  }, [score4CombinedOptions]);

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
      if (
        mobileFuelPath &&
        activeLibrary === "EPA" &&
        next.vehicleSource !== "mobile_combustion"
      ) {
        next = {
          ...next,
          vehicleSource: "mobile_combustion",
          inputUnit: next.inputUnit || "gallon",
          unit: score1bPath || distanceStatsPath || averageEfficiencyPath ? next.unit || "km" : next.unit,
        };
      }
      if (
        typeEfficiencyPath &&
        activeLibrary === "EPA" &&
        next.vehicleSource !== "on_road_gasoline" &&
        next.vehicleSource !== "on_road_diesel" &&
        next.vehicleSource !== "mobile_combustion" &&
        next.vehicleSource !== "non_road"
      ) {
        next = {
          ...next,
          vehicleSource: "on_road_gasoline",
          unit: "mile",
          distanceUnit: next.distanceUnit || "mile",
        };
      }
      if (fuelPath && activeLibrary === "DEFRA" && next.vehicleSource !== "fuel") {
        next = { ...next, vehicleSource: "fuel" };
      }
      if (mobileFuelPath && next.vehicleSource === "mobile_combustion") {
        const allowed = (libs.mobileFuels ?? []).map((f) => f.fuelType).filter(isScore1aMobileFuel);
        if (allowed.length > 0 && !allowed.includes(next.fuelType)) {
          const fuelType = allowed[0];
          const opt = libs.mobileFuels.find((f) => f.fuelType === fuelType);
          next = {
            ...next,
            fuelType,
            unit: score1bPath || distanceStatsPath || averageEfficiencyPath ? next.unit || "km" : opt?.unit || next.unit,
            inputUnit: defaultInputUnit(factorBaseKind(opt?.unit || next.unit)),
            efficiency: next.efficiency,
          };
        }
        if (makeModelEfficiencyPath) {
          const mm = findMakeModelRow(makeModelRows, next.make, next.model, next.modelYear);
          next = {
            ...next,
            efficiency:
              mm?.efficiencyLPerKm ||
              (distanceStatsPath && next.fuelType
                ? efficiencyForEpaFuelType(next.fuelType)
                : next.efficiency),
          };
        } else if (averageEfficiencyPath) {
          next = {
            ...next,
            efficiency: efficiencyForScore5Cc(ccEfficiencyRows, {
              geography: next.distanceScope,
              engineCc: next.engineCc,
              fuelType: next.fuelType,
            }),
          };
        }
      }
      if (typeEfficiencyPath) {
        next = {
          ...next,
          efficiency: efficiencyForScore4Type(typeEfficiencyRows, {
            geography: next.distanceScope,
            marketVehicleType: next.marketVehicleType,
            fuelType: next.typeSheetFuel || next.fuelType,
            epaVehicleType: next.vehicleType,
          }),
        };
      }
      if (fuelPath && next.vehicleSource === "fuel") {
        const activity =
          next.activity && ukFuelActivities.includes(next.activity) ? next.activity : ukFuelActivities[0] || "";
        const fuels = ukFuelFuelsFor(activity);
        const fuelType = fuels.includes(next.fuelType) ? next.fuelType : fuels[0] || "";
        const units = ukFuelUnitsFor(activity, fuelType);
        const unit = units.includes(next.unit) ? next.unit : units[0] || "";
        const allowed = allowedInputUnits(unit, fuelType);
        const inputUnit =
          next.inputUnit && allowed.includes(next.inputUnit)
            ? next.inputUnit
            : defaultInputUnit(factorBaseKind(unit));
        if (activity !== next.activity || fuelType !== next.fuelType || unit !== next.unit || inputUnit !== next.inputUnit) {
          next = { ...next, activity, fuelType, unit, inputUnit };
        }
      }
      if (fuelPath && next.vehicleSource === "mobile_combustion") {
        const mobileUnit = libs.mobileFuels.find((f) => f.fuelType === next.fuelType)?.unit || next.unit;
        const allowed = allowedInputUnits(mobileUnit, next.fuelType);
        if (allowed.length > 0) {
          const inputUnit =
            next.inputUnit && allowed.includes(next.inputUnit)
              ? next.inputUnit
              : defaultInputUnit(factorBaseKind(mobileUnit));
          if (inputUnit !== next.inputUnit) {
            next = { ...next, inputUnit };
          }
        }
      }
      const derived = computeMotorVehicleEntryEmissions(next, libs, {
        fuelPath,
        typeEfficiencyPath,
        averageEfficiencyPath,
      });
      return {
        ...next,
        modelYear:
          typeEfficiencyPath ||
          next.vehicleSource === "on_road_gasoline" ||
          next.vehicleSource === "on_road_diesel"
            ? normalizeEpaModelYear(next.modelYear)
            : next.modelYear,
        efficiency: derived.efficiency,
        factorKg: derived.factorKg,
        factor: derived.factor,
        emissions: derived.emissions,
        formulaHint: derived.formulaHint,
        unit: score1bPath || distanceStatsPath ? next.unit || "km" : derived.unit || next.unit,
      };
    },
    [libs, fuelPath, score1bPath, mobileFuelPath, makeModelEfficiencyPath, distanceStatsPath, typeEfficiencyPath, averageEfficiencyPath, activeLibrary, ukFuelActivities, makeModelRows, ccEfficiencyRows, typeEfficiencyRows]
  );

  const impliedDistanceScope = (entry: VehicleEntry): DistanceScope | "" => {
    if (isScore2Option(selectedFormula)) return "local";
    if (isScore3Option(selectedFormula)) return "regional";
    return entry.distanceScope || "";
  };

  const applyDistanceStats = (entry: VehicleEntry): VehicleEntry => {
    if (!statisticalDistancePath || distanceStats.length === 0) return entry;
    const scope = impliedDistanceScope(entry);
    const classes = classesForDistance(
      distanceStats,
      entry.vehicleUseClass,
      entry.publicRoute,
      scope
    );
    let distanceClass = entry.distanceClass;
    if (distanceClass && !classes.includes(distanceClass)) distanceClass = "";
    if (!distanceClass) distanceClass = preferredDistanceClass(entry.vehicleUseClass, classes);
    const hit = findDistanceStat(distanceStats, {
      use: entry.vehicleUseClass,
      vehicleClass: distanceClass,
      publicRoute: entry.publicRoute,
      scope,
    });
    if (!hit) return { ...entry, distanceClass };
    const statsUnit = (hit.unit || "km").toLowerCase().includes("mile") ? "mile" : "km";
    return {
      ...entry,
      distanceClass: distanceClass || hit.vehicleClass,
      distance: hit.annualKm,
      distanceUnit: statsUnit,
      unit: typeEfficiencyPath ? entry.unit : statsUnit,
    };
  };

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
      make: entry.make || undefined,
      model: entry.model || undefined,
      vehicle_use_class: entry.vehicleUseClass || undefined,
      public_route: entry.publicRoute || undefined,
      distance_scope: entry.distanceScope || undefined,
      distance_class: entry.distanceClass || undefined,
      engine_cc: entry.engineCc > 0 ? entry.engineCc : undefined,
      market_vehicle_type: entry.marketVehicleType || undefined,
      type_sheet_fuel: entry.typeSheetFuel || undefined,
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
      make: "",
      model: "",
      vehicleUseClass: statisticalDistancePath ? "private" : "",
      publicRoute: "",
      distanceScope: typeEfficiencyPath || averageEfficiencyPath ? "regional" : "",
      distanceClass: "",
      engineCc: 0,
      marketVehicleType: "",
      typeSheetFuel: "",
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
        draft.inputUnit = defaultInputUnit(factorBaseKind(draft.unit));
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
      draft.unit =
        score1bPath ||
        distanceStatsPath ||
        averageEfficiencyPath ||
        typeEfficiencyPath
          ? "km"
          : libs?.mobileFuels.find((f) => f.fuelType === epaFuelTypes[0])?.unit || "gallon";
      draft.inputUnit = defaultInputUnit(factorBaseKind(draft.unit));
      if (score1bPath) draft.efficiency = 0;
      if (distanceStatsPath) draft.efficiency = efficiencyForEpaFuelType(draft.fuelType);
      if (typeEfficiencyPath) {
        draft.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
          geography: draft.distanceScope,
          marketVehicleType: draft.marketVehicleType,
          fuelType: draft.typeSheetFuel || draft.fuelType,
          epaVehicleType: draft.vehicleType,
        });
      }
      if (averageEfficiencyPath)
        draft.efficiency = efficiencyForScore5Cc(ccEfficiencyRows, {
          geography: draft.distanceScope,
          engineCc: draft.engineCc,
          fuelType: draft.fuelType,
        });
    } else if (source === "on_road_gasoline" && gasolineTypes[0]) {
      draft.vehicleType = gasolineTypes[0];
      draft.modelYear = gasolineYearsFor(gasolineTypes[0])[0] || "";
      if (typeEfficiencyPath) {
        draft.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
          geography: draft.distanceScope,
          marketVehicleType: draft.marketVehicleType,
          fuelType: draft.typeSheetFuel || draft.fuelType,
          epaVehicleType: draft.vehicleType,
        });
      }
    } else if (source === "on_road_diesel" && dieselTypes[0]) {
      draft.vehicleType = dieselTypes[0];
      draft.fuelType = dieselFuelsFor(dieselTypes[0])[0] || "";
      draft.modelYear = dieselYearsFor(draft.vehicleType, draft.fuelType)[0] || "";
      if (typeEfficiencyPath) {
        draft.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
          geography: draft.distanceScope,
          marketVehicleType: draft.marketVehicleType,
          fuelType: draft.typeSheetFuel || draft.fuelType,
          epaVehicleType: draft.vehicleType,
        });
      }
    } else if (source === "non_road" && nonRoadTypes[0]) {
      draft.vehicleType = nonRoadTypes[0];
      draft.fuelType = nonRoadFuelsFor(nonRoadTypes[0])[0] || "";
    }

    return applyDerived(applyDistanceStats(draft));
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
        next.inputUnit = defaultInputUnit(factorBaseKind(next.unit));
      } else if (field === "fuelType") {
        next.unit = ukFuelUnitsFor(next.activity, String(value))[0] || "";
        next.inputUnit = defaultInputUnit(factorBaseKind(next.unit));
      } else if (field === "unit") {
        next.inputUnit = defaultInputUnit(factorBaseKind(String(value)));
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
      if (distanceStatsPath) {
        next.unit = next.unit || "km";
        const mm = findMakeModelRow(makeModelRows, next.make, next.model, next.modelYear);
        next.efficiency = mm?.efficiencyLPerKm || efficiencyForEpaFuelType(String(value));
      } else if (score1bPath) {
        next.unit = next.unit || "km";
        const mm = findMakeModelRow(makeModelRows, next.make, next.model, next.modelYear);
        if (mm) next.efficiency = mm.efficiencyLPerKm;
      } else if (typeEfficiencyPath && entry.vehicleSource === "mobile_combustion") {
        next.unit = next.unit || "km";
        next.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
          geography: next.distanceScope,
          marketVehicleType: next.marketVehicleType,
          fuelType: next.typeSheetFuel || String(value),
          epaVehicleType: next.vehicleType,
        });
      } else if (averageEfficiencyPath) {
        next.unit = next.unit || "km";
        next.efficiency = efficiencyForScore5Cc(ccEfficiencyRows, {
          geography: next.distanceScope,
          engineCc: next.engineCc,
          fuelType: String(value),
        });
      } else {
        next.unit = opt?.unit || next.unit;
        next.inputUnit = defaultInputUnit(factorBaseKind(next.unit));
      }
    }
    if (field === "engineCc" && averageEfficiencyPath) {
      next.efficiency = efficiencyForScore5Cc(ccEfficiencyRows, {
        geography: next.distanceScope,
        engineCc: Number(value) || 0,
        fuelType: next.fuelType,
      });
    }
    if (field === "marketVehicleType" && typeEfficiencyPath) {
      next.marketVehicleType = String(value);
      const fuels = fuelsForVehicleType(typeEfficiencyRows, next.marketVehicleType, next.distanceScope);
      next.typeSheetFuel = fuels[0] || "";
      const matched = matchEpaFuelFromSheet(next.typeSheetFuel, epaFuelTypes);
      if (matched) next.fuelType = matched;
      next.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
        geography: next.distanceScope,
        marketVehicleType: next.marketVehicleType,
        fuelType: next.typeSheetFuel || next.fuelType,
        epaVehicleType: next.vehicleType,
      });
    }
    if (field === "typeSheetFuel" && typeEfficiencyPath) {
      next.typeSheetFuel = String(value);
      const matched = matchEpaFuelFromSheet(next.typeSheetFuel, epaFuelTypes);
      if (matched) next.fuelType = matched;
      next.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
        geography: next.distanceScope,
        marketVehicleType: next.marketVehicleType,
        fuelType: next.typeSheetFuel || next.fuelType,
        epaVehicleType: next.vehicleType,
      });
    }
    if (entry.vehicleSource === "on_road_gasoline" && field === "vehicleType") {
      next.modelYear = gasolineYearsFor(String(value))[0] || "";
      if (typeEfficiencyPath) {
        next.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
          geography: next.distanceScope,
          marketVehicleType: next.marketVehicleType,
          fuelType: next.typeSheetFuel || next.fuelType,
          epaVehicleType: String(value),
        });
      }
    }
    if (entry.vehicleSource === "on_road_diesel") {
      if (field === "vehicleType") {
        next.fuelType = dieselFuelsFor(String(value))[0] || "";
        next.modelYear = dieselYearsFor(String(value), next.fuelType)[0] || "";
        if (typeEfficiencyPath) {
          next.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
            geography: next.distanceScope,
            marketVehicleType: next.marketVehicleType,
            fuelType: next.typeSheetFuel || next.fuelType,
            epaVehicleType: String(value),
          });
        }
      } else if (field === "fuelType") {
        next.modelYear = dieselYearsFor(next.vehicleType, String(value))[0] || "";
      }
    }
    if (entry.vehicleSource === "non_road" && field === "vehicleType") {
      next.fuelType = nonRoadFuelsFor(String(value))[0] || "";
    }
    return next;
  };

  const applyScore4CombinedOption = (id: string, optionKey: string) => {
    const opt = score4CombinedOptions.find((o) => o.key === optionKey);
    if (!opt) return;
    const updated = vehicleEntries.map((entry) => {
      if (entry.id !== id) return entry;
      let modelYear = "";
      if (opt.source === "on_road_gasoline") {
        modelYear = gasolineYearsFor(opt.vehicleType)[0] || "";
      } else if (opt.source === "on_road_diesel") {
        modelYear = dieselYearsFor(opt.vehicleType, opt.fuelType)[0] || "";
      }
      const efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
        geography: entry.distanceScope,
        marketVehicleType: entry.marketVehicleType,
        fuelType: entry.typeSheetFuel || opt.fuelType || entry.fuelType,
        epaVehicleType: opt.vehicleType,
      });
      const next: VehicleEntry = {
        ...entry,
        vehicleSource: opt.source,
        vehicleType: opt.vehicleType,
        fuelType: opt.fuelType || entry.fuelType,
        modelYear,
        efficiency,
        unit: opt.source === "on_road_gasoline" || opt.source === "on_road_diesel" ? "mile" : "km",
        distanceUnit: opt.needsDistanceUnit ? entry.distanceUnit || "km" : entry.distanceUnit,
        fuelConsumption: opt.needsFuelQuantity ? entry.fuelConsumption : entry.fuelConsumption,
      };
      return applyDerived(next);
    });
    setVehicleEntries(updated);
    pushTotals(updated);
  };

  const updateVehicleEntry = (id: string, field: keyof VehicleEntry, value: VehicleEntry[keyof VehicleEntry]) => {
    const updated = vehicleEntries.map((entry) => {
      if (entry.id !== id) return entry;
      let next: VehicleEntry = { ...entry, [field]: value };
      if (field === "vehicleUseClass") {
        const useClass = value as DistanceUseClass | "";
        next.vehicleUseClass = useClass;
        next.publicRoute = useClass === "public" ? entry.publicRoute || "intercity" : "";
        next.distanceClass = "";
        next = applyDistanceStats(next);
      } else if (field === "publicRoute" || field === "distanceScope" || field === "distanceClass") {
        next = applyDistanceStats(next);
        if (field === "distanceScope" && typeEfficiencyPath) {
          const fuels = fuelsForVehicleType(
            typeEfficiencyRows,
            next.marketVehicleType,
            next.distanceScope
          );
          if (fuels.length > 0 && !fuels.includes(next.typeSheetFuel)) {
            next.typeSheetFuel = fuels[0];
            const matched = matchEpaFuelFromSheet(next.typeSheetFuel, epaFuelTypes);
            if (matched) next.fuelType = matched;
          }
          next.efficiency = efficiencyForScore4Type(typeEfficiencyRows, {
            geography: next.distanceScope,
            marketVehicleType: next.marketVehicleType,
            fuelType: next.typeSheetFuel || next.fuelType,
            epaVehicleType: next.vehicleType,
          });
        }
      } else if (field === "make" && makeModelPath) {
        next.make = String(value);
        next.model = "";
        next.modelYear = "";
        if (makeModelEfficiencyPath) {
          next.efficiency = next.fuelType ? efficiencyForEpaFuelType(next.fuelType) : 0;
        }
      } else if (field === "model" && makeModelPath) {
        next.model = String(value);
        next.modelYear = "";
        const years = yearsForBrandModel(makeModelRows, next.make, next.model);
        if (years.length === 1) {
          next.modelYear = years[0] === "Unknown" ? "" : years[0];
        }
        const mm = findMakeModelRow(makeModelRows, next.make, next.model, next.modelYear);
        if (mm && makeModelEfficiencyPath) {
          next.efficiency = mm.efficiencyLPerKm;
          const matchedFuel = matchEpaFuelFromSheet(mm.fuelType, epaFuelTypes);
          if (matchedFuel) next.fuelType = matchedFuel;
        }
      } else if (field === "modelYear" && makeModelPath) {
        next.modelYear = String(value) === "Unknown" ? "" : String(value);
        const mm = findMakeModelRow(makeModelRows, next.make, next.model, next.modelYear);
        if (mm && makeModelEfficiencyPath) {
          next.efficiency = mm.efficiencyLPerKm;
          const matchedFuel = matchEpaFuelFromSheet(mm.fuelType, epaFuelTypes);
          if (matchedFuel) next.fuelType = matchedFuel;
        }
      } else if (field === "vehicleSource") {
        next = blankEntry(1, value as VehicleSource, activeLibrary);
        next.id = entry.id;
        next.name = entry.name;
        next.totalValueAtOrigination = entry.totalValueAtOrigination;
        next.outstandingAmount = entry.outstandingAmount;
        if (distanceStatsPath || typeEfficiencyPath || averageEfficiencyPath) {
          next.vehicleUseClass = entry.vehicleUseClass;
          next.publicRoute = entry.publicRoute;
          next.distanceClass = entry.distanceClass;
          if (typeEfficiencyPath || averageEfficiencyPath) {
            next.distanceScope = entry.distanceScope;
          }
          next = applyDistanceStats(next);
        }
        if (makeModelPath) {
          next.make = entry.make;
          next.model = entry.model;
          next.modelYear = entry.modelYear;
          if (makeModelEfficiencyPath) {
            const mm = findMakeModelRow(makeModelRows, next.make, next.model, next.modelYear);
            if (mm) next.efficiency = mm.efficiencyLPerKm;
          }
        }
        if (averageEfficiencyPath) {
          next.engineCc = entry.engineCc;
        }
        if (typeEfficiencyPath) {
          next.marketVehicleType = entry.marketVehicleType;
          next.typeSheetFuel = entry.typeSheetFuel;
        }
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
  }, [libraryReady, libs, activeLibrary, fuelPath, score1bPath, distanceStatsPath, typeEfficiencyPath, averageEfficiencyPath]);

  useEffect(() => {
    if (!statisticalDistancePath || distanceStats.length === 0 || vehicleEntries.length === 0) return;
    const updated = vehicleEntries.map((entry) => applyDerived(applyDistanceStats(entry)));
    setVehicleEntries(updated);
    pushTotals(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceStats, statisticalDistancePath]);

  useEffect(() => {
    if (!makeModelEfficiencyPath || makeModelRows.length === 0 || vehicleEntries.length === 0) return;
    const updated = vehicleEntries.map((entry) => {
      const mm = findMakeModelRow(makeModelRows, entry.make, entry.model, entry.modelYear);
      if (!mm) return applyDerived(entry);
      return applyDerived({ ...entry, efficiency: mm.efficiencyLPerKm });
    });
    setVehicleEntries(updated);
    pushTotals(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeModelRows, makeModelEfficiencyPath]);

  useEffect(() => {
    if (!averageEfficiencyPath || vehicleEntries.length === 0) return;
    const updated = vehicleEntries.map((entry) =>
      applyDerived({
        ...entry,
        efficiency: efficiencyForScore5Cc(ccEfficiencyRows, {
          geography: entry.distanceScope,
          engineCc: entry.engineCc,
          fuelType: entry.fuelType,
        }),
      })
    );
    setVehicleEntries(updated);
    pushTotals(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccEfficiencyRows, averageEfficiencyPath]);

  useEffect(() => {
    if (!typeEfficiencyPath || vehicleEntries.length === 0) return;
    const updated = vehicleEntries.map((entry) =>
      applyDerived({
        ...entry,
        efficiency: efficiencyForScore4Type(typeEfficiencyRows, {
          geography: entry.distanceScope,
          marketVehicleType: entry.marketVehicleType,
          fuelType: entry.typeSheetFuel || entry.fuelType,
          epaVehicleType: entry.vehicleType,
        }),
      })
    );
    setVehicleEntries(updated);
    pushTotals(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeEfficiencyRows, typeEfficiencyPath]);

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

  const sectionDescription = fuelPath
    ? "Score 1a — pick Brand / Model / Year from the sheet, then enter fuel type and fuel used. Emission factor from EPA Mobile Fuel."
    : score1bPath
      ? "Score 1b — pick Brand / Model / Year from the sheet (efficiency from Efficiency Average). Enter actual km. EF from EPA fuel type."
      : distanceStatsPath
      ? score3Path
        ? "Score 3 — vehicle use + class for regional distance; Brand / Model / Year for efficiency from the make/model sheet. EF from EPA fuel type."
        : "Score 2 — vehicle use + class for local distance; Brand / Model / Year for efficiency from the make/model sheet. EF from EPA fuel type."
      : typeEfficiencyPath
        ? "Score 4 — distance from vehicle-use stats. Pick market vehicle type (Hatchback/Sedan/…) for efficiency; EPA Table 3/4/Mobile/Non-Road for emission factor."
        : averageEfficiencyPath
          ? "Score 5 — same vehicle use/class stats as Score 2–3, plus local or regional scope. Efficiency from CC-band sheet (local Pakistan / regional); EF from EPA fuel type."
          : activeLibrary === "DEFRA"
            ? "DEFRA passenger or delivery vehicles — distance × UK factor"
            : "EPA vehicle and fuel options";

  const fuelConsumptionLabel = (entry: VehicleEntry, baseUnit: string) => {
    if (supportsInputUnitConversion(baseUnit, entry.fuelType)) {
      return FUEL_INPUT_UNIT_LABELS[entry.inputUnit] || entry.inputUnit || baseUnit;
    }
    return baseUnit || "unit";
  };

  const renderFuelInputUnitSelect = (entry: VehicleEntry, baseUnit: string) => {
    const options = allowedInputUnits(baseUnit, entry.fuelType);
    if (options.length <= 1 || !baseUnit) return null;
    return (
      <div className="space-y-1.5">
        <Label>Input unit</Label>
        <Select
          value={entry.inputUnit || defaultInputUnit(factorBaseKind(baseUnit))}
          onValueChange={(v) => updateVehicleEntry(entry.id, "inputUnit", v as FuelQuantityUnit)}
        >
          <SelectTrigger className={FIELD_INPUT}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((u) => (
              <SelectItem key={u} value={u}>
                {FUEL_INPUT_UNIT_LABELS[u]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

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
            <Label>Factor unit</Label>
            <Select
              value={entry.unit || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "unit", v)}
              disabled={libraryLocked || !entry.fuelType}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Select factor unit" />
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
          {entry.unit ? renderFuelInputUnitSelect(entry, entry.unit) : null}
          <div className="space-y-1.5">
            <Label>Actual fuel consumption ({fuelConsumptionLabel(entry, entry.unit)})</Label>
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

  const distanceUseOptions = useMemo(() => {
    const fromSheet = usesForStats(distanceStats);
    return fromSheet.length > 0 ? fromSheet : (["private", "public"] as DistanceUseClass[]);
  }, [distanceStats]);

  const renderDistanceStatsFields = (entry: VehicleEntry, opts?: { includeScope?: boolean }) => {
    const scope = impliedDistanceScope(entry);
    const classes = classesForDistance(
      distanceStats,
      entry.vehicleUseClass,
      entry.publicRoute,
      scope
    );
    const hit = findDistanceStat(distanceStats, {
      use: entry.vehicleUseClass,
      vehicleClass: entry.distanceClass,
      publicRoute: entry.publicRoute,
      scope,
    });
    const distLabel = score3Path
      ? "Distance traveled (regional, km)"
      : opts?.includeScope
        ? entry.distanceScope === "regional"
          ? "Distance traveled (regional, km)"
          : entry.distanceScope === "local"
            ? "Distance traveled (local, km)"
            : "Distance traveled (km)"
        : "Distance traveled (local, km)";

    return (
      <>
        <div className="space-y-1.5">
          <Label>Vehicle use</Label>
          <Select
            value={entry.vehicleUseClass || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "vehicleUseClass", v as DistanceUseClass)}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Private or public" />
            </SelectTrigger>
            <SelectContent>
              {distanceUseOptions.map((use) => (
                <SelectItem key={use} value={use}>
                  {use.charAt(0).toUpperCase() + use.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {entry.vehicleUseClass === "public" && (
          <div className="space-y-1.5">
            <Label>Public route</Label>
            <Select
              value={entry.publicRoute || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "publicRoute", v as PublicRoute)}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Intercity or outercity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intercity">Intercity</SelectItem>
                <SelectItem value="outercity">Outercity (intracity)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {opts?.includeScope && (
          <div className="space-y-1.5">
            <Label>Distance scope</Label>
            <Select
              value={entry.distanceScope || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "distanceScope", v as DistanceScope)}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Local or regional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Vehicle class</Label>
          <Select
            value={entry.distanceClass || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "distanceClass", v)}
            disabled={!entry.vehicleUseClass || classes.length === 0}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue
                placeholder={
                  !entry.vehicleUseClass
                    ? "Select vehicle use first"
                    : classes.length === 0
                      ? "No classes for this use"
                      : "Select class"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>{distLabel}</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={entry.distance || ""}
            onChange={(e) => updateVehicleEntry(entry.id, "distance", parseFloat(e.target.value) || 0)}
            className={FIELD_INPUT}
          />
          <p className="text-xs text-[#94A3B8]">
            {hit
              ? `${formatDistanceStatHint(hit)}${
                  scope === "local" && hit.geographyKind !== "local"
                    ? " (regional fallback — no local row)"
                    : ""
                }`
              : distanceStatsError || "Distance auto-fills from the stats sheet for this use / class"}
          </p>
        </div>
      </>
    );
  };

  const renderMakeModelSheetFields = (entry: VehicleEntry) => {
    const brandOptions = brandsFromMakeModel(makeModelRows);
    const modelOptions = modelNamesForBrand(makeModelRows, entry.make);
    const yearOptions = yearsForBrandModel(makeModelRows, entry.make, entry.model);
    const yearSelectValue =
      entry.modelYear ||
      (entry.model && yearOptions.length === 1 && yearOptions[0] === "Unknown" ? "Unknown" : undefined);
    const mmHit = findMakeModelRow(makeModelRows, entry.make, entry.model, entry.modelYear);

    return (
      <>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Make (Brand)
            <FieldTooltip content="From the make/model sheet. Efficiency uses Efficiency (Average) + unit." />
          </Label>
          <Select
            value={entry.make || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "make", v)}
            disabled={brandOptions.length === 0}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue
                placeholder={brandOptions.length === 0 ? "Import make/model sheet first" : "Select brand"}
              />
            </SelectTrigger>
            <SelectContent>
              {brandOptions.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Model
            <FieldTooltip content="Model name from the make/model sheet." />
          </Label>
          <Select
            value={entry.model || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "model", v)}
            disabled={!entry.make || modelOptions.length === 0}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue
                placeholder={
                  !entry.make
                    ? "Select brand first"
                    : modelOptions.length === 0
                      ? "No models for this brand"
                      : "Select model"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Year
            <FieldTooltip content="Model year from the make/model sheet." />
          </Label>
          <Select
            value={yearSelectValue}
            onValueChange={(v) => updateVehicleEntry(entry.id, "modelYear", v)}
            disabled={!entry.model || yearOptions.length === 0}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue
                placeholder={
                  !entry.model
                    ? "Select model first"
                    : yearOptions.length === 0
                      ? "No year for this model"
                      : "Select year"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {makeModelError && !mmHit && (
            <p className="text-xs text-[#94A3B8]">{makeModelError}</p>
          )}
        </div>
      </>
    );
  };

  const renderMakeModelEfficiencyField = (entry: VehicleEntry) => {
    const mmHit = findMakeModelRow(makeModelRows, entry.make, entry.model, entry.modelYear);
    return (
      <div className="space-y-1.5">
        <Label>Fuel efficiency (make/model)</Label>
        <Input
          type="number"
          value={entry.efficiency > 0 ? entry.efficiency : ""}
          disabled
          className={`${FIELD_INPUT} bg-muted`}
        />
        <p className="text-xs text-[#94A3B8]">
          {mmHit
            ? formatMakeModelHint(mmHit)
            : makeModelError ||
              "Pick Brand / Model / Year — uses Efficiency (Average) converted to L/km"}
        </p>
      </div>
    );
  };

  const renderScore1bEpaFields = (entry: VehicleEntry) => {
    const mobile = libs?.mobileFuels.find((f) => f.fuelType === entry.fuelType);
    const factorUnit = mobile?.unit || "gallon";
    const factorKg = mobile?.factorKg ?? entry.factorKg ?? 0;
    return (
      <>
        {renderMakeModelSheetFields(entry)}

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Fuel type
            <FieldTooltip content="Motor Gasoline is the EPA name for petrol (gasoline). May auto-match from the make/model sheet." />
          </Label>
          <Select
            value={entry.fuelType || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select fuel (EPA)" />
            </SelectTrigger>
            <SelectContent>
              {epaFuelTypes.map((f) => (
                <SelectItem key={f} value={f} title={formatEpaFuelLabel(f)}>
                  {formatEpaFuelLabel(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Actual distance traveled (km)</Label>
          <Input
            type="number"
            min={0}
            step="any"
            value={entry.distance || ""}
            onChange={(e) => updateVehicleEntry(entry.id, "distance", parseFloat(e.target.value) || 0)}
            className={FIELD_INPUT}
          />
          <p className="text-xs text-[#94A3B8]">Odometer kilometres for the year</p>
        </div>

        {renderMakeModelEfficiencyField(entry)}

        <div className="space-y-1.5">
          <Label>Emission factor (EPA)</Label>
          <Input
            type="number"
            value={factorKg > 0 ? factorKg : ""}
            disabled
            className={`${FIELD_INPUT} bg-muted`}
          />
          <p className="text-xs text-[#94A3B8]">
            {factorKg > 0
              ? `kg CO₂e / ${factorUnit} — from EPA Mobile Fuel for this fuel type`
              : "Select a fuel type to load the EPA factor"}
          </p>
        </div>
      </>
    );
  };

  const renderScore2EpaFields = (entry: VehicleEntry) => {
    const mobile = libs?.mobileFuels.find((f) => f.fuelType === entry.fuelType);
    const factorUnit = mobile?.unit || "gallon";
    const factorKg = mobile?.factorKg ?? entry.factorKg ?? 0;
    return (
      <>
        {renderDistanceStatsFields(entry)}
        {renderMakeModelSheetFields(entry)}

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Fuel type
            <FieldTooltip content="Motor Gasoline is the EPA name for petrol (gasoline). May auto-match from the make/model sheet." />
          </Label>
          <Select
            value={entry.fuelType || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select fuel (EPA)" />
            </SelectTrigger>
            <SelectContent>
              {epaFuelTypes.map((f) => (
                <SelectItem key={f} value={f} title={formatEpaFuelLabel(f)}>
                  {formatEpaFuelLabel(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {renderMakeModelEfficiencyField(entry)}

        <div className="space-y-1.5">
          <Label>Emission factor (EPA)</Label>
          <Input
            type="number"
            value={factorKg > 0 ? factorKg : ""}
            disabled
            className={`${FIELD_INPUT} bg-muted`}
          />
          <p className="text-xs text-[#94A3B8]">
            {factorKg > 0
              ? `kg CO₂e / ${factorUnit} — from EPA Mobile Fuel for this fuel type`
              : "Select a fuel type to load the EPA factor"}
          </p>
        </div>
      </>
    );
  };

  const renderScore4EpaFields = (entry: VehicleEntry) => {
    const src = entry.vehicleSource as EpaVehicleSource;
    const selectedKey = score4KeyFromEntry(entry);
    const selectedOpt = score4CombinedOptions.find((o) => o.key === selectedKey);
    const isMobile = src === "mobile_combustion";
    const isNonRoad = src === "non_road";
    const mobile = libs?.mobileFuels.find((f) => f.fuelType === entry.fuelType);
    const mobileFactorKg = mobile?.factorKg ?? entry.factorKg ?? 0;
    const mobileFactorUnit = mobile?.unit || "gallon";
    const yearOptions =
      src === "on_road_gasoline"
        ? gasolineYearsFor(entry.vehicleType)
        : src === "on_road_diesel"
          ? dieselYearsFor(entry.vehicleType, entry.fuelType)
          : [];
    const marketTypes = vehicleTypesFromSheet(typeEfficiencyRows, entry.distanceScope);
    const sheetFuels = fuelsForVehicleType(
      typeEfficiencyRows,
      entry.marketVehicleType,
      entry.distanceScope
    );
    const typeHit = findTypeEfficiency(typeEfficiencyRows, {
      geography: entry.distanceScope,
      vehicleType: entry.marketVehicleType,
      fuelType: entry.typeSheetFuel || entry.fuelType,
    });

    return (
      <>
        {renderDistanceStatsFields(entry, { includeScope: true })}

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Vehicle type
            <FieldTooltip content="Market segment from the type-efficiency sheet (Hatchback, Sedan, SUV, …). Efficiency loads from local/regional studies." />
          </Label>
          <Select
            value={entry.marketVehicleType || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "marketVehicleType", v)}
            disabled={libraryLocked || marketTypes.length === 0}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {marketTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Fuel (for efficiency)
            <FieldTooltip content="Fuel options for this vehicle type from the type-efficiency sheet. Also soft-matches EPA fuel for the emission factor." />
          </Label>
          <Select
            value={entry.typeSheetFuel || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "typeSheetFuel", v)}
            disabled={libraryLocked || !entry.marketVehicleType || sheetFuels.length === 0}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select fuel" />
            </SelectTrigger>
            <SelectContent>
              {sheetFuels.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Fuel efficiency (by vehicle type)</Label>
          <Input
            type="number"
            value={entry.efficiency > 0 ? entry.efficiency : ""}
            disabled
            className={`${FIELD_INPUT} bg-muted`}
          />
          <p className="text-xs text-[#94A3B8]">
            {typeHit
              ? formatTypeEfficiencyHint(typeHit)
              : typeEfficiencyError
                ? typeEfficiencyError
                : entry.marketVehicleType && entry.typeSheetFuel
                  ? "No sheet match — using provisional fallback L/km"
                  : "Select vehicle type and fuel to load efficiency from the sheet"}
          </p>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className="flex items-center gap-2">
            Emission factor source
            <FieldTooltip content="EPA Table 3 / 4 / Mobile Fuel / Non-Road in one list. Used for the emission factor (separate from type-efficiency above)." />
          </Label>
          <Select
            value={selectedKey || undefined}
            onValueChange={(v) => applyScore4CombinedOption(entry.id, v)}
            disabled={libraryLocked || score4CombinedOptions.length === 0}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select EPA factor source" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {Array.from(score4OptionsByGroup.entries()).map(([group, opts]) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {opts.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key} title={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedOpt?.needsDistanceUnit && (
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
                <SelectItem value="km">km</SelectItem>
                <SelectItem value="mile">mile</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedOpt?.needsModelYear && yearOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label>Model year</Label>
            <Select
              value={entry.modelYear || undefined}
              onValueChange={(v) => updateVehicleEntry(entry.id, "modelYear", v)}
              disabled={libraryLocked}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isNonRoad && (
          <>
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
            <div className="space-y-1.5">
              <Label>Fuel quantity ({entry.nonRoadUnit})</Label>
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
          </>
        )}

        <div className="space-y-1.5">
          <Label>Emission factor</Label>
          <Input
            type="number"
            value={
              isMobile
                ? mobileFactorKg > 0
                  ? mobileFactorKg
                  : ""
                : entry.factorKg > 0
                  ? entry.factorKg
                  : ""
            }
            disabled
            className={`${FIELD_INPUT} bg-muted`}
          />
          <p className="text-xs text-[#94A3B8]">
            {!selectedOpt
              ? "Select an EPA factor source to load the emission factor"
              : isMobile
                ? mobileFactorKg > 0
                  ? `kg CO₂e / ${mobileFactorUnit}`
                  : "Select an EPA factor source to load the emission factor"
                : isNonRoad
                  ? entry.factorKg > 0
                    ? "g CO₂e / gallon"
                    : "Select an EPA factor source to load the emission factor"
                  : entry.factorKg > 0
                    ? "g CO₂e / mile"
                    : "Select model year if required to load the emission factor"}
          </p>
        </div>
      </>
    );
  };

  const renderScore5EpaFields = (entry: VehicleEntry) => {
    const mobile = libs?.mobileFuels.find((f) => f.fuelType === entry.fuelType);
    const factorUnit = mobile?.unit || "gallon";
    const factorKg = mobile?.factorKg ?? entry.factorKg ?? 0;
    return (
      <>
        {renderDistanceStatsFields(entry, { includeScope: true })}

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Fuel type
            <FieldTooltip content="Emission factor is loaded from the EPA Mobile Fuel table for this fuel type." />
          </Label>
          <Select
            value={entry.fuelType || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select fuel (EPA)" />
            </SelectTrigger>
            <SelectContent>
              {epaFuelTypes.map((f) => (
                <SelectItem key={f} value={f} title={formatEpaFuelLabel(f)}>
                  {formatEpaFuelLabel(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Engine CC
            <FieldTooltip content="Engine cubic capacity in cc. Efficiency is looked up from the CC-band sheet for local (Pakistan) or regional, matched to fuel type." />
          </Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={entry.engineCc || ""}
            onChange={(e) =>
              updateVehicleEntry(entry.id, "engineCc", parseFloat(e.target.value) || 0)
            }
            placeholder="e.g. 1300"
            className={FIELD_INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Fuel efficiency (by engine CC)</Label>
          <Input
            type="number"
            value={entry.efficiency > 0 ? entry.efficiency : ""}
            disabled
            className={`${FIELD_INPUT} bg-muted`}
          />
          <p className="text-xs text-[#94A3B8]">
            {(() => {
              const hit = findCcEfficiency(ccEfficiencyRows, {
                geography: entry.distanceScope,
                engineCc: entry.engineCc,
                fuelType: entry.fuelType,
              });
              if (hit) return formatCcEfficiencyHint(hit);
              if (ccEfficiencyError) return ccEfficiencyError;
              if (entry.engineCc > 0 && entry.fuelType)
                return "No CC-band match — using provisional fallback L/km";
              return "Enter engine CC and fuel type to load efficiency from the sheet";
            })()}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Emission factor (EPA Mobile Fuel)</Label>
          <Input
            type="number"
            value={factorKg > 0 ? factorKg : ""}
            disabled
            className={`${FIELD_INPUT} bg-muted`}
          />
          <p className="text-xs text-[#94A3B8]">
            {factorKg > 0
              ? `kg CO₂e / ${factorUnit} — from EPA Mobile Fuel for this fuel type`
              : "Select a fuel type to load the EPA factor"}
          </p>
        </div>
      </>
    );
  };

  const renderScore1aEpaFields = (entry: VehicleEntry) => {
    const mobile = libs?.mobileFuels.find((f) => f.fuelType === entry.fuelType);
    const mobileBaseUnit = mobile?.unit || entry.unit || "";
    const factorKg = mobile?.factorKg ?? entry.factorKg ?? 0;
    return (
      <>
        {renderMakeModelSheetFields(entry)}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            Fuel type
            <FieldTooltip content="Motor Gasoline is the EPA name for petrol (gasoline)." />
          </Label>
          <Select
            value={entry.fuelType || undefined}
            onValueChange={(v) => updateVehicleEntry(entry.id, "fuelType", v)}
            disabled={libraryLocked}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select fuel (EPA)" />
            </SelectTrigger>
            <SelectContent>
              {epaFuelTypes.map((f) => (
                <SelectItem key={f} value={f} title={formatEpaFuelLabel(f)}>
                  {formatEpaFuelLabel(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {renderFuelInputUnitSelect(entry, mobileBaseUnit)}
        <div className="space-y-1.5">
          <Label>Actual fuel consumed ({fuelConsumptionLabel(entry, mobileBaseUnit)})</Label>
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
          <Label>Emission factor (EPA)</Label>
          <Input
            type="number"
            value={factorKg > 0 ? factorKg : ""}
            disabled
            className={`${FIELD_INPUT} bg-muted`}
          />
          <p className="text-xs text-[#94A3B8]">
            {factorKg > 0
              ? `kg CO₂e / ${mobileBaseUnit || "unit"} — from EPA Mobile Fuel for this fuel type`
              : "Select a fuel type to load the EPA factor"}
          </p>
        </div>
      </>
    );
  };

  const renderEpaFields = (entry: VehicleEntry) => {
    if (fuelPath) return renderScore1aEpaFields(entry);
    if (score1bPath) return renderScore1bEpaFields(entry);
    if (distanceStatsPath) return renderScore2EpaFields(entry);
    if (typeEfficiencyPath) return renderScore4EpaFields(entry);
    if (averageEfficiencyPath) return renderScore5EpaFields(entry);

    const src = entry.vehicleSource as EpaVehicleSource;
    const showSourcePicker = availableSources.length > 1;
    const mobileBaseUnit =
      libs?.mobileFuels.find((f) => f.fuelType === entry.fuelType)?.unit || entry.unit || "";
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
              <Label className="flex items-center gap-2">
                Fuel type
                <FieldTooltip content="Motor Gasoline is the EPA name for petrol (gasoline)." />
              </Label>
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
                    <SelectItem key={f} value={f} title={formatEpaFuelLabel(f)}>
                      {formatEpaFuelLabel(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Factor unit</Label>
              <Input value={mobileBaseUnit || ""} readOnly className={`${FIELD_INPUT} bg-[#F8FAFC]`} />
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
                : `Actual fuel consumption (${fuelConsumptionLabel(entry, mobileBaseUnit)})`}
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
          {!epaLockedPath && (
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
          )}
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
          Loading {epaLockedPath || activeLibrary === "EPA" ? "EPA vehicle emission factors" : "DEFRA passenger & delivery factors"}…
        </p>
      )}
      {libraryError && (
        <p className="text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{libraryError}</p>
      )}

      <div className="space-y-3">
        {vehicleEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white py-8 text-center text-sm text-[#94A3B8]">
            {fuelPath
              ? "Add a vehicle — pick Brand / Model / Year, then fuel type and fuel consumed. EPA supplies the emission factor."
              : score1bPath
                ? "Add a vehicle — pick Brand / Model / Year for efficiency, then enter actual km."
                : distanceStatsPath
                ? score3Path
                  ? "Add a vehicle — pick use/class for distance, then Brand / Model / Year for efficiency."
                  : "Add a vehicle — pick use/class for distance, then Brand / Model / Year for efficiency."
                : typeEfficiencyPath
                  ? "Add a vehicle — pick use/class for distance, then vehicle type (Hatchback/Sedan/…) for efficiency, then EPA factor source."
                  : averageEfficiencyPath
                    ? "Add a vehicle — same use/class stats as Score 2–3, then fuel type and engine CC."
                    : "Add a vehicle — choose an EPA or DEFRA data source per row."}
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
                  {epaLockedPath || activeLibrary === "EPA" ? renderEpaFields(entry) : renderDefraFields(entry)}

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

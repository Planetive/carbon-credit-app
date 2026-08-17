import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Info } from "lucide-react";
import { FormulaConfig } from "../types/formula";
import { FieldTooltip } from "@/components/shared/finance/FieldTooltip";
import {
  fetchUkPassengerFactorsMap,
  lookupUkPassengerFactor,
  passengerTypeTooltipText,
  type UkPassengerFactorsMap,
  type UkPassengerTypeDescriptions,
} from "@/components/emissions/shared/ukPassengerFactors";
import { loadIpccFactorTableRows } from "@/integrations/supabase/ipccFactorLoader";
import {
  loadUkFuelFactors,
  ukFactorsToNumericMap,
  type NestedFactorMap,
} from "../utils/pcafFactorLoaders";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";
import { ComputedBox, FIELD_INPUT, InputSection } from "./InputLayout";

type FactorLibrary = "EPA" | "DEFRA";

interface MotorVehicleLoanFormProps {
  selectedFormula: FormulaConfig | null;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
}

interface VehicleEntry {
  id: string;
  name: string;
  activity: string;
  vehicleType: string;
  unit: string;
  fuelType: string;
  distance: number;
  fuelConsumption: number;
  efficiency: number;
  factorKg: number;
  factor: number;
  emissions: number;
  totalValueAtOrigination: number;
}

type EpaFuelOption = { fuelType: string; unit: string; factorKg: number };

const LITERS_PER_GALLON = 3.785411784;
const AVERAGE_VEHICLE_EFFICIENCY = 0.08;
const ELECTRIC_KWH_PER_KM = 0.16;

const TYPE_EFFICIENCY_L_PER_KM: Record<string, Record<string, number>> = {
  "Cars (by market segment)": {
    Mini: 0.05,
    Supermini: 0.055,
    "Lower medium": 0.065,
    "Upper medium": 0.075,
    Executive: 0.085,
    Luxury: 0.1,
    Sports: 0.095,
    "Dual purpose 4X4": 0.1,
    MPV: 0.085,
  },
  "Cars (by size)": {
    "Small car": 0.06,
    "Medium car": 0.08,
    "Large car": 0.1,
    "Average car": 0.08,
  },
  Motorbike: { Small: 0.03, Medium: 0.04, Large: 0.055, Average: 0.04 },
};

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

const isGallonUnit = (unit: string) => unit.toLowerCase().includes("gallon");

function typeEfficiency(activity: string, vehicleType: string, fuelType: string) {
  if (/electric|ev\b/i.test(fuelType)) return ELECTRIC_KWH_PER_KM;
  return TYPE_EFFICIENCY_L_PER_KM[activity]?.[vehicleType] ?? AVERAGE_VEHICLE_EFFICIENCY;
}

function transportFuelActivities(map: NestedFactorMap): string[] {
  const all = Object.keys(map).sort((a, b) => a.localeCompare(b));
  const transport = all.filter((a) =>
    /passenger|road|vehicle|petrol|diesel|gasoline|cng|lpg|car|van|hgv|motor/i.test(a)
  );
  return transport.length > 0 ? transport : all;
}

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
  const defraUsesPassenger = !fuelPath;

  const factorLibrary = (formData.factor_library as FactorLibrary) || "EPA";
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>([]);
  const [hoveredInfo, setHoveredInfo] = useState<{
    value: string;
    description: string;
    position: { x: number; y: number };
  } | null>(null);

  const [passengerMap, setPassengerMap] = useState<UkPassengerFactorsMap>({});
  const [typeDescriptions, setTypeDescriptions] = useState<UkPassengerTypeDescriptions>({});
  const [ukFuelMap, setUkFuelMap] = useState<NestedFactorMap>({});
  const [epaFuels, setEpaFuels] = useState<EpaFuelOption[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    setLibraryReady(false);
    setLibraryError(null);

    void (async () => {
      try {
        if (factorLibrary === "DEFRA") {
          if (fuelPath) {
            const map = ukFactorsToNumericMap(await loadUkFuelFactors());
            if (cancelled) return;
            setUkFuelMap(map);
            if (Object.keys(map).length === 0) {
              setLibraryError("Could not load DEFRA UK fuel factors.");
            }
          } else {
            const { map, typeDescriptions: desc, error } = await fetchUkPassengerFactorsMap();
            if (cancelled) return;
            setPassengerMap(map);
            setTypeDescriptions(desc);
            if (error || Object.keys(map).length === 0) {
              setLibraryError(error || "No rows in UK passenger vehicle factors.");
            }
          }
        } else {
          const loaded = await loadIpccFactorTableRows([
            "Mobile Combustion",
            "mobile_combustion",
            "MobileCombustion",
          ]);
          if (cancelled) return;
          const mapped: EpaFuelOption[] = loaded.rows
            .map((row) => {
              const fuelType = String(
                row["Fuel Type"] ?? row.FuelType ?? row.fuel_type ?? row.fuelType ?? ""
              ).trim();
              const unit = String(row.Unit ?? row.unit ?? "gallon").trim() || "gallon";
              const raw = row["kg CO2 per unit"] ?? row.kg_co2_per_unit ?? row.kgCo2PerUnit;
              const factorKg = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
              if (!fuelType || !Number.isFinite(factorKg)) return null;
              return { fuelType, unit, factorKg };
            })
            .filter((opt): opt is EpaFuelOption => !!opt);
          setEpaFuels(mapped);
          if (mapped.length === 0) {
            setLibraryError(
              loaded.attemptErrors[0] || "The EPA Mobile Combustion table has no usable rows."
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLibraryError(err instanceof Error ? err.message : "Could not load vehicle factors.");
        }
      } finally {
        if (!cancelled) setLibraryReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [factorLibrary, fuelPath]);

  const defraActivities = useMemo(
    () =>
      fuelPath
        ? transportFuelActivities(ukFuelMap)
        : Object.keys(passengerMap).sort((a, b) => a.localeCompare(b)),
    [fuelPath, ukFuelMap, passengerMap]
  );

  const epaFuelTypes = useMemo(
    () => Array.from(new Set(epaFuels.map((f) => f.fuelType))).sort((a, b) => a.localeCompare(b)),
    [epaFuels]
  );

  const passengerTypesFor = (activity: string) =>
    Object.keys(passengerMap[activity] || {}).sort((a, b) => a.localeCompare(b));
  const passengerUnitsFor = (activity: string, vehicleType: string) =>
    Object.keys(passengerMap[activity]?.[vehicleType] || {}).sort((a, b) => a.localeCompare(b));
  const passengerFuelsFor = (activity: string, vehicleType: string, unit: string) =>
    Object.keys(passengerMap[activity]?.[vehicleType]?.[unit] || {}).sort((a, b) => a.localeCompare(b));
  const defraFuelsFor = (activity: string) =>
    Object.keys(ukFuelMap[activity] || {}).sort((a, b) => a.localeCompare(b));
  const defraUnitsFor = (activity: string, fuel: string) =>
    Object.keys(ukFuelMap[activity]?.[fuel] || {}).sort((a, b) => a.localeCompare(b));
  const epaOptionFor = (fuelType: string) => epaFuels.find((f) => f.fuelType === fuelType);

  const resolveEntryEfficiency = (entry: VehicleEntry): number => {
    if (averageEfficiencyPath) {
      return /electric|ev\b/i.test(entry.fuelType) ? ELECTRIC_KWH_PER_KM : AVERAGE_VEHICLE_EFFICIENCY;
    }
    if (typeEfficiencyPath) {
      return typeEfficiency(entry.activity, entry.vehicleType, entry.fuelType);
    }
    return entry.efficiency;
  };

  const resolveFactorKg = useCallback(
    (entry: VehicleEntry): number => {
      if (factorLibrary === "EPA") {
        return epaOptionFor(entry.fuelType)?.factorKg ?? 0;
      }
      if (fuelPath) {
        return ukFuelMap[entry.activity]?.[entry.fuelType]?.[entry.unit] ?? 0;
      }
      return (
        lookupUkPassengerFactor(
          passengerMap,
          entry.activity,
          entry.vehicleType,
          entry.unit,
          entry.fuelType
        ) ?? 0
      );
    },
    [factorLibrary, fuelPath, epaFuels, ukFuelMap, passengerMap]
  );

  const computeEmissionsT = (entry: VehicleEntry, factorKg: number): number => {
    if (!(factorKg > 0)) return 0;

    if (factorLibrary === "DEFRA" && defraUsesPassenger) {
      return (entry.distance * factorKg) / 1000;
    }

    if (fuelPath) {
      return (entry.fuelConsumption * factorKg) / 1000;
    }

    // EPA distance options: distance × efficiency (L or kWh / distance) × EF
    let fuelUsed = entry.distance * entry.efficiency;
    if (factorLibrary === "EPA" && isGallonUnit(entry.unit)) {
      fuelUsed = fuelUsed / LITERS_PER_GALLON;
    }
    return (fuelUsed * factorKg) / 1000;
  };

  const applyDerived = useCallback(
    (entry: VehicleEntry): VehicleEntry => {
      const next = { ...entry };
      if (factorLibrary === "EPA") {
        const opt = epaOptionFor(next.fuelType);
        if (opt) next.unit = opt.unit;
      }
      next.efficiency = resolveEntryEfficiency(next);
      next.factorKg = resolveFactorKg(next);
      next.factor = next.factorKg / 1000;
      next.emissions = computeEmissionsT(next, next.factorKg);
      return next;
    },
    [factorLibrary, resolveFactorKg, fuelPath, typeEfficiencyPath, averageEfficiencyPath, defraUsesPassenger]
  );

  const pushTotals = (entries: VehicleEntry[]) => {
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

    onUpdateRef.current("total_vehicle_emissions", totalEmissionsT);
    onUpdateRef.current("total_distance_traveled", totalDistance);
    onUpdateRef.current("distance_traveled", totalDistance);
    onUpdateRef.current("fuel_consumption", totalFuel);
    onUpdateRef.current("total_value_at_origination", totalValueAtOrigination);
    onUpdateRef.current("average_factor", avgFactor);
    onUpdateRef.current("efficiency", avgEfficiency);
    onUpdateRef.current("emission_factor", avgFactor);
    onUpdateRef.current("factor_library", factorLibrary);
    onUpdateRef.current(
      "factor_dataset",
      factorLibrary === "DEFRA"
        ? fuelPath
          ? "uk_fuel_factors"
          : "uk_passenger_factors"
        : "mobile_combustion"
    );
  };

  const setLibrary = (lib: FactorLibrary) => {
    onUpdateRef.current("factor_library", lib);
    onUpdateRef.current("energy_type", "vehicle");
    onUpdateRef.current(
      "factor_dataset",
      lib === "DEFRA" ? (fuelPath ? "uk_fuel_factors" : "uk_passenger_factors") : "mobile_combustion"
    );
  };

  const blankEntry = (index: number): VehicleEntry => {
    const draft: VehicleEntry = {
      id: crypto.randomUUID(),
      name: `Vehicle ${index}`,
      activity: "",
      vehicleType: "",
      unit: factorLibrary === "EPA" ? "gallon" : "km",
      fuelType: "",
      distance: 0,
      fuelConsumption: 0,
      efficiency: AVERAGE_VEHICLE_EFFICIENCY,
      factorKg: 0,
      factor: 0,
      emissions: 0,
      totalValueAtOrigination: 0,
    };
    if (factorLibrary === "EPA" && epaFuelTypes[0]) {
      draft.fuelType = epaFuelTypes[0];
      draft.unit = epaOptionFor(epaFuelTypes[0])?.unit || "gallon";
    } else if (factorLibrary === "DEFRA" && defraActivities[0]) {
      draft.activity = defraActivities[0];
      if (fuelPath) {
        draft.fuelType = defraFuelsFor(draft.activity)[0] || "";
        draft.unit = defraUnitsFor(draft.activity, draft.fuelType)[0] || "";
      } else {
        draft.vehicleType = passengerTypesFor(draft.activity)[0] || "";
        draft.unit = passengerUnitsFor(draft.activity, draft.vehicleType)[0] || "km";
        draft.fuelType = passengerFuelsFor(draft.activity, draft.vehicleType, draft.unit)[0] || "";
      }
    }
    return applyDerived(draft);
  };

  const addVehicleEntry = () => {
    const updated = [...vehicleEntries, blankEntry(vehicleEntries.length + 1)];
    setVehicleEntries(updated);
    pushTotals(updated);
  };

  const removeVehicleEntry = (id: string) => {
    const updated = vehicleEntries.filter((entry) => entry.id !== id);
    setVehicleEntries(updated);
    pushTotals(updated);
  };

  const updateVehicleEntry = (id: string, field: keyof VehicleEntry, value: VehicleEntry[keyof VehicleEntry]) => {
    const updated = vehicleEntries.map((entry) => {
      if (entry.id !== id) return entry;
      const next = { ...entry, [field]: value };
      if (factorLibrary === "DEFRA" && !fuelPath) {
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
      if (factorLibrary === "DEFRA" && fuelPath) {
        if (field === "activity") {
          next.fuelType = defraFuelsFor(String(value))[0] || "";
          next.unit = defraUnitsFor(String(value), next.fuelType)[0] || "";
        } else if (field === "fuelType") {
          next.unit = defraUnitsFor(next.activity, String(value))[0] || "";
        }
      }
      return applyDerived(next);
    });
    setVehicleEntries(updated);
    pushTotals(updated);
  };

  useEffect(() => {
    if (vehicleEntries.length === 0 || !libraryReady) return;
    const recalculated = vehicleEntries.map((entry) => applyDerived(entry));
    setVehicleEntries(recalculated);
    pushTotals(recalculated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalc when library or option path is ready
  }, [libraryReady, factorLibrary, fuelPath, efficiencyPath, typeEfficiencyPath, averageEfficiencyPath]);

  const efficiencyLocked = typeEfficiencyPath || averageEfficiencyPath;
  const showDefraPassenger = factorLibrary === "DEFRA" && defraUsesPassenger;
  const showDefraFuel = factorLibrary === "DEFRA" && fuelPath;
  const showEpaFuel = factorLibrary === "EPA";
  const showEfficiency = efficiencyPath && factorLibrary === "EPA";

  const factorUnitLabel = (entry: VehicleEntry) => {
    if (showDefraPassenger) return `tCO₂e/${entry.unit || "km"}`;
    return `tCO₂e/${entry.unit || "unit"}`;
  };

  const libraryLocked = !libraryReady || !!libraryError;

  return (
    <InputSection
      title="Vehicles"
      description={
        factorLibrary === "DEFRA"
          ? fuelPath
            ? "DEFRA UK fuel factors — actual fuel × kg CO₂e per unit"
            : "DEFRA passenger vehicles — distance × UK_Passenger_factors"
          : fuelPath
            ? "EPA Mobile Combustion — actual fuel × kg CO₂ per unit"
            : "EPA Mobile Combustion — distance × efficiency × fuel factor"
      }
      action={
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
            {(["EPA", "DEFRA"] as const).map((lib) => (
              <button
                key={lib}
                type="button"
                className={`px-2.5 py-1 text-xs rounded-md ${factorLibrary === lib ? "bg-[#0F6E56] text-white" : "text-[#64748B]"}`}
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
          Loading {factorLibrary === "DEFRA" ? "DEFRA vehicle factors" : "EPA Mobile Combustion"}…
        </p>
      )}
      {libraryError && (
        <p className="text-sm text-red-700 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{libraryError}</p>
      )}

      <div className="space-y-3">
        {vehicleEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white py-8 text-center text-sm text-[#94A3B8]">
            Add a vehicle to enter {factorLibrary} activity data.
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
                  {showDefraPassenger && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Activity</Label>
                        <Select
                          value={entry.activity || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "activity", value)}
                          disabled={libraryLocked}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select activity" />
                          </SelectTrigger>
                          <SelectContent>
                            {defraActivities.map((activity) => (
                              <SelectItem key={activity} value={activity}>
                                {activity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-2">
                          Vehicle type
                          <Info
                            className="h-4 w-4 text-muted-foreground cursor-help"
                            onMouseEnter={(e) => {
                              setHoveredInfo({
                                value: entry.vehicleType,
                                description: passengerTypeTooltipText(
                                  typeDescriptions,
                                  entry.activity,
                                  entry.vehicleType
                                ),
                                position: { x: e.clientX, y: e.clientY },
                              });
                            }}
                            onMouseLeave={() => setHoveredInfo(null)}
                          />
                        </Label>
                        <Select
                          value={entry.vehicleType || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "vehicleType", value)}
                          disabled={libraryLocked || !entry.activity}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {passengerTypesFor(entry.activity).map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Unit</Label>
                        <Select
                          value={entry.unit || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "unit", value)}
                          disabled={libraryLocked || !entry.vehicleType}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {passengerUnitsFor(entry.activity, entry.vehicleType).map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fuel type</Label>
                        <Select
                          value={entry.fuelType || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "fuelType", value)}
                          disabled={libraryLocked || !entry.unit}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {passengerFuelsFor(entry.activity, entry.vehicleType, entry.unit).map(
                              (fuel) => (
                                <SelectItem key={fuel} value={fuel}>
                                  {fuel}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {showDefraFuel && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Activity</Label>
                        <Select
                          value={entry.activity || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "activity", value)}
                          disabled={libraryLocked}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select activity" />
                          </SelectTrigger>
                          <SelectContent>
                            {defraActivities.map((activity) => (
                              <SelectItem key={activity} value={activity}>
                                {activity}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fuel</Label>
                        <Select
                          value={entry.fuelType || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "fuelType", value)}
                          disabled={libraryLocked || !entry.activity}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {defraFuelsFor(entry.activity).map((fuel) => (
                              <SelectItem key={fuel} value={fuel}>
                                {fuel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Unit</Label>
                        <Select
                          value={entry.unit || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "unit", value)}
                          disabled={libraryLocked || !entry.fuelType}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {defraUnitsFor(entry.activity, entry.fuelType).map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {showEpaFuel && (
                    <>
                      <div className="space-y-1.5">
                        <Label>Fuel type</Label>
                        <Select
                          value={entry.fuelType || undefined}
                          onValueChange={(value) => updateVehicleEntry(entry.id, "fuelType", value)}
                          disabled={libraryLocked}
                        >
                          <SelectTrigger className={FIELD_INPUT}>
                            <SelectValue placeholder="Select EPA fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {epaFuelTypes.map((fuel) => (
                              <SelectItem key={fuel} value={fuel}>
                                {fuel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Unit</Label>
                        <Input value={entry.unit || ""} readOnly className={`${FIELD_INPUT} bg-[#F8FAFC]`} />
                      </div>
                    </>
                  )}

                  {fuelPath ? (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2">
                        Actual fuel consumption ({entry.unit || "unit"})
                        <FieldTooltip content="Primary data on actual vehicle fuel (or electricity) consumption." />
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0"
                        value={entry.fuelConsumption || ""}
                        onChange={(e) =>
                          updateVehicleEntry(entry.id, "fuelConsumption", parseFloat(e.target.value) || 0)
                        }
                        className={FIELD_INPUT}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>
                        {distanceLabelFor(selectedFormula)} ({entry.unit || "km"})
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0"
                        value={entry.distance || ""}
                        onChange={(e) =>
                          updateVehicleEntry(entry.id, "distance", parseFloat(e.target.value) || 0)
                        }
                        className={FIELD_INPUT}
                      />
                    </div>
                  )}

                  {showEfficiency && (
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2">
                        Fuel efficiency (L/{entry.unit === "mile" ? "mile" : "km"})
                        <FieldTooltip
                          content={
                            averageEfficiencyPath
                              ? "Average-vehicle fuel efficiency (PCAF Option 3b)."
                              : typeEfficiencyPath
                                ? "Fuel efficiency from the selected vehicle type (PCAF Option 3a)."
                                : "Fuel used per distance unit. Example: 0.08 L/km ≈ 8 L/100 km."
                          }
                        />
                      </Label>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.08"
                        value={entry.efficiency || ""}
                        disabled={efficiencyLocked}
                        className={efficiencyLocked ? `${FIELD_INPUT} bg-muted` : FIELD_INPUT}
                        onChange={(e) =>
                          updateVehicleEntry(entry.id, "efficiency", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      Emission factor ({factorUnitLabel(entry)})
                      <FieldTooltip
                        content={
                          factorLibrary === "DEFRA"
                            ? "From DEFRA UK passenger or fuel tables (kg CO₂e ÷ 1000)."
                            : "From EPA Mobile Combustion (kg CO₂ per unit ÷ 1000)."
                        }
                      />
                    </Label>
                    <Input
                      type="number"
                      value={entry.factor || ""}
                      disabled
                      className={`${FIELD_INPUT} bg-muted`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2">
                      Value at origination (PKR)
                      <FieldTooltip content="Vehicle loan amount at origination for this vehicle." />
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0"
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
                </div>

                <div className="mt-4 rounded-lg border border-[#E8EEF0] bg-[#F8FAFC] p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[#334155]">Calculated emissions</span>
                    <span className="text-lg font-semibold text-[#0F172A]">
                      {entry.emissions.toFixed(6)} tCO₂e
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    {factorLibrary === "DEFRA" && defraUsesPassenger
                      ? `${entry.distance} × ${entry.factorKg.toFixed(6)} kg/${entry.unit || "km"} ÷ 1000`
                      : fuelPath
                        ? `${entry.fuelConsumption} × ${entry.factorKg.toFixed(6)} kg/${entry.unit || "unit"} ÷ 1000`
                        : `${entry.distance} × ${entry.efficiency} × ${entry.factorKg.toFixed(6)} kg ÷ 1000`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {vehicleEntries.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
          {fuelPath ? (
            <ComputedBox
              label="Total fuel"
              value={vehicleEntries.reduce((sum, entry) => sum + entry.fuelConsumption, 0).toFixed(2)}
              unit={vehicleEntries[0]?.unit || ""}
            />
          ) : (
            <ComputedBox
              label="Total distance"
              value={vehicleEntries.reduce((sum, entry) => sum + entry.distance, 0).toFixed(2)}
              unit={vehicleEntries[0]?.unit || "km"}
            />
          )}
          {showEfficiency && (
            <ComputedBox
              label="Avg efficiency"
              value={(
                vehicleEntries.reduce((sum, entry) => sum + entry.efficiency, 0) / vehicleEntries.length
              ).toFixed(4)}
              unit="L/km"
            />
          )}
          <ComputedBox
            label="Emissions"
            value={vehicleEntries.reduce((sum, entry) => sum + entry.emissions, 0).toFixed(4)}
            unit="tCO₂e"
          />
          <ComputedBox
            label="Value at origination"
            value={vehicleEntries
              .reduce((sum, entry) => sum + (entry.totalValueAtOrigination || 0), 0)
              .toLocaleString()}
            unit="PKR"
          />
          <ComputedBox label="Vehicles" value={String(vehicleEntries.length)} />
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

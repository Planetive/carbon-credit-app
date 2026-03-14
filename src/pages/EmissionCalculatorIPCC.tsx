import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Factory, Globe2, ArrowLeft, ChevronDown, ChevronRight, Flame, Plus, Trash2, Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const RESTRICTED_IPCC_EMAILS = ["asghar.hayat@marienergies.com.pk"];

type StationaryFuelRow = {
  id: string;
  fuelTypeDescription: string;
  subType: string;
  coEmissionFactor: number | null;
  unit: string;
};

type StationaryCalculatorRow = {
  id: string;
  fuelTypeDescription?: string;
  subType?: string;
  quantity?: number;
};

type FlaringUnit = "m3" | "MMSCF";
type FlaringGasComponent = {
  id: string;
  formula: string;
  percentage?: number;
};
type FlaringBreakdownItem = {
  formula: string;
  carbonAtoms: number;
  molarMass: number;
  moles: number;
  co2Moles: number;
  type: "combustion" | "existing_co2" | "non_carbon";
};
type FlaringCalculationResult = {
  CO2_tonnes: number;
  CO2_kg: number;
  total_moles: number;
  breakdown: FlaringBreakdownItem[];
};

type VentingGas = "N2" | "CO2" | "CH4" | "C2H6" | "C3H8" | "C4H10" | "C5H12" | "C6H14";
type VentingGasComponent = {
  id: string;
  gas: VentingGas;
  percentage?: number;
};
type VentingBreakdownItem = {
  gas: VentingGas;
  gwp: number;
  co2eMoles: number;
  co2eKg: number;
};

type VentingCalculationResult = {
  total_moles: number;
  breakdown: VentingBreakdownItem[];
  totalCO2e_kg: number;
  totalCO2e_tonnes: number;
};

type VentingSavedEntry = {
  id: string;
  month: string;
  volume: number;
  unit: FlaringUnit;
  composition: VentingGasComponent[];
  result: VentingCalculationResult;
  updatedAt: string;
};

type FlaringSavedEntry = {
  id: string;
  month: string;
  volume: number;
  unit: FlaringUnit;
  composition: FlaringGasComponent[];
  result: FlaringCalculationResult;
  updatedAt: string;
};

type EnergyIndustryFactorRow = {
  id: string;
  fuel: string;
  subType: string;
  efCo2: number | null;
  efCh4: number | null;
  efN2o: number | null;
};

type FactorKey = "CO2" | "CH4" | "NO2";

type EnergyCalculatorRow = {
  id: string;
  fuel?: string;
  subType?: string;
  selectedFactor: FactorKey;
  quantity?: number;
};

type RoadTransportFactorRow = {
  id: string;
  fuelType: string;
  emissionFactor: number | null;
  unit: string;
};

type RoadTransportCalculatorRow = {
  id: string;
  fuelType?: string;
  quantity?: number;
};

type RoadTransportVehicleFactorRow = {
  id: string;
  fuelType: string;
  ch4: number | null;
  no2: number | null;
  unit: string;
};

type RoadTransportVehicleCalculatorRow = {
  id: string;
  fuelType?: string;
  selectedFactor: "CH4" | "NO2";
  quantity?: number;
};

type UsaGasDieselFactorKey =
  | "NO2 Running (hot)"
  | "NO2 Cold Start"
  | "CH4 Running (hot)"
  | "CH4 Cold Start";

type UsaGasDieselFactorRow = {
  id: string;
  vehicleType: string;
  emissionControlTechnology: string;
  no2RunningHot: number | null;
  no2ColdStart: number | null;
  ch4RunningHot: number | null;
  ch4ColdStart: number | null;
  unitNo2RunningHot: string;
  unitNo2ColdStart: string;
  unitCh4RunningHot: string;
  unitCh4ColdStart: string;
};

type UsaGasDieselCalculatorRow = {
  id: string;
  vehicleType?: string;
  emissionControlTechnology?: string;
  selectedFactor: UsaGasDieselFactorKey;
  quantity?: number;
};

type AlternativeFuelFactorRow = {
  id: string;
  vehicleType: string;
  fuel: string;
  no2Factor: number | null;
  ch4Factor: number | null;
  unit: string;
};

type AlternativeFuelCalculatorRow = {
  id: string;
  vehicleType?: string;
  fuel?: string;
  selectedFactor: "NO2" | "CH4";
  quantity?: number;
};

const pickFirst = (row: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return undefined;
};

const newCalculatorRow = (): StationaryCalculatorRow => ({
  id: crypto.randomUUID(),
  fuelTypeDescription: undefined,
  subType: undefined,
  quantity: undefined,
});

const newEnergyCalculatorRow = (): EnergyCalculatorRow => ({
  id: crypto.randomUUID(),
  fuel: undefined,
  subType: undefined,
  selectedFactor: "CH4",
  quantity: undefined,
});

const newRoadTransportCalculatorRow = (): RoadTransportCalculatorRow => ({
  id: crypto.randomUUID(),
  fuelType: undefined,
  quantity: undefined,
});

const newRoadTransportVehicleCalculatorRow = (): RoadTransportVehicleCalculatorRow => ({
  id: crypto.randomUUID(),
  fuelType: undefined,
  selectedFactor: "CH4",
  quantity: undefined,
});

const newUsaGasDieselCalculatorRow = (): UsaGasDieselCalculatorRow => ({
  id: crypto.randomUUID(),
  vehicleType: undefined,
  emissionControlTechnology: undefined,
  selectedFactor: "NO2 Running (hot)",
  quantity: undefined,
});

const newAlternativeFuelCalculatorRow = (): AlternativeFuelCalculatorRow => ({
  id: crypto.randomUUID(),
  vehicleType: undefined,
  fuel: undefined,
  selectedFactor: "NO2",
  quantity: undefined,
});

const newFlaringGasComponent = (): FlaringGasComponent => ({
  id: crypto.randomUUID(),
  formula: "CH4",
  percentage: undefined,
});

const newVentingGasComponent = (): VentingGasComponent => ({
  id: crypto.randomUUID(),
  gas: "CH4",
  percentage: undefined,
});

const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

const CHAP2_INDUSTRIES = [
  "ENERGY INDUSTRIES",
  "MANUFACTURING INDUSTRIES AND CONSTRUCTION",
  "Commercial/Institutional",
  "Residential and Agriculture/Forestry/Fishing/Fishing Farms",
  "Utility Source",
  "Industrial Source",
  "Kilns, Ovens, and Dryers",
] as const;

const M3_PER_MMSCF = 28316.846592;
const MOLES_PER_M3 = 44.615;

const VENTING_GWP: Record<VentingGas, number> = {
  N2: 0,
  CO2: 1,
  CH4: 28,
  C2H6: 5.5,
  C3H8: 3,
  C4H10: 4,
  C5H12: 4,
  C6H14: 4,
};

const VENTING_GAS_OPTIONS = ["N2", "CO2", "CH4", "C2H6", "C3H8", "C4H10", "C5H12", "C6H14"] as const;
const VENTING_GAS_LABELS: Record<VentingGas, string> = {
  N2: "Nitrogen (N2)",
  CO2: "Carbon Dioxide (CO2)",
  CH4: "Methane (CH4)",
  C2H6: "Ethane (C2H6)",
  C3H8: "Propane (C3H8)",
  C4H10: "Butane (C4H10)",
  C5H12: "Pentane (C5H12)",
  C6H14: "Hexane (C6H14)",
};

const FLARING_GAS_PRESETS = [
  "CH4",
  "C2H6",
  "C3H8",
  "C4H10",
  "C5H12",
  "C6H14",
  "CO2",
  "N2",
  "H2",
  "H2S",
  "CO",
  "O2",
] as const;

// Atomic molar masses (g/mol) used to validate formulas and compute molar mass.
const ATOMIC_MOLAR_MASS: Record<string, number> = {
  H: 1.008,
  He: 4.0026,
  Li: 6.94,
  Be: 9.0122,
  B: 10.81,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  Ne: 20.18,
  Na: 22.99,
  Mg: 24.305,
  Al: 26.982,
  Si: 28.085,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  Ar: 39.948,
  K: 39.098,
  Ca: 40.078,
  Sc: 44.956,
  Ti: 47.867,
  V: 50.942,
  Cr: 51.996,
  Mn: 54.938,
  Fe: 55.845,
  Co: 58.933,
  Ni: 58.693,
  Cu: 63.546,
  Zn: 65.38,
  Ga: 69.723,
  Ge: 72.63,
  As: 74.922,
  Se: 78.971,
  Br: 79.904,
  Kr: 83.798,
  Rb: 85.468,
  Sr: 87.62,
  Y: 88.906,
  Zr: 91.224,
  Nb: 92.906,
  Mo: 95.95,
  Tc: 98,
  Ru: 101.07,
  Rh: 102.91,
  Pd: 106.42,
  Ag: 107.87,
  Cd: 112.41,
  In: 114.82,
  Sn: 118.71,
  Sb: 121.76,
  Te: 127.6,
  I: 126.9,
  Xe: 131.29,
  Cs: 132.91,
  Ba: 137.33,
  La: 138.91,
  Ce: 140.12,
  Pr: 140.91,
  Nd: 144.24,
  Pm: 145,
  Sm: 150.36,
  Eu: 151.96,
  Gd: 157.25,
  Tb: 158.93,
  Dy: 162.5,
  Ho: 164.93,
  Er: 167.26,
  Tm: 168.93,
  Yb: 173.05,
  Lu: 174.97,
  Hf: 178.49,
  Ta: 180.95,
  W: 183.84,
  Re: 186.21,
  Os: 190.23,
  Ir: 192.22,
  Pt: 195.08,
  Au: 196.97,
  Hg: 200.59,
  Tl: 204.38,
  Pb: 207.2,
  Bi: 208.98,
  Po: 209,
  At: 210,
  Rn: 222,
  Fr: 223,
  Ra: 226,
  Ac: 227,
  Th: 232.04,
  Pa: 231.04,
  U: 238.03,
  Np: 237,
  Pu: 244,
  Am: 243,
  Cm: 247,
  Bk: 247,
  Cf: 251,
  Es: 252,
  Fm: 257,
  Md: 258,
  No: 259,
  Lr: 266,
  Rf: 267,
  Db: 268,
  Sg: 269,
  Bh: 270,
  Hs: 277,
  Mt: 278,
  Ds: 281,
  Rg: 282,
  Cn: 285,
  Nh: 286,
  Fl: 289,
  Mc: 290,
  Lv: 293,
  Ts: 294,
  Og: 294,
};

const parseChemicalFormula = (formulaRaw: string) => {
  const formula = formulaRaw.replace(/\s+/g, "");
  if (!formula) return null;
  const pattern = /([A-Za-z][a-z]?)(\d*)/g;
  const elements: Record<string, number> = {};
  let consumed = 0;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(formula)) !== null) {
    if (match.index !== consumed) return null;
    consumed = pattern.lastIndex;
    const element = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    const count = match[2] ? Number.parseInt(match[2], 10) : 1;
    if (!Number.isFinite(count) || count <= 0) return null;
    if (!(element in ATOMIC_MOLAR_MASS)) return null;
    elements[element] = (elements[element] || 0) + count;
  }
  if (consumed !== formula.length) return null;

  const carbonAtoms = elements.C || 0;
  const molarMass = Object.entries(elements).reduce(
    (sum, [element, count]) => sum + ATOMIC_MOLAR_MASS[element] * count,
    0
  );
  const isExistingCo2 =
    carbonAtoms === 1 &&
    (elements.O || 0) === 2 &&
    Object.keys(elements).every((key) => key === "C" || key === "O");

  return {
    elements,
    carbonAtoms,
    molarMass,
    isExistingCo2,
    normalized: formula,
  };
};

const calculateFlaringEmissions = (
  volume: number,
  unit: FlaringUnit,
  composition: Array<{ formula: string; percentage: number }>
): FlaringCalculationResult => {
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error("Flare gas volume must be greater than 0.");
  }

  const compositionValues = composition.map((item) => item.percentage);
  if (compositionValues.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("All gas composition values must be valid numbers >= 0.");
  }

  const percentageTotal = compositionValues.reduce((sum, value) => sum + value, 0);
  if (Math.abs(percentageTotal - 100) > 0.001) {
    throw new Error(`Gas composition must sum to 100%. Current total: ${percentageTotal.toFixed(2)}%.`);
  }

  const volumeM3 = unit === "MMSCF" ? volume * M3_PER_MMSCF : volume;
  const total_moles = volumeM3 * MOLES_PER_M3;

  const breakdown: FlaringBreakdownItem[] = [];
  let totalCo2Moles = 0;

  for (const item of composition) {
    const formula = item.formula.trim();
    if (!formula) throw new Error("Each gas row must include a chemical formula.");
    const moles = total_moles * (item.percentage / 100);
    const parsed = parseChemicalFormula(formula);
    if (!parsed) throw new Error(`Invalid chemical formula: ${formula}`);
    const carbonAtoms = parsed.carbonAtoms;

    if (parsed.isExistingCo2) {
      totalCo2Moles += moles;
      breakdown.push({
        formula: parsed.normalized,
        carbonAtoms,
        molarMass: parsed.molarMass,
        moles,
        co2Moles: moles,
        type: "existing_co2",
      });
      continue;
    }

    if (carbonAtoms > 0) {
      const co2Moles = moles * carbonAtoms;
      totalCo2Moles += co2Moles;
      breakdown.push({
        formula: parsed.normalized,
        carbonAtoms,
        molarMass: parsed.molarMass,
        moles,
        co2Moles,
        type: "combustion",
      });
      continue;
    }

    breakdown.push({
      formula: parsed.normalized,
      carbonAtoms: 0,
      molarMass: parsed.molarMass,
      moles,
      co2Moles: 0,
      type: "non_carbon",
    });
  }

  const CO2_kg = (totalCo2Moles * 44) / 1000;
  const CO2_tonnes = CO2_kg / 1000;

  return {
    CO2_tonnes,
    CO2_kg,
    total_moles,
    breakdown,
  };
};

const calculateVentingEmissions = (
  volume: number,
  unit: FlaringUnit,
  composition: Array<{ gas: VentingGas; percentage: number }>
): VentingCalculationResult => {
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error("Vent gas volume must be greater than 0.");
  }

  if (!Array.isArray(composition) || composition.length === 0) {
    throw new Error("Please add at least one vent gas component.");
  }

  const compositionValues = composition.map((item) => item.percentage);
  if (compositionValues.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("All vent gas composition values must be valid numbers >= 0.");
  }

  const percentageTotal = compositionValues.reduce((sum, value) => sum + value, 0);
  if (Math.abs(percentageTotal - 100) > 0.001) {
    throw new Error(`Gas composition must sum to 100%. Current total: ${percentageTotal.toFixed(2)}%.`);
  }

  const volumeM3 = unit === "MMSCF" ? volume * M3_PER_MMSCF : volume;
  const total_moles = volumeM3 * MOLES_PER_M3;

  const percentageByGas = composition.reduce<Record<VentingGas, number>>(
    (acc, item) => {
      if (!item.gas || !(item.gas in VENTING_GWP)) {
        throw new Error("Each vent gas row must include a valid gas.");
      }
      acc[item.gas] += item.percentage;
      return acc;
    },
      { N2: 0, CO2: 0, CH4: 0, C2H6: 0, C3H8: 0, C4H10: 0, C5H12: 0, C6H14: 0 }
  );

  const breakdown: VentingBreakdownItem[] = VENTING_GAS_OPTIONS.filter(
    (gas) => percentageByGas[gas] > 0
  ).map((gas) => {
    const gasMoles = total_moles * (percentageByGas[gas] / 100);
    const co2eMoles = gasMoles * VENTING_GWP[gas];
    return {
      gas,
      gwp: VENTING_GWP[gas],
      co2eMoles,
      co2eKg: (co2eMoles * 44) / 1000,
    };
  });

  const totalCO2eMoles = breakdown.reduce((sum, item) => sum + item.co2eMoles, 0);
  const totalCO2e_kg = (totalCO2eMoles * 44) / 1000;
  const totalCO2e_tonnes = totalCO2e_kg / 1000;

  return {
    total_moles,
    breakdown,
    totalCO2e_kg,
    totalCO2e_tonnes,
  };
};

const EmissionCalculatorIPCC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeScope, setActiveScope] = useState("scope1");
  const [activeCategory, setActiveCategory] = useState("stationaryFuelCombustion");
  const [expandedScopes, setExpandedScopes] = useState<Record<string, boolean>>({ scope1: true });
  const [loadingStationary, setLoadingStationary] = useState(false);
  const [stationaryRows, setStationaryRows] = useState<StationaryFuelRow[]>([]);
  const [stationaryError, setStationaryError] = useState<string | null>(null);
  const [calculatorRows, setCalculatorRows] = useState<StationaryCalculatorRow[]>([newCalculatorRow()]);
  const [flaringVolume, setFlaringVolume] = useState<number | undefined>(undefined);
  const [flaringUnit, setFlaringUnit] = useState<FlaringUnit>("m3");
  const [flaringComponents, setFlaringComponents] = useState<FlaringGasComponent[]>([
    newFlaringGasComponent(),
  ]);
  const [flaringCalculated, setFlaringCalculated] = useState<FlaringCalculationResult | null>(null);
  const [flaringCalculationError, setFlaringCalculationError] = useState<string | null>(null);
  const [flaringMonth, setFlaringMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [flaringSaving, setFlaringSaving] = useState(false);
  const [flaringHistoryLoading, setFlaringHistoryLoading] = useState(false);
  const [flaringHistory, setFlaringHistory] = useState<FlaringSavedEntry[]>([]);
  const [ventingVolume, setVentingVolume] = useState<number | undefined>(undefined);
  const [ventingUnit, setVentingUnit] = useState<FlaringUnit>("m3");
  const [ventingComponents, setVentingComponents] = useState<VentingGasComponent[]>([
    newVentingGasComponent(),
  ]);
  const [ventingCalculated, setVentingCalculated] = useState<VentingCalculationResult | null>(null);
  const [ventingCalculationError, setVentingCalculationError] = useState<string | null>(null);
  const [ventingMonth, setVentingMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [ventingSaving, setVentingSaving] = useState(false);
  const [ventingHistoryLoading, setVentingHistoryLoading] = useState(false);
  const [ventingHistory, setVentingHistory] = useState<VentingSavedEntry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string>(CHAP2_INDUSTRIES[0]);
  const [loadingEnergyIndustry, setLoadingEnergyIndustry] = useState(false);
  const [energyIndustryRows, setEnergyIndustryRows] = useState<EnergyIndustryFactorRow[]>([]);
  const [energyIndustryError, setEnergyIndustryError] = useState<string | null>(null);
  const [energyCalculatorRows, setEnergyCalculatorRows] = useState<EnergyCalculatorRow[]>([
    newEnergyCalculatorRow(),
  ]);
  const [loadingRoadTransport, setLoadingRoadTransport] = useState(false);
  const [roadTransportRows, setRoadTransportRows] = useState<RoadTransportFactorRow[]>([]);
  const [roadTransportError, setRoadTransportError] = useState<string | null>(null);
  const [roadTransportCalculatorRows, setRoadTransportCalculatorRows] = useState<
    RoadTransportCalculatorRow[]
  >([newRoadTransportCalculatorRow()]);
  const [loadingRoadTransportVehicle, setLoadingRoadTransportVehicle] = useState(false);
  const [roadTransportVehicleRows, setRoadTransportVehicleRows] = useState<RoadTransportVehicleFactorRow[]>([]);
  const [roadTransportVehicleError, setRoadTransportVehicleError] = useState<string | null>(null);
  const [roadTransportVehicleCalculatorRows, setRoadTransportVehicleCalculatorRows] = useState<
    RoadTransportVehicleCalculatorRow[]
  >([newRoadTransportVehicleCalculatorRow()]);
  const [loadingUsaGasDiesel, setLoadingUsaGasDiesel] = useState(false);
  const [usaGasDieselRows, setUsaGasDieselRows] = useState<UsaGasDieselFactorRow[]>([]);
  const [usaGasDieselError, setUsaGasDieselError] = useState<string | null>(null);
  const [usaGasDieselCalculatorRows, setUsaGasDieselCalculatorRows] = useState<UsaGasDieselCalculatorRow[]>([
    newUsaGasDieselCalculatorRow(),
  ]);
  const [loadingAlternativeFuel, setLoadingAlternativeFuel] = useState(false);
  const [alternativeFuelRows, setAlternativeFuelRows] = useState<AlternativeFuelFactorRow[]>([]);
  const [alternativeFuelError, setAlternativeFuelError] = useState<string | null>(null);
  const [alternativeFuelCalculatorRows, setAlternativeFuelCalculatorRows] = useState<
    AlternativeFuelCalculatorRow[]
  >([newAlternativeFuelCalculatorRow()]);

  const email = user?.email?.toLowerCase() || "";
  const isRestrictedUser = RESTRICTED_IPCC_EMAILS.includes(email);

  const from = searchParams.get("from");
  const mode = searchParams.get("mode");
  const counterpartyId = searchParams.get("counterpartyId");
  const query = [from, mode, counterpartyId].filter(Boolean).length
    ? `?${searchParams.toString()}`
    : "";

  const sidebarItems = useMemo(
    () => [
      {
        id: "scope1",
        title: "Chapter 1 (Scope 1)",
        categories: [
          {
            id: "stationaryFuelCombustion",
            title: "Stationary Fuel Combustion",
            description: "IPCC Chapter 1 stationary fuel emission factors.",
            icon: Flame,
          },
          {
            id: "flaring",
            title: "Flaring",
            description: "Scope 1 flaring based on gas composition and stoichiometry.",
            icon: Flame,
          },
          {
            id: "venting",
            title: "Venting",
            description: "Scope 1 venting based on gas composition and GWP conversion.",
            icon: Flame,
          },
        ],
      },
      {
        id: "chap2",
        title: "Chap 2",
        categories: [
          {
            id: "energyIndustries",
            title: "Energy Industries",
            description: "IPCC Chapter 2 factors for energy industries.",
            icon: Factory,
          },
        ],
      },
      {
        id: "chap3",
        title: "Chap 3",
        categories: [
          {
            id: "roadTransport",
            title: "Road Transport",
            description: "IPCC Chapter 3 category factors.",
            icon: Truck,
          },
          {
            id: "roadTransportVehicleType",
            title: "Road Transport with Vehicle Type",
            description: "IPCC Chapter 3 factors by fuel and vehicle type.",
            icon: Truck,
          },
          {
            id: "usaGasolineDieselVehicles",
            title: "USA Gasoline and Diesel Vehicles",
            description: "IPCC Chapter 3 USA gasoline and diesel vehicle factors.",
            icon: Truck,
          },
          {
            id: "alternativeFuelVehicles",
            title: "Alternative Fuel Vehicles",
            description: "IPCC Chapter 3 alternative fuel vehicle factors.",
            icon: Truck,
          },
        ],
      },
    ],
    []
  );

  const availableFuelTypes = useMemo(
    () =>
      Array.from(
        new Set(stationaryRows.map((r) => r.fuelTypeDescription).filter((v) => v && v.trim() !== ""))
      ).sort((a, b) => a.localeCompare(b)),
    [stationaryRows]
  );

  const getSubTypesForFuel = (fuelTypeDescription?: string) => {
    if (!fuelTypeDescription) return [];
    return Array.from(
      new Set(
        stationaryRows
          .filter((r) => r.fuelTypeDescription === fuelTypeDescription)
          .map((r) => r.subType)
          .filter((v) => v && v.trim() !== "")
      )
    ).sort((a, b) => a.localeCompare(b));
  };

  const fuelRequiresSubType = (fuelTypeDescription?: string) => {
    return getSubTypesForFuel(fuelTypeDescription).length > 0;
  };

  const getFactorRow = (fuelTypeDescription?: string, subType?: string) => {
    if (!fuelTypeDescription) return undefined;
    const matchingFuelRows = stationaryRows.filter(
      (r) => r.fuelTypeDescription === fuelTypeDescription
    );
    if (matchingFuelRows.length === 0) return undefined;

    const nonEmptySubTypeRows = matchingFuelRows.filter((r) => r.subType && r.subType.trim() !== "");
    if (nonEmptySubTypeRows.length === 0) {
      return matchingFuelRows[0];
    }

    if (!subType) return undefined;
    return nonEmptySubTypeRows.find((r) => r.subType === subType);
  };

  const addCalculatorRow = () => {
    setCalculatorRows((prev) => [...prev, newCalculatorRow()]);
  };

  const removeCalculatorRow = (id: string) => {
    setCalculatorRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateCalculatorRow = (id: string, patch: Partial<StationaryCalculatorRow>) => {
    setCalculatorRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, ...patch };
      })
    );
  };

  const totalStationaryEmissions = useMemo(() => {
    return calculatorRows.reduce((sum, row) => {
      const factorRow = getFactorRow(row.fuelTypeDescription, row.subType);
      const factor = factorRow?.coEmissionFactor;
      if (typeof row.quantity === "number" && typeof factor === "number") {
        return sum + row.quantity * factor;
      }
      return sum;
    }, 0);
  }, [calculatorRows, stationaryRows]);

  const flaringPercentageTotal = useMemo(
    () =>
      flaringComponents.reduce(
        (sum, component) => sum + (typeof component.percentage === "number" ? component.percentage : 0),
        0
      ),
    [flaringComponents]
  );

  const addFlaringComponent = () => {
    setFlaringComponents((prev) => [...prev, newFlaringGasComponent()]);
  };

  const removeFlaringComponent = (id: string) => {
    setFlaringComponents((prev) => (prev.length > 1 ? prev.filter((component) => component.id !== id) : prev));
  };

  const updateFlaringComponent = (id: string, patch: Partial<FlaringGasComponent>) => {
    setFlaringComponents((prev) =>
      prev.map((component) => {
        if (component.id !== id) return component;
        return { ...component, ...patch };
      })
    );
  };

  const normalizeFlaringComponents = (value: any): FlaringGasComponent[] => {
    if (!Array.isArray(value) || value.length === 0) return [newFlaringGasComponent()];
    const mapped = value
      .map((item: any) => ({
        id: crypto.randomUUID(),
        formula: String(item?.formula || "").trim(),
        percentage:
          item?.percentage === null || item?.percentage === undefined || item?.percentage === ""
            ? undefined
            : Number(item.percentage),
      }))
      .filter((item: any) => item.formula);
    return mapped.length > 0 ? mapped : [newFlaringGasComponent()];
  };

  const loadFlaringHistory = async () => {
    if (!user) return;
    setFlaringHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("ipcc_scope1_flaring_entries" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("month_start", { ascending: false });
      if (error) throw error;

      const mapped: FlaringSavedEntry[] = (data || []).map((row: any) => ({
        id: String(row.id),
        month: String(row.month_start || "").slice(0, 7),
        volume: Number(row.flare_volume || 0),
        unit: row.volume_unit === "MMSCF" ? "MMSCF" : "m3",
        composition: normalizeFlaringComponents(row.composition),
        result: row.result as FlaringCalculationResult,
        updatedAt: String(row.updated_at || row.created_at || ""),
      }));
      setFlaringHistory(mapped);
    } catch (error: any) {
      console.error("Failed loading flaring history:", error);
    } finally {
      setFlaringHistoryLoading(false);
    }
  };

  const handleSaveFlaringMonth = async () => {
    setFlaringCalculationError(null);
    if (!user) {
      setFlaringCalculationError("Please log in to save monthly flaring entries.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(flaringMonth)) {
      setFlaringCalculationError("Please select a valid month.");
      return;
    }
    if (typeof flaringVolume !== "number" || flaringVolume <= 0) {
      setFlaringCalculationError("Flare gas volume must be greater than 0.");
      return;
    }

    const compositionForCalculation = flaringComponents.map((component) => ({
      formula: component.formula.trim(),
      percentage: typeof component.percentage === "number" ? component.percentage : 0,
    }));

    let resultToSave: FlaringCalculationResult;
    try {
      resultToSave = calculateFlaringEmissions(flaringVolume, flaringUnit, compositionForCalculation);
      setFlaringCalculated(resultToSave);
    } catch (error: any) {
      setFlaringCalculationError(error?.message || "Failed to calculate flaring emissions.");
      return;
    }

    setFlaringSaving(true);
    try {
      const payload = {
        user_id: user.id,
        month_start: `${flaringMonth}-01`,
        flare_volume: flaringVolume,
        volume_unit: flaringUnit,
        composition: compositionForCalculation,
        result: resultToSave,
      };

      const { error } = await (supabase as any)
        .from("ipcc_scope1_flaring_entries")
        .upsert(payload, { onConflict: "user_id,month_start" });
      if (error) throw error;

      await loadFlaringHistory();
    } catch (error: any) {
      setFlaringCalculationError(error?.message || "Failed to save monthly flaring entry.");
    } finally {
      setFlaringSaving(false);
    }
  };

  const handleLoadFlaringEntry = (entry: FlaringSavedEntry) => {
    setFlaringMonth(entry.month);
    setFlaringVolume(entry.volume);
    setFlaringUnit(entry.unit);
    setFlaringComponents(normalizeFlaringComponents(entry.composition));
    setFlaringCalculationError(null);
  };

  const ventingPercentageTotal = useMemo(
    () =>
      ventingComponents.reduce(
        (sum, component) => sum + (typeof component.percentage === "number" ? component.percentage : 0),
        0
      ),
    [ventingComponents]
  );

  const addVentingComponent = () => {
    setVentingComponents((prev) => [...prev, newVentingGasComponent()]);
  };

  const removeVentingComponent = (id: string) => {
    setVentingComponents((prev) => (prev.length > 1 ? prev.filter((component) => component.id !== id) : prev));
  };

  const updateVentingComponent = (id: string, patch: Partial<VentingGasComponent>) => {
    setVentingComponents((prev) =>
      prev.map((component) => {
        if (component.id !== id) return component;
        return { ...component, ...patch };
      })
    );
  };

  const normalizeVentingComposition = (value: any): VentingGasComponent[] => {
    if (Array.isArray(value)) {
      const mapped = value
        .map((item: any) => ({
          id: crypto.randomUUID(),
          gas: String(item?.gas || "").trim().toUpperCase(),
          percentage:
            item?.percentage === null || item?.percentage === undefined || item?.percentage === ""
              ? undefined
              : Number(item.percentage),
        }))
        .filter((item: any) => VENTING_GAS_OPTIONS.includes(item.gas as VentingGas));
      return mapped.length > 0
        ? mapped.map((item) => ({ ...item, gas: item.gas as VentingGas }))
        : [newVentingGasComponent()];
    }

    if (value && typeof value === "object") {
      const mappedFromObject = VENTING_GAS_OPTIONS.map((gas) => ({
        id: crypto.randomUUID(),
        gas,
        percentage: Number(value[gas] || 0),
      })).filter((item) => (item.percentage || 0) > 0);
      return mappedFromObject.length > 0 ? mappedFromObject : [newVentingGasComponent()];
    }

    return [newVentingGasComponent()];
  };

  const loadVentingHistory = async () => {
    if (!user) return;
    setVentingHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("ipcc_scope1_venting_entries" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("month_start", { ascending: false });
      if (error) throw error;

      const mapped: VentingSavedEntry[] = (data || []).map((row: any) => ({
        id: String(row.id),
        month: String(row.month_start || "").slice(0, 7),
        volume: Number(row.vent_volume || 0),
        unit: row.volume_unit === "MMSCF" ? "MMSCF" : "m3",
        composition: normalizeVentingComposition(row.composition),
        result: row.result as VentingCalculationResult,
        updatedAt: String(row.updated_at || row.created_at || ""),
      }));
      setVentingHistory(mapped);
    } catch (error: any) {
      console.error("Failed loading venting history:", error);
    } finally {
      setVentingHistoryLoading(false);
    }
  };

  const handleSaveVentingMonth = async () => {
    setVentingCalculationError(null);
    if (!user) {
      setVentingCalculationError("Please log in to save monthly venting entries.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(ventingMonth)) {
      setVentingCalculationError("Please select a valid month.");
      return;
    }
    if (typeof ventingVolume !== "number" || ventingVolume <= 0) {
      setVentingCalculationError("Vent gas volume must be greater than 0.");
      return;
    }

    let resultToSave: VentingCalculationResult;
    try {
      const compositionForCalculation = ventingComponents.map((component) => ({
        gas: component.gas,
        percentage: typeof component.percentage === "number" ? component.percentage : 0,
      }));
      resultToSave = calculateVentingEmissions(ventingVolume, ventingUnit, compositionForCalculation);
      setVentingCalculated(resultToSave);
    } catch (error: any) {
      setVentingCalculationError(error?.message || "Failed to calculate venting emissions.");
      return;
    }

    setVentingSaving(true);
    try {
      const payload = {
        user_id: user.id,
        month_start: `${ventingMonth}-01`,
        vent_volume: ventingVolume,
        volume_unit: ventingUnit,
        composition: ventingComponents.map((component) => ({
          gas: component.gas,
          percentage: typeof component.percentage === "number" ? component.percentage : 0,
        })),
        result: resultToSave,
      };
      const { error } = await (supabase as any)
        .from("ipcc_scope1_venting_entries")
        .upsert(payload, { onConflict: "user_id,month_start" });
      if (error) throw error;

      await loadVentingHistory();
    } catch (error: any) {
      setVentingCalculationError(error?.message || "Failed to save monthly venting entry.");
    } finally {
      setVentingSaving(false);
    }
  };

  const handleLoadVentingEntry = (entry: VentingSavedEntry) => {
    setVentingMonth(entry.month);
    setVentingVolume(entry.volume);
    setVentingUnit(entry.unit);
    setVentingComponents(normalizeVentingComposition(entry.composition));
    setVentingCalculationError(null);
  };

  const availableEnergyFuels = useMemo(
    () =>
      Array.from(
        new Set(energyIndustryRows.map((r) => r.fuel).filter((v) => v && v.trim() !== ""))
      ).sort((a, b) => a.localeCompare(b)),
    [energyIndustryRows]
  );

  const getEnergySubTypesForFuel = (fuel?: string) => {
    if (!fuel) return [];
    return Array.from(
      new Set(
        energyIndustryRows
          .filter((r) => r.fuel === fuel)
          .map((r) => r.subType)
          .filter((v) => v && v.trim() !== "")
      )
    ).sort((a, b) => a.localeCompare(b));
  };

  const energyFuelRequiresSubType = (fuel?: string) => getEnergySubTypesForFuel(fuel).length > 0;

  const getEnergyFactorRow = (fuel?: string, subType?: string) => {
    if (!fuel) return undefined;
    const matchingFuelRows = energyIndustryRows.filter((r) => r.fuel === fuel);
    if (matchingFuelRows.length === 0) return undefined;

    const nonEmptySubTypeRows = matchingFuelRows.filter((r) => r.subType && r.subType.trim() !== "");
    if (nonEmptySubTypeRows.length === 0) return matchingFuelRows[0];
    if (!subType) return undefined;
    return nonEmptySubTypeRows.find((r) => r.subType === subType);
  };

  const addEnergyCalculatorRow = () => {
    setEnergyCalculatorRows((prev) => [...prev, newEnergyCalculatorRow()]);
  };

  const removeEnergyCalculatorRow = (id: string) => {
    setEnergyCalculatorRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateEnergyCalculatorRow = (id: string, patch: Partial<EnergyCalculatorRow>) => {
    setEnergyCalculatorRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, ...patch };
      })
    );
  };

  const getSelectedFactorValue = (factorRow: EnergyIndustryFactorRow | undefined, selectedFactor: FactorKey) => {
    if (!factorRow) return null;
    if (selectedFactor === "CO2") return factorRow.efCo2;
    if (selectedFactor === "CH4") return factorRow.efCh4;
    return factorRow.efN2o;
  };

  const getAvailableFactorOptions = (factorRow: EnergyIndustryFactorRow | undefined): FactorKey[] => {
    if (!factorRow) return ["CH4", "NO2", "CO2"];
    const options: FactorKey[] = [];
    if (typeof factorRow.efCo2 === "number") options.push("CO2");
    if (typeof factorRow.efCh4 === "number") options.push("CH4");
    if (typeof factorRow.efN2o === "number") options.push("NO2");
    return options.length > 0 ? options : ["CH4", "NO2", "CO2"];
  };

  const getDefaultFactorForSelection = (fuel?: string, subType?: string): FactorKey => {
    const factorRow = getEnergyFactorRow(fuel, subType);
    const options = getAvailableFactorOptions(factorRow);
    return options[0];
  };

  const totalEnergyIndustryEmissions = useMemo(() => {
    return energyCalculatorRows.reduce((sum, row) => {
      const factors = getEnergyFactorRow(row.fuel, row.subType);
      const selectedFactor = getSelectedFactorValue(factors, row.selectedFactor);
      if (typeof row.quantity !== "number" || typeof selectedFactor !== "number") return sum;
      return sum + row.quantity * selectedFactor;
    }, 0);
  }, [energyCalculatorRows, energyIndustryRows]);

  const availableRoadFuelTypes = useMemo(
    () =>
      Array.from(
        new Set(roadTransportRows.map((r) => r.fuelType).filter((v) => v && v.trim() !== ""))
      ).sort((a, b) => a.localeCompare(b)),
    [roadTransportRows]
  );

  const getRoadFactorRow = (fuelType?: string) => {
    if (!fuelType) return undefined;
    return roadTransportRows.find((r) => r.fuelType === fuelType);
  };

  const addRoadTransportCalculatorRow = () => {
    setRoadTransportCalculatorRows((prev) => [...prev, newRoadTransportCalculatorRow()]);
  };

  const removeRoadTransportCalculatorRow = (id: string) => {
    setRoadTransportCalculatorRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateRoadTransportCalculatorRow = (id: string, patch: Partial<RoadTransportCalculatorRow>) => {
    setRoadTransportCalculatorRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, ...patch };
      })
    );
  };

  const totalRoadTransportEmissions = useMemo(() => {
    return roadTransportCalculatorRows.reduce((sum, row) => {
      const factorRow = getRoadFactorRow(row.fuelType);
      if (typeof row.quantity !== "number" || typeof factorRow?.emissionFactor !== "number") return sum;
      return sum + row.quantity * factorRow.emissionFactor;
    }, 0);
  }, [roadTransportCalculatorRows, roadTransportRows]);

  const availableRoadVehicleFuelTypes = useMemo(
    () =>
      Array.from(
        new Set(roadTransportVehicleRows.map((r) => r.fuelType).filter((v) => v && v.trim() !== ""))
      ).sort((a, b) => a.localeCompare(b)),
    [roadTransportVehicleRows]
  );

  const getRoadVehicleFactorRow = (fuelType?: string) => {
    if (!fuelType) return undefined;
    return roadTransportVehicleRows.find((r) => r.fuelType === fuelType);
  };

  const addRoadTransportVehicleCalculatorRow = () => {
    setRoadTransportVehicleCalculatorRows((prev) => [...prev, newRoadTransportVehicleCalculatorRow()]);
  };

  const removeRoadTransportVehicleCalculatorRow = (id: string) => {
    setRoadTransportVehicleCalculatorRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev
    );
  };

  const updateRoadTransportVehicleCalculatorRow = (
    id: string,
    patch: Partial<RoadTransportVehicleCalculatorRow>
  ) => {
    setRoadTransportVehicleCalculatorRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, ...patch };
      })
    );
  };

  const totalRoadTransportVehicleEmissions = useMemo(() => {
    return roadTransportVehicleCalculatorRows.reduce((sum, row) => {
      const factorRow = getRoadVehicleFactorRow(row.fuelType);
      if (!factorRow || typeof row.quantity !== "number") return sum;
      const factor = row.selectedFactor === "CH4" ? factorRow.ch4 : factorRow.no2;
      if (typeof factor !== "number") return sum;
      return sum + row.quantity * factor;
    }, 0);
  }, [roadTransportVehicleCalculatorRows, roadTransportVehicleRows]);

  const availableUsaVehicleTypes = useMemo(
    () =>
      Array.from(
        new Set(usaGasDieselRows.map((r) => r.vehicleType).filter((v) => v && v.trim() !== ""))
      ).sort((a, b) => a.localeCompare(b)),
    [usaGasDieselRows]
  );

  const getEmissionControlsForVehicleType = (vehicleType?: string) => {
    if (!vehicleType) return [];
    return Array.from(
      new Set(
        usaGasDieselRows
          .filter((r) => r.vehicleType === vehicleType)
          .map((r) => r.emissionControlTechnology)
          .filter((v) => v && v.trim() !== "")
      )
    ).sort((a, b) => a.localeCompare(b));
  };

  const getUsaGasDieselFactorRow = (vehicleType?: string, emissionControlTechnology?: string) => {
    if (!vehicleType || !emissionControlTechnology) return undefined;
    return usaGasDieselRows.find(
      (r) =>
        r.vehicleType === vehicleType &&
        r.emissionControlTechnology === emissionControlTechnology
    );
  };

  const getUsaSelectedFactorValue = (
    factorRow: UsaGasDieselFactorRow | undefined,
    selectedFactor: UsaGasDieselFactorKey
  ) => {
    if (!factorRow) return null;
    if (selectedFactor === "NO2 Running (hot)") return factorRow.no2RunningHot;
    if (selectedFactor === "NO2 Cold Start") return factorRow.no2ColdStart;
    if (selectedFactor === "CH4 Running (hot)") return factorRow.ch4RunningHot;
    return factorRow.ch4ColdStart;
  };

  const getUsaSelectedFactorUnit = (
    factorRow: UsaGasDieselFactorRow | undefined,
    selectedFactor: UsaGasDieselFactorKey
  ) => {
    if (!factorRow) return "";
    if (selectedFactor === "NO2 Running (hot)") return factorRow.unitNo2RunningHot;
    if (selectedFactor === "NO2 Cold Start") return factorRow.unitNo2ColdStart;
    if (selectedFactor === "CH4 Running (hot)") return factorRow.unitCh4RunningHot;
    return factorRow.unitCh4ColdStart;
  };

  const getUsaAvailableFactors = (factorRow: UsaGasDieselFactorRow | undefined): UsaGasDieselFactorKey[] => {
    if (!factorRow) {
      return ["NO2 Running (hot)", "NO2 Cold Start", "CH4 Running (hot)", "CH4 Cold Start"];
    }
    const options: UsaGasDieselFactorKey[] = [];
    if (typeof factorRow.no2RunningHot === "number") options.push("NO2 Running (hot)");
    if (typeof factorRow.no2ColdStart === "number") options.push("NO2 Cold Start");
    if (typeof factorRow.ch4RunningHot === "number") options.push("CH4 Running (hot)");
    if (typeof factorRow.ch4ColdStart === "number") options.push("CH4 Cold Start");
    return options.length > 0
      ? options
      : ["NO2 Running (hot)", "NO2 Cold Start", "CH4 Running (hot)", "CH4 Cold Start"];
  };

  const getUsaDefaultFactor = (
    vehicleType?: string,
    emissionControlTechnology?: string
  ): UsaGasDieselFactorKey => {
    const factorRow = getUsaGasDieselFactorRow(vehicleType, emissionControlTechnology);
    return getUsaAvailableFactors(factorRow)[0];
  };

  const addUsaGasDieselCalculatorRow = () => {
    setUsaGasDieselCalculatorRows((prev) => [...prev, newUsaGasDieselCalculatorRow()]);
  };

  const removeUsaGasDieselCalculatorRow = (id: string) => {
    setUsaGasDieselCalculatorRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateUsaGasDieselCalculatorRow = (id: string, patch: Partial<UsaGasDieselCalculatorRow>) => {
    setUsaGasDieselCalculatorRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, ...patch };
      })
    );
  };

  const totalUsaGasDieselEmissions = useMemo(() => {
    return usaGasDieselCalculatorRows.reduce((sum, row) => {
      const factorRow = getUsaGasDieselFactorRow(row.vehicleType, row.emissionControlTechnology);
      const factor = getUsaSelectedFactorValue(factorRow, row.selectedFactor);
      if (typeof row.quantity !== "number" || typeof factor !== "number") return sum;
      return sum + row.quantity * factor;
    }, 0);
  }, [usaGasDieselCalculatorRows, usaGasDieselRows]);

  const availableAlternativeVehicleTypes = useMemo(
    () =>
      Array.from(
        new Set(alternativeFuelRows.map((r) => r.vehicleType).filter((v) => v && v.trim() !== ""))
      ).sort((a, b) => a.localeCompare(b)),
    [alternativeFuelRows]
  );

  const getAlternativeFuelsForVehicle = (vehicleType?: string) => {
    if (!vehicleType) return [];
    return Array.from(
      new Set(
        alternativeFuelRows
          .filter((r) => r.vehicleType === vehicleType)
          .map((r) => r.fuel)
          .filter((v) => v && v.trim() !== "")
      )
    ).sort((a, b) => a.localeCompare(b));
  };

  const getAlternativeFactorRow = (vehicleType?: string, fuel?: string) => {
    if (!vehicleType || !fuel) return undefined;
    return alternativeFuelRows.find((r) => r.vehicleType === vehicleType && r.fuel === fuel);
  };

  const addAlternativeFuelRow = () => {
    setAlternativeFuelCalculatorRows((prev) => [...prev, newAlternativeFuelCalculatorRow()]);
  };

  const removeAlternativeFuelRow = (id: string) => {
    setAlternativeFuelCalculatorRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const updateAlternativeFuelRow = (id: string, patch: Partial<AlternativeFuelCalculatorRow>) => {
    setAlternativeFuelCalculatorRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, ...patch };
      })
    );
  };

  const totalAlternativeFuelEmissions = useMemo(() => {
    return alternativeFuelCalculatorRows.reduce((sum, row) => {
      const factorRow = getAlternativeFactorRow(row.vehicleType, row.fuel);
      if (!factorRow || typeof row.quantity !== "number") return sum;
      const factor = row.selectedFactor === "NO2" ? factorRow.no2Factor : factorRow.ch4Factor;
      if (typeof factor !== "number") return sum;
      return sum + row.quantity * factor;
    }, 0);
  }, [alternativeFuelCalculatorRows, alternativeFuelRows]);

  useEffect(() => {
    const loadIpccChapter1Data = async () => {
      if (activeScope !== "scope1" || activeCategory !== "stationaryFuelCombustion") return;
      setLoadingStationary(true);
      setStationaryError(null);
      try {
        const tableCandidates = [
          "IPCC 1",
          '"IPCC 1"',
          "IPCC_1",
          "ipcc_1",
          "IPCC1",
          "ipcc1",
          "ipcc 1",
        ] as const;

        let data: Record<string, any>[] | null = null;
        let successfulTable: string | null = null;
        const attemptErrors: string[] = [];

        for (const tableName of tableCandidates) {
          const { data: attemptData, error: attemptError } = await supabase
            .from(tableName as any)
            .select("*")
            .limit(1000);

          if (attemptError) {
            attemptErrors.push(`${tableName}: ${attemptError.message}`);
            continue;
          }

          if ((attemptData || []).length > 0) {
            data = attemptData as Record<string, any>[];
            successfulTable = tableName;
            break;
          }

          // Keep the first successfully queried empty table as fallback.
          if (data === null) {
            data = (attemptData || []) as Record<string, any>[];
            successfulTable = tableName;
          }
        }

        if (data === null) {
          throw new Error(
            `Could not read any IPCC Chapter 1 table. Tried: ${tableCandidates.join(", ")}. ${
              attemptErrors.length ? `Errors: ${attemptErrors.join(" | ")}` : ""
            }`
          );
        }

        const mapped: StationaryFuelRow[] = (data || []).map((row: Record<string, any>, index: number) => {
          const factorRaw = pickFirst(row, [
            "CO emission factor",
            "CO2 emission factor",
            "CO Emission Factor",
            "CO2 Emission Factor",
            "co_emission_factor",
            "co2_emission_factor",
            "emission_factor",
            "Emission Factor",
          ]);

          const factorParsed =
            typeof factorRaw === "number"
              ? factorRaw
              : factorRaw !== undefined
              ? Number.parseFloat(String(factorRaw))
              : null;

          return {
            id: String(
              pickFirst(row, ["id", "ID", "Id", "uuid", "UUID"]) ?? `ipcc1-row-${index + 1}`
            ),
            fuelTypeDescription: String(
              pickFirst(row, [
                "Fuel type English description",
                "Fuel Type English Description",
                "fuel_type_english_description",
                "fuel type english description",
                "Fuel Type",
                "fuel_type",
              ]) ?? ""
            ),
            subType: String(
              pickFirst(row, ["Sub Type", "SubType", "sub_type", "sub type", "Type"]) ?? ""
            ),
            coEmissionFactor:
              Number.isFinite(factorParsed as number) && factorParsed !== null
                ? Number(factorParsed)
                : null,
            unit: String(pickFirst(row, ["Unit", "unit", "Units", "units"]) ?? ""),
          };
        });

        setStationaryRows(mapped);
        if (mapped.length > 0) {
          setStationaryError(null);
        }
        if (mapped.length === 0) {
          setStationaryError(
            `Connected to table ${successfulTable}, but no rows are visible for this user. If rows exist in Supabase, check RLS SELECT policy for authenticated users.`
          );
        }
      } catch (err: any) {
        setStationaryRows([]);
        setStationaryError(err?.message || "Failed to load IPCC Chapter 1 data.");
      } finally {
        setLoadingStationary(false);
      }
    };

    loadIpccChapter1Data();
  }, [activeScope, activeCategory]);

  useEffect(() => {
    if (activeCategory !== "flaring" || !user) return;
    loadFlaringHistory();
  }, [activeCategory, user]);

  useEffect(() => {
    if (activeCategory !== "flaring") return;
    if (typeof flaringVolume !== "number") {
      setFlaringCalculated(null);
      setFlaringCalculationError(null);
      return;
    }
    if (flaringVolume <= 0) {
      setFlaringCalculated(null);
      setFlaringCalculationError("Flare gas volume must be greater than 0.");
      return;
    }
    try {
      const compositionForCalculation = flaringComponents.map((component) => ({
        formula: component.formula.trim(),
        percentage: typeof component.percentage === "number" ? component.percentage : 0,
      }));
      const result = calculateFlaringEmissions(flaringVolume, flaringUnit, compositionForCalculation);
      setFlaringCalculated(result);
      setFlaringCalculationError(null);
    } catch (error: any) {
      setFlaringCalculated(null);
      setFlaringCalculationError(error?.message || "Failed to calculate flaring emissions.");
    }
  }, [activeCategory, flaringVolume, flaringUnit, flaringComponents]);

  useEffect(() => {
    if (activeCategory !== "venting" || !user) return;
    loadVentingHistory();
  }, [activeCategory, user]);

  useEffect(() => {
    if (activeCategory !== "venting") return;
    if (typeof ventingVolume !== "number") {
      setVentingCalculated(null);
      setVentingCalculationError(null);
      return;
    }
    if (ventingVolume <= 0) {
      setVentingCalculated(null);
      setVentingCalculationError("Vent gas volume must be greater than 0.");
      return;
    }
    try {
      const compositionForCalculation = ventingComponents.map((component) => ({
        gas: component.gas,
        percentage: typeof component.percentage === "number" ? component.percentage : 0,
      }));
      const result = calculateVentingEmissions(ventingVolume, ventingUnit, compositionForCalculation);
      setVentingCalculated(result);
      setVentingCalculationError(null);
    } catch (error: any) {
      setVentingCalculated(null);
      setVentingCalculationError(error?.message || "Failed to calculate venting emissions.");
    }
  }, [activeCategory, ventingVolume, ventingUnit, ventingComponents]);

  useEffect(() => {
    const loadIpccChapter2EnergyData = async () => {
      if (activeCategory !== "energyIndustries") return;
      setLoadingEnergyIndustry(true);
      setEnergyIndustryError(null);
      try {
        const tableCandidates =
          selectedIndustry === "MANUFACTURING INDUSTRIES AND CONSTRUCTION"
            ? ([
                "IPCC 2 Manufacturing",
                '"IPCC 2 Manufacturing"',
                "IPCC_2_Manufacturing",
                "ipcc_2_manufacturing",
                "IPCC2Manufacturing",
                "ipcc2manufacturing",
              ] as const)
            : selectedIndustry === "Commercial/Institutional"
            ? ([
                "IPCC 2 Commercial/Institutional",
                '"IPCC 2 Commercial/Institutional"',
                "IPCC_2_Commercial_Institutional",
                "ipcc_2_commercial_institutional",
                "IPCC2CommercialInstitutional",
                "ipcc2commercialinstitutional",
              ] as const)
            : selectedIndustry === "Residential and Agriculture/Forestry/Fishing/Fishing Farms"
            ? ([
                "IPCC 2 RESIDENTIAL AND AGRICULTURE/FORESTRY/FISHING/FISHING FAR",
                '"IPCC 2 RESIDENTIAL AND AGRICULTURE/FORESTRY/FISHING/FISHING FAR"',
                "IPCC_2_RESIDENTIAL_AND_AGRICULTURE_FORESTRY_FISHING_FISHING_FAR",
                "ipcc_2_residential_and_agriculture_forestry_fishing_fishing_far",
                "IPCC2ResidentialAgricultureForestryFishingFishingFar",
                "ipcc2residentialagricultureforestryfishingfishingfar",
              ] as const)
            : selectedIndustry === "Utility Source"
            ? ([
                "IPCC 2 Utility Sources",
                '"IPCC 2 Utility Sources"',
                "IPCC_2_Utility_Sources",
                "ipcc_2_utility_sources",
                "IPCC2UtilitySources",
                "ipcc2utilitysources",
              ] as const)
            : selectedIndustry === "Industrial Source"
            ? ([
                "IPCC 2 Industrial",
                '"IPCC 2 Industrial"',
                "IPCC_2_Industrial",
                "ipcc_2_industrial",
                "IPCC2Industrial",
                "ipcc2industrial",
              ] as const)
            : selectedIndustry === "Kilns, Ovens, and Dryers"
            ? ([
                "IPCC 2 KILNS, OVENS, AND DRYERS",
                '"IPCC 2 KILNS, OVENS, AND DRYERS"',
                "IPCC_2_KILNS_OVENS_AND_DRYERS",
                "ipcc_2_kilns_ovens_and_dryers",
                "IPCC2KilnsOvensAndDryers",
                "ipcc2kilnsovensanddryers",
              ] as const)
            : ([
                "IPCC 2 Energy",
                '"IPCC 2 Energy"',
                "IPCC_2_Energy",
                "ipcc_2_energy",
                "IPCC2Energy",
                "ipcc2energy",
              ] as const);

        let data: Record<string, any>[] | null = null;
        let successfulTable: string | null = null;
        const attemptErrors: string[] = [];

        for (const tableName of tableCandidates) {
          const { data: attemptData, error: attemptError } = await supabase
            .from(tableName as any)
            .select("*")
            .limit(1000);

          if (attemptError) {
            attemptErrors.push(`${tableName}: ${attemptError.message}`);
            continue;
          }

          if ((attemptData || []).length > 0) {
            data = attemptData as Record<string, any>[];
            successfulTable = tableName;
            break;
          }

          if (data === null) {
            data = (attemptData || []) as Record<string, any>[];
            successfulTable = tableName;
          }
        }

        if (data === null) {
          throw new Error(
            `Could not read any IPCC Chapter 2 table for ${selectedIndustry}. Tried: ${tableCandidates.join(", ")}. ${
              attemptErrors.length ? `Errors: ${attemptErrors.join(" | ")}` : ""
            }`
          );
        }

        const mapped: EnergyIndustryFactorRow[] = (data || []).map((row: Record<string, any>, index: number) => {
          const efCo2Raw = pickFirst(row, [
            "EF CO2",
            "ef_co2",
            "ef co2",
            "EF_CO2",
            "CO2",
            "co2",
            "co_2",
          ]);
          const efCh4Raw = pickFirst(row, [
            "EF CH4",
            "ef_ch4",
            "ef ch4",
            "EF_CH4",
            "CH 4",
            "ch 4",
            "CH4",
            "ch4",
            "ch_4",
          ]);
          const efN2oRaw = pickFirst(row, [
            "EF N2O",
            "EF NO2",
            "ef_n2o",
            "ef_no2",
            "EF_N2O",
            "EF_NO2",
            "N O 2",
            "N O2",
            "NO 2",
            "N2 O",
            "N2O",
            "NO2",
            "n2o",
            "no2",
            "n_2_o",
            "n_o_2",
          ]);

          const parseOrNull = (value: any) => {
            if (typeof value === "number") return value;
            if (value === undefined || value === null || String(value).trim() === "") return null;
            const parsed = Number.parseFloat(String(value));
            return Number.isFinite(parsed) ? parsed : null;
          };

          const fuel =
            String(
              pickFirst(row, [
                "Fuel",
                "fuel",
                "Fuel Type",
                "fuel_type",
                "Type",
                "type",
                "Industry",
                "industry",
              ]) ?? ""
            ) || "";
          const explicitSub = String(
            pickFirst(row, ["Sub Type", "sub_type", "SubType", "sub type", "Sub", "sub", "Source", "source"]) ??
              ""
          );
          const basicTechnology = String(
            pickFirst(row, ["Basic technology", "basic_technology", "basic technology"]) ?? ""
          );
          const configuration = String(
            pickFirst(row, ["Configuration", "configuration"]) ?? ""
          );
          const derivedSub =
            explicitSub ||
            [basicTechnology, configuration].filter((part) => part && part.trim() !== "").join(" - ");

          return {
            id: String(pickFirst(row, ["id", "ID", "Id"]) ?? `ipcc2-energy-${index + 1}`),
            fuel,
            subType: derivedSub,
            efCo2: parseOrNull(efCo2Raw),
            efCh4: parseOrNull(efCh4Raw),
            efN2o: parseOrNull(efN2oRaw),
          };
        });

        setEnergyIndustryRows(mapped);
        if (mapped.length > 0) setEnergyIndustryError(null);
        if (mapped.length === 0) {
          setEnergyIndustryError(
            `Connected to table ${successfulTable}, but no rows are visible for this user. If rows exist in Supabase, check RLS SELECT policy.`
          );
        }
      } catch (err: any) {
        setEnergyIndustryRows([]);
        setEnergyIndustryError(err?.message || "Failed to load IPCC Chapter 2 industry data.");
      } finally {
        setLoadingEnergyIndustry(false);
      }
    };

    loadIpccChapter2EnergyData();
  }, [activeCategory, selectedIndustry]);

  useEffect(() => {
    const loadRoadTransportData = async () => {
      if (activeCategory !== "roadTransport") return;
      setLoadingRoadTransport(true);
      setRoadTransportError(null);
      try {
        const tableCandidates = [
          "IPCC 3 ROAD TRANSPORT",
          '"IPCC 3 ROAD TRANSPORT"',
          "IPCC_3_ROAD_TRANSPORT",
          "ipcc_3_road_transport",
          "IPCC3RoadTransport",
          "ipcc3roadtransport",
        ] as const;

        let data: Record<string, any>[] | null = null;
        let successfulTable: string | null = null;
        const attemptErrors: string[] = [];

        for (const tableName of tableCandidates) {
          const { data: attemptData, error: attemptError } = await supabase
            .from(tableName as any)
            .select("*")
            .limit(1000);

          if (attemptError) {
            attemptErrors.push(`${tableName}: ${attemptError.message}`);
            continue;
          }

          if ((attemptData || []).length > 0) {
            data = attemptData as Record<string, any>[];
            successfulTable = tableName;
            break;
          }

          if (data === null) {
            data = (attemptData || []) as Record<string, any>[];
            successfulTable = tableName;
          }
        }

        if (data === null) {
          throw new Error(
            `Could not read Chapter 3 Road Transport table. Tried: ${tableCandidates.join(", ")}. ${
              attemptErrors.length ? `Errors: ${attemptErrors.join(" | ")}` : ""
            }`
          );
        }

        const parseOrNull = (value: any) => {
          if (typeof value === "number") return value;
          if (value === undefined || value === null || String(value).trim() === "") return null;
          const parsed = Number.parseFloat(String(value));
          return Number.isFinite(parsed) ? parsed : null;
        };

        const mapped: RoadTransportFactorRow[] = (data || []).map((row: Record<string, any>, index: number) => ({
          id: String(pickFirst(row, ["id", "ID", "Id"]) ?? `ipcc3-road-${index + 1}`),
          fuelType: String(pickFirst(row, ["FuelType", "Fuel Type", "fuel_type", "fueltype", "Fuel", "fuel"]) ?? ""),
          emissionFactor: parseOrNull(
            pickFirst(row, ["Emission Factor", "emission_factor", "emission factor", "Factor", "factor"])
          ),
          unit: String(pickFirst(row, ["Unit", "unit", "Units", "units"]) ?? ""),
        }));

        setRoadTransportRows(mapped);
        if (mapped.length > 0) setRoadTransportError(null);
        if (mapped.length === 0) {
          setRoadTransportError(
            `Connected to table ${successfulTable}, but no rows are visible for this user. If rows exist, check RLS SELECT policy.`
          );
        }
      } catch (err: any) {
        setRoadTransportRows([]);
        setRoadTransportError(err?.message || "Failed to load Chapter 3 Road Transport data.");
      } finally {
        setLoadingRoadTransport(false);
      }
    };

    loadRoadTransportData();
  }, [activeCategory]);

  useEffect(() => {
    const loadRoadTransportVehicleData = async () => {
      if (activeCategory !== "roadTransportVehicleType") return;
      setLoadingRoadTransportVehicle(true);
      setRoadTransportVehicleError(null);
      try {
        const tableCandidates = [
          "IPCC 3 Road Transport with Vehicle Type",
          '"IPCC 3 Road Transport with Vehicle Type"',
          "IPCC_3_Road_Transport_with_Vehicle_Type",
          "ipcc_3_road_transport_with_vehicle_type",
          "IPCC3RoadTransportWithVehicleType",
          "ipcc3roadtransportwithvehicletype",
        ] as const;

        let data: Record<string, any>[] | null = null;
        let successfulTable: string | null = null;
        const attemptErrors: string[] = [];

        for (const tableName of tableCandidates) {
          const { data: attemptData, error: attemptError } = await supabase
            .from(tableName as any)
            .select("*")
            .limit(1000);

          if (attemptError) {
            attemptErrors.push(`${tableName}: ${attemptError.message}`);
            continue;
          }

          if ((attemptData || []).length > 0) {
            data = attemptData as Record<string, any>[];
            successfulTable = tableName;
            break;
          }

          if (data === null) {
            data = (attemptData || []) as Record<string, any>[];
            successfulTable = tableName;
          }
        }

        if (data === null) {
          throw new Error(
            `Could not read Chapter 3 Road Transport with Vehicle Type table. Tried: ${tableCandidates.join(
              ", "
            )}. ${attemptErrors.length ? `Errors: ${attemptErrors.join(" | ")}` : ""}`
          );
        }

        const parseOrNull = (value: any) => {
          if (typeof value === "number") return value;
          if (value === undefined || value === null || String(value).trim() === "") return null;
          const parsed = Number.parseFloat(String(value));
          return Number.isFinite(parsed) ? parsed : null;
        };

        const mapped: RoadTransportVehicleFactorRow[] = (data || []).map((row: Record<string, any>, index: number) => ({
          id: String(pickFirst(row, ["id", "ID", "Id"]) ?? `ipcc3-road-vehicle-${index + 1}`),
          fuelType: String(
            pickFirst(row, ["Fuel Type", "FuelType", "fuel_type", "fueltype", "Fuel", "fuel"]) ?? ""
          ),
          ch4: parseOrNull(pickFirst(row, ["CH4", "CH 4", "ch4", "ch_4"])),
          no2: parseOrNull(pickFirst(row, ["NO2", "NO 2", "N2O", "n2o", "no2"])),
          unit: String(pickFirst(row, ["Unit", "unit", "Units", "units"]) ?? ""),
        }));

        setRoadTransportVehicleRows(mapped);
        if (mapped.length > 0) setRoadTransportVehicleError(null);
        if (mapped.length === 0) {
          setRoadTransportVehicleError(
            `Connected to table ${successfulTable}, but no rows are visible for this user. If rows exist, check RLS SELECT policy.`
          );
        }
      } catch (err: any) {
        setRoadTransportVehicleRows([]);
        setRoadTransportVehicleError(
          err?.message || "Failed to load Chapter 3 Road Transport with Vehicle Type data."
        );
      } finally {
        setLoadingRoadTransportVehicle(false);
      }
    };

    loadRoadTransportVehicleData();
  }, [activeCategory]);

  useEffect(() => {
    const loadUsaGasDieselData = async () => {
      if (activeCategory !== "usaGasolineDieselVehicles") return;
      setLoadingUsaGasDiesel(true);
      setUsaGasDieselError(null);
      try {
        const tableCandidates = [
          "IPCC 3 USA GASOLINE AND DIESEL VEHICLES",
          '"IPCC 3 USA GASOLINE AND DIESEL VEHICLES"',
          "IPCC_3_USA_GASOLINE_AND_DIESEL_VEHICLES",
          "ipcc_3_usa_gasoline_and_diesel_vehicles",
          "IPCC3USAGasolineAndDieselVehicles",
          "ipcc3usagasolineanddieselvehicles",
        ] as const;

        let data: Record<string, any>[] | null = null;
        let successfulTable: string | null = null;
        const attemptErrors: string[] = [];

        for (const tableName of tableCandidates) {
          const { data: attemptData, error: attemptError } = await supabase
            .from(tableName as any)
            .select("*")
            .limit(1000);

          if (attemptError) {
            attemptErrors.push(`${tableName}: ${attemptError.message}`);
            continue;
          }

          if ((attemptData || []).length > 0) {
            data = attemptData as Record<string, any>[];
            successfulTable = tableName;
            break;
          }

          if (data === null) {
            data = (attemptData || []) as Record<string, any>[];
            successfulTable = tableName;
          }
        }

        if (data === null) {
          throw new Error(
            `Could not read Chapter 3 USA Gasoline and Diesel Vehicles table. Tried: ${tableCandidates.join(
              ", "
            )}. ${attemptErrors.length ? `Errors: ${attemptErrors.join(" | ")}` : ""}`
          );
        }

        const parseOrNull = (value: any) => {
          if (typeof value === "number") return value;
          if (value === undefined || value === null || String(value).trim() === "") return null;
          const parsed = Number.parseFloat(String(value));
          return Number.isFinite(parsed) ? parsed : null;
        };

        const mapped: UsaGasDieselFactorRow[] = (data || []).map((row: Record<string, any>, index: number) => ({
          id: String(pickFirst(row, ["id", "ID", "Id"]) ?? `ipcc3-usa-${index + 1}`),
          vehicleType: String(
            pickFirst(row, ["Vehicle Type", "VehicleType", "vehicle_type", "vehicletype"]) ?? ""
          ),
          emissionControlTechnology: String(
            pickFirst(row, [
              "Emission Control Technology",
              "EmissionControlTechnology",
              "emission_control_technology",
            ]) ?? ""
          ),
          no2RunningHot: parseOrNull(pickFirst(row, ["NO 2 Running (hot)", "NO2 Running (hot)", "NO2_Running_Hot"])),
          no2ColdStart: parseOrNull(pickFirst(row, ["NO 2 Cold Start", "NO2 Cold Start", "NO2_Cold_Start"])),
          ch4RunningHot: parseOrNull(pickFirst(row, ["CH 4 Running (hot)", "CH4 Running (hot)", "CH4_Running_Hot"])),
          ch4ColdStart: parseOrNull(pickFirst(row, ["CH 4 Cold Start", "CH4 Cold Start", "CH4_Cold_Start"])),
          unitNo2RunningHot: String(pickFirst(row, ["Unit", "unit"]) ?? ""),
          unitNo2ColdStart: String(pickFirst(row, ["Unit_1", "unit_1", "Unit 1"]) ?? ""),
          unitCh4RunningHot: String(pickFirst(row, ["Unit_2", "unit_2", "Unit 2"]) ?? ""),
          unitCh4ColdStart: String(pickFirst(row, ["Unit_3", "unit_3", "Unit 3"]) ?? ""),
        }));

        setUsaGasDieselRows(mapped);
        if (mapped.length > 0) setUsaGasDieselError(null);
        if (mapped.length === 0) {
          setUsaGasDieselError(
            `Connected to table ${successfulTable}, but no rows are visible for this user. If rows exist, check RLS SELECT policy.`
          );
        }
      } catch (err: any) {
        setUsaGasDieselRows([]);
        setUsaGasDieselError(err?.message || "Failed to load Chapter 3 USA Gasoline and Diesel Vehicles data.");
      } finally {
        setLoadingUsaGasDiesel(false);
      }
    };

    loadUsaGasDieselData();
  }, [activeCategory]);

  useEffect(() => {
    const loadAlternativeFuelData = async () => {
      if (activeCategory !== "alternativeFuelVehicles") return;
      setLoadingAlternativeFuel(true);
      setAlternativeFuelError(null);
      try {
        const tableCandidates = [
          "IPCC 3 ALTERNATIVE FUEL VEHICLES",
          '"IPCC 3 ALTERNATIVE FUEL VEHICLES"',
          "IPCC_3_ALTERNATIVE_FUEL_VEHICLES",
          "ipcc_3_alternative_fuel_vehicles",
          "IPCC3AlternativeFuelVehicles",
          "ipcc3alternativefuelvehicles",
        ] as const;

        let data: Record<string, any>[] | null = null;
        let successfulTable: string | null = null;
        const attemptErrors: string[] = [];

        for (const tableName of tableCandidates) {
          const { data: attemptData, error: attemptError } = await supabase
            .from(tableName as any)
            .select("*")
            .limit(1000);

          if (attemptError) {
            attemptErrors.push(`${tableName}: ${attemptError.message}`);
            continue;
          }

          if ((attemptData || []).length > 0) {
            data = attemptData as Record<string, any>[];
            successfulTable = tableName;
            break;
          }

          if (data === null) {
            data = (attemptData || []) as Record<string, any>[];
            successfulTable = tableName;
          }
        }

        if (data === null) {
          throw new Error(
            `Could not read Chapter 3 Alternative Fuel Vehicles table. Tried: ${tableCandidates.join(
              ", "
            )}. ${attemptErrors.length ? `Errors: ${attemptErrors.join(" | ")}` : ""}`
          );
        }

        const parseOrNull = (value: any) => {
          if (typeof value === "number") return value;
          if (value === undefined || value === null || String(value).trim() === "") return null;
          const parsed = Number.parseFloat(String(value));
          return Number.isFinite(parsed) ? parsed : null;
        };

        const mapped: AlternativeFuelFactorRow[] = (data || []).map((row: Record<string, any>, index: number) => ({
          id: String(pickFirst(row, ["id", "ID", "Id"]) ?? `ipcc3-alt-${index + 1}`),
          vehicleType: String(
            pickFirst(row, ["Vehicle Type", "VehicleType", "vehicle_type", "vehicletype"]) ?? ""
          ),
          fuel: String(pickFirst(row, ["Fuel", "fuel", "Fuel Type", "fuel_type"]) ?? ""),
          no2Factor: parseOrNull(
            pickFirst(row, ["NO Emission 2 Factor", "NO2 Emission Factor", "NO2", "NO 2", "no2"])
          ),
          ch4Factor: parseOrNull(
            pickFirst(row, ["CH Emission 4 Factor", "CH4 Emission Factor", "CH4", "CH 4", "ch4"])
          ),
          unit: String(pickFirst(row, ["Unit", "unit", "Units", "units"]) ?? ""),
        }));

        setAlternativeFuelRows(mapped);
        if (mapped.length > 0) setAlternativeFuelError(null);
        if (mapped.length === 0) {
          setAlternativeFuelError(
            `Connected to table ${successfulTable}, but no rows are visible for this user. If rows exist, check RLS SELECT policy.`
          );
        }
      } catch (err: any) {
        setAlternativeFuelRows([]);
        setAlternativeFuelError(err?.message || "Failed to load Chapter 3 Alternative Fuel Vehicles data.");
      } finally {
        setLoadingAlternativeFuel(false);
      }
    };

    loadAlternativeFuelData();
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory === "energyIndustries") {
      setEnergyCalculatorRows([newEnergyCalculatorRow()]);
    }
  }, [selectedIndustry, activeCategory]);

  useEffect(() => {
    if (activeCategory === "roadTransport") {
      setRoadTransportCalculatorRows([newRoadTransportCalculatorRow()]);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory === "roadTransportVehicleType") {
      setRoadTransportVehicleCalculatorRows([newRoadTransportVehicleCalculatorRow()]);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory === "usaGasolineDieselVehicles") {
      setUsaGasDieselCalculatorRows([newUsaGasDieselCalculatorRow()]);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (activeCategory === "alternativeFuelVehicles") {
      setAlternativeFuelCalculatorRows([newAlternativeFuelCalculatorRow()]);
    }
  }, [activeCategory]);

  if (isRestrictedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-xl bg-white/90 backdrop-blur-sm border border-red-200/60 shadow-xl rounded-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 mb-2">
                <Factory className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Emission calculator access restricted
              </h2>
              <p className="text-sm text-red-700 max-w-md">
                You do not currently have access to the emission calculator modules (UK, EPA, or IPCC) in this account.
              </p>
              <p className="text-sm text-gray-600 max-w-md">
                Please contact your administrator if you believe you should have access to this part of the platform.
              </p>
              <Button
                className="mt-4 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col lg:flex-row">
      <div className="w-full lg:w-80 bg-white/80 backdrop-blur-sm border-b lg:border-b-0 lg:border-r border-gray-200/50 flex flex-col shadow-sm">
        <div className="px-6 py-6 border-b border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50">
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="ghost"
              onClick={() => navigate(`/emission-calculator${query}`)}
              className="text-gray-600 hover:text-teal-600 hover:bg-teal-50/50 rounded-lg px-3 py-2 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Back</span>
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
              <Globe2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                IPCC Calculator
              </h1>
              <p className="text-xs text-gray-500 mt-1">Chapter-based emission factors</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <nav className="space-y-3">
            {sidebarItems.map((scope) => (
              <div key={scope.id}>
                <button
                  onClick={() => {
                    setActiveScope(scope.id);
                    setExpandedScopes((prev) => ({ ...prev, [scope.id]: !prev[scope.id] }));
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeScope === scope.id
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30"
                      : "text-gray-700 hover:bg-gray-100/80 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Factory className={`h-5 w-5 ${activeScope === scope.id ? "text-white" : "text-gray-600"}`} />
                    <span>{scope.title}</span>
                  </div>
                  {expandedScopes[scope.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {expandedScopes[scope.id] && (
                  <div className="ml-2 mt-2 space-y-1.5 pl-2 border-l-2 border-gray-200/50">
                    {scope.categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setActiveScope(scope.id);
                          setActiveCategory(category.id);
                        }}
                        className={`w-full flex items-center justify-start space-x-3 px-4 py-2.5 text-sm text-left rounded-lg transition-all duration-200 ${
                          activeScope === scope.id && activeCategory === category.id
                            ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-l-4 border-teal-500 shadow-sm font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                        }`}
                      >
                        <category.icon
                          className={`h-4 w-4 ${
                            activeScope === scope.id && activeCategory === category.id
                              ? "text-teal-600"
                              : "text-gray-500"
                          }`}
                        />
                        <span>{category.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-6 sm:px-8 py-4 sm:py-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl shadow-lg">
              <Globe2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                {activeCategory === "stationaryFuelCombustion"
                  ? "Chapter 1 - Stationary Fuel Combustion"
                  : activeCategory === "flaring"
                  ? "Chapter 1 - Flaring"
                  : activeCategory === "venting"
                  ? "Chapter 1 - Venting"
                  : activeCategory === "roadTransport"
                  ? "Chap 3 - Road Transport"
                  : activeCategory === "roadTransportVehicleType"
                  ? "Chap 3 - Road Transport with Vehicle Type"
                  : activeCategory === "usaGasolineDieselVehicles"
                  ? "Chap 3 - USA Gasoline and Diesel Vehicles"
                  : activeCategory === "alternativeFuelVehicles"
                  ? "Chap 3 - Alternative Fuel Vehicles"
                  : "Chap 2 - Industry Emissions"}
              </h2>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                {activeCategory === "stationaryFuelCombustion" ? (
                  <>
                    Emission factors sourced from Supabase table <span className="font-semibold">IPCC 1</span>.
                  </>
                ) : activeCategory === "flaring" ? (
                  <>Stoichiometry-based calculator using flare gas volume and dynamic composition.</>
                ) : activeCategory === "venting" ? (
                  <>Venting calculator using volume, composition, and gas-specific GWP conversion to tCO2e.</>
                ) : activeCategory === "roadTransport" ? (
                  <>
                    Emission factors sourced from Supabase table{" "}
                    <span className="font-semibold">IPCC 3 ROAD TRANSPORT</span>.
                  </>
                ) : activeCategory === "roadTransportVehicleType" ? (
                  <>
                    Emission factors sourced from Supabase table{" "}
                    <span className="font-semibold">IPCC 3 Road Transport with Vehicle Type</span>.
                  </>
                ) : activeCategory === "usaGasolineDieselVehicles" ? (
                  <>
                    Emission factors sourced from Supabase table{" "}
                    <span className="font-semibold">IPCC 3 USA GASOLINE AND DIESEL VEHICLES</span>.
                  </>
                ) : activeCategory === "alternativeFuelVehicles" ? (
                  <>
                    Emission factors sourced from Supabase table{" "}
                    <span className="font-semibold">IPCC 3 ALTERNATIVE FUEL VEHICLES</span>.
                  </>
                ) : (
                  <>
                    Emission factors for <span className="font-semibold">{selectedIndustry}</span> sourced from{" "}
                    <span className="font-semibold">
                      {selectedIndustry === "MANUFACTURING INDUSTRIES AND CONSTRUCTION"
                        ? "IPCC 2 Manufacturing"
                        : selectedIndustry === "Commercial/Institutional"
                        ? "IPCC 2 Commercial/Institutional"
                        : selectedIndustry === "Residential and Agriculture/Forestry/Fishing/Fishing Farms"
                        ? "IPCC 2 RESIDENTIAL AND AGRICULTURE/FORESTRY/FISHING/FISHING FAR"
                      : selectedIndustry === "Utility Source"
                      ? "IPCC 2 Utility Sources"
                      : selectedIndustry === "Industrial Source"
                      ? "IPCC 2 Industrial"
                      : selectedIndustry === "Kilns, Ovens, and Dryers"
                      ? "IPCC 2 KILNS, OVENS, AND DRYERS"
                        : "IPCC 2 Energy"}
                    </span>.
                  </>
                )}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50">
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-xl rounded-2xl">
            <CardContent className="p-6 sm:p-8">
              {activeCategory === "stationaryFuelCombustion" && loadingStationary ? (
                <div className="text-sm text-gray-600">Loading stationary fuel combustion factors...</div>
              ) : activeCategory === "stationaryFuelCombustion" && stationaryError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {stationaryError}
                </div>
              ) : activeCategory === "stationaryFuelCombustion" && stationaryRows.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No data found in <span className="font-semibold">IPCC 1</span>. Please add rows in Supabase.
                </div>
              ) : activeCategory === "stationaryFuelCombustion" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Stationary Fuel Combustion</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Emissions = Quantity x CO emission factor
                      </p>
                    </div>
                    <Button onClick={addCalculatorRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>

                  <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/40 to-emerald-50/30 px-4 py-3 text-xs text-teal-900">
                    Select fuel and quantity. For fuels without subtypes, the calculator applies the factor directly.
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[1050px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Fuel type English description</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Sub Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Unit</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">CO emission factor</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Quantity</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Emissions</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculatorRows.map((row) => {
                          const factorRow = getFactorRow(row.fuelTypeDescription, row.subType);
                          const factor = factorRow?.coEmissionFactor;
                          const requiresSubType = fuelRequiresSubType(row.fuelTypeDescription);
                          const emissions =
                            typeof row.quantity === "number" && typeof factor === "number"
                              ? row.quantity * factor
                              : null;

                          return (
                            <tr key={row.id} className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40">
                              <td className="px-4 py-3">
                                <Select
                                  value={row.fuelTypeDescription}
                                  onValueChange={(value) =>
                                    updateCalculatorRow(row.id, {
                                      fuelTypeDescription: value,
                                      subType: undefined,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select fuel type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableFuelTypes.map((fuelType) => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                {requiresSubType ? (
                                  <Select
                                    value={row.subType}
                                    onValueChange={(value) => updateCalculatorRow(row.id, { subType: value })}
                                    disabled={!row.fuelTypeDescription}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select subtype" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getSubTypesForFuel(row.fuelTypeDescription).map((subType) => (
                                        <SelectItem key={subType} value={subType}>
                                          {subType}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="h-10 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-xs text-gray-500">
                                    Not required
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">{factorRow?.unit || "-"}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factor === "number" ? formatNumber(factor, 4) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ""}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    if (raw === "") {
                                      updateCalculatorRow(row.id, { quantity: undefined });
                                      return;
                                    }
                                    const numeric = Number(raw);
                                    if (!Number.isNaN(numeric) && numeric >= 0) {
                                      updateCalculatorRow(row.id, { quantity: numeric });
                                    }
                                  }}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {emissions !== null ? formatNumber(emissions, 2) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => removeCalculatorRow(row.id)}
                                  disabled={calculatorRows.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-right">
                    <span className="text-sm text-teal-800 mr-2">Total Stationary Fuel Emissions:</span>
                    <span className="text-lg font-bold text-teal-900">
                      {formatNumber(totalStationaryEmissions, 2)}
                    </span>
                  </div>
                </div>
              ) : activeCategory === "flaring" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Flaring</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Enter flare gas volume and add gas components (formula + %) to calculate CO2 emissions.
                      </p>
                    </div>
                    <Button onClick={addFlaringComponent} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Gas
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Flare gas volume</label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={flaringVolume ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === "") {
                            setFlaringVolume(undefined);
                            return;
                          }
                          const numeric = Number(raw);
                          if (!Number.isNaN(numeric) && numeric >= 0) setFlaringVolume(numeric);
                        }}
                        placeholder="Enter flare gas volume"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Volume unit</label>
                      <Select value={flaringUnit} onValueChange={(value: FlaringUnit) => setFlaringUnit(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m3">m3</SelectItem>
                          <SelectItem value="MMSCF">MMSCF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Month</label>
                      <Input
                        type="month"
                        value={flaringMonth}
                        onChange={(event) => setFlaringMonth(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[1080px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Chemical Formula</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Molar Mass (g/mol)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Percentage (%)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flaringComponents.map((component) => (
                          <tr
                            key={component.id}
                            className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40"
                          >
                            <td className="px-4 py-3">
                              <Input
                                list="flaring-gas-presets"
                                value={component.formula}
                                onChange={(event) =>
                                  updateFlaringComponent(component.id, { formula: event.target.value })
                                }
                                placeholder="e.g., CH4, C2H6, CO2, H2S"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {(() => {
                                const parsed = parseChemicalFormula(component.formula);
                                return parsed ? formatNumber(parsed.molarMass, 3) : "-";
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={component.percentage ?? ""}
                                onChange={(event) => {
                                  const raw = event.target.value;
                                  if (raw === "") {
                                    updateFlaringComponent(component.id, { percentage: undefined });
                                    return;
                                  }
                                  const numeric = Number(raw);
                                  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 100) {
                                    updateFlaringComponent(component.id, { percentage: numeric });
                                  }
                                }}
                                placeholder="Enter %"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => removeFlaringComponent(component.id)}
                                disabled={flaringComponents.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <datalist id="flaring-gas-presets">
                      {FLARING_GAS_PRESETS.map((preset) => (
                        <option key={preset} value={preset} />
                      ))}
                    </datalist>
                  </div>

                  <div
                    className={`rounded-lg px-4 py-3 text-sm ${
                      Math.abs(flaringPercentageTotal - 100) <= 0.001
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    Gas composition total: <span className="font-semibold">{formatNumber(flaringPercentageTotal, 2)}%</span>
                    {Math.abs(flaringPercentageTotal - 100) > 0.001 &&
                      " (must equal 100%)"}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={handleSaveFlaringMonth}
                      disabled={flaringSaving}
                      variant="outline"
                      className="border-teal-300 text-teal-700 hover:bg-teal-50"
                    >
                      {flaringSaving ? "Saving..." : "Save Monthly Entry"}
                    </Button>
                  </div>

                  {flaringCalculationError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {flaringCalculationError}
                    </div>
                  )}

                  {flaringCalculated && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                          <div className="text-sm text-gray-600">CO2 Emissions (tonnes)</div>
                          <div className="text-2xl font-bold text-gray-900">
                            {formatNumber(flaringCalculated.CO2_tonnes, 2)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
                          <div className="text-sm text-teal-800">CO2 Emissions (kg)</div>
                          <div className="text-2xl font-extrabold text-teal-900">
                            {formatNumber(flaringCalculated.CO2_kg, 2)}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="text-sm font-semibold text-gray-900 mb-3">
                          CO2 contribution by component (moles CO2)
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                          {flaringCalculated.breakdown.map((item, index) => (
                            <div key={`${item.formula}-${item.type}-${index}`} className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
                              <div className="text-gray-600">
                                {item.formula}{" "}
                                <span className="text-xs">
                                  ({item.type === "existing_co2" ? "existing CO2" : item.type})
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                C atoms: {item.carbonAtoms} | Molar mass: {formatNumber(item.molarMass, 3)} g/mol
                              </div>
                              <div className="font-semibold text-gray-900">{formatNumber(item.co2Moles, 2)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          Total moles processed: {formatNumber(flaringCalculated.total_moles, 2)}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Previous Monthly Entries</div>
                    {flaringHistoryLoading ? (
                      <div className="text-sm text-gray-600">Loading saved entries...</div>
                    ) : flaringHistory.length === 0 ? (
                      <div className="text-sm text-gray-500">No saved monthly flaring entries yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {flaringHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded border border-gray-100 px-3 py-2"
                          >
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">{entry.month}</span>
                              <span className="mx-2 text-gray-400">|</span>
                              <span>{formatNumber(entry.result?.CO2_tonnes || 0, 2)} t CO2</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => handleLoadFlaringEntry(entry)}
                            >
                              Load
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeCategory === "venting" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Venting</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Enter vent gas volume and composition to calculate total CO2 equivalent emissions.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Vent gas volume</label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={ventingVolume ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value;
                          if (raw === "") {
                            setVentingVolume(undefined);
                            return;
                          }
                          const numeric = Number(raw);
                          if (!Number.isNaN(numeric) && numeric >= 0) setVentingVolume(numeric);
                        }}
                        placeholder="Enter vent gas volume"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Volume unit</label>
                      <Select value={ventingUnit} onValueChange={(value: FlaringUnit) => setVentingUnit(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m3">m3</SelectItem>
                          <SelectItem value="MMSCF">MMSCF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">Month</label>
                      <Input
                        type="month"
                        value={ventingMonth}
                        onChange={(event) => setVentingMonth(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">Gas Composition</h4>
                    </div>
                    <Button onClick={addVentingComponent} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Gas
                    </Button>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[980px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Gas</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Molar Mass (g/mol)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Composition (%)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventingComponents.map((component) => (
                          <tr
                            key={component.id}
                            className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40"
                          >
                            <td className="px-4 py-3">
                              <Select
                                value={component.gas}
                                onValueChange={(value: VentingGas) =>
                                  updateVentingComponent(component.id, { gas: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gas" />
                                </SelectTrigger>
                                <SelectContent>
                                  {VENTING_GAS_OPTIONS.map((gas) => (
                                    <SelectItem key={gas} value={gas}>
                                      {VENTING_GAS_LABELS[gas]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {(() => {
                                const parsed = parseChemicalFormula(component.gas);
                                return parsed ? formatNumber(parsed.molarMass, 3) : "-";
                              })()}
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={component.percentage ?? ""}
                                onChange={(event) => {
                                  const raw = event.target.value;
                                  if (raw === "") {
                                    updateVentingComponent(component.id, { percentage: undefined });
                                    return;
                                  }
                                  const numeric = Number(raw);
                                  if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 100) {
                                    updateVentingComponent(component.id, { percentage: numeric });
                                  }
                                }}
                                placeholder="Enter %"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => removeVentingComponent(component.id)}
                                disabled={ventingComponents.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className={`rounded-lg px-4 py-3 text-sm ${
                      Math.abs(ventingPercentageTotal - 100) <= 0.001
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    Gas composition total: <span className="font-semibold">{formatNumber(ventingPercentageTotal, 2)}%</span>
                    {Math.abs(ventingPercentageTotal - 100) > 0.001 && " (must equal 100%)"}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveVentingMonth}
                      disabled={ventingSaving}
                      variant="outline"
                      className="border-teal-300 text-teal-700 hover:bg-teal-50"
                    >
                      {ventingSaving ? "Saving..." : "Save Monthly Entry"}
                    </Button>
                  </div>

                  {ventingCalculationError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {ventingCalculationError}
                    </div>
                  )}

                  {ventingCalculated && (
                    <>
                      <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
                        <div className="text-sm text-teal-800">Total CO2e Emissions</div>
                        <div className="text-2xl font-extrabold text-teal-900">
                          Scope 1 Venting Emissions: {formatNumber(ventingCalculated.totalCO2e_tonnes, 2)} tCO2e
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="text-sm font-semibold text-gray-900 mb-3">CO2e Breakdown by Gas</div>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[700px]">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Gas</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">GWP</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">CO2e Moles</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">CO2e (kg)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ventingCalculated.breakdown.map((item) => (
                                <tr key={item.gas} className="border-t border-gray-100">
                                  <td className="px-3 py-2 text-sm text-gray-900">{VENTING_GAS_LABELS[item.gas]}</td>
                                  <td className="px-3 py-2 text-sm text-gray-700">{item.gwp}</td>
                                  <td className="px-3 py-2 text-sm text-gray-700">
                                    {formatNumber(item.co2eMoles, 2)}
                                  </td>
                                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                                    {formatNumber(item.co2eKg, 2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          Total moles processed: {formatNumber(ventingCalculated.total_moles, 2)}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="text-sm font-semibold text-gray-900 mb-3">Previous Monthly Entries</div>
                    {ventingHistoryLoading ? (
                      <div className="text-sm text-gray-600">Loading saved entries...</div>
                    ) : ventingHistory.length === 0 ? (
                      <div className="text-sm text-gray-500">No saved monthly venting entries yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {ventingHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded border border-gray-100 px-3 py-2"
                          >
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">{entry.month}</span>
                              <span className="mx-2 text-gray-400">|</span>
                              <span>{formatNumber(entry.result?.totalCO2e_tonnes || 0, 2)} tCO2e</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => handleLoadVentingEntry(entry)}
                            >
                              Load
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeCategory === "roadTransport" && loadingRoadTransport ? (
                <div className="text-sm text-gray-600">Loading road transport factors...</div>
              ) : activeCategory === "roadTransport" && roadTransportError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {roadTransportError}
                </div>
              ) : activeCategory === "roadTransport" && roadTransportRows.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No data found in <span className="font-semibold">IPCC 3 ROAD TRANSPORT</span>. Please add rows in
                  Supabase.
                </div>
              ) : activeCategory === "roadTransport" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Road Transport</h3>
                      <p className="text-sm text-gray-600 mt-1">Emissions = Quantity x Emission Factor</p>
                    </div>
                    <Button onClick={addRoadTransportCalculatorRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[950px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Fuel Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Unit</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Emission Factor</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Quantity</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Emissions</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roadTransportCalculatorRows.map((row) => {
                          const factorRow = getRoadFactorRow(row.fuelType);
                          const rowEmissions =
                            typeof row.quantity === "number" && typeof factorRow?.emissionFactor === "number"
                              ? row.quantity * factorRow.emissionFactor
                              : null;

                          return (
                            <tr key={row.id} className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40">
                              <td className="px-4 py-3">
                                <Select
                                  value={row.fuelType}
                                  onValueChange={(value) => updateRoadTransportCalculatorRow(row.id, { fuelType: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select fuel type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoadFuelTypes.map((fuelType) => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{factorRow?.unit || "-"}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.emissionFactor === "number"
                                  ? formatNumber(factorRow.emissionFactor, 6)
                                  : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ""}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    if (raw === "") {
                                      updateRoadTransportCalculatorRow(row.id, { quantity: undefined });
                                      return;
                                    }
                                    const numeric = Number(raw);
                                    if (!Number.isNaN(numeric) && numeric >= 0) {
                                      updateRoadTransportCalculatorRow(row.id, { quantity: numeric });
                                    }
                                  }}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {rowEmissions !== null ? formatNumber(rowEmissions, 2) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => removeRoadTransportCalculatorRow(row.id)}
                                  disabled={roadTransportCalculatorRows.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-right">
                    <span className="text-sm text-teal-800 mr-2">Total Road Transport Emissions:</span>
                    <span className="text-lg font-bold text-teal-900">
                      {formatNumber(totalRoadTransportEmissions, 2)}
                    </span>
                  </div>
                </div>
              ) : activeCategory === "roadTransportVehicleType" && loadingRoadTransportVehicle ? (
                <div className="text-sm text-gray-600">Loading road transport with vehicle type factors...</div>
              ) : activeCategory === "roadTransportVehicleType" && roadTransportVehicleError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {roadTransportVehicleError}
                </div>
              ) : activeCategory === "roadTransportVehicleType" && roadTransportVehicleRows.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No data found in <span className="font-semibold">IPCC 3 Road Transport with Vehicle Type</span>.
                  Please add rows in Supabase.
                </div>
              ) : activeCategory === "roadTransportVehicleType" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Road Transport with Vehicle Type</h3>
                      <p className="text-sm text-gray-600 mt-1">Emissions = Quantity x selected factor</p>
                    </div>
                    <Button
                      onClick={addRoadTransportVehicleCalculatorRow}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[1200px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Fuel Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">CH4</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">NO2</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Factor to Use</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Unit</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Quantity</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Emissions</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roadTransportVehicleCalculatorRows.map((row) => {
                          const factorRow = getRoadVehicleFactorRow(row.fuelType);
                          const selectedFactorValue =
                            row.selectedFactor === "CH4" ? factorRow?.ch4 : factorRow?.no2;
                          const rowEmissions =
                            typeof row.quantity === "number" && typeof selectedFactorValue === "number"
                              ? row.quantity * selectedFactorValue
                              : null;

                          return (
                            <tr key={row.id} className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40">
                              <td className="px-4 py-3">
                                <Select
                                  value={row.fuelType}
                                  onValueChange={(value) =>
                                    updateRoadTransportVehicleCalculatorRow(row.id, {
                                      fuelType: value,
                                      selectedFactor: "CH4",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select fuel type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableRoadVehicleFuelTypes.map((fuelType) => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.ch4 === "number" ? formatNumber(factorRow.ch4, 6) : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.no2 === "number" ? formatNumber(factorRow.no2, 6) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Select
                                  value={row.selectedFactor}
                                  onValueChange={(value: "CH4" | "NO2") =>
                                    updateRoadTransportVehicleCalculatorRow(row.id, { selectedFactor: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select factor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CH4">CH4</SelectItem>
                                    <SelectItem value="NO2">NO2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{factorRow?.unit || "-"}</td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ""}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    if (raw === "") {
                                      updateRoadTransportVehicleCalculatorRow(row.id, { quantity: undefined });
                                      return;
                                    }
                                    const numeric = Number(raw);
                                    if (!Number.isNaN(numeric) && numeric >= 0) {
                                      updateRoadTransportVehicleCalculatorRow(row.id, { quantity: numeric });
                                    }
                                  }}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {rowEmissions !== null ? formatNumber(rowEmissions, 2) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => removeRoadTransportVehicleCalculatorRow(row.id)}
                                  disabled={roadTransportVehicleCalculatorRows.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-right">
                    <span className="text-sm text-teal-800 mr-2">
                      Total Road Transport (Vehicle Type) Emissions:
                    </span>
                    <span className="text-lg font-bold text-teal-900">
                      {formatNumber(totalRoadTransportVehicleEmissions, 2)}
                    </span>
                  </div>
                </div>
              ) : activeCategory === "usaGasolineDieselVehicles" && loadingUsaGasDiesel ? (
                <div className="text-sm text-gray-600">Loading USA gasoline and diesel vehicle factors...</div>
              ) : activeCategory === "usaGasolineDieselVehicles" && usaGasDieselError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {usaGasDieselError}
                </div>
              ) : activeCategory === "usaGasolineDieselVehicles" && usaGasDieselRows.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No data found in <span className="font-semibold">IPCC 3 USA GASOLINE AND DIESEL VEHICLES</span>.
                  Please add rows in Supabase.
                </div>
              ) : activeCategory === "usaGasolineDieselVehicles" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">USA Gasoline and Diesel Vehicles</h3>
                      <p className="text-sm text-gray-600 mt-1">Emissions = Quantity x selected factor</p>
                    </div>
                    <Button onClick={addUsaGasDieselCalculatorRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[1450px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Vehicle Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Emission Control Technology</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">NO2 Running (hot)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">NO2 Cold Start</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">CH4 Running (hot)</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">CH4 Cold Start</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Factor to Use</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Unit</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Quantity</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Emissions</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usaGasDieselCalculatorRows.map((row) => {
                          const emissionControlOptions = getEmissionControlsForVehicleType(row.vehicleType);
                          const factorRow = getUsaGasDieselFactorRow(row.vehicleType, row.emissionControlTechnology);
                          const factorOptions = getUsaAvailableFactors(factorRow);
                          const selectedFactorValue = getUsaSelectedFactorValue(factorRow, row.selectedFactor);
                          const selectedFactorUnit = getUsaSelectedFactorUnit(factorRow, row.selectedFactor);
                          const rowEmissions =
                            typeof row.quantity === "number" && typeof selectedFactorValue === "number"
                              ? row.quantity * selectedFactorValue
                              : null;

                          return (
                            <tr key={row.id} className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40">
                              <td className="px-4 py-3">
                                <Select
                                  value={row.vehicleType}
                                  onValueChange={(value) =>
                                    updateUsaGasDieselCalculatorRow(row.id, {
                                      vehicleType: value,
                                      emissionControlTechnology: undefined,
                                      selectedFactor: getUsaDefaultFactor(value, undefined),
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableUsaVehicleTypes.map((vehicleType) => (
                                      <SelectItem key={vehicleType} value={vehicleType}>
                                        {vehicleType}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                <Select
                                  value={row.emissionControlTechnology}
                                  onValueChange={(value) =>
                                    updateUsaGasDieselCalculatorRow(row.id, {
                                      emissionControlTechnology: value,
                                      selectedFactor: getUsaDefaultFactor(row.vehicleType, value),
                                    })
                                  }
                                  disabled={!row.vehicleType}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select emission control technology" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {emissionControlOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.no2RunningHot === "number" ? formatNumber(factorRow.no2RunningHot, 6) : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.no2ColdStart === "number" ? formatNumber(factorRow.no2ColdStart, 6) : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.ch4RunningHot === "number" ? formatNumber(factorRow.ch4RunningHot, 6) : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.ch4ColdStart === "number" ? formatNumber(factorRow.ch4ColdStart, 6) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Select
                                  value={row.selectedFactor}
                                  onValueChange={(value: UsaGasDieselFactorKey) =>
                                    updateUsaGasDieselCalculatorRow(row.id, { selectedFactor: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select factor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {factorOptions.includes("NO2 Running (hot)") && (
                                      <SelectItem value="NO2 Running (hot)">NO2 Running (hot)</SelectItem>
                                    )}
                                    {factorOptions.includes("NO2 Cold Start") && (
                                      <SelectItem value="NO2 Cold Start">NO2 Cold Start</SelectItem>
                                    )}
                                    {factorOptions.includes("CH4 Running (hot)") && (
                                      <SelectItem value="CH4 Running (hot)">CH4 Running (hot)</SelectItem>
                                    )}
                                    {factorOptions.includes("CH4 Cold Start") && (
                                      <SelectItem value="CH4 Cold Start">CH4 Cold Start</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{selectedFactorUnit || "-"}</td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ""}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    if (raw === "") {
                                      updateUsaGasDieselCalculatorRow(row.id, { quantity: undefined });
                                      return;
                                    }
                                    const numeric = Number(raw);
                                    if (!Number.isNaN(numeric) && numeric >= 0) {
                                      updateUsaGasDieselCalculatorRow(row.id, { quantity: numeric });
                                    }
                                  }}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {rowEmissions !== null ? formatNumber(rowEmissions, 2) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => removeUsaGasDieselCalculatorRow(row.id)}
                                  disabled={usaGasDieselCalculatorRows.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-right">
                    <span className="text-sm text-teal-800 mr-2">
                      Total USA Gasoline and Diesel Vehicles Emissions:
                    </span>
                    <span className="text-lg font-bold text-teal-900">
                      {formatNumber(totalUsaGasDieselEmissions, 2)}
                    </span>
                  </div>
                </div>
              ) : activeCategory === "alternativeFuelVehicles" && loadingAlternativeFuel ? (
                <div className="text-sm text-gray-600">Loading alternative fuel vehicle factors...</div>
              ) : activeCategory === "alternativeFuelVehicles" && alternativeFuelError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {alternativeFuelError}
                </div>
              ) : activeCategory === "alternativeFuelVehicles" && alternativeFuelRows.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No data found in <span className="font-semibold">IPCC 3 ALTERNATIVE FUEL VEHICLES</span>. Please add
                  rows in Supabase.
                </div>
              ) : activeCategory === "alternativeFuelVehicles" ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Alternative Fuel Vehicles</h3>
                      <p className="text-sm text-gray-600 mt-1">Emissions = Quantity x selected factor</p>
                    </div>
                    <Button onClick={addAlternativeFuelRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Row
                    </Button>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[1250px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Vehicle Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Fuel</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">NO Emission 2 Factor</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">CH Emission 4 Factor</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Factor to Use</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Unit</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Quantity</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Emissions</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alternativeFuelCalculatorRows.map((row) => {
                          const fuelOptions = getAlternativeFuelsForVehicle(row.vehicleType);
                          const factorRow = getAlternativeFactorRow(row.vehicleType, row.fuel);
                          const factor = row.selectedFactor === "NO2" ? factorRow?.no2Factor : factorRow?.ch4Factor;
                          const rowEmissions =
                            typeof row.quantity === "number" && typeof factor === "number"
                              ? row.quantity * factor
                              : null;

                          return (
                            <tr key={row.id} className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40">
                              <td className="px-4 py-3">
                                <Select
                                  value={row.vehicleType}
                                  onValueChange={(value) =>
                                    updateAlternativeFuelRow(row.id, {
                                      vehicleType: value,
                                      fuel: undefined,
                                      selectedFactor: "NO2",
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableAlternativeVehicleTypes.map((vehicleType) => (
                                      <SelectItem key={vehicleType} value={vehicleType}>
                                        {vehicleType}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                <Select
                                  value={row.fuel}
                                  onValueChange={(value) => updateAlternativeFuelRow(row.id, { fuel: value })}
                                  disabled={!row.vehicleType}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select fuel" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {fuelOptions.map((fuel) => (
                                      <SelectItem key={fuel} value={fuel}>
                                        {fuel}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.no2Factor === "number" ? formatNumber(factorRow.no2Factor, 6) : "-"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {typeof factorRow?.ch4Factor === "number" ? formatNumber(factorRow.ch4Factor, 6) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Select
                                  value={row.selectedFactor}
                                  onValueChange={(value: "NO2" | "CH4") =>
                                    updateAlternativeFuelRow(row.id, { selectedFactor: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select factor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NO2">NO2</SelectItem>
                                    <SelectItem value="CH4">CH4</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{factorRow?.unit || "-"}</td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ""}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    if (raw === "") {
                                      updateAlternativeFuelRow(row.id, { quantity: undefined });
                                      return;
                                    }
                                    const numeric = Number(raw);
                                    if (!Number.isNaN(numeric) && numeric >= 0) {
                                      updateAlternativeFuelRow(row.id, { quantity: numeric });
                                    }
                                  }}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {rowEmissions !== null ? formatNumber(rowEmissions, 2) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => removeAlternativeFuelRow(row.id)}
                                  disabled={alternativeFuelCalculatorRows.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-right">
                    <span className="text-sm text-teal-800 mr-2">Total Alternative Fuel Vehicles Emissions:</span>
                    <span className="text-lg font-bold text-teal-900">
                      {formatNumber(totalAlternativeFuelEmissions, 2)}
                    </span>
                  </div>
                </div>
              ) : loadingEnergyIndustry ? (
                <div className="text-sm text-gray-600">Loading energy industries factors...</div>
              ) : energyIndustryError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {energyIndustryError}
                </div>
              ) : energyIndustryRows.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  No data found in{" "}
                  <span className="font-semibold">
                    {selectedIndustry === "MANUFACTURING INDUSTRIES AND CONSTRUCTION"
                      ? "IPCC 2 Manufacturing"
                      : selectedIndustry === "Commercial/Institutional"
                      ? "IPCC 2 Commercial/Institutional"
                      : selectedIndustry === "Residential and Agriculture/Forestry/Fishing/Fishing Farms"
                      ? "IPCC 2 RESIDENTIAL AND AGRICULTURE/FORESTRY/FISHING/FISHING FAR"
                      : selectedIndustry === "Utility Source"
                      ? "IPCC 2 Utility Sources"
                      : selectedIndustry === "Industrial Source"
                      ? "IPCC 2 Industrial"
                      : selectedIndustry === "Kilns, Ovens, and Dryers"
                      ? "IPCC 2 KILNS, OVENS, AND DRYERS"
                      : "IPCC 2 Energy"}
                  </span>
                  . Please add rows in Supabase.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-gray-100">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Energy Industries</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Select industry, then fuel data and quantity to calculate CO2e.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                        <SelectTrigger className="w-[260px]">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAP2_INDUSTRIES.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addEnergyCalculatorRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Row
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/40 to-emerald-50/30 px-4 py-3 text-xs text-teal-900">
                    Row emissions = Quantity x selected emission factor (CO2 / CH4 / NO2)
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
                    <table className="w-full min-w-[1300px]">
                      <thead className="bg-gray-900 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Fuel</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Sub Type</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">EF CO2</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">EF CH4</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">EF N2O</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Factor to Use</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Quantity</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Row Emissions</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {energyCalculatorRows.map((row) => {
                          const factorRow = getEnergyFactorRow(row.fuel, row.subType);
                          const requiresSubType = energyFuelRequiresSubType(row.fuel);
                          const factorOptions = getAvailableFactorOptions(factorRow);
                          const quantity = typeof row.quantity === "number" ? row.quantity : null;
                          const selectedFactor = getSelectedFactorValue(factorRow, row.selectedFactor);
                          const rowEmissions =
                            quantity !== null && typeof selectedFactor === "number"
                              ? quantity * selectedFactor
                              : null;

                          return (
                            <tr key={row.id} className="border-b border-gray-100 last:border-b-0 odd:bg-white even:bg-gray-50/40">
                              <td className="px-4 py-3">
                                <Select
                                  value={row.fuel}
                                  onValueChange={(value) =>
                                    updateEnergyCalculatorRow(row.id, {
                                      fuel: value,
                                      subType: undefined,
                                      selectedFactor: getDefaultFactorForSelection(value, undefined),
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select fuel" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableEnergyFuels.map((fuel) => (
                                      <SelectItem key={fuel} value={fuel}>
                                        {fuel}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                {requiresSubType ? (
                                  <Select
                                    value={row.subType}
                                    onValueChange={(value) =>
                                      updateEnergyCalculatorRow(row.id, {
                                        subType: value,
                                        selectedFactor: getDefaultFactorForSelection(row.fuel, value),
                                      })
                                    }
                                    disabled={!row.fuel}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select subtype" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {getEnergySubTypesForFuel(row.fuel).map((subType) => (
                                        <SelectItem key={subType} value={subType}>
                                          {subType}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="h-10 rounded-md border border-gray-200 bg-gray-50 px-3 flex items-center text-xs text-gray-500">
                                    Not required
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">{factorRow?.efCo2 !== null && factorRow?.efCo2 !== undefined ? formatNumber(factorRow.efCo2, 6) : "-"}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{factorRow?.efCh4 !== null && factorRow?.efCh4 !== undefined ? formatNumber(factorRow.efCh4, 6) : "-"}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{factorRow?.efN2o !== null && factorRow?.efN2o !== undefined ? formatNumber(factorRow.efN2o, 6) : "-"}</td>
                              <td className="px-4 py-3">
                                <Select
                                  value={row.selectedFactor}
                                  onValueChange={(value: FactorKey) =>
                                    updateEnergyCalculatorRow(row.id, { selectedFactor: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select factor" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {factorOptions.includes("CO2") && <SelectItem value="CO2">CO2</SelectItem>}
                                    {factorOptions.includes("CH4") && <SelectItem value="CH4">CH4</SelectItem>}
                                    {factorOptions.includes("NO2") && <SelectItem value="NO2">NO2</SelectItem>}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={row.quantity ?? ""}
                                  onChange={(event) => {
                                    const raw = event.target.value;
                                    if (raw === "") {
                                      updateEnergyCalculatorRow(row.id, { quantity: undefined });
                                      return;
                                    }
                                    const numeric = Number(raw);
                                    if (!Number.isNaN(numeric) && numeric >= 0) {
                                      updateEnergyCalculatorRow(row.id, { quantity: numeric });
                                    }
                                  }}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                {rowEmissions !== null ? formatNumber(rowEmissions, 2) : "-"}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => removeEnergyCalculatorRow(row.id)}
                                  disabled={energyCalculatorRows.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-right">
                    <span className="text-sm text-teal-800 mr-2">Total Industry Emissions:</span>
                    <span className="text-lg font-bold text-teal-900">
                      {formatNumber(totalEnergyIndustryEmissions, 2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default EmissionCalculatorIPCC;



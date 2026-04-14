import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { Plus, Trash2, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FuelRow, 
  FuelType,
  UkFactorBasis,
} from "../shared/types";
import { 
  newFuelRow,
  fuelRowChanged
} from "../shared/utils";
import { formatDynamicEmission } from "./emissionFormatting";

type OutputUnit = "kg" | "tonnes" | "g" | "short_ton";

interface FuelEmissionsProps {
  onDataChange: (data: FuelRow[]) => void;
  companyContext?: boolean; // Add company context prop
  counterpartyId?: string; // Add counterparty ID for company-specific data
  onSaveAndNext?: () => void;
  /** Override section title (e.g. "Heat and Steam" for Scope 1 Heat and Steam) */
  sectionTitle?: string;
  /** Override section description */
  sectionDescription?: string;
  /** When "scope1HeatSteam", same form as Fuel but no DB persist; uses draft only */
  variant?: "fuel" | "scope1HeatSteam";
  /** Select where factor options come from for this screen */
  factorMode?: "epa" | "uk_supabase";
}

type UkFactorCell = { total?: number; co2?: number; ch4?: number; n2o?: number };
type UkFactorsMap = Record<string, Record<string, Record<string, UkFactorCell>>>;
/** Nested fuel map from EPA Supabase tables (Fuel EPA 1/2/3). */
type EpaFuelFactorsMap = Record<string, Record<string, Record<string, number>>>;

/** Order matches UK conversion tables: total, then CO2 / CH4 / N2O components (all per activity unit). */
const UK_BASIS_ORDER: UkFactorBasis[] = ["total", "co2", "ch4", "n2o"];

const UK_BASIS_LABEL: Record<UkFactorBasis, string> = {
  total: "kg CO2e",
  co2: "kg CO2e of CO2 per unit",
  ch4: "kg CO2e of CH4 per unit",
  n2o: "kg CO2e of N2O per unit",
};

function ukBasisValue(cell: UkFactorCell | undefined, basis: UkFactorBasis): number | undefined {
  if (!cell) return undefined;
  const v = basis === "total" ? cell.total : basis === "co2" ? cell.co2 : basis === "ch4" ? cell.ch4 : cell.n2o;
  return typeof v === "number" && isFinite(v) ? v : undefined;
}

/** Only bases that exist in the reference row (so the dropdown matches your sheet). */
function availableUkBasises(cell: UkFactorCell | undefined): UkFactorBasis[] {
  if (!cell) return [];
  return UK_BASIS_ORDER.filter((b) => ukBasisValue(cell, b) !== undefined);
}

function ukFactorBasisFromDb(raw: unknown): UkFactorBasis | undefined {
  if (raw === "total" || raw === "co2" || raw === "ch4" || raw === "n2o") return raw;
  return undefined;
}

const FuelEmissions: React.FC<FuelEmissionsProps> = ({
  onDataChange,
  companyContext = false,
  counterpartyId,
  onSaveAndNext,
  sectionTitle = "Fuel Entries",
  sectionDescription = "",
  variant = "fuel",
  factorMode = "epa",
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const userId = user?.id || null;
  const [rows, setRows] = useState<FuelRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<FuelRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fuelFactors, setFuelFactors] = useState<EpaFuelFactorsMap | null>(null);
  const [ukFactorsMap, setUkFactorsMap] = useState<UkFactorsMap>({});
  /** UK mode only: false until Supabase UK reference fetch finishes (success or error). */
  const [ukReferenceReady, setUkReferenceReady] = useState(factorMode !== "uk_supabase");
  const [outputUnit, setOutputUnit] = useState<OutputUnit>("kg");
  const [initialOutputUnit, setInitialOutputUnit] = useState<OutputUnit>("kg");
  const hasRestoredDraftRef = useRef(false);

  const getDraftKey = () => {
    const suffix = variant === "scope1HeatSteam" ? "scope1HeatSteam" : "fuel";
    if (companyContext && counterpartyId) {
      return `fuelEmissionsDraft:${suffix}:company:${counterpartyId}:${user?.id || "anon"}`;
    }
    if (user?.id) {
      return `fuelEmissionsDraft:${suffix}:user:${user.id}`;
    }
    return `fuelEmissionsDraft:${suffix}:anon`;
  };

  const effectiveFactors: EpaFuelFactorsMap = fuelFactors ?? {};

  const isUkActive = factorMode === "uk_supabase" && Object.keys(ukFactorsMap).length > 0;
  const fuelFramework: "uk" | "epa" = factorMode === "uk_supabase" ? "uk" : "epa";

  const applyFuelFrameworkFilter = (query: any) => {
    if (fuelFramework === "uk") return query.eq("emission_framework", "uk");
    // Legacy rows before framework tagging are treated as EPA.
    return query.or("emission_framework.eq.epa,emission_framework.is.null");
  };

  const types = useMemo(() => {
    if (isUkActive) return Object.keys(ukFactorsMap).sort((a, b) => a.localeCompare(b));
    return Object.keys(effectiveFactors) as FuelType[];
  }, [isUkActive, ukFactorsMap, effectiveFactors]);

  const fuelsFor = (type?: FuelType) => {
    if (!type) return [];
    if (isUkActive) return Object.keys(ukFactorsMap[type] || {}).sort((a, b) => a.localeCompare(b));
    return Object.keys(effectiveFactors[type] || {});
  };

  const unitsFor = (type?: FuelType, fuel?: string) => {
    if (!type || !fuel) return [];
    if (isUkActive) return Object.keys(ukFactorsMap[type]?.[fuel] || {}).sort((a, b) => a.localeCompare(b));
    return Object.keys((effectiveFactors[type] || {})[fuel] || {});
  };

  /** When Activity/Fuel/Unit or the UK map changes, align saved basis with columns that exist for that row. */
  const ukRowIdentityKey = useMemo(
    () =>
      rows
        .map((r) => `${r.id}|${r.type ?? ""}|${r.fuel ?? ""}|${r.unit ?? ""}|${r.ukFactorBasis ?? ""}`)
        .join(";"),
    [rows]
  );

  useLayoutEffect(() => {
    if (!isUkActive) return;
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        if (!r.type || !r.fuel || !r.unit) return r;
        const cell = ukFactorsMap[r.type]?.[r.fuel]?.[r.unit];
        if (!cell) return r;
        const avail = availableUkBasises(cell);
        if (avail.length === 0) return r;
        const preferred = r.ukFactorBasis || "total";
        const basis = avail.includes(preferred) ? preferred : avail[0];
        if (basis !== (r.ukFactorBasis || "total")) {
          changed = true;
          const factor = ukBasisValue(cell, basis);
          const emissions =
            typeof r.quantity === "number" && factor !== undefined
              ? Number((r.quantity * factor).toFixed(6))
              : undefined;
          return { ...r, ukFactorBasis: basis, factor, emissions };
        }
        return r;
      });
      return changed ? next : prev;
    });
  }, [isUkActive, ukFactorsMap, ukRowIdentityKey]);

  const parseNumber = (value: any): number | undefined => {
    if (typeof value === "number") return isFinite(value) ? value : undefined;
    if (value == null) return undefined;
    const cleaned = String(value).replace(/,/g, "");
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : undefined;
  };

  const formatEmission = (raw: number): string => {
    if (!isFinite(raw)) return "";
    return formatDynamicEmission(raw);
  };

  const convertEmission = (value?: number): string => {
    if (value == null) return "";
    let converted = value;
    switch (outputUnit) {
      case "kg":
        converted = value;
        break;
      case "tonnes":
        converted = value / 1000;
        break;
      case "g":
        converted = value * 1000;
        break;
      case "short_ton":
        converted = value / 907.18474;
        break;
      default:
        converted = value;
    }
    return formatEmission(converted);
  };

  const convertEmissionNumeric = (value: number | undefined, unit: OutputUnit): number | undefined => {
    if (value == null || !isFinite(value)) return undefined;
    let converted = value;
    switch (unit) {
      case "kg":
        converted = value;
        break;
      case "tonnes":
        converted = value / 1000;
        break;
      case "g":
        converted = value * 1000;
        break;
      case "short_ton":
        converted = value / 907.18474;
        break;
      default:
        converted = value;
    }
    return Number(converted.toFixed(6));
  };

  // Load fuel factor reference data:
  // - uk_supabase: public.UK_Fuel_Factors (Activity, Fuel, Unit, kg CO2e columns)
  // - epa: "Fuel EPA 1" / "Fuel EPA 2" / "Fuel EPA 3"
  useEffect(() => {
    if (factorMode === "uk_supabase") {
      setFuelFactors(null);
      setUkReferenceReady(false);
      const loadUk = async () => {
        try {
          let data: any[] | null = null;
          let error: any = null;
          const primary = await (supabase as any).from("UK_Fuel_Factors").select("*");
          if (!primary.error && primary.data?.length) {
            data = primary.data;
          } else {
            const fallback = await (supabase as any).from("uk_fuel_factors").select("*");
            if (!fallback.error && fallback.data?.length) {
              data = fallback.data;
            } else {
              error = primary.error || fallback.error;
            }
          }
          if (error) {
            console.error("Error loading UK_Fuel_Factors:", error);
            toast({
              title: "UK fuel factors",
              description: error.message || "Could not load UK_Fuel_Factors.",
              variant: "destructive",
            });
            setUkFactorsMap({});
            return;
          }
          const tableRows = data ?? [];
          if (tableRows.length === 0) {
            console.warn("UK_Fuel_Factors returned no rows");
            setUkFactorsMap({});
            return;
          }

          const map: UkFactorsMap = {};
          for (const row of tableRows as any[]) {
            const activity = String(row.Activity ?? row.activity ?? "").trim();
            const fuel = String(row.Fuel ?? row.fuel ?? "").trim();
            const unit = String(row.Unit ?? row.unit ?? "").trim();
            if (!activity || !fuel || !unit) continue;

            const total = parseNumber(
              row["kg CO2e"] ?? row.kg_co2e ?? row.kgCO2e ?? row["Kg CO2e"]
            );
            const co2 = parseNumber(
              row["kg CO2e of CO2 per unit"] ??
                row.kg_co2e_of_co2_per_unit ??
                row["kg_co2e_of_co2_per_unit"]
            );
            const ch4 = parseNumber(
              row["kg CO2e of CH4 per unit"] ??
                row.kg_co2e_of_ch4_per_unit ??
                row["kg_co2e_of_ch4_per_unit"]
            );
            const n2o = parseNumber(
              row["kg CO2e of N2O per unit"] ??
                row.kg_co2e_of_n2o_per_unit ??
                row["kg_co2e_of_n2o_per_unit"]
            );

            if (!map[activity]) map[activity] = {};
            if (!map[activity][fuel]) map[activity][fuel] = {};
            const prev = map[activity][fuel][unit] || {};
            map[activity][fuel][unit] = {
              ...prev,
              ...(total !== undefined ? { total } : {}),
              ...(co2 !== undefined ? { co2 } : {}),
              ...(ch4 !== undefined ? { ch4 } : {}),
              ...(n2o !== undefined ? { n2o } : {}),
            };
          }

          if (Object.keys(map).length === 0) {
            console.warn("UK_Fuel_Factors had no parseable rows");
            setUkFactorsMap({});
            return;
          }

          setUkFactorsMap(map);
        } catch (err) {
          console.error("Unexpected error loading UK_Fuel_Factors:", err);
          setUkFactorsMap({});
        } finally {
          setUkReferenceReady(true);
        }
      };
      void loadUk();
      return;
    }

    setUkFactorsMap({});
    setUkReferenceReady(true);
    const loadFuelFactors = async () => {
      try {
        const tableNames = ["Fuel EPA 1", "Fuel EPA 2", "Fuel EPA 3"];
        const allRows: any[] = [];

        for (const table of tableNames) {
          const { data, error } = await supabase.from(table as any).select("*");
          if (error) {
            console.error(`Error loading ${table} factors:`, error);
            continue;
          }
          if (data && data.length > 0) {
            allRows.push(...data);
          }
        }

        if (allRows.length === 0) {
          console.warn("Fuel EPA 1/2/3 tables returned no rows");
          return;
        }

        const map: EpaFuelFactorsMap = {};

        allRows.forEach((row: any) => {
          const category: string | undefined =
            row.Category ?? row.category ?? row["Fuel Category"] ?? row.fuel_category;
          const fuel: string | undefined =
            row["Fuel Type"] ?? row.Fuel ?? row.fuel_type ?? row.fuel;
          if (!category || !fuel) return;

          // Heat content and unit (used to derive MMSCF from mmBtu when HHV is per scf)
          const hhv = parseNumber(
            row["Heat Content (HHV)"] ??
              row["Heat Content"] ??
              row.HeatContent ??
              row.heat_content_hhv ??
              row.hhv
          );
          const hhvUnitRaw =
            row["HHV Unit"] ?? row["HIV Unit"] ?? row.hhv_unit ?? row.hiv_unit ?? row.heat_content_unit;
          const hhvUnit = typeof hhvUnitRaw === "string" ? hhvUnitRaw.toLowerCase() : "";
          const isScfBasedHHV = hhv != null && hhvUnit.includes("scf");

          // First set: CO2/CH4/N2O Factor + Unit (Unit says "per mmBtu")
          const co2Unit = String(row["CO2 Unit"] ?? "").toLowerCase();
          const ch4Unit = String(row["CH4 Unit"] ?? "").toLowerCase();
          const n2oUnitFirst = String(row["N20 Unit"] ?? row["N2O Unit"] ?? "").toLowerCase(); // N20 typo in Fuel EPA 1
          const useFirstSetMmbtu = co2Unit.includes("mmbtu");

          const co2PerMmbtu = useFirstSetMmbtu ? parseNumber(row["CO2 Factor"]) : undefined;
          const ch4PerMmbtu = ch4Unit.includes("mmbtu") ? parseNumber(row["CH4 Factor"]) : undefined;
          const n2oPerMmbtu = n2oUnitFirst.includes("mmbtu") ? parseNumber(row["N2O Factor"]) : undefined;

          // Second set: Factor_1 + Unit_1 (Unit_1 can be "per short ton", "per scf", "per gallon")
          const co2Unit1 = String(row["CO2 Unit_1"] ?? "").toLowerCase();
          const ch4Unit1 = String(row["CH4 Unit_1"] ?? "").toLowerCase();
          const n2oUnit1 = String(row["N2O Unit_1"] ?? row["N2O Unit"] ?? "").toLowerCase(); // EPA 1 has no N2O Unit_1
          const co2Factor1 = parseNumber(row["CO2 Factor_1"]);
          const ch4Factor1 = parseNumber(row["CH4 Factor_1"]);
          const n2oFactor1 = parseNumber(row["N2O Factor_1"]);

          if (!map[category]) map[category] = {};
          if (!map[category][fuel]) map[category][fuel] = {};
          const fuelMap = map[category][fuel];

          // mmBtu factors (first set)
          if (co2PerMmbtu !== undefined) {
            fuelMap["CO2 (kg CO2 / mmBtu)"] = co2PerMmbtu;
            if (isScfBasedHHV) {
              const factorPerMMSCF = co2PerMmbtu * hhv! * 1_000_000;
              fuelMap["CO2 (kg CO2 / MMSCF)"] = factorPerMMSCF;
            }
          }
          if (ch4PerMmbtu !== undefined) {
            fuelMap["CH4 (g CH4 / mmBtu)"] = ch4PerMmbtu;
            if (isScfBasedHHV) {
              fuelMap["CH4 (g CH4 / MMSCF)"] = ch4PerMmbtu * hhv! * 1_000_000;
            }
          }
          if (n2oPerMmbtu !== undefined) {
            fuelMap["N2O (g N2O / mmBtu)"] = n2oPerMmbtu;
            if (isScfBasedHHV) {
              fuelMap["N2O (g N2O / MMSCF)"] = n2oPerMmbtu * hhv! * 1_000_000;
            }
          }

          // Second set: short ton (Factor_1 when Unit_1 contains "short ton")
          if (co2Unit1.includes("short ton") && co2Factor1 !== undefined) {
            fuelMap["CO2 (kg CO2 / short ton)"] = co2Factor1;
          }
          if (ch4Unit1.includes("short ton") && ch4Factor1 !== undefined) {
            fuelMap["CH4 (g CH4 / short ton)"] = ch4Factor1;
          }
          if (n2oUnit1.includes("short ton") && n2oFactor1 !== undefined) {
            fuelMap["N2O (g N2O / short ton)"] = n2oFactor1;
          }

          // Second set: per scf → derive MMSCF (factor per scf * 1e6 = per MMSCF), when not already set from mmBtu
          if (co2Unit1.includes("scf") && co2Factor1 !== undefined && fuelMap["CO2 (kg CO2 / MMSCF)"] == null) {
            fuelMap["CO2 (kg CO2 / MMSCF)"] = co2Factor1 * 1_000_000;
          }
          if (ch4Unit1.includes("scf") && ch4Factor1 !== undefined && fuelMap["CH4 (g CH4 / MMSCF)"] == null) {
            fuelMap["CH4 (g CH4 / MMSCF)"] = ch4Factor1 * 1_000_000;
          }
          if (n2oUnit1.includes("scf") && n2oFactor1 !== undefined && fuelMap["N2O (g N2O / MMSCF)"] == null) {
            fuelMap["N2O (g N2O / MMSCF)"] = n2oFactor1 * 1_000_000;
          }

          // Second set: per gallon (optional)
          if (co2Unit1.includes("gallon") && co2Factor1 !== undefined) {
            fuelMap["CO2 (kg CO2 / gallon)"] = co2Factor1;
          }
          if (ch4Unit1.includes("gallon") && ch4Factor1 !== undefined) {
            fuelMap["CH4 (g CH4 / gallon)"] = ch4Factor1;
          }
          if (n2oUnit1.includes("gallon") && n2oFactor1 !== undefined) {
            fuelMap["N2O (g N2O / gallon)"] = n2oFactor1;
          }
        });

        if (Object.keys(map).length > 0) {
          console.log("Loaded Fuel EPA 1/2/3 factors from Supabase:", map);
          setFuelFactors(map);
        }
      } catch (err) {
        console.error("Unexpected error loading Fuel EPA factors:", err);
      }
    };

    void loadFuelFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per factorMode; toast stable enough
  }, [factorMode]);

  // When UK reference data loads, refresh factors/emissions on all rows
  useEffect(() => {
    if (!isUkActive) return;
    setRows((prev) =>
      prev.map((r) => {
        if (!r.type || !r.fuel || !r.unit) return r;
        const cell = ukFactorsMap[r.type]?.[r.fuel]?.[r.unit];
        if (!cell) return { ...r, factor: undefined, emissions: undefined };
        const avail = availableUkBasises(cell);
        let basis: UkFactorBasis = r.ukFactorBasis || "total";
        if (avail.length > 0 && !avail.includes(basis)) {
          basis = avail[0];
        }
        const factor = ukBasisValue(cell, basis);
        let emissions: number | undefined;
        if (typeof r.quantity === "number" && factor !== undefined) {
          emissions = Number((r.quantity * factor).toFixed(6));
        }
        return { ...r, ukFactorBasis: basis, factor, emissions };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ukFactorsMap, isUkActive]);

  // Load existing entries
  useEffect(() => {
    const loadExistingEntries = async () => {
      if (!userId) return;

      // Scope 1 Heat and Steam variant: load from scope1_heatsteam_entries_epa
      if (variant === "scope1HeatSteam") {
        try {
          let q = (supabase as any)
            .from("scope1_heatsteam_entries_epa")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
          if (companyContext && counterpartyId) q = q.eq("counterparty_id", counterpartyId);
          else q = q.is("counterparty_id", null);
          const { data: heatData, error: heatError } = await q;
          if (heatError) throw heatError;
          const heatRows = (heatData || []).map((entry: any) => ({
            id: crypto.randomUUID(),
            dbId: entry.id,
            type: entry.fuel_type_group as FuelType,
            fuel: entry.fuel,
            unit: entry.unit,
            quantity: entry.quantity,
            factor: entry.factor,
            emissions: entry.emissions,
            isExisting: true,
          }));
          setExistingEntries(heatRows);
          setRows(heatRows.length > 0 ? heatRows : []);
          if (heatRows.length > 0) {
            onDataChange(heatRows);
            const u = String(heatData?.[0]?.emissions_output_unit || "") as OutputUnit;
            if (u === "kg" || u === "tonnes" || u === "g" || u === "short_ton") {
              setOutputUnit(u);
              setInitialOutputUnit(u);
            }
          }
        } catch (err: any) {
          console.error("Error loading Scope 1 Heat and Steam entries:", err);
          toast({ title: "Error", description: "Failed to load Heat and Steam entries", variant: "destructive" });
        }
        setIsInitialLoad(false);
        return;
      }

      // Load company-specific data when in company context
      if (companyContext && counterpartyId) {
        console.log('Company context detected - loading company-specific fuel entries for:', counterpartyId);
        
        try {
          // Load company-specific fuel entries (supabase cast to avoid TS "excessively deep" inference on schema)
          const fuelQuery = applyFuelFrameworkFilter(
            (supabase as any)
              .from('scope1_fuel_entries')
              .select('*')
              .eq('user_id', userId)
              .eq('counterparty_id', counterpartyId)
          ).order('created_at', { ascending: false });

          const { data: fuelData, error: fuelError } = await fuelQuery;

          if (fuelError) throw fuelError;

          const companyFuelRows = (fuelData || []).map((entry: any) => ({
            id: crypto.randomUUID(),
            dbId: entry.id,
            type: entry.fuel_type_group as FuelType,
            fuel: entry.fuel,
            unit: entry.unit,
            quantity: entry.quantity,
            factor: entry.factor,
            emissions: entry.emissions,
            ukFactorBasis: ukFactorBasisFromDb(entry.uk_factor_basis),
            isExisting: true,
          }));

          setExistingEntries(companyFuelRows);
          setRows(companyFuelRows.length > 0 ? companyFuelRows : []);
          onDataChange(companyFuelRows);

          // Align output unit with existing company entries, if present
          if (companyFuelRows.length > 0) {
            const u = String((fuelData![0] as any).emissions_output_unit || "") as OutputUnit;
            if (u === "kg" || u === "tonnes" || u === "g" || u === "short_ton") {
              setOutputUnit(u);
              setInitialOutputUnit(u);
            }
          }
          console.log(`Loaded ${companyFuelRows.length} company-specific fuel entries`);
        } catch (error) {
          console.error('Error loading company fuel entries:', error);
          // Fallback to blank form on error
          setRows([]);
          setExistingEntries([]);
          onDataChange([]);
        }
        
        setIsInitialLoad(false);
        return;
      }

      // Skip loading data when in company context but no counterpartyId
      if (companyContext && !counterpartyId) {
        console.log('Company context detected but no counterpartyId - starting with blank fuel form');
        setRows([]);
        setExistingEntries([]);
        onDataChange([]);
        setIsInitialLoad(false);
        return;
      }

      // Load personal data for individual use
      try {
        const fuelQuery = applyFuelFrameworkFilter(
          (supabase as any)
            .from('scope1_fuel_entries')
            .select('*')
            .eq('user_id', userId)
            .is('counterparty_id', null) // Only personal entries (no counterparty_id)
        ).order('created_at', { ascending: false });

        const { data: fuelData, error: fuelError } = await fuelQuery;

        if (fuelError) throw fuelError;

        const existingFuelRows = (fuelData || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          type: entry.fuel_type_group as FuelType,
          fuel: entry.fuel,
          unit: entry.unit,
          quantity: entry.quantity,
          factor: entry.factor,
          emissions: entry.emissions,
          ukFactorBasis: ukFactorBasisFromDb(entry.uk_factor_basis),
          isExisting: true,
        }));

        setExistingEntries(existingFuelRows);
        setRows(existingFuelRows.length > 0 ? existingFuelRows : []);

        if (existingFuelRows.length > 0) {
          onDataChange(existingFuelRows);
          const u = String((fuelData![0] as any).emissions_output_unit || "") as OutputUnit;
          if (u === "kg" || u === "tonnes" || u === "g" || u === "short_ton") {
            setOutputUnit(u);
            setInitialOutputUnit(u);
          }
        }
      } catch (error: any) {
        console.error('Error loading existing entries:', error);
        toast({ 
          title: "Error", 
          description: "Failed to load existing entries", 
          variant: "destructive" 
        });
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadExistingEntries();
  }, [userId, toast, companyContext, counterpartyId, variant, factorMode]);

  // Notify parent of data changes
  useEffect(() => {
    if (!isInitialLoad) {
      onDataChange(rows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, isInitialLoad]);

  // Restore unsaved draft rows from sessionStorage after initial DB load completes
  useEffect(() => {
    if (isInitialLoad || hasRestoredDraftRef.current) return;

    try {
      const key = getDraftKey();
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        hasRestoredDraftRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw);
      const recentEnough =
        typeof parsed?.ts === "number" ? Date.now() - parsed.ts < 1000 * 60 * 60 * 24 : true; // 24h window

      if (!recentEnough) {
        sessionStorage.removeItem(key);
        hasRestoredDraftRef.current = true;
        return;
      }

      const draftRows = Array.isArray(parsed.rows) ? parsed.rows : [];
      if (draftRows.length > 0) {
        setRows((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const mergedDraft = draftRows
            .filter((r: any) => r && r.id && !existingIds.has(r.id))
            .map((r: any) => ({
              ...r,
              isExisting: false,
            }));
          return mergedDraft.length > 0 ? [...prev, ...mergedDraft] : prev;
        });
        // onDataChange will be triggered by rows effect above
      }
    } catch (e) {
      console.warn("Failed to restore FuelEmissions draft from sessionStorage:", e);
    } finally {
      hasRestoredDraftRef.current = true;
    }
    // We intentionally omit getDraftKey from deps to keep key stable per context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad, companyContext, counterpartyId, user]);

  // Persist unsaved draft rows (non-existing rows) to sessionStorage
  useEffect(() => {
    if (isInitialLoad || !hasRestoredDraftRef.current) return;

    try {
      const key = getDraftKey();
      const draftRows = rows.filter((r) => !r.isExisting);
      if (draftRows.length === 0) {
        sessionStorage.removeItem(key);
        return;
      }

      const payload = {
        rows: draftRows,
        outputUnit,
        ts: Date.now(),
      };
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to persist FuelEmissions draft to sessionStorage:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, outputUnit, isInitialLoad, companyContext, counterpartyId, user]);

  // Row management functions
  const addRow = () => setRows(prev => [...prev, newFuelRow()]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

   // Update functions
  const updateRow = (id: string, patch: Partial<FuelRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: FuelRow = { ...r, ...patch };
      let factor: number | undefined;

      if (isUkActive && next.type && next.fuel && next.unit) {
        const cell = ukFactorsMap[next.type]?.[next.fuel]?.[next.unit];
        if (cell) {
          const avail = availableUkBasises(cell);
          let basis: UkFactorBasis = next.ukFactorBasis || "total";
          if (avail.length > 0 && !avail.includes(basis)) {
            basis = avail[0];
            next.ukFactorBasis = basis;
          }
          factor = ukBasisValue(cell, basis);
        }
      } else if (next.type && next.fuel && next.unit) {
        const f = effectiveFactors[next.type]?.[next.fuel]?.[next.unit];
        factor = typeof f === "number" ? f : undefined;
      } else {
        factor = undefined;
      }

      next.factor = factor;

      // UK factors are already kg CO2e (or kg CO2e per component) per activity unit; EPA CH4/N2O use g/unit → kg of that gas.
      if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
        const raw = next.quantity * next.factor;
        const isGPerUnit =
          !isUkActive &&
          typeof next.unit === 'string' &&
          (next.unit.startsWith('CH4') || next.unit.startsWith('N2O'));
        next.emissions = Number((isGPerUnit ? raw / 1000 : raw).toFixed(6));
      } else {
        next.emissions = undefined;
      }
      return next;
    }));
  };

  // Delete functions
  const deleteExistingRow = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row || !row.dbId) return;

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingRows(prev => new Set(prev).add(id));
    try {
      const { error } = await (supabase as any)
        .from('scope1_fuel_entries')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setRows(prev => prev.filter(r => r.id !== id));
      setExistingEntries(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save functions
  const saveFuelEntries = async () => {
    if (variant === "scope1HeatSteam") {
      if (!user) {
        toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
        return;
      }
      const table = "scope1_heatsteam_entries_epa";
      // Coerce quantity/factor so draft or string inputs still qualify; allow factor derived from emissions/quantity
      const newEntries = rows.filter((r) => {
        if (r.isExisting) return false;
        if (!r.type || !r.fuel || !r.unit) return false;
        const q = typeof r.quantity === "number" ? r.quantity : parseFloat(String(r.quantity ?? ""));
        if (Number.isNaN(q) || q < 0) return false;
        let f = typeof r.factor === "number" ? r.factor : parseFloat(String(r.factor ?? ""));
        if (Number.isNaN(f) || f < 0) {
          const em = typeof r.emissions === "number" ? r.emissions : parseFloat(String(r.emissions ?? ""));
          if (!Number.isNaN(em) && q > 0) f = em / q;
          else return false;
        }
        return true;
      });
      const changedExisting = rows.filter((r) => r.isExisting && r.dbId && fuelRowChanged(r, existingEntries));
      const unitChanged = outputUnit !== initialOutputUnit;
      if (!unitChanged && newEntries.length === 0 && changedExisting.length === 0) {
        toast({ title: "Nothing to save", description: "No new or changed Heat and Steam entries." });
        return;
      }
      setSaving(true);
      try {
        const payload = newEntries.map((v) => {
          const q = typeof v.quantity === "number" ? v.quantity : parseFloat(String(v.quantity ?? "")) || 0;
          let f = typeof v.factor === "number" ? v.factor : parseFloat(String(v.factor ?? ""));
          if (Number.isNaN(f) && typeof v.emissions === "number" && q > 0) f = v.emissions / q;
          const em = typeof v.emissions === "number" ? v.emissions : (q * (Number.isNaN(f) ? 0 : f));
          return {
            user_id: user.id,
            counterparty_id: companyContext ? counterpartyId ?? null : null,
            fuel_type_group: v.type!,
            fuel: v.fuel!,
            unit: v.unit!,
            quantity: Number(q),
            factor: Number(f),
            emissions: Number(em),
            emissions_output: convertEmissionNumeric(em, outputUnit),
            emissions_output_unit: outputUnit,
          };
        });
        if (payload.length > 0) {
          const { data: inserted, error } = await (supabase as any).from(table).insert(payload).select("id");
          if (error) throw error;
          if (!inserted?.length && payload.length > 0) {
            console.warn("Scope 1 Heat and Steam insert returned no rows; table may not exist or RLS may block insert.");
          }
        }
        const rowsToUpdate = unitChanged
          ? rows.filter((r) => r.isExisting && r.dbId && typeof r.emissions === "number")
          : changedExisting;
        if (rowsToUpdate.length > 0) {
          const updates = rowsToUpdate.map((v) =>
            (supabase as any)
              .from(table)
              .update({
                fuel_type_group: v.type!,
                fuel: v.fuel!,
                unit: v.unit!,
                quantity: v.quantity!,
                factor: v.factor!,
                emissions: v.emissions!,
                emissions_output: convertEmissionNumeric(v.emissions, outputUnit),
                emissions_output_unit: outputUnit,
              })
              .eq("id", v.dbId!)
          );
          const results = await Promise.all(updates);
          const updateError = results.find((r: any) => r.error)?.error;
          if (updateError) throw updateError;
        }
        toast({
          title: "Saved",
          description:
            unitChanged && newEntries.length === 0 && changedExisting.length === 0
              ? "Updated output unit for existing Heat and Steam entries."
              : `Saved ${newEntries.length} new and updated ${changedExisting.length} Heat and Steam entries.`,
        });
        try {
          const key = getDraftKey();
          sessionStorage.removeItem(key);
        } catch {}
        let reloadQ = (supabase as any).from(table).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (companyContext && counterpartyId) reloadQ = reloadQ.eq("counterparty_id", counterpartyId);
        else reloadQ = reloadQ.is("counterparty_id", null);
        const { data: newData } = await reloadQ;
        const updatedRows = (newData || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          type: entry.fuel_type_group as FuelType,
          fuel: entry.fuel,
          unit: entry.unit,
          quantity: entry.quantity,
          factor: entry.factor,
          emissions: entry.emissions,
          isExisting: true,
        }));
        setExistingEntries(updatedRows);
        setRows(updatedRows);
        onDataChange(updatedRows);
      } catch (e: any) {
        const msg = e?.message || e?.error_description || String(e);
        console.error("Scope 1 Heat and Steam save error:", e);
        toast({ title: "Error", description: msg || "Failed to save Heat and Steam entries. Run the migration for scope1_heatsteam_entries_epa if the table is missing.", variant: "destructive" });
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = rows.filter(r => 
      r.type && r.fuel && r.unit && 
      typeof r.quantity === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );

    const changedExisting = rows.filter(r => r.isExisting && r.dbId && fuelRowChanged(r, existingEntries));

    const unitChanged = outputUnit !== initialOutputUnit;

    if (!unitChanged && newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed fuel entries." });
      return;
    }

    setSaving(true);
    try {
      const payload = newEntries.map((v) => ({
        user_id: user.id,
        counterparty_id: companyContext ? counterpartyId : null, // Add counterparty_id for company entries
        emission_framework: fuelFramework,
        fuel_type_group: v.type!,
        fuel: v.fuel!,
        unit: v.unit!,
        quantity: v.quantity!,
        factor: v.factor!,
        emissions: v.emissions!,
        emissions_output: convertEmissionNumeric(v.emissions, outputUnit),
        emissions_output_unit: outputUnit,
        ...(factorMode === "uk_supabase"
          ? { uk_factor_basis: v.ukFactorBasis || "total" }
          : {}),
      }));

      if (payload.length > 0) {
        const { error } = await (supabase as any).from('scope1_fuel_entries').insert(payload);
        if (error) throw error;
      }

      // Rows that need updating in the DB
      const rowsToUpdate = unitChanged
        ? rows.filter(r => r.isExisting && r.dbId && typeof r.emissions === 'number')
        : changedExisting;

      if (rowsToUpdate.length > 0) {
        const updates = rowsToUpdate.map(v => (
          (supabase as any)
            .from('scope1_fuel_entries')
            .update({
              emission_framework: fuelFramework,
              fuel_type_group: v.type!,
              fuel: v.fuel!,
              unit: v.unit!,
              quantity: v.quantity!,
              factor: v.factor!,
              emissions: v.emissions!,
              emissions_output: convertEmissionNumeric(v.emissions, outputUnit),
              emissions_output_unit: outputUnit,
              ...(factorMode === "uk_supabase"
                ? { uk_factor_basis: v.ukFactorBasis || "total" }
                : {}),
            })
            .eq('id', v.dbId!)
        ));
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: unitChanged && newEntries.length === 0 && changedExisting.length === 0
          ? "Updated output unit for existing fuel entries."
          : `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      // Clear any stale draft now that rows are persisted
      try {
        const key = getDraftKey();
        sessionStorage.removeItem(key);
      } catch {}

      // Reload only the current context to avoid mixing personal/company rows.
      let reloadQ = (supabase as any)
        .from('scope1_fuel_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (companyContext && counterpartyId) {
        reloadQ = reloadQ.eq('counterparty_id', counterpartyId);
      } else {
        reloadQ = reloadQ.is('counterparty_id', null);
      }
      reloadQ = applyFuelFrameworkFilter(reloadQ);
      const { data: newData } = await reloadQ;

      if (newData) {
        const updatedExistingRows = newData.map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          type: entry.fuel_type_group as FuelType,
          fuel: entry.fuel,
          unit: entry.unit,
          quantity: entry.quantity,
          factor: entry.factor,
          emissions: entry.emissions,
          ukFactorBasis: ukFactorBasisFromDb(entry.uk_factor_basis),
          isExisting: true,
        }));
        setExistingEntries(updatedExistingRows);
        setRows(updatedExistingRows);

        if (updatedExistingRows.length > 0) {
          const u = String((newData[0] as any).emissions_output_unit || "") as OutputUnit;
          if (u === "kg" || u === "tonnes" || u === "g" || u === "short_ton") {
            setOutputUnit(u);
            setInitialOutputUnit(u);
          }
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const gridCols = isUkActive ? "md:grid-cols-5" : "md:grid-cols-4";
  const ukInputsLocked = factorMode === "uk_supabase" && !ukReferenceReady;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{sectionTitle}</h4>
          {sectionDescription ? (
            <p className="text-sm text-gray-600">{sectionDescription}</p>
          ) : null}
          {ukInputsLocked && (
            <p className="text-sm text-teal-700 mt-1">Loading UK fuel factors…</p>
          )}
        </div>
        <Button
          onClick={addRow}
          className="bg-teal-600 hover:bg-teal-700 text-white"
          disabled={ukInputsLocked}
        >
          <Plus className="h-4 w-4 mr-2" />Add New Entry
        </Button>
      </div>

      <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
        <Label className="md:col-span-1 text-gray-500">{isUkActive ? "Activity" : "Type"}</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel</Label>
        <Label className="md:col-span-1 text-gray-500">Unit</Label>
        {isUkActive && (
          <Label className="md:col-span-1 text-gray-500">Emission factor</Label>
        )}
        <Label className="md:col-span-1 text-gray-500">Quantity</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const isDeleting = deletingRows.has(r.id);
          
          return (
            <div key={r.id} className={`grid grid-cols-1 ${gridCols} gap-4 items-center p-3 rounded-lg bg-gray-50`}>
              <Select 
                value={r.type} 
                onValueChange={(v) =>
                  updateRow(r.id, { type: v as FuelType, fuel: undefined, unit: undefined, ukFactorBasis: undefined })
                }
                disabled={ukInputsLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isUkActive ? "Select activity" : "Select type"} />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select 
                value={r.fuel} 
                onValueChange={(v) => updateRow(r.id, { fuel: v, unit: undefined, ukFactorBasis: undefined })} 
                disabled={ukInputsLocked || !r.type}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel" />
                </SelectTrigger>
                <SelectContent>
                  {fuelsFor(r.type).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select 
                value={r.unit} 
                onValueChange={(v) => updateRow(r.id, { unit: v })} 
                disabled={ukInputsLocked || !r.type || !r.fuel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitsFor(r.type, r.fuel).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>

              {isUkActive &&
                (() => {
                  const cell =
                    r.type && r.fuel && r.unit
                      ? ukFactorsMap[r.type]?.[r.fuel]?.[r.unit]
                      : undefined;
                  const avail = availableUkBasises(cell);
                  if (!r.type || !r.fuel || !r.unit) {
                    return (
                      <div className="h-10 rounded-md border border-dashed border-gray-200 bg-white/50" />
                    );
                  }
                  if (avail.length === 0) {
                    return (
                      <p className="text-xs text-amber-700 leading-tight px-1">
                        No matching factor row (check Activity, Fuel, Unit against UK_Fuel_Factors).
                      </p>
                    );
                  }
                  const selectValue = avail.includes(r.ukFactorBasis || "total")
                    ? (r.ukFactorBasis || "total")
                    : avail[0];

                  return (
                    <Select
                      value={selectValue}
                      onValueChange={(v) => updateRow(r.id, { ukFactorBasis: v as UkFactorBasis })}
                      disabled={ukInputsLocked}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select factor column" />
                      </SelectTrigger>
                      <SelectContent>
                        {avail.map((b) => (
                          <SelectItem key={b} value={b}>
                            {UK_BASIS_LABEL[b]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}

              <div className="flex items-center gap-2">
                <Input 
                  type="number" 
                  step="any" 
                  min="0"
                  max="999999999999.999999"
                  value={r.quantity ?? ''} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateRow(r.id, { quantity: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        updateRow(r.id, { quantity: numValue });
                      }
                    }
                  }} 
                  placeholder="Enter quantity"
                  disabled={false}
                />
                {r.isExisting ? (
                  <Button size="sm" variant="outline" onClick={() => deleteExistingRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-red-600" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          {isUkActive
            ? "Total (sum using each row's emission factor): "
            : "Total Fuel Emissions: "}
          <span className="font-semibold">
            {convertEmission(totalEmissions)} {outputUnit}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Output unit</span>
            <Select value={outputUnit} onValueChange={(v) => setOutputUnit(v as OutputUnit)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="tonnes">tonnes</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="short_ton">short ton</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(() => {
            const pendingNew = rows.filter(r => !r.isExisting).length;
            const pendingUpdates = rows.filter(r => r.isExisting && r.dbId && fuelRowChanged(r, existingEntries)).length;
            const unitChanged = outputUnit !== initialOutputUnit;
            const totalPending = pendingNew + pendingUpdates;
            const canSave = !saving && (totalPending > 0 || unitChanged);
            return (
              <div className="flex items-center gap-2">
                <Button
                  onClick={saveFuelEntries}
                  disabled={!canSave}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                {onSaveAndNext && (
                  <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600 hover:bg-teal-50">
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default FuelEmissions;

import React, { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HeatRow {
  id?: string;
  entryType: string; // Dynamic type based on standard
  unit: string;
  factor: number;
  quantity?: number;
  emissions?: number;
  dbId?: string;
  // Selected gas for this row; defaults to CO2 when not set
  gas?: "co2" | "ch4" | "n2o";
  // What unit the user is entering the quantity in:
  // "base"  -> as stored in Supabase (usually mmBtu)
  // "mmscf" -> MMSCF, internally converted to mmBtu
  quantityUnit?: "base" | "mmscf";
  // Whether this row supports MMSCF input (when the base unit is mmBtu)
  supportsMMSCF?: boolean;
  // Per‑mmBtu factors from Supabase:
  // - CO2 is stored as kg CO2 / mmBtu
  // - CH4 and N2O are typically stored as g gas / mmBtu
  co2Factor?: number;
  ch4Factor?: number;
  n2oFactor?: number;
}

// Fallback factor if we cannot read anything from Supabase
const HEAT_DEFAULT_FACTOR = 0.17355; // kg CO2e per kWh (fallback)

// Approximate energy content of natural gas:
// 1 MMSCF ≈ 1037 mmBtu (1 scf ≈ 1037 Btu)
const MMBTU_PER_MMSCF = 1037;

const parseNumber = (value: any): number | undefined => {
  if (typeof value === "number") return isFinite(value) ? value : undefined;
  if (value == null) return undefined;
  const cleaned = String(value).replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : undefined;
};

// Find the first column value whose key matches any of the provided patterns.
const pickFirstValue = (row: any, patterns: RegExp[]): any => {
  if (!row || typeof row !== "object") return undefined;
  const keys = Object.keys(row);
  for (const p of patterns) {
    const key = keys.find((k) => p.test(k));
    if (key) return row[key];
  }
  return undefined;
};

// Compute emissions in kg for the selected gas only (no CO2e conversion).
// CO2 factor is in kg/unit; CH4 & N2O factors are in g/unit (converted to kg below).
const computeEmissionsKg = (
  gas: "co2" | "ch4" | "n2o",
  factorPerUnit: number,
  quantityInBaseUnit: number
): number => {
  if (!isFinite(factorPerUnit) || !isFinite(quantityInBaseUnit)) {
    return 0;
  }
  if (gas === "co2") {
    return Number((quantityInBaseUnit * factorPerUnit).toFixed(6));
  }
  return Number(((quantityInBaseUnit * factorPerUnit) / 1000).toFixed(6));
};

const getFactorForGas = (row: HeatRow, gas: "co2" | "ch4" | "n2o"): number => {
  if (gas === "co2") {
    if (typeof row.co2Factor === "number") return row.co2Factor;
    return row.factor ?? HEAT_DEFAULT_FACTOR;
  }
  if (gas === "ch4") {
    if (typeof row.ch4Factor === "number") return row.ch4Factor;
    return row.factor ?? HEAT_DEFAULT_FACTOR;
  }
  if (gas === "n2o") {
    if (typeof row.n2oFactor === "number") return row.n2oFactor;
    return row.factor ?? HEAT_DEFAULT_FACTOR;
  }
  return row.factor ?? HEAT_DEFAULT_FACTOR;
};

// Map DB entry_type back to display Activity used in the reference tables.
const mapEntryTypeFromDb = (
  entryType: string
): string => {
  const lower = (entryType || "").toLowerCase();
  if (lower.includes("district")) {
    return "District steam and heat";
  }
  return "Steam and Heat";
};

type OutputUnit = "kg" | "tonnes" | "g" | "short_ton";

interface HeatSteamEmissionsProps {
  onTotalChange?: (total: number) => void;
  onSaveAndNext?: () => void;
  /**
   * When set, forces the standard (e.g. for EPA calculator).
   * If provided, the selector is locked to this value.
   */
  forcedStandard?: 'UK' | 'EBT';
}

const HeatSteamEmissions: React.FC<HeatSteamEmissionsProps> = ({ onTotalChange, onSaveAndNext, forcedStandard }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [heatSteamStandard, setHeatSteamStandard] = useState<"UK" | "EBT">(forcedStandard ?? "UK");
  const [heatSteamDataUK, setHeatSteamDataUK] = useState<
    Array<{
      Type: string;
      Unit: string;
      co2Factor?: number; // kg CO2 / mmBtu
      ch4Factor?: number; // g CH4 / mmBtu
      n2oFactor?: number; // g N2O / mmBtu
    }>
  >([]);
  const [heatSteamDataEBT, setHeatSteamDataEBT] = useState<
    Array<{
      Type: string;
      Unit: string;
      co2Factor?: number;
      ch4Factor?: number;
      n2oFactor?: number;
    }>
  >([]);

  const [heatRows, setHeatRows] = useState<HeatRow[]>([]);
  const [savingHeat, setSavingHeat] = useState(false);
  const [outputUnit, setOutputUnit] = useState<OutputUnit>("kg");
  // When true, we already have user-specific rows from the DB and should
  // not overwrite them with auto-generated rows from the reference tables.
  const [hasUserRows, setHasUserRows] = useState(false);

  // Load heat and steam reference data for both standards
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        // Load UK standard data
        const { data: ukData } = await supabase
          .from('heat and steam' as any)
          .select('*');
        
        if (ukData && ukData.length > 0) {
          const formatted = ukData.map((row: any) => {
            const type =
              row["Type"] || row.type || row["type"] || row["Activity"] || row.activity;
            const unit = row["Unit"] || row.unit || row["unit"];

            const co2Raw =
              pickFirstValue(row, [/^kg\s*CO2\s*\/\s*mmBtu$/i, /CO2.*mmBtu/i]) ??
              row["kg CO₂e"] ??
              row["kg CO2e"] ??
              row.kg_co2e;
            const ch4Raw =
              pickFirstValue(row, [/CH4.*mmBtu/i, /g\s*CH4.*mmBtu/i]) ??
              row["CH4"] ??
              row["CH₄"] ??
              row.ch4 ??
              row["CH4 Factor"] ??
              row.ch4_factor;
            const n2oRaw =
              pickFirstValue(row, [/N2O.*mmBtu/i, /g\s*N2O.*mmBtu/i]) ??
              row["N2O"] ??
              row["N20"] ??
              row.n2o ??
              row["N2O Factor"] ??
              row.n2o_factor;

            const co2Factor = parseNumber(co2Raw);
            const ch4Factor = parseNumber(ch4Raw);
            const n2oFactor = parseNumber(n2oRaw);

            return {
              Type: type,
              Unit: unit,
              // CO2 is already kg CO2 / mmBtu
              co2Factor: co2Factor ?? HEAT_DEFAULT_FACTOR,
              // CH4 & N2O are stored as g / mmBtu; keep them as‑is, and convert to kg
              // only when computing emissions.
              ch4Factor: ch4Factor ?? undefined,
              n2oFactor: n2oFactor ?? undefined,
            };
          });
          setHeatSteamDataUK(formatted);
        }

        // Load EBT standard data
        const { data: ebtData } = await supabase
          .from('heat and steam EBT' as any)
          .select('*');
        
        if (ebtData && ebtData.length > 0) {
          const formatted = ebtData.map((row: any) => {
            const type =
              row["Type"] || row.type || row["type"] || row["Activity"] || row.activity;
            const unit = row["Unit"] || row.unit || row["unit"];

            const co2Raw =
              pickFirstValue(row, [/^kg\s*CO2\s*\/\s*mmBtu$/i, /CO2.*mmBtu/i]) ??
              row["kg CO₂e"] ??
              row["kg CO2e"] ??
              row.kg_co2e;
            const ch4Raw =
              pickFirstValue(row, [/CH4.*mmBtu/i, /g\s*CH4.*mmBtu/i]) ??
              row["CH4"] ??
              row["CH₄"] ??
              row.ch4 ??
              row["CH4 Factor"] ??
              row.ch4_factor;
            const n2oRaw =
              pickFirstValue(row, [/N2O.*mmBtu/i, /g\s*N2O.*mmBtu/i]) ??
              row["N2O"] ??
              row["N20"] ??
              row.n2o ??
              row["N2O Factor"] ??
              row.n2o_factor;

            const co2Factor = parseNumber(co2Raw);
            const ch4Factor = parseNumber(ch4Raw);
            const n2oFactor = parseNumber(n2oRaw);

            return {
              Type: type,
              Unit: unit,
              co2Factor: co2Factor ?? HEAT_DEFAULT_FACTOR,
              ch4Factor: ch4Factor ?? undefined,
              n2oFactor: n2oFactor ?? undefined,
            };
          });
          setHeatSteamDataEBT(formatted);
        }
      } catch (error: any) {
        console.error('Error loading heat and steam reference data:', error);
      }
    };
    loadReferenceData();
  }, []);

  // Update rows when standard or data changes - dynamically create rows based on
  // available types, but only when we don't already have user-specific rows loaded.
  useEffect(() => {
    const dataSource =
      heatSteamStandard === "UK" ? heatSteamDataUK : heatSteamDataEBT;

    if (dataSource.length === 0) {
      // If no data yet, keep existing rows or set empty
      return;
    }

    if (hasUserRows) {
      // We've already loaded rows from scope2_heatsteam_entries; don't override them.
      return;
    }

    // Create rows from the data source, preserving quantities if types match
    setHeatRows((prev) => {
      const newRows: HeatRow[] = dataSource.map((dataItem, index) => {
        // Try to find existing row with same type to preserve quantity
        const existingRow = prev.find((r) => r.entryType === dataItem.Type);

        const gas: "co2" | "ch4" | "n2o" = existingRow?.gas ?? "co2";
        const supportsMMSCF =
          typeof dataItem.Unit === "string" &&
          dataItem.Unit.toLowerCase().includes("mmbtu");
        const quantityUnit: "base" | "mmscf" =
          existingRow?.quantityUnit ?? "base";

        const baseRow: HeatRow = {
          id: existingRow?.id || `heat-${index}-${Date.now()}`,
          entryType: dataItem.Type,
          unit: dataItem.Unit || "mmBtu",
          factor: 0,
          quantity: existingRow?.quantity,
          emissions: undefined,
          dbId: existingRow?.dbId,
          gas,
          quantityUnit,
          supportsMMSCF,
          co2Factor: dataItem.co2Factor ?? HEAT_DEFAULT_FACTOR,
          ch4Factor: dataItem.ch4Factor,
          n2oFactor: dataItem.n2oFactor,
        };

        const factorForGas = getFactorForGas(baseRow, gas);
        baseRow.factor = factorForGas;

        if (typeof baseRow.quantity === "number") {
          const qtyInBase =
            quantityUnit === "mmscf" && supportsMMSCF
              ? baseRow.quantity * MMBTU_PER_MMSCF
              : baseRow.quantity;
          baseRow.emissions = computeEmissionsKg(gas, factorForGas, qtyInBase);
        }

        return baseRow;
      });

      return newRows;
    });
  }, [heatSteamStandard, heatSteamDataUK, heatSteamDataEBT, hasUserRows]);

  // When we *do* have user-specific rows (loaded from scope2_heatsteam_entries),
  // re‑attach the latest per‑gas factors and MMSCF support flags from the
  // reference tables so that factor/emission calculations stay consistent.
  useEffect(() => {
    if (!hasUserRows) return;
    const dataSource =
      heatSteamStandard === "UK" ? heatSteamDataUK : heatSteamDataEBT;
    if (dataSource.length === 0) return;

    setHeatRows((prev) =>
      prev.map((row) => {
        const ref = dataSource.find((d) => d.Type === row.entryType);
        if (!ref) return row;

        const gas: "co2" | "ch4" | "n2o" = row.gas ?? "co2";
        const quantityUnit: "base" | "mmscf" = row.quantityUnit ?? "base";
        const supportsMMSCF =
          typeof ref.Unit === "string" &&
          ref.Unit.toLowerCase().includes("mmbtu");

        const next: HeatRow = {
          ...row,
          unit: ref.Unit || row.unit,
          co2Factor: ref.co2Factor ?? row.co2Factor,
          ch4Factor: ref.ch4Factor ?? row.ch4Factor,
          n2oFactor: ref.n2oFactor ?? row.n2oFactor,
          gas,
          quantityUnit,
          supportsMMSCF,
        };

        const factorForGas = getFactorForGas(next, gas);
        next.factor = factorForGas;

        if (typeof next.quantity === "number") {
          const qtyInBase =
            quantityUnit === "mmscf" && supportsMMSCF
              ? next.quantity * MMBTU_PER_MMSCF
              : next.quantity;
          next.emissions = computeEmissionsKg(gas, factorForGas, qtyInBase);
        } else {
          next.emissions = undefined;
        }

        return next;
      })
    );
  }, [hasUserRows, heatSteamStandard, heatSteamDataUK, heatSteamDataEBT]);

  // Load saved user data
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        // Load Heat & Steam entries
        const { data: heatData, error: heatError } = await (supabase as any)
          .from('scope2_heatsteam_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (heatError) throw heatError;

        // Load saved standard if available, unless forced (EPA)
        if (!forcedStandard && heatData && heatData.length > 0 && heatData[0].standard) {
          setHeatSteamStandard(heatData[0].standard);
        }
        
        // Convert saved data to rows.
        const savedRows: HeatRow[] = (heatData || []).map((row: any) => {
          const unit: string | undefined = row.unit;
          const supportsMMSCF =
            typeof unit === "string" && unit.toLowerCase().includes("mmbtu");

          const displayEntryType = mapEntryTypeFromDb(row.entry_type);

          return {
            id: crypto.randomUUID(),
            dbId: row.id,
            entryType: displayEntryType,
            unit,
            factor: row.emission_factor ?? HEAT_DEFAULT_FACTOR,
            quantity: row.quantity ?? undefined,
            emissions: row.emissions ?? undefined,
            // Persisted rows historically only stored CO2; default gas & quantity unit.
            gas: "co2",
            quantityUnit: "base",
            supportsMMSCF,
          };
        });

        // If we have saved data, prefer it over auto-generated reference rows.
        if (savedRows.length > 0) {
          setHeatRows(savedRows);
          setHasUserRows(true);
          const u = String((heatData![0] as any).emissions_output_unit || "") as OutputUnit;
          if (u === "kg" || u === "tonnes" || u === "g" || u === "short_ton") {
            setOutputUnit(u);
          }
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: "Error", description: e.message || "Failed to load Heat & Steam data", variant: "destructive" });
      }
    };
    load();
  }, [user, toast, forcedStandard]);

  // If forced (EPA), lock the standard.
  useEffect(() => {
    if (forcedStandard) {
      setHeatSteamStandard(forcedStandard);
    }
  }, [forcedStandard]);

  const updateHeatRowQty = (entryType: string, qty?: number) => {
    setHeatRows((prev) =>
      prev.map((r) => {
        if (r.entryType !== entryType) return r;
        const gas: "co2" | "ch4" | "n2o" = r.gas ?? "co2";
        const quantityUnit: "base" | "mmscf" = r.quantityUnit ?? "base";
        const supportsMMSCF = !!r.supportsMMSCF;

        const next: HeatRow = {
          ...r,
          quantity: qty,
          gas,
          quantityUnit,
          supportsMMSCF,
        };

        const factorForGas = getFactorForGas(next, gas);
        next.factor = factorForGas;

        if (typeof next.quantity === "number") {
          const qtyInBase =
            quantityUnit === "mmscf" && supportsMMSCF
              ? next.quantity * MMBTU_PER_MMSCF
              : next.quantity;
          next.emissions = computeEmissionsKg(gas, factorForGas, qtyInBase);
        } else {
          next.emissions = undefined;
        }

        return next;
      })
    );
  };

  const saveHeat = async () => {
    if (!user) { 
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" }); 
      return; 
    }
    const validRows = heatRows.filter(r => typeof r.quantity === 'number' && typeof r.factor === 'number' && typeof r.emissions === 'number');
    if (validRows.length === 0) { 
      toast({ title: "Nothing to save", description: "Enter quantities for heat & steam." }); 
      return; 
    }
    setSavingHeat(true);
    try {
      const inserts = validRows.filter(r => !r.dbId).map(r => ({
        user_id: user.id,
        entry_type: mapEntryTypeForDb(r.entryType),
        unit: r.unit,
        emission_factor: r.factor,
        quantity: r.quantity!,
        emissions: r.emissions!,
        standard: heatSteamStandard,
        emissions_output: convertEmissionNumeric(r.emissions, outputUnit),
        emissions_output_unit: outputUnit,
      }));
      if (inserts.length > 0) {
        const { error } = await (supabase as any).from('scope2_heatsteam_entries').insert(inserts);
        if (error) throw error;
      }

      const updates = validRows.filter(r => r.dbId).map(r => (
        (supabase as any)
          .from('scope2_heatsteam_entries')
          .update({
            entry_type: mapEntryTypeForDb(r.entryType),
            unit: r.unit,
            emission_factor: r.factor,
            quantity: r.quantity!,
            emissions: r.emissions!,
            standard: heatSteamStandard,
            emissions_output: convertEmissionNumeric(r.emissions, outputUnit),
            emissions_output_unit: outputUnit,
          })
          .eq('id', r.dbId!)
      ));
      if (updates.length > 0) {
        const results = await Promise.all(updates);
        const updateError = (results as any[]).find(x => x.error)?.error;
        if (updateError) throw updateError;
      }

      toast({ title: "Saved", description: "Heat & Steam saved." });
      onSaveAndNext?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingHeat(false);
    }
  };

  const deleteHeatRow = async (row: HeatRow) => {
    // If this row exists in the DB, delete it there as well.
    if (row.dbId) {
      try {
        const { error } = await (supabase as any)
          .from("scope2_heatsteam_entries")
          .delete()
          .eq("id", row.dbId);
        if (error) throw error;
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Failed to delete heat & steam entry",
          variant: "destructive",
        });
        return;
      }
    }

    setHeatRows((prev) => prev.filter((r) => r.id !== row.id && r.entryType !== row.entryType));
  };

  const totalHeatEmissions = heatRows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  const formatEmission = (raw: number): string => {
    if (!isFinite(raw)) return "";
    return raw.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  const convertEmission = (value?: number): string => {
    if (value == null) return "";
    switch (outputUnit) {
      case "kg":
        return formatEmission(value);
      case "tonnes":
        return formatEmission(value / 1000);
      case "g":
        return formatEmission(value * 1000);
      case "short_ton":
        return formatEmission(value / 907.18474);
      default:
        return formatEmission(value);
    }
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

  // Map any display entry type back to one of the two canonical
  // values allowed by the DB CHECK constraint on scope2_heatsteam_entries.entry_type.
  const mapEntryTypeForDb = (
    entryType: string
  ): "Onsite heat and steam" | "District heat and steam" => {
    const lower = (entryType || "").toLowerCase();
    if (lower.includes("district")) {
      return "District heat and steam";
    }
    // Default to onsite when we can't tell
    return "Onsite heat and steam";
  };

  useEffect(() => {
    if (onTotalChange) onTotalChange(totalHeatEmissions);
  }, [onTotalChange, totalHeatEmissions]);

  const addHeatRow = () => {
    const dataSource =
      heatSteamStandard === "UK" ? heatSteamDataUK : heatSteamDataEBT;

    setHeatRows((prev) => {
      const template =
        dataSource.find((d) => d.Type) || dataSource[0] || null;

      const gas: "co2" | "ch4" | "n2o" = "co2";
      const unit = template?.Unit || "mmBtu";
      const supportsMMSCF =
        typeof unit === "string" && unit.toLowerCase().includes("mmbtu");

      const baseRow: HeatRow = {
        id: crypto.randomUUID(),
        entryType: template?.Type || "Steam and Heat",
        unit,
        factor: 0,
        quantity: undefined,
        emissions: undefined,
        gas,
        quantityUnit: "base",
        supportsMMSCF,
        co2Factor: template?.co2Factor ?? HEAT_DEFAULT_FACTOR,
        ch4Factor: template?.ch4Factor,
        n2oFactor: template?.n2oFactor,
      };

      const factorForGas = getFactorForGas(baseRow, gas);
      baseRow.factor = factorForGas;

      return [...prev, baseRow];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Heat & Steam Consumption</h4>
          <p className="text-sm text-gray-600">Enter your organization's heat and steam consumption data</p>
        </div>
        <Button onClick={addHeatRow} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      </div>

      {/* Standard Selection (hidden when forced, e.g. EPA calculator) */}
      {!forcedStandard && (
        <div className="mb-4">
          <Label className="flex items-center gap-1 mb-2">Standard</Label>
          <Select
            value={heatSteamStandard}
            onValueChange={(value: "UK" | "EBT") => {
              setHeatSteamStandard(value);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Select standard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UK">UK Standard</SelectItem>
              <SelectItem value="EBT">EBT Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dynamically render rows based on selected standard */}
      {heatRows.length === 0 ? (
        <div className="text-sm text-gray-600">Loading heat and steam data...</div>
      ) : (
        heatRows.map((row) => {
          const gas: "co2" | "ch4" | "n2o" = row.gas ?? "co2";
          const quantityUnit: "base" | "mmscf" = row.quantityUnit ?? "base";
          const supportsMMSCF = !!row.supportsMMSCF;

          const factorLabel =
            gas === "co2"
              ? `Factor (kg CO2 / ${row.unit})`
              : gas === "ch4"
              ? `Factor (g CH4 / ${row.unit})`
              : `Factor (g N2O / ${row.unit})`;

          return (
            <div
              key={row.id || row.entryType}
              className="space-y-3 rounded-lg bg-gray-50 p-3"
            >
              {/* Row 1: Activity + Emission type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label>
                    {forcedStandard ? "Steam and Heat" : row.entryType}
                  </Label>
                  {supportsMMSCF ? (
                    <div className="mt-1 flex gap-2">
                      <Select
                        value={quantityUnit}
                        onValueChange={(value: "base" | "mmscf") => {
                          setHeatRows((prev) =>
                            prev.map((r) => {
                              if (r.entryType !== row.entryType) return r;
                              const gasForRow: "co2" | "ch4" | "n2o" = r.gas ?? "co2";
                              const next: HeatRow = {
                                ...r,
                                quantityUnit: value,
                                gas: gasForRow,
                                supportsMMSCF: true,
                              };
                            const factorForGas = getFactorForGas(
                              next,
                              gasForRow
                            );
                            next.factor = factorForGas;

                            if (typeof next.quantity === "number") {
                              const qtyInBase =
                                value === "mmscf"
                                  ? next.quantity * MMBTU_PER_MMSCF
                                  : next.quantity;
                              next.emissions = computeEmissionsKg(
                                gasForRow,
                                factorForGas,
                                qtyInBase
                              );
                              } else {
                                next.emissions = undefined;
                              }
                              return next;
                            })
                          );
                        }}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base">{row.unit}</SelectItem>
                          <SelectItem value="mmscf">mmScf</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="999999999999.999999"
                        value={row.quantity ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            updateHeatRowQty(row.entryType, undefined);
                          } else {
                            const numValue = Number(value);
                            if (numValue >= 0 && numValue <= 999999999999.999999) {
                              updateHeatRowQty(row.entryType, numValue);
                            }
                          }
                        }}
                        placeholder={
                          quantityUnit === "mmscf"
                            ? "Enter mmScf"
                            : `Enter ${row.unit}`
                        }
                      />
                    </div>
                  ) : (
                    <Input
                      className="mt-1"
                      type="number"
                      step="any"
                      min="0"
                      max="999999999999.999999"
                      value={row.quantity ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          updateHeatRowQty(row.entryType, undefined);
                        } else {
                          const numValue = Number(value);
                          if (numValue >= 0 && numValue <= 999999999999.999999) {
                            updateHeatRowQty(row.entryType, numValue);
                          }
                        }
                      }}
                      placeholder={`Enter ${row.unit}`}
                    />
                  )}
                </div>
                <div>
                  <Label>Emission type</Label>
                  <Select
                    value={gas}
                    onValueChange={(value: "co2" | "ch4" | "n2o") => {
                      setHeatRows((prev) =>
                        prev.map((r) => {
                          if (r.entryType !== row.entryType) return r;
                          const next: HeatRow = {
                            ...r,
                            gas: value,
                          };
                          const factorForGas = getFactorForGas(next, value);
                          next.factor = factorForGas;

                          if (typeof next.quantity === "number") {
                            const qtyInBase =
                              next.quantityUnit === "mmscf" && next.supportsMMSCF
                                ? next.quantity * MMBTU_PER_MMSCF
                                : next.quantity;
                            next.emissions = computeEmissionsKg(
                              value,
                              factorForGas,
                              qtyInBase
                            );
                          } else {
                            next.emissions = undefined;
                          }
                          return next;
                        })
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="co2">CO2</SelectItem>
                      <SelectItem value="ch4">CH4</SelectItem>
                      <SelectItem value="n2o">N2O</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Emissions + Factor + Delete */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label>Emissions ({outputUnit})</Label>
                  <Input readOnly value={convertEmission(row.emissions)} />
                </div>
                <div>
                  <Label>{factorLabel}</Label>
                  <Input readOnly value={row.factor.toFixed(6)} />
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => deleteHeatRow(row)}
                    aria-label="Delete heat & steam row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-900 font-medium">
          Total heat & steam emissions:{" "}
          <span className="font-semibold">
            {convertEmission(totalHeatEmissions)} {outputUnit}
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
          <Button onClick={saveHeat} disabled={savingHeat} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" /> {savingHeat ? 'Saving...' : 'Save and Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HeatSteamEmissions;

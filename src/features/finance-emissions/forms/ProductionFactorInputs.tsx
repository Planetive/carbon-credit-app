import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";

const MATERIAL_FACTOR_DATASET = "ice_embodied_carbon_v5";

export type ProductionFactorRow = {
  category: string;
  subCategory: string;
  materialName: string;
  declaredUnit: string;
  factorKg: number;
};

type Props = {
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
};

function normalizeDeclaredUnit(raw: unknown): string {
  const value = String(raw ?? "kg").trim().toLowerCase();
  if (!value) return "kg";
  if (value.includes("tonne") || value === "t" || value === "mt") return "tonnes";
  if (value === "m2" || value.includes("m²")) return "m2";
  if (value.includes("barrel")) return "barrels";
  if (value.includes("cubic") || value === "m3" || value === "m³") return "cubic-meters";
  return value;
}

function formatFactorText(value: string): string {
  return value.replace(/_/g, " ").trim();
}

function productionUnitLabel(unit: string): string {
  switch (unit) {
    case "tonnes":
      return "Tonnes";
    case "mt":
      return "Mt";
    case "m2":
      return "m²";
    case "cubic-meters":
      return "m³";
    default:
      return unit;
  }
}

/**
 * Shared Option 2b production / ICE material factor picker.
 * Extracted so SSP and standalone calculators can share the same inputs
 * without duplicating financed-emissions formulas.
 */
export const ProductionFactorInputs: React.FC<Props> = ({ formData, onUpdateFormData }) => {
  const [rows, setRows] = useState<ProductionFactorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        let sheet = await tryLoadFactorSheetViaApi({
          datasetCodes: [MATERIAL_FACTOR_DATASET],
          nameHints: ["ICE embodied carbon", "Finance_production_Unit"],
        });
        if (!sheet || sheet.length === 0) {
          const refClient = (supabase as { schema?: (s: string) => typeof supabase }).schema
            ? (supabase as { schema: (s: string) => typeof supabase }).schema("ref")
            : supabase;
          const { data: dataset } = await refClient
            .from("factor_datasets")
            .select("id, code")
            .eq("code", MATERIAL_FACTOR_DATASET)
            .maybeSingle();
          if (dataset?.id) {
            const { data: fallbackRows } = await refClient
              .from("factor_rows")
              .select("category, label, unit, kg_co2e, attributes")
              .eq("dataset_id", dataset.id)
              .order("category", { ascending: true })
              .order("label", { ascending: true });
            sheet = fallbackRows ?? [];
          }
        }
        const parsed = (sheet ?? [])
          .map((row) => {
            const record = row as Record<string, unknown>;
            const attrs = (record.attributes ?? {}) as Record<string, unknown>;
            const category = String(record.category ?? record.Category ?? "").trim();
            const materialName = String(
              record.label ?? record.material_name ?? record.Materials ?? ""
            ).trim();
            const declaredUnit = normalizeDeclaredUnit(
              record.unit ?? record.declared_unit ?? record["Declared Units"] ?? "kg"
            );
            const subCategory = String(
              attrs.sub_category ?? record.sub_category ?? record["Sub Category"] ?? ""
            ).trim();
            const factorRaw =
              record.kg_co2e ?? record.ec_value ?? record["Embodied Carbon - kgCO2e/kg"];
            const factorKg = typeof factorRaw === "number" ? factorRaw : Number(factorRaw);
            if (!category || !materialName || !Number.isFinite(factorKg)) return null;
            return { category, subCategory, materialName, declaredUnit, factorKg };
          })
          .filter((row): row is ProductionFactorRow => !!row);
        if (!cancelled) setRows(parsed);
      } catch (error) {
        if (!cancelled) console.error("Failed loading production factors", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );
  const subCategories = useMemo(() => {
    const category = String(formData.productionCategory || "");
    return Array.from(
      new Set(
        rows
          .filter((r) => !category || r.category === category)
          .map((r) => r.subCategory)
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [rows, formData.productionCategory]);

  const materials = useMemo(() => {
    const category = String(formData.productionCategory || "");
    const sub = String(formData.productionSubCategory || "");
    const q = materialSearch.trim().toLowerCase();
    return rows
      .filter((r) => (!category || r.category === category) && (!sub || r.subCategory === sub))
      .filter((r) =>
        !q
          ? true
          : `${r.materialName} ${r.subCategory}`.toLowerCase().includes(q)
      );
  }, [rows, formData.productionCategory, formData.productionSubCategory, materialSearch]);

  const materialUnitOptions = useMemo(() => {
    const name = String(formData.productionMaterial || "");
    const category = String(formData.productionCategory || "");
    const sub = String(formData.productionSubCategory || "");
    return Array.from(
      new Set(
        rows
          .filter(
            (r) =>
              r.materialName === name &&
              (!category || r.category === category) &&
              (!sub || r.subCategory === sub)
          )
          .map((r) => r.declaredUnit)
      )
    );
  }, [rows, formData.productionMaterial, formData.productionCategory, formData.productionSubCategory]);

  const applyMaterial = (row: ProductionFactorRow) => {
    onUpdateFormData("productionCategory", row.category);
    onUpdateFormData("productionSubCategory", row.subCategory);
    onUpdateFormData("productionMaterial", row.materialName);
    onUpdateFormData("productionUnit", row.declaredUnit);
    // Store kgCO2e factor; unit metadata preserved for Phase 6C engine.
    onUpdateFormData("emission_factor", row.factorKg);
    onUpdateFormData("emission_factor_unit", `kgCO2e/${row.declaredUnit || "kg"}`);
    onUpdateFormData("factor_library_entry_id", `${row.category}|${row.materialName}|${row.declaredUnit}`);
  };

  return (
    <InputSection title="Production factor" description="Pick the product category used for the emissions rate">
      <FieldGrid>
        <FormField label="Production category" required tooltip="Material family from ICE embodied-carbon factors">
          <Select
            value={String(formData.productionCategory || "")}
            onValueChange={(value) => {
              onUpdateFormData("productionCategory", value);
              onUpdateFormData("productionSubCategory", "");
              const first = rows.find((row) => row.category === value);
              if (first) applyMaterial(first);
              setMaterialSearch("");
            }}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder={loading ? "Loading categories..." : "Select category"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {formatFactorText(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Sub category" tooltip="Narrow down rows before material selection">
          {!formData.productionCategory ? (
            <Input value="" readOnly placeholder="Select a category first" className={`${FIELD_INPUT} bg-[#F8FAFC]`} />
          ) : subCategories.length === 0 ? (
            <Input
              value="No sub categories for this category"
              readOnly
              className={`${FIELD_INPUT} bg-[#F8FAFC] text-[#64748B]`}
            />
          ) : (
            <Select
              value={String(formData.productionSubCategory || "")}
              onValueChange={(value) => {
                onUpdateFormData("productionSubCategory", value);
                const first = rows.find(
                  (row) =>
                    (!formData.productionCategory || row.category === formData.productionCategory) &&
                    row.subCategory === value
                );
                if (first) applyMaterial(first);
                setMaterialSearch("");
              }}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue placeholder="Select sub category" />
              </SelectTrigger>
              <SelectContent>
                {subCategories.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {formatFactorText(sub)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        <FormField label="Production material" required tooltip="Search and select the exact material row" span>
          <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={materialOpen}
                className={`w-full justify-between ${FIELD_INPUT} ${!formData.productionMaterial ? "text-muted-foreground" : ""}`}
                disabled={loading}
              >
                <span className="truncate">
                  {loading
                    ? "Loading materials..."
                    : formatFactorText(String(formData.productionMaterial || "")) || "Select material"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search material or keyword..."
                  value={materialSearch}
                  onValueChange={setMaterialSearch}
                />
                <CommandList className="max-h-64">
                  <CommandEmpty>No matching materials.</CommandEmpty>
                  <CommandGroup>
                    {materials.map((row) => (
                      <CommandItem
                        key={`${row.category}-${row.subCategory}-${row.materialName}-${row.declaredUnit}`}
                        value={`${row.materialName} ${row.subCategory}`}
                        onSelect={() => {
                          applyMaterial(row);
                          setMaterialOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            formData.productionMaterial === row.materialName ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <span className="truncate">
                          {formatFactorText(row.materialName)}
                          {row.subCategory ? ` · ${formatFactorText(row.subCategory)}` : ""}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FormField>

        {materialUnitOptions.length > 1 ? (
          <FormField label="Declared unit" tooltip="Choose the unit basis when this material has multiple declared units">
            <Select
              value={String(formData.productionUnit || materialUnitOptions[0] || "")}
              onValueChange={(value) => {
                onUpdateFormData("productionUnit", value);
                const match = rows.find(
                  (r) =>
                    r.materialName === formData.productionMaterial &&
                    r.declaredUnit === value &&
                    (!formData.productionCategory || r.category === formData.productionCategory)
                );
                if (match) applyMaterial(match);
              }}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {materialUnitOptions.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {productionUnitLabel(unit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        ) : null}

        <FormField label="Production" required tooltip="Client production volume for this material basis">
          <div className="flex gap-2">
            <FormattedNumberInput
              id="finance-production"
              placeholder="0"
              value={Number(formData.production || 0)}
              onChange={(value) => onUpdateFormData("production", value)}
              className={`${FIELD_INPUT} flex-1`}
            />
            <Select
              value={String(formData.productionUnit || "tonnes")}
              onValueChange={(value) => onUpdateFormData("productionUnit", value)}
            >
              <SelectTrigger className="w-[7.5rem] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tonnes">Tonnes</SelectItem>
                <SelectItem value="mt">Mt</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="m">m</SelectItem>
                <SelectItem value="m2">m²</SelectItem>
                <SelectItem value="units">Units</SelectItem>
                <SelectItem value="barrels">Barrels</SelectItem>
                <SelectItem value="cubic-meters">m³</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormField>

        <FormField label="Emission factor" required tooltip="Auto-filled from selected material; editable if needed">
          <div className="flex gap-2">
            <FormattedNumberInput
              id="finance-emission-factor"
              placeholder="0"
              value={Number(formData.emission_factor || 0)}
              onChange={(value) => onUpdateFormData("emission_factor", value)}
              className={`${FIELD_INPUT} flex-1`}
            />
            <Select
              value={String(formData.emission_factor_unit || "tCO2e/tonne")}
              onValueChange={(value) => onUpdateFormData("emission_factor_unit", value)}
            >
              <SelectTrigger className="w-[10.5rem] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tCO2e/tonne">tCO₂e/tonne</SelectItem>
                <SelectItem value="kgCO2e/tonne">kgCO₂e/tonne</SelectItem>
                <SelectItem value="tCO2e/kg">tCO₂e/kg</SelectItem>
                <SelectItem value="kgCO2e/kg">kgCO₂e/kg</SelectItem>
                <SelectItem value="tCO2e/m">tCO₂e/m</SelectItem>
                <SelectItem value="kgCO2e/m">kgCO₂e/m</SelectItem>
                <SelectItem value="tCO2e/m2">tCO₂e/m²</SelectItem>
                <SelectItem value="kgCO2e/m2">kgCO₂e/m²</SelectItem>
                <SelectItem value="tCO2e/unit">tCO₂e/unit</SelectItem>
                <SelectItem value="kgCO2e/unit">kgCO₂e/unit</SelectItem>
                <SelectItem value="tCO2e/barrel">tCO₂e/barrel</SelectItem>
                <SelectItem value="kgCO2e/barrel">kgCO₂e/barrel</SelectItem>
                <SelectItem value="tCO2e/cubic-meters">tCO₂e/m³</SelectItem>
                <SelectItem value="kgCO2e/cubic-meters">kgCO₂e/m³</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormField>
      </FieldGrid>
    </InputSection>
  );
};

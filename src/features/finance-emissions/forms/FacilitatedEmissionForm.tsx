import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calculator, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CalculationEngine } from '../engines/CalculationEngine';
import { ALL_FACILITATED_FORMULAS, getFacilitatedFormulaById } from '../config/facilitatedEmissionFormulaConfigs';
import { smartConvertUnit } from '../utils/unitConversions';
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import type { FacilitatedCalculationResult } from "../types/contracts";
import { resolveFinancedCalculation } from "@/api/financedConnection";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";
import SectorProxyInputs from "./SectorProxyInputs";
import EnergyEmissionInputs from "./EnergyEmissionInputs";
import { FIELD_INPUT, FieldGrid, FormField, InputSection, ComputedBox } from "./InputLayout";
import { cn } from "@/lib/utils"; 
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface FacilitatedEmissionFormProps {
  corporateStructure?: string; // 'listed' or 'unlisted'
  hasEmissions?: string; // 'yes' or 'no'
  verificationStatus?: string; // 'verified' or 'unverified'
  calculationMethod?: string; // '2a' | '2b' | '3a' | '3c' when no company GHG
  verifiedEmissions?: number; // Auto-calculated verified emissions from parent
  unverifiedEmissions?: number; // Auto-calculated unverified emissions from parent
  onCalculationComplete?: (result: FacilitatedCalculationResult) => void;
}

type ProductionFactorRow = {
  category: string;
  subCategory: string;
  materialName: string;
  declaredUnit: string;
  factorKg: number;
};

const MATERIAL_FACTOR_DATASET = "ice_embodied_carbon_v5";

const normalizeDeclaredUnit = (value: unknown): string => {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "kg";
  if (raw === "each" || raw === "unit" || raw === "units") return "units";
  if (raw === "m²" || raw === "square meter" || raw === "square meters") return "m2";
  if (raw === "m3" || raw === "m³" || raw === "cubic meter" || raw === "cubic meters") return "cubic-meters";
  return raw;
};

const productionFactorUnitFor = (declaredUnit: string) => {
  switch (normalizeDeclaredUnit(declaredUnit)) {
    case "kg":
      return "kgCO2e/kg";
    case "m":
      return "kgCO2e/m";
    case "m2":
      return "kgCO2e/m2";
    case "units":
      return "kgCO2e/unit";
    case "barrels":
      return "kgCO2e/barrel";
    case "cubic-meters":
      return "kgCO2e/cubic-meters";
    default:
      return `kgCO2e/${normalizeDeclaredUnit(declaredUnit)}`;
  }
};

const productionUnitLabel = (unit: string) => {
  switch (unit) {
    case "kg": return "kg";
    case "m": return "m";
    case "m2": return "m²";
    case "units": return "units";
    case "barrels": return "barrels";
    case "cubic-meters": return "m³";
    case "tonnes": return "Tonnes";
    case "mt": return "Mt";
    default: return unit;
  }
};

const formatFactorText = (value: string) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .replace(/\bMotar\b/gi, "Mortar")
    .replace(/\bM2\b/g, "m2");
};

const normalizeFactorDenominator = (unit: string): string => {
  const raw = unit.split("/")[1] ?? "";
  return normalizeDeclaredUnit(raw);
};

const convertProductionFactorValue = (
  value: number,
  fromUnit: string,
  toUnit: string
): number => {
  if (!Number.isFinite(value) || fromUnit === toUnit) return value;
  const fromDen = normalizeFactorDenominator(fromUnit);
  const toDen = normalizeFactorDenominator(toUnit);
  if (fromDen !== toDen) return value;

  const fromIsKg = fromUnit.toLowerCase().startsWith("kgco2e/");
  const toIsKg = toUnit.toLowerCase().startsWith("kgco2e/");
  if (fromIsKg === toIsKg) return value;
  return fromIsKg ? value / 1000 : value * 1000;
};

export const FacilitatedEmissionForm: React.FC<FacilitatedEmissionFormProps> = ({
  corporateStructure = 'listed',
  hasEmissions = '',
  verificationStatus = '',
  calculationMethod = '',
  verifiedEmissions = 0,
  unverifiedEmissions = 0,
  onCalculationComplete
}) => {
  const { toast } = useToast();
  const calculationEngine = new CalculationEngine();
  
  const [formData, setFormData] = useState({
    // Financial Information
    underwritingAmount: 0,
    underwritingShare: 0, // percentage
    sharePrice: 0,
    outstandingShares: 0,
    totalDebt: 0,
    minorityInterest: 0,
    preferredStock: 0,
    totalEquity: 0,
    // Weighting Factor - Fixed at 33%
    weightingFactor: 0.33,
    // Option 1a - Verified GHG Emissions
    verifiedEmissions: 0,
    verifiedEmissionsUnit: 'tCO2e',
    // Option 1b - Unverified GHG Emissions
    unverifiedEmissions: 0,
    unverifiedEmissionsUnit: 'tCO2e',
    // Option 2a - Energy via EPA/DEFRA (same as finance emissions)
    factor_library: 'EPA' as 'EPA' | 'DEFRA',
    energy_consumption: 0,
    energy_consumption_unit: 'tCO2e',
    emission_factor: 0,
    process_emissions: 0,
    // Option 2b - Production Data
    production: 0,
    productionUnit: 'tonnes',
    productionEmissionFactor: 0,
    productionEmissionFactorUnit: 'tCO2e/tonne',
    productionCategory: '',
    productionSubCategory: '',
    productionMaterial: '',
    factor_dataset: MATERIAL_FACTOR_DATASET,
    // Options 3a / 3c - sector proxies
    companyRevenue: 0,
    assetTurnoverRatio: 0,
    intensity_country_name: '',
    sector_key: '',
    sector_code: '',
    sector_name: '',
    sector_intensity: 0,
    sector_intensity_unit: '',
  });
  
  const [result, setResult] = useState<FacilitatedCalculationResult | null>(null);
  const [companyType, setCompanyType] = useState<'listed' | 'unlisted'>(corporateStructure === 'listed' ? 'listed' : 'unlisted');
  const [productionFactorRows, setProductionFactorRows] = useState<ProductionFactorRow[]>([]);
  const [loadingProductionFactors, setLoadingProductionFactors] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  // Load questionnaire data from database and restore saved form state
  useEffect(() => {
    const initializeForm = async () => {
      try {
        // First, try to load from database if we have a counterparty ID
        const urlParams = new URLSearchParams(window.location.search);
        const locationState = (window.history.state?.usr || {}) as {
          counterpartyId?: string;
          counterparty?: string;
          id?: string;
        };
        const counterpartyId = urlParams.get('counterpartyId') || 
                              locationState.counterpartyId ||
                              locationState.counterparty ||
                              locationState.id;
        
        if (counterpartyId) {
          const { PortfolioClient } = await import('@/integrations/supabase/portfolioClient');
          const questionnaire = await PortfolioClient.getQuestionnaire(counterpartyId);
          
          if (questionnaire) {
            console.log('FacilitatedEmissionForm - Loaded questionnaire from database:', questionnaire);
            
            // Update company type from database
            const dbCompanyType = questionnaire.corporate_structure === 'listed' ? 'listed' : 'unlisted';
            setCompanyType(dbCompanyType);
            
            // Calculate total emissions from scope 1, 2, 3
            const totalEmissions = (questionnaire.scope1_emissions || 0) + 
                                 (questionnaire.scope2_emissions || 0) + 
                                 (questionnaire.scope3_emissions || 0);
            
            console.log('Auto-fill debug:', {
              scope1: questionnaire.scope1_emissions,
              scope2: questionnaire.scope2_emissions,
              scope3: questionnaire.scope3_emissions,
              totalEmissions,
              verificationStatus: questionnaire.verification_status
            });
            
            // Update form data with database values
            setFormData(prev => ({
              ...prev,
              sharePrice: questionnaire.share_price || 0,
              outstandingShares: questionnaire.outstanding_shares || 0,
              totalDebt: questionnaire.total_debt || 0,
              minorityInterest: questionnaire.minority_interest || 0,
              preferredStock: questionnaire.preferred_stock || 0,
              totalEquity: questionnaire.total_equity || 0,
              // Auto-fill emissions based on verification status
              verifiedEmissions: questionnaire.verification_status === 'verified' ? totalEmissions : 0,
              unverifiedEmissions: questionnaire.verification_status === 'unverified' ? totalEmissions : 0
            }));
          }
        }
        
        // Then, restore from sessionStorage (this will override database values if more recent)
        const raw = sessionStorage.getItem('facilitatedFormState');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.formData) {
            setFormData(prev => {
              const restored = { ...prev, ...parsed.formData };
              // Preserve auto-filled emissions if they were set from questionnaire
              if (prev.verifiedEmissions > 0 || prev.unverifiedEmissions > 0) {
                restored.verifiedEmissions = prev.verifiedEmissions;
                restored.unverifiedEmissions = prev.unverifiedEmissions;
              }
              return restored;
            });
          }
          if (parsed?.companyType) setCompanyType(parsed.companyType);
        }
      } catch (error) {
        console.error('Error initializing facilitated form:', error);
      }
    };
    
    initializeForm();
  }, []);

  // Auto-fill emissions from props (calculated by parent ESGWizard)
  useEffect(() => {
    console.log('🔍 FacilitatedEmissionForm - Auto-fill useEffect triggered:', {
      hasEmissions,
      verificationStatus,
      verifiedEmissions,
      unverifiedEmissions,
      currentFormData: formData
    });
    
    if (hasEmissions === 'yes' && (verifiedEmissions > 0 || unverifiedEmissions > 0)) {
      setFormData(prev => {
        const newData = {
          ...prev,
          verifiedEmissions: verifiedEmissions || prev.verifiedEmissions,
          unverifiedEmissions: unverifiedEmissions || prev.unverifiedEmissions
        };
        console.log('🔍 FacilitatedEmissionForm - Auto-fill form data updated:', newData);
        return newData;
      });
    }
  }, [hasEmissions, verificationStatus, verifiedEmissions, unverifiedEmissions]);

  useEffect(() => {
    let cancelled = false;
    const loadProductionFactors = async () => {
      setLoadingProductionFactors(true);
      try {
        let rows = await tryLoadFactorSheetViaApi({
          datasetCodes: [MATERIAL_FACTOR_DATASET],
          nameHints: ["ICE embodied carbon", "Finance_production_Unit"],
        });

        if (!rows || rows.length === 0) {
          const refClient = (supabase as any).schema ? (supabase as any).schema("ref") : supabase;
          const { data: dataset, error: datasetError } = await refClient
            .from("factor_datasets")
            .select("id, code")
            .eq("code", MATERIAL_FACTOR_DATASET)
            .maybeSingle();
          if (datasetError) throw datasetError;

          if (dataset?.id) {
            const { data: fallbackRows, error: rowsError } = await refClient
              .from("factor_rows")
              .select("category, label, unit, kg_co2e, attributes")
              .eq("dataset_id", dataset.id)
              .order("category", { ascending: true })
              .order("label", { ascending: true });
            if (rowsError) throw rowsError;
            rows = fallbackRows ?? [];
          }
        }

        const parsed = (rows ?? [])
          .map((row) => {
            const record = row as Record<string, unknown>;
            const attrs = (record.attributes ?? {}) as Record<string, unknown>;
            const category = String(record.category ?? record.Category ?? "").trim();
            const materialName = String(record.label ?? record.material_name ?? record.Materials ?? "").trim();
            const declaredUnit = normalizeDeclaredUnit(
              record.unit ?? record.declared_unit ?? record["Declared Units"] ?? "kg"
            );
            const subCategory = String(
              attrs.sub_category ?? record.sub_category ?? record["Sub Category"] ?? ""
            ).trim();
            const factorRaw = record.kg_co2e ?? record.ec_value ?? record["Embodied Carbon - kgCO2e/kg"];
            const factorKg = typeof factorRaw === "number" ? factorRaw : Number(factorRaw);
            if (!category || !materialName || !Number.isFinite(factorKg)) return null;
            return { category, subCategory, materialName, declaredUnit, factorKg };
          })
          .filter((row): row is ProductionFactorRow => !!row);

        if (!cancelled) setProductionFactorRows(parsed);
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading production factor rows:", error);
          toast({
            title: "Factor load error",
            description: "Could not load the ICE production factor dataset.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoadingProductionFactors(false);
      }
    };

    void loadProductionFactors();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Get available formulas based on selections (same logic as Finance Emission)
  const getAvailableFormulas = () => {
    let formulas = ALL_FACILITATED_FORMULAS.filter(formula => {
      // Check company type from the formula ID (listed/unlisted)
      const isListed = formula.id.includes('-listed');
      const isUnlisted = formula.id.includes('-unlisted');
      const matchesCompanyType = (companyType === 'listed' && isListed) || (companyType === 'unlisted' && isUnlisted);
      return matchesCompanyType;
    });

    // Filter based on hasEmissions and verificationStatus
    if (hasEmissions === 'yes') {
      if (verificationStatus === 'verified') {
        // Show only Option 1a (Verified GHG Emissions)
        formulas = formulas.filter(formula => formula.optionCode === '1a');
      } else if (verificationStatus === 'unverified') {
        // Show only Option 1b (Unverified GHG Emissions)
        formulas = formulas.filter(formula => formula.optionCode === '1b');
      }
      // If no verification status selected, show both 1a and 1b
    } else if (hasEmissions === 'no') {
      const allowed = ['2a', '2b', '3a', '3c'];
      const method = allowed.includes(calculationMethod) ? calculationMethod : null;
      formulas = formulas.filter((formula) =>
        method ? formula.optionCode === method : allowed.includes(formula.optionCode)
      );
    }

    return formulas;
  };

  const availableFormulas = getAvailableFormulas();
  
  // Automatically select the first (and only) available formula
  const selectedFormula = availableFormulas.length > 0 ? availableFormulas[0].id : '';
  const selectedOptionCode = availableFormulas[0]?.optionCode || '';
  const needsCompanyValue = selectedOptionCode !== '3c';

  // Calculate facilitated amount from underwriting amount and share percentage
  const facilitatedAmount = formData.underwritingAmount * (formData.underwritingShare / 100);

  const productionCategories = useMemo(
    () => Array.from(new Set(productionFactorRows.map((row) => row.category))).sort((a, b) => a.localeCompare(b)),
    [productionFactorRows]
  );
  const productionSubCategories = useMemo(
    () =>
      Array.from(
        new Set(
          productionFactorRows
            .filter((row) => !formData.productionCategory || row.category === formData.productionCategory)
            .map((row) => row.subCategory)
            .filter((sub) => sub.trim().length > 0)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [productionFactorRows, formData.productionCategory]
  );
  const productionMaterials = useMemo(
    () =>
      productionFactorRows
        .filter((row) => !formData.productionCategory || row.category === formData.productionCategory)
        .filter((row) => !formData.productionSubCategory || row.subCategory === formData.productionSubCategory)
        .filter((row) => {
          const q = materialSearch.trim().toLowerCase();
          if (!q) return true;
          return (
            row.materialName.toLowerCase().includes(q) ||
            row.subCategory.toLowerCase().includes(q) ||
            row.category.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => a.materialName.localeCompare(b.materialName)),
    [productionFactorRows, formData.productionCategory, formData.productionSubCategory, materialSearch]
  );
  const materialUnitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          productionFactorRows
            .filter((row) => row.materialName === formData.productionMaterial)
            .filter((row) => !formData.productionCategory || row.category === formData.productionCategory)
            .filter((row) => !formData.productionSubCategory || row.subCategory === formData.productionSubCategory)
            .map((row) => row.declaredUnit)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [productionFactorRows, formData.productionMaterial, formData.productionCategory, formData.productionSubCategory]
  );
  const selectedProductionMaterial = useMemo(
    () =>
      productionFactorRows.find(
        (row) =>
          row.materialName === formData.productionMaterial &&
          (!formData.productionCategory || row.category === formData.productionCategory) &&
          (!formData.productionSubCategory || row.subCategory === formData.productionSubCategory) &&
          (!formData.productionUnit || row.declaredUnit === formData.productionUnit)
      ) ?? null,
    [productionFactorRows, formData.productionCategory, formData.productionSubCategory, formData.productionMaterial, formData.productionUnit]
  );

  // Unit conversion using centralized utility

  const updateFormData = (field: string, value: unknown) => {
    if (field === "underwritingShare" && typeof value === "number") {
      const clampedShare = Math.min(100, Math.max(0, value));
      setFormData(prev => ({ ...prev, [field]: clampedShare }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value } as typeof prev));
  };

  const applyProductionMaterial = (row: ProductionFactorRow) => {
    setFormData((prev) => ({
      ...prev,
      productionCategory: row.category,
      productionSubCategory: row.subCategory,
      productionMaterial: row.materialName,
      productionUnit: row.declaredUnit,
      productionEmissionFactor: row.factorKg,
      productionEmissionFactorUnit: productionFactorUnitFor(row.declaredUnit),
      factor_dataset: MATERIAL_FACTOR_DATASET,
    }));
  };

  const applyMaterialDeclaredUnit = (declaredUnit: string) => {
    const match = productionFactorRows.find(
      (row) =>
        row.materialName === formData.productionMaterial &&
        (!formData.productionCategory || row.category === formData.productionCategory) &&
        (!formData.productionSubCategory || row.subCategory === formData.productionSubCategory) &&
        row.declaredUnit === declaredUnit
    );
    if (match) {
      applyProductionMaterial(match);
      return;
    }
    updateFormData("productionUnit", declaredUnit);
    updateFormData("productionEmissionFactorUnit", productionFactorUnitFor(declaredUnit));
  };

  const handleProductionEmissionFactorUnitChange = (nextUnit: string) => {
    setFormData((prev) => ({
      ...prev,
      productionEmissionFactor: convertProductionFactorValue(
        prev.productionEmissionFactor,
        prev.productionEmissionFactorUnit,
        nextUnit
      ),
      productionEmissionFactorUnit: nextUnit,
    }));
  };

  const getDataQualityColor = (score: number) => {
    switch (score) {
      case 1: return 'bg-green-100 text-green-800 border-green-200';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 5: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateFacilitatedEmission = () => {
    if (!selectedFormula) {
      toast({
        title: "No Formula Selected",
        description: "Please select a calculation formula first.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (formData.underwritingAmount <= 0) {
        throw new Error("Underwriting amount must be greater than 0.");
      }
      if (formData.underwritingShare <= 0) {
        throw new Error("Underwriting share (%) must be greater than 0.");
      }
      if (formData.underwritingShare > 100) {
        throw new Error("Underwriting share (%) cannot be greater than 100.");
      }
      if (facilitatedAmount <= 0) {
        throw new Error("Calculated facilitated amount must be greater than 0.");
      }

      // Calculate EVIC or Total Equity + Debt based on company type (not used for 3c)
      const totalAssetsValue = companyType === 'listed' ? 
        (formData.sharePrice * formData.outstandingShares) + formData.totalDebt + formData.minorityInterest + formData.preferredStock :
        formData.totalEquity + formData.totalDebt;
      if (needsCompanyValue && totalAssetsValue <= 0) {
        throw new Error(
          companyType === "listed"
            ? "EVIC must be greater than 0. Fill in share price, outstanding shares, debt, minority interest, and preferred stock."
            : "Total Equity + Debt must be greater than 0. Fill in total equity and total debt."
        );
      }
      if (selectedOptionCode === '3a' && formData.companyRevenue <= 0) {
        throw new Error('Company revenue must be greater than 0 for Option 3a.');
      }
      if ((selectedOptionCode === '3a' || selectedOptionCode === '3c') && (!formData.sector_intensity || !formData.sector_key)) {
        throw new Error('Select a country and sector with intensity data.');
      }
      if (selectedOptionCode === '3c' && formData.assetTurnoverRatio <= 0) {
        throw new Error('ATR must be greater than 0 for Option 3c.');
      }
      if (selectedOptionCode === '2a') {
        if (!formData.energy_consumption || formData.energy_consumption <= 0) {
          throw new Error('Enter electricity using the EPA/DEFRA form for Option 2a.');
        }
        if (!formData.emission_factor || formData.emission_factor <= 0) {
          throw new Error('Emission factor must be greater than 0. Select an EPA or DEFRA factor.');
        }
      }
      if (selectedOptionCode === '2b') {
        if (!formData.production || formData.production <= 0) {
          throw new Error('Production must be greater than 0 for Option 2b.');
        }
        if (!formData.productionEmissionFactor || formData.productionEmissionFactor <= 0) {
          throw new Error('Select a production material or enter a valid production emission factor.');
        }
      }

       // Prepare inputs for calculation
       const productionEmissionFactor = smartConvertUnit(
         formData.productionEmissionFactor,
         formData.productionEmissionFactorUnit
       );
       const calculationInputs = {
         facilitated_amount: facilitatedAmount,
         total_assets: totalAssetsValue,
         evic: companyType === 'listed' ? totalAssetsValue : 0,
         total_equity_plus_debt: companyType === 'unlisted' ? totalAssetsValue : 0,
         // Individual fields for EVIC calculation
         sharePrice: formData.sharePrice,
         outstandingShares: formData.outstandingShares,
         totalDebt: formData.totalDebt,
         minorityInterest: formData.minorityInterest,
         preferredStock: formData.preferredStock,
         // Individual fields for unlisted companies
         totalEquity: companyType === 'unlisted' ? formData.totalEquity : 0,
         // Weighting factor
         weighting_factor: formData.weightingFactor,
         // Option 1a - Verified GHG Emissions (convert to tonnes CO2e)
         verified_emissions: smartConvertUnit(formData.verifiedEmissions, formData.verifiedEmissionsUnit),
         // Option 1b - Unverified GHG Emissions (convert to tonnes CO2e)
         unverified_emissions: smartConvertUnit(formData.unverifiedEmissions, formData.unverifiedEmissionsUnit),
         // Option 2a - EPA/DEFRA electricity (energy_consumption already in tCO2e, EF = 1)
         energy_consumption: formData.energy_consumption || 0,
         emission_factor: selectedOptionCode === '2b' ? productionEmissionFactor : (formData.emission_factor || 0),
         process_emissions: formData.process_emissions || 0,
         factor_library: formData.factor_library || 'EPA',
         // Option 2b - Production Data
         production: smartConvertUnit(formData.production, formData.productionUnit),
         production_emission_factor: productionEmissionFactor,
         production_category: formData.productionCategory,
         production_material: formData.productionMaterial,
         production_declared_unit: formData.productionUnit,
         factor_dataset: formData.factor_dataset || MATERIAL_FACTOR_DATASET,
         // Options 3a / 3c
         company_revenue: formData.companyRevenue,
         asset_turnover_ratio: formData.assetTurnoverRatio,
         intensity_country_name: formData.intensity_country_name,
         sector_key: formData.sector_key,
         sector_code: formData.sector_code,
         sector_name: formData.sector_name,
         sector_intensity: formData.sector_intensity,
         sector_intensity_unit: formData.sector_intensity_unit,
       };

      const calculationResult = calculationEngine.calculate(selectedFormula, calculationInputs, companyType === 'unlisted' ? 'private' : companyType);
      
      const localResult: FacilitatedCalculationResult = {
        attributionFactor: calculationResult.attributionFactor,
        facilitatedEmission: calculationResult.financedEmissions,
        evic: companyType === 'listed' ? totalAssetsValue : undefined,
        totalEquityPlusDebt: companyType === 'unlisted' ? totalAssetsValue : undefined,
        dataQualityScore: calculationResult.dataQualityScore,
        methodology: calculationResult.methodology, 
        calculationSteps: calculationResult.calculationSteps
      };

      // Instant local preview; parent callback after API confirm (or local if JWT off)
      setResult(localResult);

      void (async () => {
        const confirmed = await resolveFinancedCalculation({
          calc_kind: "facilitated",
          formula_id: selectedFormula,
          company_type: companyType === "unlisted" ? "unlisted" : companyType,
          inputs: calculationInputs as Record<string, unknown>,
          persist: false,
          local: {
            attributionFactor: calculationResult.attributionFactor,
            financedEmissions: calculationResult.financedEmissions,
            dataQualityScore: calculationResult.dataQualityScore,
            methodology: calculationResult.methodology,
            calculationSteps: calculationResult.calculationSteps,
          },
        });

        const result: FacilitatedCalculationResult = {
          attributionFactor: confirmed.attributionFactor,
          facilitatedEmission: confirmed.financedEmissions,
          evic: companyType === 'listed' ? totalAssetsValue : undefined,
          totalEquityPlusDebt: companyType === 'unlisted' ? totalAssetsValue : undefined,
          dataQualityScore: confirmed.dataQualityScore,
          methodology: confirmed.methodology ?? calculationResult.methodology,
          calculationSteps:
            confirmed.calculationSteps ?? calculationResult.calculationSteps,
          pcafFormulaId: selectedFormula,
          pcafInputs: calculationInputs as Record<string, unknown>,
          companyType,
        };

        setResult(result);
        try {
          sessionStorage.setItem('facilitatedFormState', JSON.stringify({
            formData,
            companyType,
            ts: Date.now()
          }));
        } catch (error) {
          void error;
        }

        if (onCalculationComplete) {
          onCalculationComplete(result);
        }
      })();
      
      toast({
        title: "Facilitated Emission Calculation Complete",
        description: `Facilitated emission calculated using ${calculationResult.methodology}`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const getCurrentFormula = () => {
    return availableFormulas.find(f => f.id === selectedFormula);
  };

  const formula = availableFormulas[0];
  const listedEvic =
    formData.sharePrice * formData.outstandingShares +
    formData.totalDebt +
    formData.minorityInterest +
    formData.preferredStock;
  const unlistedValue = formData.totalEquity + formData.totalDebt;
  const emissionsLocked =
    hasEmissions === "yes" &&
    ((verificationStatus === "verified" && selectedOptionCode === "1a") ||
      (verificationStatus === "unverified" && selectedOptionCode === "1b"));

  const optionTitle =
    selectedOptionCode === "1a"
      ? "Verified GHG emissions"
      : selectedOptionCode === "1b"
        ? "Unverified GHG emissions"
        : selectedOptionCode === "2a"
          ? "Electricity (EPA / DEFRA)"
          : selectedOptionCode === "2b"
            ? "Production data"
            : selectedOptionCode === "3a"
              ? "Revenue-based sector proxy"
              : selectedOptionCode === "3c"
                ? "Asset turnover (ATR)"
                : "Option inputs";

  const optionDescription =
    selectedOptionCode === "1a"
      ? "Third-party verified company GHG"
      : selectedOptionCode === "1b"
        ? "Company-reported GHG (not yet verified)"
        : selectedOptionCode === "2a"
          ? "Same Scope 2 form as finance emissions"
          : selectedOptionCode === "2b"
            ? "Production volume × emission factor"
            : selectedOptionCode === "3a" || selectedOptionCode === "3c"
              ? "Sector intensity from the reference table (GHG ÷ revenue)"
              : undefined;

  const unitSelectClass = cn(FIELD_INPUT, "w-[7.5rem] shrink-0");

  return (
    <div className="space-y-5">
      {formula && (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-[14px] border border-[#DCEAE2] bg-[#F3FAF6] px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
              PCAF option {formula.optionCode}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">{formula.name}</p>
            <p className="mt-0.5 text-sm text-[#64748B]">{formula.description}</p>
          </div>
          <Badge className={cn("shrink-0 border", getDataQualityColor(formula.dataQualityScore))}>
            Score {formula.dataQualityScore}
          </Badge>
        </div>
      )}

      {availableFormulas.length === 0 && (
        <div className="rounded-[14px] border border-red-200 bg-red-50 px-4 py-3.5">
          <p className="text-sm font-medium text-red-800">No formula available for the current selections</p>
          <p className="mt-1 text-xs text-red-700">
            Structure: {corporateStructure || "—"} · Emissions: {hasEmissions || "—"} · Verification:{" "}
            {verificationStatus || "—"} · Method: {calculationMethod || "—"}
          </p>
        </div>
      )}

      {selectedFormula && (
        <>
          <InputSection
            title="Underwriting"
            description="Deal size and your share — facilitated amount and weighting are shown below"
          >
            <FieldGrid>
              <FormField
                label="Underwriting amount"
                unit="PKR"
                required
                tooltip="Total amount you underwrote for this deal"
              >
                <FormattedNumberInput
                  id="underwriting-amount"
                  placeholder="0"
                  value={formData.underwritingAmount || 0}
                  onChange={(value) => updateFormData("underwritingAmount", value)}
                  className={FIELD_INPUT}
                />
              </FormField>
              <FormField
                label="Underwriting share"
                unit="%"
                required
                tooltip="Your percentage of the total underwriting"
              >
                <FormattedNumberInput
                  id="underwriting-share"
                  placeholder="0"
                  min={0}
                  max={100}
                  step={0.01}
                  value={formData.underwritingShare || 0}
                  onChange={(value) => updateFormData("underwritingShare", value)}
                  className={FIELD_INPUT}
                />
              </FormField>
              <ComputedBox
                label="Facilitated amount"
                value={facilitatedAmount.toLocaleString()}
                unit="PKR"
                hint={`${formData.underwritingAmount.toLocaleString()} × ${formData.underwritingShare}%`}
              />
              <ComputedBox
                label="Weighting factor"
                value="33%"
                hint="Fixed PCAF weighting (0.33)"
              />
            </FieldGrid>
          </InputSection>

          {needsCompanyValue && (
            <InputSection
              title={companyType === "listed" ? "Company value (EVIC)" : "Company value (equity + debt)"}
              description={
                companyType === "listed"
                  ? "Enterprise value including cash for attribution"
                  : "Total equity plus debt for attribution"
              }
            >
              {companyType === "listed" ? (
                <FieldGrid>
                  <FormField label="Share price" unit="PKR" required tooltip="Current price of one share">
                    <FormattedNumberInput
                      id="share-price"
                      placeholder="0"
                      value={formData.sharePrice || 0}
                      onChange={(value) => updateFormData("sharePrice", value)}
                      className={FIELD_INPUT}
                    />
                  </FormField>
                  <FormField label="Outstanding shares" required tooltip="Total shares outstanding">
                    <FormattedNumberInput
                      id="outstanding-shares"
                      placeholder="0"
                      value={formData.outstandingShares || 0}
                      onChange={(value) => updateFormData("outstandingShares", value)}
                      className={FIELD_INPUT}
                    />
                  </FormField>
                  <FormField label="Total debt" unit="PKR" required tooltip="Total company debt">
                    <FormattedNumberInput
                      id="total-debt"
                      placeholder="0"
                      value={formData.totalDebt || 0}
                      onChange={(value) => updateFormData("totalDebt", value)}
                      className={FIELD_INPUT}
                    />
                  </FormField>
                  <FormField
                    label="Minority interest"
                    unit="PKR"
                    tooltip="Ownership in subsidiaries held by outside investors"
                  >
                    <FormattedNumberInput
                      id="minority-interest"
                      placeholder="0"
                      value={formData.minorityInterest || 0}
                      onChange={(value) => updateFormData("minorityInterest", value)}
                      className={FIELD_INPUT}
                    />
                  </FormField>
                  <FormField
                    label="Preferred stock"
                    unit="PKR"
                    tooltip="Preferred equity outstanding"
                  >
                    <FormattedNumberInput
                      id="preferred-stock"
                      placeholder="0"
                      value={formData.preferredStock || 0}
                      onChange={(value) => updateFormData("preferredStock", value)}
                      className={FIELD_INPUT}
                    />
                  </FormField>
                  <ComputedBox
                    label="EVIC"
                    value={listedEvic.toLocaleString()}
                    unit="PKR"
                    hint="Share price × shares + debt + minority + preferred"
                  />
                </FieldGrid>
              ) : (
                <FieldGrid>
                  <FormField label="Total equity" unit="PKR" required tooltip="Book equity of the company">
                    <FormattedNumberInput
                      id="total-equity"
                      placeholder="0"
                      value={formData.totalEquity || 0}
                      onChange={(value) => updateFormData("totalEquity", value)}
                      className={FIELD_INPUT}
                    />
                  </FormField>
                  <FormField label="Total debt" unit="PKR" required tooltip="Total company debt">
                    <FormattedNumberInput
                      id="total-debt-unlisted"
                      placeholder="0"
                      value={formData.totalDebt || 0}
                      onChange={(value) => updateFormData("totalDebt", value)}
                      className={FIELD_INPUT}
                    />
                  </FormField>
                  <ComputedBox
                    label="Equity + debt"
                    value={unlistedValue.toLocaleString()}
                    unit="PKR"
                  />
                </FieldGrid>
              )}
            </InputSection>
          )}

          {selectedOptionCode === "2a" ? (
            <EnergyEmissionInputs
              formData={formData as unknown as Record<string, unknown>}
              onUpdateFormData={(field, value) => updateFormData(field, value)}
            />
          ) : selectedOptionCode === "3a" || selectedOptionCode === "3c" ? (
            <SectorProxyInputs
              optionCode={selectedOptionCode}
              formData={formData as unknown as Record<string, unknown>}
              onUpdateFormData={(field, value) => updateFormData(field, value)}
            />
          ) : (
            <InputSection title={optionTitle} description={optionDescription}>
              <FieldGrid>
                {selectedOptionCode === "1a" && (
                  <FormField
                    label="Verified GHG emissions"
                    required
                    tooltip="Third-party verified company GHG"
                    span
                  >
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="verified-emissions"
                        placeholder="0"
                        value={formData.verifiedEmissions || 0}
                        onChange={(value) => updateFormData("verifiedEmissions", value)}
                        disabled={emissionsLocked}
                        className={cn(FIELD_INPUT, "flex-1", emissionsLocked && "bg-[#F1F5F9]")}
                      />
                      <Select
                        value={formData.verifiedEmissionsUnit}
                        onValueChange={(value) => updateFormData("verifiedEmissionsUnit", value)}
                        disabled={emissionsLocked}
                      >
                        <SelectTrigger className={unitSelectClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tCO2e">tCO₂e</SelectItem>
                          <SelectItem value="ktCO2e">ktCO₂e</SelectItem>
                          <SelectItem value="MtCO2e">MtCO₂e</SelectItem>
                          <SelectItem value="GtCO2e">GtCO₂e</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {emissionsLocked && (
                      <p className="mt-1.5 text-xs text-[#94A3B8]">Auto-filled from questionnaire</p>
                    )}
                  </FormField>
                )}

                {selectedOptionCode === "1b" && (
                  <FormField
                    label="Unverified GHG emissions"
                    required
                    tooltip="Company-reported GHG not yet externally verified"
                    span
                  >
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="unverified-emissions"
                        placeholder="0"
                        value={formData.unverifiedEmissions || 0}
                        onChange={(value) => updateFormData("unverifiedEmissions", value)}
                        disabled={emissionsLocked}
                        className={cn(FIELD_INPUT, "flex-1", emissionsLocked && "bg-[#F1F5F9]")}
                      />
                      <Select
                        value={formData.unverifiedEmissionsUnit}
                        onValueChange={(value) => updateFormData("unverifiedEmissionsUnit", value)}
                        disabled={emissionsLocked}
                      >
                        <SelectTrigger className={unitSelectClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tCO2e">tCO₂e</SelectItem>
                          <SelectItem value="ktCO2e">ktCO₂e</SelectItem>
                          <SelectItem value="MtCO2e">MtCO₂e</SelectItem>
                          <SelectItem value="GtCO2e">GtCO₂e</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {emissionsLocked && (
                      <p className="mt-1.5 text-xs text-[#94A3B8]">Auto-filled from questionnaire</p>
                    )}
                  </FormField>
                )}

                {selectedOptionCode === "2b" && (
                  <>
                    <FormField
                      label="Production category"
                      required
                      tooltip="Material family from the ICE embodied-carbon dataset"
                    >
                      <Select
                        value={formData.productionCategory}
                        onValueChange={(value) => {
                          const first = productionFactorRows.find((row) => row.category === value);
                          if (first) applyProductionMaterial(first);
                          else updateFormData("productionCategory", value);
                          setMaterialSearch("");
                        }}
                      >
                        <SelectTrigger className={FIELD_INPUT}>
                          <SelectValue placeholder={loadingProductionFactors ? "Loading categories..." : "Select category"} />
                        </SelectTrigger>
                        <SelectContent>
                          {productionCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {formatFactorText(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField
                      label="Sub category"
                      tooltip="Narrow down category rows before material selection"
                    >
                      <Select
                        value={formData.productionSubCategory}
                        onValueChange={(value) => {
                          updateFormData("productionSubCategory", value);
                          const first = productionFactorRows.find(
                            (row) =>
                              (!formData.productionCategory || row.category === formData.productionCategory) &&
                              row.subCategory === value
                          );
                          if (first) applyProductionMaterial(first);
                          setMaterialSearch("");
                        }}
                        disabled={!formData.productionCategory}
                      >
                        <SelectTrigger className={FIELD_INPUT}>
                          <SelectValue placeholder="All sub categories" />
                        </SelectTrigger>
                        <SelectContent>
                          {productionSubCategories.map((sub) => (
                            <SelectItem key={sub} value={sub}>
                              {formatFactorText(sub)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField
                      label="Production material"
                      required
                      tooltip="Specific ICE material/product row used as the production emission factor"
                      span
                    >
                      <Popover open={materialOpen} onOpenChange={setMaterialOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={materialOpen}
                            className={cn(
                              FIELD_INPUT,
                              "w-full justify-between font-normal",
                              !formData.productionMaterial && "text-[#94A3B8]"
                            )}
                            disabled={loadingProductionFactors}
                          >
                            <span className="truncate">
                              {loadingProductionFactors
                                ? "Loading materials..."
                                : formatFactorText(formData.productionMaterial) || "Select material"}
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
                                {productionMaterials.map((row) => (
                                  <CommandItem
                                    key={`${row.category}-${row.subCategory}-${row.materialName}-${row.declaredUnit}`}
                                    value={`${row.materialName} ${row.subCategory}`}
                                    onSelect={() => {
                                      applyProductionMaterial(row);
                                      setMaterialOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.productionMaterial === row.materialName ? "opacity-100" : "opacity-0"
                                      )}
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
                      {selectedProductionMaterial && (
                        <p className="mt-1.5 text-xs text-[#64748B]">
                          Dataset: ICE Educational V5.0 · Declared unit: {productionUnitLabel(selectedProductionMaterial.declaredUnit)}
                        </p>
                      )}
                    </FormField>
                    {materialUnitOptions.length > 1 && (
                      <FormField
                        label="Declared unit"
                        tooltip="Some materials have multiple declared units. Choose the matching basis."
                      >
                        <Select
                          value={formData.productionUnit}
                          onValueChange={(value) => applyMaterialDeclaredUnit(value)}
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
                    )}
                    <FormField label="Production" required tooltip="Client production volume">
                      <div className="flex gap-2">
                        <FormattedNumberInput
                          id="production"
                          placeholder="0"
                          value={formData.production || 0}
                          onChange={(value) => updateFormData("production", value)}
                          className={cn(FIELD_INPUT, "flex-1")}
                        />
                        <Select
                          value={formData.productionUnit}
                          onValueChange={(value) => updateFormData("productionUnit", value)}
                        >
                          <SelectTrigger className={unitSelectClass}>
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
                    <FormField
                      label="Emission factor"
                      required
                      tooltip="Embodied carbon factor from the selected production material"
                    >
                      <div className="flex gap-2">
                        <FormattedNumberInput
                          id="production-emission-factor"
                          placeholder="0"
                          value={formData.productionEmissionFactor || 0}
                          onChange={(value) => updateFormData("productionEmissionFactor", value)}
                          className={cn(FIELD_INPUT, "flex-1")}
                        />
                        <Select
                          value={formData.productionEmissionFactorUnit}
                          onValueChange={(value) =>
                            handleProductionEmissionFactorUnitChange(value)
                          }
                        >
                          <SelectTrigger className={cn(FIELD_INPUT, "w-[10.5rem] shrink-0")}>
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
                  </>
                )}
              </FieldGrid>
            </InputSection>
          )}
        </>
      )}

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          onClick={calculateFacilitatedEmission}
          disabled={!selectedFormula}
          className="h-11 rounded-xl bg-[#0F6E56] px-6 text-white hover:bg-[#0D5E49]"
        >
          <Calculator className="mr-2 h-4 w-4" />
          Calculate facilitated emission
        </Button>
      </div>

      {result && (
        <InputSection
          title="Results"
          description={result.methodology}
          action={
            result.dataQualityScore != null && isFinite(result.dataQualityScore) ? (
              <Badge className={cn("border", getDataQualityColor(result.dataQualityScore))}>
                Score {result.dataQualityScore}
              </Badge>
            ) : undefined
          }
        >
          <FieldGrid>
            <ComputedBox
              label="Attribution factor"
              value={result.attributionFactor.toFixed(6)}
            />
            <ComputedBox
              label="Facilitated emission"
              value={result.facilitatedEmission.toFixed(2)}
              unit="tCO₂e"
            />
          </FieldGrid>

          {result.calculationSteps && result.calculationSteps.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                Calculation steps
              </p>
              {result.calculationSteps.map((step, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-[#0F172A]">{step.step}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-[#0F6E56]">
                      {step.value.toFixed(4)}
                    </p>
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-[#94A3B8]">
                    {step.formula}
                  </p>
                </div>
              ))}
            </div>
          )}
        </InputSection>
      )}
    </div>
  );
};

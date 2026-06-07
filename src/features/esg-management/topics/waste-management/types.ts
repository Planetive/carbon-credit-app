export type PolicyAnswer = "Yes" | "No";

export interface WastePolicyAssessment {
  wastePolicyExists: PolicyAnswer;
  wasteProcedureExists: PolicyAnswer;
  wasteReductionTargets: string;
  wasteSegregationProcess: string;
  wasteContractorsApproved: PolicyAnswer;
  hazardousWasteProcedure: PolicyAnswer;
  wasteImpactAssessmentConducted: PolicyAnswer;
}

export type WasteGenerationCategory =
  | "hazardous"
  | "non_hazardous"
  | "drilling"
  | "production"
  | "maintenance";

export interface WasteGenerationRow {
  id: string;
  wasteType: string;
  field: string;
  businessUnit: string;
  month: number;
  category: WasteGenerationCategory;
  quantity: number;
  unit: "tonnes";
  reportingYear: number;
}

export interface WasteDivertedRow {
  id: string;
  wasteCategory: string;
  field: string;
  businessUnit: string;
  month: number;
  quantity: number;
  unit: "tonnes";
  method: "Recycling" | "Reuse" | "Recovery" | "Composting" | "Other Diversion";
  reportingYear: number;
}

export interface WasteDisposalRow {
  id: string;
  wasteCategory: string;
  field: string;
  businessUnit: string;
  month: number;
  quantity: number;
  unit: "tonnes";
  disposalMethod:
    | "Landfill"
    | "Incineration"
    | "Deep Well Injection"
    | "Waste Treatment Facility"
    | "Other Disposal";
  reportingYear: number;
}

export interface WasteManagementData {
  policy: Partial<WastePolicyAssessment>;
  generationRows: WasteGenerationRow[];
  divertedRows: WasteDivertedRow[];
  disposalRows: WasteDisposalRow[];
  hydrocarbonProduction: number | null;
  reportingPeriod: string;
}

export type WasteStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, WasteManagementData>;
};

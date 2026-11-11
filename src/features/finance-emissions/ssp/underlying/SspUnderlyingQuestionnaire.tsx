import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { MortgageForm } from "../../forms/MortgageForm";
import { CommercialRealEstatePropertiesForm } from "../../forms/CommercialRealEstatePropertiesForm";
import { CommercialRealEstateForm } from "../../forms/CommercialRealEstateForm";
import { MotorVehicleLoanForm } from "../../forms/MotorVehicleLoanForm";
import EnergyEmissionInputs from "../../forms/EnergyEmissionInputs";
import SectorProxyInputs from "../../forms/SectorProxyInputs";
import {
  CompanyAttributionInputs,
  computeCompanyDenominator,
  type CompanyListing,
} from "../../forms/CompanyAttributionInputs";
import { CompanyReportedEmissionsInputs } from "../../forms/CompanyReportedEmissionsInputs";
import { ProductionFactorInputs } from "../../forms/ProductionFactorInputs";
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "../../forms/InputLayout";
import type { FinanceFormData, FinanceFormValue } from "../../types/contracts";
import type { SspCollateral } from "../types";
import {
  createEmptyCommercialProperty,
  createEmptyProperty,
  normalizeClassInputs,
  serializeClassInputs,
  type SspClassInputsV1,
} from "./classInputs";
import {
  formulasForCollateral,
  optionChoices,
  selectedFormula,
} from "./formulasForCollateral";

/**
 * Reuses standalone PCAF questionnaires inside SSP collateral look-through.
 * Collects inputs only — no SSP attribution / financed-emissions calculation.
 */

type Props = {
  collateral: SspCollateral;
  onChange: (patch: Partial<SspCollateral>) => void;
  onTouch?: (key: string) => void;
};

function isCompanyClass(type: string): boolean {
  return (
    type === "business-loan" ||
    type === "unlisted-equity" ||
    type === "corporate-bond" ||
    type === "listed-equity"
  );
}

function defaultListing(type: string, structure: string): CompanyListing {
  if (structure === "listed" || structure === "unlisted") return structure;
  if (type === "listed-equity" || type === "corporate-bond") return "listed";
  return "unlisted";
}

function sumPropertyValues(properties: { propertyValueAtOrigination: number }[]): number {
  return properties.reduce((sum, p) => sum + (Number(p.propertyValueAtOrigination) || 0), 0);
}

export function SspUnderlyingQuestionnaire({ collateral, onChange, onTouch }: Props) {
  const inputs = useMemo(
    () => normalizeClassInputs(collateral.classInputs, { defaultPropertyId: `${collateral.collateralId}-prop` }),
    [collateral.classInputs, collateral.collateralId]
  );

  const seedProperty = useMemo(
    () => createEmptyProperty(),
    // Stable placeholder until the user edits and we persist a real row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collateral.collateralId]
  );
  const seedCommercial = useMemo(
    () => createEmptyCommercialProperty(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collateral.collateralId]
  );

  const applicability = formulasForCollateral(collateral.collateralType, inputs.methodSelection);
  const formula = selectedFormula(applicability, collateral.pcafMethodOption);
  const options = optionChoices(applicability);
  const mortgageProperties = inputs.properties.length ? inputs.properties : [seedProperty];
  const creProperties = inputs.commercialProperties.length
    ? inputs.commercialProperties
    : [seedCommercial];

  const commit = (next: SspClassInputsV1, extra?: Partial<SspCollateral>) => {
    const patch: Partial<SspCollateral> = {
      classInputs: serializeClassInputs(next),
      ...extra,
    };
    onChange(patch);
  };

  const updateMethod = (field: keyof SspClassInputsV1["methodSelection"], value: string) => {
    const methodSelection = { ...inputs.methodSelection, [field]: value };
    // Reset dependent fields when branching changes.
    if (field === "hasEmissions") {
      methodSelection.verificationStatus = "";
      methodSelection.calculationMethod = "";
    }
    if (field === "corporateStructure") {
      methodSelection.calculationMethod = "";
    }
    const next = { ...inputs, methodSelection };
    const nextApplicability = formulasForCollateral(collateral.collateralType, methodSelection);
    const nextFormula = selectedFormula(nextApplicability, "");
    commit(next, {
      pcafMethodOption: nextFormula?.id || "",
      dataQualityScore: nextFormula?.dataQualityScore ?? collateral.dataQualityScore,
    });
  };

  const updateFormData = (field: string, value: FinanceFormValue) => {
    const formData = { ...inputs.formData, [field]: value } as FinanceFormData & Record<string, unknown>;
    const next = { ...inputs, formData };
    const extra: Partial<SspCollateral> = {};

    if (field === "total_value_at_origination") {
      const n = Number(value) || null;
      extra.attributionDenominator = n;
      extra.assetValueAtOrigination = n;
    }
    if (field === "scope1Emissions") extra.scope1Emissions = value == null ? null : Number(value) || null;
    if (field === "scope2Emissions") extra.scope2Emissions = value == null ? null : Number(value) || null;
    if (field === "scope3Emissions") extra.scope3Emissions = value == null ? null : Number(value) || null;
    if (field === "factor_library_entry_id") extra.factorLibraryEntryId = String(value || "");

    if (isCompanyClass(collateral.collateralType)) {
      const listing = defaultListing(collateral.collateralType, inputs.methodSelection.corporateStructure);
      const denom = computeCompanyDenominator(listing, formData);
      if (denom > 0) {
        extra.attributionDenominator = denom;
        extra.denominatorLabel = listing === "listed" ? "EVIC" : "Total equity + debt";
      }
    }

    commit(next, extra);
  };

  const setOption = (optionCodeOrId: string) => {
    const match =
      options.find((f) => f.id === optionCodeOrId) ||
      options.find((f) => f.optionCode === optionCodeOrId) ||
      null;
    const methodSelection = {
      ...inputs.methodSelection,
      calculationMethod: match?.optionCode || optionCodeOrId,
    };
    commit(
      { ...inputs, methodSelection },
      {
        pcafMethodOption: match?.id || optionCodeOrId,
        dataQualityScore: match?.dataQualityScore ?? null,
      }
    );
  };

  if (!collateral.collateralType) {
    return (
      <p className="text-sm text-[#64748B]">Select a collateral PCAF class to open the underlying questionnaire.</p>
    );
  }

  if (applicability.status === "unsupported") {
    return (
      <div className="space-y-3 rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] p-4">
        <p className="text-sm font-semibold text-[#0F172A]">Underlying questionnaire unavailable</p>
        <p className="text-sm text-[#64748B]">{applicability.reason}</p>
        {collateral.collateralType === "other-hard-asset" ? (
          <FieldGrid>
            <FormField label="Asset value" unit="PKR" hint="Attribution denominator for the asset">
              <FormattedNumberInput
                id={`${collateral.collateralId}-asset-value`}
                placeholder="0"
                value={collateral.attributionDenominator}
                onChange={(v) =>
                  onChange({
                    attributionDenominator: v,
                    assetValueAtOrigination: v,
                    classInputs: serializeClassInputs({
                      ...inputs,
                      formData: { ...inputs.formData, assetValue: v },
                    }),
                  })
                }
                onClear={() => onChange({ attributionDenominator: null, assetValueAtOrigination: null })}
                onBlur={() => onTouch?.(`collateral.${collateral.collateralId}.attributionDenominator`)}
                className={FIELD_INPUT}
              />
            </FormField>
          </FieldGrid>
        ) : null}
      </div>
    );
  }

  const showCompanyBranch = isCompanyClass(collateral.collateralType);
  const listing = defaultListing(collateral.collateralType, inputs.methodSelection.corporateStructure);
  const optionCode = formula?.optionCode || "";
  const needsEnergy2a =
    showCompanyBranch && optionCode === "2a";
  const needsSectorProxy = showCompanyBranch && (optionCode === "3a" || optionCode === "3c");
  const needsProduction2b = showCompanyBranch && optionCode === "2b";
  const needsReported =
    showCompanyBranch && inputs.methodSelection.hasEmissions === "yes" && Boolean(optionCode);

  const creMortgageEnergy =
    (collateral.collateralType === "mortgage" || collateral.collateralType === "commercial-real-estate") &&
    formula &&
    ["1a", "1b", "2a", "2b", "3"].includes(optionCode);

  return (
    <div className="space-y-4 rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] p-4">
      <div>
        <p className="text-sm font-semibold text-[#0F172A]">Underlying PCAF questionnaire</p>
        <p className="text-xs text-[#64748B] mt-0.5">
          Reuses the standalone calculator forms. Inputs persist on this collateral. Outstanding amounts stay on
          SSP loans / holdings. No financed-emissions formula runs here.
        </p>
      </div>

      {applicability.status === "uncertain" ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Methodology flag: {applicability.reason}
        </p>
      ) : null}
      {applicability.notes?.length ? (
        <ul className="text-xs text-[#64748B] list-disc pl-4 space-y-1">
          {applicability.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {showCompanyBranch ? (
        <InputSection title="Method selection" description="Same branching as the standalone bond / business loan calculator">
          <FieldGrid>
            <FormField label="Listed / unlisted">
              <select
                className={FIELD_INPUT}
                value={inputs.methodSelection.corporateStructure || listing}
                onChange={(e) => updateMethod("corporateStructure", e.target.value)}
              >
                <option value="listed">Listed (EVIC)</option>
                <option value="unlisted">Unlisted (equity + debt)</option>
              </select>
            </FormField>
            <FormField label="Company GHG emissions available?">
              <select
                className={FIELD_INPUT}
                value={inputs.methodSelection.hasEmissions}
                onChange={(e) => updateMethod("hasEmissions", e.target.value)}
              >
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </FormField>
            {inputs.methodSelection.hasEmissions === "yes" ? (
              <FormField label="Verification">
                <select
                  className={FIELD_INPUT}
                  value={inputs.methodSelection.verificationStatus}
                  onChange={(e) => updateMethod("verificationStatus", e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="verified">Verified</option>
                  <option value="unverified">Unverified</option>
                </select>
              </FormField>
            ) : null}
            {inputs.methodSelection.hasEmissions === "no" && options.length > 0 ? (
              <FormField label="PCAF option">
                <select
                  className={FIELD_INPUT}
                  value={formula?.optionCode || inputs.methodSelection.calculationMethod || ""}
                  onChange={(e) => setOption(e.target.value)}
                >
                  <option value="">Select…</option>
                  {options.map((f) => (
                    <option key={f.id} value={f.optionCode}>
                      {f.optionCode} — {f.name.replace(/^Option\s+/i, "")}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : null}
          </FieldGrid>
        </InputSection>
      ) : (
        <InputSection title="PCAF method option" description="Matches standalone calculator option cards">
          <FieldGrid>
            <FormField label="Option">
              <select
                className={FIELD_INPUT}
                value={formula?.optionCode || inputs.methodSelection.calculationMethod || ""}
                onChange={(e) => setOption(e.target.value)}
              >
                <option value="">Select…</option>
                {options.map((f) => (
                  <option key={f.id} value={f.optionCode}>
                    {f.optionCode} — score {f.dataQualityScore}
                  </option>
                ))}
              </select>
            </FormField>
            {formula ? (
              <FormField label="Selected formula id">
                <Input className={FIELD_INPUT} value={formula.id} readOnly />
              </FormField>
            ) : null}
          </FieldGrid>
        </InputSection>
      )}

      {collateral.collateralType === "mortgage" ? (
        <MortgageForm
          properties={mortgageProperties}
          selectedFormula={formula}
          onAddProperty={() =>
            commit({ ...inputs, properties: [...mortgageProperties, createEmptyProperty()] })
          }
          onRemoveProperty={(id) =>
            commit({
              ...inputs,
              properties:
                mortgageProperties.length <= 1
                  ? mortgageProperties
                  : mortgageProperties.filter((p) => p.id !== id),
            })
          }
          onUpdateProperty={(id, field, value) => {
            const properties = mortgageProperties.map((p) =>
              p.id === id ? { ...p, [field]: value } : p
            );
            const total = sumPropertyValues(properties);
            commit(
              { ...inputs, properties },
              {
                attributionDenominator: total || null,
                assetValueAtOrigination: total || null,
                denominatorLabel: "Property value at origination",
              }
            );
          }}
        />
      ) : null}

      {collateral.collateralType === "commercial-real-estate" ? (
        <CommercialRealEstatePropertiesForm
          properties={creProperties}
          totalEmission={Number(inputs.formData.total_emission) || 0}
          showTotalEmission={false}
          onAddProperty={() =>
            commit({
              ...inputs,
              commercialProperties: [...creProperties, createEmptyCommercialProperty()],
            })
          }
          onRemoveProperty={(id) =>
            commit({
              ...inputs,
              commercialProperties:
                creProperties.length <= 1
                  ? creProperties
                  : creProperties.filter((p) => p.id !== id),
            })
          }
          onUpdateProperty={(id, field, value) => {
            const commercialProperties = creProperties.map((p) =>
              p.id === id ? { ...p, [field]: value } : p
            );
            const total = sumPropertyValues(commercialProperties);
            commit(
              { ...inputs, commercialProperties },
              {
                attributionDenominator: total || null,
                assetValueAtOrigination: total || null,
                denominatorLabel: "Property value at origination",
              }
            );
          }}
        />
      ) : null}

      {creMortgageEnergy ? (
        <CommercialRealEstateForm
          selectedFormula={formula}
          formData={inputs.formData as FinanceFormData}
          onUpdateFormData={updateFormData}
        />
      ) : null}

      {collateral.collateralType === "motor-vehicle-loan" ? (
        <MotorVehicleLoanForm
          selectedFormula={formula}
          formData={inputs.formData as FinanceFormData}
          onUpdateFormData={(field, value) => {
            updateFormData(field, value);
            if (field === "total_value_at_origination") {
              onTouch?.(`collateral.${collateral.collateralId}.attributionDenominator`);
            }
          }}
        />
      ) : null}

      {showCompanyBranch ? (
        <>
          <CompanyAttributionInputs
            listing={listing}
            formData={inputs.formData as FinanceFormData}
            onUpdateFormData={updateFormData}
            showOutstanding={false}
          />
          {needsReported ? (
            <CompanyReportedEmissionsInputs
              formData={inputs.formData as FinanceFormData}
              onUpdateFormData={updateFormData}
              verified={inputs.methodSelection.verificationStatus === "verified"}
            />
          ) : null}
          {needsEnergy2a ? (
            <EnergyEmissionInputs
              formData={inputs.formData}
              onUpdateFormData={(field, value) => updateFormData(field, value as FinanceFormValue)}
            />
          ) : null}
          {needsProduction2b ? (
            <ProductionFactorInputs
              formData={inputs.formData as FinanceFormData}
              onUpdateFormData={updateFormData}
            />
          ) : null}
          {needsSectorProxy ? (
            <SectorProxyInputs
              optionCode={optionCode}
              formData={inputs.formData}
              onUpdateFormData={(field, value) => updateFormData(field, value as FinanceFormValue)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer SspUnderlyingQuestionnaire — kept as alias for existing imports. */
export { SspUnderlyingQuestionnaire as SspUnderlyingClassFields };

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FieldGrid, FIELD_INPUT, FormField, InputSection } from "../forms/InputLayout";
import { cn } from "@/lib/utils";
import { UOP_LOAN_TYPE, financeLoanTypeLabel } from "../config/loanTypeOptions";
import {
  allowedUopEmissionsPaths,
  currentEligibilityQuestion,
  resolveUopAccounting,
  uopQualifiesForMethod,
  visibleEligibilityQuestions,
  type UopEligibilityQuestionId,
} from "./eligibility";
import { ELIGIBILITY_COPY, uopOutcomeDisplay, uopRedirectLoanType } from "./copy";
import { ApprovedFactorPicker } from "./ApprovedFactorPicker";
import type { UopDraftSaveStatus } from "./draftPersistence";
import { UopPreviewNotice } from "./UopPreviewNotice";
import {
  EconomicBasisFields,
  NestedEstimationFields,
  SovereignEstimationExtras,
  SubSovereignEstimationFields,
  VehicleRowsEditor,
} from "./UopPhase5eFields";
import {
  UOP_CURRENCIES,
  addUnderlyingAsset,
  copySharedStructure,
  createUnderlyingAsset,
  patchUopDraft,
  patchUopEligibility,
  removeUnderlyingAsset,
  updateUnderlyingAsset,
} from "./state";
import {
  isUnsupportedUopAssetClass,
  optionDef,
  optionsForAssetClass,
  type UopPcafOptionDef,
} from "./underlyingOptions";
import {
  structureKindFitsClassification,
  structureKindsForClassification,
  validateUopStep,
} from "./validation";
import { UopResultsPanel } from "./UopResultsPanel";
import type {
  UopDraft,
  UopEmissionsPath,
  UopEstimationInputs,
  UopPcafOptionId,
  UopStructureKind,
  UopUnderlyingAsset,
  UopUnderlyingAssetClass,
  UopYesNo,
} from "./types";

export type UopSiblingOption = {
  key: string;
  label: string;
  structureId: string;
  structureName: string;
  draft: UopDraft;
};

const TILE = "w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-200";
const TILE_ON = "border-[#0F6E56] bg-[#EAF7F1] shadow-[0_8px_20px_rgba(15,110,86,0.06)]";
const TILE_OFF = "border-[#E8EEF0] bg-white hover:border-[#BFE3D3]";
const TILE_DISABLED = "border-[#E8EEF0] bg-[#F8FAFC] opacity-60 cursor-not-allowed";

function Choice({
  selected,
  title,
  description,
  onClick,
  compact,
  disabled,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onClick: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(TILE, compact && "px-3.5 py-2.5", disabled ? TILE_DISABLED : selected ? TILE_ON : TILE_OFF)}
    >
      <p className={cn("font-medium text-[#0F172A]", compact ? "text-sm" : "font-semibold")}>{title}</p>
      {description && <p className="text-sm text-[#64748B] mt-0.5 leading-snug">{description}</p>}
    </button>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600 flex items-center gap-1.5">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </p>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: UopYesNo;
  onChange: (value: UopYesNo) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Choice selected={value === "yes"} title="Yes" onClick={() => onChange("yes")} />
      <Choice selected={value === "no"} title="No" onClick={() => onChange("no")} />
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  onBlur,
  disabled,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  return (
    <FormattedNumberInput
      value={value ?? null}
      placeholder=""
      onChange={(next) => onChange(next)}
      onClear={() => onChange(null)}
      onBlur={onBlur}
      disabled={disabled}
    />
  );
}

function OutcomeCard({ draft, compact }: { draft: UopDraft; compact?: boolean }) {
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!outcome) return null;
  const display = uopOutcomeDisplay(outcome);
  if (compact) {
    return <p className="text-sm text-[#0F6E56] font-medium">{display.heading}</p>;
  }
  return (
    <div className="rounded-xl border border-[#DCEAE2] bg-white px-5 py-4">
      <p className="font-semibold text-[#0F172A]">{display.heading}</p>
      <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{display.body}</p>
    </div>
  );
}

function RedirectOrContinue({
  draft,
  onLeaveUop,
}: {
  draft: UopDraft;
  onLeaveUop?: (suggestedLoanType?: string | null) => void;
}) {
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!outcome) return null;
  if (uopQualifiesForMethod(outcome)) {
    return <OutcomeCard draft={draft} />;
  }
  const suggested = uopRedirectLoanType(outcome);
  const suggestedLabel = suggested ? financeLoanTypeLabel(suggested) : null;
  return (
    <div className="space-y-3">
      <OutcomeCard draft={draft} />
      <div className="rounded-[14px] border border-[#DCEAE2] bg-[#F8FAFC] p-4">
        <p className="text-sm text-[#0F172A] leading-relaxed">
          This deal is not calculated as Use of Proceeds. Choose the matching loan type to continue.
        </p>
        {onLeaveUop ? (
          <Button
            type="button"
            className="mt-3 h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white"
            onClick={() => onLeaveUop(suggested)}
          >
            {suggestedLabel ? `Switch to ${suggestedLabel}` : "Choose a different loan type"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const UNDERLYING_CLASSES: Array<{ value: UopUnderlyingAssetClass; label: string; unavailable?: boolean }> = [
  { value: "listed-equity", label: "Listed shares" },
  { value: "corporate-bond", label: "Corporate bond" },
  { value: "business-loan", label: "Business loan / private shares" },
  { value: "unlisted-equity", label: "Private shares" },
  { value: "project-finance", label: "Project finance" },
  { value: "commercial-real-estate", label: "Commercial property" },
  { value: "mortgage", label: "Home mortgage" },
  { value: "motor-vehicle-loan", label: "Vehicle loan" },
  { value: "sovereign-debt", label: "Government bond or loan" },
  { value: UOP_LOAN_TYPE, label: "Another Use of Proceeds vehicle (nested fund)" },
  { value: "sub-sovereign-debt", label: "Sub-sovereign / regional or local government" },
];

function assetClassLabel(value: string): string {
  return UNDERLYING_CLASSES.find((item) => item.value === value)?.label || financeLoanTypeLabel(value);
}

const STRUCTURE_KINDS: Array<{ value: UopStructureKind; label: string; hint: string }> = [
  { value: "equity-fund", label: "Equity fund", hint: "A fund that holds shares, kept off the manager’s books." },
  { value: "debt-fund", label: "Debt fund", hint: "A fund that holds loans or bonds, kept off the manager’s books." },
  { value: "holding-spv-without-control", label: "Holding company or SPV without control", hint: "You own a stake but do not control the vehicle." },
  { value: "labeled-bond", label: "Labeled bond (green, social, sustainability)", hint: "Usually on the issuer’s own books." },
  { value: "labeled-loan", label: "Labeled loan (green, social, sustainability)", hint: "A loan whose use of funds is documented." },
  { value: "multi-asset-loan", label: "Loan earmarked for several named assets", hint: "Usually on the borrower’s own books." },
  { value: "other", label: "Other documented earmarked financing", hint: "Must still pass the eligibility questions." },
];

function EligibilityStep({
  draft,
  onChange,
  errors,
  editing,
  onEditingChange,
  onLeaveUop,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
  editing: UopEligibilityQuestionId | null;
  onEditingChange: (id: UopEligibilityQuestionId | null) => void;
  onLeaveUop?: (suggestedLoanType?: string | null) => void;
}) {
  const e = draft.eligibility;
  const set = (patch: Parameters<typeof patchUopEligibility>[1]) => onChange(patchUopEligibility(draft, patch));
  const current = currentEligibilityQuestion(e);
  const path = visibleEligibilityQuestions(e);
  const active = editing ?? (current === "done" ? null : current);
  const shown =
    editing && path.includes(editing) ? path.slice(0, path.indexOf(editing) + 1) : path;

  const renderBody = (id: UopEligibilityQuestionId) => {
    switch (id) {
      case "proceedsAllocatedToSpecificAssets":
        return (
          <YesNo
            value={e.proceedsAllocatedToSpecificAssets}
            onChange={(proceedsAllocatedToSpecificAssets) => {
              set({ proceedsAllocatedToSpecificAssets });
              onEditingChange(null);
            }}
          />
        );
      case "isSecuritized":
        return (
          <YesNo
            value={e.isSecuritized}
            onChange={(isSecuritized) => {
              set({ isSecuritized });
              onEditingChange(null);
            }}
          />
        );
      case "structureHasControl":
        return (
          <YesNo
            value={e.structureHasControl}
            onChange={(structureHasControl) => {
              set({ structureHasControl });
              onEditingChange(null);
            }}
          />
        );
      case "controlOneFullyAllocatedAsset":
        return (
          <YesNo
            value={e.controlOneFullyAllocatedAsset}
            onChange={(controlOneFullyAllocatedAsset) => {
              set({ controlOneFullyAllocatedAsset });
              onEditingChange(null);
            }}
          />
        );
      case "controlAssetIsProject":
        return (
          <YesNo
            value={e.controlAssetIsProject}
            onChange={(controlAssetIsProject) => {
              set({ controlAssetIsProject });
              onEditingChange(null);
            }}
          />
        );
      case "structureListing":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Choice
              selected={e.structureListing === "listed"}
              title="Listed on a stock exchange"
              description="Shares trade on an exchange"
              onClick={() => {
                set({ structureListing: "listed" });
                onEditingChange(null);
              }}
            />
            <Choice
              selected={e.structureListing === "unlisted"}
              title="Not listed (private)"
              description="A private vehicle, not listed"
              onClick={() => {
                set({ structureListing: "unlisted" });
                onEditingChange(null);
              }}
            />
          </div>
        );
      case "debtBasedWithOneFullyAllocatedAsset":
        return (
          <YesNo
            value={e.debtBasedWithOneFullyAllocatedAsset}
            onChange={(debtBasedWithOneFullyAllocatedAsset) => {
              set({ debtBasedWithOneFullyAllocatedAsset });
              onEditingChange(null);
            }}
          />
        );
      case "singleAssetClass":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ["mortgage", "Home mortgage", "One home"],
                ["commercial-real-estate", "Commercial property", "One office, shop, or similar building"],
                ["motor-vehicle-loan", "Vehicle loan", "One car or other vehicle"],
                ["project-finance", "A single project", "One plant, road, or similar project"],
                ["other", "Another loan type", "Any other single named asset"],
              ] as const
            ).map(([value, title, hint]) => (
              <Choice
                key={value}
                selected={e.singleAssetClass === value}
                title={title}
                description={hint}
                onClick={() => {
                  set({ singleAssetClass: value });
                  onEditingChange(null);
                }}
              />
            ))}
          </div>
        );
      case "assetsOnIssuerBalanceSheet":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Choice
              selected={e.assetsOnIssuerBalanceSheet === "yes"}
              title="Yes — on the borrower’s books"
              description="Treat as integrated Use of Proceeds"
              onClick={() => {
                set({ assetsOnIssuerBalanceSheet: "yes" });
                onEditingChange(null);
              }}
            />
            <Choice
              selected={e.assetsOnIssuerBalanceSheet === "no"}
              title="No — in a separate fund or vehicle"
              description="Treat as a separate fund or vehicle"
              onClick={() => {
                set({ assetsOnIssuerBalanceSheet: "no" });
                onEditingChange(null);
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {shown.map((id) => {
        const copy = ELIGIBILITY_COPY[id];
        const isActive = id === active;
        if (!isActive) {
          return (
            <div
              key={id}
              className="flex items-start justify-between gap-3 rounded-[14px] border border-[#E8EEF0] bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-[#64748B]">{copy.title}</p>
                <p className="mt-0.5 text-sm font-medium text-[#0F172A]">{copy.recap(e)}</p>
              </div>
              <Button type="button" variant="ghost" className="h-8 shrink-0 text-[#0F6E56]" onClick={() => onEditingChange(id)}>
                Change
              </Button>
            </div>
          );
        }
        return (
          <InputSection key={id} title={copy.title} description={copy.example} tooltip={copy.pcaf}>
            {renderBody(id)}
          </InputSection>
        );
      })}
      {current === "done" && !editing && (
        <RedirectOrContinue
          draft={draft}
          onLeaveUop={onLeaveUop}
        />
      )}
      <ErrorText message={errors.eligibility} />
    </div>
  );
}

function StructureStep({
  draft,
  onChange,
  errors,
  siblingHoldings,
  onTouch,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
  siblingHoldings?: UopSiblingOption[];
  onTouch: (key: string) => void;
}) {
  const set = (patch: Partial<UopDraft>) => onChange(patchUopDraft(draft, patch));
  const outcome = resolveUopAccounting(draft.eligibility);
  const moneyUnit = draft.currency || "deal currency";
  const integrated = outcome?.kind === "uop" && outcome.classification === "integrated";
  const canLinkFund = !draft.investmentId || !draft.structureId;
  const linkable = (siblingHoldings || []).filter((item) => item.structureId && item.key !== draft.instanceKey);
  const allowedKinds = new Set(
    structureKindsForClassification(outcome?.kind === "uop" ? outcome.classification : null)
  );
  const visibleKinds = STRUCTURE_KINDS.filter(
    (kind) => allowedKinds.has(kind.value) || draft.structureKind === kind.value
  );

  return (
    <div className="space-y-6">
      {outcome?.kind === "uop" && <OutcomeCard draft={draft} compact />}
      {(draft.siblingCount || 0) > 0 && (
        <p className="text-sm text-[#0F6E56] rounded-xl border border-[#BFE3D3] bg-[#EAF7F1] px-4 py-3">
          This holding shares fund name, totals, and assets with {draft.siblingCount} other investment{draft.siblingCount === 1 ? "" : "s"}.
        </p>
      )}
      {canLinkFund && linkable.length > 0 && (
        <InputSection
          title="Is this another holding in an existing fund?"
          description="Linking uses the shared fund data. It does not copy this deal onto the other holding."
        >
          <div className="grid grid-cols-1 gap-3">
            <Choice
              selected={!draft.structureId}
              title="No — this is its own fund"
              description="A new structure will be created for this financing id."
              onClick={() => set({ structureId: null })}
            />
            {linkable.map((item) => (
              <Choice
                key={item.key}
                selected={draft.structureId === item.structureId}
                title={`Same fund as ${item.label}`}
                description={item.structureName || "Uses that structure’s assets and totals."}
                onClick={() => onChange(copySharedStructure(item.draft, patchUopDraft(draft, { structureId: item.structureId })))}
              />
            ))}
          </div>
        </InputSection>
      )}
      <InputSection title="Name of this financing">
        <FieldGrid>
          <FormField label="Bond, loan, or fund name" required tooltip="Use the name from the term sheet or prospectus.">
            <Input
              className={FIELD_INPUT}
              value={draft.structureName}
              onChange={(e) => set({ structureName: e.target.value })}
              onBlur={() => onTouch("structureName")}
            />
            <ErrorText message={errors.structureName} />
          </FormField>
          <FormField label="Issuer or manager" required tooltip="The company, bank, or fund manager you transacted with.">
            <Input
              className={FIELD_INPUT}
              value={draft.issuerName}
              onChange={(e) => set({ issuerName: e.target.value })}
              onBlur={() => onTouch("issuerName")}
            />
            <ErrorText message={errors.issuerName} />
          </FormField>
        </FieldGrid>
      </InputSection>
      <InputSection title="What kind of financing is it?" tooltip="Must match whether the assets sit on the borrower’s books or in a separate vehicle.">
        <div className="grid grid-cols-1 gap-2">
          {visibleKinds.map((kind) => {
            const mismatch = !structureKindFitsClassification(kind.value, outcome?.kind === "uop" ? outcome.classification : null);
            return (
              <Choice
                key={kind.value}
                compact
                selected={draft.structureKind === kind.value}
                title={kind.label}
                description={mismatch ? "Does not match the financing type chosen earlier." : kind.hint}
                disabled={mismatch}
                onClick={() => set({ structureKind: kind.value })}
              />
            );
          })}
        </div>
        <ErrorText message={errors.structureKind} />
      </InputSection>
      <InputSection
        title="What does your bank hold?"
        tooltip="If the funded assets sit on the borrower’s books, your bank can only hold a loan or bond — not shares."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Choice
            selected={draft.investmentType === "debt"}
            title="Loan or bond"
            description={integrated ? "Required for this financing type." : "Your outstanding loan or bond position."}
            onClick={() => set({ investmentType: "debt" })}
          />
          <Choice
            selected={draft.investmentType === "equity"}
            title="Shares"
            description={
              integrated
                ? "Not allowed when the assets sit on the borrower’s books."
                : "Your share of the vehicle."
            }
            disabled={integrated}
            onClick={() => set({ investmentType: "equity" })}
          />
        </div>
        <ErrorText message={errors.investmentType} />
        <FieldGrid>
          <FormField label="Your outstanding amount" required unit={moneyUnit} tooltip="How much your bank still has outstanding on this deal.">
            <MoneyInput
              value={draft.outstandingInvestment}
              onChange={(outstandingInvestment) => set({ outstandingInvestment })}
              onBlur={() => onTouch("outstandingInvestment")}
            />
            <ErrorText message={errors.outstandingInvestment} />
          </FormField>
          <FormField label="Total loans and bonds in the vehicle" required unit={moneyUnit} tooltip="All loans and bonds of the fund, bond, or vehicle — not only your share. Zero is allowed.">
            <MoneyInput
              value={draft.totalStructureDebt}
              onChange={(totalStructureDebt) => set({ totalStructureDebt })}
              onBlur={() => onTouch("totalStructureDebt")}
            />
            <ErrorText message={errors.totalStructureDebt} />
          </FormField>
          <FormField label="Total shares in the vehicle" required unit={moneyUnit} tooltip="All shares in the vehicle. Enter 0 if it is loan-only. A negative figure is allowed.">
            <MoneyInput
              value={draft.totalStructureEquity}
              onChange={(totalStructureEquity) => set({ totalStructureEquity })}
              onBlur={() => onTouch("totalStructureEquity")}
            />
            <ErrorText message={errors.totalStructureEquity} />
          </FormField>
          <FormField label="Total assets fallback" unit={moneyUnit} tooltip="Optional. Use only if loans plus shares cannot be obtained.">
            <MoneyInput
              value={draft.totalStructureAssets}
              onChange={(totalStructureAssets) => set({ totalStructureAssets })}
              onBlur={() => onTouch("totalStructureAssets")}
            />
          </FormField>
          <FormField label="Reporting year" required tooltip="The calendar year these figures relate to.">
            <Input
              className={FIELD_INPUT}
              value={draft.reportingYear}
              onChange={(e) => set({ reportingYear: e.target.value })}
              onBlur={() => onTouch("reportingYear")}
              placeholder="YYYY"
            />
            <ErrorText message={errors.reportingYear} />
          </FormField>
          <FormField label="Currency" required>
            <select
              className={cn(FIELD_INPUT, "w-full rounded-md border px-3")}
              value={draft.currency}
              onChange={(e) => set({ currency: e.target.value })}
              onBlur={() => onTouch("currency")}
            >
              {UOP_CURRENCIES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <ErrorText message={errors.currency} />
          </FormField>
        </FieldGrid>
      </InputSection>
      <InputSection
        title="Supporting document"
        description="Name the contract, prospectus, or allocation report. Entering a name does not verify the document."
      >
        <FieldGrid>
          <FormField
            label="Document reference"
            required
            span
            tooltip="A file name, report title, or internal reference a reviewer can find. This is a reference only — it is not an uploaded or verified attachment."
          >
            <Input
              className={FIELD_INPUT}
              value={draft.evidenceSource}
              onChange={(e) => set({ evidenceSource: e.target.value })}
              onBlur={() => onTouch("evidenceSource")}
              placeholder="e.g. 2026 allocation report, term sheet"
            />
            <p className="text-xs text-[#94A3B8]">Reference only — not verified</p>
            <ErrorText message={errors.evidenceSource} />
          </FormField>
          <FormField label="Notes (optional)" span>
            <Input className={FIELD_INPUT} value={draft.evidenceNotes} onChange={(e) => set({ evidenceNotes: e.target.value })} />
          </FormField>
        </FieldGrid>
      </InputSection>
    </div>
  );
}

function AllocationStep({
  draft,
  onChange,
  errors,
  onTouch,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
  onTouch: (key: string) => void;
}) {
  const outcome = resolveUopAccounting(draft.eligibility);
  const set = (patch: Partial<UopDraft>) => onChange(patchUopDraft(draft, patch));
  const moneyUnit = draft.currency || "deal currency";
  const hideAssets = outcome?.kind === "uop" && outcome.classification === "separate" && draft.allocationStatus === "none_yet";

  return (
    <div className="space-y-6">
      {outcome?.kind === "uop" && outcome.classification === "separate" ? (
        <InputSection
          title="How much of the money has been assigned to assets?"
          description="Leftover cash in a separate vehicle is not treated as causing emissions."
          tooltip="Financed emissions are counted only after money is assigned to assets."
        >
          <div className="grid grid-cols-1 gap-3">
            <Choice
              selected={draft.allocationStatus === "none_yet"}
              title="None assigned yet"
              description="Financed emissions stay at zero until money is assigned."
              onClick={() => set({ allocationStatus: "none_yet" })}
            />
            <Choice
              selected={draft.allocationStatus === "known"}
              title="We know how much has been assigned"
              description="Enter the amount already assigned to named assets."
              onClick={() => set({ allocationStatus: "known" })}
            />
            <Choice
              selected={draft.allocationStatus === "unknown"}
              title="We do not know the split"
              description="You may assume all of it only if you also estimate leftover cash."
              onClick={() => set({ allocationStatus: "unknown" })}
            />
          </div>
          <ErrorText message={errors.allocationStatus} />
          <ErrorText message={errors.allocationUnknown} />
        </InputSection>
      ) : (
        <InputSection
          title="Assigned money and leftover money"
          description="Both amounts count when the assets sit on the borrower’s books."
          tooltip="Leftover funds still support the issuer’s activity and are not ignored."
        >
          <FieldGrid>
            <FormField label="Already assigned" required unit={moneyUnit} tooltip="Proceeds already assigned to named assets.">
              <MoneyInput
                value={draft.allocatedProceeds}
                onChange={(allocatedProceeds) => set({ allocatedProceeds })}
                onBlur={() => onTouch("allocatedProceeds")}
              />
              <ErrorText message={errors.allocatedProceeds} />
            </FormField>
            <FormField label="Not yet assigned" required unit={moneyUnit} tooltip="Proceeds still waiting to be assigned. Enter 0 if none.">
              <MoneyInput
                value={draft.unallocatedProceeds}
                onChange={(unallocatedProceeds) => set({ unallocatedProceeds })}
                onBlur={() => onTouch("unallocatedProceeds")}
              />
              <ErrorText message={errors.unallocatedProceeds} />
            </FormField>
          </FieldGrid>
        </InputSection>
      )}

      {outcome?.kind === "uop" && outcome.classification === "separate" && draft.allocationStatus === "known" && (
        <InputSection title="Amount already assigned">
          <FormField label="Assigned proceeds" required unit={moneyUnit} tooltip="How much of the vehicle has already been assigned to named assets.">
            <MoneyInput
              value={draft.allocatedProceeds}
              onChange={(allocatedProceeds) => set({ allocatedProceeds })}
              onBlur={() => onTouch("allocatedProceeds")}
            />
            <ErrorText message={errors.allocatedProceeds} />
          </FormField>
        </InputSection>
      )}

      {outcome?.kind === "uop" && outcome.classification === "integrated" && (draft.unallocatedProceeds || 0) > 0 && (
        <InputSection title="How should leftover money be estimated?">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Choice
              selected={draft.unallocatedUsesAssetLevelEstimate !== "yes"}
              title="Use the issuer’s company figures"
              description="Usual path when leftover funds are not yet assigned"
              onClick={() => set({ unallocatedUsesAssetLevelEstimate: "no" })}
            />
            <Choice
              selected={draft.unallocatedUsesAssetLevelEstimate === "yes"}
              title="Estimate from expected assets"
              description="Only if you have a document showing where leftover funds will go"
              onClick={() => set({ unallocatedUsesAssetLevelEstimate: "yes" })}
            />
          </div>
          {draft.unallocatedUsesAssetLevelEstimate === "yes" && (
            <div className="mt-3">
              <FormField
                label="Document reference for expected allocation"
                required
                span
                tooltip="A framework or pipeline that shows where leftover funds are expected to go. This is a reference only."
              >
                <Input
                  className={FIELD_INPUT}
                  value={draft.expectedAllocationEvidence}
                  onChange={(e) => set({ expectedAllocationEvidence: e.target.value })}
                  onBlur={() => onTouch("expectedAllocationEvidence")}
                />
                <p className="text-xs text-[#94A3B8]">Reference only — not verified</p>
                <ErrorText message={errors.expectedAllocationEvidence} />
              </FormField>
            </div>
          )}
          {draft.unallocatedUsesAssetLevelEstimate !== "yes" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[#64748B]">
                Leftover funds use the issuer’s company figures. This is not the issuer’s published Use of Proceeds total.
              </p>
              <ErrorText message={errors.issuerCompanyType} />
              <ErrorText message={errors.issuerEmissions} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Choice selected={draft.issuerCompanyType === "listed"} title="Listed issuer" onClick={() => set({ issuerCompanyType: "listed" })} />
                <Choice selected={draft.issuerCompanyType === "unlisted"} title="Private issuer" onClick={() => set({ issuerCompanyType: "unlisted" })} />
              </div>
              <FieldGrid>
                {draft.issuerCompanyType === "listed" && (
                  <FormField label="Issuer EVIC" required unit={moneyUnit} tooltip="Enterprise value including cash, from issuer financials.">
                    <MoneyInput
                      value={draft.issuerEvic}
                      onChange={(issuerEvic) => set({ issuerEvic })}
                      onBlur={() => onTouch("issuerEvic")}
                    />
                    <ErrorText message={errors.issuerEvic} />
                  </FormField>
                )}
                {draft.issuerCompanyType === "unlisted" && (
                  <FormField label="Issuer equity + debt" required unit={moneyUnit} tooltip="Total equity plus debt of the issuer.">
                    <MoneyInput
                      value={draft.issuerEquityPlusDebt}
                      onChange={(issuerEquityPlusDebt) => set({ issuerEquityPlusDebt })}
                      onBlur={() => onTouch("issuerEquityPlusDebt")}
                    />
                    <ErrorText message={errors.issuerEquityPlusDebt} />
                  </FormField>
                )}
                <FormField label="Issuer Scope 1" unit="tCO2e" tooltip="Leave blank if not reported. Enter 0 only when reported as zero.">
                  <MoneyInput
                    value={draft.issuerScope1Emissions}
                    onChange={(issuerScope1Emissions) => set({ issuerScope1Emissions })}
                    onBlur={() => onTouch("issuerEmissions")}
                  />
                </FormField>
                <FormField label="Issuer Scope 2" unit="tCO2e">
                  <MoneyInput value={draft.issuerScope2Emissions} onChange={(issuerScope2Emissions) => set({ issuerScope2Emissions })} />
                </FormField>
                <FormField label="Issuer Scope 3" unit="tCO2e">
                  <MoneyInput value={draft.issuerScope3Emissions} onChange={(issuerScope3Emissions) => set({ issuerScope3Emissions })} />
                </FormField>
              </FieldGrid>
            </div>
          )}
        </InputSection>
      )}

      {!hideAssets && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Funded assets</h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Add each asset that received this money. Two homes or two projects stay as two cards.
            </p>
          </div>
          <ErrorText message={errors.assets} />
          {draft.assets.map((asset, index) => (
            <AssetIdentityCard
              key={asset.underlyingAssetId}
              asset={asset}
              index={index}
              errors={errors}
              currency={draft.currency}
              onChange={(patch) => onChange(updateUnderlyingAsset(draft, asset.underlyingAssetId, patch))}
              onRemove={() => onChange(removeUnderlyingAsset(draft, asset.underlyingAssetId))}
              onTouch={onTouch}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-10 border-[#E2E8F0]"
            onClick={() => onChange(addUnderlyingAsset(draft, createUnderlyingAsset({ name: `Asset ${draft.assets.length + 1}` })))}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add an asset
          </Button>
        </div>
      )}
    </div>
  );
}

function EmissionsStep({
  draft,
  onChange,
  errors,
  onTouch,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
  onTouch: (key: string) => void;
}) {
  const outcome = resolveUopAccounting(draft.eligibility);
  const allowed = allowedUopEmissionsPaths(outcome);
  const set = (patch: Partial<UopDraft>) => onChange(patchUopDraft(draft, patch));
  const showAssetEmissions = draft.emissionsPath === "underlying_assets" || draft.emissionsPath === "estimation";
  const options: Array<{ id: UopEmissionsPath; title: string; description: string }> = [
    {
      id: "issuer_reported",
      title: "Use the issuer’s published figure",
      description: "Copy the financed-emissions total from the allocation and impact report. Your share is based on how much you still have outstanding.",
    },
    {
      id: "underlying_assets",
      title: "Work it out asset by asset",
      description: "Enter reported or estimated emissions for each funded asset. Do not use the issuer’s company-wide total as a stand-in for a separate fund.",
    },
    {
      id: "estimation",
      title: "Use a sector estimate",
      description: "Only when reported asset emissions are not available. Use an approved published factor — do not invent one.",
    },
  ].filter((option) => allowed.includes(option.id as "issuer_reported" | "underlying_assets" | "estimation"));

  return (
    <div className="space-y-6">
      <InputSection title="Where do the emissions figures come from?">
        <div className="grid grid-cols-1 gap-3">
          {options.map((option) => (
            <Choice
              key={option.id}
              selected={draft.emissionsPath === option.id}
              title={option.title}
              description={option.description}
              onClick={() => set({ emissionsPath: option.id })}
            />
          ))}
        </div>
        <ErrorText message={errors.emissionsPath} />
      </InputSection>

      {draft.emissionsPath === "issuer_reported" && (
        <InputSection
          title="Issuer allocation and impact report"
          description="Copy the published Use of Proceeds emissions figure. Do not calculate it here."
        >
          <FieldGrid>
            <FormField label="Reported financed emissions" unit="tCO2e" required tooltip="The total financed emissions the issuer published for this structure.">
              <MoneyInput
                value={draft.issuerReportedFinancedEmissions}
                onChange={(issuerReportedFinancedEmissions) => set({ issuerReportedFinancedEmissions })}
                onBlur={() => onTouch("issuerReportedFinancedEmissions")}
              />
              <ErrorText message={errors.issuerReportedFinancedEmissions} />
            </FormField>
            <FormField label="Year of that report" required>
              <Input
                className={FIELD_INPUT}
                value={draft.issuerReportYear}
                onChange={(e) => set({ issuerReportYear: e.target.value })}
                onBlur={() => onTouch("issuerReportYear")}
                placeholder="YYYY"
              />
              <ErrorText message={errors.issuerReportYear} />
            </FormField>
            <FormField
              label="Does the issuer say the report was verified?"
              tooltip="This records what the issuer stated. Entering a name here does not verify the report."
            >
              <div className="grid grid-cols-2 gap-2">
                <Choice selected={draft.issuerReportVerification === "verified"} title="Issuer says verified" onClick={() => set({ issuerReportVerification: "verified" })} />
                <Choice selected={draft.issuerReportVerification === "unverified"} title="Not stated as verified" onClick={() => set({ issuerReportVerification: "unverified" })} />
              </div>
            </FormField>
            <FormField
              label="Report name or link"
              required
              span
              tooltip="Enough detail for a reviewer to find the same figure. This is a reference only."
            >
              <Input
                className={FIELD_INPUT}
                value={draft.issuerReportSource}
                onChange={(e) => set({ issuerReportSource: e.target.value })}
                onBlur={() => onTouch("issuerReportSource")}
              />
              <p className="text-xs text-[#94A3B8]">Reference only — not verified</p>
              <ErrorText message={errors.issuerReportSource} />
            </FormField>
          </FieldGrid>
        </InputSection>
      )}

      {draft.emissionsPath === "estimation" && outcome?.kind === "uop" && outcome.classification === "integrated" && (
        <InputSection
          title="Why can’t you use asset-level figures?"
          tooltip="You can estimate from the issuer’s company figures only if you cannot reasonably work it out asset by asset."
        >
          <div className="grid grid-cols-1 gap-3">
            <Choice
              selected={draft.issuerLevelReason === "theoretically_impossible"}
              title="The assets cannot be separated"
              description="The underlying assets do not have their own emissions figures."
              onClick={() => set({ issuerLevelReason: "theoretically_impossible" })}
            />
            <Choice
              selected={draft.issuerLevelReason === "practically_not_feasible"}
              title="The allocation data is not available"
              description="You do not have enough detail on how funds were assigned."
              onClick={() => set({ issuerLevelReason: "practically_not_feasible" })}
            />
            <Choice
              selected={draft.issuerLevelReason === "not_material"}
              title="The difference would be too small to matter"
              description="The assets are not expected to look different from the issuer overall."
              onClick={() => set({ issuerLevelReason: "not_material" })}
            />
          </div>
          <ErrorText message={errors.issuerLevelReason} />
        </InputSection>
      )}

      {showAssetEmissions && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A]">Emissions for each funded asset</h3>
            <p className="mt-1 text-sm text-[#64748B]">
              Each card keeps its own method and factor. Choose the option that matches the data you have; the data-quality score comes from that option.
            </p>
          </div>
          <ErrorText message={errors.assets} />
          {draft.assets.map((asset, index) => (
            <AssetEmissionsCard
              key={asset.underlyingAssetId}
              asset={asset}
              index={index}
              errors={errors}
              currency={draft.currency}
              reportingYear={draft.reportingYear}
              onChange={(patch) => onChange(updateUnderlyingAsset(draft, asset.underlyingAssetId, patch))}
              onTouch={onTouch}
            />
          ))}
          {draft.assets.length === 0 && (
            <p className="text-sm text-[#64748B]">Add funded assets on the previous step, then return here to enter emissions.</p>
          )}
        </div>
      )}
    </div>
  );
}

function FactorProvenanceFields({
  value,
  option,
  assetClass,
  reportingYear,
  currency,
  onChange,
}: {
  value: UopEstimationInputs;
  option?: UopPcafOptionDef;
  assetClass: UopUnderlyingAssetClass | "";
  reportingYear: string;
  currency: string;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
}) {
  return (
    <ApprovedFactorPicker
      value={value}
      option={option}
      assetClass={assetClass}
      reportingYear={reportingYear}
      currency={currency}
      onChange={onChange}
    />
  );
}

function EstimationFields({
  value,
  assetClass,
  reportingYear,
  currency,
  onChange,
  errors,
  prefix,
  onTouch,
}: {
  value: UopEstimationInputs;
  assetClass: UopUnderlyingAssetClass | "";
  reportingYear: string;
  currency: string;
  onChange: (next: UopEstimationInputs) => void;
  errors: Record<string, string>;
  prefix: string;
  onTouch: (key: string) => void;
}) {
  const set = (patch: Partial<UopEstimationInputs>) => onChange({ ...value, ...patch });
  const options = optionsForAssetClass(assetClass);
  const selected = optionDef(assetClass, value.pcafOption);
  const fields = new Set(selected?.fields || []);
  const moneyUnit = currency || "deal currency";

  if (assetClass === UOP_LOAN_TYPE) {
    return (
      <NestedEstimationFields
        value={value}
        onChange={set}
        errors={errors}
        prefix={prefix}
        onTouch={onTouch}
        currency={currency}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2">
        {options.map((item) => (
          <Choice
            key={item.id}
            compact
            selected={value.pcafOption === item.id}
            title={`${item.id.toUpperCase()} · score ${item.score}`}
            description={item.title.replace(/^Option\s+/i, "").replace(/^UoP\s+/i, "")}
            onClick={() =>
              set({
                pcafOption: item.id as UopPcafOptionId,
                method: item.method,
                ...(item.method === "economic"
                  ? {
                      activityCurrency: value.activityCurrency || currency || "PKR",
                      priceYear: value.priceYear || reportingYear,
                    }
                  : {}),
              })
            }
          />
        ))}
      </div>
      <ErrorText message={errors[`${prefix}.estimation.pcafOption`]} />
      {assetClass === "sovereign-debt" && selected && (
        <SovereignEstimationExtras
          value={value}
          onChange={set}
          errors={errors}
          prefix={prefix}
          onTouch={onTouch}
          reportingYear={reportingYear}
        />
      )}
      {assetClass === "sub-sovereign-debt" && selected && (
        <SubSovereignEstimationFields
          value={value}
          onChange={set}
          errors={errors}
          prefix={prefix}
          onTouch={onTouch}
          currency={currency}
          reportingYear={reportingYear}
        />
      )}
      {assetClass === "motor-vehicle-loan" && selected && (
        <VehicleRowsEditor
          value={value}
          onChange={set}
          errors={errors}
          prefix={prefix}
          currency={currency}
          optionFields={fields}
        />
      )}
      {selected && selected.method === "economic" && (
        <EconomicBasisFields
          value={value}
          onChange={set}
          errors={errors}
          prefix={prefix}
          onTouch={onTouch}
          dealCurrency={currency}
        />
      )}
      {selected && (
        <FieldGrid>
          {fields.has("energy") && (
            <FormField label="Energy consumption" required unit="kWh or MWh" tooltip="Actual energy used in the reporting year.">
              <MoneyInput
                value={value.energyConsumption}
                onChange={(energyConsumption) => set({ energyConsumption, physicalActivityAmount: energyConsumption })}
                onBlur={() => onTouch(`${prefix}.estimation.energyConsumption`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.energyConsumption`]} />
            </FormField>
          )}
          {fields.has("production") && (
            <FormField label="Production" required tooltip="Physical output in the reporting year. Production factors are not available in this library yet.">
              <MoneyInput
                value={value.productionAmount}
                onChange={(productionAmount) => set({ productionAmount, physicalActivityAmount: productionAmount })}
                onBlur={() => onTouch(`${prefix}.estimation.productionAmount`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.productionAmount`]} />
            </FormField>
          )}
          {fields.has("revenue") && (
            <FormField label="Company or project revenue" required unit={moneyUnit}>
              <MoneyInput
                value={value.companyRevenue}
                onChange={(companyRevenue) => set({ companyRevenue })}
                onBlur={() => onTouch(`${prefix}.estimation.companyRevenue`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.companyRevenue`]} />
            </FormField>
          )}
          {fields.has("atr") && (
            <FormField label="Asset turnover ratio" required tooltip="Published sector asset-turnover ratio. Do not invent one.">
              <MoneyInput
                value={value.assetTurnoverRatio}
                onChange={(assetTurnoverRatio) => set({ assetTurnoverRatio })}
                onBlur={() => onTouch(`${prefix}.estimation.assetTurnoverRatio`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.assetTurnoverRatio`]} />
            </FormField>
          )}
          {fields.has("processEmissions") && (
            <FormField label="Process emissions (optional)" unit="tCO2e">
              <MoneyInput value={value.processEmissions} onChange={(processEmissions) => set({ processEmissions })} />
            </FormField>
          )}
          {fields.has("labelIntensity") && (
            <FormField label="Energy from labels" required unit="kWh/m²" tooltip="Whole-building energy intensity from the energy label.">
              <MoneyInput
                value={value.labelEnergyIntensity}
                onChange={(labelEnergyIntensity) => set({ labelEnergyIntensity })}
                onBlur={() => onTouch(`${prefix}.estimation.labelEnergyIntensity`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.labelEnergyIntensity`]} />
            </FormField>
          )}
          {fields.has("statsIntensity") && (
            <FormField
              label={fields.has("buildingCount") ? "Statistical energy per building" : "Statistical energy intensity"}
              required
              unit={fields.has("buildingCount") ? "kWh/building" : "kWh/m²"}
            >
              <MoneyInput
                value={value.statsEnergyIntensity}
                onChange={(statsEnergyIntensity) => set({ statsEnergyIntensity })}
                onBlur={() => onTouch(`${prefix}.estimation.statsEnergyIntensity`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.statsEnergyIntensity`]} />
            </FormField>
          )}
          {fields.has("floorArea") && (
            <FormField label="Floor area financed" required unit="m²" tooltip="The floor area this financing covers.">
              <MoneyInput
                value={value.floorArea}
                onChange={(floorArea) => set({ floorArea })}
                onBlur={() => onTouch(`${prefix}.estimation.floorArea`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.floorArea`]} />
            </FormField>
          )}
          {fields.has("buildingCount") && (
            <FormField label="Number of buildings" required>
              <MoneyInput
                value={value.numberOfBuildings}
                onChange={(numberOfBuildings) => set({ numberOfBuildings })}
                onBlur={() => onTouch(`${prefix}.estimation.numberOfBuildings`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.numberOfBuildings`]} />
            </FormField>
          )}
          {fields.has("fuel") && !(assetClass === "motor-vehicle-loan" && (value.vehicles?.length || 0) > 0) && (
            <FormField label="Fuel consumption" required unit="litres" tooltip="Gallons are not supported. Use litres or the unit printed on the approved factor.">
              <MoneyInput
                value={value.fuelConsumption}
                onChange={(fuelConsumption) => set({ fuelConsumption, physicalActivityAmount: fuelConsumption })}
                onBlur={() => onTouch(`${prefix}.estimation.fuelConsumption`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.fuelConsumption`]} />
            </FormField>
          )}
          {fields.has("distance") && !(assetClass === "motor-vehicle-loan" && (value.vehicles?.length || 0) > 0) && (
            <FormField label="Distance travelled" required unit="km">
              <MoneyInput
                value={value.distanceTraveled}
                onChange={(distanceTraveled) => set({ distanceTraveled, physicalActivityAmount: distanceTraveled })}
                onBlur={() => onTouch(`${prefix}.estimation.distanceTraveled`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.distanceTraveled`]} />
            </FormField>
          )}
          {fields.has("efficiency") && !(assetClass === "motor-vehicle-loan" && (value.vehicles?.length || 0) > 0) && (
            <FormField label="Fuel efficiency" required unit="L/km">
              <MoneyInput
                value={value.efficiency}
                onChange={(efficiency) => set({ efficiency })}
                onBlur={() => onTouch(`${prefix}.estimation.efficiency`)}
              />
              <ErrorText message={errors[`${prefix}.estimation.efficiency`]} />
            </FormField>
          )}
          {fields.has("sectorShare") && (
            <>
              <FormField label="Sector">
                <Input className={FIELD_INPUT} value={value.sectorName} onChange={(e) => set({ sectorName: e.target.value })} />
              </FormField>
              <FormField label="Sector code">
                <Input className={FIELD_INPUT} value={value.sectorKey} onChange={(e) => set({ sectorKey: e.target.value })} />
              </FormField>
              <FormField label="Share of this sector" unit="%">
                <MoneyInput
                  value={value.sectorAllocationPercent}
                  onChange={(sectorAllocationPercent) => set({ sectorAllocationPercent })}
                  onBlur={() => onTouch(`${prefix}.estimation.sectorAllocationPercent`)}
                />
                <ErrorText message={errors[`${prefix}.estimation.sectorAllocationPercent`]} />
              </FormField>
              <ErrorText message={errors[`${prefix}.estimation.sector`]} />
            </>
          )}
        </FieldGrid>
      )}
      {selected &&
        !(
          (assetClass === "sovereign-debt" && ["1a", "1b", "3b"].includes(String(value.pcafOption))) ||
          (assetClass === "sub-sovereign-debt" && ["1a", "1b", "4a", "4b"].includes(String(value.pcafOption)))
        ) && (
        <FactorProvenanceFields
          value={value}
          option={selected}
          assetClass={assetClass}
          reportingYear={reportingYear}
          currency={currency}
          onChange={set}
        />
      )}
      <ErrorText message={errors[`${prefix}.estimation.libraryEntryId`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorConfirmed`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorSource`]} />
      <ErrorText message={errors[`${prefix}.estimation.emissionFactor`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorGeography`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorYear`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorUnit`]} />
    </div>
  );
}

function AssetIdentityCard({
  asset,
  index,
  errors,
  currency,
  onChange,
  onRemove,
  onTouch,
}: {
  asset: UopUnderlyingAsset;
  index: number;
  errors: Record<string, string>;
  currency: string;
  onChange: (patch: Partial<UopUnderlyingAsset>) => void;
  onRemove: () => void;
  onTouch: (key: string) => void;
}) {
  const prefix = `assets.${asset.underlyingAssetId}`;
  const moneyUnit = currency || "deal currency";
  return (
    <div className="rounded-xl border border-[#E8EEF0] bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{asset.name.trim() || `Asset ${index + 1}`}</p>
          <p className="text-xs text-[#94A3B8] mt-0.5">Kept as its own record so similar assets are not mixed together.</p>
        </div>
        <Button type="button" variant="ghost" className="h-8 text-[#64748B]" onClick={onRemove}>
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      </div>
      <FieldGrid>
        <FormField label="Asset name" required>
          <Input
            className={FIELD_INPUT}
            value={asset.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={() => onTouch(`${prefix}.name`)}
          />
          <ErrorText message={errors[`${prefix}.name`]} />
        </FormField>
        <FormField label="Asset type" required tooltip="The loan or investment type of this asset. Two assets may be the same type.">
          <select
            className={cn(FIELD_INPUT, "w-full rounded-md border px-3")}
            value={asset.assetClass}
            onChange={(e) => {
              const nextClass = e.target.value as UopUnderlyingAssetClass;
              const allowed = optionsForAssetClass(nextClass);
              const keep = allowed.some((item) => item.id === asset.estimation.pcafOption);
              onChange({
                assetClass: nextClass,
                estimation: keep
                  ? asset.estimation
                  : { ...asset.estimation, pcafOption: "", method: "" },
              });
            }}
            onBlur={() => onTouch(`${prefix}.assetClass`)}
          >
            <option value="">Select type</option>
            {UNDERLYING_CLASSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.unavailable ? `${item.label} (unavailable)` : item.label}
              </option>
            ))}
          </select>
          <ErrorText message={errors[`${prefix}.assetClass`]} />
        </FormField>
        <FormField label="Amount assigned to this asset" required unit={moneyUnit}>
          <MoneyInput
            value={asset.allocatedOutstanding}
            onChange={(allocatedOutstanding) => onChange({ allocatedOutstanding })}
            onBlur={() => onTouch(`${prefix}.allocatedOutstanding`)}
          />
          <ErrorText message={errors[`${prefix}.allocatedOutstanding`]} />
        </FormField>
        <FormField label="Total value of this asset" unit={moneyUnit} tooltip="The full value used to work out your share, if you have it.">
          <MoneyInput
            value={asset.totalAssetValue}
            onChange={(totalAssetValue) => onChange({ totalAssetValue })}
            onBlur={() => onTouch(`${prefix}.totalAssetValue`)}
          />
          <ErrorText message={errors[`${prefix}.totalAssetValue`]} />
        </FormField>
      </FieldGrid>
    </div>
  );
}

function AssetEmissionsCard({
  asset,
  index,
  errors,
  currency,
  reportingYear,
  onChange,
  onTouch,
}: {
  asset: UopUnderlyingAsset;
  index: number;
  errors: Record<string, string>;
  currency: string;
  reportingYear: string;
  onChange: (patch: Partial<UopUnderlyingAsset>) => void;
  onTouch: (key: string) => void;
}) {
  const prefix = `assets.${asset.underlyingAssetId}`;
  const selected = optionDef(asset.assetClass, asset.estimation.pcafOption);
  return (
    <div className="rounded-xl border border-[#E8EEF0] bg-white p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-[#0F172A]">{asset.name.trim() || `Asset ${index + 1}`}</p>
        <p className="text-xs text-[#64748B] mt-0.5">
          {assetClassLabel(asset.assetClass) || "Choose a type on the previous step"}
          {selected ? ` · ${selected.id.toUpperCase()} (score ${selected.score})` : ""}
        </p>
      </div>
      <div>
        <p className="text-sm font-medium text-[#334155] mb-2">Does this asset already have reported emissions?</p>
        <YesNo value={asset.hasReportedEmissions} onChange={(hasReportedEmissions) => onChange({ hasReportedEmissions })} />
        <ErrorText message={errors[`${prefix}.hasReportedEmissions`]} />
      </div>
      {asset.hasReportedEmissions === "yes" && (
        <FieldGrid>
          <FormField label="Scope 1" unit="tCO2e" tooltip="Leave blank if not reported. Enter 0 only when reported as zero.">
            <MoneyInput value={asset.scope1Emissions} onChange={(scope1Emissions) => onChange({ scope1Emissions })} />
          </FormField>
          <FormField label="Scope 2" unit="tCO2e">
            <MoneyInput value={asset.scope2Emissions} onChange={(scope2Emissions) => onChange({ scope2Emissions })} />
          </FormField>
          <FormField label="Scope 3" unit="tCO2e">
            <MoneyInput value={asset.scope3Emissions} onChange={(scope3Emissions) => onChange({ scope3Emissions })} />
          </FormField>
          <ErrorText message={errors[`${prefix}.emissions`]} />
          <FormField
            label="Does the source say these figures were verified?"
            span
            tooltip="This records what the report stated. It does not verify the figures."
          >
            <div className="grid grid-cols-2 gap-2">
              <Choice selected={asset.verificationStatus === "verified"} title="Source says verified" onClick={() => onChange({ verificationStatus: "verified" })} />
              <Choice selected={asset.verificationStatus === "unverified"} title="Not stated as verified" onClick={() => onChange({ verificationStatus: "unverified" })} />
            </div>
            <ErrorText message={errors[`${prefix}.verificationStatus`]} />
          </FormField>
          {asset.verificationStatus === "verified" && (
            <FormField label="Verifier named in the report" span>
              <Input className={FIELD_INPUT} value={asset.verifierName} onChange={(e) => onChange({ verifierName: e.target.value })} />
            </FormField>
          )}
        </FieldGrid>
      )}
      {asset.hasReportedEmissions === "no" && (
        <EstimationFields
          value={asset.estimation}
          assetClass={asset.assetClass}
          reportingYear={reportingYear}
          currency={currency}
          onChange={(estimation) => onChange({ estimation })}
          errors={errors}
          prefix={prefix}
          onTouch={onTouch}
        />
      )}
      <FormField
        label="Where did these figures come from?"
        required
        span
        tooltip="A report name a reviewer can find again. This is a reference only."
      >
        <Input
          className={FIELD_INPUT}
          value={asset.dataSource}
          onChange={(e) => onChange({ dataSource: e.target.value })}
          onBlur={() => onTouch(`${prefix}.dataSource`)}
        />
        <p className="text-xs text-[#94A3B8]">Reference only — not verified</p>
        <ErrorText message={errors[`${prefix}.dataSource`]} />
      </FormField>
      <FormField label="Notes (optional)" span>
        <Input className={FIELD_INPUT} value={asset.evidenceNotes} onChange={(e) => onChange({ evidenceNotes: e.target.value })} />
      </FormField>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#F1F5F9] last:border-0">
      <p className="text-sm text-[#64748B]">{label}</p>
      <p className="text-sm font-medium text-[#0F172A] text-right">{value}</p>
    </div>
  );
}

function formatEntered(value: number | null | undefined, unit = ""): string {
  if (value == null || !Number.isFinite(value)) return "Not entered";
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function ReviewStep({
  draft,
  errors,
  counterpartyId,
  onResult,
}: {
  draft: UopDraft;
  errors: Record<string, string>;
  counterpartyId?: string;
  onResult?: (result: NonNullable<UopDraft["lastCalculation"]>) => void;
}) {
  const outcome = resolveUopAccounting(draft.eligibility);
  const display = outcome ? uopOutcomeDisplay(outcome) : null;
  const pathLabel =
    draft.emissionsPath === "issuer_reported"
      ? "Issuer published figure"
      : draft.emissionsPath === "underlying_assets"
        ? "Asset by asset"
        : draft.emissionsPath === "estimation"
          ? "Sector estimate"
          : "Not chosen";
  return (
    <div className="space-y-6">
      <InputSection title="Check what you entered">
        <ReviewRow label="Classification" value={display?.heading || "Not classified"} />
        <ReviewRow label="Financing" value={draft.structureName || "Not entered"} />
        <ReviewRow label="Issuer or manager" value={draft.issuerName || "Not entered"} />
        <ReviewRow label="Your outstanding amount" value={formatEntered(draft.outstandingInvestment, draft.currency)} />
        <ReviewRow label="Assigned proceeds" value={formatEntered(draft.allocatedProceeds, draft.currency)} />
        {outcome?.kind === "uop" && outcome.classification === "integrated" && (
          <ReviewRow label="Leftover proceeds" value={formatEntered(draft.unallocatedProceeds, draft.currency)} />
        )}
        <ReviewRow label="Emissions source" value={pathLabel} />
        <ReviewRow label="Reporting year" value={draft.reportingYear || "Not entered"} />
        <ReviewRow label="Funded assets" value={draft.assets.length ? `${draft.assets.length}` : "None"} />
      </InputSection>
      {draft.assets.length > 0 && (
        <div className="rounded-xl border border-[#E8EEF0] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E8EEF0]">
            <p className="text-sm font-semibold text-[#0F172A]">Funded assets you entered</p>
          </div>
          <ul className="divide-y divide-[#F1F5F9]">
            {draft.assets.map((asset) => {
              const selected = optionDef(asset.assetClass, asset.estimation.pcafOption);
              return (
                <li key={asset.underlyingAssetId} className="px-4 py-3 text-sm">
                  <p className="font-medium text-[#0F172A]">{asset.name || "Unnamed asset"}</p>
                  <p className="text-[#64748B] mt-0.5">
                    {assetClassLabel(asset.assetClass) || "Type not set"}
                    {" · "}
                    {formatEntered(asset.allocatedOutstanding, draft.currency)}
                    {asset.hasReportedEmissions === "yes"
                      ? " · reported emissions"
                      : selected
                        ? ` · ${selected.id.toUpperCase()} (score ${selected.score})`
                        : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ErrorText message={errors.review} />
      <UopResultsPanel draft={draft} counterpartyId={counterpartyId} onResult={onResult} />
    </div>
  );
}

export function UopDraftStatusBar({
  status,
  errorMessage,
  onRetry,
  onRefresh,
  onApplyShared,
}: {
  status: UopDraftSaveStatus;
  errorMessage?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  onApplyShared?: () => void;
}) {
  if (status === "idle") return null;
  const palettes: Record<UopDraftSaveStatus, string> = {
    idle: "",
    saving: "border-slate-200 bg-slate-50 text-slate-700",
    saved: "border-[#BFE3D3] bg-[#EAF7F1] text-[#0F6E56]",
    unsaved: "border-amber-200 bg-amber-50 text-amber-950",
    failed: "border-red-200 bg-red-50 text-red-800",
    conflict: "border-amber-300 bg-amber-50 text-amber-950",
  };
  const labels: Record<UopDraftSaveStatus, string> = {
    idle: "",
    saving: "Saving…",
    saved: "Draft saved",
    unsaved: "Unsaved changes",
    failed: "Save failed — retry",
    conflict: "Shared structure changed — refresh/review",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2 text-xs flex flex-wrap items-center gap-2 justify-between", palettes[status])}>
      <p className="font-medium">
        {labels[status]}
        {errorMessage && status !== "saved" && status !== "saving" && (
          <span className="ml-2 font-normal">{errorMessage}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        {status === "failed" && onRetry && (
          <Button type="button" variant="outline" className="h-8" onClick={onRetry}>Retry</Button>
        )}
        {status === "conflict" && onRefresh && (
          <Button type="button" variant="outline" className="h-8" onClick={onRefresh}>Refresh</Button>
        )}
        {status === "conflict" && onApplyShared && (
          <Button type="button" className="h-8 bg-[#0F6E56] hover:bg-[#0c5a46]" onClick={onApplyShared}>
            Apply to shared fund
          </Button>
        )}
      </div>
    </div>
  );
}

export function UopBackendUnavailableBanner() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <UopPreviewNotice />
      <p className="text-xs text-slate-500">Not saved to the portfolio</p>
    </div>
  );
}

export function UopQuestionnaire({
  draft,
  onChange,
  stepId,
  errors,
  counterpartyId,
  siblingHoldings,
  saveStatus,
  saveError,
  onRetrySave,
  onRefreshDraft,
  onApplyShared,
  onLeaveUop,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  stepId: string;
  errors: Record<string, string>;
  counterpartyId?: string;
  siblingHoldings?: UopSiblingOption[];
  saveStatus?: UopDraftSaveStatus;
  saveError?: string;
  onRetrySave?: () => void;
  onRefreshDraft?: () => void;
  onApplyShared?: () => void;
  onLeaveUop?: (suggestedLoanType?: string | null) => void;
}) {
  const instanceKey = draft.financingInstanceId || draft.structureId || "";
  const [eligibilityEdit, setEligibilityEdit] = useState<{
    instance: string;
    question: UopEligibilityQuestionId | null;
  }>({ instance: instanceKey, question: null });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const editingEligibility = eligibilityEdit.instance === instanceKey ? eligibilityEdit.question : null;
  const setEditingEligibility = (question: UopEligibilityQuestionId | null) => {
    setEligibilityEdit({ instance: instanceKey, question });
  };
  const outcome = resolveUopAccounting(draft.eligibility);
  const continuesAsUop = !outcome || uopQualifiesForMethod(outcome);

  useEffect(() => {
    setTouched({});
  }, [stepId, instanceKey]);

  const onTouch = (key: string) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const localErrors = useMemo(() => validateUopStep(stepId, draft), [stepId, draft]);
  const shownErrors = useMemo(() => {
    const next = { ...errors };
    for (const [key, message] of Object.entries(localErrors)) {
      if (touched[key] || errors[key]) next[key] = message;
    }
    return next;
  }, [errors, localErrors, touched]);

  return (
    <div className="space-y-6">
      {continuesAsUop && stepId !== "uop-review" ? <UopBackendUnavailableBanner /> : null}
      {continuesAsUop && saveStatus && saveStatus !== "idle" && (
        <UopDraftStatusBar
          status={saveStatus}
          errorMessage={saveError}
          onRetry={onRetrySave}
          onRefresh={onRefreshDraft}
          onApplyShared={onApplyShared}
        />
      )}
      {stepId === "uop-eligibility" && (
        <EligibilityStep
          draft={draft}
          onChange={onChange}
          errors={shownErrors}
          editing={editingEligibility}
          onEditingChange={setEditingEligibility}
          onLeaveUop={onLeaveUop}
        />
      )}
      {stepId === "uop-structure" && uopQualifiesForMethod(outcome) && (
        <StructureStep
          draft={draft}
          onChange={onChange}
          errors={shownErrors}
          siblingHoldings={siblingHoldings}
          onTouch={onTouch}
        />
      )}
      {(stepId === "uop-allocation" || stepId === "uop-holdings") && uopQualifiesForMethod(outcome) && (
        <AllocationStep draft={draft} onChange={onChange} errors={shownErrors} onTouch={onTouch} />
      )}
      {(stepId === "uop-emissions" || stepId === "uop-emissions-path") && uopQualifiesForMethod(outcome) && (
        <EmissionsStep draft={draft} onChange={onChange} errors={shownErrors} onTouch={onTouch} />
      )}
      {stepId === "uop-assets" && uopQualifiesForMethod(outcome) && (
        <div className="space-y-4">
          {draft.assets.map((asset, index) => (
            <AssetIdentityCard
              key={`${asset.underlyingAssetId}-id`}
              asset={asset}
              index={index}
              errors={shownErrors}
              currency={draft.currency}
              onChange={(patch) => onChange(updateUnderlyingAsset(draft, asset.underlyingAssetId, patch))}
              onRemove={() => onChange(removeUnderlyingAsset(draft, asset.underlyingAssetId))}
              onTouch={onTouch}
            />
          ))}
          {draft.assets.map((asset, index) => (
            <AssetEmissionsCard
              key={`${asset.underlyingAssetId}-em`}
              asset={asset}
              index={index}
              errors={shownErrors}
              currency={draft.currency}
              reportingYear={draft.reportingYear}
              onChange={(patch) => onChange(updateUnderlyingAsset(draft, asset.underlyingAssetId, patch))}
              onTouch={onTouch}
            />
          ))}
        </div>
      )}
      {stepId === "uop-review" && uopQualifiesForMethod(outcome) && (
        <ReviewStep
          draft={draft}
          errors={shownErrors}
          counterpartyId={counterpartyId}
          onResult={(result) => onChange(patchUopDraft(draft, { lastCalculation: result }))}
        />
      )}
    </div>
  );
}

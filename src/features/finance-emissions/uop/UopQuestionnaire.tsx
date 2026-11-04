import { useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FieldGrid, FIELD_INPUT, FormField, InputSection } from "../forms/InputLayout";
import { cn } from "@/lib/utils";
import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";
import {
  allowedUopEmissionsPaths,
  currentEligibilityQuestion,
  resolveUopAccounting,
  uopQualifiesForMethod,
  visibleEligibilityQuestions,
  type UopEligibilityQuestionId,
} from "./eligibility";
import { ELIGIBILITY_COPY, uopOutcomeDisplay } from "./copy";
import { UOP_REPORTABLE_BLOCKED_MESSAGE, canCalculateUop, canSaveReportableUop } from "./reportableGuard";
import type { UopDraftSaveStatus } from "./draftPersistence";
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
import type {
  UopDraft,
  UopEmissionsPath,
  UopEstimationInputs,
  UopPcafOptionId,
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

const TILE = "w-full text-left rounded-[14px] border p-4 transition-all duration-200";
const TILE_ON = "border-[#0F6E56] bg-[#EAF7F1]/70 shadow-[0_8px_20px_rgba(15,110,86,0.08)]";
const TILE_OFF = "border-[#E8EEF0] bg-white hover:border-[#BFE3D3] hover:shadow-[0_8px_20px_rgba(15,23,42,0.04)]";

function Choice({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(TILE, selected ? TILE_ON : TILE_OFF)}>
      <p className="font-semibold text-[#0F172A]">{title}</p>
      {description && <p className="text-sm text-[#64748B] mt-1 leading-relaxed">{description}</p>}
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

function FieldHint({ what, where, unit }: { what: string; where: string; unit?: string }) {
  return (
    <ul className="space-y-0.5 text-xs text-[#64748B] leading-relaxed">
      <li>
        <span className="font-medium text-[#475569]">Enter: </span>
        {what}
      </li>
      <li>
        <span className="font-medium text-[#475569]">Find it in: </span>
        {where}
      </li>
      {unit ? (
        <li>
          <span className="font-medium text-[#475569]">Unit: </span>
          {unit}
        </li>
      ) : null}
    </ul>
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

function OutcomeCard({ draft }: { draft: UopDraft }) {
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!outcome) return null;
  const display = uopOutcomeDisplay(outcome);
  return (
    <div className="rounded-[14px] border border-[#DCEAE2] bg-white p-4">
      <p className="font-semibold text-[#0F172A]">{display.heading}</p>
      <p className="mt-1.5 text-sm text-[#64748B] leading-relaxed">{display.body}</p>
      <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">{display.official}</p>
    </div>
  );
}

const UNDERLYING_CLASSES: Array<{ value: UopUnderlyingAssetClass; label: string }> = [
  { value: "listed-equity", label: "Listed shares" },
  { value: "corporate-bond", label: "Corporate bond" },
  { value: "business-loan", label: "Business loan / private shares" },
  { value: "unlisted-equity", label: "Private shares" },
  { value: "project-finance", label: "Project finance" },
  { value: "commercial-real-estate", label: "Commercial property" },
  { value: "mortgage", label: "Home mortgage" },
  { value: "motor-vehicle-loan", label: "Vehicle loan" },
  { value: "sovereign-debt", label: "Government bond or loan" },
  { value: UOP_LOAN_TYPE, label: "Another Use of Proceeds vehicle inside this one" },
];

const STRUCTURE_KINDS: Array<{ value: UopDraft["structureKind"]; label: string; hint: string }> = [
  { value: "equity-fund", label: "Equity fund", hint: "A fund that holds shares. PCAF Table 5.7-1: separate Use of Proceeds." },
  { value: "debt-fund", label: "Debt fund", hint: "A fund that holds loans or bonds. PCAF Table 5.7-1: separate Use of Proceeds." },
  { value: "holding-spv-without-control", label: "Holding company or SPV without control", hint: "You own a stake but do not control the vehicle." },
  { value: "labeled-bond", label: "Labeled bond (green, social, sustainability)", hint: "Integrated when the funded assets sit on the issuer’s books." },
  { value: "labeled-loan", label: "Labeled loan (green, social, sustainability)", hint: "A loan whose use of funds is documented." },
  { value: "multi-asset-loan", label: "Loan earmarked for several named assets", hint: "Usually on the borrower’s own books." },
  { value: "other", label: "Other documented earmarked financing", hint: "Must still pass the eligibility questions (Figure 5.7-2)." },
];

function EligibilityStep({
  draft,
  onChange,
  errors,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
}) {
  const e = draft.eligibility;
  const set = (patch: Parameters<typeof patchUopEligibility>[1]) => onChange(patchUopEligibility(draft, patch));
  const current = currentEligibilityQuestion(e);
  const path = visibleEligibilityQuestions(e);
  const [editing, setEditing] = useState<UopEligibilityQuestionId | null>(null);
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
              setEditing(null);
            }}
          />
        );
      case "isSecuritized":
        return (
          <YesNo
            value={e.isSecuritized}
            onChange={(isSecuritized) => {
              set({ isSecuritized });
              setEditing(null);
            }}
          />
        );
      case "structureHasControl":
        return (
          <YesNo
            value={e.structureHasControl}
            onChange={(structureHasControl) => {
              set({ structureHasControl });
              setEditing(null);
            }}
          />
        );
      case "controlOneFullyAllocatedAsset":
        return (
          <YesNo
            value={e.controlOneFullyAllocatedAsset}
            onChange={(controlOneFullyAllocatedAsset) => {
              set({ controlOneFullyAllocatedAsset });
              setEditing(null);
            }}
          />
        );
      case "controlAssetIsProject":
        return (
          <YesNo
            value={e.controlAssetIsProject}
            onChange={(controlAssetIsProject) => {
              set({ controlAssetIsProject });
              setEditing(null);
            }}
          />
        );
      case "structureListing":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Choice
              selected={e.structureListing === "listed"}
              title="Listed on a stock exchange"
              description="PCAF: listed"
              onClick={() => {
                set({ structureListing: "listed" });
                setEditing(null);
              }}
            />
            <Choice
              selected={e.structureListing === "unlisted"}
              title="Not listed (private)"
              description="PCAF: unlisted"
              onClick={() => {
                set({ structureListing: "unlisted" });
                setEditing(null);
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
              setEditing(null);
            }}
          />
        );
      case "singleAssetClass":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ["mortgage", "Home mortgage", "PCAF: mortgages"],
                ["commercial-real-estate", "Commercial property", "PCAF: commercial real estate"],
                ["motor-vehicle-loan", "Vehicle loan", "PCAF: motor vehicle loans"],
                ["project-finance", "A single project", "PCAF: project finance"],
                ["other", "Another loan type", "PCAF: Figure 5-1 Step 6"],
              ] as const
            ).map(([value, title, hint]) => (
              <Choice
                key={value}
                selected={e.singleAssetClass === value}
                title={title}
                description={hint}
                onClick={() => {
                  set({ singleAssetClass: value });
                  setEditing(null);
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
              description="PCAF: Integrated Use of Proceeds"
              onClick={() => {
                set({ assetsOnIssuerBalanceSheet: "yes" });
                setEditing(null);
              }}
            />
            <Choice
              selected={e.assetsOnIssuerBalanceSheet === "no"}
              title="No — in a separate fund or vehicle"
              description="PCAF: Separate Use of Proceeds"
              onClick={() => {
                set({ assetsOnIssuerBalanceSheet: "no" });
                setEditing(null);
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#64748B] leading-relaxed">
        Answer one question at a time. We only ask the next question once it is needed.
      </p>
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
              <Button type="button" variant="ghost" className="h-8 shrink-0 text-[#0F6E56]" onClick={() => setEditing(id)}>
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
      {current === "done" && !editing && <OutcomeCard draft={draft} />}
      <ErrorText message={errors.eligibility} />
    </div>
  );
}

function StructureStep({
  draft,
  onChange,
  errors,
  counterpartyId,
  siblingHoldings,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
  counterpartyId?: string;
  siblingHoldings?: UopSiblingOption[];
}) {
  const set = (patch: Partial<UopDraft>) => onChange(patchUopDraft(draft, patch));
  const outcome = resolveUopAccounting(draft.eligibility);
  const moneyUnit = draft.currency || "currency of the facility";
  const integrated = outcome?.kind === "uop" && outcome.classification === "integrated";
  const canLinkFund = !draft.investmentId || !draft.structureId;
  const linkable = (siblingHoldings || []).filter((item) => item.structureId && item.key !== draft.instanceKey);
  return (
    <div className="space-y-5">
      {outcome?.kind === "uop" && <OutcomeCard draft={draft} />}
      {counterpartyId && (
        <p className="text-sm text-[#64748B]">
          This financing stays linked to the same counterparty. A separate financing id is kept so two similar deals are not mixed up.
        </p>
      )}
      {(draft.siblingCount || 0) > 0 && (
        <p className="text-sm text-[#0F6E56] rounded-[14px] border border-[#BFE3D3] bg-[#EAF7F1] p-3">
          This holding shares fund name, totals, and underlying assets with {draft.siblingCount} other investment{draft.siblingCount === 1 ? "" : "s"}. Your outstanding amount and investment type apply only here.
        </p>
      )}
      {canLinkFund && linkable.length > 0 && (
        <InputSection
          title="Is this another holding in an existing fund?"
          description="Linking uses the shared fund data. It does not copy this deal onto the other holding or create a second fund."
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
      <InputSection
        title="What is this financing called?"
        description="Use the name from the term sheet or prospectus."
        tooltip="PCAF Table 5.7-1 structure types. The official classification (Separate or Integrated) was set by the eligibility questions."
      >
        <FieldGrid>
          <FormField
            label="Name of this bond, loan, or fund"
            required
            tooltip="PCAF: structure name"
            hint={<FieldHint what="The deal name used internally." where="term sheet, prospectus, or core banking system" />}
          >
            <Input className={FIELD_INPUT} value={draft.structureName} onChange={(e) => set({ structureName: e.target.value })} />
            <ErrorText message={errors.structureName} />
          </FormField>
          <FormField
            label="Who issued or manages it?"
            required
            tooltip="PCAF: issuer / fund manager / borrower"
            hint={<FieldHint what="The company, bank, or fund manager you transacted with." where="counterparty record, prospectus, or facility agreement" />}
          >
            <Input className={FIELD_INPUT} value={draft.issuerName} onChange={(e) => set({ issuerName: e.target.value })} />
            <ErrorText message={errors.issuerName} />
          </FormField>
        </FieldGrid>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STRUCTURE_KINDS.map((kind) => (
            <Choice
              key={kind.value}
              selected={draft.structureKind === kind.value}
              title={kind.label}
              description={kind.hint}
              onClick={() => set({ structureKind: kind.value })}
            />
          ))}
        </div>
        <ErrorText message={errors.structureKind} />
      </InputSection>
      <InputSection
        title="What does your bank hold?"
        description="Say whether you lent money or own a share, then enter the amounts."
        tooltip="PCAF footnote 174: investors in integrated Use of Proceeds structures may provide debt only."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Choice
            selected={draft.investmentType === "debt"}
            title="Loan or bond"
            description={
              integrated
                ? "Required here. PCAF: debt only for integrated Use of Proceeds."
                : "Your outstanding loan or bond position. PCAF: debt."
            }
            onClick={() => set({ investmentType: "debt" })}
          />
          <Choice
            selected={draft.investmentType === "equity"}
            title="Shares"
            description={
              integrated
                ? "Not allowed for this type of financing. PCAF: equity is not permitted for integrated Use of Proceeds."
                : "Your share of the vehicle. PCAF: equity."
            }
            onClick={() => set({ investmentType: "equity" })}
          />
        </div>
        <ErrorText message={errors.investmentType} />
        <FieldGrid>
          <FormField
            label="Your outstanding amount"
            required
            unit={moneyUnit}
            tooltip="PCAF: outstanding investment / book value"
            hint={
              <FieldHint
                what="How much your bank still has outstanding on this deal."
                where="core banking, treasury, or the loan/bond position report"
                unit={moneyUnit}
              />
            }
          >
            <FormattedNumberInput value={draft.outstandingInvestment ?? 0} onChange={(outstandingInvestment) => set({ outstandingInvestment })} />
            <ErrorText message={errors.outstandingInvestment} />
          </FormField>
          <FormField
            label="Total loans and bonds in the vehicle"
            required
            unit={moneyUnit}
            tooltip="PCAF: total structure debt"
            hint={
              <FieldHint
                what="All debt of the fund, bond, or vehicle — not only your share."
                where="issuer report, fund factsheet, or capital-structure note"
                unit={moneyUnit}
              />
            }
          >
            <FormattedNumberInput value={draft.totalStructureDebt ?? 0} onChange={(totalStructureDebt) => set({ totalStructureDebt })} />
            <ErrorText message={errors.totalStructureDebt} />
          </FormField>
          <FormField
            label="Total shares in the vehicle"
            required
            unit={moneyUnit}
            tooltip="PCAF: total structure equity"
            hint={
              <FieldHint
                what="All equity of the vehicle. Enter 0 if it is debt-only. Negative equity is allowed (PCAF footnote 164)."
                where="issuer report, fund factsheet, or capital-structure note"
                unit={moneyUnit}
              />
            }
          >
            <FormattedNumberInput value={draft.totalStructureEquity ?? 0} onChange={(totalStructureEquity) => set({ totalStructureEquity })} />
            <ErrorText message={errors.totalStructureEquity} />
          </FormField>
          <FormField
            label="Total assets fallback (optional)"
            unit={moneyUnit}
            tooltip="PCAF footnote 166"
            hint={
              <FieldHint
                what="Use only if equity + debt cannot be obtained, or is unusable after negative equity is set to 0."
                where="balance sheet total assets"
                unit={moneyUnit}
              />
            }
          >
            <FormattedNumberInput value={draft.totalStructureAssets ?? 0} onChange={(totalStructureAssets) => set({ totalStructureAssets })} />
          </FormField>
          <FormField
            label="Reporting year"
            required
            tooltip="PCAF reporting year for this calculation"
            hint={<FieldHint what="The calendar year these figures relate to." where="your reporting pack or the issuer’s allocation report" unit="YYYY" />}
          >
            <Input className={FIELD_INPUT} value={draft.reportingYear} onChange={(e) => set({ reportingYear: e.target.value })} />
            <ErrorText message={errors.reportingYear} />
          </FormField>
          <FormField
            label="Currency"
            required
            hint={<FieldHint what="The currency of the outstanding amount." where="facility agreement or position report" unit="ISO currency code" />}
          >
            <select
              className={cn(FIELD_INPUT, "w-full rounded-md border px-3")}
              value={draft.currency}
              onChange={(e) => set({ currency: e.target.value })}
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
        title="What document proves the money is earmarked?"
        description="A green label on its own is not enough — point to the contract or allocation report."
      >
        <FieldGrid>
          <FormField
            label="Document name or reference"
            required
            span
            hint={
              <FieldHint
                what="The contract, prospectus, or allocation report that lists the eligible assets."
                where="legal file, issuer website, or annual allocation / impact report"
              />
            }
          >
            <Input className={FIELD_INPUT} value={draft.evidenceSource} onChange={(e) => set({ evidenceSource: e.target.value })} />
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

function EmissionsPathStep({
  draft,
  onChange,
  errors,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
}) {
  const outcome = resolveUopAccounting(draft.eligibility);
  const allowed = allowedUopEmissionsPaths(outcome);
  const set = (patch: Partial<UopDraft>) => onChange(patchUopDraft(draft, patch));
  const options: Array<{ id: UopEmissionsPath; title: string; description: string }> = [
    {
      id: "issuer_reported",
      title: "Use the issuer’s published figure",
      description:
        "The issuer already reported financed emissions for this bond, loan, or fund. PCAF: issuer-reported Use of Proceeds emissions, attributed by your outstanding share.",
    },
    {
      id: "underlying_assets",
      title: "Work it out asset by asset",
      description:
        "Enter each asset that received the money. PCAF: look through and use the matching asset-class method. Do not use the issuer’s company-wide inventory as a stand-in for a separate fund.",
    },
    {
      id: "estimation",
      title: "Use a sector estimate",
      description:
        "Only when reported asset emissions are not available. PCAF score-5 economic estimate, or a physical-activity estimate where that asset class allows it. Use an existing factor library — do not invent a factor.",
    },
  ].filter((option) => allowed.includes(option.id as "issuer_reported" | "underlying_assets" | "estimation"));

  return (
    <div className="space-y-5">
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
      {draft.emissionsPath === "issuer_reported" && (
        <InputSection
          title="Issuer allocation and impact report"
          description="Copy the published Use of Proceeds emissions figure. Do not calculate it here."
        >
          <FieldGrid>
            <FormField
              label="Reported financed emissions"
              unit="tCO2e"
              required
              tooltip="PCAF: issuer-reported UoP financed emissions"
              hint={
                <FieldHint
                  what="The total financed emissions the issuer published for this structure."
                  where="allocation and impact report"
                  unit="tonnes of CO2e (tCO2e)"
                />
              }
            >
              <FormattedNumberInput
                value={draft.issuerReportedFinancedEmissions ?? 0}
                onChange={(issuerReportedFinancedEmissions) => set({ issuerReportedFinancedEmissions })}
              />
              <ErrorText message={errors.issuerReportedFinancedEmissions} />
            </FormField>
            <FormField
              label="Year of that report"
              required
              hint={<FieldHint what="The year the issuer’s figure covers." where="cover page of the allocation and impact report" unit="YYYY" />}
            >
              <Input className={FIELD_INPUT} value={draft.issuerReportYear} onChange={(e) => set({ issuerReportYear: e.target.value })} />
              <ErrorText message={errors.issuerReportYear} />
            </FormField>
            <FormField label="Was the report verified?">
              <div className="grid grid-cols-2 gap-2">
                <Choice selected={draft.issuerReportVerification === "verified"} title="Verified" onClick={() => set({ issuerReportVerification: "verified" })} />
                <Choice selected={draft.issuerReportVerification === "unverified"} title="Not verified" onClick={() => set({ issuerReportVerification: "unverified" })} />
              </div>
            </FormField>
            <FormField
              label="Report name or link"
              required
              span
              hint={<FieldHint what="Enough detail for a reviewer to find the same figure." where="issuer website or your credit file" />}
            >
              <Input className={FIELD_INPUT} value={draft.issuerReportSource} onChange={(e) => set({ issuerReportSource: e.target.value })} />
              <ErrorText message={errors.issuerReportSource} />
            </FormField>
          </FieldGrid>
        </InputSection>
      )}
      {draft.emissionsPath === "estimation" && outcome?.kind === "uop" && outcome.classification === "integrated" && (
        <InputSection
          title="Why can’t you use asset-level figures?"
          description="Needed only for this type of financing when you are estimating instead of listing assets."
          tooltip="PCAF: issuer-level / score-5 estimates for integrated Use of Proceeds only if theoretically impossible, not practically feasible, or not material."
        >
          <div className="grid grid-cols-1 gap-3">
            <Choice
              selected={draft.issuerLevelReason === "theoretically_impossible"}
              title="The assets cannot be separated"
              description="PCAF: theoretically impossible. The underlying assets do not have their own emissions."
              onClick={() => set({ issuerLevelReason: "theoretically_impossible" })}
            />
            <Choice
              selected={draft.issuerLevelReason === "practically_not_feasible"}
              title="The allocation data is not available"
              description="PCAF: practically not feasible. You do not have enough detail on how funds were assigned."
              onClick={() => set({ issuerLevelReason: "practically_not_feasible" })}
            />
            <Choice
              selected={draft.issuerLevelReason === "not_material"}
              title="The difference would be too small to matter"
              description="PCAF: not material. Asset intensity is not expected to differ from the issuer."
              onClick={() => set({ issuerLevelReason: "not_material" })}
            />
          </div>
          <ErrorText message={errors.issuerLevelReason} />
        </InputSection>
      )}
    </div>
  );
}

function HoldingsStep({
  draft,
  onChange,
  errors,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
}) {
  const outcome = resolveUopAccounting(draft.eligibility);
  const set = (patch: Partial<UopDraft>) => onChange(patchUopDraft(draft, patch));
  const moneyUnit = draft.currency || "same currency as the deal";
  if (outcome?.kind === "uop" && outcome.classification === "separate") {
    return (
      <div className="space-y-5">
        <InputSection
          title="How much of the money has been assigned to assets?"
          description="For a separate fund or vehicle, leftover cash is not treated as causing emissions."
          tooltip="PCAF Separate Use of Proceeds: financed emissions are calculated only after funds are allocated. At issuance allocation is 0% unless assets were assigned immediately."
        >
          <div className="grid grid-cols-1 gap-3">
            <Choice
              selected={draft.allocationStatus === "none_yet"}
              title="None of it has been assigned yet"
              description="Financed emissions are zero until money is allocated. PCAF: not yet allocated."
              onClick={() => set({ allocationStatus: "none_yet" })}
            />
            <Choice
              selected={draft.allocationStatus === "known"}
              title="We know how much has been assigned"
              description="Enter the amount already allocated. PCAF: allocation known."
              onClick={() => set({ allocationStatus: "known" })}
            />
            <Choice
              selected={draft.allocationStatus === "unknown"}
              title="We do not know the split"
              description="You may assume all of it only if you also estimate leftover cash. PCAF: allocation unknown."
              onClick={() => set({ allocationStatus: "unknown" })}
            />
          </div>
          <ErrorText message={errors.allocationStatus} />
          <ErrorText message={errors.allocationUnknown} />
        </InputSection>
        {draft.allocationStatus === "known" && (
          <InputSection title="Amount already assigned">
            <FormField
              label="Assigned proceeds"
              required
              unit={moneyUnit}
              tooltip="PCAF: allocated proceeds"
              hint={
                <FieldHint
                  what="How much of the vehicle has already been assigned to named assets."
                  where="issuer allocation report or fund manager update"
                  unit={moneyUnit}
                />
              }
            >
              <FormattedNumberInput value={draft.allocatedProceeds ?? 0} onChange={(allocatedProceeds) => set({ allocatedProceeds })} />
              <ErrorText message={errors.allocatedProceeds} />
            </FormField>
          </InputSection>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <InputSection
        title="Assigned money and leftover money"
        description="For financing on the borrower’s books, both amounts count — leftover funds still support the issuer’s activity."
        tooltip="PCAF Integrated Use of Proceeds: allocated and unallocated proceeds are both in scope. Unallocated amounts are not treated like separate-structure cash."
      >
        <FieldGrid>
          <FormField
            label="Already assigned"
            required
            unit={moneyUnit}
            tooltip="PCAF: allocated proceeds"
            hint={
              <FieldHint
                what="Proceeds already assigned to named assets."
                where="allocation report or internal earmarking schedule"
                unit={moneyUnit}
              />
            }
          >
            <FormattedNumberInput value={draft.allocatedProceeds ?? 0} onChange={(allocatedProceeds) => set({ allocatedProceeds })} />
            <ErrorText message={errors.allocatedProceeds} />
          </FormField>
          <FormField
            label="Not yet assigned"
            required
            unit={moneyUnit}
            tooltip="PCAF: unallocated proceeds"
            hint={
              <FieldHint
                what="Proceeds still waiting to be assigned."
                where="allocation report or treasury schedule"
                unit={moneyUnit}
              />
            }
          >
            <FormattedNumberInput value={draft.unallocatedProceeds ?? 0} onChange={(unallocatedProceeds) => set({ unallocatedProceeds })} />
            <ErrorText message={errors.unallocatedProceeds} />
          </FormField>
        </FieldGrid>
      </InputSection>
      {(draft.unallocatedProceeds || 0) > 0 && (
        <InputSection
          title="How should leftover money be estimated?"
          description="The usual path is the issuer’s customer-segment data. Asset-level estimates need evidence of where the leftover funds will go."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Choice
              selected={draft.unallocatedUsesAssetLevelEstimate !== "yes"}
              title="Use the issuer’s usual customer data"
              description="PCAF: issuer-level / customer segment"
              onClick={() => set({ unallocatedUsesAssetLevelEstimate: "no" })}
            />
            <Choice
              selected={draft.unallocatedUsesAssetLevelEstimate === "yes"}
              title="Estimate from expected assets"
              description="PCAF: asset-level estimate, only with evidence"
              onClick={() => set({ unallocatedUsesAssetLevelEstimate: "yes" })}
            />
          </div>
          {draft.unallocatedUsesAssetLevelEstimate === "yes" && (
            <div className="mt-3">
              <FormField
                label="What shows where leftover funds will go?"
                required
                span
                hint={
                  <FieldHint
                    what="A short note pointing to a framework or pipeline (for example a single-sector green framework)."
                    where="sustainable finance framework or expected allocation schedule"
                  />
                }
              >
                <Input className={FIELD_INPUT} value={draft.expectedAllocationEvidence} onChange={(e) => set({ expectedAllocationEvidence: e.target.value })} />
                <ErrorText message={errors.expectedAllocationEvidence} />
              </FormField>
            </div>
          )}
          {draft.unallocatedUsesAssetLevelEstimate !== "yes" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[#64748B]">
                Leftover funds use issuer-level data (Figure 5-1 Step 3a). This is not the issuer-reported Use of Proceeds structure figure.
              </p>
              <ErrorText message={errors.issuerCompanyType} />
              <ErrorText message={errors.issuerEmissions} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Choice selected={draft.issuerCompanyType === "listed"} title="Listed issuer" onClick={() => set({ issuerCompanyType: "listed" })} />
                <Choice selected={draft.issuerCompanyType === "unlisted"} title="Private issuer" onClick={() => set({ issuerCompanyType: "unlisted" })} />
              </div>
              <FieldGrid>
                {draft.issuerCompanyType === "listed" && (
                  <FormField label="Issuer EVIC" required unit={moneyUnit} hint={<FieldHint what="Enterprise value including cash." where="issuer financials" unit={moneyUnit} />}>
                    <FormattedNumberInput value={draft.issuerEvic ?? 0} onChange={(issuerEvic) => set({ issuerEvic })} />
                    <ErrorText message={errors.issuerEvic} />
                  </FormField>
                )}
                {draft.issuerCompanyType === "unlisted" && (
                  <FormField label="Issuer equity + debt" required unit={moneyUnit} hint={<FieldHint what="Total equity plus debt of the issuer." where="issuer financials" unit={moneyUnit} />}>
                    <FormattedNumberInput value={draft.issuerEquityPlusDebt ?? 0} onChange={(issuerEquityPlusDebt) => set({ issuerEquityPlusDebt })} />
                    <ErrorText message={errors.issuerEquityPlusDebt} />
                  </FormField>
                )}
                <FormField label="Issuer Scope 1" unit="tCO2e" hint={<FieldHint what="Issuer inventory Scope 1, if used for leftover funds only." where="issuer GHG report" unit="tCO2e" />}>
                  <FormattedNumberInput value={draft.issuerScope1Emissions ?? 0} onChange={(issuerScope1Emissions) => set({ issuerScope1Emissions })} />
                </FormField>
                <FormField label="Issuer Scope 2" unit="tCO2e">
                  <FormattedNumberInput value={draft.issuerScope2Emissions ?? 0} onChange={(issuerScope2Emissions) => set({ issuerScope2Emissions })} />
                </FormField>
                <FormField label="Issuer Scope 3" unit="tCO2e">
                  <FormattedNumberInput value={draft.issuerScope3Emissions ?? 0} onChange={(issuerScope3Emissions) => set({ issuerScope3Emissions })} />
                </FormField>
              </FieldGrid>
            </div>
          )}
        </InputSection>
      )}
    </div>
  );
}

function FactorProvenanceFields({
  value,
  option,
  onChange,
}: {
  value: UopEstimationInputs;
  option?: UopPcafOptionDef;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
}) {
  return (
    <FieldGrid>
      <FormField
        label="Factor library"
        hint={<FieldHint what="Pick a library this calculator already uses, if it applies." where="EPA or UK / DESNZ factor sets already in Rethink Carbon" />}
      >
        <select className={cn(FIELD_INPUT, "w-full rounded-md border px-3")} value={value.factorLibrary} onChange={(e) => onChange({ factorLibrary: e.target.value as UopEstimationInputs["factorLibrary"] })}>
          <option value="">Select if a supported library applies</option>
          <option value="EPA">EPA</option>
          <option value="DEFRA">UK / DESNZ</option>
        </select>
      </FormField>
      <FormField
        label="Dataset code"
        hint={<FieldHint what="The existing dataset code only — do not invent one." where="factor catalog in this calculator" />}
      >
        <Input className={FIELD_INPUT} value={value.factorDatasetCode} onChange={(e) => onChange({ factorDatasetCode: e.target.value })} placeholder="Existing dataset code only" />
      </FormField>
      <FormField
        label="Factor source"
        required
        hint={<FieldHint what="Who published the factor, for example EPA, DESNZ, or an EEIO table." where="factor documentation" />}
      >
        <Input className={FIELD_INPUT} value={value.factorSource} onChange={(e) => onChange({ factorSource: e.target.value })} />
      </FormField>
      <FormField
        label="Geography"
        required
        hint={<FieldHint what="The country or region the factor applies to." where="factor documentation" />}
      >
        <Input className={FIELD_INPUT} value={value.factorGeography} onChange={(e) => onChange({ factorGeography: e.target.value })} />
      </FormField>
      <FormField
        label="Factor year"
        required
        hint={<FieldHint what="The year of the factor table." where="factor documentation" unit="YYYY" />}
      >
        <Input className={FIELD_INPUT} value={value.factorYear} onChange={(e) => onChange({ factorYear: e.target.value })} />
      </FormField>
      <FormField
        label={option?.factorLabel || "Published factor value"}
        required
        hint={<FieldHint what="The numeric factor from the named source. Do not invent one. EPA/DESNZ values are not substituted automatically." where="the published factor table you named" />}
      >
        <FormattedNumberInput value={value.emissionFactor ?? 0} onChange={(emissionFactor) => onChange({ emissionFactor })} />
      </FormField>
      <FormField
        label="Factor units"
        required
        hint={<FieldHint what={option?.factorUnitHint || "The published unit, such as tCO2e per MWh or tCO2e per currency."} where="factor documentation" unit={option?.factorUnitHint} />}
      >
        <Input className={FIELD_INPUT} value={value.factorUnit} onChange={(e) => onChange({ factorUnit: e.target.value })} placeholder={option?.factorUnitHint || "tCO2e per unit"} />
      </FormField>
    </FieldGrid>
  );
}

function EstimationFields({
  value,
  assetClass,
  onChange,
  errors,
  prefix,
}: {
  value: UopEstimationInputs;
  assetClass: UopUnderlyingAssetClass | "";
  onChange: (next: UopEstimationInputs) => void;
  errors: Record<string, string>;
  prefix: string;
}) {
  const set = (patch: Partial<UopEstimationInputs>) => onChange({ ...value, ...patch });
  const options = optionsForAssetClass(assetClass);
  const selected = optionDef(assetClass, value.pcafOption);
  const fields = new Set(selected?.fields || []);

  if (isUnsupportedUopAssetClass(assetClass)) {
    return (
      <p className="text-sm text-[#64748B]">
        Nested Use of Proceeds and sovereign assets cannot be estimated on this form. Those methods stay unavailable.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[#64748B]">
        Choose the PCAF option that matches the data you have. The data-quality score is taken from that option. You cannot type a score.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {options.map((item) => (
          <Choice
            key={item.id}
            selected={value.pcafOption === item.id}
            title={`${item.title} (score ${item.score})`}
            description={item.description}
            onClick={() => set({ pcafOption: item.id as UopPcafOptionId, method: item.method })}
          />
        ))}
      </div>
      <ErrorText message={errors[`${prefix}.estimation.pcafOption`]} />
      {selected && (
        <FieldGrid>
          {fields.has("energy") && (
            <FormField
              label="Energy consumption"
              required
              hint={<FieldHint what="Actual energy used in the reporting year." where="utility bill, operator report, or energy statement" unit="kWh or MWh" />}
            >
              <FormattedNumberInput value={value.energyConsumption ?? 0} onChange={(energyConsumption) => set({ energyConsumption, physicalActivityAmount: energyConsumption })} />
              <ErrorText message={errors[`${prefix}.estimation.energyConsumption`]} />
            </FormField>
          )}
          {fields.has("production") && (
            <FormField
              label="Production"
              required
              hint={<FieldHint what="Physical output in the reporting year." where="operator production report" unit="tonnes or stated unit" />}
            >
              <FormattedNumberInput value={value.productionAmount ?? 0} onChange={(productionAmount) => set({ productionAmount, physicalActivityAmount: productionAmount })} />
              <ErrorText message={errors[`${prefix}.estimation.productionAmount`]} />
            </FormField>
          )}
          {fields.has("revenue") && (
            <FormField
              label="Company or project revenue"
              required
              hint={<FieldHint what="Revenue used with the published sector intensity." where="financial statements or project report" />}
            >
              <FormattedNumberInput value={value.companyRevenue ?? 0} onChange={(companyRevenue) => set({ companyRevenue })} />
              <ErrorText message={errors[`${prefix}.estimation.companyRevenue`]} />
            </FormField>
          )}
          {fields.has("atr") && (
            <FormField
              label="Asset turnover ratio"
              required
              hint={<FieldHint what="Published sector asset-turnover ratio. Do not invent one." where="the same sector table as the intensity" unit="ratio" />}
            >
              <FormattedNumberInput value={value.assetTurnoverRatio ?? 0} onChange={(assetTurnoverRatio) => set({ assetTurnoverRatio })} />
              <ErrorText message={errors[`${prefix}.estimation.assetTurnoverRatio`]} />
            </FormField>
          )}
          {fields.has("processEmissions") && (
            <FormField
              label="Process emissions (optional)"
              hint={<FieldHint what="Optional process emissions added before attribution." where="operator GHG report" unit="tCO2e" />}
            >
              <FormattedNumberInput value={value.processEmissions ?? 0} onChange={(processEmissions) => set({ processEmissions })} />
            </FormField>
          )}
          {fields.has("labelIntensity") && (
            <FormField
              label="Energy from labels"
              required
              hint={<FieldHint what="Whole-building energy intensity from the energy label." where="EPC or energy performance certificate" unit="kWh/m²" />}
            >
              <FormattedNumberInput value={value.labelEnergyIntensity ?? 0} onChange={(labelEnergyIntensity) => set({ labelEnergyIntensity })} />
              <ErrorText message={errors[`${prefix}.estimation.labelEnergyIntensity`]} />
            </FormField>
          )}
          {fields.has("statsIntensity") && (
            <FormField
              label={fields.has("buildingCount") ? "Statistical energy per building" : "Statistical energy intensity"}
              required
              hint={
                <FieldHint
                  what={fields.has("buildingCount") ? "Average energy per building from statistics." : "Average energy intensity from statistics."}
                  where="building energy statistics table"
                  unit={fields.has("buildingCount") ? "kWh/building" : "kWh/m² or kWh/sqft"}
                />
              }
            >
              <FormattedNumberInput value={value.statsEnergyIntensity ?? 0} onChange={(statsEnergyIntensity) => set({ statsEnergyIntensity })} />
              <ErrorText message={errors[`${prefix}.estimation.statsEnergyIntensity`]} />
            </FormField>
          )}
          {fields.has("floorArea") && (
            <FormField
              label="Floor area financed"
              required
              hint={<FieldHint what="The floor area this financing covers." where="valuation, energy label, or loan file" unit="m² or sqft matching the intensity" />}
            >
              <FormattedNumberInput value={value.floorArea ?? 0} onChange={(floorArea) => set({ floorArea })} />
              <ErrorText message={errors[`${prefix}.estimation.floorArea`]} />
            </FormField>
          )}
          {fields.has("buildingCount") && (
            <FormField
              label="Number of buildings"
              required
              hint={<FieldHint what="How many buildings this financing covers." where="loan file or allocation report" unit="buildings" />}
            >
              <FormattedNumberInput value={value.numberOfBuildings ?? 0} onChange={(numberOfBuildings) => set({ numberOfBuildings })} />
              <ErrorText message={errors[`${prefix}.estimation.numberOfBuildings`]} />
            </FormField>
          )}
          {fields.has("fuel") && (
            <FormField
              label="Fuel consumption"
              required
              hint={<FieldHint what="Actual fuel used by the financed vehicle." where="fuel log or operator report" unit="litres or stated fuel unit" />}
            >
              <FormattedNumberInput value={value.fuelConsumption ?? 0} onChange={(fuelConsumption) => set({ fuelConsumption, physicalActivityAmount: fuelConsumption })} />
              <ErrorText message={errors[`${prefix}.estimation.fuelConsumption`]} />
            </FormField>
          )}
          {fields.has("distance") && (
            <FormField
              label="Distance travelled"
              required
              hint={<FieldHint what="Actual or statistical distance, matching the option you chose." where="odometer, local statistics, or regional statistics" unit="km" />}
            >
              <FormattedNumberInput value={value.distanceTraveled ?? 0} onChange={(distanceTraveled) => set({ distanceTraveled, physicalActivityAmount: distanceTraveled })} />
              <ErrorText message={errors[`${prefix}.estimation.distanceTraveled`]} />
            </FormField>
          )}
          {fields.has("efficiency") && (
            <FormField
              label="Fuel efficiency"
              required
              hint={<FieldHint what="Make/model, vehicle-type, or average efficiency, matching the option you chose." where="manufacturer data or vehicle statistics" unit="L/km" />}
            >
              <FormattedNumberInput value={value.efficiency ?? 0} onChange={(efficiency) => set({ efficiency })} />
              <ErrorText message={errors[`${prefix}.estimation.efficiency`]} />
            </FormField>
          )}
          {fields.has("sectorShare") && (
            <>
              <FormField
                label="Sector"
                hint={<FieldHint what="The sector this asset belongs to." where="NACE/ISIC mapping, credit file, or issuer report" />}
              >
                <Input className={FIELD_INPUT} value={value.sectorName} onChange={(e) => set({ sectorName: e.target.value })} />
              </FormField>
              <FormField
                label="Sector code"
                hint={<FieldHint what="Optional code used in your sector list." where="internal sector table" />}
              >
                <Input className={FIELD_INPUT} value={value.sectorKey} onChange={(e) => set({ sectorKey: e.target.value })} />
              </FormField>
              <FormField
                label="Share of this sector"
                unit="%"
                hint={<FieldHint what="How much of the asset sits in this sector." where="allocation statement" unit="percent" />}
              >
                <FormattedNumberInput value={value.sectorAllocationPercent ?? 0} onChange={(sectorAllocationPercent) => set({ sectorAllocationPercent })} />
                <ErrorText message={errors[`${prefix}.estimation.sectorAllocationPercent`]} />
              </FormField>
              <ErrorText message={errors[`${prefix}.estimation.sector`]} />
            </>
          )}
        </FieldGrid>
      )}
      {selected && (
        <FactorProvenanceFields value={value} option={selected} onChange={set} />
      )}
      <ErrorText message={errors[`${prefix}.estimation.factorSource`]} />
      <ErrorText message={errors[`${prefix}.estimation.emissionFactor`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorGeography`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorYear`]} />
      <ErrorText message={errors[`${prefix}.estimation.factorUnit`]} />
    </div>
  );
}

function AssetCard({
  asset,
  index,
  errors,
  currency,
  onChange,
  onRemove,
}: {
  asset: UopUnderlyingAsset;
  index: number;
  errors: Record<string, string>;
  currency: string;
  onChange: (patch: Partial<UopUnderlyingAsset>) => void;
  onRemove: () => void;
}) {
  const prefix = `assets.${asset.underlyingAssetId}`;
  const moneyUnit = currency || "deal currency";
  return (
    <InputSection
      title={asset.name.trim() || `Asset ${index + 1}`}
      description="Each asset keeps its own id so two mortgages are not mixed together."
      tooltip={`Stable asset id ${asset.underlyingAssetId}. This is not formula_id.`}
      action={
        <Button type="button" variant="ghost" className="h-8 text-[#64748B]" onClick={onRemove}>
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
      }
    >
      <FieldGrid>
        <FormField
          label="Asset name"
          required
          hint={<FieldHint what="A name a colleague would recognise." where="allocation report or credit file" />}
        >
          <Input className={FIELD_INPUT} value={asset.name} onChange={(e) => onChange({ name: e.target.value })} />
          <ErrorText message={errors[`${prefix}.name`]} />
        </FormField>
        <FormField
          label="What type of asset is it?"
          required
          tooltip="PCAF underlying asset class. Two assets may share the same class."
          hint={<FieldHint what="The loan or investment type of this asset." where="allocation report" />}
        >
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
          >
            <option value="">Select type</option>
            {UNDERLYING_CLASSES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <ErrorText message={errors[`${prefix}.assetClass`]} />
        </FormField>
        <FormField
          label="Amount assigned to this asset"
          required
          unit={moneyUnit}
          tooltip="PCAF: allocated / outstanding amount"
          hint={
            <FieldHint
              what="How much of the earmarked money sits on this asset."
              where="allocation report"
              unit={moneyUnit}
            />
          }
        >
          <FormattedNumberInput value={asset.allocatedOutstanding ?? 0} onChange={(allocatedOutstanding) => onChange({ allocatedOutstanding })} />
          <ErrorText message={errors[`${prefix}.allocatedOutstanding`]} />
        </FormField>
        <FormField
          label="Total value of this asset"
          unit={moneyUnit}
          tooltip="PCAF: total asset value / attribution denominator"
          hint={
            <FieldHint
              what="The full value used as the denominator, if you have it."
              where="issuer report or asset valuation"
              unit={moneyUnit}
            />
          }
        >
          <FormattedNumberInput value={asset.totalAssetValue ?? 0} onChange={(totalAssetValue) => onChange({ totalAssetValue })} />
          <ErrorText message={errors[`${prefix}.totalAssetValue`]} />
        </FormField>
      </FieldGrid>
      <div className="mt-4">
        <p className="text-sm font-medium text-[#334155] mb-2">Does this asset already have reported emissions?</p>
        <YesNo value={asset.hasReportedEmissions} onChange={(hasReportedEmissions) => onChange({ hasReportedEmissions })} />
        <ErrorText message={errors[`${prefix}.hasReportedEmissions`]} />
      </div>
      {asset.hasReportedEmissions === "yes" && (
        <FieldGrid>
          <FormField
            label="Scope 1"
            unit="tCO2e"
            hint={<FieldHint what="Direct emissions, if reported. Leave blank if not reported. Enter 0 only when reported as zero." where="issuer or operator GHG report" unit="tCO2e" />}
          >
            <FormattedNumberInput value={asset.scope1Emissions ?? 0} onChange={(scope1Emissions) => onChange({ scope1Emissions })} />
          </FormField>
          <FormField
            label="Scope 2"
            unit="tCO2e"
            hint={<FieldHint what="Purchased electricity and heat, if reported." where="issuer or operator GHG report" unit="tCO2e" />}
          >
            <FormattedNumberInput value={asset.scope2Emissions ?? 0} onChange={(scope2Emissions) => onChange({ scope2Emissions })} />
          </FormField>
          <FormField
            label="Scope 3"
            unit="tCO2e"
            hint={<FieldHint what="Value-chain emissions, if reported." where="issuer or operator GHG report" unit="tCO2e" />}
          >
            <FormattedNumberInput value={asset.scope3Emissions ?? 0} onChange={(scope3Emissions) => onChange({ scope3Emissions })} />
          </FormField>
          <ErrorText message={errors[`${prefix}.emissions`]} />
          <FormField label="Was this verified?" span>
            <div className="grid grid-cols-2 gap-2">
              <Choice selected={asset.verificationStatus === "verified"} title="Verified" onClick={() => onChange({ verificationStatus: "verified" })} />
              <Choice selected={asset.verificationStatus === "unverified"} title="Not verified" onClick={() => onChange({ verificationStatus: "unverified" })} />
            </div>
            <ErrorText message={errors[`${prefix}.verificationStatus`]} />
          </FormField>
          {asset.verificationStatus === "verified" && (
            <FormField
              label="Verifier"
              span
              hint={<FieldHint what="The firm that verified the report." where="assurance statement" />}
            >
              <Input className={FIELD_INPUT} value={asset.verifierName} onChange={(e) => onChange({ verifierName: e.target.value })} />
            </FormField>
          )}
        </FieldGrid>
      )}
      {asset.hasReportedEmissions === "no" && (
        <div className="mt-3">
          <p className="text-sm font-medium text-[#334155] mb-2">Estimate using a PCAF option already in this calculator and a published factor. Do not type a made-up factor value or a data-quality score.</p>
          <EstimationFields
            value={asset.estimation}
            assetClass={asset.assetClass}
            onChange={(estimation) => onChange({ estimation })}
            errors={errors}
            prefix={prefix}
          />
        </div>
      )}
      <div className="mt-3">
        <FormField
          label="Where did these figures come from?"
          required
          span
          hint={<FieldHint what="A report name a reviewer can find again." where="allocation report, operator GHG report, or credit file" />}
        >
          <Input className={FIELD_INPUT} value={asset.dataSource} onChange={(e) => onChange({ dataSource: e.target.value })} />
          <ErrorText message={errors[`${prefix}.dataSource`]} />
        </FormField>
        <FormField label="Notes (optional)" span>
          <Input className={FIELD_INPUT} value={asset.evidenceNotes} onChange={(e) => onChange({ evidenceNotes: e.target.value })} />
        </FormField>
      </div>
    </InputSection>
  );
}

function AssetsStep({
  draft,
  onChange,
  errors,
}: {
  draft: UopDraft;
  onChange: (next: UopDraft) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#64748B]">
        Add each asset that received this money. Two homes or two projects stay as two rows. Choose the PCAF option that matches the data you have; the score comes from that option.
      </p>
      <ErrorText message={errors.assets} />
      {draft.assets.map((asset, index) => (
        <AssetCard
          key={asset.underlyingAssetId}
          asset={asset}
          index={index}
          errors={errors}
          currency={draft.currency}
          onChange={(patch) => onChange(updateUnderlyingAsset(draft, asset.underlyingAssetId, patch))}
          onRemove={() => onChange(removeUnderlyingAsset(draft, asset.underlyingAssetId))}
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
    <div className={cn("rounded-[14px] border px-4 py-3 text-sm flex flex-wrap items-center gap-2 justify-between", palettes[status])}>
      <p className="font-medium">
        {labels[status]}
        {status === "saved" && (
          <span className="ml-2 font-normal text-[#64748B]">Questionnaire draft only — not a reportable financed-emissions total.</span>
        )}
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
    <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">{canCalculateUop() ? "Preview calculation only" : "Totals cannot be calculated yet"}</p>
      <p className="mt-1 leading-relaxed">{UOP_REPORTABLE_BLOCKED_MESSAGE}</p>
      {canCalculateUop() && !canSaveReportableUop() && (
        <p className="mt-2 text-amber-900/80">
          Calculate uses the dedicated backend route. Final reportable Save and portfolio inclusion stay disabled until Phase 5D.
        </p>
      )}
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
}) {
  const outcome = resolveUopAccounting(draft.eligibility);
  const display = outcome ? uopOutcomeDisplay(outcome) : null;
  return (
    <div className="space-y-5">
      <UopBackendUnavailableBanner />
      {saveStatus && saveStatus !== "idle" && (
        <UopDraftStatusBar
          status={saveStatus}
          errorMessage={saveError}
          onRetry={onRetrySave}
          onRefresh={onRefreshDraft}
          onApplyShared={onApplyShared}
        />
      )}
      {stepId === "uop-eligibility" && <EligibilityStep draft={draft} onChange={onChange} errors={errors} />}
      {stepId === "uop-guidance" && outcome && display && (
        <div className="rounded-[14px] border border-[#E8EEF0] bg-white p-5">
          <h3 className="text-lg font-semibold text-[#0F172A]">{display.heading}</h3>
          <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{display.body}</p>
          <p className="mt-2 text-xs text-[#94A3B8] leading-relaxed">{display.official}</p>
          <p className="mt-3 text-sm text-[#0F172A]">
            Go back to Loan type and open the matching questionnaire. This deal will not be calculated as Use of Proceeds.
          </p>
        </div>
      )}
      {stepId === "uop-structure" && uopQualifiesForMethod(outcome) && (
        <StructureStep
          draft={draft}
          onChange={onChange}
          errors={errors}
          counterpartyId={counterpartyId}
          siblingHoldings={siblingHoldings}
        />
      )}
      {stepId === "uop-emissions-path" && uopQualifiesForMethod(outcome) && (
        <EmissionsPathStep draft={draft} onChange={onChange} errors={errors} />
      )}
      {stepId === "uop-holdings" && uopQualifiesForMethod(outcome) && (
        <HoldingsStep draft={draft} onChange={onChange} errors={errors} />
      )}
      {stepId === "uop-assets" && uopQualifiesForMethod(outcome) && (
        <AssetsStep draft={draft} onChange={onChange} errors={errors} />
      )}
    </div>
  );
}

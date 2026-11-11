import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGrid, FIELD_INPUT, FormField, InputSection } from "../forms/InputLayout";
import { cn } from "@/lib/utils";
import { financeLoanTypeLabel } from "../config/loanTypeOptions";
import {
  currentEligibilityQuestion,
  resolveSspAccounting,
  sspQualifiesForMethod,
  visibleEligibilityQuestions,
  type SspEligibilityQuestionId,
} from "./eligibility";
import { ELIGIBILITY_COPY, STRUCTURE_TYPE_LABELS, sspOutcomeDisplay, sspRedirectLoanType } from "./copy";
import { SSP_CURRENCIES, patchSspDraft, patchSspEligibility } from "./state";
import { validateSspStep } from "./validation";
import { SspBackendUnavailableBanner, SspResultsPanel } from "./SspResultsPanel";
import { SspHierarchyEditor } from "./SspHierarchyEditor";
import type { SspDraftSaveStatus } from "./draftPersistence";
import { sspHierarchyWarnings } from "./validation";
import type { SspDraft, SspStructureType, SspYesNo } from "./types";

const TILE = "w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-200";
const TILE_ON = "border-[#0F6E56] bg-[#EAF7F1] shadow-[0_8px_20px_rgba(15,110,86,0.06)]";
const TILE_OFF = "border-[#E8EEF0] bg-white hover:border-[#BFE3D3]";

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
      {description ? <p className="text-sm text-[#64748B] mt-0.5 leading-snug">{description}</p> : null}
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

function YesNo({ value, onChange }: { value: SspYesNo; onChange: (value: SspYesNo) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Choice selected={value === "yes"} title="Yes" onClick={() => onChange("yes")} />
      <Choice selected={value === "no"} title="No" onClick={() => onChange("no")} />
    </div>
  );
}

function OutcomeCard({ draft }: { draft: SspDraft }) {
  const outcome = resolveSspAccounting(draft.eligibility);
  if (!outcome) return null;
  const display = sspOutcomeDisplay(outcome);
  const toneClass =
    display.tone === "ok"
      ? "border-[#DCEAE2] bg-white"
      : display.tone === "exclude"
        ? "border-amber-200 bg-amber-50"
        : display.tone === "reroute"
          ? "border-sky-200 bg-sky-50"
          : "border-[#E2E8F0] bg-[#F8FAFC]";
  return (
    <div className={cn("rounded-xl border px-5 py-4", toneClass)}>
      <p className="font-semibold text-[#0F172A]">{display.heading}</p>
      <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{display.body}</p>
      {"pcafRef" in outcome ? (
        <p className="mt-2 text-xs text-[#94A3B8]">{outcome.pcafRef}</p>
      ) : null}
    </div>
  );
}

function EligibilityStep({
  draft,
  onChange,
  errors,
  editing,
  onEditingChange,
  onLeaveSsp,
}: {
  draft: SspDraft;
  onChange: (next: SspDraft) => void;
  errors: Record<string, string>;
  editing: SspEligibilityQuestionId | null;
  onEditingChange: (id: SspEligibilityQuestionId | null) => void;
  onLeaveSsp?: (suggestedLoanType?: string | null) => void;
}) {
  const visible = visibleEligibilityQuestions(draft.eligibility);
  const current = editing || currentEligibilityQuestion(draft.eligibility);
  const outcome = resolveSspAccounting(draft.eligibility);
  const done = Boolean(outcome) && !current;

  const answer = (id: SspEligibilityQuestionId, value: string) => {
    onChange(patchSspEligibility(draft, { [id]: value } as Partial<SspDraft["eligibility"]>));
    onEditingChange(null);
  };

  if (done) {
    const suggested = sspRedirectLoanType(outcome);
    const suggestedLabel = suggested ? financeLoanTypeLabel(suggested) : null;
    const isChooseClass = outcome?.kind === "choose-class";
    return (
      <div className="space-y-4">
        <OutcomeCard draft={draft} />
        {!sspQualifiesForMethod(outcome) ? (
          <div className="rounded-[14px] border border-[#DCEAE2] bg-[#F8FAFC] p-4">
            <p className="text-sm text-[#0F172A] leading-relaxed">
              This deal is not calculated as Securitization & Structured Products under the answers given.
            </p>
            {onLeaveSsp ? (
              <Button
                type="button"
                className="mt-3 h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white"
                onClick={() => onLeaveSsp(isChooseClass ? null : suggested)}
              >
                {isChooseClass
                  ? "Return to loan-type selection"
                  : suggestedLabel
                    ? `Switch to ${suggestedLabel}`
                    : "Choose a different loan type"}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-[#0F6E56]">Continue to deal information.</p>
        )}
        <button
          type="button"
          className="text-sm text-[#64748B] underline"
          onClick={() => onEditingChange(visible[visible.length - 1] || "isStructuredProduct")}
        >
          Change an earlier answer
        </button>
        <ErrorText message={errors.eligibility} />
      </div>
    );
  }

  if (!current) return null;
  const copy = ELIGIBILITY_COPY[current];
  const value = draft.eligibility[current];

  return (
    <div className="space-y-4">
      {visible.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {visible.slice(0, -1).map((id) => (
            <button
              key={id}
              type="button"
              className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs text-[#64748B]"
              onClick={() => onEditingChange(id)}
            >
              {ELIGIBILITY_COPY[id].title.slice(0, 36)}…
            </button>
          ))}
        </div>
      ) : null}
      <div>
        <h3 className="text-lg font-semibold text-[#0F172A]">{copy.title}</h3>
        <p className="mt-1 text-sm text-[#64748B] leading-relaxed">{copy.help}</p>
      </div>
      {copy.options ? (
        <div className="grid grid-cols-1 gap-3">
          {copy.options.map((opt) => (
            <Choice
              key={opt.value}
              selected={value === opt.value}
              title={opt.label}
              description={opt.hint}
              onClick={() => answer(current, opt.value)}
            />
          ))}
        </div>
      ) : (
        <YesNo value={value as SspYesNo} onChange={(next) => answer(current, next)} />
      )}
      <ErrorText message={errors.eligibility} />
    </div>
  );
}

function DealStep({
  draft,
  onChange,
  errors,
  onTouch,
}: {
  draft: SspDraft;
  onChange: (next: SspDraft) => void;
  errors: Record<string, string>;
  onTouch: (key: string) => void;
}) {
  const deal = draft.deal;
  const structure = String(deal.structureType || "");
  const showSpv =
    draft.eligibility.structureFamily === "true-sale" ||
    structure.includes("abs") ||
    structure === "rmbs" ||
    structure === "cmbs" ||
    structure === "clo-cdo";

  return (
    <InputSection
      title="Deal information"
      description="Plain-language deal facts. Leave SPV blank when the structure does not use one."
    >
      <FieldGrid>
        <FormField label="Deal name" error={errors["deal.dealName"]}>
          <Input
            data-testid="ssp-deal-name"
            className={FIELD_INPUT}
            value={deal.dealName}
            onChange={(e) => onChange(patchSspDraft(draft, { deal: { ...deal, dealName: e.target.value } }))}
            onBlur={() => onTouch("deal.dealName")}
          />
        </FormField>
        <FormField label="Deal identifier (optional)">
          <Input
            className={FIELD_INPUT}
            value={deal.dealIdentifier}
            placeholder="ISIN / internal deal id"
            onChange={(e) => onChange(patchSspDraft(draft, { deal: { ...deal, dealIdentifier: e.target.value } }))}
          />
        </FormField>
        <FormField label="Issuer">
          <Input
            className={FIELD_INPUT}
            value={deal.issuerName}
            onChange={(e) => onChange(patchSspDraft(draft, { deal: { ...deal, issuerName: e.target.value } }))}
          />
        </FormField>
        <FormField label="Originator">
          <Input
            className={FIELD_INPUT}
            value={deal.originatorName}
            onChange={(e) => onChange(patchSspDraft(draft, { deal: { ...deal, originatorName: e.target.value } }))}
          />
        </FormField>
        {showSpv ? (
          <FormField label="SPV name (if applicable)">
            <Input
              className={FIELD_INPUT}
              value={deal.spvName}
              onChange={(e) => onChange(patchSspDraft(draft, { deal: { ...deal, spvName: e.target.value } }))}
            />
          </FormField>
        ) : null}
        <FormField label="Structure type" error={errors["deal.structureType"]}>
          <select
            data-testid="ssp-structure-type"
            className={FIELD_INPUT}
            value={deal.structureType}
            onChange={(e) =>
              onChange(
                patchSspDraft(draft, {
                  deal: { ...deal, structureType: e.target.value as SspStructureType },
                })
              )
            }
            onBlur={() => onTouch("deal.structureType")}
          >
            <option value="">Select…</option>
            {Object.entries(STRUCTURE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Reporting year" error={errors["deal.reportingYear"]}>
          <Input
            data-testid="ssp-reporting-year"
            className={FIELD_INPUT}
            value={deal.reportingYear}
            onChange={(e) => onChange(patchSspDraft(draft, { deal: { ...deal, reportingYear: e.target.value } }))}
            onBlur={() => onTouch("deal.reportingYear")}
          />
        </FormField>
        <FormField label="Currency" error={errors["deal.currency"]}>
          <select
            className={FIELD_INPUT}
            value={deal.currency}
            onChange={(e) => onChange(patchSspDraft(draft, { deal: { ...deal, currency: e.target.value } }))}
          >
            {SSP_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Source documentation" error={errors["deal.documentationSource"]}>
          <Input
            data-testid="ssp-documentation-source"
            className={FIELD_INPUT}
            value={deal.documentationSource}
            placeholder="Offering circular, trustee report, internal memo…"
            onChange={(e) =>
              onChange(patchSspDraft(draft, { deal: { ...deal, documentationSource: e.target.value } }))
            }
            onBlur={() => onTouch("deal.documentationSource")}
          />
        </FormField>
      </FieldGrid>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        <FormField label="Collateral remains with originator?">
          <YesNo
            value={deal.collateralRemainsWithOriginator}
            onChange={(collateralRemainsWithOriginator) =>
              onChange(patchSspDraft(draft, { deal: { ...deal, collateralRemainsWithOriginator } }))
            }
          />
        </FormField>
        <FormField label="Has tranches?">
          <YesNo
            value={deal.hasTranches}
            onChange={(hasTranches) => onChange(patchSspDraft(draft, { deal: { ...deal, hasTranches } }))}
          />
        </FormField>
        <FormField label="Has pool of pools?">
          <YesNo
            value={deal.hasPoolOfPools}
            onChange={(hasPoolOfPools) => onChange(patchSspDraft(draft, { deal: { ...deal, hasPoolOfPools } }))}
          />
        </FormField>
        {deal.hasTranches === "yes" ? (
          <FormField label="Pools linked to specific tranches?">
            <YesNo
              value={deal.poolsLinkedToSpecificTranches}
              onChange={(poolsLinkedToSpecificTranches) =>
                onChange(patchSspDraft(draft, { deal: { ...deal, poolsLinkedToSpecificTranches } }))
              }
            />
          </FormField>
        ) : null}
      </div>
    </InputSection>
  );
}

function ReviewStep({ draft, counterpartyId }: { draft: SspDraft; counterpartyId?: string | null }) {
  const [showDraftId, setShowDraftId] = useState(false);
  const pathLabel =
    draft.emissionsPath === "lookthrough"
      ? "Look through to underlying assets"
      : draft.emissionsPath === "reported_pool"
        ? "Use reported pool emissions"
        : "—";
  return (
    <div className="space-y-4">
      <OutcomeCard draft={draft} />
      <div className="rounded-xl border border-[#E8EEF0] bg-white px-4 py-3 text-sm text-[#475569] space-y-1">
        <p>
          <span className="font-medium text-[#0F172A]">Deal:</span> {draft.deal.dealName || "—"}
        </p>
        <p>
          <span className="font-medium text-[#0F172A]">Structure:</span>{" "}
          {STRUCTURE_TYPE_LABELS[draft.deal.structureType] || draft.deal.structureType || "—"}
        </p>
        <p>
          <span className="font-medium text-[#0F172A]">Emissions approach:</span> {pathLabel}
        </p>
        <p>
          Collateral {draft.collateral.length} · Loans {draft.loans.length} · Pools {draft.pools.length} · Tranches{" "}
          {draft.tranches.length} · Holdings {draft.holdings.length}
        </p>
        <button
          type="button"
          className="text-xs text-[#0F6E56] underline-offset-2 hover:underline"
          onClick={() => setShowDraftId((v) => !v)}
        >
          {showDraftId ? "Hide technical draft id" : "Show technical draft id"}
        </button>
        {showDraftId ? (
          <p className="text-xs text-[#94A3B8] break-all">Draft id: {draft.financingInstanceId}</p>
        ) : null}
      </div>
      <SspResultsPanel draft={draft} counterpartyId={counterpartyId} />
    </div>
  );
}

function SspDraftStatusBar({
  status,
  errorMessage,
  conflictDetail,
  onRetry,
  onRefresh,
  onApplyShared,
}: {
  status: SspDraftSaveStatus;
  errorMessage?: string;
  conflictDetail?: string;
  onRetry?: () => void;
  onRefresh?: () => void;
  onApplyShared?: () => void;
}) {
  if (status === "idle") return null;
  const palettes: Record<SspDraftSaveStatus, string> = {
    idle: "",
    saving: "border-slate-200 bg-slate-50 text-slate-700",
    saved: "border-[#BFE3D3] bg-[#EAF7F1] text-[#0F6E56]",
    unsaved: "border-amber-200 bg-amber-50 text-amber-950",
    failed: "border-red-200 bg-red-50 text-red-800",
    conflict: "border-amber-300 bg-amber-50 text-amber-950",
  };
  const labels: Record<SspDraftSaveStatus, string> = {
    idle: "",
    saving: "Saving draft…",
    saved: "Draft saved (not portfolio-reportable)",
    unsaved: "Unsaved changes",
    failed: "Save failed — check your connection and retry",
    conflict: "Shared deal needs a decision",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2 text-xs flex flex-wrap items-center gap-2 justify-between", palettes[status])}>
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">
          {labels[status]}
          {errorMessage && status !== "saved" && status !== "saving" ? (
            <span className="ml-2 font-normal">{errorMessage}</span>
          ) : null}
        </p>
        {status === "conflict" && conflictDetail ? (
          <p className="font-normal text-amber-900/80">{conflictDetail}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {status === "failed" && onRetry ? (
          <Button type="button" variant="outline" className="h-8" onClick={onRetry}>
            Retry save
          </Button>
        ) : null}
        {status === "conflict" && onRefresh ? (
          <Button type="button" variant="outline" className="h-8" onClick={onRefresh}>
            Refresh from server
          </Button>
        ) : null}
        {status === "conflict" && onApplyShared ? (
          <Button type="button" className="h-8 bg-[#0F6E56] hover:bg-[#0c5a46]" onClick={onApplyShared}>
            Apply to shared deal
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SspQuestionnaire({
  draft,
  onChange,
  stepId,
  errors,
  onLeaveSsp,
  saveStatus,
  saveError,
  saveConflictDetail,
  onRetrySave,
  onRefreshDraft,
  onApplyShared,
  counterpartyId,
}: {
  draft: SspDraft;
  onChange: (next: SspDraft) => void;
  stepId: string;
  errors: Record<string, string>;
  onLeaveSsp?: (suggestedLoanType?: string | null) => void;
  saveStatus?: SspDraftSaveStatus;
  saveError?: string;
  saveConflictDetail?: string;
  onRetrySave?: () => void;
  onRefreshDraft?: () => void;
  onApplyShared?: () => void;
  counterpartyId?: string | null;
}) {
  const instanceKey = draft.financingInstanceId || draft.instanceKey || "";
  const [eligibilityEdit, setEligibilityEdit] = useState<{
    instance: string;
    question: SspEligibilityQuestionId | null;
  }>({ instance: instanceKey, question: null });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const editingEligibility = eligibilityEdit.instance === instanceKey ? eligibilityEdit.question : null;
  const setEditingEligibility = (question: SspEligibilityQuestionId | null) => {
    setEligibilityEdit({ instance: instanceKey, question });
  };
  const outcome = resolveSspAccounting(draft.eligibility);
  const continues = !outcome || sspQualifiesForMethod(outcome);

  useEffect(() => {
    setTouched({});
  }, [stepId, instanceKey]);

  const onTouch = (key: string) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  const localErrors = useMemo(() => validateSspStep(draft, stepId), [stepId, draft]);
  const shownErrors = useMemo(() => {
    const next = { ...errors };
    for (const [key, message] of Object.entries(localErrors)) {
      if (touched[key] || errors[key]) next[key] = message;
    }
    return next;
  }, [errors, localErrors, touched]);

  const warnings = stepId === "ssp-structure" || stepId === "ssp-review" ? sspHierarchyWarnings(draft) : [];

  return (
    <div className="space-y-6" data-testid={`ssp-step-${stepId}`}>
      {continues && stepId !== "ssp-review" ? <SspBackendUnavailableBanner /> : null}
      {continues && saveStatus && saveStatus !== "idle" ? (
        <SspDraftStatusBar
          status={saveStatus}
          errorMessage={saveError}
          conflictDetail={saveConflictDetail}
          onRetry={onRetrySave}
          onRefresh={onRefreshDraft}
          onApplyShared={onApplyShared}
        />
      ) : null}
      {warnings.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 space-y-1">
          <p className="font-medium">Heads-up (does not block Save or Next)</p>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
      {stepId === "ssp-eligibility" && (
        <EligibilityStep
          draft={draft}
          onChange={onChange}
          errors={shownErrors}
          editing={editingEligibility}
          onEditingChange={setEditingEligibility}
          onLeaveSsp={onLeaveSsp}
        />
      )}
      {stepId === "ssp-deal" && sspQualifiesForMethod(outcome) && (
        <DealStep draft={draft} onChange={onChange} errors={shownErrors} onTouch={onTouch} />
      )}
      {stepId === "ssp-structure" && sspQualifiesForMethod(outcome) && (
        <SspHierarchyEditor draft={draft} onChange={onChange} errors={shownErrors} onTouch={onTouch} />
      )}
      {stepId === "ssp-review" && sspQualifiesForMethod(outcome) && (
        <ReviewStep draft={draft} counterpartyId={counterpartyId} />
      )}
    </div>
  );
}

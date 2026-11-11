import { lazy, Suspense, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FieldGrid, FIELD_INPUT, FormField, InputSection } from "../forms/InputLayout";
import { cn } from "@/lib/utils";
import { COLLATERAL_CLASS_OPTIONS } from "./copy";
import { cafDenominatorHint, defaultPcafClassForFamily } from "./eligibility";
import {
  createCollateral,
  createHolding,
  createLoan,
  createPool,
  createPoolOfPools,
  createTranche,
  patchSspDraft,
  sumLoanCoaInPool,
} from "./state";
import type {
  SspCollateral,
  SspCollateralPcafClass,
  SspDraft,
  SspHolding,
  SspLoan,
  SspPool,
  SspTranche,
} from "./types";

/** Lazy so unit tests importing the SSP barrel do not load calculator/supabase forms. */
const SspUnderlyingClassFields = lazy(async () => {
  const mod = await import("./underlying/SspUnderlyingQuestionnaire");
  return { default: mod.SspUnderlyingQuestionnaire };
});

function MoneyInput({
  value,
  onChange,
  onBlur,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
}) {
  return (
    <FormattedNumberInput
      value={value ?? null}
      placeholder=""
      onChange={onChange}
      onClear={() => onChange(null)}
      onBlur={onBlur}
    />
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}

function ExpandCard({
  title,
  subtitle,
  open,
  onToggle,
  onRemove,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E8EEF0] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#F8FAFC]">
        <button type="button" className="flex-1 flex items-center gap-2 text-left" onClick={onToggle}>
          {open ? <ChevronDown className="h-4 w-4 text-[#64748B]" /> : <ChevronRight className="h-4 w-4 text-[#64748B]" />}
          <div>
            <p className="font-medium text-[#0F172A]">{title}</p>
            {subtitle ? <p className="text-xs text-[#64748B]">{subtitle}</p> : null}
          </div>
        </button>
        {onRemove ? (
          <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {open ? <div className="px-4 py-4 space-y-4 border-t border-[#E8EEF0]">{children}</div> : null}
    </div>
  );
}

function MultiSelectChips({
  options,
  selected,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() =>
              onChange(on ? selected.filter((id) => id !== opt.id) : [...selected, opt.id])
            }
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              on ? "border-[#0F6E56] bg-[#EAF7F1] text-[#0F6E56]" : "border-[#E2E8F0] bg-white text-[#64748B]"
            )}
          >
            {opt.label}
          </button>
        );
      })}
      {!options.length ? <p className="text-sm text-[#94A3B8]">Add items above first.</p> : null}
    </div>
  );
}

export function SspHierarchyEditor({
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
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  const needsTranches = draft.deal.hasTranches === "yes";
  const needsPop = draft.deal.hasPoolOfPools === "yes";

  const updateCollateral = (id: string, patch: Partial<SspCollateral>) => {
    onChange(
      patchSspDraft(draft, {
        collateral: draft.collateral.map((row) => (row.collateralId === id ? { ...row, ...patch } : row)),
      })
    );
  };
  const updateLoan = (id: string, patch: Partial<SspLoan>) => {
    onChange(
      patchSspDraft(draft, {
        loans: draft.loans.map((row) => (row.loanId === id ? { ...row, ...patch } : row)),
      })
    );
  };
  const updatePool = (id: string, patch: Partial<SspPool>) => {
    onChange(
      patchSspDraft(draft, {
        pools: draft.pools.map((row) => (row.poolId === id ? { ...row, ...patch } : row)),
      })
    );
  };
  const updateTranche = (id: string, patch: Partial<SspTranche>) => {
    onChange(
      patchSspDraft(draft, {
        tranches: draft.tranches.map((row) => (row.trancheId === id ? { ...row, ...patch } : row)),
      })
    );
  };
  const updateHolding = (id: string, patch: Partial<SspHolding>) => {
    onChange(
      patchSspDraft(draft, {
        holdings: draft.holdings.map((row) => (row.holdingId === id ? { ...row, ...patch } : row)),
      })
    );
  };

  const addDefaultCollateral = () => {
    const family = draft.eligibility.collateralFamily;
    const type = (defaultPcafClassForFamily(family) || "") as SspCollateralPcafClass;
    const row = createCollateral({
      collateralType: type,
      denominatorLabel: cafDenominatorHint(type),
      name: `Collateral ${draft.collateral.length + 1}`,
    });
    onChange(patchSspDraft(draft, { collateral: [...draft.collateral, row] }));
    setOpen((prev) => ({ ...prev, [row.collateralId]: true }));
  };

  return (
    <div className="space-y-6">
      <InputSection
        title="Emissions calculation path"
        description="Choose look-through or evidenced reported pool emissions. Do not combine both for the same pool."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(
            [
              {
                value: "lookthrough" as const,
                title: "Look-through",
                description: "Use underlying PCAF asset-class calculators for each collateral item",
              },
              {
                value: "reported_pool" as const,
                title: "Reported pool emissions",
                description: "Use issuer/servicer reported pool totals with evidence — not issuer corporate GHG by default",
              },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(patchSspDraft(draft, { emissionsPath: opt.value }))}
              className={cn(
                "w-full text-left rounded-xl border px-4 py-3.5",
                draft.emissionsPath === opt.value
                  ? "border-[#0F6E56] bg-[#EAF7F1]"
                  : "border-[#E8EEF0] bg-white hover:border-[#BFE3D3]"
              )}
            >
              <p className="font-semibold text-[#0F172A]">{opt.title}</p>
              <p className="text-sm text-[#64748B] mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
        <ErrorText message={errors.emissionsPath} />
      </InputSection>

      <div className="rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569] space-y-2">
        <p className="font-medium text-[#0F172A]">How the amounts differ</p>
        <ul className="list-disc pl-5 space-y-1 text-[#64748B]">
          <li>
            <span className="text-[#0F172A] font-medium">Loan outstanding</span> — what is still owed on the
            underlying loan inside the pool.
          </li>
          <li>
            <span className="text-[#0F172A] font-medium">Tranche / pool outstanding</span> — published balances for
            that slice of the deal (optional override for pools).
          </li>
          <li>
            <span className="text-[#0F172A] font-medium">Bank investment</span> — your institution’s position in the
            tranche or deal. This is not the loan balance.
          </li>
          <li>
            Soft pool-balance mismatches show as amber warnings and do not block Save or Next.
          </li>
        </ul>
      </div>

      <InputSection
        title="Collateral"
        description="Each asset behind the loans. Use the matching PCAF questionnaire — do not invent a one-size-fits-all value."
      >
        <ErrorText message={errors.collateral} />
        <div className="space-y-3">
          {draft.collateral.map((row, index) => (
            <ExpandCard
              key={row.collateralId}
              title={row.name || `Collateral ${index + 1}`}
              subtitle={`${row.collateralType || "class pending"} · id ${row.collateralId.slice(0, 12)}…`}
              open={Boolean(open[row.collateralId])}
              onToggle={() => toggle(row.collateralId)}
              onRemove={() =>
                onChange(
                  patchSspDraft(draft, {
                    collateral: draft.collateral.filter((c) => c.collateralId !== row.collateralId),
                    loans: draft.loans.map((loan) => ({
                      ...loan,
                      collateralIds: loan.collateralIds.filter((id) => id !== row.collateralId),
                    })),
                  })
                )
              }
            >
              <FieldGrid>
                <FormField label="Name" error={errors[`collateral.${row.collateralId}.name`]}>
                  <Input
                    className={FIELD_INPUT}
                    value={row.name}
                    onChange={(e) => updateCollateral(row.collateralId, { name: e.target.value })}
                    onBlur={() => onTouch(`collateral.${row.collateralId}.name`)}
                  />
                </FormField>
                <FormField label="PCAF collateral class" error={errors[`collateral.${row.collateralId}.collateralType`]}>
                  <select
                    className={FIELD_INPUT}
                    value={row.collateralType}
                    onChange={(e) => {
                      const collateralType = e.target.value as SspCollateralPcafClass;
                      updateCollateral(row.collateralId, {
                        collateralType,
                        denominatorLabel: cafDenominatorHint(collateralType),
                      });
                      onTouch(`collateral.${row.collateralId}.collateralType`);
                    }}
                  >
                    <option value="">Select…</option>
                    {COLLATERAL_CLASS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label="Attribution value"
                  hint={row.denominatorLabel || cafDenominatorHint(row.collateralType)}
                  tooltip="Usually property or vehicle value at origination from the underlying PCAF class. Not the pool or tranche total."
                  error={errors[`collateral.${row.collateralId}.attributionDenominator`]}
                >
                  <MoneyInput
                    value={row.attributionDenominator}
                    onChange={(attributionDenominator) =>
                      updateCollateral(row.collateralId, { attributionDenominator })
                    }
                    onBlur={() => onTouch(`collateral.${row.collateralId}.attributionDenominator`)}
                  />
                </FormField>
                <FormField label="Collateral current outstanding (if known)">
                  <MoneyInput
                    value={row.currentOutstandingAmount}
                    onChange={(currentOutstandingAmount) =>
                      updateCollateral(row.collateralId, { currentOutstandingAmount })
                    }
                  />
                </FormField>
                <FormField label="Asset value at origination">
                  <MoneyInput
                    value={row.assetValueAtOrigination}
                    onChange={(assetValueAtOrigination) =>
                      updateCollateral(row.collateralId, { assetValueAtOrigination })
                    }
                  />
                </FormField>
                <FormField label="Evidence / source">
                  <Input
                    className={FIELD_INPUT}
                    value={row.evidence.source}
                    onChange={(e) =>
                      updateCollateral(row.collateralId, {
                        evidence: { ...row.evidence, source: e.target.value },
                      })
                    }
                  />
                </FormField>
                {row.pcafMethodOption ? (
                  <FormField label="Selected PCAF formula" hint="Set by the underlying questionnaire">
                    <Input className={FIELD_INPUT} value={row.pcafMethodOption} readOnly />
                  </FormField>
                ) : null}
                {row.dataQualityScore != null ? (
                  <FormField label="Data-quality score (from method)">
                    <Input className={FIELD_INPUT} value={String(row.dataQualityScore)} readOnly />
                  </FormField>
                ) : null}
              </FieldGrid>
              {draft.emissionsPath === "lookthrough" || draft.emissionsPath === "" ? (
                <Suspense
                  fallback={
                    <p className="text-sm text-[#64748B]">Loading underlying questionnaire…</p>
                  }
                >
                  <SspUnderlyingClassFields
                    collateral={row}
                    onChange={(patch) => updateCollateral(row.collateralId, patch)}
                    onTouch={onTouch}
                  />
                </Suspense>
              ) : (
                <p className="text-sm text-[#64748B]">
                  Reported-pool path uses pool-level emissions. Underlying asset questionnaires are available when
                  look-through is selected.
                </p>
              )}
            </ExpandCard>
          ))}
        </div>
        <Button type="button" variant="outline" className="mt-2" onClick={addDefaultCollateral}>
          <Plus className="h-4 w-4 mr-2" />
          Add collateral
        </Button>
      </InputSection>

      <InputSection title="Underlying loans" description="Each loan keeps its own id. Multiple collateral items may attach to one loan.">
        <ErrorText message={errors.loans} />
        <div className="space-y-3">
          {draft.loans.map((loan, index) => (
            <ExpandCard
              key={loan.loanId}
              title={loan.name || `Loan ${index + 1}`}
              subtitle={`COA ${loan.currentOutstandingAmount ?? "—"} · id ${loan.loanId.slice(0, 12)}…`}
              open={Boolean(open[loan.loanId])}
              onToggle={() => toggle(loan.loanId)}
              onRemove={() =>
                onChange(
                  patchSspDraft(draft, {
                    loans: draft.loans.filter((row) => row.loanId !== loan.loanId),
                    pools: draft.pools.map((pool) => ({
                      ...pool,
                      loanIds: pool.loanIds.filter((id) => id !== loan.loanId),
                    })),
                  })
                )
              }
            >
              <FieldGrid>
                <FormField label="Loan name" error={errors[`loans.${loan.loanId}.name`]}>
                  <Input
                    className={FIELD_INPUT}
                    value={loan.name}
                    onChange={(e) => updateLoan(loan.loanId, { name: e.target.value })}
                    onBlur={() => onTouch(`loans.${loan.loanId}.name`)}
                  />
                </FormField>
                <FormField
                  label="Loan current outstanding"
                  hint="Still owed on this underlying loan — not the pool, tranche, or your bank holding"
                  tooltip="Outstanding on the underlying loan in the pool. Keep this separate from your bank investment."
                  error={errors[`loans.${loan.loanId}.currentOutstandingAmount`]}
                >
                  <MoneyInput
                    value={loan.currentOutstandingAmount}
                    onChange={(currentOutstandingAmount) => updateLoan(loan.loanId, { currentOutstandingAmount })}
                    onBlur={() => onTouch(`loans.${loan.loanId}.currentOutstandingAmount`)}
                  />
                </FormField>
                <FormField label="Original outstanding (optional)">
                  <MoneyInput
                    value={loan.originalOutstandingAmount}
                    onChange={(originalOutstandingAmount) => updateLoan(loan.loanId, { originalOutstandingAmount })}
                  />
                </FormField>
              </FieldGrid>
              <FormField label="Linked collateral" error={errors[`loans.${loan.loanId}.collateralIds`]}>
                <MultiSelectChips
                  options={draft.collateral.map((c, i) => ({
                    id: c.collateralId,
                    label: c.name || `Collateral ${i + 1}`,
                  }))}
                  selected={loan.collateralIds}
                  onChange={(collateralIds) => {
                    updateLoan(loan.loanId, { collateralIds });
                    onTouch(`loans.${loan.loanId}.collateralIds`);
                  }}
                />
              </FormField>
            </ExpandCard>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={() => {
            const loan = createLoan({ name: `Loan ${draft.loans.length + 1}` });
            onChange(patchSspDraft(draft, { loans: [...draft.loans, loan] }));
            setOpen((prev) => ({ ...prev, [loan.loanId]: true }));
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add loan
        </Button>
      </InputSection>

      <InputSection title="Collateral pools" description="One deal may contain multiple pools. Pool COA is not auto-balanced to loan totals.">
        <ErrorText message={errors.pools} />
        <div className="space-y-3">
          {draft.pools.map((pool, index) => {
            const summed = sumLoanCoaInPool(draft, pool);
            return (
              <ExpandCard
                key={pool.poolId}
                title={pool.name || `Pool ${index + 1}`}
                subtitle={`Linked loans ${pool.loanIds.length} · sum COA ${summed ?? "—"}`}
                open={Boolean(open[pool.poolId])}
                onToggle={() => toggle(pool.poolId)}
                onRemove={() =>
                  onChange(
                    patchSspDraft(draft, {
                      pools: draft.pools.filter((row) => row.poolId !== pool.poolId),
                      poolOfPools: draft.poolOfPools
                        ? {
                            ...draft.poolOfPools,
                            poolIds: draft.poolOfPools.poolIds.filter((id) => id !== pool.poolId),
                          }
                        : null,
                      tranches: draft.tranches.map((tr) => ({
                        ...tr,
                        linkedPoolIds: tr.linkedPoolIds.filter((id) => id !== pool.poolId),
                      })),
                    })
                  )
                }
              >
                <FieldGrid>
                  <FormField label="Pool name" error={errors[`pools.${pool.poolId}.name`]}>
                    <Input
                      className={FIELD_INPUT}
                      value={pool.name}
                      onChange={(e) => updatePool(pool.poolId, { name: e.target.value })}
                    />
                  </FormField>
                  <FormField
                    label="Entered pool COA (optional override)"
                    hint={summed != null ? `Sum of linked loan COAs: ${summed}` : "Add loan COAs first"}
                    error={errors[`pools.${pool.poolId}.poolCurrentOutstandingAmount`]}
                  >
                    <MoneyInput
                      value={pool.poolCurrentOutstandingAmount}
                      onChange={(poolCurrentOutstandingAmount) =>
                        updatePool(pool.poolId, { poolCurrentOutstandingAmount })
                      }
                      onBlur={() => onTouch(`pools.${pool.poolId}.poolCurrentOutstandingAmount`)}
                    />
                  </FormField>
                </FieldGrid>
                <FormField label="Loans in this pool" error={errors[`pools.${pool.poolId}.loanIds`]}>
                  <MultiSelectChips
                    options={draft.loans.map((loan, i) => ({
                      id: loan.loanId,
                      label: loan.name || `Loan ${i + 1}`,
                    }))}
                    selected={pool.loanIds}
                    onChange={(loanIds) => updatePool(pool.poolId, { loanIds })}
                  />
                </FormField>
                {draft.emissionsPath === "reported_pool" ? (
                  <FieldGrid>
                    <FormField
                      label="Reported pool emissions (tCO₂e)"
                      error={errors[`pools.${pool.poolId}.reportedEmissionsTotal`]}
                    >
                      <MoneyInput
                        value={pool.reportedEmissionsTotal}
                        onChange={(reportedEmissionsTotal) => updatePool(pool.poolId, { reportedEmissionsTotal })}
                      />
                    </FormField>
                    <FormField label="Reporting period" error={errors[`pools.${pool.poolId}.reportedEmissionsPeriod`]}>
                      <Input
                        className={FIELD_INPUT}
                        value={pool.reportedEmissionsPeriod}
                        placeholder="e.g. 2024"
                        onChange={(e) => updatePool(pool.poolId, { reportedEmissionsPeriod: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Scope coverage">
                      <Input
                        className={FIELD_INPUT}
                        value={pool.reportedScopeCoverage}
                        placeholder="e.g. Scope 1+2"
                        onChange={(e) => updatePool(pool.poolId, { reportedScopeCoverage: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Verification">
                      <select
                        className={FIELD_INPUT}
                        value={pool.reportedVerification}
                        onChange={(e) =>
                          updatePool(pool.poolId, {
                            reportedVerification: e.target.value as SspPool["reportedVerification"],
                          })
                        }
                      >
                        <option value="">Select…</option>
                        <option value="verified">Verified</option>
                        <option value="unverified">Unverified</option>
                      </select>
                    </FormField>
                    <FormField label="Source" error={errors[`pools.${pool.poolId}.reportedSource`]}>
                      <Input
                        className={FIELD_INPUT}
                        value={pool.reportedSource}
                        onChange={(e) => updatePool(pool.poolId, { reportedSource: e.target.value })}
                      />
                    </FormField>
                  </FieldGrid>
                ) : null}
              </ExpandCard>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={() => {
            const pool = createPool({ name: `Pool ${draft.pools.length + 1}` });
            onChange(patchSspDraft(draft, { pools: [...draft.pools, pool] }));
            setOpen((prev) => ({ ...prev, [pool.poolId]: true }));
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add pool
        </Button>
      </InputSection>

      {needsPop ? (
        <InputSection title="Pool of pools" description="Optional wrap of multiple pools before tranche attribution.">
          <ErrorText message={errors.poolOfPools} />
          {!draft.poolOfPools ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(patchSspDraft(draft, { poolOfPools: createPoolOfPools() }))}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create pool of pools
            </Button>
          ) : (
            <div className="space-y-3">
              <FieldGrid>
                <FormField label="Name">
                  <Input
                    className={FIELD_INPUT}
                    value={draft.poolOfPools.name}
                    onChange={(e) =>
                      onChange(
                        patchSspDraft(draft, {
                          poolOfPools: { ...draft.poolOfPools!, name: e.target.value },
                        })
                      )
                    }
                  />
                </FormField>
                <FormField label="Pool-of-pools COA">
                  <MoneyInput
                    value={draft.poolOfPools.currentOutstandingAmount}
                    onChange={(currentOutstandingAmount) =>
                      onChange(
                        patchSspDraft(draft, {
                          poolOfPools: { ...draft.poolOfPools!, currentOutstandingAmount },
                        })
                      )
                    }
                  />
                </FormField>
              </FieldGrid>
              <FormField label="Member pools">
                <MultiSelectChips
                  options={draft.pools.map((pool, i) => ({
                    id: pool.poolId,
                    label: pool.name || `Pool ${i + 1}`,
                  }))}
                  selected={draft.poolOfPools.poolIds}
                  onChange={(poolIds) =>
                    onChange(
                      patchSspDraft(draft, {
                        poolOfPools: { ...draft.poolOfPools!, poolIds },
                      })
                    )
                  }
                />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                className="text-red-600"
                onClick={() => onChange(patchSspDraft(draft, { poolOfPools: null }))}
              >
                Remove pool of pools
              </Button>
            </div>
          )}
        </InputSection>
      ) : null}

      {needsTranches ? (
        <InputSection title="Tranches" description="Optional for untranched deals. Seniority does not change the attribution formula.">
          <ErrorText message={errors.tranches} />
          <div className="space-y-3">
            {draft.tranches.map((tranche, index) => (
              <ExpandCard
                key={tranche.trancheId}
                title={tranche.name || `Tranche ${index + 1}`}
                subtitle={`${tranche.seniorityLabel || "seniority n/a"} · COA ${tranche.currentOutstandingAmount ?? "—"}`}
                open={Boolean(open[tranche.trancheId])}
                onToggle={() => toggle(tranche.trancheId)}
                onRemove={() =>
                  onChange(
                    patchSspDraft(draft, {
                      tranches: draft.tranches.filter((row) => row.trancheId !== tranche.trancheId),
                      holdings: draft.holdings.filter((h) => h.trancheId !== tranche.trancheId),
                    })
                  )
                }
              >
                <FieldGrid>
                  <FormField label="Tranche name" error={errors[`tranches.${tranche.trancheId}.name`]}>
                    <Input
                      className={FIELD_INPUT}
                      value={tranche.name}
                      onChange={(e) => updateTranche(tranche.trancheId, { name: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Seniority label">
                    <Input
                      className={FIELD_INPUT}
                      value={tranche.seniorityLabel}
                      placeholder="e.g. Senior A"
                      onChange={(e) => updateTranche(tranche.trancheId, { seniorityLabel: e.target.value })}
                    />
                  </FormField>
                  <FormField
                    label="Tranche COA"
                    error={errors[`tranches.${tranche.trancheId}.currentOutstandingAmount`]}
                  >
                    <MoneyInput
                      value={tranche.currentOutstandingAmount}
                      onChange={(currentOutstandingAmount) =>
                        updateTranche(tranche.trancheId, { currentOutstandingAmount })
                      }
                    />
                  </FormField>
                </FieldGrid>
                {draft.deal.poolsLinkedToSpecificTranches === "yes" ? (
                  <FormField
                    label="Pools linked to this tranche"
                    error={errors[`tranches.${tranche.trancheId}.linkedPoolIds`]}
                  >
                    <MultiSelectChips
                      options={draft.pools.map((pool, i) => ({
                        id: pool.poolId,
                        label: pool.name || `Pool ${i + 1}`,
                      }))}
                      selected={tranche.linkedPoolIds}
                      onChange={(linkedPoolIds) => updateTranche(tranche.trancheId, { linkedPoolIds })}
                    />
                  </FormField>
                ) : null}
              </ExpandCard>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => {
              const tranche = createTranche({ name: `Tranche ${draft.tranches.length + 1}` });
              onChange(patchSspDraft(draft, { tranches: [...draft.tranches, tranche] }));
              setOpen((prev) => ({ ...prev, [tranche.trancheId]: true }));
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add tranche
          </Button>
        </InputSection>
      ) : null}

      <InputSection
        title="Bank holdings"
        description="Your outstanding investment in each tranche (or the deal if untranched). Multiple holdings in the same deal are allowed."
      >
        <ErrorText message={errors.holdings} />
        <div className="space-y-3">
          {draft.holdings.map((holding, index) => (
            <ExpandCard
              key={holding.holdingId}
              title={holding.name || `Holding ${index + 1}`}
              subtitle={`Investment ${holding.bankOutstandingInvestment ?? "—"} ${holding.currency}`}
              open={Boolean(open[holding.holdingId] ?? true)}
              onToggle={() => toggle(holding.holdingId)}
              onRemove={() =>
                onChange(
                  patchSspDraft(draft, {
                    holdings: draft.holdings.filter((row) => row.holdingId !== holding.holdingId),
                  })
                )
              }
            >
              <FieldGrid>
                <FormField label="Holding label">
                  <Input
                    className={FIELD_INPUT}
                    value={holding.name}
                    onChange={(e) => updateHolding(holding.holdingId, { name: e.target.value })}
                  />
                </FormField>
                {needsTranches ? (
                  <FormField label="Tranche" error={errors[`holdings.${holding.holdingId}.trancheId`]}>
                    <select
                      className={FIELD_INPUT}
                      value={holding.trancheId}
                      onChange={(e) => updateHolding(holding.holdingId, { trancheId: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {draft.tranches.map((tr, i) => (
                        <option key={tr.trancheId} value={tr.trancheId}>
                          {tr.name || `Tranche ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </FormField>
                ) : null}
                <FormField
                  label="Your bank’s outstanding investment"
                  hint="Your institution’s position — distinct from loan and tranche outstanding"
                  tooltip="How much your bank currently holds in this tranche or deal. Do not copy the underlying loan balance here."
                  error={errors[`holdings.${holding.holdingId}.bankOutstandingInvestment`]}
                >
                  <MoneyInput
                    value={holding.bankOutstandingInvestment}
                    onChange={(bankOutstandingInvestment) =>
                      updateHolding(holding.holdingId, { bankOutstandingInvestment })
                    }
                    onBlur={() => onTouch(`holdings.${holding.holdingId}.bankOutstandingInvestment`)}
                  />
                </FormField>
                <FormField label="Currency">
                  <Input
                    className={FIELD_INPUT}
                    value={holding.currency}
                    onChange={(e) => updateHolding(holding.holdingId, { currency: e.target.value })}
                  />
                </FormField>
              </FieldGrid>
            </ExpandCard>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-2"
          onClick={() => {
            const holding = createHolding({
              name: `Holding ${draft.holdings.length + 1}`,
              currency: draft.deal.currency || "PKR",
              trancheId: needsTranches ? draft.tranches[0]?.trancheId || "" : "",
            });
            onChange(patchSspDraft(draft, { holdings: [...draft.holdings, holding] }));
            setOpen((prev) => ({ ...prev, [holding.holdingId]: true }));
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add holding
        </Button>
      </InputSection>

      <div className="rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]">
        <p className="font-medium text-[#0F172A] mb-1">Structure tree</p>
        <p>
          Deal “{draft.deal.dealName || "…"}” → {draft.holdings.length} holding(s)
          {needsTranches ? ` → ${draft.tranches.length} tranche(s)` : " (untranched)"}
          {needsPop ? " → pool of pools" : ""} → {draft.pools.length} pool(s) → {draft.loans.length} loan(s) →{" "}
          {draft.collateral.length} collateral
        </p>
      </div>
    </div>
  );
}

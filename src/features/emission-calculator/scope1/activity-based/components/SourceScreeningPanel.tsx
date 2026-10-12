import { Check, CircleDashed, Flame, Car, Snowflake, Factory, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  firstApplicableCategoryId,
  inventoryHasUnresolvedSources,
  isScreeningFullyAnswered,
  isScreeningYes,
} from "../screeningStorage";
import {
  SCOPE1_ACTIVITY_GROUPS,
  type Scope1ActivityGroupId,
  type Scope1ScreeningState,
} from "../types";
import { ActivitySectionShell } from "./ActivitySectionShell";
import { ScreeningExistingDataNotice } from "./ScreeningExistingDataNotice";

type Props = {
  screening: Scope1ScreeningState;
  onChange: (next: Scope1ScreeningState) => void;
  /** Called with the first Yes category id (or null if all No). */
  onContinue?: (nextCategoryId: string | null) => void;
};

const GROUP_ICONS: Record<Scope1ActivityGroupId, typeof Flame> = {
  stationary: Flame,
  vehicles_mobile: Car,
  leaks_releases: Snowflake,
  industrial_other: Factory,
};

export function SourceScreeningPanel({ screening, onChange, onContinue }: Props) {
  const unresolved = inventoryHasUnresolvedSources(screening);
  const complete = isScreeningFullyAnswered(screening);
  const answered = SCOPE1_ACTIVITY_GROUPS.filter(
    (g) => screening[g.id] !== "not_assessed"
  ).length;
  const yesCount = SCOPE1_ACTIVITY_GROUPS.filter((g) =>
    isScreeningYes(screening[g.id])
  ).length;

  return (
    <ActivitySectionShell
      icon={CircleDashed}
      title="What sources apply?"
      subtitle="Answer Yes or No for each group. Forms unlock when you’re done."
      details={
        <p>
          Choose Yes to show that source’s form, or No to hide it. You can enter numbers later —
          answering Yes without data is not the same as zero emissions.
        </p>
      }
    >
      <ScreeningExistingDataNotice
        screening={screening}
        onMarkYes={(groupIds) => {
          const next = { ...screening };
          for (const id of groupIds) {
            if (next[id] !== "calculated") next[id] = "applicable_pending";
          }
          onChange(next);
        }}
      />

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="shrink-0 tabular-nums">
          {answered}/{SCOPE1_ACTIVITY_GROUPS.length}
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1D9E75] transition-all duration-300"
            style={{ width: `${(answered / SCOPE1_ACTIVITY_GROUPS.length) * 100}%` }}
          />
        </div>
        {complete && (
          <span className="shrink-0 text-[#0F6E56] font-medium">
            {yesCount} active
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {SCOPE1_ACTIVITY_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.id];
          const status = screening[group.id];
          const yesSelected = isScreeningYes(status);
          const noSelected = status === "not_applicable";

          return (
            <div
              key={group.id}
              className="rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF7F1] text-[#1D9E75]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="font-medium text-gray-900 text-sm leading-snug">{group.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    {group.screeningQuestion}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={noSelected}
                  onClick={() =>
                    onChange({
                      ...screening,
                      [group.id]: "not_applicable",
                    })
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center transition-all",
                    noSelected
                      ? "border-gray-300 bg-gray-100 text-gray-800"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <X
                    className={cn(
                      "mx-auto h-4 w-4 mb-0.5",
                      noSelected ? "text-gray-700" : "text-gray-400"
                    )}
                  />
                  <span className="block text-sm font-semibold">No</span>
                </button>
                <button
                  type="button"
                  aria-pressed={yesSelected}
                  onClick={() =>
                    onChange({
                      ...screening,
                      [group.id]:
                        status === "calculated" ? "calculated" : "applicable_pending",
                    })
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-center transition-all",
                    yesSelected
                      ? "border-[#1D9E75] bg-[#EAF7F1] text-[#0F6E56]"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Check
                    className={cn(
                      "mx-auto h-4 w-4 mb-0.5",
                      yesSelected ? "text-[#1D9E75]" : "text-gray-400"
                    )}
                  />
                  <span className="block text-sm font-semibold">Yes</span>
                  {status === "calculated" && (
                    <span className="block text-[10px] mt-0.5 text-[#0F6E56]/80">
                      Data entered
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!complete && answered > 0 && (
        <p className="text-xs text-amber-800/90 bg-amber-50/70 border border-amber-100 rounded-xl px-3 py-2">
          Answer all four to unlock forms.
        </p>
      )}

      {complete && unresolved && (
        <p className="text-xs text-gray-500">
          {yesCount} source{yesCount === 1 ? "" : "s"} marked Yes — add data in those forms when
          ready.
        </p>
      )}

      {complete && !unresolved && yesCount === 0 && (
        <p className="text-xs text-gray-500">
          All sources marked No — no Scope 1 forms to fill for this assessment.
        </p>
      )}

      {onContinue && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            className="bg-[#1D9E75] hover:bg-[#22B87E] text-white rounded-xl px-5"
            disabled={!complete}
            onClick={() => onContinue(firstApplicableCategoryId(screening))}
          >
            {complete
              ? yesCount > 0
                ? "Continue to forms"
                : "Done"
              : "Answer all first"}
          </Button>
        </div>
      )}
    </ActivitySectionShell>
  );
}

/** Forms only after screening is fully answered, and only for Yes groups. */
export function isGroupVisible(
  screening: Scope1ScreeningState,
  groupId: Scope1ActivityGroupId
): boolean {
  if (!isScreeningFullyAnswered(screening)) return false;
  return isScreeningYes(screening[groupId]);
}

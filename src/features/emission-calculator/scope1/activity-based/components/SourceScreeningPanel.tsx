import { Check, CircleDashed, Flame, Car, Snowflake, Factory, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
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

type Props = {
  screening: Scope1ScreeningState;
  onChange: (next: Scope1ScreeningState) => void;
  onContinue?: () => void;
};

const GROUP_ICONS: Record<Scope1ActivityGroupId, typeof Flame> = {
  stationary: Flame,
  vehicles_mobile: Car,
  leaks_releases: Snowflake,
  industrial_other: Factory,
};

export function SourceScreeningPanel({ screening, onChange, onContinue }: Props) {
  const unresolved = inventoryHasUnresolvedSources(screening);
  const answered = SCOPE1_ACTIVITY_GROUPS.filter(
    (g) => screening[g.id] !== "not_assessed"
  ).length;

  return (
    <ActivitySectionShell
      icon={CircleDashed}
      title="What sources apply?"
      subtitle="Answer Yes or No for each. Forms appear only after this is done."
      details={
        <p>
          Yes = that source applies (enter data when ready). No = hide it. Until every question is
          answered, calculation forms stay hidden.
        </p>
      }
    >
      <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>
          {answered} of {SCOPE1_ACTIVITY_GROUPS.length} answered
        </span>
        <div className="h-1.5 flex-1 max-w-[140px] rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1D9E75] transition-all"
            style={{ width: `${(answered / SCOPE1_ACTIVITY_GROUPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {SCOPE1_ACTIVITY_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.id];
          const status = screening[group.id];
          const yesSelected = isScreeningYes(status);
          const noSelected = status === "not_applicable";

          return (
            <div
              key={group.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{group.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                    {group.screeningQuestion}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...screening,
                      [group.id]: "not_applicable",
                    })
                  }
                  className={cn(
                    "rounded-xl border px-3 py-3 text-center transition-all",
                    noSelected
                      ? "border-gray-400 bg-gray-100 text-gray-800"
                      : "border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <X
                    className={cn(
                      "mx-auto h-4 w-4 mb-1",
                      noSelected ? "text-gray-700" : "text-gray-400"
                    )}
                  />
                  <span className="block text-sm font-semibold">No</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...screening,
                      // Keep calculated if already entered; otherwise Yes = fill when ready.
                      [group.id]:
                        status === "calculated" ? "calculated" : "applicable_pending",
                    })
                  }
                  className={cn(
                    "rounded-xl border px-3 py-3 text-center transition-all",
                    yesSelected
                      ? "border-[#1D9E75] bg-[#EAF7F1] text-[#0F6E56]"
                      : "border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Check
                    className={cn(
                      "mx-auto h-4 w-4 mb-1",
                      yesSelected ? "text-[#1D9E75]" : "text-gray-400"
                    )}
                  />
                  <span className="block text-sm font-semibold">Yes</span>
                  {status === "calculated" && (
                    <span className="block text-[10px] mt-0.5 opacity-70">Data entered</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!isScreeningFullyAnswered(screening) && answered > 0 && (
        <p className="text-xs text-amber-800/90 bg-amber-50/80 border border-amber-100 rounded-lg px-3 py-2">
          Answer all four to unlock the matching forms.
        </p>
      )}

      {unresolved && isScreeningFullyAnswered(screening) && (
        <p className="text-xs text-gray-500 px-1">
          You said Yes to some sources — enter data in those forms when ready. Yes without data is
          not zero.
        </p>
      )}

      {onContinue && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            className="bg-[#1D9E75] hover:bg-[#22B87E] text-white rounded-xl px-5"
            disabled={!isScreeningFullyAnswered(screening)}
            onClick={onContinue}
          >
            {isScreeningFullyAnswered(screening) ? "Continue to forms" : "Answer all first"}
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

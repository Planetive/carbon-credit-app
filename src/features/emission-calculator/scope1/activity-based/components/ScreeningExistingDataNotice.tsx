import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadEpaIpccResults } from "@/lib/epaIpccResults";
import type { GroupedScope1Total } from "../legacyMapping";
import { ACTIVITY_GROUP_LABELS } from "../legacyMapping";
import type { Scope1ScreeningState } from "../types";
import { isScreeningYes } from "../screeningStorage";

type Props = {
  screening: Scope1ScreeningState;
  onMarkYes?: (groupIds: Array<keyof Scope1ScreeningState>) => void;
};

/**
 * If the user already has Scope 1 inventory but screening is No / unanswered,
 * surface that so they don't think data vanished.
 */
export function ScreeningExistingDataNotice({ screening, onMarkYes }: Props) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupedScope1Total[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    loadEpaIpccResults(user.id).then((data) => {
      if (cancelled) return;
      setGroups(data.scope1ByActivity.filter((g) => g.valueKg > 0));
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const hiddenWithData = groups.filter((g) => !isScreeningYes(screening[g.groupId]));
  if (hiddenWithData.length === 0) return null;

  const totalKg = hiddenWithData.reduce((s, g) => s + g.valueKg, 0);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 space-y-2">
      <p className="text-sm font-medium text-amber-950">
        You already have saved Scope 1 data
      </p>
      <p className="text-xs text-amber-900/90 leading-relaxed">
        About{" "}
        <span className="font-semibold tabular-nums">
          {totalKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg CO₂e
        </span>{" "}
        is still in your inventory from earlier entries. Mark those sources{" "}
        <span className="font-semibold">Yes</span> to open the forms — nothing was deleted.
      </p>
      <ul className="text-xs text-amber-900/90 space-y-1">
        {hiddenWithData.map((g) => (
          <li key={g.groupId} className="flex justify-between gap-2">
            <span>{ACTIVITY_GROUP_LABELS[g.groupId]}</span>
            <span className="tabular-nums font-medium">
              {g.valueKg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
            </span>
          </li>
        ))}
      </ul>
      {onMarkYes && (
        <button
          type="button"
          className="text-xs font-semibold text-[#0F6E56] hover:text-[#1D9E75] underline-offset-2 hover:underline"
          onClick={() => onMarkYes(hiddenWithData.map((g) => g.groupId))}
        >
          Mark these as Yes
        </button>
      )}
    </div>
  );
}

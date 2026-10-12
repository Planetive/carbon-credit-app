import {
  DEFAULT_SCOPE1_SCREENING,
  type Scope1ActivityGroupId,
  type Scope1ScreeningState,
  type SourceApplicability,
} from "./types";
import {
  loadScope1ActivityScreeningFromDb,
  mergeScreeningStates,
  saveScope1ActivityScreeningToDb,
} from "@/integrations/supabase/scope1ActivityScreeningClient";

const storageKey = (userId: string) => `rc_scope1_screening_v1:${userId}`;

export function loadScope1Screening(userId: string): Scope1ScreeningState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_SCOPE1_SCREENING };
    const parsed = JSON.parse(raw) as Partial<Scope1ScreeningState>;
    return { ...DEFAULT_SCOPE1_SCREENING, ...parsed };
  } catch {
    return { ...DEFAULT_SCOPE1_SCREENING };
  }
}

export function saveScope1Screening(userId: string, state: Scope1ScreeningState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

/**
 * Load screening: local cache first for instant UI, then merge with DB
 * so answers survive browser clears / new devices once migration is applied.
 */
export async function loadScope1ScreeningResolved(
  userId: string,
  counterpartyId?: string | null
): Promise<Scope1ScreeningState> {
  const local = loadScope1Screening(userId);
  try {
    const remote = await loadScope1ActivityScreeningFromDb(userId, counterpartyId);
    if (!remote) return local;
    const merged = mergeScreeningStates(local, remote);
    saveScope1Screening(userId, merged);
    return merged;
  } catch (e) {
    console.warn("Scope 1 screening DB load failed; using local cache:", e);
    return local;
  }
}

/** Write-through: localStorage immediately, DB in background. */
export function saveScope1ScreeningResolved(
  userId: string,
  state: Scope1ScreeningState,
  counterpartyId?: string | null
): void {
  saveScope1Screening(userId, state);
  void saveScope1ActivityScreeningToDb(userId, state, counterpartyId).catch((e) => {
    console.warn("Scope 1 screening DB save failed:", e);
  });
}

export function setGroupApplicability(
  state: Scope1ScreeningState,
  groupId: Scope1ActivityGroupId,
  value: SourceApplicability
): Scope1ScreeningState {
  return { ...state, [groupId]: value };
}

/** Every group has a Yes or No (nothing left unanswered). */
export function isScreeningFullyAnswered(state: Scope1ScreeningState): boolean {
  return (Object.values(state) as SourceApplicability[]).every((v) => v !== "not_assessed");
}

export function inventoryHasUnresolvedSources(state: Scope1ScreeningState): boolean {
  // Unanswered, or Yes without data yet — not the same as zero.
  return (Object.values(state) as SourceApplicability[]).some(
    (v) => v === "not_assessed" || v === "applicable_pending"
  );
}

/** First Yes group’s calculator nav id, or null if none apply. */
export function firstApplicableCategoryId(
  state: Scope1ScreeningState
): string | null {
  const map: Record<Scope1ActivityGroupId, string> = {
    stationary: "stationaryCombustion",
    vehicles_mobile: "vehiclesMobile",
    leaks_releases: "leaksReleases",
    industrial_other: "industrialOther",
  };
  for (const id of Object.keys(map) as Scope1ActivityGroupId[]) {
    if (isScreeningYes(state[id])) return map[id];
  }
  return null;
}

/** UI treats both pending and calculated as “Yes”. */
export function isScreeningYes(status: SourceApplicability): boolean {
  return status === "applicable_pending" || status === "calculated";
}

export function markGroupCalculated(
  state: Scope1ScreeningState,
  groupId: Scope1ActivityGroupId
): Scope1ScreeningState {
  if (state[groupId] === "not_applicable") return state;
  if (state[groupId] === "calculated") return state;
  return { ...state, [groupId]: "calculated" };
}

export const APPLICABILITY_LABELS: Record<SourceApplicability, string> = {
  not_assessed: "Not answered",
  not_applicable: "No",
  applicable_pending: "Yes",
  calculated: "Yes (entered)",
};

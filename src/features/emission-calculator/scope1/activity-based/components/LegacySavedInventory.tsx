import { useCallback, useEffect, useState } from "react";
import { Archive, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { loadEpaIpccResults } from "@/lib/epaIpccResults";
import {
  getEpaIpccDetailTableName,
  loadLegacyCategoryDetailRows,
} from "@/integrations/supabase/ghgEntryAggregates";
import { deleteLegacyTableEntry } from "@/integrations/supabase/ghgEntryClient";
import type { GroupedScope1Total } from "../legacyMapping";
import type { Scope1ActivityGroupId } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  groupId: Scope1ActivityGroupId;
  editableNote?: string;
  /** Fired after a successful delete so parent forms can refresh. */
  onChanged?: () => void;
};

type EntryRow = {
  id: string;
  label: string;
  kg: number;
  raw: Record<string, unknown>;
};

type CategoryBlock = {
  key: string;
  label: string;
  totalKg: number;
  table: string;
  rows: EntryRow[];
  open: boolean;
};

const RESULT_KEYS = new Set(["flaring", "venting", "vehicular", "kitchen", "power", "heating"]);

function formatKg(kg: number): string {
  return kg.toLocaleString(undefined, {
    maximumFractionDigits: kg >= 1000 ? 0 : 2,
  });
}

function rowKg(key: string, row: Record<string, unknown>): number {
  if (RESULT_KEYS.has(key)) {
    const result = row.result;
    if (result && typeof result === "object") {
      const r = result as Record<string, unknown>;
      if (r.totalCO2e_kg != null) return Number(r.totalCO2e_kg) || 0;
      const fallback = Object.keys(r).find((k) => /co2e/i.test(k) && /kg/i.test(k));
      if (fallback) return Number(r[fallback]) || 0;
    }
  }
  return Number(row.emissions) || 0;
}

function rowLabel(key: string, row: Record<string, unknown>, index: number): string {
  const candidates = [
    row.fuel_type,
    row.vehicle_type,
    row.refrigerant_type,
    row.equipment_type,
    row.description,
    row.source,
    row.activity,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return `Entry ${index + 1}`;
}

function preserveOpenState(
  next: CategoryBlock[],
  prev: CategoryBlock[]
): CategoryBlock[] {
  const openByKey = new Map(prev.map((b) => [b.key, b.open]));
  return next.map((b) => ({
    ...b,
    open: openByKey.has(b.key) ? Boolean(openByKey.get(b.key)) : b.open,
  }));
}

/**
 * Lists saved Scope 1 rows for this activity group and allows deleting them.
 * Historical data was never removed from the DB — only the old tabs were merged.
 */
export function LegacySavedInventory({ groupId, editableNote, onChanged }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<GroupedScope1Total | null>(null);
  const [blocks, setBlocks] = useState<CategoryBlock[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reload = useCallback(
    async (opts?: { quiet?: boolean }) => {
      if (!user?.id) {
        setInitialLoading(false);
        setGroup(null);
        setBlocks([]);
        return;
      }
      // Only show the full skeleton on first load — never flash away the list on delete.
      if (!opts?.quiet) setInitialLoading(true);
      try {
        const data = await loadEpaIpccResults(user.id);
        const hit = data.scope1ByActivity.find((g) => g.groupId === groupId) || null;
        setGroup(hit);

        const parts = (hit?.legacyParts || []).filter((p) => (p.value || 0) > 0);
        const loaded: CategoryBlock[] = [];
        for (const part of parts) {
          const table = getEpaIpccDetailTableName(part.key);
          if (!table) continue;
          const rows = await loadLegacyCategoryDetailRows(part.key, user.id, {
            variant: "epa_ipcc",
          });
          const mapped = rows
            .map((row, index) => {
              const id = String(row.id ?? row.legacy_id ?? "");
              if (!id) return null;
              return {
                id,
                label: rowLabel(part.key, row, index),
                kg: rowKg(part.key, row),
                raw: row,
              };
            })
            .filter(Boolean) as EntryRow[];

          if (mapped.length === 0 && part.value <= 0) continue;

          loaded.push({
            key: part.key,
            label: part.label,
            totalKg: part.value,
            table,
            rows: mapped,
            open: mapped.length > 0 && mapped.length <= 12,
          });
        }
        setBlocks((prev) => preserveOpenState(loaded, prev));
      } catch {
        if (!opts?.quiet) {
          setGroup(null);
          setBlocks([]);
        }
      } finally {
        setInitialLoading(false);
      }
    },
    [user?.id, groupId]
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleDelete = async (block: CategoryBlock, entry: EntryRow) => {
    setDeletingId(entry.id);
    setConfirmId(null);

    // Optimistic update — keep the panel visible; only remove this row.
    setBlocks((prev) =>
      prev
        .map((b) => {
          if (b.key !== block.key) return b;
          const rows = b.rows.filter((r) => r.id !== entry.id);
          const totalKg = Math.max(0, b.totalKg - entry.kg);
          return { ...b, rows, totalKg };
        })
        .filter((b) => b.rows.length > 0 || b.totalKg > 0)
    );
    setGroup((prev) =>
      prev
        ? {
            ...prev,
            valueKg: Math.max(0, prev.valueKg - entry.kg),
            legacyParts: prev.legacyParts.map((p) =>
              p.key === block.key
                ? { ...p, value: Math.max(0, (p.value || 0) - entry.kg) }
                : p
            ),
          }
        : prev
    );

    try {
      await deleteLegacyTableEntry(block.table, entry.id);
      toast({
        title: "Entry deleted",
        description: `${entry.label} removed from ${block.label}.`,
      });
      // Quiet sync — no skeleton flash.
      await reload({ quiet: true });
      onChanged?.();
    } catch (e: unknown) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Could not delete this entry",
        variant: "destructive",
      });
      // Restore accurate list after failed delete.
      await reload({ quiet: true });
    } finally {
      setDeletingId(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3 text-xs text-gray-400">
        Checking saved entries…
      </div>
    );
  }

  if (!group || blocks.length === 0) return null;

  const totalKg = blocks.reduce((s, b) => s + b.totalKg, 0);

  return (
    <div className="rounded-xl border border-[#BFE3D3]/80 bg-[#EAF7F1]/35 px-4 py-3.5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Archive className="h-4 w-4 text-[#1D9E75] mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F6E56]">Already in your inventory</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Open a source to review or delete saved rows. Deleting removes them from your
              Scope 1 total.
            </p>
          </div>
        </div>
        <p className="text-sm font-semibold tabular-nums text-gray-900 shrink-0">
          {formatKg(totalKg)}{" "}
          <span className="text-xs font-medium text-gray-500">kg CO₂e</span>
        </p>
      </div>

      <div className="space-y-2">
        {blocks.map((block) => (
          <div
            key={block.key}
            className="rounded-lg border border-[#BFE3D3]/60 bg-white/80 overflow-hidden"
          >
            <button
              type="button"
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
              onClick={() =>
                setBlocks((prev) =>
                  prev.map((b) => (b.key === block.key ? { ...b, open: !b.open } : b))
                )
              }
            >
              <span className="text-xs font-medium text-gray-800 truncate">{block.label}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs tabular-nums font-semibold text-gray-900">
                  {formatKg(block.totalKg)} kg
                </span>
                <span className="text-[10px] text-gray-400">{block.rows.length}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-gray-400 transition-transform",
                    block.open && "rotate-180"
                  )}
                />
              </span>
            </button>

            {block.open && (
              <ul className="border-t border-gray-100 divide-y divide-gray-50">
                {block.rows.length === 0 ? (
                  <li className="px-3 py-2 text-[11px] text-gray-400">
                    No editable row ids found for this source.
                  </li>
                ) : (
                  block.rows.map((entry) => {
                    const confirming = confirmId === `${block.key}:${entry.id}`;
                    const busy = deletingId === entry.id;
                    return (
                      <li
                        key={entry.id}
                        className={cn(
                          "px-3 py-2 flex items-center justify-between gap-2 transition-opacity",
                          busy && "opacity-50"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-xs text-gray-800 truncate">{entry.label}</p>
                          <p className="text-[11px] tabular-nums text-gray-500">
                            {formatKg(entry.kg)} kg CO₂e
                          </p>
                        </div>
                        {confirming ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="h-7 text-[11px] px-2"
                              disabled={busy}
                              onClick={() => void handleDelete(block, entry)}
                            >
                              {busy ? "…" : "Confirm"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] px-2"
                              disabled={busy}
                              onClick={() => setConfirmId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            aria-label={`Delete ${entry.label}`}
                            disabled={busy || deletingId != null}
                            onClick={() => setConfirmId(`${block.key}:${entry.id}`)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        ))}
      </div>

      {group.provenanceNotes.length > 0 && (
        <p className="text-[11px] text-amber-900/80">{group.provenanceNotes.join(" ")}</p>
      )}
      {editableNote && <p className="text-[11px] text-gray-500">{editableNote}</p>}
    </div>
  );
}

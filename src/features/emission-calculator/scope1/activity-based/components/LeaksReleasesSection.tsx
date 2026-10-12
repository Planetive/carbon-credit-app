import { useEffect, useState } from "react";
import { Snowflake } from "lucide-react";
import EpaRefrigerantEmissions from "@/features/emission-calculator/scope1/components/EpaRefrigerantEmissions";
import { loadGovernedRefrigerantGwp } from "../calc/refrigerantGwpLoader";
import {
  ActivitySectionShell,
  PendingSourcesNote,
} from "./ActivitySectionShell";
import { LegacySavedInventory } from "./LegacySavedInventory";

type Props = {
  onDataChange: (rows: Array<{ emissions?: number }>) => void;
  onSaveAndNext?: () => void;
  onInventoryChanged?: () => void;
};

/**
 * Leaks and gas releases: refrigerant workflow retained.
 * Technical GWP provenance is on the section Info hover.
 */
export function LeaksReleasesSection({
  onDataChange,
  onSaveAndNext,
  onInventoryChanged,
}: Props) {
  const [gwpNote, setGwpNote] = useState(
    "Warming factors come from the EPA refrigerant reference."
  );
  const [gwpWarning, setGwpWarning] = useState(false);
  const [refrigRefreshKey, setRefrigRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadGovernedRefrigerantGwp().then((src) => {
      if (cancelled) return;
      if (src.loadedFromDb) {
        setGwpNote(
          "Warming factors (GWP) come from the EPA refrigerant reference and are saved with each entry so past results stay stable."
        );
        setGwpWarning(false);
      } else {
        setGwpNote(
          "We couldn’t load the live EPA refrigerant table, so built-in EPA factors are used instead. Double-check values before formal reporting."
        );
        setGwpWarning(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ActivitySectionShell
      icon={Snowflake}
      title="Leaks and Gas Releases"
      subtitle="Cooling equipment and other gas-containing systems."
      details={
        <div className="space-y-1.5">
          <p>
            You can enter a measured leak amount or estimate leakage from charge and rate —
            the form keeps those methods separate.
          </p>
          <p className={gwpWarning ? "text-amber-900" : undefined}>{gwpNote}</p>
        </div>
      }
    >
      <LegacySavedInventory
        groupId="leaks_releases"
        editableNote="Open a source to review or delete saved rows. The form below updates after you delete."
        onChanged={() => {
          setRefrigRefreshKey((k) => k + 1);
          onInventoryChanged?.();
        }}
      />

      <EpaRefrigerantEmissions
        key={refrigRefreshKey}
        onDataChange={onDataChange}
        onSaveAndNext={onSaveAndNext}
      />

      <PendingSourcesNote
        title="Not covered here yet"
        items={[
          "Fire-suppression gases (for example SF₆ or specialty blends)",
          "Other industrial fluorinated gases beyond cooling leaks",
        ]}
      />
    </ActivitySectionShell>
  );
}

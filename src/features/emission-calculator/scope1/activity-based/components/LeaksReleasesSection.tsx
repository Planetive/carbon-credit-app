import { useEffect, useState } from "react";
import { Snowflake } from "lucide-react";
import EpaRefrigerantEmissions from "@/features/emission-calculator/scope1/components/EpaRefrigerantEmissions";
import { loadGovernedRefrigerantGwp } from "../calc/refrigerantGwpLoader";
import {
  ActivitySectionShell,
  PendingSourcesNote,
} from "./ActivitySectionShell";

type Props = {
  onDataChange: (rows: Array<{ emissions?: number }>) => void;
  onSaveAndNext?: () => void;
};

/**
 * Leaks and gas releases: refrigerant workflow retained.
 * Technical GWP provenance is collapsed under "More about this section".
 */
export function LeaksReleasesSection({ onDataChange, onSaveAndNext }: Props) {
  const [gwpDetails, setGwpDetails] = useState<string>(
    "Loading GWP reference…"
  );
  const [gwpWarning, setGwpWarning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGovernedRefrigerantGwp().then((src) => {
      if (cancelled) return;
      if (src.loadedFromDb) {
        setGwpDetails(
          `GWP source: ${src.sourceName}. Basis: ${src.gwpBasis}. Values are snapshotted on each saved row.`
        );
        setGwpWarning(false);
      } else {
        setGwpDetails(src.warning || `Using ${src.sourceName} with disclosure.`);
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
        <div className="space-y-1">
          <p>Measured vs estimated leakage stay distinct in the form.</p>
          <p className={gwpWarning ? "text-amber-900" : undefined}>{gwpDetails}</p>
        </div>
      }
    >
      <EpaRefrigerantEmissions onDataChange={onDataChange} onSaveAndNext={onSaveAndNext} />

      <PendingSourcesNote
        items={[
          "Fire-suppression agents (e.g. SF₆, specialized blends)",
          "Industrial process F-gases beyond refrigerant leakage",
        ]}
      />
    </ActivitySectionShell>
  );
}

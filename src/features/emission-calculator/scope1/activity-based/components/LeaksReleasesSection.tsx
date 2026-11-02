import { Snowflake } from "lucide-react";
import EpaRefrigerantEmissions from "@/features/emission-calculator/scope1/components/EpaRefrigerantEmissions";
import { ActivitySectionShell, PendingSourcesNote } from "./ActivitySectionShell";
import { LegacySavedInventory } from "./LegacySavedInventory";

type Props = {
  onDataChange: (rows: Array<{ emissions?: number }>) => void;
  onSaveAndNext?: () => void;
  onInventoryChanged?: () => void;
  counterpartyId?: string;
  reportingYear?: number;
};

/**
 * Leaks and gas releases: verified refrigerant leakage is calculated on the server.
 */
export function LeaksReleasesSection({
  onDataChange,
  onSaveAndNext,
  onInventoryChanged,
  counterpartyId,
  reportingYear,
}: Props) {
  return (
    <ActivitySectionShell
      icon={Snowflake}
      title="Leaks and Gas Releases"
      subtitle="Cooling equipment and other gas-containing systems."
      details={
        <div className="space-y-1.5">
          <p>
            Measured leaks use the kilograms you enter. Estimated leaks use the equipment charge and a
            leakage rate you type. That rate is your assumption, not an EPA default.
          </p>
          <p>The server applies the warming factor and returns tonnes. A failed calculation is not saved as zero.</p>
        </div>
      }
    >
      <LegacySavedInventory
        groupId="leaks_releases"
        readOnly
        editableNote="Legacy rows stay unchanged."
      />

      <EpaRefrigerantEmissions
        onDataChange={onDataChange}
        onSaveAndNext={onSaveAndNext}
        onInventoryChanged={onInventoryChanged}
        counterpartyId={counterpartyId}
        reportingYear={reportingYear}
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

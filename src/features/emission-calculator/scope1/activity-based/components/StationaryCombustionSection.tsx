import { useState } from "react";
import { ChevronDown, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FuelEmissions from "@/features/emission-calculator/scope1/components/FuelEmissions";
import { buildStationaryActivityMeta } from "../activityMeta";
import { STATIONARY_EQUIPMENT_OPTIONS, type StationaryEquipmentType } from "../types";
import { ActivitySectionShell, FormStep } from "./ActivitySectionShell";
import { LegacySavedInventory } from "./LegacySavedInventory";

type Props = {
  companyContext?: boolean;
  counterpartyId?: string;
  onDataChange: (rows: Array<{ emissions?: number }>) => void;
  onSaveAndNext?: () => void;
  /** After inventory delete — parent should re-read sidebar totals from DB. */
  onInventoryChanged?: () => void;
};

/**
 * Unified stationary combustion: equipment type is a form field; factors come from Fuel EPA only.
 * Purchased heat/steam remains Scope 2.
 */
export function StationaryCombustionSection({
  companyContext,
  counterpartyId,
  onDataChange,
  onSaveAndNext,
  onInventoryChanged,
}: Props) {
  const [equipmentType, setEquipmentType] = useState<StationaryEquipmentType>("boiler");
  const [site, setSite] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [showOptional, setShowOptional] = useState(false);
  const [fuelRefreshKey, setFuelRefreshKey] = useState(0);

  return (
    <ActivitySectionShell
      icon={Flame}
      title="Stationary Combustion"
      subtitle="Fuel burned on site — boilers, generators, heaters, kitchens."
      details={
        <p>
          For fuel burned on site (boilers, generators, heaters, kitchens). Purchased steam or
          heat from a supplier belongs under Scope 2 instead.
        </p>
      }
    >
      <LegacySavedInventory
        groupId="stationary"
        editableNote="Open a source to review or delete saved rows. New entries you add below appear here too."
        onChanged={() => {
          setFuelRefreshKey((k) => k + 1);
          onInventoryChanged?.();
        }}
      />

      <FormStep step={1} label="Equipment">
        <div>
          <Label className="text-gray-600 text-xs">Equipment type</Label>
          <Select
            value={equipmentType}
            onValueChange={(v) => setEquipmentType(v as StationaryEquipmentType)}
          >
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATIONARY_EQUIPMENT_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Optional details
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`}
          />
        </button>

        {showOptional && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-gray-100 bg-gray-50/40 p-3">
            <div>
              <Label className="text-gray-600 text-xs">Site</Label>
              <Input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="e.g. Plant A"
                className="mt-1.5 rounded-xl border-gray-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-gray-600 text-xs">Equipment ID</Label>
              <Input
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="e.g. Boiler-03"
                className="mt-1.5 rounded-xl border-gray-200 bg-white"
              />
            </div>
            <div>
              <Label className="text-gray-600 text-xs">Period</Label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="mt-1.5 rounded-xl border-gray-200 bg-white"
              />
            </div>
          </div>
        )}
      </FormStep>

      <FormStep step={2} label="Fuel use">
        <FuelEmissions
          key={fuelRefreshKey}
          onDataChange={onDataChange}
          companyContext={companyContext}
          counterpartyId={counterpartyId}
          onSaveAndNext={onSaveAndNext}
          sectionTitle=""
          sectionDescription=""
          activityMeta={buildStationaryActivityMeta({
            equipmentType,
            site,
            sourceId,
            period,
          })}
        />
      </FormStep>
    </ActivitySectionShell>
  );
}

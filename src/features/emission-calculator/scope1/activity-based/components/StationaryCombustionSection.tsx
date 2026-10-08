import { useState } from "react";
import { Flame } from "lucide-react";
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
import { STATIONARY_EQUIPMENT_OPTIONS, type StationaryEquipmentType } from "../types";
import { ActivitySectionShell, FormStep } from "./ActivitySectionShell";

type Props = {
  companyContext?: boolean;
  counterpartyId?: string;
  onDataChange: (rows: Array<{ emissions?: number }>) => void;
  onSaveAndNext?: () => void;
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
}: Props) {
  const [equipmentType, setEquipmentType] = useState<StationaryEquipmentType>("boiler");
  const [site, setSite] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  return (
    <ActivitySectionShell
      icon={Flame}
      title="Stationary Combustion"
      subtitle="Fuel burned on site — boilers, generators, heaters, kitchens."
      details={
        <p>
          Uses Fuel EPA stationary factors only (not mobile sheets). Purchased steam or heat belongs
          in Scope 2.
        </p>
      }
    >
      <FormStep step={1} label="Where and what equipment?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-gray-600 text-xs">Site / facility</Label>
            <Input
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="e.g. Plant A"
              className="mt-1.5 rounded-xl border-gray-200"
            />
          </div>
          <div>
            <Label className="text-gray-600 text-xs">Equipment ID</Label>
            <Input
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="e.g. Boiler-03"
              className="mt-1.5 rounded-xl border-gray-200"
            />
          </div>
          <div>
            <Label className="text-gray-600 text-xs">Reporting period</Label>
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1.5 rounded-xl border-gray-200"
            />
          </div>
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
        </div>
      </FormStep>

      <FormStep step={2} label="Fuel use">
        <FuelEmissions
          onDataChange={onDataChange}
          companyContext={companyContext}
          counterpartyId={counterpartyId}
          onSaveAndNext={onSaveAndNext}
          sectionTitle="Add fuel entries"
          sectionDescription=""
        />
      </FormStep>
    </ActivitySectionShell>
  );
}

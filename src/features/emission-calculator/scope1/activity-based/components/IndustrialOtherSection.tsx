import { useState } from "react";
import { Factory } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import EmissionCalculatorIPCC from "@/features/emission-calculator/methodologies/epa-ipcc/IpccCalculatorScreen";
import {
  ActivitySectionShell,
  FormStep,
  PendingSourcesNote,
} from "./ActivitySectionShell";
import { cn } from "@/lib/utils";

type Props = {
  onScope1CategoryTotalChange?: (categoryId: string, totalMeT: number) => void;
};

/**
 * Industrial and other direct emissions — flaring/venting behind simple toggles.
 */
export function IndustrialOtherSection({ onScope1CategoryTotalChange }: Props) {
  const [hasFlaring, setHasFlaring] = useState(false);
  const [hasVenting, setHasVenting] = useState(false);
  const [active, setActive] = useState<"flaring" | "venting">("flaring");

  return (
    <ActivitySectionShell
      icon={Factory}
      title="Industrial and Other Direct"
      subtitle="Flaring, venting, and other industrial releases."
      details={
        <p>
          Flaring and venting use composition-based methods that should be verified before
          assurance use. This module does not claim EPA GHGRP compliance. Historical records stay
          in your totals.
        </p>
      }
    >
      <FormStep step={1} label="Which activities apply?">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3.5">
            <div>
              <Label className="text-gray-900 text-sm">Flaring</Label>
              <p className="text-xs text-gray-500 mt-0.5">Gas flared at operations</p>
            </div>
            <Switch
              checked={hasFlaring}
              onCheckedChange={(v) => {
                setHasFlaring(v);
                if (v) setActive("flaring");
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3.5">
            <div>
              <Label className="text-gray-900 text-sm">Venting</Label>
              <p className="text-xs text-gray-500 mt-0.5">Direct gas releases</p>
            </div>
            <Switch
              checked={hasVenting}
              onCheckedChange={(v) => {
                setHasVenting(v);
                if (v) setActive("venting");
              }}
            />
          </div>
        </div>
      </FormStep>

      {(hasFlaring || hasVenting) && (
        <FormStep step={2} label="Calculate">
          <div className="flex gap-2 mb-4">
            {hasFlaring && (
              <button
                type="button"
                className={cn(
                  "px-3.5 py-1.5 text-sm rounded-full border transition-colors",
                  active === "flaring"
                    ? "bg-[#EAF7F1] border-[#1D9E75] text-[#0F6E56] font-medium"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setActive("flaring")}
              >
                Flaring
              </button>
            )}
            {hasVenting && (
              <button
                type="button"
                className={cn(
                  "px-3.5 py-1.5 text-sm rounded-full border transition-colors",
                  active === "venting"
                    ? "bg-[#EAF7F1] border-[#1D9E75] text-[#0F6E56] font-medium"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setActive("venting")}
              >
                Venting
              </button>
            )}
          </div>
          <EmissionCalculatorIPCC
            embedded
            forcedCategory={active}
            onScope1CategoryTotalChange={onScope1CategoryTotalChange}
          />
        </FormStep>
      )}

      {!hasFlaring && !hasVenting && (
        <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-2xl">
          Turn on flaring or venting above if they apply — otherwise leave them off.
        </p>
      )}

      <PendingSourcesNote
        items={[
          "Process emissions (cement, metals, chemicals, etc.)",
          "Wastewater / waste treatment direct CH₄/N₂O",
          "Agricultural activities",
        ]}
      />
    </ActivitySectionShell>
  );
}

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EmissionData } from "@/components/emissions/shared/types";
import { FieldTooltip } from "@/pages/finance_facilitated/components/FieldTooltip";

interface FranchisesSectionProps {
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
}

export const FranchisesSection: React.FC<FranchisesSectionProps> = ({
  emissionData,
  setEmissionData,
  onSaveAndNext,
}) => {
  const { toast } = useToast();

  const addFranchiseEntry = () => {
    const details =
      ((document.getElementById("fr-details") as any)?._value as string) ||
      (document.getElementById("fr-details") as HTMLInputElement)?.value ||
      "";
    const ops =
      ((document.getElementById("fr-ops") as any)?._value as string) ||
      (document.getElementById("fr-ops") as HTMLInputElement)?.value ||
      "";
    const energy =
      ((document.getElementById("fr-energy") as any)?._value as string) ||
      (document.getElementById("fr-energy") as HTMLInputElement)?.value ||
      "";

    if (!details || !ops || !energy) {
      toast({
        title: "Missing info",
        description:
          "Enter franchise details, operational practices, and energy consumption.",
      });
      return;
    }

    setEmissionData((prev) => ({
      ...prev,
      scope3: [
        ...prev.scope3,
        {
          id: `fr-${Date.now()}`,
          category: "franchises",
          activity: `${details} | ${ops}`,
          unit: "entry",
          quantity: 1,
          emissions: 0,
        },
      ],
    }));

    ["fr-details", "fr-ops", "fr-energy"].forEach((id) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = "";
    });
  };

  const removeRow = (rowId: string) => {
    setEmissionData((prev) => ({
      ...prev,
      scope3: prev.scope3.filter((r) => r.id !== rowId),
    }));
  };

  const franchiseRows = emissionData.scope3.filter(
    (r) => r.category === "franchises",
  );
  const totalPending = franchiseRows.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Franchises</h3>
          <p className="text-sm text-gray-600">
            Franchise details, operations, and energy use
          </p>
        </div>
        <Button
          variant="default"
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() =>
            (document.getElementById("fr-details") as HTMLInputElement | null)
              ?.focus()
          }
        >
          <Plus className="h-4 w-4 mr-2" /> Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <Label
            htmlFor="fr-details"
            className="flex items-center gap-1"
          >
            Franchise Details{" "}
            <FieldTooltip content="Information about the franchise" />
          </Label>
          <Input
            id="fr-details"
            placeholder="Enter franchise info"
            onChange={(e) => ((e.currentTarget as any)._value = e.target.value)}
          />
        </div>
        <div>
          <Label
            htmlFor="fr-ops"
            className="flex items-center gap-1"
          >
            Operational Practices{" "}
            <FieldTooltip content="Operational practices followed by the franchise" />
          </Label>
          <Input
            id="fr-ops"
            placeholder="Describe ops practices"
            onChange={(e) => ((e.currentTarget as any)._value = e.target.value)}
          />
        </div>
        <div>
          <Label
            htmlFor="fr-energy"
            className="flex items-center gap-1"
          >
            Energy Consumption{" "}
            <FieldTooltip content="Energy consumed in franchise operations" />
          </Label>
          <Input
            id="fr-energy"
            placeholder="e.g., kWh/year"
            onChange={(e) => ((e.currentTarget as any)._value = e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end mt-2">
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={addFranchiseEntry}
        >
          Add Entry
        </Button>
      </div>

      {franchiseRows.length > 0 && (
        <div className="space-y-3">
          {franchiseRows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50"
            >
              <div className="md:col-span-3">
                <div className="text-sm font-medium text-gray-900">
                  {row.activity}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => removeRow(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="text-gray-700 font-medium">
            Total Franchise Entries:{" "}
            <span className="font-semibold">{totalPending}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                toast({
                  title: "Saved",
                  description: "Franchise entries saved (frontend only for now).",
                });
              }}
              disabled={totalPending === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {`Save (${totalPending})`}
            </Button>
            {onSaveAndNext && (
              <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600 hover:bg-teal-50">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



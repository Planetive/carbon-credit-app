import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import type { EmissionData } from "@/components/emissions/shared/types";
import type { BusinessTravelRow } from "../types/scope3Types";
import type { BusinessTravelType } from "../businessTravelTypes";

interface BusinessTravelSectionProps {
  rows: BusinessTravelRow[];
  businessTravelTypes: BusinessTravelType[];
  deletingIds: Set<string>;
  totalEmissions: number;
  totalDistance: number;
  onAddRow: () => void;
  onUpdateRow: (id: string, patch: Partial<BusinessTravelRow>) => void;
  onRemoveRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  onSaveAndNext?: () => void;
}

export const BusinessTravelSection: React.FC<BusinessTravelSectionProps> = ({
  rows,
  businessTravelTypes,
  deletingIds,
  totalEmissions,
  totalDistance,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onDeleteRow,
  onSave,
  saving,
  onSaveAndNext,
}) => {
  const pendingNew = rows.filter(
    (r) =>
      !r.isExisting &&
      r.travelTypeId &&
      typeof r.distance === "number" &&
      r.distance > 0,
  ).length;
  const pendingUpdates = rows.filter((r) => r.isExisting && r.dbId).length; // detailed diff already in container logic
  const totalPending = pendingNew + pendingUpdates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Business Travel</h4>
          <p className="text-sm text-gray-600">
            Travel modes, distance, and emissions
          </p>
        </div>
        <Button
          onClick={onAddRow}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
        <Label className="text-gray-500 font-medium">Travel Mode</Label>
        <Label className="text-gray-500 font-medium">Distance (km)</Label>
        <Label className="text-gray-500 font-medium">Emissions</Label>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          return (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="w-full">
                <Select
                  value={r.travelTypeId}
                  onValueChange={(v) => onUpdateRow(r.id, { travelTypeId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select travel mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTravelTypes.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      businessTravelTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.vehicle_type}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={r.distance ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      onUpdateRow(r.id, { distance: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0) {
                        onUpdateRow(r.id, { distance: numValue });
                      }
                    }
                  }}
                  placeholder="Enter distance"
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-700 font-medium flex-1">
                  {r.emissions !== undefined
                    ? `${r.emissions.toFixed(2)} kg CO₂e`
                    : "-"}
                </div>
                {r.isExisting ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDeleteRow(r.id)}
                    disabled={deletingIds.has(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onRemoveRow(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Distance:{" "}
          <span className="font-semibold">
            {totalDistance.toFixed(2)} km
          </span>{" "}
          | Total Emissions:{" "}
          <span className="font-semibold">
            {totalEmissions.toFixed(2)} kg CO₂e
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onSave}
            disabled={saving || totalPending === 0}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : `Save (${totalPending})`}
          </Button>
          {onSaveAndNext && (
            <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600 hover:bg-teal-50">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};



import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Info, ChevronRight } from "lucide-react";
import type { DownstreamTransportRow } from "../types/scope3Types";
import type { VehicleType } from "../vehicleTypes";
import { getVehicleTypeNote, getVehicleTypeSuperscript, cleanVehicleTypeName } from "../utils/vehicleTypeHelpers";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DownstreamTransportationSectionProps {
  rows: DownstreamTransportRow[];
  vehicleTypes: VehicleType[];
  deletingIds: Set<string>;
  totalEmissions: number;
  totalWeight: number;
  onAddRow: () => void;
  onUpdateRow: (id: string, patch: Partial<DownstreamTransportRow>) => void;
  onRemoveRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onSave: () => void;
  saving: boolean;
  onSaveAndNext?: () => void;
}

export const DownstreamTransportationSection: React.FC<DownstreamTransportationSectionProps> = ({
  rows,
  vehicleTypes,
  deletingIds,
  totalEmissions,
  totalWeight,
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
      r.vehicleTypeId &&
      typeof r.distance === "number" &&
      r.distance > 0 &&
      typeof r.weight === "number" &&
      r.weight > 0,
  ).length;
  const pendingUpdates = rows.filter((r) => r.isExisting && r.dbId).length;
  const totalPending = pendingNew + pendingUpdates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            Downstream Transportation
          </h4>
          <p className="text-sm text-gray-600">
            Vehicle types, distance, and weight for downstream transportation
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-4">
        <Label className="text-gray-500 font-medium">Vehicle Type</Label>
        <Label className="text-gray-500 font-medium">Distance (km)</Label>
        <Label className="text-gray-500 font-medium">Weight (kg)</Label>
        <Label className="text-gray-500 font-medium">Emissions</Label>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          const vehicleType = vehicleTypes.find((vt) => vt.id === r.vehicleTypeId);
          return (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="w-full flex items-center gap-2">
                <Select
                  value={r.vehicleTypeId}
                  onValueChange={(v) =>
                    onUpdateRow(r.id, { vehicleTypeId: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      vehicleTypes.map((vehicle) => {
                        const superscript = getVehicleTypeSuperscript(
                          vehicle.vehicle_type,
                        );
                        const cleanedName = cleanVehicleTypeName(
                          vehicle.vehicle_type,
                        );
                        return (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {cleanedName}
                            {superscript && (
                              <sup className="text-xs ml-1">{superscript}</sup>
                            )}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {r.vehicleTypeId && vehicleType && (() => {
                  const note = getVehicleTypeNote(vehicleType.vehicle_type);
                  if (!note) return null;
                  return (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="flex-shrink-0"
                            aria-label="Vehicle type info"
                          >
                            <Info className="h-4 w-4 text-teal-600 hover:text-teal-700" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">{note}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })()}
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
              <div className="w-full">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={r.weight ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      onUpdateRow(r.id, { weight: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0) {
                        onUpdateRow(r.id, { weight: numValue });
                      }
                    }
                  }}
                  placeholder="Enter weight"
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-700 font-medium flex-1">
                  {r.emissions !== undefined
                    ? `${r.emissions.toFixed(2)} kg CO2e`
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
          Total Weight:{" "}
          <span className="font-semibold">
            {totalWeight.toFixed(2)} kg
          </span>{" "}
          | Total Emissions:{" "}
          <span className="font-semibold">
            {totalEmissions.toFixed(2)} kg CO2e
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



import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import type { WasteGeneratedRow } from "../types/scope3Types";
import type { WasteMaterial, DisposalMethod } from "../wasteTypes";
import { getAvailableDisposalMethods } from "../wasteTypes";

interface WasteGeneratedSectionProps {
  rows: WasteGeneratedRow[];
  wasteMaterials: WasteMaterial[];
  deletingIds: Set<string>;
  totalEmissions: number;
  totalVolume: number;
  onAddRow: () => void;
  onUpdateRow: (id: string, patch: Partial<WasteGeneratedRow>) => void;
  onRemoveRow: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onSave: () => void;
  saving: boolean;
}

export const WasteGeneratedSection: React.FC<WasteGeneratedSectionProps> = ({
  rows,
  wasteMaterials,
  deletingIds,
  totalEmissions,
  totalVolume,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
  onDeleteRow,
  onSave,
  saving,
}) => {
  const pendingNew = rows.filter(
    (r) =>
      !r.isExisting &&
      r.materialId &&
      typeof r.volume === "number" &&
      r.volume > 0 &&
      r.disposalMethod,
  ).length;
  const pendingUpdates = rows.filter((r) => r.isExisting && r.dbId).length;
  const totalPending = pendingNew + pendingUpdates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Waste Generated</h4>
          <p className="text-sm text-gray-600">
            Record waste types, volumes, and disposal methods
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
        <Label className="text-gray-500 font-medium">Material</Label>
        <Label className="text-gray-500 font-medium">Volume (kg)</Label>
        <Label className="text-gray-500 font-medium">Disposal Method</Label>
        <Label className="text-gray-500 font-medium">Emissions</Label>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          const material = wasteMaterials.find((m) => m.id === r.materialId);
          const availableMethods = getAvailableDisposalMethods(material || null);
          return (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div className="w-full">
                <Select
                  value={r.materialId}
                  onValueChange={(v) => {
                    onUpdateRow(r.id, { materialId: v, disposalMethod: "" });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteMaterials.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      wasteMaterials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m[" Material "] || "Unknown"}
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
                  value={r.volume ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      onUpdateRow(r.id, { volume: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0) {
                        onUpdateRow(r.id, { volume: numValue });
                      }
                    }
                  }}
                  placeholder="Enter volume"
                  className="w-full"
                />
              </div>
              <div className="w-full">
                <Select
                  value={r.disposalMethod}
                  onValueChange={(v) =>
                    onUpdateRow(r.id, { disposalMethod: v as DisposalMethod })
                  }
                  disabled={!material || availableMethods.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMethods.length === 0 ? (
                      <SelectItem value="loading" disabled>
                        No methods available
                      </SelectItem>
                    ) : (
                      availableMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
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
          Total Volume:{" "}
          <span className="font-semibold">
            {totalVolume.toFixed(2)} kg
          </span>{" "}
          | Total Emissions:{" "}
          <span className="font-semibold">
            {totalEmissions.toFixed(2)} kg CO₂e
          </span>
        </div>
        <Button
          onClick={onSave}
          disabled={saving || totalPending === 0}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? "Saving..."
            : `Save and Next (${totalPending})`}
        </Button>
      </div>
    </div>
  );
};



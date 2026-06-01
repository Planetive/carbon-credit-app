import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import { FieldTooltip } from "@/components/shared/finance/FieldTooltip";
import { FACTORS, SCOPE2_FACTORS } from "@/components/emissions/shared/EmissionFactors";
import type { FuelType } from "@/components/emissions/shared/types";
import type {
  HeatSteamRow,
  MobileCombustionRow,
  OtherSourceRow,
  ProcessingSoldProductsRow,
  StationaryCombustionRow,
} from "./types";

interface ProcessingSoldProductsSectionProps {
  isAnimating: boolean;
  rows: ProcessingSoldProductsRow[];
  totalEmissions: number;
  saving: boolean;
  stationaryCombustionData: StationaryCombustionRow[];
  mobileCombustionData: MobileCombustionRow[];
  heatSteamDataUK: HeatSteamRow[];
  heatSteamDataEBT: HeatSteamRow[];
  onBack: () => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, patch: Partial<ProcessingSoldProductsRow>) => void;
  onUpdateOtherSourceRow: (
    rowId: string,
    sourceId: string,
    patch: Partial<OtherSourceRow>,
  ) => void;
  onAddOtherSourceRow: (rowId: string) => void;
  onRemoveOtherSourceRow: (rowId: string, sourceId: string) => void;
  onSave: () => void;
  onSaveAndNext?: () => void;
}

const getGridFactor = (country?: "UAE" | "Pakistan") =>
  country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined;

export const ProcessingSoldProductsSection: React.FC<ProcessingSoldProductsSectionProps> = ({
  isAnimating,
  rows,
  totalEmissions,
  saving,
  stationaryCombustionData,
  mobileCombustionData,
  heatSteamDataUK,
  heatSteamDataEBT,
  onBack,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onUpdateOtherSourceRow,
  onAddOtherSourceRow,
  onRemoveOtherSourceRow,
  onSave,
  onSaveAndNext,
}) => {
  return (
        <div className={`space-y-6 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </Button>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Processing of Sold Products</h3>
                <p className="text-sm text-gray-600 mt-1">Lifecycle data, transformations, and energy use</p>
              </div>
            </div>
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 text-white" 
              onClick={onAddRow}
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Entry
            </Button>
          </div>

          {/* Entries Section */}
          <div className="space-y-4">
            {rows.map((row, index) => (
              <Card 
                key={row.id} 
                className="overflow-hidden border-gray-200 hover:border-teal-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Processing Activity <FieldTooltip content="Select the processing activity type" />
                    </Label>
                    <Select
                      value={row.processingActivity}
                      onValueChange={(value) => {
                        // Activities that should always use electricity factors
                        const electricityOnlyActivities = [
                          'Machining / cutting / shaping',
                          'Mixing / blending (mechanical)',
                        ];
                        // Activities where electricity can be used (keep electricity fields)
                        const electricityAllowedActivities = [
                          'Machining / cutting / shaping',
                          'Mixing / blending (mechanical)',
                          'Forging / Foundry operations',
                          'Material forming (molding, extrusion)',
                          'Textile processing (dyeing, washing)',
                        ];

                        const shouldKeepElectricity = electricityAllowedActivities.includes(value);
                        const isHeatingMelting = value === 'Heating, melting, smelting';
                        const isDryingCuringKilns = value === 'Drying / Curing / Kilns';

                        onUpdateRow(row.id, {
                          processingActivity: value,
                          // Clear combustion fields if not Heating, melting, smelting
                          combustionType: isHeatingMelting ? row.combustionType : undefined,
                          stationaryMainFuelType: isHeatingMelting ? row.stationaryMainFuelType : undefined,
                          stationarySubFuelType: isHeatingMelting ? row.stationarySubFuelType : undefined,
                          stationaryCo2Factor: isHeatingMelting ? row.stationaryCo2Factor : undefined,
                          stationaryUnit: isHeatingMelting ? row.stationaryUnit : undefined,
                          mobileFuelType: isHeatingMelting ? row.mobileFuelType : undefined,
                          mobileKgCo2PerUnit: isHeatingMelting ? row.mobileKgCo2PerUnit : undefined,
                          mobileUnit: isHeatingMelting ? row.mobileUnit : undefined,
                          // Clear heat and steam fields if not Drying / Curing / Kilns
                          // Initialize to 'UK' if selecting Drying / Curing / Kilns and standard is undefined
                          heatSteamStandard: isDryingCuringKilns ? (row.heatSteamStandard || 'UK') : undefined,
                          heatSteamType: isDryingCuringKilns ? row.heatSteamType : undefined,
                          heatSteamKgCo2e: isDryingCuringKilns ? row.heatSteamKgCo2e : undefined,
                          heatSteamUnit: isDryingCuringKilns ? row.heatSteamUnit : undefined,
                          // Clear regular fuel fields if Heating, melting, smelting or Drying / Curing / Kilns (uses special tables instead)
                          type: (isHeatingMelting || isDryingCuringKilns) ? undefined : undefined,
                          fuel: (isHeatingMelting || isDryingCuringKilns) ? undefined : undefined,
                          unit: (isHeatingMelting || isDryingCuringKilns) ? undefined : undefined,
                          quantity: undefined,
                          factor: undefined,
                          emissions: undefined,
                          // Clear electricity fields only when switching to activities that don't use it
                          totalKwh: shouldKeepElectricity ? row.totalKwh : undefined,
                          gridPct: shouldKeepElectricity ? row.gridPct : undefined,
                          renewablePct: shouldKeepElectricity ? row.renewablePct : undefined,
                          otherPct: shouldKeepElectricity ? row.otherPct : undefined,
                          gridCountry: shouldKeepElectricity ? row.gridCountry : undefined,
                          otherSources: shouldKeepElectricity ? row.otherSources : undefined,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select processing activity" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" position="item-aligned" sideOffset={4}>
                        <SelectItem value="Heating, melting, smelting">Heating, melting, smelting</SelectItem>
                        <SelectItem value="Forging / Foundry operations">Forging / Foundry operations</SelectItem>
                        <SelectItem value="Drying / Curing / Kilns">Drying / Curing / Kilns</SelectItem>
                        <SelectItem value="Machining / cutting / shaping">Machining / cutting / shaping</SelectItem>
                        <SelectItem value="Mixing / blending (mechanical)">Mixing / blending (mechanical)</SelectItem>
                        <SelectItem value="Mixing / blending (thermal)">Mixing / blending (thermal)</SelectItem>
                        <SelectItem value="Electrolysis, electrolytic finishing">Electrolysis, electrolytic finishing</SelectItem>
                        <SelectItem value="Steam-intensive processing">Steam-intensive processing</SelectItem>
                        <SelectItem value="Material forming (molding, extrusion)">Material forming (molding, extrusion)</SelectItem>
                        <SelectItem value="Textile processing (dyeing, washing)">Textile processing (dyeing, washing)</SelectItem>
                        <SelectItem value="Food processing (baking, sterilizing)">Food processing (baking, sterilizing)</SelectItem>
                        <SelectItem value="Paper/pulp processing">Paper/pulp processing</SelectItem>
                        <SelectItem value="Glass manufacturing">Glass manufacturing</SelectItem>
                      </SelectContent>
                    </Select>
          </div>
                </div>

                {/* Combustion Type Selection for Heating, melting, smelting */}
                {row.processingActivity === 'Heating, melting, smelting' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Combustion Type</h4>
                    <div className="mb-4">
                      <Label className="flex items-center gap-1 mb-2">
                        Select Combustion Type <FieldTooltip content="Choose between Stationary or Mobile Combustion" />
                      </Label>
                      <Select 
                        value={row.combustionType || ''} 
                        onValueChange={(value) => {
                          onUpdateRow(row.id, { 
                            combustionType: value as 'stationary' | 'mobile',
                            // Clear all combustion-related fields
                            stationaryMainFuelType: undefined,
                            stationarySubFuelType: undefined,
                            stationaryCo2Factor: undefined,
                            stationaryUnit: undefined,
                            mobileFuelType: undefined,
                            mobileKgCo2PerUnit: undefined,
                            mobileUnit: undefined,
                            quantity: undefined,
                            emissions: undefined,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select combustion type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stationary">Stationary Combustion</SelectItem>
                          <SelectItem value="mobile">Mobile Combustion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stationary Combustion Fields */}
                    {row.combustionType === 'stationary' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Stationary Combustion Details</h5>
                        {/* Debug info - remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-100 rounded">
                            Data loaded: {stationaryCombustionData.length} rows | 
                            Main Fuel Types: {Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).length}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Main Fuel Type <FieldTooltip content="Select main fuel type" />
                            </Label>
                            <Select 
                              value={row.stationaryMainFuelType || ''} 
                              onValueChange={(value) => {
                                onUpdateRow(row.id, { 
                                  stationaryMainFuelType: value,
                                  stationarySubFuelType: undefined,
                                  stationaryCo2Factor: undefined,
                                  stationaryUnit: undefined,
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select main fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  (() => {
                                    const mainFuelTypes = Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean)));
                                    console.log('Main Fuel Types for dropdown:', mainFuelTypes);
                                    if (mainFuelTypes.length === 0) {
                                      return <SelectItem value="no-data" disabled>No fuel types found</SelectItem>;
                                    }
                                    return mainFuelTypes.map(mainType => (
                                      <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                    ));
                                  })()
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Sub Fuel Type <FieldTooltip content="Select sub fuel type" />
                            </Label>
                            <Select 
                              value={row.stationarySubFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = stationaryCombustionData.find(
                                  d => d['Main Fuel Type'] === row.stationaryMainFuelType && d['Sub Fuel Type'] === value
                                );
                                console.log('Selected sub fuel type:', selected);
                                onUpdateRow(row.id, { 
                                  stationarySubFuelType: value,
                                  stationaryCo2Factor: selected?.['CO2 Factor'],
                                  stationaryUnit: selected?.['Units'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                              disabled={!row.stationaryMainFuelType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData
                                  .filter(d => d['Main Fuel Type'] === row.stationaryMainFuelType)
                                  .map(d => {
                                    const subType = d['Sub Fuel Type'];
                                    return (
                                      <SelectItem key={subType} value={subType}>
                                        {subType}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.stationaryUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Quantity <FieldTooltip content="Enter quantity" />
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="Enter quantity"
                              value={row.quantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                onUpdateRow(row.id, { quantity: value });
                              }}
                              disabled={!row.stationarySubFuelType}
                            />
                          </div>
                        </div>
                        {row.stationaryCo2Factor !== undefined && (
                          <div className="mt-2 text-sm text-gray-600">
                            CO2 Factor: <span className="font-semibold">{row.stationaryCo2Factor.toFixed(6)}</span>
                          </div>
                        )}
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Combustion Fields */}
                    {row.combustionType === 'mobile' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Mobile Combustion Details</h5>
                        {/* Debug info - remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-100 rounded">
                            Data loaded: {mobileCombustionData.length} rows | 
                            Fuel Types: {Array.from(new Set(mobileCombustionData.map(d => d['FuelType']).filter(Boolean))).length}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Fuel Type <FieldTooltip content="Select fuel type" />
                            </Label>
                            <Select 
                              value={row.mobileFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = mobileCombustionData.find(d => d['FuelType'] === value);
                                console.log('Selected fuel type:', selected);
                                onUpdateRow(row.id, { 
                                  mobileFuelType: value,
                                  mobileKgCo2PerUnit: selected?.['kg CO2 per unit'],
                                  mobileUnit: selected?.['Unit'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {mobileCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  (() => {
                                    const fuelTypes = mobileCombustionData.map(d => d['FuelType']).filter(Boolean);
                                    console.log('Fuel Types for dropdown:', fuelTypes);
                                    if (fuelTypes.length === 0) {
                                      return <SelectItem value="no-data" disabled>No fuel types found</SelectItem>;
                                    }
                                    return fuelTypes.map(fuelType => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ));
                                  })()
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              kg CO2 per Unit <FieldTooltip content="CO2 emission factor" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileKgCo2PerUnit !== undefined ? row.mobileKgCo2PerUnit.toFixed(6) : ''}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Quantity <FieldTooltip content="Enter quantity" />
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="Enter quantity"
                              value={row.quantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                onUpdateRow(row.id, { quantity: value });
                              }}
                              disabled={!row.mobileFuelType}
                            />
                          </div>
                        </div>
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Heat and Steam Selection for Drying / Curing / Kilns */}
                {row.processingActivity === 'Drying / Curing / Kilns' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Heat and Steam Details</h4>
                    {/* Standard Selection */}
                    <div className="mb-4">
                      <Label className="flex items-center gap-1 mb-2">
                        Standard <FieldTooltip content="Select the emission factor standard (UK or EBT)" />
                      </Label>
                      <Select 
                        value={row.heatSteamStandard || 'UK'} 
                        onValueChange={(value: 'UK' | 'EBT') => {
                          const currentStandard = value;
                          const dataSource = currentStandard === 'UK' ? heatSteamDataUK : heatSteamDataEBT;
                          
                          // Auto-select if EBT has only one option
                          let autoSelectedType: string | undefined;
                          let autoSelectedData: any = undefined;
                          
                          if (value === 'EBT' && dataSource.length === 1) {
                            autoSelectedData = dataSource[0];
                            autoSelectedType = autoSelectedData['Type'];
                          }
                          
                          onUpdateRow(row.id, { 
                            heatSteamStandard: value,
                            heatSteamType: autoSelectedType,
                            heatSteamKgCo2e: autoSelectedData?.['kg CO₂e'],
                            heatSteamUnit: autoSelectedData?.['Unit'],
                            quantity: undefined,
                            emissions: undefined,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full md:w-[200px]">
                          <SelectValue placeholder="Select standard" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UK">UK Standard</SelectItem>
                          <SelectItem value="EBT">EBT Standard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Heat and Steam Type <FieldTooltip content="Select heat and steam type" />
                        </Label>
                        {(() => {
                          const currentStandard = row.heatSteamStandard || 'UK';
                          const dataSource = currentStandard === 'UK' ? heatSteamDataUK : heatSteamDataEBT;
                          const isEBTWithOneOption = currentStandard === 'EBT' && dataSource.length === 1;
                          
                          // If EBT has only one option, show it as read-only input instead of dropdown
                          if (isEBTWithOneOption && dataSource[0]) {
                            const singleOption = dataSource[0];
                            // Auto-select if not already selected
                            if (!row.heatSteamType) {
                              onUpdateRow(row.id, { 
                                heatSteamType: singleOption['Type'],
                                heatSteamKgCo2e: singleOption['kg CO₂e'],
                                heatSteamUnit: singleOption['Unit'],
                              });
                            }
                            return (
                              <Input
                                type="text"
                                value={singleOption['Type']}
                                disabled
                                className="bg-gray-100"
                                readOnly
                              />
                            );
                          }
                          
                          // Otherwise show dropdown
                          return (
                            <Select 
                              value={row.heatSteamType || ''} 
                              onValueChange={(value) => {
                                const selected = dataSource.find(d => d['Type'] === value);
                                console.log('Selected heat and steam type:', selected);
                                onUpdateRow(row.id, { 
                                  heatSteamType: value,
                                  heatSteamKgCo2e: selected?.['kg CO₂e'],
                                  heatSteamUnit: selected?.['Unit'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                              disabled={!row.heatSteamStandard}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select heat and steam type" />
                              </SelectTrigger>
                              <SelectContent>
                                {dataSource.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  dataSource.map(d => (
                                    <SelectItem key={d['Type']} value={d['Type']}>
                                      {d['Type']}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          );
                        })()}
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Unit <FieldTooltip content="Unit of measurement" />
                        </Label>
                        <Input
                          type="text"
                          value={row.heatSteamUnit || ''}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Quantity (kWh) <FieldTooltip content="Enter quantity in kWh" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Enter quantity"
                          value={row.quantity ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { quantity: value });
                          }}
                          disabled={!row.heatSteamType}
                        />
                      </div>
                    </div>
                    {row.heatSteamKgCo2e !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        CO₂e Factor: <span className="font-semibold">{row.heatSteamKgCo2e.toFixed(6)} kg CO₂e/kWh</span>
                      </div>
                    )}
                    {row.emissions !== undefined && (
                      <div className="mt-2 text-sm text-gray-700 font-medium">
                        Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO₂e</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Fuel Table - shown only when a processing activity is selected that can use fuel (but not Heating, melting, smelting or Drying / Curing / Kilns) */}
                {row.processingActivity &&
                 row.processingActivity !== 'Heating, melting, smelting' &&
                 row.processingActivity !== 'Drying / Curing / Kilns' &&
                 row.processingActivity !== 'Machining / cutting / shaping' &&
                 row.processingActivity !== 'Mixing / blending (mechanical)' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Fuel Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Type <FieldTooltip content="Select fuel type group" />
                        </Label>
                        <Select 
                          value={row.type || ''} 
                          onValueChange={(value) => {
                            onUpdateRow(row.id, { 
                              type: value as FuelType,
                              fuel: undefined,
                              unit: undefined,
                              factor: undefined,
                              emissions: undefined,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(FACTORS).map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Fuel <FieldTooltip content="Select fuel" />
                        </Label>
                        <Select 
                          value={row.fuel || ''} 
                          onValueChange={(value) => {
                            onUpdateRow(row.id, { 
                              fuel: value,
                              unit: undefined,
                              factor: undefined,
                              emissions: undefined,
                            });
                          }}
                          disabled={!row.type}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.type && Object.keys(FACTORS[row.type] || {}).map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Unit <FieldTooltip content="Select unit" />
                        </Label>
                        <Select 
                          value={row.unit || ''} 
                          onValueChange={(value) => {
                            onUpdateRow(row.id, { unit: value });
                          }}
                          disabled={!row.type || !row.fuel}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.type && row.fuel && Object.keys(FACTORS[row.type]?.[row.fuel] || {}).map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Quantity <FieldTooltip content="Enter quantity" />
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Enter quantity"
                      value={row.quantity ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { quantity: value });
                      }}
                    />
          </div>
                </div>
                    {row.factor !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        Emission Factor: <span className="font-semibold">{row.factor.toFixed(6)}</span>
                      </div>
                    )}
                    {row.emissions !== undefined && (
                      <div className="mt-2 text-sm text-gray-700 font-medium">
                        Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Electricity Factor - Full Scope 2 Electricity Form */}
                {(row.processingActivity === 'Machining / cutting / shaping' ||
                  row.processingActivity === 'Mixing / blending (mechanical)' ||
                  row.processingActivity === 'Forging / Foundry operations' ||
                  row.processingActivity === 'Material forming (molding, extrusion)' ||
                  row.processingActivity === 'Textile processing (dyeing, washing)') && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Electricity Details</h4>
                    
                    {/* Main electricity inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                        <Label className="flex items-center gap-1 mb-2">
                          Total electricity consumption (kWh) <FieldTooltip content="Total electricity consumption" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="999999999999.999999"
                          placeholder="e.g., 120000"
                          value={row.totalKwh ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { totalKwh: value });
                          }}
                        />
                      </div>
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                          Grid Energy (%) <FieldTooltip content="Percentage from grid" />
                    </Label>
                    <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="e.g., 60"
                          value={row.gridPct ?? ''}
                      onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { gridPct: value });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Renewable Energy (%) <FieldTooltip content="Percentage from renewable sources" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="e.g., 30"
                          value={row.renewablePct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { renewablePct: value });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Other sources (%) <FieldTooltip content="Percentage from other sources" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="e.g., 10"
                          value={row.otherPct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { otherPct: value });
                      }}
                    />
                </div>
                </div>

                    {/* Grid sources section */}
                    {row.gridPct && row.gridPct > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Electricity provider country <FieldTooltip content="Select country for grid factor" />
                          </Label>
                          <Select 
                            value={row.gridCountry || ''} 
                            onValueChange={(v) => onUpdateRow(row.id, { gridCountry: v as 'UAE' | 'Pakistan' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UAE">UAE</SelectItem>
                              <SelectItem value="Pakistan">Pakistan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Grid emission factor <FieldTooltip content="Auto-calculated based on country" />
                          </Label>
                          <Input 
                            value={getGridFactor(row.gridCountry)?.toFixed(6) || ''} 
                            readOnly 
                            placeholder="Auto" 
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Grid emissions <FieldTooltip content="Calculated grid emissions" />
                          </Label>
                          <Input
                            readOnly
                            value={row.totalKwh && row.gridPct && getGridFactor(row.gridCountry) 
                              ? ((row.gridPct / 100) * row.totalKwh * getGridFactor(row.gridCountry)!).toFixed(6)
                              : ''}
                          />
                        </div>
                      </div>
                    )}

                    {/* Other sources section */}
                    {(row.otherPct && row.otherPct > 0 || (row.otherSources && row.otherSources.length > 0)) && (
                      <div className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-900">Other sources</h5>
                          <Button 
                            onClick={() => onAddOtherSourceRow(row.id)} 
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Row
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <Label className="text-gray-500 text-sm">Type</Label>
                          <Label className="text-gray-500 text-sm">Fuel</Label>
                          <Label className="text-gray-500 text-sm">Unit</Label>
                          <Label className="text-gray-500 text-sm">Quantity</Label>
                          <div />
                        </div>

                        <div className="space-y-3">
                          {(row.otherSources || []).map(source => (
                            <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-gray-50">
                              <Select
                                value={source.type || ''}
                                onValueChange={(v) => onUpdateOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(FACTORS).map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={source.fuel || ''}
                                onValueChange={(v) => onUpdateOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined })}
                                disabled={!source.type}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={source.unit || ''}
                                onValueChange={(v) => onUpdateOtherSourceRow(row.id, source.id, { unit: v })}
                                disabled={!source.type || !source.fuel}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && source.fuel && Object.keys(FACTORS[source.type]?.[source.fuel] || {}).map(u => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Input
                                type="number"
                                step="any"
                                min="0"
                                max="999999999999.999999"
                                value={source.quantity ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  onUpdateOtherSourceRow(row.id, source.id, { quantity: value });
                                }}
                                placeholder="Enter quantity"
                              />

                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700" 
                                onClick={() => onRemoveOtherSourceRow(row.id, source.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {row.otherSources && row.otherSources.length > 0 && (
                          <div className="text-sm text-gray-700 font-medium">
                            Other sources emissions: <span className="font-semibold">
                              {row.otherSources.reduce((sum, s) => sum + (s.emissions || 0), 0).toFixed(6)} kg CO2e
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {row.emissions !== undefined && (
                      <div className="mt-4 text-sm text-gray-700 font-medium">
                        Total Electricity Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                      </div>
                    )}
                  </div>
                )}

                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onRemoveRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Remove Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {rows.length === 0 && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center text-gray-500">
                    <p className="text-lg mb-2">No entries yet</p>
                    <p className="text-sm">Click "Add New Entry" to get started.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer Section */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">
                  <span className="text-sm text-gray-600">Total Processing Entries:</span> <span className="font-semibold text-lg">{rows.length}</span>
                  {totalEmissions > 0 && (
                    <span className="ml-6">
                      <span className="text-sm text-gray-600">Total Emissions:</span> <span className="font-semibold text-lg text-teal-700">{totalEmissions.toFixed(6)} kg CO2e</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onSave}
                    disabled={rows.length === 0 || saving}
                    className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : `Save (${rows.length})`}
                  </Button>
                  {onSaveAndNext && (
                    <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600 hover:bg-teal-50">
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
            </Card>
      </div>
  );
};

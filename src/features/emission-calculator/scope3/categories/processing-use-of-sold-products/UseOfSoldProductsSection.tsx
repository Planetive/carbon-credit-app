import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import { FieldTooltip } from "@/components/shared/finance/FieldTooltip";
import { FACTORS, SCOPE2_FACTORS, REFRIGERANT_FACTORS } from "@/components/emissions/shared/EmissionFactors";
import type { FuelType } from "@/components/emissions/shared/types";
import type {
  MobileCombustionRow,
  OtherSourceRow,
  StationaryCombustionRow,
  UseOfSoldProductsRow,
} from "./types";

interface UseOfSoldProductsSectionProps {
  isAnimating: boolean;
  rows: UseOfSoldProductsRow[];
  totalEmissions: number;
  saving: boolean;
  stationaryCombustionData: StationaryCombustionRow[];
  mobileCombustionData: MobileCombustionRow[];
  onBack: () => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onUpdateRow: (id: string, patch: Partial<UseOfSoldProductsRow>) => void;
  onUpdateHybridOtherSourceRow: (
    rowId: string,
    sourceId: string,
    patch: Partial<OtherSourceRow>,
  ) => void;
  onAddHybridOtherSourceRow: (rowId: string) => void;
  onRemoveHybridOtherSourceRow: (rowId: string, sourceId: string) => void;
  onUpdateElectricityOtherSourceRow: (
    rowId: string,
    sourceId: string,
    patch: Partial<OtherSourceRow>,
  ) => void;
  onAddElectricityOtherSourceRow: (rowId: string) => void;
  onRemoveElectricityOtherSourceRow: (rowId: string, sourceId: string) => void;
  onSave: () => void;
  onSaveAndNext?: () => void;
}

const getGridFactor = (country?: "UAE" | "Pakistan") =>
  country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined;

export const UseOfSoldProductsSection: React.FC<UseOfSoldProductsSectionProps> = ({
  isAnimating,
  rows,
  totalEmissions,
  saving,
  stationaryCombustionData,
  mobileCombustionData,
  onBack,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onUpdateHybridOtherSourceRow,
  onAddHybridOtherSourceRow,
  onRemoveHybridOtherSourceRow,
  onUpdateElectricityOtherSourceRow,
  onAddElectricityOtherSourceRow,
  onRemoveElectricityOtherSourceRow,
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
                <h3 className="text-xl font-semibold text-gray-900">Use of Sold Products</h3>
                <p className="text-sm text-gray-600 mt-1">Usage specs and energy during use</p>
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
                <div className="mb-4">
                    <Label className="flex items-center gap-1 mb-2">
                      Processing Activity <FieldTooltip content="Select the processing activity type" />
                    </Label>
                    <Select 
                      value={row.processingActivity} 
                      onValueChange={(value) => {
                        const isInternalCombustion = value === 'Internal combustion engine vehicles (cars, trucks, bikes)';
                        const isSoldFuels = value === 'Sold fuels (LPG, petrol, diesel)';
                        const isBoilers = value === 'Boilers, stoves, heaters (gas-based)';
                        const isCombustionCategory = isInternalCombustion || isSoldFuels || isBoilers;
                        const isHybrid = value === 'Hybrid vehicles';
                        const isElectronicsCategory = 
                          value === 'Electronics (laptops, TVs, phones)' ||
                          value === 'Electric machinery/equipment' ||
                          value === 'Batteries' ||
                          value === 'Water-using devices' ||
                          value === 'Electric vehicles (cars, 2-wheelers, buses)' ||
                          value === 'Home appliances (ACs, fridges, fans, microwaves)';
                        const isRefrigerant = value === 'Refrigerants sold';
                        const isCoolingProducts = value === 'Cooling products (AC, refrigeration)';
                        const isGasMachinery = value === 'Gas-fired industrial machinery sold';
                        onUpdateRow(row.id, {
                          processingActivity: value,
                          // Clear combustion fields if not combustion categories
                          combustionType: isCombustionCategory ? row.combustionType : undefined,
                          stationaryMainFuelType: isCombustionCategory ? row.stationaryMainFuelType : undefined,
                          stationarySubFuelType: isCombustionCategory ? row.stationarySubFuelType : undefined,
                          stationaryCo2Factor: isCombustionCategory ? row.stationaryCo2Factor : undefined,
                          stationaryUnit: isCombustionCategory ? row.stationaryUnit : undefined,
                          stationaryQuantity: undefined,
                          mobileFuelType: isCombustionCategory ? row.mobileFuelType : undefined,
                          mobileKgCo2PerUnit: isCombustionCategory ? row.mobileKgCo2PerUnit : undefined,
                          mobileUnit: isCombustionCategory ? row.mobileUnit : undefined,
                          mobileQuantity: undefined,
                          // Clear hybrid fields if not Hybrid vehicles
                          hybridFuelType: isHybrid ? row.hybridFuelType : undefined,
                          hybridFuel: isHybrid ? row.hybridFuel : undefined,
                          hybridFuelUnit: isHybrid ? row.hybridFuelUnit : undefined,
                          hybridFuelQuantity: undefined,
                          hybridFuelFactor: undefined,
                          hybridFuelEmissions: undefined,
                          hybridTotalKwh: isHybrid ? row.hybridTotalKwh : undefined,
                          hybridGridPct: isHybrid ? row.hybridGridPct : undefined,
                          hybridRenewablePct: isHybrid ? row.hybridRenewablePct : undefined,
                          hybridOtherPct: isHybrid ? row.hybridOtherPct : undefined,
                          hybridGridCountry: isHybrid ? row.hybridGridCountry : undefined,
                          hybridOtherSources: isHybrid ? row.hybridOtherSources : undefined,
                          // Clear electricity fields if not electronics categories or cooling products
                          electricityTotalKwh: (isElectronicsCategory || isCoolingProducts) ? row.electricityTotalKwh : undefined,
                          electricityGridPct: (isElectronicsCategory || isCoolingProducts) ? row.electricityGridPct : undefined,
                          electricityRenewablePct: (isElectronicsCategory || isCoolingProducts) ? row.electricityRenewablePct : undefined,
                          electricityOtherPct: (isElectronicsCategory || isCoolingProducts) ? row.electricityOtherPct : undefined,
                          electricityGridCountry: (isElectronicsCategory || isCoolingProducts) ? row.electricityGridCountry : undefined,
                          electricityOtherSources: (isElectronicsCategory || isCoolingProducts) ? row.electricityOtherSources : undefined,
                          // Clear refrigerant fields if not Refrigerants sold or Cooling products
                          refrigerantType: (isRefrigerant || isCoolingProducts) ? row.refrigerantType : undefined,
                          refrigerantFactor: (isRefrigerant || isCoolingProducts) ? row.refrigerantFactor : undefined,
                          coolingRefrigerantQuantity: isCoolingProducts ? row.coolingRefrigerantQuantity : undefined,
                          // Clear fuel fields if not Gas-fired industrial machinery sold
                          gasMachineryFuelType: isGasMachinery ? row.gasMachineryFuelType : undefined,
                          gasMachineryFuel: isGasMachinery ? row.gasMachineryFuel : undefined,
                          gasMachineryUnit: isGasMachinery ? row.gasMachineryUnit : undefined,
                          gasMachineryQuantity: undefined,
                          gasMachineryFactor: undefined,
                          quantity: undefined,
                          emissions: undefined,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select processing activity" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" position="item-aligned" sideOffset={4}>
                        <SelectItem value="Internal combustion engine vehicles (cars, trucks, bikes)">Internal combustion engine vehicles (cars, trucks, bikes)</SelectItem>
                        <SelectItem value="Hybrid vehicles">Hybrid vehicles</SelectItem>
                        <SelectItem value="Electric vehicles (cars, 2-wheelers, buses)">Electric vehicles (cars, 2-wheelers, buses)</SelectItem>
                        <SelectItem value="Home appliances (ACs, fridges, fans, microwaves)">Home appliances (ACs, fridges, fans, microwaves)</SelectItem>
                        <SelectItem value="Cooling products (AC, refrigeration)">Cooling products (AC, refrigeration)</SelectItem>
                        <SelectItem value="Boilers, stoves, heaters (gas-based)">Boilers, stoves, heaters (gas-based)</SelectItem>
                        <SelectItem value="Electronics (laptops, TVs, phones)">Electronics (laptops, TVs, phones)</SelectItem>
                        <SelectItem value="Electric machinery/equipment">Electric machinery/equipment</SelectItem>
                        <SelectItem value="Gas-fired industrial machinery sold">Gas-fired industrial machinery sold</SelectItem>
                      <SelectItem value="Sold fuels (LPG, petrol, diesel)">Sold fuels (LPG, petrol, diesel)</SelectItem>
                      <SelectItem value="Refrigerants sold">Refrigerants sold</SelectItem>
                        <SelectItem value="Batteries">Batteries</SelectItem>
                        <SelectItem value="Water-using devices">Water-using devices</SelectItem>
                      </SelectContent>
                    </Select>
          </div>

                {/* Combustion Sections for Internal combustion engine vehicles */}
                {row.processingActivity === 'Internal combustion engine vehicles (cars, trucks, bikes)' && (
                  <div className="space-y-4 mb-4">
                    {/* Stationary Combustion Fields */}
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200 mb-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Stationary Combustion Details</h5>
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
                                  stationaryQuantity: undefined,
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
                                  Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).map(mainType => (
                                    <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                  ))
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
                                onUpdateRow(row.id, { 
                                  stationarySubFuelType: value,
                                  stationaryCo2Factor: selected?.['CO2 Factor'],
                                  stationaryUnit: selected?.['Units'],
                                  stationaryQuantity: undefined,
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
                              value={row.stationaryQuantity ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                                onUpdateRow(row.id, { stationaryQuantity: value });
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
                        {row.stationaryQuantity !== undefined && row.stationaryCo2Factor !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Stationary Emissions: <span className="font-semibold">{(row.stationaryQuantity * row.stationaryCo2Factor).toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                </div>

                    {/* Mobile Combustion Fields */}
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Mobile Combustion Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Fuel Type <FieldTooltip content="Select fuel type" />
                            </Label>
                            <Select 
                              value={row.mobileFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = mobileCombustionData.find(d => d['FuelType'] === value);
                                onUpdateRow(row.id, { 
                                  mobileFuelType: value,
                                  mobileKgCo2PerUnit: selected?.['kg CO2 per unit'],
                                  mobileUnit: selected?.['Unit'],
                                  mobileQuantity: undefined,
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
                              value={row.mobileQuantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                onUpdateRow(row.id, { mobileQuantity: value });
                              }}
                              disabled={!row.mobileFuelType}
                            />
                          </div>
                        </div>
                        {row.mobileQuantity !== undefined && row.mobileKgCo2PerUnit !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Mobile Emissions: <span className="font-semibold">{(row.mobileQuantity * row.mobileKgCo2PerUnit).toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    
                    {/* Total Emissions Display */}
                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-300">
                        <div className="text-sm font-semibold text-gray-900">
                          Total Emissions: <span className="text-teal-600">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Combustion Type Selection for Sold fuels (LPG, petrol, diesel) */}
                {row.processingActivity === 'Sold fuels (LPG, petrol, diesel)' && (
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
                                  stationaryQuantity: undefined,
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
                                  Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).map(mainType => (
                                    <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                  ))
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

                {/* Combustion Type Selection for Boilers, stoves, heaters (gas-based) */}
                {row.processingActivity === 'Boilers, stoves, heaters (gas-based)' && (
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
                                  stationaryQuantity: undefined,
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
                                  Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).map(mainType => (
                                    <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                  ))
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

                {/* Hybrid Vehicles - Scope 1 Fuel and Scope 2 Electricity */}
                {row.processingActivity === 'Hybrid vehicles' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Hybrid Vehicle Fuel & Energy Details</h4>
                    
                    {/* Scope 1 Style Fuel Selection */}
                    <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                      <h5 className="text-sm font-semibold text-purple-900 mb-3">Fuel</h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Type <FieldTooltip content="Select fuel type group" />
                          </Label>
                          <Select 
                            value={row.hybridFuelType || ''} 
                            onValueChange={(value) => {
                              onUpdateRow(row.id, { 
                                hybridFuelType: value as FuelType,
                                hybridFuel: undefined,
                                hybridFuelUnit: undefined,
                                hybridFuelFactor: undefined,
                                hybridFuelEmissions: undefined,
                                hybridFuelQuantity: undefined,
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
                            value={row.hybridFuel || ''} 
                            onValueChange={(value) => {
                              onUpdateRow(row.id, { 
                                hybridFuel: value,
                                hybridFuelUnit: undefined,
                                hybridFuelFactor: undefined,
                                hybridFuelEmissions: undefined,
                                hybridFuelQuantity: undefined,
                                emissions: undefined,
                              });
                            }}
                            disabled={!row.hybridFuelType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel" />
                            </SelectTrigger>
                            <SelectContent>
                              {row.hybridFuelType && Object.keys(FACTORS[row.hybridFuelType] || {}).map(f => (
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
                            value={row.hybridFuelUnit || ''} 
                            onValueChange={(value) => {
                              onUpdateRow(row.id, { hybridFuelUnit: value });
                            }}
                            disabled={!row.hybridFuelType || !row.hybridFuel}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {row.hybridFuelType && row.hybridFuel && Object.keys(FACTORS[row.hybridFuelType]?.[row.hybridFuel] || {}).map(u => (
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
                            value={row.hybridFuelQuantity ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { hybridFuelQuantity: value });
                            }}
                            disabled={!row.hybridFuelType || !row.hybridFuel || !row.hybridFuelUnit}
                          />
                        </div>
                      </div>
                      {row.hybridFuelFactor !== undefined && (
                        <div className="mt-2 text-sm text-gray-600">
                          Emission Factor: <span className="font-semibold">{row.hybridFuelFactor.toFixed(6)}</span>
                        </div>
                      )}
                      {row.hybridFuelEmissions !== undefined && (
                        <div className="mt-2 text-sm text-gray-600">
                          Fuel Emissions: <span className="font-semibold">{row.hybridFuelEmissions.toFixed(6)} kg CO2e</span>
                        </div>
                      )}
                    </div>

                    {/* Scope 2 Style Electricity Selection */}
                    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Electricity</h5>
                      
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
                            value={row.hybridTotalKwh ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { hybridTotalKwh: value });
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
                            value={row.hybridGridPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { hybridGridPct: value });
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
                            value={row.hybridRenewablePct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { hybridRenewablePct: value });
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
                            value={row.hybridOtherPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { hybridOtherPct: value });
                            }}
                          />
                        </div>
                      </div>

                      {/* Grid sources section */}
                      {row.hybridGridPct && row.hybridGridPct > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Electricity provider country <FieldTooltip content="Select country for grid factor" />
                            </Label>
                            <Select 
                              value={row.hybridGridCountry || ''} 
                              onValueChange={(v) => onUpdateRow(row.id, { hybridGridCountry: v as 'UAE' | 'Pakistan' })}
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
                        </div>
                      )}

                      {/* Other sources section */}
                      {row.hybridOtherPct && row.hybridOtherPct > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Other Energy Sources</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onAddHybridOtherSourceRow(row.id)}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Source
                            </Button>
                          </div>
                          {(row.hybridOtherSources || []).map((source) => (
                            <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded border">
                              <Select
                                value={source.type || ''}
                                onValueChange={(v) => onUpdateHybridOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined, factor: undefined, emissions: undefined })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(FACTORS).map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.fuel || ''}
                                onValueChange={(v) => onUpdateHybridOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined, factor: undefined, emissions: undefined })}
                                disabled={!source.type}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.unit || ''}
                                onValueChange={(v) => onUpdateHybridOtherSourceRow(row.id, source.id, { unit: v })}
                                disabled={!source.type || !source.fuel}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
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
                                placeholder="Quantity"
                                value={source.quantity ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  onUpdateHybridOtherSourceRow(row.id, source.id, { quantity: value });
                                }}
                                disabled={!source.type || !source.fuel || !source.unit}
                              />
                              <div className="flex items-center gap-2">
                                {source.emissions !== undefined && (
                                  <span className="text-xs text-gray-600 flex-1">
                                    {source.emissions.toFixed(2)} kg CO2e
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveHybridOtherSourceRow(row.id, source.id)}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                        {row.hybridFuelEmissions !== undefined && (
                          <div className="text-xs text-gray-600 mt-1">
                            (Fuel: {row.hybridFuelEmissions.toFixed(6)} kg CO2e)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Electricity Section for Electronics, Electric machinery, Batteries, Water-using devices, Electric vehicles, Home appliances */}
                {(row.processingActivity === 'Electronics (laptops, TVs, phones)' ||
                  row.processingActivity === 'Electric machinery/equipment' ||
                  row.processingActivity === 'Batteries' ||
                  row.processingActivity === 'Water-using devices' ||
                  row.processingActivity === 'Electric vehicles (cars, 2-wheelers, buses)' ||
                  row.processingActivity === 'Home appliances (ACs, fridges, fans, microwaves)') && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Electricity Consumption</h4>
                    
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
                          value={row.electricityTotalKwh ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { electricityTotalKwh: value });
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
                          value={row.electricityGridPct ?? ''}
                      onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { electricityGridPct: value });
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
                          value={row.electricityRenewablePct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { electricityRenewablePct: value });
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
                          value={row.electricityOtherPct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { electricityOtherPct: value });
                      }}
                    />
        </div>
                </div>

                    {/* Grid sources section */}
                    {row.electricityGridPct && row.electricityGridPct > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Electricity provider country <FieldTooltip content="Select country for grid factor" />
                          </Label>
                          <Select 
                            value={row.electricityGridCountry || ''} 
                            onValueChange={(v) => onUpdateRow(row.id, { electricityGridCountry: v as 'UAE' | 'Pakistan' })}
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
                            value={getGridFactor(row.electricityGridCountry) ?? ''} 
                            readOnly 
                            placeholder="Auto" 
                            className="bg-gray-100"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Grid emissions <FieldTooltip content="Calculated grid emissions" />
                          </Label>
                          <Input
                            readOnly
                            value={row.electricityTotalKwh && row.electricityGridPct && getGridFactor(row.electricityGridCountry)
                              ? ((row.electricityGridPct / 100) * row.electricityTotalKwh * getGridFactor(row.electricityGridCountry)!).toFixed(6)
                              : ''}
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* Other sources section */}
                    {row.electricityOtherPct && row.electricityOtherPct > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Other Energy Sources</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onAddElectricityOtherSourceRow(row.id)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Source
                          </Button>
                        </div>
                        {(row.electricityOtherSources || []).map((source) => (
                          <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded border">
                            <Select
                              value={source.type || ''}
                              onValueChange={(v) => onUpdateElectricityOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined, factor: undefined, emissions: undefined })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(FACTORS).map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={source.fuel || ''}
                              onValueChange={(v) => onUpdateElectricityOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined, factor: undefined, emissions: undefined })}
                              disabled={!source.type}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Fuel" />
                              </SelectTrigger>
                              <SelectContent>
                                {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={source.unit || ''}
                              onValueChange={(v) => onUpdateElectricityOtherSourceRow(row.id, source.id, { unit: v })}
                              disabled={!source.type || !source.fuel}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
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
                              placeholder="Quantity"
                              value={source.quantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                onUpdateElectricityOtherSourceRow(row.id, source.id, { quantity: value });
                              }}
                              disabled={!source.type || !source.fuel || !source.unit}
                            />
                            <div className="flex items-center gap-2">
                              {source.emissions !== undefined && (
                                <span className="text-xs text-gray-600 flex-1">
                                  {source.emissions.toFixed(2)} kg CO2e
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemoveElectricityOtherSourceRow(row.id, source.id)}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Electricity Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Refrigerant Section for Refrigerants sold */}
                {row.processingActivity === 'Refrigerants sold' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Refrigerant Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Refrigerant Type <FieldTooltip content="Select the type of refrigerant" />
                        </Label>
                        <Select 
                          value={row.refrigerantType || ''} 
                          onValueChange={(v) => onUpdateRow(row.id, { refrigerantType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select refrigerant type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(REFRIGERANT_FACTORS).map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Quantity (kg) <FieldTooltip content="Enter quantity in kilograms" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="999999999999.999999"
                          placeholder="Enter quantity"
                          value={row.quantity ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { quantity: value });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Emission Factor <FieldTooltip content="Auto-calculated based on refrigerant type" />
                        </Label>
                        <Input 
                          value={row.refrigerantFactor !== undefined ? row.refrigerantFactor.toFixed(5) : ''} 
                          readOnly 
                          placeholder="Auto" 
                          className="bg-gray-100"
                        />
                      </div>
                    </div>

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Refrigerant Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Cooling Products Section - Electricity (Scope 2) and Refrigerant (Scope 1) */}
                {row.processingActivity === 'Cooling products (AC, refrigeration)' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Cooling Products: Electricity & Refrigerant Details</h4>
                    
                    {/* Electricity Section (Scope 2 Style) */}
                    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200 mb-4">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Electricity Consumption</h5>
                      
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
                            value={row.electricityTotalKwh ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { electricityTotalKwh: value });
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
                            value={row.electricityGridPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { electricityGridPct: value });
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
                            value={row.electricityRenewablePct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { electricityRenewablePct: value });
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
                            value={row.electricityOtherPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { electricityOtherPct: value });
                            }}
                          />
                        </div>
                      </div>

                      {/* Grid sources section */}
                      {row.electricityGridPct && row.electricityGridPct > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Electricity provider country <FieldTooltip content="Select country for grid factor" />
                            </Label>
                            <Select 
                              value={row.electricityGridCountry || ''} 
                              onValueChange={(v) => onUpdateRow(row.id, { electricityGridCountry: v as 'UAE' | 'Pakistan' })}
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
                              value={getGridFactor(row.electricityGridCountry) ?? ''} 
                              readOnly 
                              placeholder="Auto" 
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Grid emissions <FieldTooltip content="Calculated grid emissions" />
                            </Label>
                            <Input
                              readOnly
                              value={row.electricityTotalKwh && row.electricityGridPct && getGridFactor(row.electricityGridCountry)
                                ? ((row.electricityGridPct / 100) * row.electricityTotalKwh * getGridFactor(row.electricityGridCountry)!).toFixed(6)
                                : ''}
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      )}

                      {/* Other sources section */}
                      {row.electricityOtherPct && row.electricityOtherPct > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Other Energy Sources</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onAddElectricityOtherSourceRow(row.id)}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Source
                            </Button>
                          </div>
                          {(row.electricityOtherSources || []).map((source) => (
                            <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded border">
                              <Select
                                value={source.type || ''}
                                onValueChange={(v) => onUpdateElectricityOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined, factor: undefined, emissions: undefined })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(FACTORS).map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.fuel || ''}
                                onValueChange={(v) => onUpdateElectricityOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined, factor: undefined, emissions: undefined })}
                                disabled={!source.type}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.unit || ''}
                                onValueChange={(v) => onUpdateElectricityOtherSourceRow(row.id, source.id, { unit: v })}
                                disabled={!source.type || !source.fuel}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
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
                                placeholder="Quantity"
                                value={source.quantity ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  onUpdateElectricityOtherSourceRow(row.id, source.id, { quantity: value });
                                }}
                                disabled={!source.type || !source.fuel || !source.unit}
                              />
                              <div className="flex items-center gap-2">
                                {source.emissions !== undefined && (
                                  <span className="text-xs text-gray-600 flex-1">
                                    {source.emissions.toFixed(2)} kg CO2e
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveElectricityOtherSourceRow(row.id, source.id)}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Refrigerant Section (Scope 1 Style) */}
                    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Refrigerant Details</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Refrigerant Type <FieldTooltip content="Select the type of refrigerant" />
                          </Label>
                          <Select 
                            value={row.refrigerantType || ''} 
                            onValueChange={(v) => onUpdateRow(row.id, { refrigerantType: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select refrigerant type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(REFRIGERANT_FACTORS).map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Quantity (kg) <FieldTooltip content="Enter quantity in kilograms" />
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            max="999999999999.999999"
                            placeholder="Enter quantity"
                            value={row.coolingRefrigerantQuantity ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              onUpdateRow(row.id, { coolingRefrigerantQuantity: value });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Emission Factor <FieldTooltip content="Auto-calculated based on refrigerant type" />
                          </Label>
                          <Input 
                            value={row.refrigerantFactor !== undefined ? row.refrigerantFactor.toFixed(5) : ''} 
                            readOnly 
                            placeholder="Auto" 
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Emissions (Electricity + Refrigerant): <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gas-fired Industrial Machinery Section - Fuel (Scope 1 Style) */}
                {row.processingActivity === 'Gas-fired industrial machinery sold' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Fuel Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Type <FieldTooltip content="Select fuel type group" />
                        </Label>
                        <Select 
                          value={row.gasMachineryFuelType || ''} 
                          onValueChange={(value) => {
                            onUpdateRow(row.id, { 
                              gasMachineryFuelType: value as FuelType,
                              gasMachineryFuel: undefined,
                              gasMachineryUnit: undefined,
                              gasMachineryFactor: undefined,
                              gasMachineryQuantity: undefined,
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
                          value={row.gasMachineryFuel || ''} 
                          onValueChange={(value) => {
                            onUpdateRow(row.id, { 
                              gasMachineryFuel: value,
                              gasMachineryUnit: undefined,
                              gasMachineryFactor: undefined,
                              gasMachineryQuantity: undefined,
                              emissions: undefined,
                            });
                          }}
                          disabled={!row.gasMachineryFuelType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.gasMachineryFuelType && Object.keys(FACTORS[row.gasMachineryFuelType] || {}).map(f => (
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
                          value={row.gasMachineryUnit || ''} 
                          onValueChange={(value) => {
                            onUpdateRow(row.id, { gasMachineryUnit: value });
                          }}
                          disabled={!row.gasMachineryFuelType || !row.gasMachineryFuel}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.gasMachineryFuelType && row.gasMachineryFuel && Object.keys(FACTORS[row.gasMachineryFuelType]?.[row.gasMachineryFuel] || {}).map(u => (
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
                          max="999999999999.999999"
                          placeholder="Enter quantity"
                          value={row.gasMachineryQuantity ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            onUpdateRow(row.id, { gasMachineryQuantity: value });
                          }}
                          disabled={!row.gasMachineryFuelType || !row.gasMachineryFuel || !row.gasMachineryUnit}
                        />
                      </div>
                    </div>

                    {row.gasMachineryFactor !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        Emission Factor: <span className="font-semibold">{row.gasMachineryFactor.toFixed(6)}</span>
                      </div>
                    )}

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Fuel Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
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
                  <span className="text-sm text-gray-600">Total Use Entries:</span> <span className="font-semibold text-lg">{rows.length}</span>
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

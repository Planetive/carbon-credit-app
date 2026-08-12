import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Info } from 'lucide-react';
import { FormulaConfig } from '../types/formula';
import { FieldTooltip } from "@/components/shared/finance/FieldTooltip";
import { passengerTypeTooltipText } from '@/components/emissions/shared/ukPassengerFactors';
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";
import { ComputedBox, InputSection } from "./InputLayout";

interface MotorVehicleLoanFormProps {
  selectedFormula: FormulaConfig | null;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
}

type FuelType = 'Petrol' | 'Diesel' | 'LPG' | 'CNG' | 'Electric';

interface VehicleEntry {
  id: string;
  name: string;
  activity: string;
  vehicleType: string;
  unit: string;
  distance: number;
  fuelConsumption: number;
  /** Fuel efficiency: L (or kWh for electric) per distance unit */
  efficiency: number;
  fuelType: FuelType;
  factor: number;
  emissions: number;
  totalValueAtOrigination: number;
}

const VEHICLE_ACTIVITIES = {
  "Cars (by market segment)": {
    "Mini": { km: 0.10828, miles: 0.17425 },
    "Supermini": { km: 0.13284, miles: 0.21378 },
    "Lower medium": { km: 0.14349, miles: 0.23092 },
    "Upper medium": { km: 0.16026, miles: 0.25792 },
    "Executive": { km: 0.16920, miles: 0.27230 },
    "Luxury": { km: 0.20464, miles: 0.32934 },
    "Sports": { km: 0.17155, miles: 0.27608 },
    "Dual purpose 4X4": { km: 0.19805, miles: 0.31874 },
    "MPV": { km: 0.17904, miles: 0.28814 },
  },
  "Cars (by size)": {
    "Small car": { km: 0.14172, miles: 0.22807 },
    "Medium car": { km: 0.17006, miles: 0.27368 },
    "Large car": { km: 0.20839, miles: 0.33537 },
    "Average car": { km: 0.17136, miles: 0.27578 },
  },
  "Motorbike": {
    "Small": { km: 0.08094, miles: 0.13027 },
    "Medium": { km: 0.09826, miles: 0.15813 },
    "Large": { km: 0.13072, miles: 0.21037 },
    "Average": { km: 0.11138, miles: 0.17925 },
  },
};

/** Fuel-specific emission factors for PCAF distance × efficiency × EF (tCO2e per L, or tCO2e/kWh for electric). */
const FUEL_EMISSION_FACTORS: Record<FuelType, number> = {
  Petrol: 0.00231,
  Diesel: 0.00268,
  LPG: 0.00151,
  CNG: 0.00186,
  Electric: 0.000233,
};

const TYPE_EFFICIENCY_L_PER_KM: Record<string, Record<string, number>> = {
  "Cars (by market segment)": {
    Mini: 0.05,
    Supermini: 0.055,
    "Lower medium": 0.065,
    "Upper medium": 0.075,
    Executive: 0.085,
    Luxury: 0.10,
    Sports: 0.095,
    "Dual purpose 4X4": 0.10,
    MPV: 0.085,
  },
  "Cars (by size)": {
    "Small car": 0.06,
    "Medium car": 0.08,
    "Large car": 0.10,
    "Average car": 0.08,
  },
  Motorbike: {
    Small: 0.03,
    Medium: 0.04,
    Large: 0.055,
    Average: 0.04,
  },
};

const AVERAGE_VEHICLE_EFFICIENCY = 0.08;
const ELECTRIC_KWH_PER_KM = 0.16;

const isFuelConsumptionOption = (formula: FormulaConfig | null) => formula?.optionCode === '1a';
const isTypeEfficiencyOption = (formula: FormulaConfig | null) => formula?.optionCode === '3a';
const isAverageEfficiencyOption = (formula: FormulaConfig | null) => formula?.optionCode === '3b';
const usesEfficiencyFormula = (formula: FormulaConfig | null) => {
  const code = formula?.optionCode;
  return code === '1b' || code === '2a' || code === '2b' || code === '3a' || code === '3b';
};

const distanceLabelFor = (formula: FormulaConfig | null) => {
  switch (formula?.optionCode) {
    case '1b':
      return 'Actual Distance Traveled';
    case '2a':
      return 'Local Statistical Distance';
    case '2b':
      return 'Regional Statistical Distance';
    case '3a':
    case '3b':
      return 'Statistical Distance';
    default:
      return 'Distance Traveled';
  }
};

const typeEfficiency = (activity: string, vehicleType: string, fuelType: FuelType) => {
  if (fuelType === 'Electric') return ELECTRIC_KWH_PER_KM;
  return TYPE_EFFICIENCY_L_PER_KM[activity]?.[vehicleType] ?? AVERAGE_VEHICLE_EFFICIENCY;
};

export const MotorVehicleLoanForm: React.FC<MotorVehicleLoanFormProps> = ({
  selectedFormula,
  formData: _formData,
  onUpdateFormData
}) => {
  const fuelPath = isFuelConsumptionOption(selectedFormula);
  const efficiencyPath = usesEfficiencyFormula(selectedFormula);
  const typeEfficiencyPath = isTypeEfficiencyOption(selectedFormula);
  const averageEfficiencyPath = isAverageEfficiencyOption(selectedFormula);
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>([]);
  const [hoveredInfo, setHoveredInfo] = useState<{value: string, description: string, position: {x: number, y: number}} | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setHoveredInfo(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHoveredInfo(null);
    };
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const resolveEntryEfficiency = (entry: VehicleEntry): number => {
    if (averageEfficiencyPath) {
      return entry.fuelType === 'Electric' ? ELECTRIC_KWH_PER_KM : AVERAGE_VEHICLE_EFFICIENCY;
    }
    if (typeEfficiencyPath) {
      return typeEfficiency(entry.activity, entry.vehicleType, entry.fuelType);
    }
    return entry.efficiency;
  };

  const computeEntryEmissions = (entry: VehicleEntry): number => {
    if (fuelPath) {
      return entry.fuelConsumption * entry.factor;
    }
    return entry.distance * entry.efficiency * entry.factor;
  };

  const calculateTotalEmissions = (entries: VehicleEntry[]) => {
    const totalEmissionsT = entries.reduce((sum, entry) => sum + entry.emissions, 0);
    const totalDistance = entries.reduce((sum, entry) => sum + entry.distance, 0);
    const totalFuel = entries.reduce((sum, entry) => sum + entry.fuelConsumption, 0);
    const totalValueAtOrigination = entries.reduce((sum, entry) => sum + (entry.totalValueAtOrigination || 0), 0);
    const avgFactor = entries.length > 0
      ? entries.reduce((sum, entry) => sum + entry.factor, 0) / entries.length
      : 0;
    const avgEfficiency = entries.length > 0
      ? entries.reduce((sum, entry) => sum + entry.efficiency, 0) / entries.length
      : 0;

    onUpdateFormData('total_vehicle_emissions', totalEmissionsT);
    onUpdateFormData('total_distance_traveled', totalDistance);
    onUpdateFormData('distance_traveled', totalDistance);
    onUpdateFormData('fuel_consumption', totalFuel);
    onUpdateFormData('total_value_at_origination', totalValueAtOrigination);
    onUpdateFormData('average_factor', avgFactor);
    onUpdateFormData('efficiency', avgEfficiency);
    onUpdateFormData('emission_factor', avgFactor);
  };

  const resolveFactor = (entry: VehicleEntry): number => {
    return FUEL_EMISSION_FACTORS[entry.fuelType] ?? 0;
  };

  const applyDerived = (entry: VehicleEntry): VehicleEntry => {
    const next = { ...entry, factor: resolveFactor(entry) };
    next.efficiency = resolveEntryEfficiency(next);
    next.emissions = computeEntryEmissions(next);
    return next;
  };

  const addVehicleEntry = () => {
    const vehicleNumber = vehicleEntries.length + 1;
    const draft = applyDerived({
      id: crypto.randomUUID(),
      name: `Vehicle ${vehicleNumber}`,
      activity: averageEfficiencyPath ? 'Cars (by size)' : 'Cars (by market segment)',
      vehicleType: averageEfficiencyPath ? 'Average car' : 'Mini',
      unit: 'km',
      distance: 0,
      fuelConsumption: 0,
      efficiency: AVERAGE_VEHICLE_EFFICIENCY,
      fuelType: 'Petrol',
      factor: 0,
      emissions: 0,
      totalValueAtOrigination: 0,
    });
    const updatedEntries = [...vehicleEntries, draft];
    setVehicleEntries(updatedEntries);
    calculateTotalEmissions(updatedEntries);
  };

  const removeVehicleEntry = (id: string) => {
    const updatedEntries = vehicleEntries.filter(entry => entry.id !== id);
    setVehicleEntries(updatedEntries);
    calculateTotalEmissions(updatedEntries);
  };

  const updateVehicleEntry = (id: string, field: keyof VehicleEntry, value: VehicleEntry[keyof VehicleEntry]) => {
    const updatedEntries = vehicleEntries.map(entry => {
      if (entry.id !== id) return entry;
      return applyDerived({ ...entry, [field]: value });
    });

    setVehicleEntries(updatedEntries);
    calculateTotalEmissions(updatedEntries);
  };

  React.useEffect(() => {
    if (vehicleEntries.length === 0) return;
    const recalculated = vehicleEntries.map((entry) => applyDerived(entry));
    setVehicleEntries(recalculated);
    calculateTotalEmissions(recalculated);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when option path changes
  }, [fuelPath, efficiencyPath, typeEfficiencyPath, averageEfficiencyPath]);

  const getVehicleTypes = (activity: string) => {
    return Object.keys(VEHICLE_ACTIVITIES[activity as keyof typeof VEHICLE_ACTIVITIES] || {});
  };

  const efficiencyUnitLabel = (unit: string, fuelType: FuelType) =>
    fuelType === 'Electric' ? `kWh/${unit}` : `L/${unit}`;

  const factorUnitLabel = (entry: VehicleEntry) =>
    entry.fuelType === 'Electric' ? 'tCO2e/kWh' : 'tCO2e/L';

  const emissionsUnitLabel = 'tCO2e';
  const efficiencyLocked = typeEfficiencyPath || averageEfficiencyPath;

  return (
    <InputSection
      title="Vehicles"
      description={
        fuelPath
          ? `${selectedFormula?.name || 'This option'} — fuel × emission factor`
          : `${selectedFormula?.name || 'This option'} — distance × efficiency × emission factor`
      }
      action={
        <Button type="button" onClick={addVehicleEntry} size="sm" className="h-8 border-[#E2E8F0]" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      }
    >
        <div className="space-y-3">

          {vehicleEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white py-8 text-center text-sm text-[#94A3B8]">
              Add a vehicle to enter activity data.
            </div>
          ) : (
            <div className="space-y-4">
              {vehicleEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-[#E8EEF0] bg-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="text"
                        value={entry.name}
                        onChange={(e) => updateVehicleEntry(entry.id, 'name', e.target.value)}
                        className="font-medium text-base border-none shadow-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 max-w-[200px]"
                        style={{ background: 'transparent' }}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeVehicleEntry(entry.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!fuelPath && !averageEfficiencyPath && (
                      <>
                        <div className="space-y-2">
                          <Label>Activity</Label>
                          <Select
                            value={entry.activity}
                            onValueChange={(value) => updateVehicleEntry(entry.id, 'activity', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(VEHICLE_ACTIVITIES).map((activity) => (
                                <SelectItem key={activity} value={activity}>
                                  {activity}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            Vehicle Type
                            <Info
                              className="h-4 w-4 text-muted-foreground cursor-help"
                              onMouseEnter={(e) => {
                                const description = passengerTypeTooltipText({}, entry.activity, entry.vehicleType);
                                setHoveredInfo({
                                  value: entry.vehicleType,
                                  description,
                                  position: { x: e.clientX, y: e.clientY }
                                });
                              }}
                              onMouseLeave={() => setHoveredInfo(null)}
                            />
                          </Label>
                          <Select
                            value={entry.vehicleType}
                            onValueChange={(value) => {
                              setHoveredInfo(null);
                              updateVehicleEntry(entry.id, 'vehicleType', value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getVehicleTypes(entry.activity).map((type) => (
                                <SelectItem
                                  key={type}
                                  value={type}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredInfo({
                                      value: type,
                                      description: passengerTypeTooltipText({}, entry.activity, type),
                                      position: { x: rect.right + 10, y: rect.top }
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredInfo(null)}
                                >
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}

                    {fuelPath ? (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Actual Fuel Consumption ({entry.fuelType === 'Electric' ? 'kWh' : 'L'})
                          <FieldTooltip content="Primary data on actual vehicle fuel (or electricity) consumption." />
                        </Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={entry.fuelConsumption || ''}
                          onChange={(e) => updateVehicleEntry(entry.id, 'fuelConsumption', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>{distanceLabelFor(selectedFormula)} ({entry.unit || 'km'})</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={entry.distance || ''}
                          onChange={(e) => updateVehicleEntry(entry.id, 'distance', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    )}

                    {efficiencyPath && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Fuel Efficiency ({efficiencyUnitLabel(entry.unit, entry.fuelType)})
                          <FieldTooltip content={
                            averageEfficiencyPath
                              ? 'Average-vehicle fuel efficiency (PCAF Option 3b).'
                              : typeEfficiencyPath
                                ? 'Fuel efficiency from the selected vehicle type (PCAF Option 3a).'
                                : 'Fuel (or electricity) used per distance unit. Example: 0.08 L/km ≈ 8 L/100 km.'
                          } />
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0.08"
                          value={entry.efficiency || ''}
                          disabled={efficiencyLocked}
                          className={efficiencyLocked ? 'bg-muted' : undefined}
                          onChange={(e) =>
                            updateVehicleEntry(entry.id, 'efficiency', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Fuel Type</Label>
                      <Select
                        value={entry.fuelType}
                        onValueChange={(value) =>
                          updateVehicleEntry(entry.id, 'fuelType', value as FuelType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(FUEL_EMISSION_FACTORS) as FuelType[]).map((fuel) => (
                            <SelectItem key={fuel} value={fuel}>
                              {fuel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Emission Factor ({factorUnitLabel(entry)})
                        <FieldTooltip content="Auto-filled from fuel type (tCO2e per litre, or per kWh for electric)" />
                      </Label>
                      <Input
                        type="number"
                        value={entry.factor}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Total Value at Origination (PKR)
                        <FieldTooltip content="The total amount of the motor vehicle loan for this vehicle when it was first approved or issued" />
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={entry.totalValueAtOrigination || ''}
                        onChange={(e) =>
                          updateVehicleEntry(entry.id, 'totalValueAtOrigination', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium text-gray-700">Calculated Emissions:</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {entry.emissions.toFixed(6)} {emissionsUnitLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fuelPath
                        ? `${entry.fuelConsumption} × ${entry.factor} = ${entry.emissions.toFixed(6)} tCO2e`
                        : `${entry.distance} × ${entry.efficiency} × ${entry.factor} = ${entry.emissions.toFixed(6)} tCO2e`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {vehicleEntries.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {fuelPath ? (
              <ComputedBox
                label="Total fuel"
                value={vehicleEntries.reduce((sum, entry) => sum + entry.fuelConsumption, 0).toFixed(2)}
                unit={vehicleEntries[0]?.fuelType === 'Electric' ? 'kWh' : 'L'}
              />
            ) : (
              <ComputedBox
                label="Total distance"
                value={vehicleEntries.reduce((sum, entry) => sum + entry.distance, 0).toFixed(2)}
                unit={vehicleEntries[0]?.unit || 'km'}
              />
            )}
            {efficiencyPath && (
              <ComputedBox
                label="Avg efficiency"
                value={(
                  vehicleEntries.reduce((sum, entry) => sum + entry.efficiency, 0) /
                  vehicleEntries.length
                ).toFixed(4)}
                unit={efficiencyUnitLabel(vehicleEntries[0]?.unit || 'km', vehicleEntries[0]?.fuelType || 'Petrol')}
              />
            )}
            <ComputedBox
              label="Emissions"
              value={vehicleEntries.reduce((sum, entry) => sum + entry.emissions, 0).toFixed(4)}
              unit="tCO₂e"
            />
            <ComputedBox
              label="Value at origination"
              value={vehicleEntries
                .reduce((sum, entry) => sum + (entry.totalValueAtOrigination || 0), 0)
                .toLocaleString()}
              unit="PKR"
            />
            <ComputedBox label="Vehicles" value={String(vehicleEntries.length)} />
          </div>
        )}

      {hoveredInfo && (
        <div
          className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            left: `${hoveredInfo.position.x}px`,
            top: `${hoveredInfo.position.y}px`,
          }}
        >
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm transform -translate-y-2">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                <Info className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-sm mb-2">{hoveredInfo.value}</h4>
                <p className="text-sm text-gray-600 leading-relaxed">{hoveredInfo.description}</p>
              </div>
            </div>
            <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"></div>
            <div className="absolute -left-3 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-gray-200"></div>
          </div>
        </div>
      )}
    </InputSection>
  );
};

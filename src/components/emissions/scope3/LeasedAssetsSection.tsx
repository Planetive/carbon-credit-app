import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FACTORS, SCOPE2_FACTORS, VEHICLE_FACTORS, DELIVERY_VEHICLE_FACTORS, REFRIGERANT_FACTORS } from "../shared/EmissionFactors";

interface LeasedAssetsSectionProps {
  type: 'upstream' | 'downstream';
  onSave?: (data: any) => void;
}

type FuelType = "Gaseous fuels" | "Liquid fuels" | "Solid fuels";

interface OtherSourceRow {
  id: string;
  type?: FuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
}

interface TransportRow {
  id: string;
  activity?: string;
  vehicleTypeName?: string;
  unit?: string;
  distance?: number;
  factor?: number;
  emissions?: number;
}

interface RefrigerantRow {
  id: string;
  refrigerantType?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
}

const LeasedAssetsSection: React.FC<LeasedAssetsSectionProps> = ({ type, onSave }) => {
  const { toast } = useToast();
  
  // Category selection
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // Buildings & Facilities state
  const [totalKwh, setTotalKwh] = useState<number | undefined>();
  const [gridPct, setGridPct] = useState<number | undefined>();
  const [renewablePct, setRenewablePct] = useState<number | undefined>();
  const [otherPct, setOtherPct] = useState<number | undefined>();
  const [gridCountry, setGridCountry] = useState<"UAE" | "Pakistan" | undefined>();
  const gridFactor = useMemo(() => gridCountry ? SCOPE2_FACTORS.GridCountries[gridCountry] : undefined, [gridCountry]);
  const [otherRows, setOtherRows] = useState<OtherSourceRow[]>([]);
  
  // Transport & Logistics state
  const [transportRows, setTransportRows] = useState<TransportRow[]>([]);
  
  // Equipment & Machinery state
  const [equipmentTotalKwh, setEquipmentTotalKwh] = useState<number | undefined>();
  const [equipmentGridPct, setEquipmentGridPct] = useState<number | undefined>();
  const [equipmentRenewablePct, setEquipmentRenewablePct] = useState<number | undefined>();
  const [equipmentOtherPct, setEquipmentOtherPct] = useState<number | undefined>();
  const [equipmentGridCountry, setEquipmentGridCountry] = useState<"UAE" | "Pakistan" | undefined>();
  const equipmentGridFactor = useMemo(() => equipmentGridCountry ? SCOPE2_FACTORS.GridCountries[equipmentGridCountry] : undefined, [equipmentGridCountry]);
  const [equipmentOtherRows, setEquipmentOtherRows] = useState<OtherSourceRow[]>([]);
  const [equipmentTransportRows, setEquipmentTransportRows] = useState<TransportRow[]>([]);
  
  // Infrastructure & Utilities state
  const [infrastructureTotalKwh, setInfrastructureTotalKwh] = useState<number | undefined>();
  const [infrastructureGridPct, setInfrastructureGridPct] = useState<number | undefined>();
  const [infrastructureRenewablePct, setInfrastructureRenewablePct] = useState<number | undefined>();
  const [infrastructureOtherPct, setInfrastructureOtherPct] = useState<number | undefined>();
  const [infrastructureGridCountry, setInfrastructureGridCountry] = useState<"UAE" | "Pakistan" | undefined>();
  const infrastructureGridFactor = useMemo(() => infrastructureGridCountry ? SCOPE2_FACTORS.GridCountries[infrastructureGridCountry] : undefined, [infrastructureGridCountry]);
  const [infrastructureOtherRows, setInfrastructureOtherRows] = useState<OtherSourceRow[]>([]);
  const [infrastructureRefrigerantRows, setInfrastructureRefrigerantRows] = useState<RefrigerantRow[]>([]);
  
  // Helper functions
  const fuelTypes = Object.keys(FACTORS) as FuelType[];
  const fuelsFor = (type?: FuelType) => (type ? Object.keys(FACTORS[type]) : []);
  const unitsFor = (type?: FuelType, fuel?: string) => (type && fuel ? Object.keys(FACTORS[type][fuel]) : []);
  
  const vehicleActivities = Object.keys(VEHICLE_FACTORS);
  const deliveryActivities = Object.keys(DELIVERY_VEHICLE_FACTORS);
  // Combine all activities into one list
  const allActivities = [...vehicleActivities, ...deliveryActivities];
  
  // Helper to determine if activity is passenger or delivery
  const isPassengerActivity = (activity?: string) => activity ? vehicleActivities.includes(activity) : false;
  const isDeliveryActivity = (activity?: string) => activity ? deliveryActivities.includes(activity) : false;
  
  // Get vehicle types based on activity (auto-detect passenger or delivery)
  const vehicleTypesFor = (activity?: string) => {
    if (!activity) return [];
    if (isPassengerActivity(activity)) {
      return Object.keys(VEHICLE_FACTORS[activity] || {});
    } else if (isDeliveryActivity(activity)) {
      return Object.keys(DELIVERY_VEHICLE_FACTORS[activity] || {});
    }
    return [];
  };
  
  // Get units based on activity and vehicle type (auto-detect passenger or delivery)
  const vehicleUnitsFor = (activity?: string, vehicleType?: string) => {
    if (!activity || !vehicleType) return [];
    if (isPassengerActivity(activity)) {
      return Object.keys(VEHICLE_FACTORS[activity]?.[vehicleType] || {});
    } else if (isDeliveryActivity(activity)) {
      return Object.keys(DELIVERY_VEHICLE_FACTORS[activity]?.[vehicleType] || {});
    }
    return [];
  };
  
  // Buildings & Facilities calculations
  const gridEmissions = useMemo(() => {
    if (!totalKwh || !gridPct || !gridFactor) return 0;
    return Number(((gridPct / 100) * totalKwh * gridFactor).toFixed(6));
  }, [totalKwh, gridPct, gridFactor]);
  
  const totalOtherEmissions = useMemo(() => {
    return otherRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [otherRows]);
  
  const computedElectricityEmissions = useMemo(() => {
    if (!totalKwh) return 0;
    const gridPart = gridPct && gridCountry && gridFactor ? (gridPct / 100) * totalKwh * gridFactor : 0;
    const renewablePart = renewablePct ? 0 : 0; // zero by definition
    let otherPart = 0;
    if (otherPct && otherPct > 0 && otherRows.length > 0) {
      const sumOtherEmissions = otherRows.reduce((s, r) => s + (r.emissions || 0), 0);
      otherPart = (otherPct / 100) * totalKwh * sumOtherEmissions;
    }
    return Number((gridPart + renewablePart + otherPart).toFixed(6));
  }, [totalKwh, gridPct, gridCountry, gridFactor, renewablePct, otherPct, otherRows]);
  
  // Transport calculations
  const totalTransportEmissions = useMemo(() => {
    return transportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [transportRows]);
  
  // Equipment & Machinery calculations
  const equipmentGridEmissions = useMemo(() => {
    if (!equipmentTotalKwh || !equipmentGridPct || !equipmentGridFactor) return 0;
    return Number(((equipmentGridPct / 100) * equipmentTotalKwh * equipmentGridFactor).toFixed(6));
  }, [equipmentTotalKwh, equipmentGridPct, equipmentGridFactor]);
  
  const equipmentTotalOtherEmissions = useMemo(() => {
    return equipmentOtherRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [equipmentOtherRows]);
  
  const equipmentComputedElectricityEmissions = useMemo(() => {
    if (!equipmentTotalKwh) return 0;
    const gridPart = equipmentGridPct && equipmentGridCountry && equipmentGridFactor ? (equipmentGridPct / 100) * equipmentTotalKwh * equipmentGridFactor : 0;
    const renewablePart = equipmentRenewablePct ? 0 : 0; // zero by definition
    let otherPart = 0;
    if (equipmentOtherPct && equipmentOtherPct > 0 && equipmentOtherRows.length > 0) {
      const sumOtherEmissions = equipmentOtherRows.reduce((s, r) => s + (r.emissions || 0), 0);
      otherPart = (equipmentOtherPct / 100) * equipmentTotalKwh * sumOtherEmissions;
    }
    return Number((gridPart + renewablePart + otherPart).toFixed(6));
  }, [equipmentTotalKwh, equipmentGridPct, equipmentGridCountry, equipmentGridFactor, equipmentRenewablePct, equipmentOtherPct, equipmentOtherRows]);
  
  const equipmentTotalTransportEmissions = useMemo(() => {
    return equipmentTransportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [equipmentTransportRows]);
  
  const equipmentTotalEmissions = useMemo(() => {
    return equipmentComputedElectricityEmissions + equipmentTotalTransportEmissions;
  }, [equipmentComputedElectricityEmissions, equipmentTotalTransportEmissions]);
  
  // Infrastructure & Utilities calculations
  const infrastructureGridEmissions = useMemo(() => {
    if (!infrastructureTotalKwh || !infrastructureGridPct || !infrastructureGridFactor) return 0;
    return Number(((infrastructureGridPct / 100) * infrastructureTotalKwh * infrastructureGridFactor).toFixed(6));
  }, [infrastructureTotalKwh, infrastructureGridPct, infrastructureGridFactor]);
  
  const infrastructureTotalOtherEmissions = useMemo(() => {
    return infrastructureOtherRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [infrastructureOtherRows]);
  
  const infrastructureComputedElectricityEmissions = useMemo(() => {
    if (!infrastructureTotalKwh) return 0;
    const gridPart = infrastructureGridPct && infrastructureGridCountry && infrastructureGridFactor ? (infrastructureGridPct / 100) * infrastructureTotalKwh * infrastructureGridFactor : 0;
    const renewablePart = infrastructureRenewablePct ? 0 : 0; // zero by definition
    let otherPart = 0;
    if (infrastructureOtherPct && infrastructureOtherPct > 0 && infrastructureOtherRows.length > 0) {
      const sumOtherEmissions = infrastructureOtherRows.reduce((s, r) => s + (r.emissions || 0), 0);
      otherPart = (infrastructureOtherPct / 100) * infrastructureTotalKwh * sumOtherEmissions;
    }
    return Number((gridPart + renewablePart + otherPart).toFixed(6));
  }, [infrastructureTotalKwh, infrastructureGridPct, infrastructureGridCountry, infrastructureGridFactor, infrastructureRenewablePct, infrastructureOtherPct, infrastructureOtherRows]);
  
  const infrastructureTotalRefrigerantEmissions = useMemo(() => {
    return infrastructureRefrigerantRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [infrastructureRefrigerantRows]);
  
  const infrastructureTotalEmissions = useMemo(() => {
    return infrastructureComputedElectricityEmissions + infrastructureTotalRefrigerantEmissions;
  }, [infrastructureComputedElectricityEmissions, infrastructureTotalRefrigerantEmissions]);
  
  // Helper functions - Buildings & Facilities
  const addOtherRow = () => {
    setOtherRows(prev => [...prev, { id: crypto.randomUUID() }]);
  };
  
  const removeOtherRow = (id: string) => {
    setOtherRows(prev => prev.filter(r => r.id !== id));
  };
  
  const updateOtherRow = (id: string, updates: Partial<OtherSourceRow>) => {
    setOtherRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: OtherSourceRow = { ...r, ...updates };
      if (next.type && next.fuel && next.unit) {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
        next.factor = typeof factor === 'number' ? factor : undefined;
      }
      if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
        next.emissions = Number((next.quantity * next.factor).toFixed(6));
      } else {
        next.emissions = undefined;
      }
      return next;
    }));
  };
  
  // Helper functions - Transport
  const updateTransportRow = (id: string, updates: Partial<TransportRow>) => {
    setTransportRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      
      // Calculate emissions - auto-detect which factor table to use based on activity
      if (updated.activity && updated.vehicleTypeName && updated.unit && typeof updated.distance === 'number') {
        let factor: number | undefined;
        
        if (isPassengerActivity(updated.activity)) {
          factor = VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        } else if (isDeliveryActivity(updated.activity)) {
          factor = DELIVERY_VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        }
        
        if (factor) {
          updated.factor = factor;
          updated.emissions = updated.distance * factor;
        } else {
          updated.factor = undefined;
          updated.emissions = undefined;
        }
      } else {
        updated.factor = undefined;
        updated.emissions = undefined;
      }
      
      return updated;
    }));
  };

  const addTransportRow = () => {
    setTransportRows(prev => [...prev, {
      id: `transport-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeTransportRow = (id: string) => {
    setTransportRows(prev => prev.filter(r => r.id !== id));
  };
  
  // Helper functions - Equipment & Machinery
  const updateEquipmentOtherRow = (id: string, updates: Partial<OtherSourceRow>) => {
    setEquipmentOtherRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
      if (next.type && next.fuel && next.unit && typeof next.quantity === 'number') {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
        if (factor) {
          next.factor = factor;
          next.emissions = Number((next.quantity * next.factor).toFixed(6));
        } else {
          next.factor = undefined;
          next.emissions = undefined;
        }
      } else {
        next.factor = undefined;
        next.emissions = undefined;
      }
      return next;
    }));
  };
  
  const addEquipmentOtherRow = () => {
    setEquipmentOtherRows(prev => [...prev, {
      id: `equipment-other-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeEquipmentOtherRow = (id: string) => {
    setEquipmentOtherRows(prev => prev.filter(r => r.id !== id));
  };
  
  const updateEquipmentTransportRow = (id: string, updates: Partial<TransportRow>) => {
    setEquipmentTransportRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      
      // Calculate emissions - auto-detect which factor table to use based on activity
      if (updated.activity && updated.vehicleTypeName && updated.unit && typeof updated.distance === 'number') {
        let factor: number | undefined;
        
        if (isPassengerActivity(updated.activity)) {
          factor = VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        } else if (isDeliveryActivity(updated.activity)) {
          factor = DELIVERY_VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        }
        
        if (factor) {
          updated.factor = factor;
          updated.emissions = updated.distance * factor;
        } else {
          updated.factor = undefined;
          updated.emissions = undefined;
        }
      } else {
        updated.factor = undefined;
        updated.emissions = undefined;
      }
      
      return updated;
    }));
  };

  const addEquipmentTransportRow = () => {
    setEquipmentTransportRows(prev => [...prev, {
      id: `equipment-transport-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeEquipmentTransportRow = (id: string) => {
    setEquipmentTransportRows(prev => prev.filter(r => r.id !== id));
  };
  
  // Helper functions - Infrastructure & Utilities
  const updateInfrastructureOtherRow = (id: string, updates: Partial<OtherSourceRow>) => {
    setInfrastructureOtherRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
      if (next.type && next.fuel && next.unit && typeof next.quantity === 'number') {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
        if (factor) {
          next.factor = factor;
          next.emissions = Number((next.quantity * next.factor).toFixed(6));
        } else {
          next.factor = undefined;
          next.emissions = undefined;
        }
      } else {
        next.factor = undefined;
        next.emissions = undefined;
      }
      return next;
    }));
  };
  
  const addInfrastructureOtherRow = () => {
    setInfrastructureOtherRows(prev => [...prev, {
      id: `infrastructure-other-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeInfrastructureOtherRow = (id: string) => {
    setInfrastructureOtherRows(prev => prev.filter(r => r.id !== id));
  };
  
  const updateInfrastructureRefrigerantRow = (id: string, updates: Partial<RefrigerantRow>) => {
    setInfrastructureRefrigerantRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
      if (next.refrigerantType) {
        const factor = REFRIGERANT_FACTORS[next.refrigerantType];
        next.factor = typeof factor === 'number' ? factor : undefined;
      } else {
        next.factor = undefined;
      }
      if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
        next.emissions = Number((next.quantity * next.factor).toFixed(6));
      } else {
        next.emissions = undefined;
      }
      return next;
    }));
  };
  
  const addInfrastructureRefrigerantRow = () => {
    setInfrastructureRefrigerantRows(prev => [...prev, {
      id: `infrastructure-refrigerant-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeInfrastructureRefrigerantRow = (id: string) => {
    setInfrastructureRefrigerantRows(prev => prev.filter(r => r.id !== id));
  };
  
  const title = type === 'upstream' ? 'Upstream Leased Assets' : 'Downstream Leased Assets';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">Asset categories, energy consumption, tenant activities</p>
        </div>
      </div>
      
      {/* Category Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buildings">Buildings & Facilities</SelectItem>
              <SelectItem value="transport">Transport & Logistics</SelectItem>
              <SelectItem value="equipment">Equipment & Machinery</SelectItem>
              <SelectItem value="infrastructure">Infrastructure & Utilities</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Buildings & Facilities Form (Scope 2 Electricity) */}
      {selectedCategory === 'buildings' && (
        <div className="space-y-6 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Buildings & Facilities - Electricity Consumption</h4>
              <p className="text-sm text-gray-600">Enter electricity consumption data for leased buildings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <Label>Total electricity consumption (kWh)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                max="999999999999.999999"
                value={totalKwh ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setTotalKwh(undefined);
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0 && numValue <= 999999999999.999999) {
                      setTotalKwh(numValue);
                    }
                  }
                }}
                placeholder="e.g., 120000"
              />
            </div>
            <div>
              <Label>Grid Energy (%)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                max="100"
                value={gridPct ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setGridPct(undefined);
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0 && numValue <= 100) {
                      setGridPct(numValue);
                    }
                  }
                }}
                placeholder="e.g., 60"
              />
            </div>
            <div>
              <Label>Renewable Energy (%)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                max="100"
                value={renewablePct ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setRenewablePct(undefined);
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0 && numValue <= 100) {
                      setRenewablePct(numValue);
                    }
                  }
                }}
                placeholder="e.g., 30"
              />
            </div>
            <div>
              <Label>Other sources (%)</Label>
              <Input
                type="number"
                step="any"
                min="0"
                max="100"
                value={otherPct ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setOtherPct(undefined);
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0 && numValue <= 100) {
                      setOtherPct(numValue);
                    }
                  }
                }}
                placeholder="e.g., 10"
              />
            </div>
          </div>

          {/* Grid sources section - always show when Buildings & Facilities is selected */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <h3 className="text-lg font-medium mb-4">Grid sources</h3>
              <Label>Electricity provider country</Label>
              <Select value={gridCountry} onValueChange={v => setGridCountry(v as any)}>
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
              <Label>Grid emission factor</Label>
              <Input value={gridFactor ?? ''} readOnly placeholder="Auto" />
            </div>
            <div>
              <Label>Grid emissions</Label>
              <Input
                readOnly
                value={gridEmissions || ''}
              />
            </div>
            {gridPct && gridPct > 0 && (
              <div className="md:col-span-3 text-gray-700 font-medium">
                Grid sources emissions: <span className="font-semibold">{gridEmissions.toFixed(6)} kg CO2e</span>
              </div>
            )}
          </div>

          {/* Other sources section - always show when Buildings & Facilities is selected */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Other sources</h3>
              <Button onClick={addOtherRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add Row
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Label className="text-gray-500">Type</Label>
              <Label className="text-gray-500">Fuel</Label>
              <Label className="text-gray-500">Unit</Label>
              <Label className="text-gray-500">Quantity</Label>
              <div />
            </div>

            <div className="space-y-3">
              {otherRows.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No other sources added yet. Click "Add Row" to add one.
                </div>
              ) : (
                otherRows.map(r => (
                  <div key={r.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-gray-50">
                    <Select
                      value={r.type}
                      onValueChange={v => updateOtherRow(r.id, { type: v as FuelType, fuel: undefined, unit: undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select
                      value={r.fuel}
                      onValueChange={v => updateOtherRow(r.id, { fuel: v, unit: undefined })}
                      disabled={!r.type}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelsFor(r.type).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select
                      value={r.unit}
                      onValueChange={v => updateOtherRow(r.id, { unit: v })}
                      disabled={!r.type || !r.fuel}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitsFor(r.type, r.fuel).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      step="any"
                      min="0"
                      max="999999999999.999999"
                      value={r.quantity ?? ''}
                      onChange={e => {
                        const value = e.target.value;
                        if (value === '') {
                          updateOtherRow(r.id, { quantity: undefined });
                        } else {
                          const numValue = Number(value);
                          if (numValue >= 0 && numValue <= 999999999999.999999) {
                            updateOtherRow(r.id, { quantity: numValue });
                          }
                        }
                      }}
                      placeholder="Enter quantity"
                    />

                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" className="text-red-600" onClick={() => removeOtherRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="text-gray-700 font-medium">
              Other sources emissions: <span className="font-semibold">{totalOtherEmissions.toFixed(6)} kg CO2e</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-gray-900 font-medium">
              Total electricity emissions: <span className="font-semibold">{computedElectricityEmissions.toFixed(6)} kg CO2e</span>
            </div>
            <Button onClick={() => toast({ title: 'Saved', description: 'Buildings & Facilities data saved (frontend only for now).' })} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </div>
      )}
      
      {/* Transport & Logistics Form (Combined Passenger + Delivery Vehicles) */}
      {selectedCategory === 'transport' && (
        <div className="space-y-6 border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Transport & Logistics</h4>
              <p className="text-sm text-gray-600">Passenger and delivery vehicle usage for leased transport assets</p>
            </div>
            <Button onClick={addTransportRow} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />Add Vehicle
            </Button>
          </div>

          {/* Combined Vehicles List */}
          {transportRows.length > 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-4">
                <Label className="text-gray-500 font-medium">Activity</Label>
                <Label className="text-gray-500 font-medium">Type</Label>
                <Label className="text-gray-500 font-medium">Unit</Label>
                <Label className="text-gray-500 font-medium">Distance</Label>
              </div>
              <div className="space-y-3">
                {transportRows.map((r) => (
                  <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <Select 
                      value={r.activity} 
                      onValueChange={(v) => updateTransportRow(r.id, { activity: v, vehicleTypeName: undefined, unit: undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity" />
                      </SelectTrigger>
                      <SelectContent>
                        {allActivities.map(activity => (
                          <SelectItem key={activity} value={activity}>{activity}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={r.vehicleTypeName} 
                      onValueChange={(v) => updateTransportRow(r.id, { vehicleTypeName: v, unit: undefined })} 
                      disabled={!r.activity}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypesFor(r.activity).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={r.unit} 
                      onValueChange={(v) => updateTransportRow(r.id, { unit: v })} 
                      disabled={!r.activity || !r.vehicleTypeName}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleUnitsFor(r.activity, r.vehicleTypeName).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        step="any" 
                        min="0"
                        max="999999999999.999999"
                        value={r.distance ?? ''} 
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateTransportRow(r.id, { distance: undefined });
                          } else {
                            const numValue = Number(value);
                            if (numValue >= 0 && numValue <= 999999999999.999999) {
                              updateTransportRow(r.id, { distance: numValue });
                            }
                          }
                        }} 
                        placeholder="Enter distance"
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeTransportRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-gray-900 font-medium">
              Total transport emissions: <span className="font-semibold">{totalTransportEmissions.toFixed(6)} kg CO2e</span>
            </div>
            <Button onClick={() => toast({ title: 'Saved', description: 'Transport & Logistics data saved (frontend only for now).' })} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </div>
      )}
      
      {/* Equipment & Machinery Form (Electricity + Transport) */}
      {selectedCategory === 'equipment' && (
        <div className="space-y-6 border-t pt-6">
          {/* Electricity Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Equipment & Machinery - Electricity Consumption</h4>
                <p className="text-sm text-gray-600">Enter electricity consumption data for leased equipment</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <Label>Total electricity consumption (kWh)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="999999999999.999999"
                  value={equipmentTotalKwh ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEquipmentTotalKwh(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        setEquipmentTotalKwh(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 120000"
                />
              </div>
              <div>
                <Label>Grid Energy (%)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={equipmentGridPct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEquipmentGridPct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setEquipmentGridPct(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 60"
                />
              </div>
              <div>
                <Label>Renewable Energy (%)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={equipmentRenewablePct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEquipmentRenewablePct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setEquipmentRenewablePct(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 30"
                />
              </div>
              <div>
                <Label>Other sources (%)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={equipmentOtherPct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setEquipmentOtherPct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setEquipmentOtherPct(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            {/* Grid sources section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <h3 className="text-lg font-medium mb-4">Grid sources</h3>
                <Label>Electricity provider country</Label>
                <Select value={equipmentGridCountry} onValueChange={v => setEquipmentGridCountry(v as any)}>
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
                <Label>Grid emission factor</Label>
                <Input value={equipmentGridFactor ?? ''} readOnly placeholder="Auto" />
              </div>
              <div>
                <Label>Grid emissions</Label>
                <Input
                  readOnly
                  value={equipmentGridEmissions || ''}
                />
              </div>
              {equipmentGridPct && equipmentGridPct > 0 && (
                <div className="md:col-span-3 text-gray-700 font-medium">
                  Grid sources emissions: <span className="font-semibold">{equipmentGridEmissions.toFixed(6)} kg CO2e</span>
                </div>
              )}
            </div>

            {/* Other sources section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Other sources</h3>
                <Button onClick={addEquipmentOtherRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add Row
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Label className="text-gray-500">Type</Label>
                <Label className="text-gray-500">Fuel</Label>
                <Label className="text-gray-500">Unit</Label>
                <Label className="text-gray-500">Quantity</Label>
                <div />
              </div>

              <div className="space-y-3">
                {equipmentOtherRows.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No other sources added yet. Click "Add Row" to add one.
                  </div>
                ) : (
                  equipmentOtherRows.map(r => (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-gray-50">
                      <Select
                        value={r.type}
                        onValueChange={v => updateEquipmentOtherRow(r.id, { type: v as FuelType, fuel: undefined, unit: undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {fuelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select
                        value={r.fuel}
                        onValueChange={v => updateEquipmentOtherRow(r.id, { fuel: v, unit: undefined })}
                        disabled={!r.type}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel" />
                        </SelectTrigger>
                        <SelectContent>
                          {fuelsFor(r.type).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select
                        value={r.unit}
                        onValueChange={v => updateEquipmentOtherRow(r.id, { unit: v })}
                        disabled={!r.type || !r.fuel}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitsFor(r.type, r.fuel).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="999999999999.999999"
                        value={r.quantity ?? ''}
                        onChange={e => {
                          const value = e.target.value;
                          if (value === '') {
                            updateEquipmentOtherRow(r.id, { quantity: undefined });
                          } else {
                            const numValue = Number(value);
                            if (numValue >= 0 && numValue <= 999999999999.999999) {
                              updateEquipmentOtherRow(r.id, { quantity: numValue });
                            }
                          }
                        }}
                        placeholder="Enter quantity"
                      />

                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" className="text-red-600" onClick={() => removeEquipmentOtherRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-gray-700 font-medium">
                Other sources emissions: <span className="font-semibold">{equipmentTotalOtherEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-gray-900 font-medium">
                Total electricity emissions: <span className="font-semibold">{equipmentComputedElectricityEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>
          </div>

          {/* Transport Section */}
          <div className="space-y-6 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Equipment & Machinery - Transport</h4>
                <p className="text-sm text-gray-600">Passenger and delivery vehicle usage for leased equipment</p>
              </div>
              <Button onClick={addEquipmentTransportRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add Vehicle
              </Button>
            </div>

            {/* Combined Vehicles List */}
            {equipmentTransportRows.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-4">
                  <Label className="text-gray-500 font-medium">Activity</Label>
                  <Label className="text-gray-500 font-medium">Type</Label>
                  <Label className="text-gray-500 font-medium">Unit</Label>
                  <Label className="text-gray-500 font-medium">Distance</Label>
                </div>
                <div className="space-y-3">
                  {equipmentTransportRows.map((r) => (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                      <Select 
                        value={r.activity} 
                        onValueChange={(v) => updateEquipmentTransportRow(r.id, { activity: v, vehicleTypeName: undefined, unit: undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {allActivities.map(activity => (
                            <SelectItem key={activity} value={activity}>{activity}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={r.vehicleTypeName} 
                        onValueChange={(v) => updateEquipmentTransportRow(r.id, { vehicleTypeName: v, unit: undefined })} 
                        disabled={!r.activity}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypesFor(r.activity).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={r.unit} 
                        onValueChange={(v) => updateEquipmentTransportRow(r.id, { unit: v })} 
                        disabled={!r.activity || !r.vehicleTypeName}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleUnitsFor(r.activity, r.vehicleTypeName).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          step="any" 
                          min="0"
                          max="999999999999.999999"
                          value={r.distance ?? ''} 
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '') {
                              updateEquipmentTransportRow(r.id, { distance: undefined });
                            } else {
                              const numValue = Number(value);
                              if (numValue >= 0 && numValue <= 999999999999.999999) {
                                updateEquipmentTransportRow(r.id, { distance: numValue });
                              }
                            }
                          }} 
                          placeholder="Enter distance"
                          className="flex-1"
                        />
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeEquipmentTransportRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-gray-900 font-medium">
                Total transport emissions: <span className="font-semibold">{equipmentTotalTransportEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>
          </div>
          
          {/* Combined Total for Equipment & Machinery */}
          {(equipmentComputedElectricityEmissions > 0 || equipmentTotalTransportEmissions > 0) && (
            <div className="flex items-center justify-between pt-4 border-t-2 border-teal-600">
              <div className="text-lg font-semibold text-gray-900">
                Total Equipment & Machinery emissions: <span className="text-teal-600">{equipmentTotalEmissions.toFixed(6)} kg CO2e</span>
              </div>
              <Button onClick={() => toast({ title: 'Saved', description: 'Equipment & Machinery data saved (frontend only for now).' })} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Infrastructure & Utilities */}
      {selectedCategory === 'infrastructure' && (
        <div className="space-y-6 border-t pt-6">
          {/* Electricity Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Infrastructure & Utilities - Electricity Consumption</h4>
                <p className="text-sm text-gray-600">Enter electricity consumption data for leased infrastructure</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <Label>Total electricity consumption (kWh)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="999999999999.999999"
                  value={infrastructureTotalKwh ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setInfrastructureTotalKwh(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        setInfrastructureTotalKwh(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 120000"
                />
              </div>
              <div>
                <Label>Grid Energy (%)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={infrastructureGridPct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setInfrastructureGridPct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setInfrastructureGridPct(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 60"
                />
              </div>
              <div>
                <Label>Renewable Energy (%)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={infrastructureRenewablePct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setInfrastructureRenewablePct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setInfrastructureRenewablePct(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 30"
                />
              </div>
              <div>
                <Label>Other sources (%)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={infrastructureOtherPct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setInfrastructureOtherPct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setInfrastructureOtherPct(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            {/* Grid sources section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <h3 className="text-lg font-medium mb-4">Grid sources</h3>
                <Label>Electricity provider country</Label>
                <Select value={infrastructureGridCountry} onValueChange={v => setInfrastructureGridCountry(v as any)}>
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
                <Label>Grid emission factor</Label>
                <Input value={infrastructureGridFactor ?? ''} readOnly placeholder="Auto" />
              </div>
              <div>
                <Label>Grid emissions</Label>
                <Input
                  readOnly
                  value={infrastructureGridEmissions || ''}
                />
              </div>
              {infrastructureGridPct && infrastructureGridPct > 0 && (
                <div className="md:col-span-3 text-gray-700 font-medium">
                  Grid sources emissions: <span className="font-semibold">{infrastructureGridEmissions.toFixed(6)} kg CO2e</span>
                </div>
              )}
            </div>

            {/* Other sources section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Other sources</h3>
                <Button onClick={addInfrastructureOtherRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add Row
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Label className="text-gray-500">Type</Label>
                <Label className="text-gray-500">Fuel</Label>
                <Label className="text-gray-500">Unit</Label>
                <Label className="text-gray-500">Quantity</Label>
                <div />
              </div>

              <div className="space-y-3">
                {infrastructureOtherRows.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No other sources added yet. Click "Add Row" to add one.
                  </div>
                ) : (
                  infrastructureOtherRows.map(r => (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-gray-50">
                      <Select
                        value={r.type}
                        onValueChange={v => updateInfrastructureOtherRow(r.id, { type: v as FuelType, fuel: undefined, unit: undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {fuelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select
                        value={r.fuel}
                        onValueChange={v => updateInfrastructureOtherRow(r.id, { fuel: v, unit: undefined })}
                        disabled={!r.type}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel" />
                        </SelectTrigger>
                        <SelectContent>
                          {fuelsFor(r.type).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select
                        value={r.unit}
                        onValueChange={v => updateInfrastructureOtherRow(r.id, { unit: v })}
                        disabled={!r.type || !r.fuel}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitsFor(r.type, r.fuel).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        step="any"
                        min="0"
                        max="999999999999.999999"
                        value={r.quantity ?? ''}
                        onChange={e => {
                          const value = e.target.value;
                          if (value === '') {
                            updateInfrastructureOtherRow(r.id, { quantity: undefined });
                          } else {
                            const numValue = Number(value);
                            if (numValue >= 0 && numValue <= 999999999999.999999) {
                              updateInfrastructureOtherRow(r.id, { quantity: numValue });
                            }
                          }
                        }}
                        placeholder="Enter quantity"
                      />

                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" className="text-red-600" onClick={() => removeInfrastructureOtherRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-gray-700 font-medium">
                Other sources emissions: <span className="font-semibold">{infrastructureTotalOtherEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-gray-900 font-medium">
                Total electricity emissions: <span className="font-semibold">{infrastructureComputedElectricityEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>
          </div>

          {/* Refrigerant Section */}
          <div className="space-y-6 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Infrastructure & Utilities - Refrigerant Usage</h4>
                <p className="text-sm text-gray-600">Add refrigerant usage data for leased infrastructure</p>
              </div>
              <Button onClick={addInfrastructureRefrigerantRow} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Add New Entry
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Label className="md:col-span-1 text-gray-500">Refrigerant Type</Label>
              <Label className="md:col-span-1 text-gray-500">Quantity (kg)</Label>
              <div />
            </div>

            <div className="space-y-3">
              {infrastructureRefrigerantRows.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No refrigerant entries added yet. Click "Add New Entry" to add one.
                </div>
              ) : (
                infrastructureRefrigerantRows.map(r => (
                  <div key={r.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg bg-gray-50">
                    <Select 
                      value={r.refrigerantType} 
                      onValueChange={(v) => updateInfrastructureRefrigerantRow(r.id, { refrigerantType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select refrigerant type" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(REFRIGERANT_FACTORS).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        step="any" 
                        min="0"
                        max="999999999999.999999"
                        value={r.quantity ?? ''} 
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateInfrastructureRefrigerantRow(r.id, { quantity: undefined });
                          } else {
                            const numValue = Number(value);
                            if (numValue >= 0 && numValue <= 999999999999.999999) {
                              updateInfrastructureRefrigerantRow(r.id, { quantity: numValue });
                            }
                          }
                        }} 
                        placeholder="Enter quantity"
                        className="flex-1"
                      />
                      <Button variant="ghost" className="text-red-600" onClick={() => removeInfrastructureRefrigerantRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm text-gray-600">
                      {r.emissions !== undefined ? `${r.emissions.toFixed(6)} kg CO2e` : ''}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-gray-900 font-medium">
                Total refrigerant emissions: <span className="font-semibold">{infrastructureTotalRefrigerantEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>
          </div>
          
          {/* Combined Total for Infrastructure & Utilities */}
          {(infrastructureComputedElectricityEmissions > 0 || infrastructureTotalRefrigerantEmissions > 0) && (
            <div className="flex items-center justify-between pt-4 border-t-2 border-teal-600">
              <div className="text-lg font-semibold text-gray-900">
                Total Infrastructure & Utilities emissions: <span className="text-teal-600">{infrastructureTotalEmissions.toFixed(6)} kg CO2e</span>
              </div>
              <Button onClick={() => toast({ title: 'Saved', description: 'Infrastructure & Utilities data saved (frontend only for now).' })} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeasedAssetsSection;


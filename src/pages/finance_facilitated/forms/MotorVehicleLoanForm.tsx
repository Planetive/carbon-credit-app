import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Info } from 'lucide-react';
import { FormulaConfig } from '../types/formula';
import { FieldTooltip } from '../components/FieldTooltip';
import { passengerTypeTooltipText } from '@/components/emissions/shared/ukPassengerFactors';

interface MotorVehicleLoanFormProps {
  selectedFormula: FormulaConfig | null;
  formData: Record<string, any>;
  onUpdateFormData: (field: string, value: any) => void;
}

interface VehicleEntry {
  id: string;
  name: string; // Custom name for the vehicle (e.g., "Vehicle 1", "My Car", etc.)
  activity: string;
  vehicleType: string;
  unit: string;
  distance: number;
  factor: number; // Emission factor (example; UK passenger factors live in UK_Passenger_factors)
  emissions: number;
  totalValueAtOrigination: number; // Total value at origination for this vehicle (PKR)
}

// Vehicle categories and types (exact same as emission calculator)
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

const EMISSION_FACTORS = {
  'Petrol': 0.0023, // tCO2e/L
  'Diesel': 0.0027, // tCO2e/L
  'LPG': 0.0016, // tCO2e/L
  'CNG': 0.0014, // tCO2e/L
  'Electric': 0.0001 // tCO2e/kWh (converted)
};

export const MotorVehicleLoanForm: React.FC<MotorVehicleLoanFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData
}) => {
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>([]);
  const [hoveredInfo, setHoveredInfo] = useState<{value: string, description: string, position: {x: number, y: number}} | null>(null);

  // Clear hover info when clicking outside or pressing escape
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

  // Calculate total emissions and total value at origination, and update form data
  const calculateTotalEmissions = (entries: VehicleEntry[]) => {
    const totalEmissions = entries.reduce((sum, entry) => sum + entry.emissions, 0);
    const totalDistance = entries.reduce((sum, entry) => sum + entry.distance, 0);
    const totalValueAtOrigination = entries.reduce((sum, entry) => sum + (entry.totalValueAtOrigination || 0), 0);
    const avgFactor = entries.length > 0 ? entries.reduce((sum, entry) => sum + entry.factor, 0) / entries.length : 0;

    // Update form data with calculated values
    onUpdateFormData('total_vehicle_emissions', totalEmissions);
    onUpdateFormData('total_distance_traveled', totalDistance);
    onUpdateFormData('total_value_at_origination', totalValueAtOrigination);
    onUpdateFormData('average_factor', avgFactor);
  };

  const addVehicleEntry = () => {
    const vehicleNumber = vehicleEntries.length + 1;
    const newEntry: VehicleEntry = {
      id: crypto.randomUUID(),
      name: `Vehicle ${vehicleNumber}`,
      activity: 'Cars (by market segment)',
      vehicleType: 'Mini',
      unit: 'km',
      distance: 0,
      factor: 0.10828, // Illustrative factor only
      emissions: 0,
      totalValueAtOrigination: 0
    };
    const updatedEntries = [...vehicleEntries, newEntry];
    setVehicleEntries(updatedEntries);
    calculateTotalEmissions(updatedEntries);
  };

  const removeVehicleEntry = (id: string) => {
    const updatedEntries = vehicleEntries.filter(entry => entry.id !== id);
    setVehicleEntries(updatedEntries);
    calculateTotalEmissions(updatedEntries);
  };

  const updateVehicleEntry = (id: string, field: keyof VehicleEntry, value: any) => {
    const updatedEntries = vehicleEntries.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        
        // Auto-calculate factor based on vehicle type and unit
        if (field === 'vehicleType' || field === 'unit' || field === 'activity') {
          const activityData = VEHICLE_ACTIVITIES[updatedEntry.activity as keyof typeof VEHICLE_ACTIVITIES];
          const vehicleData = activityData?.[updatedEntry.vehicleType as keyof typeof activityData];
          updatedEntry.factor = vehicleData?.[updatedEntry.unit as keyof typeof vehicleData] || 0;
        }
        
        // Calculate emissions
        updatedEntry.emissions = updatedEntry.distance * updatedEntry.factor;
        
        return updatedEntry;
      }
      return entry;
    });
    
    setVehicleEntries(updatedEntries);
    calculateTotalEmissions(updatedEntries);
  };

  const getVehicleTypes = (activity: string) => {
    return Object.keys(VEHICLE_ACTIVITIES[activity as keyof typeof VEHICLE_ACTIVITIES] || {});
  };

  const getUnits = (activity: string, vehicleType: string) => {
    const activityData = VEHICLE_ACTIVITIES[activity as keyof typeof VEHICLE_ACTIVITIES];
    const vehicleData = activityData?.[vehicleType as keyof typeof activityData];
    return Object.keys(vehicleData || {});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Information & Emissions Data</CardTitle>
        <CardDescription>
          Enter detailed vehicle information for {selectedFormula?.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vehicle Entries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Vehicle Details</h3>
            <Button onClick={addVehicleEntry} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>

          {vehicleEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No vehicles added yet. Click "Add Vehicle" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicleEntries.map((entry, index) => (
                <Card key={entry.id} className="p-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Activity */}
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

                    {/* Vehicle Type */}
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
                          setHoveredInfo(null); // Clear popup when option is selected
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

                    {/* Unit */}
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select
                        value={entry.unit}
                        onValueChange={(value) => updateVehicleEntry(entry.id, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getUnits(entry.activity, entry.vehicleType).map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Distance */}
                    <div className="space-y-2">
                      <Label>Distance Traveled</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={entry.distance}
                        onChange={(e) => updateVehicleEntry(entry.id, 'distance', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    {/* Emission Factor (Auto-calculated) */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Emission Factor (kg CO2e/{entry.unit})
                        <FieldTooltip content="Auto-calculated based on vehicle type and unit" />
                      </Label>
                      <Input
                        type="number"
                        value={entry.factor}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    {/* Total Value at Origination */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Total Value at Origination (PKR)
                        <FieldTooltip content="The total amount of the motor vehicle loan for this vehicle when it was first approved or issued" />
                      </Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={entry.totalValueAtOrigination || ''}
                        onChange={(e) => updateVehicleEntry(entry.id, 'totalValueAtOrigination', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Calculated Emissions */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Calculated Emissions:</span>
                      <span className="text-lg font-semibold text-gray-900">{entry.emissions.toFixed(6)} kg CO2e</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {vehicleEntries.length > 0 && (
          <Card className="p-4 bg-gray-50 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">Total Vehicle Emissions Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-700">Total Distance:</span>
                <span className="ml-2 font-semibold text-gray-900">{vehicleEntries.reduce((sum, entry) => sum + entry.distance, 0).toFixed(2)} {vehicleEntries[0]?.unit || 'km'}</span>
              </div>
              <div>
                <span className="text-gray-700">Total Emissions:</span>
                <span className="ml-2 font-semibold text-gray-900">{vehicleEntries.reduce((sum, entry) => sum + entry.emissions, 0).toFixed(6)} kg CO2e</span>
              </div>
              <div>
                <span className="text-gray-700">Total Value at Origination:</span>
                <span className="ml-2 font-semibold text-gray-900">{vehicleEntries.reduce((sum, entry) => sum + (entry.totalValueAtOrigination || 0), 0).toLocaleString()} PKR</span>
              </div>
              <div>
                <span className="text-gray-700">Number of Vehicles:</span>
                <span className="ml-2 font-semibold text-gray-900">{vehicleEntries.length}</span>
              </div>
            </div>
          </Card>
        )}
      </CardContent>
      
      {/* Beautiful Hover Popup */}
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
            {/* Arrow pointing to the dropdown option */}
            <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"></div>
            <div className="absolute -left-3 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-gray-200"></div>
          </div>
        </div>
      )}
    </Card>
  );
};

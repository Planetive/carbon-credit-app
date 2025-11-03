import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  DeliveryVehicleRow
} from "../shared/types";
import { 
  DELIVERY_VEHICLE_FACTORS
} from "../shared/EmissionFactors";
import { 
  newDeliveryVehicleRow,
  deliveryVehicleRowChanged
} from "../shared/utils";

interface DeliveryVehicleEmissionsProps {
  onDataChange: (data: DeliveryVehicleRow[]) => void;
  companyContext?: boolean; // Add company context prop
}

const DeliveryVehicleEmissions: React.FC<DeliveryVehicleEmissionsProps> = ({ onDataChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rows, setRows] = useState<DeliveryVehicleRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<DeliveryVehicleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hoveredInfo, setHoveredInfo] = useState<{value: string, description: string, position: {x: number, y: number}} | null>(null);

  // Computed values
  const deliveryActivities = Object.keys(DELIVERY_VEHICLE_FACTORS);
  const deliveryTypesFor = (activity?: string) => (activity ? Object.keys(DELIVERY_VEHICLE_FACTORS[activity]) : []);
  const deliveryUnitsFor = (activity?: string, vehicleType?: string) => (activity && vehicleType ? Object.keys(DELIVERY_VEHICLE_FACTORS[activity][vehicleType]) : []);

  const deliveryActivityDescriptions: Record<string, string> = {
    "Vans": "Large goods vehicles (vans up to 3.5 tonnes).",
    "HGV (all diesel)": "Heavy Goods Vehicles for long-distance freight transport",
    "HGVs refrigerated (all diesel)": "Refrigerated road vehicles with maximum weight exceeding 3.5 tonnes."
  };

  // Clear hover info when clicking outside or pressing escape
  useEffect(() => {
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

  // Load existing entries
  useEffect(() => {
    const loadExistingEntries = async () => {
      if (!user) return;

      try {
        const { data: delData, error: delError } = await supabase
          .from('scope1_delivery_vehicle_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (delError) throw delError;

        const existingDelRows = (delData || []).map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          activity: entry.activity,
          vehicleType: entry.vehicle_type,
          unit: entry.unit,
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingEntries(existingDelRows);
        setRows(existingDelRows.length > 0 ? existingDelRows : []);

        setIsInitialLoad(false);
      } catch (error: any) {
        console.error('Error loading existing entries:', error);
        toast({ 
          title: "Error", 
          description: "Failed to load existing entries", 
          variant: "destructive" 
        });
      }
    };

    loadExistingEntries();
  }, [user, toast]);

  // Notify parent of data changes
  useEffect(() => {
    if (!isInitialLoad) {
      onDataChange(rows);
    }
  }, [rows, isInitialLoad, onDataChange]);

  // Row management functions
  const addRow = () => setRows(prev => [...prev, newDeliveryVehicleRow()]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  // Update functions
  const updateRow = (id: string, patch: Partial<DeliveryVehicleRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: DeliveryVehicleRow = { ...r, ...patch };
      if (next.activity && next.vehicleType && next.unit) {
        const factor = DELIVERY_VEHICLE_FACTORS[next.activity]?.[next.vehicleType]?.[next.unit];
        next.factor = typeof factor === 'number' ? factor : undefined;
      } else {
        next.factor = undefined;
      }
      if (typeof next.distance === 'number' && typeof next.factor === 'number') {
        next.emissions = Number((next.distance * next.factor).toFixed(6));
      } else {
        next.emissions = undefined;
      }
      return next;
    }));
  };

  // Delete functions
  const deleteExistingRow = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row || !row.dbId) return;

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingRows(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope1_delivery_vehicle_entries')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setRows(prev => prev.filter(r => r.id !== id));
      setExistingEntries(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save functions
  const saveDeliveryEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = rows.filter(r => 
      r.activity && r.vehicleType && r.unit && 
      typeof r.distance === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );
    const changedExisting = rows.filter(r => r.isExisting && r.dbId && deliveryVehicleRowChanged(r, existingEntries));
    
    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed delivery vehicle entries." });
      return;
    }
    
    setSaving(true);
    try {
      const payload = newEntries.map(v => ({
        user_id: user.id,
        activity: v.activity!,
        vehicle_type: v.vehicleType!,
        unit: v.unit!,
        distance: v.distance!,
        emission_factor: v.factor!,
        emissions: v.emissions!,
      }));
      
      if (payload.length > 0) {
        const { error } = await supabase.from('scope1_delivery_vehicle_entries').insert(payload);
        if (error) throw error;
      }
      
      if (changedExisting.length > 0) {
        const updates = changedExisting.map(v => (
          supabase
            .from('scope1_delivery_vehicle_entries')
            .update({
              activity: v.activity!,
              vehicle_type: v.vehicleType!,
              unit: v.unit!,
              distance: v.distance!,
              emission_factor: v.factor!,
              emissions: v.emissions!,
            })
            .eq('id', v.dbId!)
        ));
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }
      
      toast({ title: "Saved", description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` });
      
      // Reload data
      const { data: newData } = await supabase
        .from('scope1_delivery_vehicle_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (newData) {
        const updatedExistingRows = newData.map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          activity: entry.activity,
          vehicleType: entry.vehicle_type,
          unit: entry.unit,
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));
        setExistingEntries(updatedExistingRows);
        setRows(updatedExistingRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Delivery Vehicle Entries</h4>
          <p className="text-sm text-gray-600">Add your organization's delivery vehicle usage data</p>
        </div>
        <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" />Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Label className="md:col-span-1 text-gray-500">Activity</Label>
        <Label className="md:col-span-1 text-gray-500">Type</Label>
        <Label className="md:col-span-1 text-gray-500">Unit</Label>
        <Label className="md:col-span-1 text-gray-500">Distance</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const isDeleting = deletingRows.has(r.id);
          
          return (
            <div key={r.id} className={`grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50`}>
              <Select 
                value={r.activity} 
                onValueChange={(v) => {
                  setHoveredInfo(null); // Clear popup when option is selected
                  updateRow(r.id, { activity: v, vehicleType: undefined, unit: undefined });
                }}
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryActivities.map(activity => (
                    <SelectItem 
                      key={activity} 
                      value={activity}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredInfo({
                          value: activity,
                          description: deliveryActivityDescriptions[activity] || "Activity information",
                          position: { x: rect.right + 10, y: rect.top }
                        });
                      }}
                      onMouseLeave={() => setHoveredInfo(null)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{activity}</span>
                        <Info className="h-4 w-4 text-gray-400 ml-2" />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={r.vehicleType} 
                onValueChange={(v) => updateRow(r.id, { vehicleType: v, unit: undefined })} 
                disabled={!r.activity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryTypesFor(r.activity).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select 
                value={r.unit} 
                onValueChange={(v) => updateRow(r.id, { unit: v })} 
                disabled={!r.activity || !r.vehicleType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryUnitsFor(r.activity, r.vehicleType).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
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
                      updateRow(r.id, { distance: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        updateRow(r.id, { distance: numValue });
                      }
                    }
                  }} 
                  placeholder="Enter distance"
                  disabled={false}
                  className="flex-1"
                />
                {r.isExisting ? (
                  <Button size="sm" variant="outline" onClick={() => deleteExistingRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700 ml-2" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-red-600 ml-2" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Delivery Vehicle Emissions: <span className="font-semibold">{totalEmissions.toFixed(6)} kg CO2e</span>
        </div>
        {(() => {
          const pendingNew = rows.filter(r => !r.isExisting).length;
          const pendingUpdates = rows.filter(r => r.isExisting && deliveryVehicleRowChanged(r, existingEntries)).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <Button 
              onClick={saveDeliveryEntries} 
              disabled={saving || totalPending === 0} 
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : `Save Changes (${totalPending})`}
            </Button>
          );
        })()}
      </div>
    </div>
  );
};

export default DeliveryVehicleEmissions;

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FuelRow, 
  FuelType 
} from "../shared/types";
import { 
  FACTORS
} from "../shared/EmissionFactors";
import { 
  newFuelRow,
  fuelRowChanged
} from "../shared/utils";

interface FuelEmissionsProps {
  onDataChange: (data: FuelRow[]) => void;
  companyContext?: boolean; // Add company context prop
  counterpartyId?: string; // Add counterparty ID for company-specific data
  onSaveAndNext?: () => void;
}

const FuelEmissions: React.FC<FuelEmissionsProps> = ({ onDataChange, companyContext = false, counterpartyId, onSaveAndNext }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rows, setRows] = useState<FuelRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<FuelRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fuelFactors, setFuelFactors] = useState<typeof FACTORS | null>(null);

  // Use Supabase "Fuel EPA" table for dynamic fuel factors when available,
  // but keep the hardcoded FACTORS as a safe fallback.
  const effectiveFactors = fuelFactors || FACTORS;

  // Computed values
  const types = Object.keys(effectiveFactors) as FuelType[];
  const fuelsFor = (type?: FuelType) => (type ? Object.keys(effectiveFactors[type]) : []);
  const unitsFor = (type?: FuelType, fuel?: string) =>
    type && fuel ? Object.keys(effectiveFactors[type][fuel]) : [];

  // Load fuel factor reference data from Supabase ("Fuel EPA" table).
  // Expected columns (based on your screenshot):
  //   - "Fuel" (text)
  //   - "kg CO2 per mmBtu" (float8)
  //   - "Category" (text)
  useEffect(() => {
    const loadFuelFactors = async () => {
      try {
        const { data, error } = await supabase
          .from('Fuel EPA' as any)
          .select('*');

        if (error) {
          console.error('Error loading Fuel EPA factors:', error);
          return; // keep using hardcoded FACTORS
        }

        if (!data || data.length === 0) {
          console.warn('Fuel EPA table returned no rows; falling back to hardcoded FACTORS');
          return;
        }

        const map: Record<string, Record<string, Record<string, number>>> = {};

        (data as any[]).forEach(row => {
          const category = row.Category || row.category;
          const fuel = row.Fuel || row.fuel;
          const rawFactor =
            row['kg CO2 per mmBtu'] ??
            row['kg CO₂ per mmBtu'] ??
            row.kg_co2_per_mmbtu ??
            row.kg_co2_per_unit;

          const factor =
            typeof rawFactor === 'number'
              ? rawFactor
              : rawFactor != null
                ? parseFloat(String(rawFactor))
                : NaN;

          if (!category || !fuel || !isFinite(factor)) {
            return;
          }

          if (!map[category]) {
            map[category] = {};
          }
          // All EPA factors are per mmBtu in your sheet
          map[category][fuel] = { mmBtu: factor };
        });

        // Only override if we actually built something
        if (Object.keys(map).length > 0) {
          console.log('Loaded Fuel EPA factors from Supabase:', map);
          setFuelFactors(map as typeof FACTORS);
        }
      } catch (err) {
        console.error('Unexpected error loading Fuel EPA factors:', err);
      }
    };

    loadFuelFactors();
  }, []);

  // Load existing entries
  useEffect(() => {
    const loadExistingEntries = async () => {
      if (!user) return;

      // Load company-specific data when in company context
      if (companyContext && counterpartyId) {
        console.log('Company context detected - loading company-specific fuel entries for:', counterpartyId);
        
        try {
          // Load company-specific fuel entries
          const { data: fuelData, error: fuelError } = await supabase
            .from('scope1_fuel_entries')
            .select('*')
            .eq('user_id', user.id)
            .eq('counterparty_id', counterpartyId)
            .order('created_at', { ascending: false });

          if (fuelError) throw fuelError;

          const companyFuelRows = (fuelData || []).map(entry => ({
            id: crypto.randomUUID(),
            dbId: entry.id,
            type: entry.fuel_type_group as FuelType,
            fuel: entry.fuel,
            unit: entry.unit,
            quantity: entry.quantity,
            factor: entry.factor,
            emissions: entry.emissions,
            isExisting: true,
          }));

          setExistingEntries(companyFuelRows);
          setRows(companyFuelRows.length > 0 ? companyFuelRows : []);
          onDataChange(companyFuelRows);
          
          console.log(`Loaded ${companyFuelRows.length} company-specific fuel entries`);
        } catch (error) {
          console.error('Error loading company fuel entries:', error);
          // Fallback to blank form on error
          setRows([]);
          setExistingEntries([]);
          onDataChange([]);
        }
        
        setIsInitialLoad(false);
        return;
      }

      // Skip loading data when in company context but no counterpartyId
      if (companyContext && !counterpartyId) {
        console.log('Company context detected but no counterpartyId - starting with blank fuel form');
        setRows([]);
        setExistingEntries([]);
        onDataChange([]);
        setIsInitialLoad(false);
        return;
      }

      // Load personal data for individual use
      try {
        const { data: fuelData, error: fuelError } = await supabase
          .from('scope1_fuel_entries')
          .select('*')
          .eq('user_id', user.id)
          .is('counterparty_id', null) // Only personal entries (no counterparty_id)
          .order('created_at', { ascending: false });

        if (fuelError) throw fuelError;

        const existingFuelRows = (fuelData || []).map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          type: entry.fuel_type_group as FuelType,
          fuel: entry.fuel,
          unit: entry.unit,
          quantity: entry.quantity,
          factor: entry.factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingEntries(existingFuelRows);
        setRows(existingFuelRows.length > 0 ? existingFuelRows : []);

        if (existingFuelRows.length > 0) {
          onDataChange(existingFuelRows);
        }
      } catch (error: any) {
        console.error('Error loading existing entries:', error);
        toast({ 
          title: "Error", 
          description: "Failed to load existing entries", 
          variant: "destructive" 
        });
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadExistingEntries();
  }, [user, toast, companyContext, counterpartyId]);

  // Notify parent of data changes
  useEffect(() => {
    if (!isInitialLoad) {
      onDataChange(rows);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, isInitialLoad]);

  // Row management functions
  const addRow = () => setRows(prev => [...prev, newFuelRow()]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  // Update functions
  const updateRow = (id: string, patch: Partial<FuelRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: FuelRow = { ...r, ...patch };
      if (next.type && next.fuel && next.unit) {
        const factor = effectiveFactors[next.type]?.[next.fuel]?.[next.unit];
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
        .from('scope1_fuel_entries')
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
  const saveFuelEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = rows.filter(r => 
      r.type && r.fuel && r.unit && 
      typeof r.quantity === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );

    const changedExisting = rows.filter(r => r.isExisting && r.dbId && fuelRowChanged(r, existingEntries));

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed fuel entries." });
      return;
    }

    setSaving(true);
    try {
      const payload = newEntries.map(v => ({
        user_id: user.id,
        counterparty_id: companyContext ? counterpartyId : null, // Add counterparty_id for company entries
        fuel_type_group: v.type!,
        fuel: v.fuel!,
        unit: v.unit!,
        quantity: v.quantity!,
        factor: v.factor!,
        emissions: v.emissions!,
      }));

      if (payload.length > 0) {
        const { error } = await supabase.from('scope1_fuel_entries').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(v => (
          supabase
            .from('scope1_fuel_entries')
            .update({
              fuel_type_group: v.type!,
              fuel: v.fuel!,
              unit: v.unit!,
              quantity: v.quantity!,
              factor: v.factor!,
              emissions: v.emissions!,
            })
            .eq('id', v.dbId!)
        ));
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      // Navigate to next category
      onSaveAndNext?.();

      // Reload data
      const { data: newData } = await supabase
        .from('scope1_fuel_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedExistingRows = newData.map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          type: entry.fuel_type_group as FuelType,
          fuel: entry.fuel,
          unit: entry.unit,
          quantity: entry.quantity,
          factor: entry.factor,
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
          <h4 className="text-lg font-semibold text-gray-900">Fuel Entries</h4>
          <p className="text-sm text-gray-600">Add your organization's fuel consumption data</p>
        </div>
        <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" />Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Label className="md:col-span-1 text-gray-500">Type</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel</Label>
        <Label className="md:col-span-1 text-gray-500">Unit</Label>
        <Label className="md:col-span-1 text-gray-500">Quantity</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const isDeleting = deletingRows.has(r.id);
          
          return (
            <div key={r.id} className={`grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50`}>
              <Select 
                value={r.type} 
                onValueChange={(v) => updateRow(r.id, { type: v as FuelType, fuel: undefined, unit: undefined })}
                disabled={false}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select 
                value={r.fuel} 
                onValueChange={(v) => updateRow(r.id, { fuel: v, unit: undefined })} 
                disabled={!r.type ? true : false}
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
                onValueChange={(v) => updateRow(r.id, { unit: v })} 
                disabled={!r.type || !r.fuel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitsFor(r.type, r.fuel).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
                      updateRow(r.id, { quantity: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        updateRow(r.id, { quantity: numValue });
                      }
                    }
                  }} 
                  placeholder="Enter quantity"
                  disabled={false}
                />
                {r.isExisting ? (
                  <Button size="sm" variant="outline" onClick={() => deleteExistingRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-red-600" onClick={() => removeRow(r.id)}>
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
          Total Fuel Emissions: <span className="font-semibold">{totalEmissions.toFixed(6)} kg CO2e</span>
        </div>
        {(() => {
          const pendingNew = rows.filter(r => !r.isExisting).length;
          const pendingUpdates = rows.filter(r => r.isExisting && fuelRowChanged(r, existingEntries)).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <Button 
              onClick={saveFuelEntries} 
              disabled={saving || totalPending === 0} 
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : `Save and Next (${totalPending})`}
            </Button>
          );
        })()}
      </div>
    </div>
  );
};

export default FuelEmissions;

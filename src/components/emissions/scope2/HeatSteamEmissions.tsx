import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface HeatRow { 
  id?: string; 
  entryType: string; // Dynamic type based on standard
  unit: string; 
  factor: number; 
  quantity?: number; 
  emissions?: number; 
  dbId?: string; 
}

const HEAT_DEFAULT_FACTOR = 0.17355; // kg CO2e per kWh (fallback)

interface HeatSteamEmissionsProps {
  onTotalChange?: (total: number) => void;
  onSaveAndNext?: () => void;
}

const HeatSteamEmissions: React.FC<HeatSteamEmissionsProps> = ({ onTotalChange, onSaveAndNext }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [heatSteamStandard, setHeatSteamStandard] = useState<'UK' | 'EBT'>('UK');
  const [heatSteamDataUK, setHeatSteamDataUK] = useState<Array<{
    'Type': string;
    'Unit': string;
    'kg CO₂e': number;
  }>>([]);
  const [heatSteamDataEBT, setHeatSteamDataEBT] = useState<Array<{
    'Type': string;
    'Unit': string;
    'kg CO₂e': number;
  }>>([]);

  const [heatRows, setHeatRows] = useState<HeatRow[]>([]);
  const [savingHeat, setSavingHeat] = useState(false);

  // Load heat and steam reference data for both standards
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        // Load UK standard data
        const { data: ukData } = await supabase
          .from('heat and steam' as any)
          .select('*');
        
        if (ukData && ukData.length > 0) {
          const formatted = ukData.map((row: any) => ({
            'Type': row['Type'] || row.type || row['type'] || row['Activity'] || row.activity,
            'Unit': row['Unit'] || row.unit || row['unit'],
            'kg CO₂e': typeof row['kg CO₂e'] === 'number' ? row['kg CO₂e'] : 
                      typeof row['kg CO2 / mmBtu'] === 'number' ? row['kg CO2 / mmBtu'] :
                      typeof row['kg CO2 / mmBtu'] === 'string' ? parseFloat(row['kg CO2 / mmBtu']) :
                      parseFloat(row['kg CO₂e'] || row['kg CO2e'] || row.kg_co2e || row['kg CO2 / mmBtu'] || 0),
          }));
          setHeatSteamDataUK(formatted);
        }

        // Load EBT standard data
        const { data: ebtData } = await supabase
          .from('heat and steam EBT' as any)
          .select('*');
        
        if (ebtData && ebtData.length > 0) {
          const formatted = ebtData.map((row: any) => ({
            'Type': row['Type'] || row.type || row['type'] || row['Activity'] || row.activity,
            'Unit': row['Unit'] || row.unit || row['unit'],
            'kg CO₂e': typeof row['kg CO₂e'] === 'number' ? row['kg CO₂e'] : 
                      typeof row['kg CO2 / mmBtu'] === 'number' ? row['kg CO2 / mmBtu'] :
                      typeof row['kg CO2 / mmBtu'] === 'string' ? parseFloat(row['kg CO2 / mmBtu']) :
                      parseFloat(row['kg CO₂e'] || row['kg CO2e'] || row.kg_co2e || row['kg CO2 / mmBtu'] || 0),
          }));
          setHeatSteamDataEBT(formatted);
        }
      } catch (error: any) {
        console.error('Error loading heat and steam reference data:', error);
      }
    };
    loadReferenceData();
  }, []);

  // Update rows when standard or data changes - dynamically create rows based on available types
  useEffect(() => {
    const dataSource = heatSteamStandard === 'UK' ? heatSteamDataUK : heatSteamDataEBT;
    
    if (dataSource.length === 0) {
      // If no data yet, keep existing rows or set empty
      return;
    }
    
    // Create rows from the data source, preserving quantities if types match
    setHeatRows(prev => {
      const newRows: HeatRow[] = dataSource.map((dataItem, index) => {
        // Try to find existing row with same type to preserve quantity
        const existingRow = prev.find(r => r.entryType === dataItem['Type']);
        
        return {
          id: existingRow?.id || `heat-${index}-${Date.now()}`,
          entryType: dataItem['Type'],
          unit: dataItem['Unit'] || 'kWh',
          factor: dataItem['kg CO₂e'] || HEAT_DEFAULT_FACTOR,
          quantity: existingRow?.quantity,
          emissions: existingRow?.quantity && dataItem['kg CO₂e'] 
            ? Number((existingRow.quantity * dataItem['kg CO₂e']).toFixed(6))
            : undefined,
          dbId: existingRow?.dbId,
        };
      });
      
      return newRows;
    });
  }, [heatSteamStandard, heatSteamDataUK, heatSteamDataEBT]);

  // Load saved user data
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        // Load Heat & Steam entries
        const { data: heatData, error: heatError } = await (supabase as any)
          .from('scope2_heatsteam_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (heatError) throw heatError;

        // Load saved standard if available
        if (heatData && heatData.length > 0 && heatData[0].standard) {
          setHeatSteamStandard(heatData[0].standard);
        }
        
        // Convert saved data to rows (will be updated when standard/data loads)
        const savedRows: HeatRow[] = (heatData || []).map((row: any) => ({
          id: crypto.randomUUID(),
          dbId: row.id,
          entryType: row.entry_type,
          unit: row.unit,
          factor: row.emission_factor ?? HEAT_DEFAULT_FACTOR,
          quantity: row.quantity ?? undefined,
          emissions: row.emissions ?? undefined,
        }));
        
        // Only set if we have saved data, otherwise let the standard/data effect handle it
        if (savedRows.length > 0) {
          setHeatRows(savedRows);
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: "Error", description: e.message || "Failed to load Heat & Steam data", variant: "destructive" });
      }
    };
    load();
  }, [user, toast]);

  const updateHeatRowQty = (entryType: string, qty?: number) => {
    setHeatRows(prev => prev.map(r => {
      if (r.entryType !== entryType) return r;
      const next = { ...r, quantity: qty } as HeatRow;
      if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
        next.emissions = Number((next.quantity * next.factor).toFixed(6));
      } else {
        next.emissions = undefined;
      }
      return next;
    }));
  };

  const saveHeat = async () => {
    if (!user) { 
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" }); 
      return; 
    }
    const validRows = heatRows.filter(r => typeof r.quantity === 'number' && typeof r.factor === 'number' && typeof r.emissions === 'number');
    if (validRows.length === 0) { 
      toast({ title: "Nothing to save", description: "Enter quantities for heat & steam." }); 
      return; 
    }
    setSavingHeat(true);
    try {
      const inserts = validRows.filter(r => !r.dbId).map(r => ({
        user_id: user.id,
        entry_type: r.entryType,
        unit: r.unit,
        emission_factor: r.factor,
        quantity: r.quantity!,
        emissions: r.emissions!,
        standard: heatSteamStandard,
      }));
      if (inserts.length > 0) {
        const { error } = await (supabase as any).from('scope2_heatsteam_entries').insert(inserts);
        if (error) throw error;
      }

      const updates = validRows.filter(r => r.dbId).map(r => (
        (supabase as any)
          .from('scope2_heatsteam_entries')
          .update({
            unit: r.unit,
            emission_factor: r.factor,
            quantity: r.quantity!,
            emissions: r.emissions!,
            standard: heatSteamStandard,
          })
          .eq('id', r.dbId!)
      ));
      if (updates.length > 0) {
        const results = await Promise.all(updates);
        const updateError = (results as any[]).find(x => x.error)?.error;
        if (updateError) throw updateError;
      }

      toast({ title: "Saved", description: "Heat & Steam saved." });
      onSaveAndNext?.();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingHeat(false);
    }
  };

  const totalHeatEmissions = heatRows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  useEffect(() => {
    if (onTotalChange) onTotalChange(totalHeatEmissions);
  }, [onTotalChange, totalHeatEmissions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Heat & Steam Consumption</h4>
          <p className="text-sm text-gray-600">Enter your organization's heat and steam consumption data</p>
        </div>
      </div>

      {/* Standard Selection */}
      <div className="mb-4">
        <Label className="flex items-center gap-1 mb-2">
          Standard
        </Label>
        <Select 
          value={heatSteamStandard} 
          onValueChange={(value: 'UK' | 'EBT') => {
            setHeatSteamStandard(value);
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

      {/* Dynamically render rows based on selected standard */}
      {heatRows.length === 0 ? (
        <div className="text-sm text-gray-600">Loading heat and steam data...</div>
      ) : (
        heatRows.map((row) => (
          <div key={row.id || row.entryType} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label>{row.entryType} ({row.unit})</Label>
              <Input
                type="number"
                step="any"
                min="0"
                max="999999999999.999999"
                value={row.quantity ?? ''}
                onChange={e => {
                  const value = e.target.value;
                  if (value === '') {
                    updateHeatRowQty(row.entryType, undefined);
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0 && numValue <= 999999999999.999999) {
                      updateHeatRowQty(row.entryType, numValue);
                    }
                  }
                }}
                placeholder={`Enter ${row.unit}`}
              />
            </div>
            <div>
              <Label>Emissions</Label>
              <Input readOnly value={(row.emissions ?? '').toString()} />
            </div>
            <div>
              <Label>Factor (kg CO2e/{row.unit})</Label>
              <Input readOnly value={row.factor.toFixed(6)} />
            </div>
          </div>
        ))
      )}

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-900 font-medium">
          Total heat & steam emissions: <span className="font-semibold">{totalHeatEmissions.toFixed(6)} kg CO2e</span>
        </div>
        <Button onClick={saveHeat} disabled={savingHeat} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Save className="h-4 w-4 mr-2" /> {savingHeat ? 'Saving...' : 'Save and Next'}
        </Button>
      </div>
    </div>
  );
};

export default HeatSteamEmissions;

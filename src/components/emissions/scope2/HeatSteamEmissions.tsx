import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type HeatType = 'Onsite heat and steam' | 'District heat and steam';
interface HeatRow { 
  id?: string; 
  entryType: HeatType; 
  unit: string; 
  factor: number; 
  quantity?: number; 
  emissions?: number; 
  dbId?: string; 
}

const HEAT_DEFAULT_FACTOR = 0.17355; // kg CO2e per kWh

interface HeatSteamEmissionsProps {
  onTotalChange?: (total: number) => void;
}

const HeatSteamEmissions: React.FC<HeatSteamEmissionsProps> = ({ onTotalChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [heatRows, setHeatRows] = useState<HeatRow[]>([
    { entryType: 'Onsite heat and steam', unit: 'kWh', factor: HEAT_DEFAULT_FACTOR },
    { entryType: 'District heat and steam', unit: 'kWh', factor: HEAT_DEFAULT_FACTOR },
  ]);
  const [savingHeat, setSavingHeat] = useState(false);

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

        const nextHeat: HeatRow[] = [
          { entryType: 'Onsite heat and steam', unit: 'kWh', factor: HEAT_DEFAULT_FACTOR },
          { entryType: 'District heat and steam', unit: 'kWh', factor: HEAT_DEFAULT_FACTOR },
        ];
        (heatData || []).forEach((row: any) => {
          const idx = nextHeat.findIndex(h => h.entryType === row.entry_type);
          if (idx >= 0) {
            nextHeat[idx] = {
              id: crypto.randomUUID(),
              dbId: row.id,
              entryType: row.entry_type as HeatType,
              unit: row.unit,
              factor: row.emission_factor ?? HEAT_DEFAULT_FACTOR,
              quantity: row.quantity ?? undefined,
              emissions: row.emissions ?? undefined,
            };
          }
        });
        setHeatRows(nextHeat);
      } catch (e: any) {
        console.error(e);
        toast({ title: "Error", description: e.message || "Failed to load Heat & Steam data", variant: "destructive" });
      }
    };
    load();
  }, [user, toast]);

  const updateHeatRowQty = (entryType: HeatType, qty?: number) => {
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
          })
          .eq('id', r.dbId!)
      ));
      if (updates.length > 0) {
        const results = await Promise.all(updates);
        const updateError = (results as any[]).find(x => x.error)?.error;
        if (updateError) throw updateError;
      }

      toast({ title: "Saved", description: "Heat & Steam saved." });
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <Label>Onsite heat and steam (kWh)</Label>
          <Input
            type="number"
            step="any"
            min="0"
            max="999999999999.999999"
            value={heatRows.find(r => r.entryType === 'Onsite heat and steam')?.quantity ?? ''}
            onChange={e => {
              const value = e.target.value;
              if (value === '') {
                updateHeatRowQty('Onsite heat and steam', undefined);
              } else {
                const numValue = Number(value);
                if (numValue >= 0 && numValue <= 999999999999.999999) {
                  updateHeatRowQty('Onsite heat and steam', numValue);
                }
              }
            }}
            placeholder="Enter kWh"
          />
        </div>
        <div>
          <Label>Emissions</Label>
          <Input readOnly value={(heatRows.find(r => r.entryType === 'Onsite heat and steam')?.emissions ?? '').toString()} />
        </div>
        <div>
          <Label>Factor (kg CO2e/kWh)</Label>
          <Input readOnly value={HEAT_DEFAULT_FACTOR} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <Label>District heat and steam (kWh)</Label>
          <Input
            type="number"
            step="any"
            min="0"
            max="999999999999.999999"
            value={heatRows.find(r => r.entryType === 'District heat and steam')?.quantity ?? ''}
            onChange={e => {
              const value = e.target.value;
              if (value === '') {
                updateHeatRowQty('District heat and steam', undefined);
              } else {
                const numValue = Number(value);
                if (numValue >= 0 && numValue <= 999999999999.999999) {
                  updateHeatRowQty('District heat and steam', numValue);
                }
              }
            }}
            placeholder="Enter kWh"
          />
        </div>
        <div>
          <Label>Emissions</Label>
          <Input readOnly value={(heatRows.find(r => r.entryType === 'District heat and steam')?.emissions ?? '').toString()} />
        </div>
        <div>
          <Label>Factor (kg CO2e/kWh)</Label>
          <Input readOnly value={HEAT_DEFAULT_FACTOR} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-900 font-medium">
          Total heat & steam emissions: <span className="font-semibold">{totalHeatEmissions.toFixed(6)} kg CO2e</span>
        </div>
        <Button onClick={saveHeat} disabled={savingHeat} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Save className="h-4 w-4 mr-2" /> {savingHeat ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};

export default HeatSteamEmissions;

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Save, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FACTORS, SCOPE2_FACTORS } from "./shared/EmissionFactors";

type FuelType = "Gaseous fuels" | "Liquid fuels" | "Solid fuels";

interface OtherSourceRow {
  id: string;
  type?: FuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
  dbId?: string; // subanswer id
}

const newOtherRow = (): OtherSourceRow => ({ id: crypto.randomUUID() });

const getGridFactor = (country?: 'UAE' | 'Pakistan') => (country ? SCOPE2_FACTORS.GridCountries[country] : undefined);

interface Scope2EmissionsProps { onTotalChange?: (total: number) => void }

const Scope2Emissions: React.FC<Scope2EmissionsProps> = ({ onTotalChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [mainId, setMainId] = useState<string | null>(null);
  const [totalKwh, setTotalKwh] = useState<number | undefined>();
  const [gridPct, setGridPct] = useState<number | undefined>();
  const [renewablePct, setRenewablePct] = useState<number | undefined>();
  const [otherPct, setOtherPct] = useState<number | undefined>();

  const [gridCountry, setGridCountry] = useState<"UAE" | "Pakistan" | undefined>();
  const gridFactor = useMemo(() => getGridFactor(gridCountry), [gridCountry]);
  const [gridSubId, setGridSubId] = useState<string | undefined>();

  const [otherRows, setOtherRows] = useState<OtherSourceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Heat & Steam state
  interface HeatRow { id?: string; entryType: string; unit: string; factor: number; quantity?: number; emissions?: number; dbId?: string; }
  const HEAT_DEFAULT_FACTOR = 0.17355; // kg CO2e per kWh (fallback)
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

  const factorsSafe = FACTORS || {};
  const fuelTypes = Object.keys(factorsSafe) as FuelType[];
  const fuelsFor = (type?: FuelType) => (type ? Object.keys(factorsSafe[type] || {}) : []);
  const unitsFor = (type?: FuelType, fuel?: string) => (type && fuel ? Object.keys((factorsSafe[type] || {})[fuel] || {}) : []);

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

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        // Load latest main row
        const { data: mainData, error: mainError } = await (supabase as any)
          .from('scope2_electricity_main')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (mainError) throw mainError;

        if (mainData) {
          setMainId(mainData.id);
          setTotalKwh(mainData.total_kwh ?? undefined);
          setGridPct(mainData.grid_pct ?? undefined);
          setRenewablePct(mainData.renewable_pct ?? undefined);
          setOtherPct(mainData.other_pct ?? undefined);
        } else {
          setMainId(null);
        }

        // Load subanswers for this main row
        if (mainData?.id) {
          const { data: subData, error: subError } = await (supabase as any)
            .from('scope2_electricity_subanswers')
            .select('*')
            .eq('user_id', user.id)
            .eq('main_id', mainData.id)
            .order('created_at', { ascending: true });
          if (subError) throw subError;

          const grid = (subData || []).find(r => r.type === 'grid');
          if (grid) {
            setGridSubId(grid.id);
            setGridCountry(grid.provider_country as 'UAE' | 'Pakistan');
          } else {
            setGridSubId(undefined);
            setGridCountry(undefined);
          }

          const others = (subData || []).filter(r => r.type === 'other');
          setOtherRows(others.map(r => ({
            id: crypto.randomUUID(),
            dbId: r.id,
            type: r.other_sources_type as FuelType | undefined,
            fuel: r.other_sources_fuel ?? undefined,
            unit: r.other_sources_unit ?? undefined,
            quantity: r.other_sources_quantity ?? undefined,
            factor: r.other_sources_factor ?? undefined,
            emissions: r.other_sources_emissions ?? undefined,
          })));
        } else {
          setOtherRows([]);
          setGridSubId(undefined);
          setGridCountry(undefined);
        }

        // Load Heat & Steam entries
        {
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
        }
      } catch (e: any) {
        console.error(e);
        toast({ title: "Error", description: e.message || "Failed to load Scope 2 data", variant: "destructive" });
      }
    };
    load();
  }, [user, toast]);

  const updateOtherRow = (id: string, patch: Partial<OtherSourceRow>) => {
    setOtherRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: OtherSourceRow = { ...r, ...patch };
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

  const addOtherRow = () => setOtherRows(prev => [...prev, newOtherRow()]);
  const removeOtherRow = (id: string) => setOtherRows(prev => prev.filter(r => r.id !== id));

  const deleteExistingOtherRow = async (id: string) => {
    const row = otherRows.find(r => r.id === id);
    if (!row?.dbId) return;
    if (!confirm('Delete this other-source entry?')) return;
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      const { error } = await (supabase as any)
        .from('scope2_electricity_subanswers')
        .delete()
        .eq('id', row.dbId);
      if (error) throw error;
      setOtherRows(prev => prev.filter(r => r.id !== id));
      toast({ title: "Deleted", description: "Entry deleted." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingIds(prev => {
        const s = new Set(prev); s.delete(id); return s;
      });
    }
  };

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

  const gridEmissions = useMemo(() => {
    if (!totalKwh || !gridPct || !gridFactor) return 0;
    return Number(((gridPct / 100) * totalKwh * gridFactor).toFixed(6));
  }, [totalKwh, gridPct, gridFactor]);

  const saveAll = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }
    if (typeof totalKwh !== 'number') {
      toast({ title: "Missing total", description: "Enter total electricity consumption (kWh).", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Upsert main row
      let currentMainId = mainId;
      if (!currentMainId) {
        const { data, error } = await (supabase as any)
          .from('scope2_electricity_main')
          .insert({
            user_id: user.id,
            total_kwh: totalKwh,
            grid_pct: gridPct ?? null,
            renewable_pct: renewablePct ?? null,
            other_pct: otherPct ?? null,
            // no calculated field in schema; keep client-side only
          })
          .select('id')
          .single();
        if (error) throw error;
        currentMainId = data.id;
        setMainId(currentMainId);
      } else {
        const { error } = await (supabase as any)
          .from('scope2_electricity_main')
          .update({
            total_kwh: totalKwh,
            grid_pct: gridPct ?? null,
            renewable_pct: renewablePct ?? null,
            other_pct: otherPct ?? null,
            // no calculated field in schema; keep client-side only
          })
          .eq('id', currentMainId);
        if (error) throw error;
      }

      // Upsert grid subanswer (single)
      if (gridPct && gridPct > 0 && gridCountry && gridFactor) {
        if (gridSubId) {
          const { error } = await (supabase as any)
            .from('scope2_electricity_subanswers')
            .update({
              type: 'grid',
              provider_country: gridCountry,
              grid_emission_factor: gridFactor,
            })
            .eq('id', gridSubId);
          if (error) throw error;
        } else {
          const { data, error } = await (supabase as any)
            .from('scope2_electricity_subanswers')
            .insert({
              user_id: user.id,
              main_id: currentMainId,
              type: 'grid',
              provider_country: gridCountry,
              grid_emission_factor: gridFactor,
            })
            .select('id')
            .single();
          if (error) throw error;
          setGridSubId(data.id);
        }
      }

      // Insert/update other subanswers
      const newOthers = otherRows.filter(r => !r.dbId && r.type && r.fuel && r.unit && typeof r.quantity === 'number' && typeof r.factor === 'number' && typeof r.emissions === 'number');
      const updateOthers = otherRows.filter(r => r.dbId && (r.type || r.fuel || r.unit || typeof r.quantity === 'number' || typeof r.factor === 'number' || typeof r.emissions === 'number'));

      if (newOthers.length > 0) {
        const payload = newOthers.map(r => ({
          user_id: user.id,
          main_id: currentMainId,
          type: 'other',
          other_sources_type: r.type!,
          other_sources_fuel: r.fuel!,
          other_sources_unit: r.unit!,
          other_sources_quantity: r.quantity!,
          other_sources_factor: r.factor!,
          other_sources_emissions: r.emissions!,
        }));
        const { error } = await (supabase as any).from('scope2_electricity_subanswers').insert(payload);
        if (error) throw error;
      }

      if (updateOthers.length > 0) {
        const results = await Promise.all(updateOthers.map(r => (
          (supabase as any)           
            .from('scope2_electricity_subanswers')
            .update({
              other_sources_type: r.type ?? null,
              other_sources_fuel: r.fuel ?? null,
              other_sources_unit: r.unit ?? null,
              other_sources_quantity: r.quantity ?? null,
              other_sources_factor: r.factor ?? null,
              other_sources_emissions: r.emissions ?? null,
            })
            .eq('id', r.dbId!)
        )));
        const updateError = (results as any[]).find(x => x.error)?.error;
        if (updateError) throw updateError;
      }

      toast({ title: "Saved", description: "Scope 2 electricity data saved." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalOtherEmissions = otherRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const totalHeatEmissions = heatRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const totalScope2 = useMemo(() => Number((computedElectricityEmissions + totalHeatEmissions).toFixed(6)), [computedElectricityEmissions, totalHeatEmissions]);

  useEffect(() => {
    if (onTotalChange) onTotalChange(totalScope2);
  }, [onTotalChange, totalScope2]);

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
    if (!user) { toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" }); return; }
    const validRows = heatRows.filter(r => typeof r.quantity === 'number' && typeof r.factor === 'number' && typeof r.emissions === 'number');
    if (validRows.length === 0) { toast({ title: "Nothing to save", description: "Enter quantities for heat & steam." }); return; }
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
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingHeat(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Scope 2 - Electricity</h2>

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

          {gridPct && gridPct > 0 && (
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
              <div className="md:col-span-3 text-gray-700 font-medium">
                Grid sources emissions: <span className="font-semibold">{gridEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>
          )}

          {(otherPct && otherPct > 0 || otherRows.length > 0) && (
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
                {otherRows.map(r => {
                  const isDeleting = deletingIds.has(r.id);
                  return (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-white">
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
                        {r.dbId ? (
                          <Button size="sm" variant="outline" onClick={() => deleteExistingOtherRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700" aria-label="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" className="text-red-600" onClick={() => removeOtherRow(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-gray-700 font-medium">
                Other sources emissions: <span className="font-semibold">{totalOtherEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-gray-900 font-medium">
              Total electricity emissions: <span className="font-semibold">{computedElectricityEmissions.toFixed(6)} kg CO2e</span>
            </div>
            <Button onClick={saveAll} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Scope 2 - Heat & Steam</h2>
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

          <div className="flex items-center justify-between pt-2">
            <div className="text-gray-900 font-medium">
              Total heat & steam emissions: <span className="font-semibold">{totalHeatEmissions.toFixed(6)} kg CO2e</span>
            </div>
            <Button onClick={saveHeat} disabled={savingHeat} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Save className="h-4 w-4 mr-2" /> {savingHeat ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-right text-gray-800 font-semibold text-lg">
        Scope 2 Total: <span className="text-2xl font-bold">{totalScope2.toFixed(6)} kg CO2e</span>
      </div>
    </div>
  );
};

export default Scope2Emissions;



import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FuelRow, 
  RefrigerantRow, 
  VehicleRow, 
  DeliveryVehicleRow,
  FuelType,
  UkFactorBasis,
} from "./shared/types";
import { 
  FACTORS, 
  REFRIGERANT_FACTORS, 
} from "./shared/EmissionFactors";
import {
  availableUkPassengerBasises,
  fetchUkPassengerFactorsMap,
  getUkPassengerFactorCell,
  passengerTypeTooltipText,
  passengerUkFactorBasisFromDb,
  ukPassengerBasisValue,
  UK_PASSENGER_BASIS_LABEL,
  type UkPassengerFactorsMap,
  type UkPassengerTypeDescriptions,
} from "./shared/ukPassengerFactors";
import {
  availableUkDeliveryBasises,
  deliveryUkFactorBasisFromDb,
  fetchUkDeliveryFactorsMap,
  getUkDeliveryFactorCell,
  ukDeliveryBasisValue,
  type UkDeliveryFactorsMap,
} from "./shared/ukDeliveryFactors";
import { 
  newFuelRow, 
  newRefrigerantRow, 
  newVehicleRow, 
  newDeliveryVehicleRow,
  fuelRowChanged,
  refrigerantRowChanged,
  vehicleRowChanged,
  deliveryVehicleRowChanged,
  formatEmissions,
} from "./shared/utils";

interface Scope1EmissionsProps {
  onDataChange: (data: {
    fuel: FuelRow[];
    refrigerant: RefrigerantRow[];
    passengerVehicle: VehicleRow[];
    deliveryVehicle: DeliveryVehicleRow[];
  }) => void;
}

const Scope1Emissions: React.FC<Scope1EmissionsProps> = ({ onDataChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for all scope 1 data
  const [rows, setRows] = useState<FuelRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<FuelRow[]>([]);
  const [refrigerantRows, setRefrigerantRows] = useState<RefrigerantRow[]>([]);
  const [existingRefrigerantEntries, setExistingRefrigerantEntries] = useState<RefrigerantRow[]>([]);
  const [vehicleRows, setVehicleRows] = useState<VehicleRow[]>([]);
  const [existingVehicleEntries, setExistingVehicleEntries] = useState<VehicleRow[]>([]);
  const [deliveryVehicleRows, setDeliveryVehicleRows] = useState<DeliveryVehicleRow[]>([]);
  const [existingDeliveryVehicleEntries, setExistingDeliveryVehicleEntries] = useState<DeliveryVehicleRow[]>([]);
  
  const [saving, setSaving] = useState(false);
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // State for hover popup info
  const [hoveredInfo, setHoveredInfo] = useState<{type: 'vehicle' | 'delivery', value: string, description: string, position: {x: number, y: number}} | null>(null);
  
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

  // Computed values – guard against undefined imports (fixes "Cannot convert undefined or null to object" in some envs)
  const factorsSafe = FACTORS || {};
  const refrigerantSafe = REFRIGERANT_FACTORS || {};
  const types = Object.keys(factorsSafe) as FuelType[];
  const fuelsFor = (type?: FuelType) => (type ? Object.keys(factorsSafe[type] || {}) : []);
  const unitsFor = (type?: FuelType, fuel?: string) => (type && fuel ? Object.keys((factorsSafe[type] || {})[fuel] || {}) : []);
  const refrigerantTypes = Object.keys(refrigerantSafe);

  const [ukPassengerMap, setUkPassengerMap] = useState<UkPassengerFactorsMap>({});
  const [ukPassengerTypeDescriptions, setUkPassengerTypeDescriptions] = useState<UkPassengerTypeDescriptions>({});
  const [ukPassengerReady, setUkPassengerReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { map, typeDescriptions, error } = await fetchUkPassengerFactorsMap();
      if (cancelled) return;
      if (error) {
        console.error("UK_Passenger_factors:", error);
        toast({
          title: "Could not load passenger factors",
          description: error,
          variant: "destructive",
        });
      }
      setUkPassengerMap(map);
      setUkPassengerTypeDescriptions(typeDescriptions);
      setUkPassengerReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const [ukDeliveryMap, setUkDeliveryMap] = useState<UkDeliveryFactorsMap>({});
  const [ukDeliveryReady, setUkDeliveryReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { map, error } = await fetchUkDeliveryFactorsMap();
      if (cancelled) return;
      if (error) {
        console.error("UK_delivery-factors:", error);
        toast({
          title: "Could not load delivery factors",
          description: error,
          variant: "destructive",
        });
      }
      setUkDeliveryMap(map);
      setUkDeliveryReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const vehicleActivities = Object.keys(ukPassengerMap).sort((a, b) => a.localeCompare(b));
  const vehicleTypesFor = (activity?: string) =>
    activity ? Object.keys(ukPassengerMap[activity] || {}).sort((a, b) => a.localeCompare(b)) : [];
  const vehicleUnitsFor = (activity?: string, vehicleType?: string) =>
    activity && vehicleType
      ? Object.keys(ukPassengerMap[activity]?.[vehicleType] || {}).sort((a, b) => a.localeCompare(b))
      : [];
  const vehicleFuelsFor = (activity?: string, vehicleType?: string, unit?: string) =>
    activity && vehicleType && unit
      ? Object.keys(ukPassengerMap[activity]?.[vehicleType]?.[unit] || {}).sort((a, b) => a.localeCompare(b))
      : [];
  const ukPassengerInputsLocked = !ukPassengerReady || Object.keys(ukPassengerMap).length === 0;

  const deliveryActivities = Object.keys(ukDeliveryMap).sort((a, b) => a.localeCompare(b));
  const deliveryTypesFor = (activity?: string) =>
    activity ? Object.keys(ukDeliveryMap[activity] || {}).sort((a, b) => a.localeCompare(b)) : [];
  const deliveryUnitsFor = (activity?: string, vehicleType?: string) =>
    activity && vehicleType
      ? Object.keys(ukDeliveryMap[activity]?.[vehicleType] || {}).sort((a, b) => a.localeCompare(b))
      : [];
  const deliveryFuelsFor = (activity?: string, vehicleType?: string, unit?: string) =>
    activity && vehicleType && unit
      ? Object.keys(ukDeliveryMap[activity]?.[vehicleType]?.[unit] || {}).sort((a, b) => a.localeCompare(b))
      : [];
  const deliveryLadenFor = (activity?: string, vehicleType?: string, unit?: string, fuelType?: string) =>
    activity && vehicleType && unit && fuelType
      ? Object.keys(ukDeliveryMap[activity]?.[vehicleType]?.[unit]?.[fuelType] || {}).sort((a, b) =>
          a.localeCompare(b)
        )
      : [];
  const ukDeliveryInputsLocked = !ukDeliveryReady || Object.keys(ukDeliveryMap).length === 0;

  const deliveryActivityDescriptions: Record<string, string> = {
    "Vans": "Large goods vehicles (vans up to 3.5 tonnes).",
    "HGV (all diesel)": "Heavy Goods Vehicles for long-distance freight transport",
    "HGVs refrigerated (all diesel)": "Refrigerated road vehicles with maximum weight exceeding 3.5 tonnes."
  };

  // Load existing entries
  useEffect(() => {
    const loadExistingEntries = async () => {
      if (!user) return;

      try {
        // Load fuel entries
        const { data: fuelData, error: fuelError } = await supabase
          .from('scope1_fuel_entries')
          .select('*')
          .eq('user_id', user.id)
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

        // Load refrigerant entries
        const { data: refrigerantData, error: refrigerantError } = await supabase
          .from('scope1_refrigerant_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (refrigerantError) throw refrigerantError;

        const existingRefrigerantRows = (refrigerantData || []).map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          refrigerantType: entry.refrigerant_type,
          quantity: entry.quantity,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingRefrigerantEntries(existingRefrigerantRows);
        setRefrigerantRows(existingRefrigerantRows.length > 0 ? existingRefrigerantRows : []);

        // Load vehicle entries
        const { data: vehicleData, error: vehicleError } = await supabase
          .from('scope1_passenger_vehicle_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (vehicleError) throw vehicleError;

        const existingVehicleRows = (vehicleData || []).map(entry => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          activity: entry.activity,
          vehicleType: entry.vehicle_type,
          unit: entry.unit,
          fuelType: (entry as { fuel_type?: string }).fuel_type ?? undefined,
          ukFactorBasis:
            passengerUkFactorBasisFromDb((entry as { uk_factor_basis?: string }).uk_factor_basis) ??
            "total",
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingVehicleEntries(existingVehicleRows);
        setVehicleRows(existingVehicleRows.length > 0 ? existingVehicleRows : []);

        // Load delivery vehicle entries
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
          fuelType: (entry as { fuel_type?: string }).fuel_type ?? undefined,
          ladenLevel:
            (entry as { laden_level?: string }).laden_level !== undefined &&
            (entry as { laden_level?: string }).laden_level !== null
              ? String((entry as { laden_level?: string }).laden_level)
              : undefined,
          ukFactorBasis:
            deliveryUkFactorBasisFromDb((entry as { uk_factor_basis?: string }).uk_factor_basis) ??
            "total",
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingDeliveryVehicleEntries(existingDelRows);
        setDeliveryVehicleRows(existingDelRows.length > 0 ? existingDelRows : []);

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
      onDataChange({
        fuel: rows,
        refrigerant: refrigerantRows,
        passengerVehicle: vehicleRows,
        deliveryVehicle: deliveryVehicleRows,
      });
    }
  }, [rows, refrigerantRows, vehicleRows, deliveryVehicleRows, isInitialLoad, onDataChange]);

  // Row management functions
  const addRow = () => setRows(prev => [...prev, newFuelRow()]);
  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const addRefrigerantRow = () => setRefrigerantRows(prev => [...prev, newRefrigerantRow()]);
  const removeRefrigerantRow = (id: string) => setRefrigerantRows(prev => prev.filter(r => r.id !== id));
  const addVehicleRow = () => setVehicleRows(prev => [...prev, newVehicleRow()]);
  const removeVehicleRow = (id: string) => setVehicleRows(prev => prev.filter(r => r.id !== id));
  const addDeliveryRow = () => setDeliveryVehicleRows(prev => [...prev, newDeliveryVehicleRow()]);
  const removeDeliveryRow = (id: string) => setDeliveryVehicleRows(prev => prev.filter(r => r.id !== id));

  // Update functions
  const updateRow = (id: string, patch: Partial<FuelRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: FuelRow = { ...r, ...patch };
      if (next.type && next.fuel && next.unit) {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
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

  const updateRefrigerantRow = (id: string, patch: Partial<RefrigerantRow>) => {
    setRefrigerantRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: RefrigerantRow = { ...r, ...patch };
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

  const updateVehicleRow = (id: string, patch: Partial<VehicleRow>) => {
    setVehicleRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: VehicleRow = { ...r, ...patch };
      if (next.activity && next.vehicleType && next.unit && next.fuelType) {
        const cell = getUkPassengerFactorCell(
          ukPassengerMap,
          next.activity,
          next.vehicleType,
          next.unit,
          next.fuelType
        );
        if (cell) {
          const avail = availableUkPassengerBasises(cell);
          let basis: UkFactorBasis = next.ukFactorBasis || "total";
          if (avail.length > 0 && !avail.includes(basis)) {
            basis = avail[0];
            next.ukFactorBasis = basis;
          }
          const factor =
            avail.length > 0 ? ukPassengerBasisValue(cell, basis) : undefined;
          next.factor = typeof factor === "number" ? factor : undefined;
        } else {
          next.factor = undefined;
        }
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

  const updateDeliveryRow = (id: string, patch: Partial<DeliveryVehicleRow>) => {
    setDeliveryVehicleRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: DeliveryVehicleRow = { ...r, ...patch };
      if (next.activity && next.vehicleType && next.unit && next.fuelType) {
        const ladenOpts = deliveryLadenFor(next.activity, next.vehicleType, next.unit, next.fuelType);
        let laden = next.ladenLevel;
        if (ladenOpts.length > 0 && (laden === undefined || !ladenOpts.includes(laden))) {
          laden = ladenOpts[0];
          next.ladenLevel = laden;
        }
        const cell = getUkDeliveryFactorCell(
          ukDeliveryMap,
          next.activity,
          next.vehicleType,
          next.unit,
          next.fuelType,
          laden
        );
        if (cell) {
          const avail = availableUkDeliveryBasises(cell);
          let basis: UkFactorBasis = next.ukFactorBasis || "total";
          if (avail.length > 0 && !avail.includes(basis)) {
            basis = avail[0];
            next.ukFactorBasis = basis;
          }
          const factor =
            avail.length > 0 ? ukDeliveryBasisValue(cell, basis) : undefined;
          next.factor = typeof factor === "number" ? factor : undefined;
        } else {
          next.factor = undefined;
        }
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

  const deleteExistingRefrigerantRow = async (id: string) => {
    const row = refrigerantRows.find(r => r.id === id);
    if (!row || !row.dbId) return;

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingRows(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope1_refrigerant_entries')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setRefrigerantRows(prev => prev.filter(r => r.id !== id));
      setExistingRefrigerantEntries(prev => prev.filter(r => r.id !== id));
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

  const deleteExistingVehicleRow = async (id: string) => {
    const row = vehicleRows.find(r => r.id === id);
    if (!row || !row.dbId) return;

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingRows(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope1_passenger_vehicle_entries')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setVehicleRows(prev => prev.filter(r => r.id !== id));
      setExistingVehicleEntries(prev => prev.filter(r => r.id !== id));
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

  const deleteExistingDeliveryRow = async (id: string) => {
    const row = deliveryVehicleRows.find(r => r.id === id);
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
      
      setDeliveryVehicleRows(prev => prev.filter(r => r.id !== id));
      setExistingDeliveryVehicleEntries(prev => prev.filter(r => r.id !== id));
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

  const saveRefrigerantEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = refrigerantRows.filter(r => 
      r.refrigerantType && 
      typeof r.quantity === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );

    const changedExisting = refrigerantRows.filter(r => r.isExisting && r.dbId && refrigerantRowChanged(r, existingRefrigerantEntries));

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed refrigerant entries." });
      return;
    }

    setSaving(true);
    try {
      const payload = newEntries.map(v => ({
        user_id: user.id,
        refrigerant_type: v.refrigerantType!,
        quantity: v.quantity!,
        emission_factor: v.factor!,
        emissions: v.emissions!,
      }));

      if (payload.length > 0) {
        const { error } = await supabase.from('scope1_refrigerant_entries').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(v => (
          supabase
            .from('scope1_refrigerant_entries')
            .update({
              refrigerant_type: v.refrigerantType!,
              quantity: v.quantity!,
              emission_factor: v.factor!,
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

      // Reload data
      const { data: newData } = await supabase
        .from('scope1_refrigerant_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedExistingRows = newData.map(entry => ({
          id: crypto.randomUUID(),
          dbId: String(entry.id),
          refrigerantType: entry.refrigerant_type,
          quantity: entry.quantity,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));
        setExistingRefrigerantEntries(updatedExistingRows);
        setRefrigerantRows(updatedExistingRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveVehicleEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = vehicleRows.filter(r => 
      r.activity && r.vehicleType && r.unit && r.fuelType &&
      typeof r.distance === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );

    const changedExisting = vehicleRows.filter(
      (r) =>
        r.isExisting &&
        r.dbId &&
        vehicleRowChanged(r, existingVehicleEntries) &&
        r.fuelType &&
        typeof r.distance === "number" &&
        typeof r.factor === "number"
    );

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed passenger vehicle entries." });
      return;
    }

    setSaving(true);
    try {
      const payload = newEntries.map(v => ({
        user_id: user.id,
        activity: v.activity!,
        vehicle_type: v.vehicleType!,
        unit: v.unit!,
        fuel_type: v.fuelType!,
        uk_factor_basis: v.ukFactorBasis || "total",
        distance: v.distance!,
        emission_factor: v.factor!,
        emissions: v.emissions!,
      }));

      if (payload.length > 0) {
        const { error } = await supabase.from('scope1_passenger_vehicle_entries').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(v => (
          supabase
            .from('scope1_passenger_vehicle_entries')
            .update({
              activity: v.activity!,
              vehicle_type: v.vehicleType!,
              unit: v.unit!,
              fuel_type: v.fuelType!,
              uk_factor_basis: v.ukFactorBasis || "total",
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

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      // Reload data
      const { data: newData } = await supabase
        .from('scope1_passenger_vehicle_entries')
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
          fuelType: (entry as { fuel_type?: string }).fuel_type ?? undefined,
          ukFactorBasis:
            passengerUkFactorBasisFromDb((entry as { uk_factor_basis?: string }).uk_factor_basis) ??
            "total",
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));
        setExistingVehicleEntries(updatedExistingRows);
        setVehicleRows(updatedExistingRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveDeliveryEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = deliveryVehicleRows.filter(r => 
      r.activity && r.vehicleType && r.unit && r.fuelType &&
      r.ladenLevel !== undefined &&
      typeof r.distance === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );
    const changedExisting = deliveryVehicleRows.filter(r => r.isExisting && r.dbId && deliveryVehicleRowChanged(r, existingDeliveryVehicleEntries));
    
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
        fuel_type: v.fuelType!,
        laden_level: v.ladenLevel ?? "",
        uk_factor_basis: v.ukFactorBasis || "total",
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
              fuel_type: v.fuelType!,
              laden_level: v.ladenLevel ?? "",
              uk_factor_basis: v.ukFactorBasis || "total",
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
          fuelType: (entry as { fuel_type?: string }).fuel_type ?? undefined,
          ladenLevel:
            (entry as { laden_level?: string }).laden_level !== undefined &&
            (entry as { laden_level?: string }).laden_level !== null
              ? String((entry as { laden_level?: string }).laden_level)
              : undefined,
          ukFactorBasis:
            deliveryUkFactorBasisFromDb((entry as { uk_factor_basis?: string }).uk_factor_basis) ??
            "total",
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));
        setExistingDeliveryVehicleEntries(updatedExistingRows);
        setDeliveryVehicleRows(updatedExistingRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const totalRefrigerantEmissions = refrigerantRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const totalVehicleEmissions = vehicleRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const totalDeliveryEmissions = deliveryVehicleRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const totalAllEmissions = totalEmissions + totalRefrigerantEmissions + totalVehicleEmissions + totalDeliveryEmissions;

  return (
    <TooltipProvider>
      <div className="space-y-8">
      {/* Fuel Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Fuel</h2>
            <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />Add New Row
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Label className="md:col-span-1 text-gray-500">Type</Label>
            <Label className="md:col-span-1 text-gray-500">Fuel</Label>
            <Label className="md:col-span-1 text-gray-500">Unit</Label>
            <Label className="md:col-span-1 text-gray-500">Quantity</Label>
          </div>

          <div className="space-y-3 mt-2">
            {rows.map((r) => {
              const isDeleting = deletingRows.has(r.id);
              
              return (
                <div key={r.id} className={`grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-white`}>
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

          <div className="flex items-center justify-between mt-6">
            <div className="text-gray-700 font-medium">
              Total Fuel Emissions: <span className="font-semibold">{formatEmissions(totalEmissions)} kg CO2e</span>
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
                  {saving ? 'Saving...' : `Save Changes (${totalPending})`}
                </Button>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Refrigerant Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Refrigerant</h2>
            <Button onClick={addRefrigerantRow} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />Add New Row
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Label className="md:col-span-1 text-gray-500">Refrigerant Type</Label>
            <Label className="md:col-span-1 text-gray-500">Quantity (kg)</Label>
          </div>

          <div className="space-y-3 mt-2">
            {refrigerantRows.map((r) => {
              const isDeleting = deletingRows.has(r.id);
              
              return (
                <div key={r.id} className={`grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-3 rounded-lg bg-white`}>
                  <Select 
                    value={r.refrigerantType} 
                    onValueChange={(v) => updateRefrigerantRow(r.id, { refrigerantType: v })}
                    disabled={false}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select refrigerant type" />
                    </SelectTrigger>
                    <SelectContent>
                      {refrigerantTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
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
                          updateRefrigerantRow(r.id, { quantity: undefined });
                        } else {
                          const numValue = Number(value);
                          if (numValue >= 0 && numValue <= 999999999999.999999) {
                            updateRefrigerantRow(r.id, { quantity: numValue });
                          }
                        }
                      }} 
                      placeholder="Enter quantity"
                      disabled={false}
                    />
                    {r.isExisting ? (
                      <Button size="sm" variant="outline" onClick={() => deleteExistingRefrigerantRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" className="text-red-600" onClick={() => removeRefrigerantRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-gray-700 font-medium">
              Total Refrigerant Emissions: <span className="font-semibold">{formatEmissions(totalRefrigerantEmissions)} kg CO2e</span>
            </div>
            {(() => {
              const pendingNew = refrigerantRows.filter(r => !r.isExisting).length;
              const pendingUpdates = refrigerantRows.filter(r => r.isExisting && refrigerantRowChanged(r, existingRefrigerantEntries)).length;
              const totalPending = pendingNew + pendingUpdates;
              return (
                <Button 
                  onClick={saveRefrigerantEntries} 
                  disabled={saving || totalPending === 0} 
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : `Save Changes (${totalPending})`}
                </Button>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Passenger Vehicle Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Passenger Vehicle</h2>
            <Button onClick={addVehicleRow} disabled={ukPassengerInputsLocked} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />Add New Row
            </Button>
          </div>

          {ukPassengerReady && Object.keys(ukPassengerMap).length === 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              No rows in UK_Passenger_factors. Add reference data (activity, type, unit, fuel_type, kg_co2e), then refresh.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <Label className="md:col-span-1 text-gray-500">Activity</Label>
            <Label className="md:col-span-1 text-gray-500">Type</Label>
            <Label className="md:col-span-1 text-gray-500">Unit</Label>
            <Label className="md:col-span-1 text-gray-500">Fuel</Label>
            <Label className="md:col-span-1 text-gray-500">Factor</Label>
            <Label className="md:col-span-1 text-gray-500">Distance</Label>
          </div>

          <div className="space-y-3 mt-2">
            {vehicleRows.map((r) => {
              const isDeleting = deletingRows.has(r.id);
              
              return (
                <div key={r.id} className={`grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-3 rounded-lg bg-white`}>
                  <Select 
                    value={r.activity} 
                    onValueChange={(v) =>
                      updateVehicleRow(r.id, {
                        activity: v,
                        vehicleType: undefined,
                        unit: undefined,
                        fuelType: undefined,
                        ukFactorBasis: undefined,
                      })
                    }
                    disabled={ukPassengerInputsLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleActivities.map(activity => <SelectItem key={activity} value={activity}>{activity}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={r.vehicleType} 
                    onValueChange={(v) => {
                      setHoveredInfo(null); // Clear popup when option is selected
                      updateVehicleRow(r.id, {
                        vehicleType: v,
                        unit: undefined,
                        fuelType: undefined,
                        ukFactorBasis: undefined,
                      });
                    }} 
                    disabled={ukPassengerInputsLocked || !r.activity}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypesFor(r.activity).map(type => (
                        <SelectItem 
                          key={type} 
                          value={type}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredInfo({
                              type: 'vehicle',
                              value: type,
                              description: passengerTypeTooltipText(ukPassengerTypeDescriptions, r.activity, type),
                              position: { x: rect.right + 10, y: rect.top }
                            });
                          }}
                          onMouseLeave={() => setHoveredInfo(null)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{type}</span>
                            <Info className="h-4 w-4 text-gray-400 ml-2" />
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={r.unit} 
                    onValueChange={(v) =>
                      updateVehicleRow(r.id, { unit: v, fuelType: undefined, ukFactorBasis: undefined })
                    } 
                    disabled={ukPassengerInputsLocked || !r.activity || !r.vehicleType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleUnitsFor(r.activity, r.vehicleType).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select
                    value={r.fuelType}
                    onValueChange={(v) => updateVehicleRow(r.id, { fuelType: v, ukFactorBasis: undefined })}
                    disabled={ukPassengerInputsLocked || !r.activity || !r.vehicleType || !r.unit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleFuelsFor(r.activity, r.vehicleType, r.unit).map((fuel) => (
                        <SelectItem key={fuel} value={fuel}>
                          {fuel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(() => {
                    const cell = getUkPassengerFactorCell(
                      ukPassengerMap,
                      r.activity,
                      r.vehicleType,
                      r.unit,
                      r.fuelType
                    );
                    const avail = availableUkPassengerBasises(cell);
                    if (!r.activity || !r.vehicleType || !r.unit || !r.fuelType) {
                      return <div className="h-10 rounded-md border border-dashed border-gray-200 bg-white/50" />;
                    }
                    if (avail.length === 0) {
                      return (
                        <p className="text-xs text-amber-700 leading-tight px-1">
                          No factor columns for this row in UK_Passenger_factors.
                        </p>
                      );
                    }
                    const selectValue = avail.includes(r.ukFactorBasis || "total")
                      ? (r.ukFactorBasis || "total")
                      : avail[0];
                    return (
                      <Select
                        value={selectValue}
                        onValueChange={(v) => updateVehicleRow(r.id, { ukFactorBasis: v as UkFactorBasis })}
                        disabled={ukPassengerInputsLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select factor column" />
                        </SelectTrigger>
                        <SelectContent>
                          {avail.map((b) => (
                            <SelectItem key={b} value={b}>
                              {UK_PASSENGER_BASIS_LABEL[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}

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
                          updateVehicleRow(r.id, { distance: undefined });
                        } else {
                          const numValue = Number(value);
                          if (numValue >= 0 && numValue <= 999999999999.999999) {
                            updateVehicleRow(r.id, { distance: numValue });
                          }
                        }
                      }} 
                      placeholder="Enter distance"
                      disabled={false}
                      className="flex-1"
                    />
                    {r.isExisting ? (
                      <Button size="sm" variant="outline" onClick={() => deleteExistingVehicleRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700 ml-2" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" className="text-red-600 ml-2" onClick={() => removeVehicleRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-gray-700 font-medium">
              Total Vehicle Emissions: <span className="font-semibold">{formatEmissions(totalVehicleEmissions)} kg CO2e</span>
            </div>
            {(() => {
              const pendingNew = vehicleRows.filter(r => !r.isExisting).length;
              const pendingUpdates = vehicleRows.filter(r => r.isExisting && vehicleRowChanged(r, existingVehicleEntries)).length;
              const totalPending = pendingNew + pendingUpdates;
              return (
                <Button 
                  onClick={saveVehicleEntries} 
                  disabled={saving || totalPending === 0 || ukPassengerInputsLocked} 
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : `Save Changes (${totalPending})`}
                </Button>
              );
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Vehicle Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Delivery Vehicles</h2>
            <Button
              onClick={addDeliveryRow}
              disabled={ukDeliveryInputsLocked}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />Add New Row
            </Button>
          </div>

          {ukDeliveryReady && Object.keys(ukDeliveryMap).length === 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              No usable reference rows loaded. Ensure the{" "}
              <span className="font-mono">UK_delivery-factors</span> table exists (run migrations), then add data in
              Supabase with at least: <span className="font-mono">activity</span>, <span className="font-mono">type</span>,{" "}
              <span className="font-mono">unit</span>, <span className="font-mono">fuel_type</span>,{" "}
              <span className="font-mono">laden_level</span> / <span className="font-mono">laden_lev</span> (use an
              empty string if not applicable), and{" "}
              <span className="font-mono">kg_co2e</span> and/or the per-gas columns. Refresh the page after importing.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Label className="md:col-span-1 text-gray-500">Activity</Label>
            <Label className="md:col-span-1 text-gray-500">Type</Label>
            <Label className="md:col-span-1 text-gray-500">Unit</Label>
            <Label className="md:col-span-1 text-gray-500">Fuel</Label>
            <Label className="md:col-span-1 text-gray-500">Laden</Label>
            <Label className="md:col-span-1 text-gray-500">Factor</Label>
            <Label className="md:col-span-1 text-gray-500">Distance</Label>
          </div>

          <div className="space-y-3 mt-2">
            {deliveryVehicleRows.map((r) => {
              const isDeleting = deletingRows.has(r.id);
              
              return (
                <div key={r.id} className={`grid grid-cols-1 md:grid-cols-7 gap-4 items-center p-3 rounded-lg bg-white`}>
                  <Select 
                    value={r.activity} 
                    onValueChange={(v) => {
                      setHoveredInfo(null);
                      updateDeliveryRow(r.id, {
                        activity: v,
                        vehicleType: undefined,
                        unit: undefined,
                        fuelType: undefined,
                        ladenLevel: undefined,
                        ukFactorBasis: undefined,
                      });
                    }}
                    disabled={ukDeliveryInputsLocked}
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
                              type: 'delivery',
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
                    onValueChange={(v) =>
                      updateDeliveryRow(r.id, {
                        vehicleType: v,
                        unit: undefined,
                        fuelType: undefined,
                        ladenLevel: undefined,
                        ukFactorBasis: undefined,
                      })
                    } 
                    disabled={ukDeliveryInputsLocked || !r.activity}
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
                    onValueChange={(v) =>
                      updateDeliveryRow(r.id, {
                        unit: v,
                        fuelType: undefined,
                        ladenLevel: undefined,
                        ukFactorBasis: undefined,
                      })
                    } 
                    disabled={ukDeliveryInputsLocked || !r.activity || !r.vehicleType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryUnitsFor(r.activity, r.vehicleType).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  <Select
                    value={r.fuelType}
                    onValueChange={(v) =>
                      updateDeliveryRow(r.id, {
                        fuelType: v,
                        ladenLevel: undefined,
                        ukFactorBasis: undefined,
                      })
                    }
                    disabled={ukDeliveryInputsLocked || !r.activity || !r.vehicleType || !r.unit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryFuelsFor(r.activity, r.vehicleType, r.unit).map((fuel) => (
                        <SelectItem key={fuel} value={fuel}>
                          {fuel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={
                      r.ladenLevel === undefined
                        ? undefined
                        : r.ladenLevel === ""
                          ? "__empty_laden__"
                          : r.ladenLevel
                    }
                    onValueChange={(v) =>
                      updateDeliveryRow(r.id, {
                        ladenLevel: v === "__empty_laden__" ? "" : v,
                        ukFactorBasis: undefined,
                      })
                    }
                    disabled={
                      ukDeliveryInputsLocked ||
                      !r.activity ||
                      !r.vehicleType ||
                      !r.unit ||
                      !r.fuelType ||
                      deliveryLadenFor(r.activity, r.vehicleType, r.unit, r.fuelType).length === 0
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Laden level" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryLadenFor(r.activity, r.vehicleType, r.unit, r.fuelType).map((lv) => (
                        <SelectItem
                          key={lv || "__empty_key__"}
                          value={lv === "" ? "__empty_laden__" : lv}
                        >
                          {lv === "" ? "(none)" : lv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(() => {
                    const cell = getUkDeliveryFactorCell(
                      ukDeliveryMap,
                      r.activity,
                      r.vehicleType,
                      r.unit,
                      r.fuelType,
                      r.ladenLevel
                    );
                    const avail = availableUkDeliveryBasises(cell);
                    if (!r.activity || !r.vehicleType || !r.unit || !r.fuelType) {
                      return <div className="h-10 rounded-md border border-dashed border-gray-200 bg-white/50" />;
                    }
                    if (r.ladenLevel === undefined) {
                      return <div className="h-10 rounded-md border border-dashed border-gray-200 bg-white/50" />;
                    }
                    if (avail.length === 0) {
                      return (
                        <p className="text-xs text-amber-700 leading-tight px-1">
                          No factor columns for this row in UK_delivery-factors.
                        </p>
                      );
                    }
                    const selectValue = avail.includes(r.ukFactorBasis || "total")
                      ? (r.ukFactorBasis || "total")
                      : avail[0];
                    return (
                      <Select
                        value={selectValue}
                        onValueChange={(v) => updateDeliveryRow(r.id, { ukFactorBasis: v as UkFactorBasis })}
                        disabled={ukDeliveryInputsLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select factor column" />
                        </SelectTrigger>
                        <SelectContent>
                          {avail.map((b) => (
                            <SelectItem key={b} value={b}>
                              {UK_PASSENGER_BASIS_LABEL[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}

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
                          updateDeliveryRow(r.id, { distance: undefined });
                        } else {
                          const numValue = Number(value);
                          if (numValue >= 0 && numValue <= 999999999999.999999) {
                            updateDeliveryRow(r.id, { distance: numValue });
                          }
                        }
                      }} 
                      placeholder="Enter distance"
                      disabled={false}
                      className="flex-1"
                    />
                    {r.isExisting ? (
                      <Button size="sm" variant="outline" onClick={() => deleteExistingDeliveryRow(r.id)} disabled={isDeleting} className="text-red-600 hover:text-red-700 ml-2" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" className="text-red-600 ml-2" onClick={() => removeDeliveryRow(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="text-gray-700 font-medium">
              Total Delivery Vehicle Emissions: <span className="font-semibold">{formatEmissions(totalDeliveryEmissions)} kg CO2e</span>
            </div>
            {(() => {
              const pendingNew = deliveryVehicleRows.filter(r => !r.isExisting).length;
              const pendingUpdates = deliveryVehicleRows.filter(r => r.isExisting && deliveryVehicleRowChanged(r, existingDeliveryVehicleEntries)).length;
              const totalPending = pendingNew + pendingUpdates;
              return (
                <Button 
                  onClick={saveDeliveryEntries} 
                  disabled={saving || totalPending === 0 || ukDeliveryInputsLocked} 
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : `Save Changes (${totalPending})`}
                </Button>
              );
            })()}
          </div>
        </CardContent>
      </Card>
      
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
      
      <div className="text-right text-gray-800 font-semibold text-lg">
        Total Scope 1 Emissions: <span className="text-2xl font-bold">{formatEmissions(totalAllEmissions)} kg CO2e</span>
      </div>
      </div>
    </TooltipProvider>
  );
};

export default Scope1Emissions;

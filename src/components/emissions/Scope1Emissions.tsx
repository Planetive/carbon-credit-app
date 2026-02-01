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
  FuelType 
} from "./shared/types";
import { 
  FACTORS, 
  REFRIGERANT_FACTORS, 
  VEHICLE_FACTORS, 
  DELIVERY_VEHICLE_FACTORS 
} from "./shared/EmissionFactors";
import { 
  newFuelRow, 
  newRefrigerantRow, 
  newVehicleRow, 
  newDeliveryVehicleRow,
  fuelRowChanged,
  refrigerantRowChanged,
  vehicleRowChanged,
  deliveryVehicleRowChanged
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
  const vehicleSafe = VEHICLE_FACTORS || {};
  const deliverySafe = DELIVERY_VEHICLE_FACTORS || {};
  const types = Object.keys(factorsSafe) as FuelType[];
  const fuelsFor = (type?: FuelType) => (type ? Object.keys(factorsSafe[type] || {}) : []);
  const unitsFor = (type?: FuelType, fuel?: string) => (type && fuel ? Object.keys((factorsSafe[type] || {})[fuel] || {}) : []);
  const refrigerantTypes = Object.keys(refrigerantSafe);
  const vehicleActivities = Object.keys(vehicleSafe);
  const vehicleTypesFor = (activity?: string) => (activity ? Object.keys(vehicleSafe[activity] || {}) : []);
  const vehicleUnitsFor = (activity?: string, vehicleType?: string) => (activity && vehicleType ? Object.keys((vehicleSafe[activity] || {})[vehicleType] || {}) : []);
  const deliveryActivities = Object.keys(deliverySafe);
  const deliveryTypesFor = (activity?: string) => (activity ? Object.keys(deliverySafe[activity] || {}) : []);
  const deliveryUnitsFor = (activity?: string, vehicleType?: string) => (activity && vehicleType ? Object.keys((deliverySafe[activity] || {})[vehicleType] || {}) : []);

  // Vehicle type descriptions
  const vehicleTypeDescriptions: Record<string, string> = {
    "Mini": "This is the smallest category of car sometimes referred to as a city car. Examples include: Citroën C1, Fiat/Alfa Romeo 500 and Panda, Peugeot 107, Volkswagen up!, Renault TWINGO, Toyota AYGO, smart fortwo and Hyundai i 10.",
    "Supermini": "This is a car that is larger than a city car, but smaller than a small family car. Examples include: Ford Fiesta, Renault CLIO, Volkswagen Polo, Citroën C2 and C3, Opel Corsa, Peugeot 208, and Toyota Yaris.",
    "Lower medium": "This is a small, compact family car. Examples include: Volkswagen Golf, Ford Focus, Opel Astra, Audi A3, BMW 1 Series, Renault Mégane and Toyota Auris.",
    "Upper medium": "This is classed as a large family car. Examples include: BMW 3 Series, ŠKODA Octavia, Volkswagen Passat, Audi A4, Mercedes Benz C Class and Peugeot 508.",
    "Executive": "These are large cars. Examples include: BMW 5 Series, Audi A5 and A6, Mercedes Benz E Class and Skoda Superb.",
    "Luxury": "This is a luxury car which is niche in the European market. Examples include: Jaguar XF, Mercedes-Benz S-Class, .BMW 7 series, Audi A8, Porsche Panamera and Lexus LS.",
    "Sports": "Sport cars are a small, usually two seater with two doors and designed for speed, high acceleration, and manoeuvrability. Examples include: Mercedes-Benz SLK, Audi TT, Porsche 911 and Boxster, and Peugeot RCZ.",
    "Dual purpose 4X4": "These are sport utility vehicles (SUVs) which have off-road capabilities and four-wheel drive. Examples include: Suzuki Jimny, Land Rover Discovery and Defender, Toyota Land Cruiser, and Nissan Pathfinder.",
    "MPV": "These are multipurpose cars. Examples include: Ford C-Max, Renault Scenic, Volkswagen Touran, Opel Zafira, Ford B-Max, and Citroën C3 Picasso and C4 Picasso.",
    "Small car":"Petrol/LPG/CNG - up to a 1.4-litre engine, Diesel - up to a 1.7-litre engine, Others - vehicles models of a similar size (i.e. market segment A or B)",
    "Medium car":"Petrol/LPG/CNG - from 1.4-litre to 2.0-litre engine, Diesel - from 1.7-litre to 2.0-litre engine, Others - vehicles models of a similar size (i.e. generally market segment C)",
    "Large car":"Petrol/LPG/CNG - 2.0-litre engine + Diesel - 2.0-litre engine + Others - vehicles models of a similar size (i.e. generally market segment D and above)",
    "Average car":"Unknown engine size",
    "Small":"Mopeds/scooters up to 125cc.",
    "Medium":"Mopeds/scooters 125cc to 500cc.",
    "Large":"Mopeds/scooters 500cc +.",
    "Average":"Unknown engine size"
  };

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
      if (next.activity && next.vehicleType && next.unit) {
        const factor = VEHICLE_FACTORS[next.activity]?.[next.vehicleType]?.[next.unit];
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

  const updateDeliveryRow = (id: string, patch: Partial<DeliveryVehicleRow>) => {
    setDeliveryVehicleRows(prev => prev.map(r => {
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
      r.activity && r.vehicleType && r.unit && 
      typeof r.distance === 'number' && 
      typeof r.factor === 'number' && 
      !r.isExisting
    );

    const changedExisting = vehicleRows.filter(r => r.isExisting && r.dbId && vehicleRowChanged(r, existingVehicleEntries));

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
      r.activity && r.vehicleType && r.unit && 
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
              Total Refrigerant Emissions: <span className="font-semibold">{totalRefrigerantEmissions.toFixed(6)} kg CO2e</span>
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
            <Button onClick={addVehicleRow} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />Add New Row
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Label className="md:col-span-1 text-gray-500">Activity</Label>
            <Label className="md:col-span-1 text-gray-500">Type</Label>
            <Label className="md:col-span-1 text-gray-500">Unit</Label>
            <Label className="md:col-span-1 text-gray-500">Distance</Label>
          </div>

          <div className="space-y-3 mt-2">
            {vehicleRows.map((r) => {
              const isDeleting = deletingRows.has(r.id);
              
              return (
                <div key={r.id} className={`grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-white`}>
                  <Select 
                    value={r.activity} 
                    onValueChange={(v) => updateVehicleRow(r.id, { activity: v, vehicleType: undefined, unit: undefined })}
                    disabled={false}
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
                      updateVehicleRow(r.id, { vehicleType: v, unit: undefined });
                    }} 
                    disabled={!r.activity}
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
                              description: vehicleTypeDescriptions[type] || "Vehicle type information",
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
                    onValueChange={(v) => updateVehicleRow(r.id, { unit: v })} 
                    disabled={!r.activity || !r.vehicleType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleUnitsFor(r.activity, r.vehicleType).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
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
              Total Vehicle Emissions: <span className="font-semibold">{totalVehicleEmissions.toFixed(6)} kg CO2e</span>
            </div>
            {(() => {
              const pendingNew = vehicleRows.filter(r => !r.isExisting).length;
              const pendingUpdates = vehicleRows.filter(r => r.isExisting && vehicleRowChanged(r, existingVehicleEntries)).length;
              const totalPending = pendingNew + pendingUpdates;
              return (
                <Button 
                  onClick={saveVehicleEntries} 
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

      {/* Delivery Vehicle Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Delivery Vehicles</h2>
            <Button onClick={addDeliveryRow} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />Add New Row
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Label className="md:col-span-1 text-gray-500">Activity</Label>
            <Label className="md:col-span-1 text-gray-500">Type</Label>
            <Label className="md:col-span-1 text-gray-500">Unit</Label>
            <Label className="md:col-span-1 text-gray-500">Distance</Label>
          </div>

          <div className="space-y-3 mt-2">
            {deliveryVehicleRows.map((r) => {
              const isDeleting = deletingRows.has(r.id);
              
              return (
                <div key={r.id} className={`grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-white`}>
                  <Select 
                    value={r.activity} 
                    onValueChange={(v) => {
                      setHoveredInfo(null); // Clear popup when option is selected
                      updateDeliveryRow(r.id, { activity: v, vehicleType: undefined, unit: undefined });
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
                    onValueChange={(v) => updateDeliveryRow(r.id, { vehicleType: v, unit: undefined })} 
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
                    onValueChange={(v) => updateDeliveryRow(r.id, { unit: v })} 
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
              Total Delivery Vehicle Emissions: <span className="font-semibold">{totalDeliveryEmissions.toFixed(6)} kg CO2e</span>
            </div>
            {(() => {
              const pendingNew = deliveryVehicleRows.filter(r => !r.isExisting).length;
              const pendingUpdates = deliveryVehicleRows.filter(r => r.isExisting && deliveryVehicleRowChanged(r, existingDeliveryVehicleEntries)).length;
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
        Total Scope 1 Emissions: <span className="text-2xl font-bold">{totalAllEmissions.toFixed(6)} kg CO2e</span>
      </div>
      </div>
    </TooltipProvider>
  );
};

export default Scope1Emissions;

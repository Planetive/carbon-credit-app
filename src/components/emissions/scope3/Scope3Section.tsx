import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Save, Trash2, Info, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { FieldTooltip } from "@/components/shared/finance/FieldTooltip";
import { SupplierAutocomplete } from "./SupplierAutocomplete";
import { Supplier } from "./types";
import { getAllVehicleTypes, VehicleType } from "./vehicleTypes";
import { supabase } from "@/integrations/supabase/client";
import { WasteMaterial, getAvailableDisposalMethods, getEmissionFactor, DisposalMethod, getAllWasteMaterials } from "./wasteTypes";
import { getAllBusinessTravelTypes, BusinessTravelType } from "./businessTravelTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import LeasedAssetsSection from "./LeasedAssetsSection";
import { getVehicleTypeNote, getVehicleTypeSuperscript, cleanVehicleTypeName } from "./utils/vehicleTypeHelpers";
import { useEmissionSync } from "./hooks/useEmissionSync";
import { InvestmentsSection } from "./components/InvestmentsSection";
import { FacilitatedEmissionsSection } from "./components/FacilitatedEmissionsSection";
import { FranchisesSection } from "./components/FranchisesSection";
import { FuelEnergyActivitiesSection } from "./components/FuelEnergyActivitiesSection";
import { PurchasedGoodsSection } from "./components/PurchasedGoodsSection";
import { CapitalGoodsSection } from "./components/CapitalGoodsSection";
import { BusinessTravelSection } from "./components/BusinessTravelSection";
import { EmployeeCommutingSection } from "./components/EmployeeCommutingSection";
import { WasteGeneratedSection } from "./components/WasteGeneratedSection";
import { EndOfLifeTreatmentSection } from "./components/EndOfLifeTreatmentSection";
import { UpstreamTransportationSection } from "./components/UpstreamTransportationSection";
import { DownstreamTransportationSection } from "./components/DownstreamTransportationSection";
import { ProcessingUseSoldProductsShell } from "@/features/emission-calculator/scope3/categories/processing-use-of-sold-products/ProcessingUseSoldProductsShell";
import type {
  PurchasedGoodsRow,
  CapitalGoodsRow,
  UpstreamTransportRow,
  DownstreamTransportRow,
  WasteGeneratedRow,
  BusinessTravelRow,
  EmployeeCommutingRow,
  InvestmentRow,
  EndOfLifeRow,
  FuelEnergyRow,
  OtherSourceRow,
  TransportRow,
  RefrigerantRow,
} from "./types/scope3Types";
import {
  createBusinessTravelRow,
  createDownstreamTransportRow,
  createEmployeeCommutingRow,
  createEndOfLifeRow,
  createUpstreamTransportRow,
  createWasteGeneratedRow,
} from "./scope3RowFactories";

type Props = {
  activeCategory: string;
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
};

export const Scope3Section: React.FC<Props> = ({ activeCategory, emissionData, setEmissionData, onSaveAndNext, companyContext = false, counterpartyId }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Shared data for multiple categories
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [wasteMaterials, setWasteMaterials] = useState<WasteMaterial[]>([]);
  const [businessTravelTypes, setBusinessTravelTypes] = useState<BusinessTravelType[]>([]);
  
  // Row-based state for Upstream Transportation
  const [upstreamTransportRows, setUpstreamTransportRows] = useState<UpstreamTransportRow[]>([]);
  const [existingUpstreamTransport, setExistingUpstreamTransport] = useState<UpstreamTransportRow[]>([]);
  const [savingUpstreamTransport, setSavingUpstreamTransport] = useState(false);
  const [deletingUpstreamTransport, setDeletingUpstreamTransport] = useState<Set<string>>(new Set());
  const [isInitialLoadUpstreamTransport, setIsInitialLoadUpstreamTransport] = useState(true);
  
  const newUpstreamTransportRow = createUpstreamTransportRow;
  
  const addUpstreamTransportRow = () => setUpstreamTransportRows(prev => [...prev, newUpstreamTransportRow()]);
  const removeUpstreamTransportRow = (id: string) => setUpstreamTransportRows(prev => prev.filter(r => r.id !== id));
  
  const updateUpstreamTransportRow = (id: string, patch: Partial<UpstreamTransportRow>) => {
    setUpstreamTransportRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      const vehicleType = vehicleTypes.find(vt => vt.id === updated.vehicleTypeId);
      if (vehicleType && typeof updated.distance === 'number' && updated.distance > 0 && typeof updated.weight === 'number' && updated.weight > 0) {
        updated.emissions = vehicleType.co2_factor * updated.distance * updated.weight;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  // Load existing Upstream Transportation entries
  useEffect(() => {
    const loadUpstreamTransport = async () => {
      if (!user || activeCategory !== 'upstreamTransportation') return;

      if (companyContext && !counterpartyId) {
        setUpstreamTransportRows([]);
        setExistingUpstreamTransport([]);
        setIsInitialLoadUpstreamTransport(false);
        return;
      }

      try {
        let query = supabase
          .from('scope3_upstream_transportation')
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          vehicleTypeId: entry.vehicle_type_id || '',
          distance: entry.distance,
          weight: entry.weight,
          emissions: entry.emissions,
        }));

        setExistingUpstreamTransport(loadedRows);
        setUpstreamTransportRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error loading upstream transportation:', error);
        toast({
          title: "Error",
          description: err.message || "Failed to load upstream transportation entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoadUpstreamTransport(false);
      }
    };

    loadUpstreamTransport();
  }, [user, activeCategory, companyContext, counterpartyId, toast]);

  // Sync upstream transport rows to emissionData
  useEmissionSync({
    category: "upstream_transportation",
    rows: upstreamTransportRows,
    isInitialLoad: isInitialLoadUpstreamTransport,
    deps: [vehicleTypes],
    mapRowToEntry: (r) => {
      if (!r.vehicleTypeId || typeof r.distance !== "number" || r.distance <= 0 || typeof r.weight !== "number" || r.weight <= 0) {
        return null;
      }
      const vehicleType = vehicleTypes.find((vt) => vt.id === r.vehicleTypeId);
          return {
            id: r.id,
        category: "upstream_transportation",
        activity: vehicleType?.vehicle_type || "",
        unit: "kg",
        quantity: r.weight,
            emissions: r.emissions || 0,
          };
    },
    setEmissionData,
  });
  
  // Row-based state for Downstream Transportation
  const [downstreamTransportRows, setDownstreamTransportRows] = useState<DownstreamTransportRow[]>([]);
  const [existingDownstreamTransport, setExistingDownstreamTransport] = useState<DownstreamTransportRow[]>([]);
  const [savingDownstreamTransport, setSavingDownstreamTransport] = useState(false);
  const [deletingDownstreamTransport, setDeletingDownstreamTransport] = useState<Set<string>>(new Set());
  const [isInitialLoadDownstreamTransport, setIsInitialLoadDownstreamTransport] = useState(true);
  
  const newDownstreamTransportRow = createDownstreamTransportRow;
  
  const addDownstreamTransportRow = () => setDownstreamTransportRows(prev => [...prev, newDownstreamTransportRow()]);
  const removeDownstreamTransportRow = (id: string) => setDownstreamTransportRows(prev => prev.filter(r => r.id !== id));
  
  const updateDownstreamTransportRow = (id: string, patch: Partial<DownstreamTransportRow>) => {
    setDownstreamTransportRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      const vehicleType = vehicleTypes.find(vt => vt.id === updated.vehicleTypeId);
      if (vehicleType && typeof updated.distance === 'number' && updated.distance > 0 && typeof updated.weight === 'number' && updated.weight > 0) {
        updated.emissions = vehicleType.co2_factor * updated.distance * updated.weight;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  // Load existing Downstream Transportation entries
  useEffect(() => {
    const loadDownstreamTransport = async () => {
      if (!user || activeCategory !== 'downstreamTransportation') return;

      if (companyContext && !counterpartyId) {
        setDownstreamTransportRows([]);
        setExistingDownstreamTransport([]);
        setIsInitialLoadDownstreamTransport(false);
        return;
      }

      try {
        let query = supabase
          .from('scope3_downstream_transportation')
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          vehicleTypeId: entry.vehicle_type_id || '',
          distance: entry.distance,
          weight: entry.weight,
          emissions: entry.emissions,
        }));

        setExistingDownstreamTransport(loadedRows);
        setDownstreamTransportRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error loading downstream transportation:', error);
        toast({
          title: "Error",
          description: err.message || "Failed to load downstream transportation entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoadDownstreamTransport(false);
      }
    };

    loadDownstreamTransport();
  }, [user, activeCategory, companyContext, counterpartyId, toast]);

  // Sync downstream transport rows to emissionData
  useEmissionSync({
    category: "downstream_transportation",
    rows: downstreamTransportRows,
    isInitialLoad: isInitialLoadDownstreamTransport,
    deps: [vehicleTypes],
    mapRowToEntry: (r) => {
      if (!r.vehicleTypeId || typeof r.distance !== "number" || r.distance <= 0 || typeof r.weight !== "number" || r.weight <= 0) {
        return null;
      }
      const vehicleType = vehicleTypes.find((vt) => vt.id === r.vehicleTypeId);
          return {
            id: r.id,
        category: "downstream_transportation",
        activity: `${vehicleType?.vehicle_type || ""} | Distance: ${r.distance} km | Weight: ${r.weight} kg`,
        unit: "kg",
        quantity: r.weight,
            emissions: r.emissions || 0,
          };
    },
    setEmissionData,
  });
  
  // Row-based state for Waste Generated
  const [wasteGeneratedRows, setWasteGeneratedRows] = useState<WasteGeneratedRow[]>([]);
  const [existingWasteGenerated, setExistingWasteGenerated] = useState<WasteGeneratedRow[]>([]);
  const [savingWasteGenerated, setSavingWasteGenerated] = useState(false);
  const [deletingWasteGenerated, setDeletingWasteGenerated] = useState<Set<string>>(new Set());
  const [isInitialLoadWasteGenerated, setIsInitialLoadWasteGenerated] = useState(true);
  
  const newWasteGeneratedRow = createWasteGeneratedRow;
  
  const addWasteGeneratedRow = () => setWasteGeneratedRows(prev => [...prev, newWasteGeneratedRow()]);
  const removeWasteGeneratedRow = (id: string) => setWasteGeneratedRows(prev => prev.filter(r => r.id !== id));
  
  const updateWasteGeneratedRow = (id: string, patch: Partial<WasteGeneratedRow>) => {
    setWasteGeneratedRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      const material = wasteMaterials.find(m => m.id === updated.materialId);
      if (material && updated.disposalMethod && typeof updated.volume === 'number' && updated.volume > 0) {
        const factor = getEmissionFactor(material, updated.disposalMethod as DisposalMethod);
        updated.emissions = factor !== null ? updated.volume * factor : undefined;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  // Load existing Waste Generated entries
  useEffect(() => {
    const loadWasteGenerated = async () => {
      if (!user || activeCategory !== 'wasteGenerated') return;

      if (companyContext && !counterpartyId) {
        setWasteGeneratedRows([]);
        setExistingWasteGenerated([]);
        setIsInitialLoadWasteGenerated(false);
        return;
      }

      try {
        let query = supabase
          .from('scope3_waste_generated')
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          materialId: entry.material_id || '',
          volume: entry.volume,
          disposalMethod: (entry.disposal_method as DisposalMethod | '') ?? '',
          emissions: entry.emissions,
        }));

        setExistingWasteGenerated(loadedRows);
        setWasteGeneratedRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error loading waste generated:', error);
        toast({
          title: "Error",
          description: err.message || "Failed to load waste generated entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoadWasteGenerated(false);
      }
    };

    loadWasteGenerated();
  }, [user, activeCategory, companyContext, counterpartyId, toast]);

  // Sync waste generated rows to emissionData
  useEmissionSync({
    category: "waste_generated",
    rows: wasteGeneratedRows,
    isInitialLoad: isInitialLoadWasteGenerated,
    deps: [wasteMaterials],
    mapRowToEntry: (r) => {
      if (!r.materialId || typeof r.volume !== "number" || r.volume <= 0 || !r.disposalMethod) {
        return null;
      }
      const material = wasteMaterials.find((m) => m.id === r.materialId);
          return {
            id: r.id,
        category: "waste_generated",
        activity: `${material?.[" Material "] || ""} | ${r.disposalMethod} | Volume: ${r.volume.toFixed(2)} kg`,
        unit: "kg",
        quantity: r.volume,
            emissions: r.emissions || 0,
          };
    },
    setEmissionData,
  });
  
  // Row-based state for Business Travel
  const [businessTravelRows, setBusinessTravelRows] = useState<BusinessTravelRow[]>([]);
  const [existingBusinessTravel, setExistingBusinessTravel] = useState<BusinessTravelRow[]>([]);
  const [savingBusinessTravel, setSavingBusinessTravel] = useState(false);
  const [deletingBusinessTravel, setDeletingBusinessTravel] = useState<Set<string>>(new Set());
  const [isInitialLoadBusinessTravel, setIsInitialLoadBusinessTravel] = useState(true);
  
  const newBusinessTravelRow = createBusinessTravelRow;
  
  const addBusinessTravelRow = () => setBusinessTravelRows(prev => [...prev, newBusinessTravelRow()]);
  const removeBusinessTravelRow = (id: string) => setBusinessTravelRows(prev => prev.filter(r => r.id !== id));
  
  const updateBusinessTravelRow = (id: string, patch: Partial<BusinessTravelRow>) => {
    setBusinessTravelRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      const travelType = businessTravelTypes.find(bt => bt.id === updated.travelTypeId);
      if (travelType && typeof updated.distance === 'number' && updated.distance > 0) {
        let factorPerKm = travelType.co2_factor;
        if (travelType.unit && travelType.unit.toLowerCase().includes('mile')) {
          factorPerKm = travelType.co2_factor / 1.60934;
        }
        updated.emissions = updated.distance * factorPerKm;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  // Load existing Business Travel entries
  useEffect(() => {
    const loadBusinessTravel = async () => {
      if (!user || activeCategory !== 'businessTravel') return;

      if (companyContext && !counterpartyId) {
        setBusinessTravelRows([]);
        setExistingBusinessTravel([]);
        setIsInitialLoadBusinessTravel(false);
        return;
      }

      try {
        let query = supabase
          .from('scope3_business_travel')
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          travelTypeId: entry.travel_type_id || '',
          distance: entry.distance,
          emissions: entry.emissions,
        }));

        setExistingBusinessTravel(loadedRows);
        setBusinessTravelRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('Error loading business travel:', error);
        toast({
          title: "Error",
          description: err.message || "Failed to load business travel entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoadBusinessTravel(false);
      }
    };

    loadBusinessTravel();
  }, [user, activeCategory, companyContext, counterpartyId, toast]);

  // Sync business travel rows to emissionData
  useEmissionSync({
    category: "business_travel",
    rows: businessTravelRows,
    isInitialLoad: isInitialLoadBusinessTravel,
    deps: [businessTravelTypes],
    mapRowToEntry: (r) => {
      if (!r.travelTypeId || typeof r.distance !== "number" || r.distance <= 0) {
        return null;
      }
      const travelType = businessTravelTypes.find((bt) => bt.id === r.travelTypeId);
          return {
            id: r.id,
        category: "business_travel",
        activity: travelType?.vehicle_type || "",
        unit: "km",
        quantity: r.distance,
            emissions: r.emissions || 0,
          };
    },
    setEmissionData,
  });
  
  // Row-based state for Employee Commuting
  const [employeeCommutingRows, setEmployeeCommutingRows] = useState<EmployeeCommutingRow[]>([]);
  const [existingEmployeeCommuting, setExistingEmployeeCommuting] = useState<EmployeeCommutingRow[]>([]);
  const [savingEmployeeCommuting, setSavingEmployeeCommuting] = useState(false);
  const [deletingEmployeeCommuting, setDeletingEmployeeCommuting] = useState<Set<string>>(new Set());
  const [isInitialLoadEmployeeCommuting, setIsInitialLoadEmployeeCommuting] = useState(true);
  
  const newEmployeeCommutingRow = createEmployeeCommutingRow;
  
  const addEmployeeCommutingRow = () => setEmployeeCommutingRows(prev => [...prev, newEmployeeCommutingRow()]);
  const removeEmployeeCommutingRow = (id: string) => setEmployeeCommutingRows(prev => prev.filter(r => r.id !== id));
  
  const updateEmployeeCommutingRow = (id: string, patch: Partial<EmployeeCommutingRow>) => {
    setEmployeeCommutingRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      const travelType = businessTravelTypes.find(bt => bt.id === updated.travelTypeId);
      // Formula: employees * distance * emission_factor
      if (travelType && typeof updated.distance === 'number' && updated.distance > 0 && typeof updated.employees === 'number' && updated.employees > 0) {
        let factorPerKm = travelType.co2_factor;
        if (travelType.unit && travelType.unit.toLowerCase().includes('mile')) {
          factorPerKm = travelType.co2_factor / 1.60934;
        }
        updated.emissions = updated.employees * updated.distance * factorPerKm;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  // Load existing Employee Commuting entries
  useEffect(() => {
    const loadEmployeeCommuting = async () => {
      if (!user || activeCategory !== 'employeeCommuting') return;

      if (companyContext && !counterpartyId) {
        setEmployeeCommutingRows([]);
        setExistingEmployeeCommuting([]);
        setIsInitialLoadEmployeeCommuting(false);
        return;
      }

      try {
        let query = supabase
          .from('scope3_employee_commuting')
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await (query as any).order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          travelTypeId: entry.travel_type_id || '',
          distance: entry.distance,
          employees: entry.employees,
          emissions: entry.emissions,
        }));

        setExistingEmployeeCommuting(loadedRows);
        setEmployeeCommutingRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading employee commuting:', error);
        toast({ title: "Error", description: "Failed to load employee commuting entries", variant: "destructive" });
      } finally {
        setIsInitialLoadEmployeeCommuting(false);
      }
    };

    loadEmployeeCommuting();
  }, [user, activeCategory, companyContext, counterpartyId, toast]);

  // Sync employee commuting rows to emissionData
  useEmissionSync({
    category: "employee_commuting",
    rows: employeeCommutingRows,
    isInitialLoad: isInitialLoadEmployeeCommuting,
    deps: [businessTravelTypes],
    mapRowToEntry: (r) => {
      if (!r.travelTypeId || typeof r.distance !== "number" || r.distance <= 0 || typeof r.employees !== "number" || r.employees <= 0) {
        return null;
      }
      const travelType = businessTravelTypes.find((bt) => bt.id === r.travelTypeId);
          return {
            id: r.id,
        category: "employee_commuting",
        activity: `${travelType?.vehicle_type || ""}${r.employees && r.employees > 0 ? ` | Employees: ${r.employees}` : ""}`,
        unit: "km",
        quantity: r.distance,
            emissions: r.emissions || 0,
          };
    },
    setEmissionData,
  });
  
  // Row-based state for End of Life Treatment
  const [endOfLifeRows, setEndOfLifeRows] = useState<EndOfLifeRow[]>([]);
  const [existingEndOfLife, setExistingEndOfLife] = useState<EndOfLifeRow[]>([]);
  const [savingEndOfLife, setSavingEndOfLife] = useState(false);
  const [deletingEndOfLife, setDeletingEndOfLife] = useState<Set<string>>(new Set());
  const [isInitialLoadEndOfLife, setIsInitialLoadEndOfLife] = useState(true);
  
  const newEndOfLifeRow = createEndOfLifeRow;
  
  const addEndOfLifeRow = () => setEndOfLifeRows(prev => [...prev, newEndOfLifeRow()]);
  const removeEndOfLifeRow = (id: string) => setEndOfLifeRows(prev => prev.filter(r => r.id !== id));
  
  const updateEndOfLifeRow = (id: string, patch: Partial<EndOfLifeRow>) => {
    setEndOfLifeRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      const material = wasteMaterials.find(m => m.id === updated.materialId);
      if (material && updated.disposalMethod && typeof updated.volume === 'number' && updated.volume > 0) {
        const factor = getEmissionFactor(material, updated.disposalMethod as DisposalMethod);
        updated.emissions = factor !== null ? updated.volume * factor : undefined;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  // Load existing End-of-Life Treatment entries
  useEffect(() => {
    const loadEndOfLife = async () => {
      if (!user || activeCategory !== 'endOfLifeTreatment') return;

      if (companyContext && !counterpartyId) {
        setEndOfLifeRows([]);
        setExistingEndOfLife([]);
        setIsInitialLoadEndOfLife(false);
        return;
      }

      try {
        let query = supabase
          .from('scope3_end_of_life_treatment')
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

      const { data, error } = await (query as any).order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          materialId: entry.material_id || '',
          volume: entry.volume,
          disposalMethod: (entry.disposal_method as DisposalMethod | '') ?? '',
          recycle: entry.recycle_percentage,
          composition: entry.composition || '',
          emissions: entry.emissions,
        }));

        setExistingEndOfLife(loadedRows);
        setEndOfLifeRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading end-of-life treatment:', error);
        toast({ title: "Error", description: "Failed to load end-of-life treatment entries", variant: "destructive" });
      } finally {
        setIsInitialLoadEndOfLife(false);
      }
    };

    loadEndOfLife();
  }, [user, activeCategory, companyContext, counterpartyId, toast]);

  useEffect(() => {
    if (!isInitialLoadEndOfLife) {
      const entries = endOfLifeRows
        .filter(r => r.materialId && typeof r.volume === 'number' && r.volume > 0 && r.disposalMethod)
        .map(r => {
          const material = wasteMaterials.find(m => m.id === r.materialId);
          return {
            id: r.id,
            category: 'end_of_life_treatment' as const,
            activity: `${material?.[" Material "] || ''} | ${r.disposalMethod} | Volume: ${r.volume!.toFixed(2)} kg${r.recycle && r.recycle > 0 ? ` | Recycle: ${r.recycle}%` : ''}${r.composition ? ` | Composition: ${r.composition}` : ''}`,
            unit: 'kg',
            quantity: r.volume!,
            emissions: r.emissions || 0,
          };
        });
      
      setEmissionData(prev => ({
        ...prev,
        scope3: [
          ...prev.scope3.filter(r => r.category !== 'end_of_life_treatment'),
          ...entries,
        ]
      }));
    }
  }, [endOfLifeRows, wasteMaterials, setEmissionData, isInitialLoadEndOfLife]);

  // Load vehicle types when Upstream Transportation or Downstream Transportation category is active
  useEffect(() => {
    if (activeCategory === 'upstreamTransportation' || activeCategory === 'downstreamTransportation') {
      const loadVehicleTypes = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const types = await getAllVehicleTypes();
          if (types.length === 0) {
            toast({
              title: "No vehicle types found",
              description: "The table appears to be empty or access is restricted.",
              variant: "destructive"
            });
          }
          setVehicleTypes(types);
        } catch (error) {
          console.error("Error loading vehicle types:", error);
          toast({
            title: "Error loading vehicle types",
            description: "Could not load vehicle types from database.",
            variant: "destructive"
          });
        }
      };
      loadVehicleTypes();
    }
  }, [activeCategory, toast]);

  // Load waste materials when Waste Generated or End of Life Treatment category is active
  useEffect(() => {
    if (activeCategory === 'wasteGenerated' || activeCategory === 'endOfLifeTreatment') {
      const loadWasteMaterials = async () => {
        try {
          const materials = await getAllWasteMaterials();
          if (materials.length === 0) {
            toast({
              title: "No waste materials found",
              description: "The table appears to be empty or access is restricted.",
              variant: "destructive"
            });
          }
          setWasteMaterials(materials);
        } catch (error) {
          console.error("Error loading waste materials:", error);
          toast({
            title: "Error loading waste materials",
            description: "Could not load waste materials from database.",
            variant: "destructive"
          });
        }
      };
      loadWasteMaterials();
    }
  }, [activeCategory, toast]);

  // Load business travel types when Business Travel or Employee Commuting category is active
  useEffect(() => {
    if (activeCategory === 'businessTravel' || activeCategory === 'employeeCommuting') {
      const loadBusinessTravelTypes = async () => {
        try {
          const types = await getAllBusinessTravelTypes();
          if (types.length === 0) {
            toast({
              title: "No business travel types found",
              description: "The table appears to be empty or access is restricted.",
              variant: "destructive"
            });
          }
          setBusinessTravelTypes(types);
        } catch (error) {
          console.error("Error loading business travel types:", error);
          toast({
            title: "Error loading business travel types",
            description: "Could not load business travel types from database.",
            variant: "destructive"
          });
        }
      };
      loadBusinessTravelTypes();
    }
  }, [activeCategory, toast]);

  const removeScope3Row = (rowId: string) => {
    setEmissionData(prev => ({
      ...prev,
      scope3: prev.scope3.filter(r => r.id !== rowId)
    }));
  };

  // NOTE: Purchased Goods & Services logic has been moved into PurchasedGoodsSection
  // NOTE: Capital Goods logic has been moved into CapitalGoodsSection

  // NOTE: Fuel & Energy Activities logic has been moved into FuelEnergyActivitiesSection

  // Save Upstream Transportation
  const saveUpstreamTransport = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = upstreamTransportRows.filter(r => 
      r.vehicleTypeId && typeof r.distance === 'number' && r.distance > 0 && typeof r.weight === 'number' && r.weight > 0 && !r.isExisting
    );

    const changedExisting = upstreamTransportRows.filter(r => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingUpstreamTransport.find(e => e.dbId === r.dbId);
      if (!existing) return false;
      return existing.vehicleTypeId !== r.vehicleTypeId || 
             existing.distance !== r.distance ||
             existing.weight !== r.weight ||
             Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01;
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed upstream transportation entries." });
      return;
    }

    setSavingUpstreamTransport(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map(r => {
          const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
          return {
            user_id: user.id,
            counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
            vehicle_type_id: r.vehicleTypeId,
            vehicle_type_name: vehicleType?.vehicle_type || '',
            distance: r.distance!,
            weight: r.weight!,
            emission_factor: vehicleType?.co2_factor || 0,
            emissions: r.emissions!,
          };
        });

        const { error } = await supabase.from('scope3_upstream_transportation').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
          return supabase
            .from('scope3_upstream_transportation')
            .update({
              vehicle_type_id: r.vehicleTypeId,
              vehicle_type_name: vehicleType?.vehicle_type || '',
              distance: r.distance!,
              weight: r.weight!,
              emission_factor: vehicleType?.co2_factor || 0,
              emissions: r.emissions!,
            })
            .eq('id', r.dbId!);
        });
        const results = await Promise.all(updates);
        const updateError = results.find(r => r.error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      let refreshUpstreamQuery = supabase
        .from('scope3_upstream_transportation')
        .select('*')
        .eq('user_id', user.id);
      refreshUpstreamQuery =
        companyContext && counterpartyId
          ? refreshUpstreamQuery.eq('counterparty_id', counterpartyId)
          : refreshUpstreamQuery.is('counterparty_id', null);
      const { data: newData } = await refreshUpstreamQuery.order('created_at', {
        ascending: false,
      });

      if (newData) {
        const updatedRows = newData.map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          vehicleTypeId: entry.vehicle_type_id || '',
          distance: entry.distance,
          weight: entry.weight,
          emissions: entry.emissions,
        }));
        setExistingUpstreamTransport(updatedRows);
        setUpstreamTransportRows(updatedRows);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingUpstreamTransport(false);
    }
  };

  // Delete Upstream Transportation entry
  const deleteUpstreamTransportRow = async (id: string) => {
    const row = upstreamTransportRows.find(r => r.id === id);
    if (!row || !row.dbId) {
      removeUpstreamTransportRow(id);
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingUpstreamTransport(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope3_upstream_transportation')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setUpstreamTransportRows(prev => prev.filter(r => r.id !== id));
      setExistingUpstreamTransport(prev => prev.filter(r => r.id !== id));
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingUpstreamTransport(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save Waste Generated
  const saveWasteGenerated = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = wasteGeneratedRows.filter(r => 
      r.materialId && typeof r.volume === 'number' && r.volume > 0 && r.disposalMethod && !r.isExisting
    );

    const changedExisting = wasteGeneratedRows.filter(r => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingWasteGenerated.find(e => e.dbId === r.dbId);
      if (!existing) return false;
      return existing.materialId !== r.materialId || 
             existing.volume !== r.volume ||
             existing.disposalMethod !== r.disposalMethod ||
             Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01;
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed waste generated entries." });
      return;
    }

    setSavingWasteGenerated(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map(r => {
          const material = wasteMaterials.find(m => m.id === r.materialId);
          const factor = material ? getEmissionFactor(material, r.disposalMethod as DisposalMethod) : 0;
          return {
            user_id: user.id,
            counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
            material_id: r.materialId,
            material_name: material?.[" Material "] || '',
            volume: r.volume!,
            disposal_method: r.disposalMethod,
            emission_factor: factor || 0,
            emissions: r.emissions!,
          };
        });

        const { error } = await supabase.from('scope3_waste_generated').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const material = wasteMaterials.find(m => m.id === r.materialId);
          const factor = material ? getEmissionFactor(material, r.disposalMethod as DisposalMethod) : 0;
          return supabase
            .from('scope3_waste_generated')
            .update({
              material_id: r.materialId,
              material_name: material?.[" Material "] || '',
              volume: r.volume!,
              disposal_method: r.disposalMethod,
              emission_factor: factor || 0,
              emissions: r.emissions!,
            })
            .eq('id', r.dbId!);
        });
        const results = await Promise.all(updates);
        const updateError = results.find(r => r.error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      let refreshWasteGeneratedQuery = supabase
        .from('scope3_waste_generated')
        .select('*')
        .eq('user_id', user.id);
      refreshWasteGeneratedQuery =
        companyContext && counterpartyId
          ? refreshWasteGeneratedQuery.eq('counterparty_id', counterpartyId)
          : refreshWasteGeneratedQuery.is('counterparty_id', null);
      const { data: newData } = await refreshWasteGeneratedQuery.order('created_at', {
        ascending: false,
      });

      if (newData) {
        const updatedRows = newData.map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          materialId: entry.material_id || '',
          volume: entry.volume,
          disposalMethod: (entry.disposal_method as DisposalMethod | '') ?? '',
          emissions: entry.emissions,
        }));
        setExistingWasteGenerated(updatedRows);
        setWasteGeneratedRows(updatedRows);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingWasteGenerated(false);
    }
  };

  // Delete Waste Generated entry
  const deleteWasteGeneratedRow = async (id: string) => {
    const row = wasteGeneratedRows.find(r => r.id === id);
    if (!row || !row.dbId) {
      removeWasteGeneratedRow(id);
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingWasteGenerated(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope3_waste_generated')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setWasteGeneratedRows(prev => prev.filter(r => r.id !== id));
      setExistingWasteGenerated(prev => prev.filter(r => r.id !== id));
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingWasteGenerated(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save Business Travel
  const saveBusinessTravel = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = businessTravelRows.filter(r => 
      r.travelTypeId && typeof r.distance === 'number' && r.distance > 0 && !r.isExisting
    );

    const changedExisting = businessTravelRows.filter(r => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingBusinessTravel.find(e => e.dbId === r.dbId);
      if (!existing) return false;
      return existing.travelTypeId !== r.travelTypeId || 
             existing.distance !== r.distance ||
             Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01;
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed business travel entries." });
      return;
    }

    setSavingBusinessTravel(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map(r => {
          const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
          let factorPerKm = travelType?.co2_factor || 0;
          if (travelType?.unit && travelType.unit.toLowerCase().includes('mile')) {
            factorPerKm = travelType.co2_factor / 1.60934;
          }
          return {
            user_id: user.id,
            counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
            travel_type_id: r.travelTypeId,
            travel_type_name: travelType?.vehicle_type || '',
            distance: r.distance!,
            emission_factor: factorPerKm,
            emissions: r.emissions!,
          };
        });

        const { error } = await supabase.from('scope3_business_travel').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
          let factorPerKm = travelType?.co2_factor || 0;
          if (travelType?.unit && travelType.unit.toLowerCase().includes('mile')) {
            factorPerKm = travelType.co2_factor / 1.60934;
          }
          return supabase
            .from('scope3_business_travel')
            .update({
              travel_type_id: r.travelTypeId,
              travel_type_name: travelType?.vehicle_type || '',
              distance: r.distance!,
              emission_factor: factorPerKm,
              emissions: r.emissions!,
            })
            .eq('id', r.dbId!);
        });
        const results = await Promise.all(updates);
        const updateError = results.find(r => r.error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      let refreshBusinessTravelQuery = supabase
        .from('scope3_business_travel')
        .select('*')
        .eq('user_id', user.id);
      refreshBusinessTravelQuery =
        companyContext && counterpartyId
          ? refreshBusinessTravelQuery.eq('counterparty_id', counterpartyId)
          : refreshBusinessTravelQuery.is('counterparty_id', null);
      const { data: newData } = await refreshBusinessTravelQuery.order('created_at', {
        ascending: false,
      });

      if (newData) {
        const updatedRows = newData.map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          travelTypeId: entry.travel_type_id || '',
          distance: entry.distance,
          emissions: entry.emissions,
        }));
        setExistingBusinessTravel(updatedRows);
        setBusinessTravelRows(updatedRows);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingBusinessTravel(false);
    }
  };

  // Delete Business Travel entry
  const deleteBusinessTravelRow = async (id: string) => {
    const row = businessTravelRows.find(r => r.id === id);
    if (!row || !row.dbId) {
      removeBusinessTravelRow(id);
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingBusinessTravel(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope3_business_travel')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setBusinessTravelRows(prev => prev.filter(r => r.id !== id));
      setExistingBusinessTravel(prev => prev.filter(r => r.id !== id));
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingBusinessTravel(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save Employee Commuting
  const saveEmployeeCommuting = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = employeeCommutingRows.filter(r => 
      r.travelTypeId && typeof r.distance === 'number' && r.distance > 0 && typeof r.employees === 'number' && r.employees > 0 && !r.isExisting
    );

    const changedExisting = employeeCommutingRows.filter(r => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingEmployeeCommuting.find(e => e.dbId === r.dbId);
      if (!existing) return false;
      return existing.travelTypeId !== r.travelTypeId || 
             existing.distance !== r.distance ||
             existing.employees !== r.employees ||
             Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01;
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed employee commuting entries." });
      return;
    }

    setSavingEmployeeCommuting(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map(r => {
          const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
          let factorPerKm = travelType?.co2_factor || 0;
          if (travelType?.unit && travelType.unit.toLowerCase().includes('mile')) {
            factorPerKm = travelType.co2_factor / 1.60934;
          }
          return {
            user_id: user.id,
            counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
            travel_type_id: r.travelTypeId,
            travel_type_name: travelType?.vehicle_type || '',
            distance: r.distance!,
            employees: r.employees!,
            emission_factor: factorPerKm,
            emissions: r.emissions!,
          };
        });

        const { error } = await supabase.from('scope3_employee_commuting' as any).insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
          let factorPerKm = travelType?.co2_factor || 0;
          if (travelType?.unit && travelType.unit.toLowerCase().includes('mile')) {
            factorPerKm = travelType.co2_factor / 1.60934;
          }
          return supabase
            .from('scope3_employee_commuting' as any)
            .update({
              travel_type_id: r.travelTypeId,
              travel_type_name: travelType?.vehicle_type || '',
              distance: r.distance!,
              employees: r.employees!,
              emission_factor: factorPerKm,
              emissions: r.emissions!,
            })
            .eq('id', r.dbId!);
        });
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      let refreshEmployeeCommutingQuery = supabase
        .from('scope3_employee_commuting' as any)
        .select('*')
        .eq('user_id', user.id);
      refreshEmployeeCommutingQuery =
        companyContext && counterpartyId
          ? refreshEmployeeCommutingQuery.eq('counterparty_id', counterpartyId)
          : refreshEmployeeCommutingQuery.is('counterparty_id', null);
      const { data: newData } = await refreshEmployeeCommutingQuery.order('created_at', {
        ascending: false,
      });

      if (newData) {
        const updatedRows = newData.map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          travelTypeId: entry.travel_type_id || '',
          distance: entry.distance,
          employees: entry.employees,
          emissions: entry.emissions,
        }));
        setExistingEmployeeCommuting(updatedRows);
        setEmployeeCommutingRows(updatedRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingEmployeeCommuting(false);
    }
  };

  // Delete Employee Commuting entry
  const deleteEmployeeCommutingRow = async (id: string) => {
    const row = employeeCommutingRows.find(r => r.id === id);
    if (!row || !row.dbId) {
      removeEmployeeCommutingRow(id);
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingEmployeeCommuting(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope3_employee_commuting' as any)
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setEmployeeCommutingRows(prev => prev.filter(r => r.id !== id));
      setExistingEmployeeCommuting(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingEmployeeCommuting(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Save Downstream Transportation
  const saveDownstreamTransport = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = downstreamTransportRows.filter(r => 
      r.vehicleTypeId && typeof r.distance === 'number' && r.distance > 0 && typeof r.weight === 'number' && r.weight > 0 && !r.isExisting
    );

    const changedExisting = downstreamTransportRows.filter(r => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingDownstreamTransport.find(e => e.dbId === r.dbId);
      if (!existing) return false;
      return existing.vehicleTypeId !== r.vehicleTypeId || 
             existing.distance !== r.distance ||
             existing.weight !== r.weight ||
             Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01;
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed downstream transportation entries." });
      return;
    }

    setSavingDownstreamTransport(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map(r => {
          const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
          return {
            user_id: user.id,
            counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
            vehicle_type_id: r.vehicleTypeId,
            vehicle_type_name: vehicleType?.vehicle_type || '',
            distance: r.distance!,
            weight: r.weight!,
            emission_factor: vehicleType?.co2_factor || 0,
            emissions: r.emissions!,
          };
        });

        const { error } = await supabase.from('scope3_downstream_transportation').insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
          return supabase
            .from('scope3_downstream_transportation')
            .update({
              vehicle_type_id: r.vehicleTypeId,
              vehicle_type_name: vehicleType?.vehicle_type || '',
              distance: r.distance!,
              weight: r.weight!,
              emission_factor: vehicleType?.co2_factor || 0,
              emissions: r.emissions!,
            })
            .eq('id', r.dbId!);
        });
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      let refreshDownstreamQuery = supabase
        .from('scope3_downstream_transportation')
        .select('*')
        .eq('user_id', user.id);
      refreshDownstreamQuery =
        companyContext && counterpartyId
          ? refreshDownstreamQuery.eq('counterparty_id', counterpartyId)
          : refreshDownstreamQuery.is('counterparty_id', null);
      const { data: newData } = await refreshDownstreamQuery.order('created_at', {
        ascending: false,
      });

      if (newData) {
        const updatedRows = newData.map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          vehicleTypeId: entry.vehicle_type_id || '',
          distance: entry.distance,
          weight: entry.weight,
          emissions: entry.emissions,
        }));
        setExistingDownstreamTransport(updatedRows);
        setDownstreamTransportRows(updatedRows);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingDownstreamTransport(false);
    }
  };

  // Delete Downstream Transportation entry
  const deleteDownstreamTransportRow = async (id: string) => {
    const row = downstreamTransportRows.find(r => r.id === id);
    if (!row || !row.dbId) {
      removeDownstreamTransportRow(id);
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingDownstreamTransport(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope3_downstream_transportation')
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setDownstreamTransportRows(prev => prev.filter(r => r.id !== id));
      setExistingDownstreamTransport(prev => prev.filter(r => r.id !== id));
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({ title: "Error", description: err.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingDownstreamTransport(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };


  // Save End-of-Life Treatment
  const saveEndOfLife = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = endOfLifeRows.filter(r => 
      r.materialId && typeof r.volume === 'number' && r.volume > 0 && r.disposalMethod && !r.isExisting
    );

    const changedExisting = endOfLifeRows.filter(r => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingEndOfLife.find(e => e.dbId === r.dbId);
      if (!existing) return false;
      return existing.materialId !== r.materialId || 
             existing.volume !== r.volume ||
             existing.disposalMethod !== r.disposalMethod ||
             existing.recycle !== r.recycle ||
             existing.composition !== r.composition ||
             Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01;
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed end-of-life treatment entries." });
      return;
    }

    setSavingEndOfLife(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map(r => {
          const material = wasteMaterials.find(m => m.id === r.materialId);
          const factor = material ? getEmissionFactor(material, r.disposalMethod as DisposalMethod) : 0;
          return {
            user_id: user.id,
            counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
            material_id: r.materialId,
            material_name: material?.[" Material "] || '',
            volume: r.volume!,
            disposal_method: r.disposalMethod,
            recycle_percentage: r.recycle || 0,
            composition: r.composition || '',
            emission_factor: factor || 0,
            emissions: r.emissions!,
          };
        });

        const { error } = await supabase.from('scope3_end_of_life_treatment' as any).insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const material = wasteMaterials.find(m => m.id === r.materialId);
          const factor = material ? getEmissionFactor(material, r.disposalMethod as DisposalMethod) : 0;
          return supabase
            .from('scope3_end_of_life_treatment' as any)
            .update({
              material_id: r.materialId,
              material_name: material?.[" Material "] || '',
              volume: r.volume!,
              disposal_method: r.disposalMethod,
              recycle_percentage: r.recycle || 0,
              composition: r.composition || '',
              emission_factor: factor || 0,
              emissions: r.emissions!,
            })
            .eq('id', r.dbId!);
        });
        const results = await Promise.all(updates);
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      let refreshEndOfLifeQuery = supabase
        .from('scope3_end_of_life_treatment' as any)
        .select('*')
        .eq('user_id', user.id);
      refreshEndOfLifeQuery =
        companyContext && counterpartyId
          ? refreshEndOfLifeQuery.eq('counterparty_id', counterpartyId)
          : refreshEndOfLifeQuery.is('counterparty_id', null);
      const { data: newData } = await refreshEndOfLifeQuery.order('created_at', {
        ascending: false,
      });

      if (newData) {
        const updatedRows = newData.map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          materialId: entry.material_id || '',
          volume: entry.volume,
          disposalMethod: (entry.disposal_method as DisposalMethod | '') ?? '',
          recycle: entry.recycle_percentage,
          composition: entry.composition || '',
          emissions: entry.emissions,
        }));
        setExistingEndOfLife(updatedRows);
        setEndOfLifeRows(updatedRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSavingEndOfLife(false);
    }
  };

  // Delete End-of-Life Treatment entry
  const deleteEndOfLifeRow = async (id: string) => {
    const row = endOfLifeRows.find(r => r.id === id);
    if (!row || !row.dbId) {
      removeEndOfLifeRow(id);
      return;
    }

    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      return;
    }

    setDeletingEndOfLife(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from('scope3_end_of_life_treatment' as any)
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setEndOfLifeRows(prev => prev.filter(r => r.id !== id));
      setExistingEndOfLife(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingEndOfLife(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Purchased Goods & Services
  if (activeCategory === 'purchasedGoods') {
    return (
      <PurchasedGoodsSection
        user={user}
        companyContext={companyContext}
        counterpartyId={counterpartyId}
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // Capital Goods
  if (activeCategory === 'capitalGoods') {
    return (
      <CapitalGoodsSection
        user={user}
        companyContext={companyContext}
        counterpartyId={counterpartyId}
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }
  
  // (Upstream leased assets logic is now fully handled inside LeasedAssetsSection)

  // Fuel & Energy Related Activities
  if (activeCategory === 'fuelEnergyActivities') {
    return (
      <FuelEnergyActivitiesSection
        user={user}
        companyContext={companyContext}
        counterpartyId={counterpartyId}
        emissionData={emissionData}
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // Upstream Transportation
  if (activeCategory === 'upstreamTransportation') {
    const totalEmissions = upstreamTransportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalWeight = upstreamTransportRows.reduce((sum, r) => sum + (r.weight || 0), 0);
    
    return (
      <UpstreamTransportationSection
        rows={upstreamTransportRows}
        vehicleTypes={vehicleTypes}
        deletingIds={deletingUpstreamTransport}
        totalEmissions={totalEmissions}
        totalWeight={totalWeight}
        onAddRow={addUpstreamTransportRow}
        onUpdateRow={updateUpstreamTransportRow}
        onRemoveRow={removeUpstreamTransportRow}
        onDeleteRow={deleteUpstreamTransportRow}
        onSave={saveUpstreamTransport}
        saving={savingUpstreamTransport}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // Downstream Transportation
  if (activeCategory === 'downstreamTransportation') {
    const totalEmissions = downstreamTransportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalWeight = downstreamTransportRows.reduce((sum, r) => sum + (r.weight || 0), 0);
    
            return (
      <DownstreamTransportationSection
        rows={downstreamTransportRows}
        vehicleTypes={vehicleTypes}
        deletingIds={deletingDownstreamTransport}
        totalEmissions={totalEmissions}
        totalWeight={totalWeight}
        onAddRow={addDownstreamTransportRow}
        onUpdateRow={updateDownstreamTransportRow}
        onRemoveRow={removeDownstreamTransportRow}
        onDeleteRow={deleteDownstreamTransportRow}
        onSave={saveDownstreamTransport}
        saving={savingDownstreamTransport}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // Waste Generated
  if (activeCategory === 'wasteGenerated') {
    const totalEmissions = wasteGeneratedRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalVolume = wasteGeneratedRows.reduce((sum, r) => sum + (r.volume || 0), 0);
    
    return (
      <WasteGeneratedSection
        rows={wasteGeneratedRows}
        wasteMaterials={wasteMaterials}
        deletingIds={deletingWasteGenerated}
        totalEmissions={totalEmissions}
        totalVolume={totalVolume}
        onAddRow={addWasteGeneratedRow}
        onUpdateRow={updateWasteGeneratedRow}
        onRemoveRow={removeWasteGeneratedRow}
        onDeleteRow={deleteWasteGeneratedRow}
        onSave={saveWasteGenerated}
        saving={savingWasteGenerated}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // Business Travel
  if (activeCategory === 'businessTravel') {
    const totalEmissions = businessTravelRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalDistance = businessTravelRows.reduce((sum, r) => sum + (r.distance || 0), 0);
    
    return (
      <BusinessTravelSection
        rows={businessTravelRows}
        businessTravelTypes={businessTravelTypes}
        deletingIds={deletingBusinessTravel}
        totalEmissions={totalEmissions}
        totalDistance={totalDistance}
        onAddRow={addBusinessTravelRow}
        onUpdateRow={updateBusinessTravelRow}
        onRemoveRow={removeBusinessTravelRow}
        onDeleteRow={deleteBusinessTravelRow}
        onSave={saveBusinessTravel}
        saving={savingBusinessTravel}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // Employee Commuting
  if (activeCategory === 'employeeCommuting') {
    const totalEmissions = employeeCommutingRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalDistance = employeeCommutingRows.reduce((sum, r) => sum + (r.distance || 0), 0);
    
    return (
      <EmployeeCommutingSection
        rows={employeeCommutingRows}
        businessTravelTypes={businessTravelTypes}
        deletingIds={deletingEmployeeCommuting}
        totalEmissions={totalEmissions}
        totalDistance={totalDistance}
        onAddRow={addEmployeeCommutingRow}
        onUpdateRow={updateEmployeeCommutingRow}
        onRemoveRow={removeEmployeeCommutingRow}
        onDeleteRow={deleteEmployeeCommutingRow}
        onSave={saveEmployeeCommuting}
        saving={savingEmployeeCommuting}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }
  // Upstream Leased Assets - Category-based implementation (same as Downstream)
  if (activeCategory === 'upstreamLeasedAssets') {
    return <LeasedAssetsSection type="upstream" />;
  }

  // Investments
  if (activeCategory === 'investments') {
    if (!user) return null;
    return (
      <InvestmentsSection
        user={{ id: user.id }}
        companyContext={companyContext}
        counterpartyId={counterpartyId}
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  if (activeCategory === "facilitatedEmissions") {
    if (!user) return null;
    return (
      <FacilitatedEmissionsSection
        user={{ id: user.id }}
        companyContext={companyContext}
        counterpartyId={counterpartyId}
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // NOTE: Additional inline Downstream Transportation UI has been replaced by DownstreamTransportationSection

  // Processing of Sold Products / Use of Sold Products
  if (activeCategory === 'processingUseOfSoldProducts') {
    return (
      <ProcessingUseSoldProductsShell
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
        companyContext={companyContext}
        counterpartyId={counterpartyId}
      />
    );
  }


  // End-of-Life Treatment
  if (activeCategory === 'endOfLifeTreatment') {
    const totalEmissions = endOfLifeRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalVolume = endOfLifeRows.reduce((sum, r) => sum + (r.volume || 0), 0);
    
    const pendingNew = endOfLifeRows.filter(
      (r) =>
        !r.isExisting &&
        r.materialId &&
        typeof r.volume === "number" &&
        r.volume > 0 &&
        r.disposalMethod,
    ).length;
    const pendingUpdates = endOfLifeRows.filter((r) => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingEndOfLife.find((e) => e.dbId === r.dbId);
      if (!existing) return false;
      return (
        existing.materialId !== r.materialId ||
        existing.volume !== r.volume ||
        existing.disposalMethod !== r.disposalMethod ||
        existing.recycle !== r.recycle ||
        existing.composition !== r.composition ||
        Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01
      );
    }).length;
    const savePendingCount = pendingNew + pendingUpdates;

    return (
      <EndOfLifeTreatmentSection
        rows={endOfLifeRows}
        wasteMaterials={wasteMaterials}
        deletingIds={deletingEndOfLife}
        totalEmissions={totalEmissions}
        totalVolume={totalVolume}
        savePendingCount={savePendingCount}
        onAddRow={addEndOfLifeRow}
        onUpdateRow={updateEndOfLifeRow}
        onRemoveRow={removeEndOfLifeRow}
        onDeleteRow={deleteEndOfLifeRow}
        onSave={saveEndOfLife}
        saving={savingEndOfLife}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // Downstream Leased Assets - Category-based implementation
  if (activeCategory === 'downstreamLeasedAssets') {
    return <LeasedAssetsSection type="downstream" />;
  }

  // Franchises
  if (activeCategory === 'franchises') {
    return (
      <FranchisesSection
        emissionData={emissionData}
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  return null;
};

export default Scope3Section;



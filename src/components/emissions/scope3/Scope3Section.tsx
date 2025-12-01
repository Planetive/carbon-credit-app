import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { FieldTooltip } from "@/pages/finance_facilitated/components/FieldTooltip";
import { SupplierAutocomplete } from "./SupplierAutocomplete";
import { Supplier } from "./types";
import { getAllVehicleTypes, VehicleType } from "./vehicleTypes";
import { supabase } from "@/integrations/supabase/client";
import { WasteMaterial, getAvailableDisposalMethods, getEmissionFactor, DisposalMethod, getAllWasteMaterials } from "./wasteTypes";
import { getAllBusinessTravelTypes, BusinessTravelType } from "./businessTravelTypes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FACTORS, SCOPE2_FACTORS, VEHICLE_FACTORS, DELIVERY_VEHICLE_FACTORS, REFRIGERANT_FACTORS } from "../shared/EmissionFactors";
import { useAuth } from "@/contexts/AuthContext";
import LeasedAssetsSection from "./LeasedAssetsSection";
import { FuelType } from "../shared/types";
import { getVehicleTypeNote, getVehicleTypeSuperscript, cleanVehicleTypeName } from "./utils/vehicleTypeHelpers";
import { useEmissionSync } from "./hooks/useEmissionSync";
import { InvestmentsSection } from "./components/InvestmentsSection";
import { FranchisesSection } from "./components/FranchisesSection";
import { FuelEnergyActivitiesSection } from "./components/FuelEnergyActivitiesSection";
import { PurchasedGoodsSection } from "./components/PurchasedGoodsSection";
import { CapitalGoodsSection } from "./components/CapitalGoodsSection";
import { BusinessTravelSection } from "./components/BusinessTravelSection";
import { EmployeeCommutingSection } from "./components/EmployeeCommutingSection";
import { WasteGeneratedSection } from "./components/WasteGeneratedSection";
import { UpstreamTransportationSection } from "./components/UpstreamTransportationSection";
import { DownstreamTransportationSection } from "./components/DownstreamTransportationSection";
import type {
  ProcessingSoldProductsRow,
  UseOfSoldProductsRow,
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
  
  // State for Downstream Products (Processing/Use of Sold Products)
  const [productType, setProductType] = useState<'intermediate' | 'final' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Row-based state for Processing of Sold Products
  const [processingRows, setProcessingRows] = useState<ProcessingSoldProductsRow[]>([]);

  // Row-based state for Use of Sold Products
  const [useRows, setUseRows] = useState<UseOfSoldProductsRow[]>([]);

  const newProcessingRow = (): ProcessingSoldProductsRow => ({
    id: `psp-${Date.now()}-${Math.random()}`,
    processingActivity: '',
    factorType: undefined,
    type: undefined,
    fuel: undefined,
    unit: undefined,
    quantity: undefined,
    factor: undefined,
    emissions: undefined,
    totalKwh: undefined,
    gridPct: undefined,
    renewablePct: undefined,
    otherPct: undefined,
    gridCountry: undefined,
    otherSources: [],
  });

  const newUseRow = (): UseOfSoldProductsRow => ({
    id: `usp-${Date.now()}-${Math.random()}`,
    processingActivity: '',
    energyConsumption: '',
    quantity: undefined,
    emissions: undefined,
  });

  // Reset state when switching away from downstream products
  useEffect(() => {
    if (activeCategory !== 'processingSoldProducts' && activeCategory !== 'useOfSoldProducts') {
      setProductType(null);
      setProcessingRows([]);
      setUseRows([]);
      setIsAnimating(false);
    }
  }, [activeCategory]);
  
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
  
  const newUpstreamTransportRow = (): UpstreamTransportRow => ({
    id: `ut-${Date.now()}-${Math.random()}`,
    vehicleTypeId: '',
    distance: undefined,
    weight: undefined,
    emissions: undefined,
  });
  
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
          .from('scope3_upstream_transportation' as any)
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
          vehicleTypeId: entry.vehicle_type_id || '',
          distance: entry.distance,
          weight: entry.weight,
          emissions: entry.emissions,
        }));

        setExistingUpstreamTransport(loadedRows);
        setUpstreamTransportRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading upstream transportation:', error);
        toast({ title: "Error", description: "Failed to load upstream transportation entries", variant: "destructive" });
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
  
  const newDownstreamTransportRow = (): DownstreamTransportRow => ({
    id: `dt-${Date.now()}-${Math.random()}`,
    vehicleTypeId: '',
    distance: undefined,
    weight: undefined,
    emissions: undefined,
  });
  
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

        const { data, error } = await (query as any).order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry: any) => ({
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
      } catch (error: any) {
        console.error('Error loading downstream transportation:', error);
        toast({ title: "Error", description: "Failed to load downstream transportation entries", variant: "destructive" });
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
  
  const newWasteGeneratedRow = (): WasteGeneratedRow => ({
    id: `wg-${Date.now()}-${Math.random()}`,
    materialId: '',
    volume: undefined,
    disposalMethod: '',
    emissions: undefined,
  });
  
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
          .from('scope3_waste_generated' as any)
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
          emissions: entry.emissions,
        }));

        setExistingWasteGenerated(loadedRows);
        setWasteGeneratedRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading waste generated:', error);
        toast({ title: "Error", description: "Failed to load waste generated entries", variant: "destructive" });
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
  
  const newBusinessTravelRow = (): BusinessTravelRow => ({
    id: `bt-${Date.now()}-${Math.random()}`,
    travelTypeId: '',
    distance: undefined,
    emissions: undefined,
  });
  
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

        const { data, error } = await (query as any).order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          travelTypeId: entry.travel_type_id || '',
          distance: entry.distance,
          emissions: entry.emissions,
        }));

        setExistingBusinessTravel(loadedRows);
        setBusinessTravelRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading business travel:', error);
        toast({ title: "Error", description: "Failed to load business travel entries", variant: "destructive" });
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
  
  const newEmployeeCommutingRow = (): EmployeeCommutingRow => ({
    id: `ec-${Date.now()}-${Math.random()}`,
    travelTypeId: '',
    distance: undefined,
    employees: undefined,
    emissions: undefined,
  });
  
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
          employees: entry.number_of_employees,
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
  
  const newEndOfLifeRow = (): EndOfLifeRow => ({
    id: `eol-${Date.now()}-${Math.random()}`,
    materialId: '',
    volume: undefined,
    disposalMethod: '',
    recycle: undefined,
    composition: '',
    emissions: undefined,
  });
  
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

        const { error } = await supabase.from('scope3_upstream_transportation' as any).insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
          return supabase
            .from('scope3_upstream_transportation' as any)
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

      onSaveAndNext?.();

      const { data: newData } = await supabase
        .from('scope3_upstream_transportation' as any)
        .select('*')
        .eq('user_id', user.id)
        .is('counterparty_id', companyContext && counterpartyId ? counterpartyId : null)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedRows = newData.map((entry: any) => ({
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
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
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
        .from('scope3_upstream_transportation' as any)
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setUpstreamTransportRows(prev => prev.filter(r => r.id !== id));
      setExistingUpstreamTransport(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
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

        const { error } = await supabase.from('scope3_waste_generated' as any).insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map(r => {
          const material = wasteMaterials.find(m => m.id === r.materialId);
          const factor = material ? getEmissionFactor(material, r.disposalMethod as DisposalMethod) : 0;
          return supabase
            .from('scope3_waste_generated' as any)
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
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      onSaveAndNext?.();

      const { data: newData } = await supabase
        .from('scope3_waste_generated' as any)
        .select('*')
        .eq('user_id', user.id)
        .is('counterparty_id', companyContext && counterpartyId ? counterpartyId : null)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedRows = newData.map((entry: any) => ({
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
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
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
        .from('scope3_waste_generated' as any)
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setWasteGeneratedRows(prev => prev.filter(r => r.id !== id));
      setExistingWasteGenerated(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
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

        const { error } = await supabase.from('scope3_business_travel' as any).insert(payload);
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
            .from('scope3_business_travel' as any)
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
        const updateError = results.find(r => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({ 
        title: "Saved", 
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.` 
      });

      onSaveAndNext?.();

      const { data: newData } = await supabase
        .from('scope3_business_travel' as any)
        .select('*')
        .eq('user_id', user.id)
        .is('counterparty_id', companyContext && counterpartyId ? counterpartyId : null)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedRows = newData.map((entry: any) => ({
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
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
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
        .from('scope3_business_travel' as any)
        .delete()
        .eq('id', row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });
      
      setBusinessTravelRows(prev => prev.filter(r => r.id !== id));
      setExistingBusinessTravel(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
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
            number_of_employees: r.employees!,
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
              number_of_employees: r.employees!,
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

      onSaveAndNext?.();

      const { data: newData } = await supabase
        .from('scope3_employee_commuting' as any)
        .select('*')
        .eq('user_id', user.id)
        .is('counterparty_id', companyContext && counterpartyId ? counterpartyId : null)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedRows = newData.map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          travelTypeId: entry.travel_type_id || '',
          distance: entry.distance,
          employees: entry.number_of_employees,
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

      onSaveAndNext?.();

      const { data: newData } = await (supabase
        .from('scope3_downstream_transportation') as any)
        .select('*')
        .eq('user_id', user.id)
        .is('counterparty_id', companyContext && counterpartyId ? counterpartyId : null)
        .order('created_at', { ascending: false });

      if (newData) {
        const updatedRows = newData.map((entry: any) => ({
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
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
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

      onSaveAndNext?.();

      const { data: newData } = await supabase
        .from('scope3_end_of_life_treatment' as any)
        .select('*')
        .eq('user_id', user.id)
        .is('counterparty_id', companyContext && counterpartyId ? counterpartyId : null)
        .order('created_at', { ascending: false });

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
      />
    );
  }
  // Upstream Leased Assets - Category-based implementation (same as Downstream)
  if (activeCategory === 'upstreamLeasedAssets') {
    return <LeasedAssetsSection type="upstream" />;
  }

  // Investments
  if (activeCategory === 'investments') {
    return (
      <InvestmentsSection
        user={user}
        companyContext={companyContext}
        counterpartyId={counterpartyId}
        setEmissionData={setEmissionData}
        onSaveAndNext={onSaveAndNext}
      />
    );
  }

  // NOTE: Additional inline Downstream Transportation UI has been replaced by DownstreamTransportationSection

  // Processing of Sold Products / Use of Sold Products
  if (activeCategory === 'processingSoldProducts' || activeCategory === 'useOfSoldProducts') {
    const handleProductTypeSelect = (type: 'intermediate' | 'final') => {
      setIsAnimating(true);
      setTimeout(() => {
        setProductType(type);
        setIsAnimating(false);
      }, 300);
    };

    const handleBackToSelection = () => {
      setIsAnimating(true);
      setTimeout(() => {
        setProductType(null);
        setIsAnimating(false);
      }, 300);
    };

    // Helper function to get grid factor
    const getGridFactor = (country?: 'UAE' | 'Pakistan') => (country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined);

    // Update function for processing rows (with fuel and electricity calculation)
    const updateProcessingRow = (id: string, patch: Partial<ProcessingSoldProductsRow>) => {
      setProcessingRows(prev => prev.map(r => {
        if (r.id !== id) return r;
        const next: ProcessingSoldProductsRow = { ...r, ...patch };

        // --- Fuel emissions ---
        if (next.type && next.fuel && next.unit) {
          const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
          next.factor = typeof factor === 'number' ? factor : undefined;
        } else {
          next.factor = undefined;
        }

        let fuelEmissions: number | undefined;
        if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
          fuelEmissions = next.quantity * next.factor;
        }

        // --- Electricity emissions (similar to Scope 2) ---
        let electricityEmissions: number | undefined;
        if (next.totalKwh) {
          const gridFactor = getGridFactor(next.gridCountry);
          const gridPart = next.gridPct && gridFactor ? (next.gridPct / 100) * next.totalKwh * gridFactor : 0;
          const renewablePart = 0; // Renewable is always 0
          const otherEmissions = (next.otherSources || []).reduce((sum, s) => sum + (s.emissions || 0), 0);
          const otherPart =
            next.otherPct && next.otherPct > 0
              ? (next.otherPct / 100) * next.totalKwh * (otherEmissions / (next.totalKwh || 1))
              : 0;
          electricityEmissions = gridPart + renewablePart + otherPart;
        }

        // Total emissions = fuel + electricity (whichever are present)
        const totalEmissions =
          (typeof fuelEmissions === 'number' ? fuelEmissions : 0) +
          (typeof electricityEmissions === 'number' ? electricityEmissions : 0);

        next.emissions =
          typeof fuelEmissions === 'number' || typeof electricityEmissions === 'number'
            ? Number(totalEmissions.toFixed(6))
            : undefined;
        
        return next;
      }));
    };

    // Update other source row for electricity
    const updateOtherSourceRow = (rowId: string, sourceId: string, patch: Partial<ProcessingSoldProductsRow['otherSources'][0]>) => {
      setProcessingRows(prev => prev.map(r => {
        if (r.id !== rowId) return r;
        const otherSources = (r.otherSources || []).map(s => {
          if (s.id !== sourceId) return s;
          const next = { ...s, ...patch };
          if (next.type && next.fuel && next.unit) {
            const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
            next.factor = typeof factor === 'number' ? factor : undefined;
          }
          if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
            next.emissions = Number((next.quantity * next.factor).toFixed(6));
          }
          return next;
        });
        const updated = { ...r, otherSources };
        // Recalculate electricity emissions (fuel part handled in updateProcessingRow)
        if (updated.totalKwh) {
          const gridFactor = getGridFactor(updated.gridCountry);
          const gridPart = updated.gridPct && gridFactor ? (updated.gridPct / 100) * updated.totalKwh * gridFactor : 0;
          const renewablePart = 0;
          const otherEmissions = otherSources.reduce((sum, s) => sum + (s.emissions || 0), 0);
          const otherPart =
            updated.otherPct && updated.otherPct > 0
              ? (updated.otherPct / 100) * updated.totalKwh * (otherEmissions / (updated.totalKwh || 1))
              : 0;
          const electricityEmissions = gridPart + renewablePart + otherPart;
          const fuelEmissions =
            typeof updated.quantity === 'number' && typeof updated.factor === 'number'
              ? updated.quantity * updated.factor
              : 0;
          updated.emissions = Number((fuelEmissions + electricityEmissions).toFixed(6));
        }
        return updated;
      }));
    };

    // Add other source row
    const addOtherSourceRow = (rowId: string) => {
      setProcessingRows(prev => prev.map(r => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          otherSources: [...(r.otherSources || []), {
            id: `other-${Date.now()}-${Math.random()}`,
          }]
        };
      }));
    };

    // Remove other source row
    const removeOtherSourceRow = (rowId: string, sourceId: string) => {
      setProcessingRows(prev => prev.map(r => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          otherSources: (r.otherSources || []).filter(s => s.id !== sourceId)
        };
      }));
    };

    // Sync rows to emissionData
    useEmissionSync({
      category: "processing_sold_products",
      rows: processingRows,
      enabled: productType === "intermediate",
      mapRowToEntry: (r) => {
        if (!r.processingActivity) return null;

        const hasFuel =
          !!r.type && !!r.fuel && !!r.unit && typeof r.quantity === "number" && r.quantity > 0;
        const hasElectricity = typeof r.totalKwh === "number" && r.totalKwh > 0;

        if (!hasFuel && !hasElectricity) return null;

        // Prefer fuel details for unit/quantity if present, otherwise electricity
        const unit = hasFuel ? r.unit || "entry" : hasElectricity ? "kWh" : "entry";
        const quantity = hasFuel ? (r.quantity || 1) : hasElectricity ? (r.totalKwh || 1) : 1;

        return {
          id: r.id,
          category: "processing_sold_products",
          activity: r.processingActivity,
          unit,
          quantity,
          emissions: r.emissions || 0,
        };
      },
      setEmissionData,
    });

    useEmissionSync({
      category: "use_of_sold_products",
      rows: useRows,
      enabled: productType === "final",
      mapRowToEntry: (r) =>
        r.processingActivity && r.energyConsumption
          ? {
            id: r.id,
              category: "use_of_sold_products",
            activity: r.processingActivity,
              unit: "entry",
            quantity: r.quantity || 1,
            emissions: r.emissions || 0,
            }
          : null,
      setEmissionData,
    });

    // Product Type Selection Screen
    if (!productType) {
    return (
        <div className={`space-y-6 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="text-center py-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Downstream Emissions</h3>
            <p className="text-gray-600 mb-8">Select your product type to continue</p>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button
                onClick={() => handleProductTypeSelect('intermediate')}
                className="group relative p-8 rounded-xl border-2 border-gray-200 hover:border-teal-500 bg-white hover:bg-teal-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">🏭</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Intermediate Product</h4>
                  <p className="text-sm text-gray-600">Processing of Sold Products</p>
                  <p className="text-xs text-gray-500 mt-2">Products that require further processing</p>
                </div>
              </button>

              <button
                onClick={() => handleProductTypeSelect('final')}
                className="group relative p-8 rounded-xl border-2 border-gray-200 hover:border-teal-500 bg-white hover:bg-teal-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
              >
                <div className="text-center">
                  <div className="text-4xl mb-4">📦</div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Final Product</h4>
                  <p className="text-sm text-gray-600">Use of Sold Products</p>
                  <p className="text-xs text-gray-500 mt-2">Products ready for end-user consumption</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Processing of Sold Products Form (Intermediate)
    if (productType === 'intermediate') {
      const totalEmissions = processingRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
      
      return (
        <div className={`space-y-6 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="flex items-center justify-between mb-4">
          <div>
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSelection}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </Button>
                <h3 className="text-xl font-semibold text-gray-900">Processing of Sold Products</h3>
          </div>
              <p className="text-sm text-gray-600 ml-12">Lifecycle data, transformations, and energy use</p>
            </div>
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 text-white" 
              onClick={() => setProcessingRows(prev => [...prev, newProcessingRow()])}
            >
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>

          <div className="space-y-4">
            {processingRows.map((row, index) => (
              <div 
                key={row.id} 
                className="p-6 rounded-lg bg-gray-50 border border-gray-200 hover:border-teal-300 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Processing Activity <FieldTooltip content="Select the processing activity type" />
                    </Label>
                    <Select
                      value={row.processingActivity}
                      onValueChange={(value) => {
                        // Activities that should always use electricity factors
                        const electricityOnlyActivities = [
                          'Machining / cutting / shaping',
                          'Mixing / blending (mechanical)',
                        ];
                        // Activities where electricity can be used (keep electricity fields)
                        const electricityAllowedActivities = [
                          'Machining / cutting / shaping',
                          'Mixing / blending (mechanical)',
                          'Forging / Foundry operations',
                        ];

                        const shouldKeepElectricity = electricityAllowedActivities.includes(value);

                        updateProcessingRow(row.id, {
                          processingActivity: value,
                          type: undefined,
                          fuel: undefined,
                          unit: undefined,
                          quantity: undefined,
                          factor: undefined,
                          emissions: undefined,
                          // Clear electricity fields only when switching to activities that don't use it
                          totalKwh: shouldKeepElectricity ? row.totalKwh : undefined,
                          gridPct: shouldKeepElectricity ? row.gridPct : undefined,
                          renewablePct: shouldKeepElectricity ? row.renewablePct : undefined,
                          otherPct: shouldKeepElectricity ? row.otherPct : undefined,
                          gridCountry: shouldKeepElectricity ? row.gridCountry : undefined,
                          otherSources: shouldKeepElectricity ? row.otherSources : undefined,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select processing activity" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" position="item-aligned" sideOffset={4}>
                        <SelectItem value="Heating, melting, smelting">Heating, melting, smelting</SelectItem>
                        <SelectItem value="Forging / Foundry operations">Forging / Foundry operations</SelectItem>
                        <SelectItem value="Drying / Curing / Kilns">Drying / Curing / Kilns</SelectItem>
                        <SelectItem value="Machining / cutting / shaping">Machining / cutting / shaping</SelectItem>
                        <SelectItem value="Mixing / blending (mechanical)">Mixing / blending (mechanical)</SelectItem>
                        <SelectItem value="Mixing / blending (thermal)">Mixing / blending (thermal)</SelectItem>
                        <SelectItem value="Electrolysis, electrolytic finishing">Electrolysis, electrolytic finishing</SelectItem>
                        <SelectItem value="Steam-intensive processing">Steam-intensive processing</SelectItem>
                        <SelectItem value="Material forming (molding, extrusion)">Material forming (molding, extrusion)</SelectItem>
                        <SelectItem value="Textile processing (dyeing, washing)">Textile processing (dyeing, washing)</SelectItem>
                        <SelectItem value="Food processing (baking, sterilizing)">Food processing (baking, sterilizing)</SelectItem>
                        <SelectItem value="Paper/pulp processing">Paper/pulp processing</SelectItem>
                        <SelectItem value="Glass manufacturing">Glass manufacturing</SelectItem>
                      </SelectContent>
                    </Select>
          </div>
                </div>

                {/* Fuel Table - shown only when a processing activity is selected that can use fuel */}
                {row.processingActivity &&
                 row.processingActivity !== 'Machining / cutting / shaping' &&
                 row.processingActivity !== 'Mixing / blending (mechanical)' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Fuel Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Type <FieldTooltip content="Select fuel type group" />
                        </Label>
                        <Select 
                          value={row.type || ''} 
                          onValueChange={(value) => {
                            updateProcessingRow(row.id, { 
                              type: value as FuelType,
                              fuel: undefined,
                              unit: undefined,
                              factor: undefined,
                              emissions: undefined,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(FACTORS).map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Fuel <FieldTooltip content="Select fuel" />
                        </Label>
                        <Select 
                          value={row.fuel || ''} 
                          onValueChange={(value) => {
                            updateProcessingRow(row.id, { 
                              fuel: value,
                              unit: undefined,
                              factor: undefined,
                              emissions: undefined,
                            });
                          }}
                          disabled={!row.type}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.type && Object.keys(FACTORS[row.type] || {}).map(f => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Unit <FieldTooltip content="Select unit" />
                        </Label>
                        <Select 
                          value={row.unit || ''} 
                          onValueChange={(value) => {
                            updateProcessingRow(row.id, { unit: value });
                          }}
                          disabled={!row.type || !row.fuel}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.type && row.fuel && Object.keys(FACTORS[row.type]?.[row.fuel] || {}).map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Quantity <FieldTooltip content="Enter quantity" />
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Enter quantity"
                      value={row.quantity ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateProcessingRow(row.id, { quantity: value });
                      }}
                    />
          </div>
                </div>
                    {row.factor !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        Emission Factor: <span className="font-semibold">{row.factor.toFixed(6)}</span>
                      </div>
                    )}
                    {row.emissions !== undefined && (
                      <div className="mt-2 text-sm text-gray-700 font-medium">
                        Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Electricity Factor - Full Scope 2 Electricity Form */}
                {(row.processingActivity === 'Machining / cutting / shaping' ||
                  row.processingActivity === 'Mixing / blending (mechanical)' ||
                  row.processingActivity === 'Forging / Foundry operations') && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Electricity Details</h4>
                    
                    {/* Main electricity inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1">
                        <Label className="flex items-center gap-1 mb-2">
                          Total electricity consumption (kWh) <FieldTooltip content="Total electricity consumption" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="999999999999.999999"
                          placeholder="e.g., 120000"
                          value={row.totalKwh ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateProcessingRow(row.id, { totalKwh: value });
                          }}
                        />
                      </div>
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                          Grid Energy (%) <FieldTooltip content="Percentage from grid" />
                    </Label>
                    <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="e.g., 60"
                          value={row.gridPct ?? ''}
                      onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateProcessingRow(row.id, { gridPct: value });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Renewable Energy (%) <FieldTooltip content="Percentage from renewable sources" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="e.g., 30"
                          value={row.renewablePct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateProcessingRow(row.id, { renewablePct: value });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Other sources (%) <FieldTooltip content="Percentage from other sources" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="e.g., 10"
                          value={row.otherPct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateProcessingRow(row.id, { otherPct: value });
                      }}
                    />
                </div>
                </div>

                    {/* Grid sources section */}
                    {row.gridPct && row.gridPct > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Electricity provider country <FieldTooltip content="Select country for grid factor" />
                          </Label>
                          <Select 
                            value={row.gridCountry || ''} 
                            onValueChange={(v) => updateProcessingRow(row.id, { gridCountry: v as 'UAE' | 'Pakistan' })}
                          >
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
                          <Label className="flex items-center gap-1 mb-2">
                            Grid emission factor <FieldTooltip content="Auto-calculated based on country" />
                          </Label>
                          <Input 
                            value={getGridFactor(row.gridCountry)?.toFixed(6) || ''} 
                            readOnly 
                            placeholder="Auto" 
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Grid emissions <FieldTooltip content="Calculated grid emissions" />
                          </Label>
                          <Input
                            readOnly
                            value={row.totalKwh && row.gridPct && getGridFactor(row.gridCountry) 
                              ? ((row.gridPct / 100) * row.totalKwh * getGridFactor(row.gridCountry)!).toFixed(6)
                              : ''}
                          />
                        </div>
                      </div>
                    )}

                    {/* Other sources section */}
                    {(row.otherPct && row.otherPct > 0 || (row.otherSources && row.otherSources.length > 0)) && (
                      <div className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-900">Other sources</h5>
                          <Button 
                            onClick={() => addOtherSourceRow(row.id)} 
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Row
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <Label className="text-gray-500 text-sm">Type</Label>
                          <Label className="text-gray-500 text-sm">Fuel</Label>
                          <Label className="text-gray-500 text-sm">Unit</Label>
                          <Label className="text-gray-500 text-sm">Quantity</Label>
                          <div />
                        </div>

                        <div className="space-y-3">
                          {(row.otherSources || []).map(source => (
                            <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-gray-50">
                              <Select
                                value={source.type || ''}
                                onValueChange={(v) => updateOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(FACTORS).map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={source.fuel || ''}
                                onValueChange={(v) => updateOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined })}
                                disabled={!source.type}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Select
                                value={source.unit || ''}
                                onValueChange={(v) => updateOtherSourceRow(row.id, source.id, { unit: v })}
                                disabled={!source.type || !source.fuel}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && source.fuel && Object.keys(FACTORS[source.type]?.[source.fuel] || {}).map(u => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <Input
                                type="number"
                                step="any"
                                min="0"
                                max="999999999999.999999"
                                value={source.quantity ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  updateOtherSourceRow(row.id, source.id, { quantity: value });
                                }}
                                placeholder="Enter quantity"
                              />

                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700" 
                                onClick={() => removeOtherSourceRow(row.id, source.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {row.otherSources && row.otherSources.length > 0 && (
                          <div className="text-sm text-gray-700 font-medium">
                            Other sources emissions: <span className="font-semibold">
                              {row.otherSources.reduce((sum, s) => sum + (s.emissions || 0), 0).toFixed(6)} kg CO2e
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {row.emissions !== undefined && (
                      <div className="mt-4 text-sm text-gray-700 font-medium">
                        Total Electricity Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setProcessingRows(prev => prev.filter(r => r.id !== row.id))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {processingRows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No entries yet. Click "Add New Entry" to get started.</p>
          </div>
        )}

        <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
              <div className="text-gray-700 font-medium">
                Total Processing Entries: <span className="font-semibold">{processingRows.length}</span>
                {totalEmissions > 0 && (
                  <span className="ml-4">
                    Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO2e</span>
                  </span>
                )}
              </div>
              <Button 
                onClick={() => {
                  toast({ title: 'Saved', description: 'Processing of sold products saved.' });
                  onSaveAndNext?.();
                }} 
                disabled={processingRows.length === 0} 
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />{`Save and Next (${processingRows.length})`}
              </Button>
              </div>
        </div>
      </div>
    );
  }

    // Use of Sold Products Form (Final)
    if (productType === 'final') {
      const totalEmissions = useRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
      
    return (
        <div className={`space-y-6 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="flex items-center justify-between mb-4">
          <div>
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSelection}
                  className="text-gray-600 hover:text-gray-900"
                >
                  ← Back
                </Button>
                <h3 className="text-xl font-semibold text-gray-900">Use of Sold Products</h3>
          </div>
              <p className="text-sm text-gray-600 ml-12">Usage specs and energy during use</p>
            </div>
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 text-white" 
              onClick={() => setUseRows(prev => [...prev, newUseRow()])}
            >
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>

          <div className="space-y-4">
            {useRows.map((row, index) => (
              <div 
                key={row.id} 
                className="p-6 rounded-lg bg-gray-50 border border-gray-200 hover:border-teal-300 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Processing Activity <FieldTooltip content="Select the processing activity type" />
                    </Label>
                    <Select 
                      value={row.processingActivity} 
                      onValueChange={(value) => {
                        setUseRows(prev => prev.map(r => 
                          r.id === row.id ? { ...r, processingActivity: value } : r
                        ));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select processing activity" />
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" position="item-aligned" sideOffset={4}>
                        <SelectItem value="Internal combustion engine vehicles (cars, trucks, bikes)">Internal combustion engine vehicles (cars, trucks, bikes)</SelectItem>
                        <SelectItem value="Hybrid vehicles">Hybrid vehicles</SelectItem>
                        <SelectItem value="Electric vehicles (cars, 2-wheelers, buses)">Electric vehicles (cars, 2-wheelers, buses)</SelectItem>
                        <SelectItem value="Home appliances (ACs, fridges, fans, microwaves)">Home appliances (ACs, fridges, fans, microwaves)</SelectItem>
                        <SelectItem value="Cooling products (AC, refrigeration)">Cooling products (AC, refrigeration)</SelectItem>
                        <SelectItem value="Boilers, stoves, heaters (gas-based)">Boilers, stoves, heaters (gas-based)</SelectItem>
                        <SelectItem value="Electronics (laptops, TVs, phones)">Electronics (laptops, TVs, phones)</SelectItem>
                        <SelectItem value="Electric machinery/equipment">Electric machinery/equipment</SelectItem>
                        <SelectItem value="Gas-fired industrial machinery sold">Gas-fired industrial machinery sold</SelectItem>
                        <SelectItem value="Sold fuels (LPG, petrol, diesel)">Sold fuels (LPG, petrol, diesel)</SelectItem>
                        <SelectItem value="Sold chemicals that emit during use">Sold chemicals that emit during use</SelectItem>
                        <SelectItem value="Refrigerants sold">Refrigerants sold</SelectItem>
                        <SelectItem value="Batteries">Batteries</SelectItem>
                        <SelectItem value="Water-using devices">Water-using devices</SelectItem>
                      </SelectContent>
                    </Select>
          </div>
          <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Quantity <FieldTooltip content="Amount or quantity of product" />
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="Enter quantity"
                      value={row.quantity ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                        setUseRows(prev => prev.map(r => 
                          r.id === row.id ? { ...r, quantity: value } : r
                        ));
                      }}
                    />
          </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
                  <div>
                    <Label className="flex items-center gap-1 mb-2">
                      Energy Consumption During Use <FieldTooltip content="Total lifetime energy consumed" />
                    </Label>
                    <Input
                      placeholder="e.g., kWh/year"
                      value={row.energyConsumption}
                      onChange={(e) => {
                        setUseRows(prev => prev.map(r => 
                          r.id === row.id ? { ...r, energyConsumption: e.target.value } : r
                        ));
                      }}
                    />
        </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setUseRows(prev => prev.filter(r => r.id !== row.id))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {useRows.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No entries yet. Click "Add New Entry" to get started.</p>
          </div>
        )}

        <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
              <div className="text-gray-700 font-medium">
                Total Use Entries: <span className="font-semibold">{useRows.length}</span>
                {totalEmissions > 0 && (
                  <span className="ml-4">
                    Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO2e</span>
                  </span>
                )}
              </div>
              <Button 
                onClick={() => {
                  toast({ title: 'Saved', description: 'Use of sold products saved.' });
                  onSaveAndNext?.();
                }} 
                disabled={useRows.length === 0} 
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />{`Save and Next (${useRows.length})`}
              </Button>
              </div>
        </div>
      </div>
    );
  }

    return null;
  }


  // End-of-Life Treatment
  if (activeCategory === 'endOfLifeTreatment') {
    const totalEmissions = endOfLifeRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalVolume = endOfLifeRows.reduce((sum, r) => sum + (r.volume || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">End-of-Life Treatment</h4>
            <p className="text-sm text-gray-600">Disposal methods, recycling potential, materials</p>
          </div>
          <Button onClick={addEndOfLifeRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center mb-4">
          <Label className="text-gray-500 font-medium">Material</Label>
          <Label className="text-gray-500 font-medium">Volume (kg)</Label>
          <Label className="text-gray-500 font-medium">Disposal Method</Label>
          <Label className="text-gray-500 font-medium">Recycle (%)</Label>
          <Label className="text-gray-500 font-medium">Composition</Label>
          <Label className="text-gray-500 font-medium">Emissions</Label>
        </div>

        <div className="space-y-4">
          {endOfLifeRows.map((r) => {
            const material = wasteMaterials.find(m => m.id === r.materialId);
            const availableMethods = getAvailableDisposalMethods(material || null);
            return (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-full">
                  <Select
                    value={r.materialId}
                    onValueChange={(v) => {
                      updateEndOfLifeRow(r.id, { materialId: v, disposalMethod: '' });
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
              <SelectContent>
                      {wasteMaterials.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        wasteMaterials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m[" Material "] || "Unknown"}
                          </SelectItem>
                        ))
                      )}
              </SelectContent>
            </Select>
          </div>
                <div className="w-full">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={r.volume ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateEndOfLifeRow(r.id, { volume: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateEndOfLifeRow(r.id, { volume: numValue });
                        }
                      }
                    }}
                    placeholder="Enter volume"
                    className="w-full"
                  />
          </div>
                <div className="w-full">
                  <Select
                    value={r.disposalMethod}
                    onValueChange={(v) => updateEndOfLifeRow(r.id, { disposalMethod: v as DisposalMethod })}
                    disabled={!material || availableMethods.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMethods.length === 0 ? (
                        <SelectItem value="none" disabled>Select material first</SelectItem>
                      ) : (
                        availableMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
          </div>
                <div className="w-full">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={r.recycle ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateEndOfLifeRow(r.id, { recycle: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0 && numValue <= 100) {
                          updateEndOfLifeRow(r.id, { recycle: numValue });
                        }
                      }
                    }}
                    placeholder="Recycle %"
                    className="w-full"
                  />
        </div>
                <div className="w-full">
                  <Input
                    value={r.composition}
                    onChange={(e) => updateEndOfLifeRow(r.id, { composition: e.target.value })}
                    placeholder="Enter materials"
                    className="w-full"
                  />
        </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-700 font-medium flex-1">
                    {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO2e` : '-'}
                </div>
                  {r.isExisting ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50" 
                      onClick={() => deleteEndOfLifeRow(r.id)} 
                      disabled={deletingEndOfLife.has(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => removeEndOfLifeRow(r.id)}>
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
            Total Volume: <span className="font-semibold">{totalVolume.toFixed(2)} kg</span> | 
            Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO2e</span>
          </div>
          {(() => {
            const pendingNew = endOfLifeRows.filter(r => !r.isExisting && r.materialId && typeof r.volume === 'number' && r.volume > 0 && r.disposalMethod).length;
            const pendingUpdates = endOfLifeRows.filter(r => {
              if (!r.isExisting || !r.dbId) return false;
              const existing = existingEndOfLife.find(e => e.dbId === r.dbId);
              if (!existing) return false;
              return existing.materialId !== r.materialId || 
                     existing.volume !== r.volume ||
                     existing.disposalMethod !== r.disposalMethod ||
                     existing.recycle !== r.recycle ||
                     existing.composition !== r.composition ||
                     Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01;
            }).length;
            const totalPending = pendingNew + pendingUpdates;
            return (
              <Button 
                onClick={saveEndOfLife} 
                disabled={savingEndOfLife || totalPending === 0} 
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingEndOfLife ? 'Saving...' : `Save and Next (${totalPending})`}
              </Button>
            );
          })()}
        </div>
      </div>
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



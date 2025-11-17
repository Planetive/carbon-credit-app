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

type Props = {
  activeCategory: string;
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
};

// Vehicle type notes mapping (A, B, C explanations) - concise versions
const getVehicleTypeNote = (vehicleType: string): string | null => {
  const normalized = vehicleType.toLowerCase();
  
  if (normalized.includes('passenger car')) {
    return "Automobiles used primarily to transport 12 people or less for personal travel, less than 8,500 lbs in gross vehicle weight.";
  }
  
  if (normalized.includes('light-duty truck')) {
    return "Vehicles that primarily transport passengers (SUVs, minivans) or light-weight cargo with special features like four-wheel drive. Gross vehicle weight normally around 8,500 pounds or less.";
  }
  
  if (normalized.includes('medium') && normalized.includes('heavy-duty truck') || 
      normalized.includes('heavy-duty truck') || 
      (normalized.includes('medium') && normalized.includes('truck'))) {
    return "Vehicles with gross vehicle weight more than 8,500 pounds, including single unit trucks, combination trucks, tractor-trailers, box trucks, service and utility trucks.";
  }
  
  return null;
};

// Check if vehicle type has a note
const hasVehicleTypeNote = (vehicleType: string): boolean => {
  return getVehicleTypeNote(vehicleType) !== null;
};

// Get superscript for vehicle type
const getVehicleTypeSuperscript = (vehicleType: string): string => {
  const normalized = vehicleType.toLowerCase();
  
  if (normalized.includes('passenger car') || normalized.includes('passenger car a')) {
    return 'A';
  }
  if (normalized.includes('light-duty truck') || normalized.includes('light-duty truck b')) {
    return 'B';
  }
  if ((normalized.includes('medium') || normalized.includes('heavy-duty truck')) && normalized.includes('c')) {
    return 'C';
  }
  
  return '';
};

// Remove trailing A, B, C from vehicle type name
const cleanVehicleTypeName = (vehicleType: string): string => {
  // Remove trailing space and single letter (A, B, or C) at the end
  return vehicleType.replace(/\s+[ABC]$/i, '').trim();
};

export const Scope3Section: React.FC<Props> = ({ activeCategory, emissionData, setEmissionData }) => {
  const { toast } = useToast();
  
  // State for Purchased Goods & Services - row-based
  interface PurchasedGoodsRow {
    id: string;
    supplier: Supplier | null;
    amountSpent: number | undefined;
    emissions: number | undefined;
  }
  const [purchasedGoodsRows, setPurchasedGoodsRows] = useState<PurchasedGoodsRow[]>([]);
  
  const newPurchasedGoodsRow = (): PurchasedGoodsRow => ({
    id: `pgs-${Date.now()}-${Math.random()}`,
    supplier: null,
    amountSpent: undefined,
    emissions: undefined,
  });
  
  const addPurchasedGoodsRow = () => {
    setPurchasedGoodsRows(prev => [...prev, newPurchasedGoodsRow()]);
  };
  
  const removePurchasedGoodsRow = (id: string) => {
    setPurchasedGoodsRows(prev => prev.filter(r => r.id !== id));
  };
  
  const updatePurchasedGoodsRow = (id: string, patch: Partial<PurchasedGoodsRow>) => {
    setPurchasedGoodsRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      // Auto-calculate emissions: amountSpent * emission_factor
      if (updated.supplier && typeof updated.amountSpent === 'number' && updated.amountSpent > 0) {
        updated.emissions = updated.amountSpent * updated.supplier.emission_factor;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  // Sync purchased goods rows to emissionData
  useEffect(() => {
    const entries = purchasedGoodsRows
      .filter(r => r.supplier && typeof r.amountSpent === 'number' && r.amountSpent > 0)
      .map(r => ({
        id: r.id,
        category: 'purchased_goods_services' as const,
        activity: `${r.supplier!.supplier_name} (${r.supplier!.code})`,
        unit: 'PKR',
        quantity: r.amountSpent!,
        emissions: r.emissions || 0,
      }));
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'purchased_goods_services'),
        ...entries,
      ]
    }));
  }, [purchasedGoodsRows, setEmissionData]);
  
  // State for Capital Goods - row-based
  interface CapitalGoodsRow {
    id: string;
    supplier: Supplier | null;
    amount: number | undefined;
    emissions: number | undefined;
  }
  const [capitalGoodsRows, setCapitalGoodsRows] = useState<CapitalGoodsRow[]>([]);
  
  const newCapitalGoodsRow = (): CapitalGoodsRow => ({
    id: `capg-${Date.now()}-${Math.random()}`,
    supplier: null,
    amount: undefined,
    emissions: undefined,
  });
  
  const addCapitalGoodsRow = () => setCapitalGoodsRows(prev => [...prev, newCapitalGoodsRow()]);
  const removeCapitalGoodsRow = (id: string) => setCapitalGoodsRows(prev => prev.filter(r => r.id !== id));
  
  const updateCapitalGoodsRow = (id: string, patch: Partial<CapitalGoodsRow>) => {
    setCapitalGoodsRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...patch };
      if (updated.supplier && typeof updated.amount === 'number' && updated.amount > 0) {
        updated.emissions = updated.amount * updated.supplier.emission_factor;
      } else {
        updated.emissions = undefined;
      }
      return updated;
    }));
  };
  
  useEffect(() => {
    const entries = capitalGoodsRows
      .filter(r => r.supplier && typeof r.amount === 'number' && r.amount > 0)
      .map(r => ({
        id: r.id,
        category: 'capital_goods' as const,
        activity: `${r.supplier!.supplier_name} (${r.supplier!.code})`,
        unit: 'PKR',
        quantity: r.amount!,
        emissions: r.emissions || 0,
      }));
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'capital_goods'),
        ...entries,
      ]
    }));
  }, [capitalGoodsRows, setEmissionData]);
  
  // Shared data for multiple categories
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [wasteMaterials, setWasteMaterials] = useState<WasteMaterial[]>([]);
  const [businessTravelTypes, setBusinessTravelTypes] = useState<BusinessTravelType[]>([]);
  
  // Row-based state for Upstream Transportation
  interface UpstreamTransportRow {
    id: string;
    vehicleTypeId: string;
    distance: number | undefined;
    weight: number | undefined;
    emissions: number | undefined;
  }
  const [upstreamTransportRows, setUpstreamTransportRows] = useState<UpstreamTransportRow[]>([]);
  
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
  
  useEffect(() => {
    const entries = upstreamTransportRows
      .filter(r => r.vehicleTypeId && typeof r.distance === 'number' && r.distance > 0 && typeof r.weight === 'number' && r.weight > 0)
      .map(r => {
        const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
        return {
          id: r.id,
          category: 'upstream_transportation' as const,
          activity: `${vehicleType?.vehicle_type || ''}`,
          unit: 'kg',
          quantity: r.weight!,
          emissions: r.emissions || 0,
        };
      });
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'upstream_transportation'),
        ...entries,
      ]
    }));
  }, [upstreamTransportRows, vehicleTypes, setEmissionData]);
  
  // Row-based state for Downstream Transportation
  interface DownstreamTransportRow {
    id: string;
    vehicleTypeId: string;
    distance: number | undefined;
    weight: number | undefined;
    method: string;
    packaging: string;
    emissions: number | undefined;
  }
  const [downstreamTransportRows, setDownstreamTransportRows] = useState<DownstreamTransportRow[]>([]);
  
  const newDownstreamTransportRow = (): DownstreamTransportRow => ({
    id: `dt-${Date.now()}-${Math.random()}`,
    vehicleTypeId: '',
    distance: undefined,
    weight: undefined,
    method: '',
    packaging: '',
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
  
  useEffect(() => {
    const entries = downstreamTransportRows
      .filter(r => r.vehicleTypeId && typeof r.distance === 'number' && r.distance > 0 && typeof r.weight === 'number' && r.weight > 0)
      .map(r => {
        const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
        return {
          id: r.id,
          category: 'downstream_transportation' as const,
          activity: `${r.method || ''} | ${vehicleType?.vehicle_type || ''} | Packaging: ${r.packaging || ''}`,
          unit: 'kg',
          quantity: r.weight!,
          emissions: r.emissions || 0,
        };
      });
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'downstream_transportation'),
        ...entries,
      ]
    }));
  }, [downstreamTransportRows, vehicleTypes, setEmissionData]);
  
  // Row-based state for Waste Generated
  interface WasteGeneratedRow {
    id: string;
    materialId: string;
    volume: number | undefined;
    disposalMethod: DisposalMethod | "";
    emissions: number | undefined;
  }
  const [wasteGeneratedRows, setWasteGeneratedRows] = useState<WasteGeneratedRow[]>([]);
  
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
  
  useEffect(() => {
    const entries = wasteGeneratedRows
      .filter(r => r.materialId && typeof r.volume === 'number' && r.volume > 0 && r.disposalMethod)
      .map(r => {
        const material = wasteMaterials.find(m => m.id === r.materialId);
        return {
          id: r.id,
          category: 'waste_generated' as const,
          activity: `${material?.[" Material "] || ''} | ${r.disposalMethod} | Volume: ${r.volume!.toFixed(2)} kg`,
          unit: 'kg',
          quantity: r.volume!,
          emissions: r.emissions || 0,
        };
      });
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'waste_generated'),
        ...entries,
      ]
    }));
  }, [wasteGeneratedRows, wasteMaterials, setEmissionData]);
  
  // Row-based state for Business Travel
  interface BusinessTravelRow {
    id: string;
    travelTypeId: string;
    distance: number | undefined;
    emissions: number | undefined;
  }
  const [businessTravelRows, setBusinessTravelRows] = useState<BusinessTravelRow[]>([]);
  
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
  
  useEffect(() => {
    const entries = businessTravelRows
      .filter(r => r.travelTypeId && typeof r.distance === 'number' && r.distance > 0)
      .map(r => {
        const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
        return {
          id: r.id,
          category: 'business_travel' as const,
          activity: travelType?.vehicle_type || '',
          unit: 'km',
          quantity: r.distance!,
          emissions: r.emissions || 0,
        };
      });
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'business_travel'),
        ...entries,
      ]
    }));
  }, [businessTravelRows, businessTravelTypes, setEmissionData]);
  
  // Row-based state for Employee Commuting
  interface EmployeeCommutingRow {
    id: string;
    travelTypeId: string;
    distance: number | undefined;
    employees: number | undefined;
    emissions: number | undefined;
  }
  const [employeeCommutingRows, setEmployeeCommutingRows] = useState<EmployeeCommutingRow[]>([]);
  
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
  
  useEffect(() => {
    const entries = employeeCommutingRows
      .filter(r => r.travelTypeId && typeof r.distance === 'number' && r.distance > 0 && typeof r.employees === 'number' && r.employees > 0)
      .map(r => {
        const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
        return {
          id: r.id,
          category: 'employee_commuting' as const,
          activity: `${travelType?.vehicle_type || ''}${r.employees && r.employees > 0 ? ` | Employees: ${r.employees}` : ''}`,
          unit: 'km',
          quantity: r.distance!,
          emissions: r.emissions || 0,
        };
      });
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'employee_commuting'),
        ...entries,
      ]
    }));
  }, [employeeCommutingRows, businessTravelTypes, setEmissionData]);
  
  // Row-based state for End of Life Treatment
  interface EndOfLifeRow {
    id: string;
    materialId: string;
    volume: number | undefined;
    disposalMethod: DisposalMethod | "";
    recycle: number | undefined;
    composition: string;
    emissions: number | undefined;
  }
  const [endOfLifeRows, setEndOfLifeRows] = useState<EndOfLifeRow[]>([]);
  
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
  
  useEffect(() => {
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
  }, [endOfLifeRows, wasteMaterials, setEmissionData]);

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

  // Purchased Goods & Services
  if (activeCategory === 'purchasedGoods') {
    const totalEmissions = purchasedGoodsRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalAmount = purchasedGoodsRows.reduce((sum, r) => sum + (r.amountSpent || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Purchased Goods & Services</h4>
            <p className="text-sm text-gray-600">Add your organization's purchased goods data</p>
          </div>
          <Button onClick={addPurchasedGoodsRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <Label className="text-gray-500">Supplier</Label>
          <Label className="text-gray-500">Amount Spent (PKR)</Label>
          <Label className="text-gray-500">Emissions</Label>
        </div>

        <div className="space-y-3">
          {purchasedGoodsRows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-4 rounded-lg bg-gray-50">
              <div className="w-full">
                <SupplierAutocomplete
                  value={r.supplier}
                  onSelect={(supplier) => updatePurchasedGoodsRow(r.id, { supplier })}
                  placeholder="Search supplier..."
                />
              </div>
              <div className="w-full">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={r.amountSpent ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updatePurchasedGoodsRow(r.id, { amountSpent: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0) {
                        updatePurchasedGoodsRow(r.id, { amountSpent: numValue });
                      }
                    }
                  }}
                  placeholder="Enter amount spent"
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600 flex-1">
                  {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO2e` : '-'}
                </div>
                <Button variant="ghost" className="text-red-600" onClick={() => removePurchasedGoodsRow(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-gray-700 font-medium">
            Total Amount: <span className="font-semibold">{totalAmount.toFixed(2)} PKR</span> | 
            Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO2e</span>
          </div>
          <Button onClick={() => toast({ title: 'Saved', description: 'Purchased goods entries saved (frontend only for now).' })} disabled={purchasedGoodsRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${purchasedGoodsRows.length})`}
          </Button>
        </div>
      </div>
    );
  }

  // Capital Goods
  if (activeCategory === 'capitalGoods') {
    const totalEmissions = capitalGoodsRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalAmount = capitalGoodsRows.reduce((sum, r) => sum + (r.amount || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Capital Goods</h4>
            <p className="text-sm text-gray-600">Record details for purchased capital goods</p>
          </div>
          <Button onClick={addCapitalGoodsRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <Label className="text-gray-500">Equipment</Label>
          <Label className="text-gray-500">Amount (PKR)</Label>
          <Label className="text-gray-500">Emissions</Label>
          </div>

        <div className="space-y-3">
          {capitalGoodsRows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center p-4 rounded-lg bg-gray-50">
              <div className="w-full">
                <SupplierAutocomplete
                  value={r.supplier}
                  onSelect={(supplier) => updateCapitalGoodsRow(r.id, { supplier })}
                  placeholder="Search equipment/supplier..."
                />
              </div>
              <div className="w-full">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={r.amount ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateCapitalGoodsRow(r.id, { amount: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0) {
                        updateCapitalGoodsRow(r.id, { amount: numValue });
                      }
                    }
                  }}
                  placeholder="Enter amount"
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-600 flex-1">
                  {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO2e` : '-'}
        </div>
                <Button variant="ghost" className="text-red-600" onClick={() => removeCapitalGoodsRow(r.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              </div>
            ))}
          </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-gray-700 font-medium">
            Total Amount: <span className="font-semibold">PKR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> | 
            Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO2e</span>
          </div>
          <Button onClick={() => toast({ title: 'Saved', description: 'Capital goods saved (frontend only for now).' })} disabled={capitalGoodsRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${capitalGoodsRows.length})`}
                </Button>
        </div>
      </div>
    );
  }

  // Row-based state for Fuel & Energy Related Activities
  interface FuelEnergyRow {
    id: string;
    extraction: string;
    distance: number | undefined;
    refining: string;
  }
  const [fuelEnergyRows, setFuelEnergyRows] = useState<FuelEnergyRow[]>([]);
  
  // Upstream Leased Assets state
  const { user } = useAuth();
  const [upstreamSelectedCategory, setUpstreamSelectedCategory] = useState<string>('');
  
  // Type definitions (used by both upstream and LeasedAssetsSection)
  type FuelType = "Gaseous fuels" | "Liquid fuels" | "Solid fuels";
  interface OtherSourceRow {
    id: string;
    type?: FuelType;
    fuel?: string;
    unit?: string;
    quantity?: number;
    factor?: number;
    emissions?: number;
  }
  interface TransportRow {
    id: string;
    vehicleType: 'passenger' | 'delivery';
    activity?: string;
    vehicleTypeName?: string;
    unit?: string;
    distance?: number;
    factor?: number;
    emissions?: number;
  }
  interface RefrigerantRow {
    id: string;
    refrigerantType?: string;
    quantity?: number;
    factor?: number;
    emissions?: number;
  }
  
  // Upstream Leased Assets state (same structure as Downstream)
  // Buildings & Facilities state
  const [upstreamTotalKwh, setUpstreamTotalKwh] = useState<number | undefined>();
  const [upstreamGridPct, setUpstreamGridPct] = useState<number | undefined>();
  const [upstreamRenewablePct, setUpstreamRenewablePct] = useState<number | undefined>();
  const [upstreamOtherPct, setUpstreamOtherPct] = useState<number | undefined>();
  const [upstreamGridCountry, setUpstreamGridCountry] = useState<"UAE" | "Pakistan" | undefined>();
  const upstreamGridFactor = useMemo(() => upstreamGridCountry ? SCOPE2_FACTORS.GridCountries[upstreamGridCountry] : undefined, [upstreamGridCountry]);
  const [upstreamOtherRows, setUpstreamOtherRows] = useState<OtherSourceRow[]>([]);
  
  // Transport & Logistics state
  const [upstreamLeasedTransportRows, setUpstreamLeasedTransportRows] = useState<TransportRow[]>([]);
  
  // Equipment & Machinery state
  const [upstreamEquipmentTotalKwh, setUpstreamEquipmentTotalKwh] = useState<number | undefined>();
  const [upstreamEquipmentGridPct, setUpstreamEquipmentGridPct] = useState<number | undefined>();
  const [upstreamEquipmentRenewablePct, setUpstreamEquipmentRenewablePct] = useState<number | undefined>();
  const [upstreamEquipmentOtherPct, setUpstreamEquipmentOtherPct] = useState<number | undefined>();
  const [upstreamEquipmentGridCountry, setUpstreamEquipmentGridCountry] = useState<"UAE" | "Pakistan" | undefined>();
  const upstreamEquipmentGridFactor = useMemo(() => upstreamEquipmentGridCountry ? SCOPE2_FACTORS.GridCountries[upstreamEquipmentGridCountry] : undefined, [upstreamEquipmentGridCountry]);
  const [upstreamEquipmentOtherRows, setUpstreamEquipmentOtherRows] = useState<OtherSourceRow[]>([]);
  const [upstreamEquipmentTransportRows, setUpstreamEquipmentTransportRows] = useState<TransportRow[]>([]);
  
  // Infrastructure & Utilities state
  const [upstreamInfrastructureTotalKwh, setUpstreamInfrastructureTotalKwh] = useState<number | undefined>();
  const [upstreamInfrastructureGridPct, setUpstreamInfrastructureGridPct] = useState<number | undefined>();
  const [upstreamInfrastructureRenewablePct, setUpstreamInfrastructureRenewablePct] = useState<number | undefined>();
  const [upstreamInfrastructureOtherPct, setUpstreamInfrastructureOtherPct] = useState<number | undefined>();
  const [upstreamInfrastructureGridCountry, setUpstreamInfrastructureGridCountry] = useState<"UAE" | "Pakistan" | undefined>();
  const upstreamInfrastructureGridFactor = useMemo(() => upstreamInfrastructureGridCountry ? SCOPE2_FACTORS.GridCountries[upstreamInfrastructureGridCountry] : undefined, [upstreamInfrastructureGridCountry]);
  const [upstreamInfrastructureOtherRows, setUpstreamInfrastructureOtherRows] = useState<OtherSourceRow[]>([]);
  const [upstreamInfrastructureRefrigerantRows, setUpstreamInfrastructureRefrigerantRows] = useState<RefrigerantRow[]>([]);
  
  // Helper functions for Downstream Leased Assets
  const fuelTypes = Object.keys(FACTORS) as FuelType[];
  const fuelsFor = (type?: FuelType) => (type ? Object.keys(FACTORS[type]) : []);
  const unitsFor = (type?: FuelType, fuel?: string) => (type && fuel ? Object.keys(FACTORS[type][fuel]) : []);
  
  const vehicleActivities = Object.keys(VEHICLE_FACTORS);
  const vehicleTypesFor = (activity?: string) => (activity ? Object.keys(VEHICLE_FACTORS[activity]) : []);
  const vehicleUnitsFor = (activity?: string, vehicleType?: string) => (activity && vehicleType ? Object.keys(VEHICLE_FACTORS[activity][vehicleType]) : []);
  
  const deliveryActivities = Object.keys(DELIVERY_VEHICLE_FACTORS);
  const deliveryTypesFor = (activity?: string) => (activity ? Object.keys(DELIVERY_VEHICLE_FACTORS[activity]) : []);
  const deliveryUnitsFor = (activity?: string, vehicleType?: string) => (activity && vehicleType ? Object.keys(DELIVERY_VEHICLE_FACTORS[activity][vehicleType]) : []);
  
  // Upstream Leased Assets calculations
  // Buildings & Facilities calculations
  const upstreamGridEmissions = useMemo(() => {
    if (!upstreamTotalKwh || !upstreamGridPct || !upstreamGridFactor) return 0;
    return Number(((upstreamGridPct / 100) * upstreamTotalKwh * upstreamGridFactor).toFixed(6));
  }, [upstreamTotalKwh, upstreamGridPct, upstreamGridFactor]);
  
  const upstreamTotalOtherEmissions = useMemo(() => {
    return upstreamOtherRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [upstreamOtherRows]);
  
  const upstreamComputedElectricityEmissions = useMemo(() => {
    if (!upstreamTotalKwh) return 0;
    const gridPart = upstreamGridPct && upstreamGridCountry && upstreamGridFactor ? (upstreamGridPct / 100) * upstreamTotalKwh * upstreamGridFactor : 0;
    const renewablePart = upstreamRenewablePct ? 0 : 0;
    let otherPart = 0;
    if (upstreamOtherPct && upstreamOtherPct > 0 && upstreamOtherRows.length > 0) {
      const sumOtherEmissions = upstreamOtherRows.reduce((s, r) => s + (r.emissions || 0), 0);
      otherPart = (upstreamOtherPct / 100) * upstreamTotalKwh * sumOtherEmissions;
    }
    return Number((gridPart + renewablePart + otherPart).toFixed(6));
  }, [upstreamTotalKwh, upstreamGridPct, upstreamGridCountry, upstreamGridFactor, upstreamRenewablePct, upstreamOtherPct, upstreamOtherRows]);
  
  // Transport calculations
  const updateUpstreamLeasedTransportRow = (id: string, updates: Partial<TransportRow>) => {
    setUpstreamLeasedTransportRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      if (updated.vehicleType === 'passenger' && updated.activity && updated.vehicleTypeName && updated.unit && typeof updated.distance === 'number') {
        const factor = VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        if (factor) {
          updated.factor = factor;
          updated.emissions = updated.distance * factor;
        }
      } else if (updated.vehicleType === 'delivery' && updated.activity && updated.vehicleTypeName && updated.unit && typeof updated.distance === 'number') {
        const factor = DELIVERY_VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        if (factor) {
          updated.factor = factor;
          updated.emissions = updated.distance * factor;
        }
      }
      return updated;
    }));
  };
  
  const addUpstreamLeasedTransportRow = (type: 'passenger' | 'delivery') => {
    setUpstreamLeasedTransportRows(prev => [...prev, {
      id: `upstream-leased-transport-${Date.now()}-${Math.random()}`,
      vehicleType: type,
    }]);
  };
  
  const removeUpstreamLeasedTransportRow = (id: string) => {
    setUpstreamLeasedTransportRows(prev => prev.filter(r => r.id !== id));
  };
  
  const upstreamLeasedTotalTransportEmissions = useMemo(() => {
    return upstreamLeasedTransportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [upstreamLeasedTransportRows]);
  
  // Equipment & Machinery calculations
  const upstreamEquipmentGridEmissions = useMemo(() => {
    if (!upstreamEquipmentTotalKwh || !upstreamEquipmentGridPct || !upstreamEquipmentGridFactor) return 0;
    return Number(((upstreamEquipmentGridPct / 100) * upstreamEquipmentTotalKwh * upstreamEquipmentGridFactor).toFixed(6));
  }, [upstreamEquipmentTotalKwh, upstreamEquipmentGridPct, upstreamEquipmentGridFactor]);
  
  const upstreamEquipmentTotalOtherEmissions = useMemo(() => {
    return upstreamEquipmentOtherRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [upstreamEquipmentOtherRows]);
  
  const upstreamEquipmentComputedElectricityEmissions = useMemo(() => {
    if (!upstreamEquipmentTotalKwh) return 0;
    const gridPart = upstreamEquipmentGridPct && upstreamEquipmentGridCountry && upstreamEquipmentGridFactor ? (upstreamEquipmentGridPct / 100) * upstreamEquipmentTotalKwh * upstreamEquipmentGridFactor : 0;
    const renewablePart = upstreamEquipmentRenewablePct ? 0 : 0;
    let otherPart = 0;
    if (upstreamEquipmentOtherPct && upstreamEquipmentOtherPct > 0 && upstreamEquipmentOtherRows.length > 0) {
      const sumOtherEmissions = upstreamEquipmentOtherRows.reduce((s, r) => s + (r.emissions || 0), 0);
      otherPart = (upstreamEquipmentOtherPct / 100) * upstreamEquipmentTotalKwh * sumOtherEmissions;
    }
    return Number((gridPart + renewablePart + otherPart).toFixed(6));
  }, [upstreamEquipmentTotalKwh, upstreamEquipmentGridPct, upstreamEquipmentGridCountry, upstreamEquipmentGridFactor, upstreamEquipmentRenewablePct, upstreamEquipmentOtherPct, upstreamEquipmentOtherRows]);
  
  const updateUpstreamEquipmentOtherRow = (id: string, updates: Partial<OtherSourceRow>) => {
    setUpstreamEquipmentOtherRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
      if (next.type && next.fuel && next.unit && typeof next.quantity === 'number') {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
        if (factor) {
          next.factor = factor;
          next.emissions = Number((next.quantity * next.factor).toFixed(6));
        } else {
          next.factor = undefined;
          next.emissions = undefined;
        }
      } else {
        next.factor = undefined;
        next.emissions = undefined;
      }
      return next;
    }));
  };
  
  const addUpstreamEquipmentOtherRow = () => {
    setUpstreamEquipmentOtherRows(prev => [...prev, {
      id: `upstream-equipment-other-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeUpstreamEquipmentOtherRow = (id: string) => {
    setUpstreamEquipmentOtherRows(prev => prev.filter(r => r.id !== id));
  };
  
  const updateUpstreamEquipmentTransportRow = (id: string, updates: Partial<TransportRow>) => {
    setUpstreamEquipmentTransportRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      if (updated.vehicleType === 'passenger' && updated.activity && updated.vehicleTypeName && updated.unit && typeof updated.distance === 'number') {
        const factor = VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        if (factor) {
          updated.factor = factor;
          updated.emissions = updated.distance * factor;
        }
      } else if (updated.vehicleType === 'delivery' && updated.activity && updated.vehicleTypeName && updated.unit && typeof updated.distance === 'number') {
        const factor = DELIVERY_VEHICLE_FACTORS[updated.activity]?.[updated.vehicleTypeName]?.[updated.unit];
        if (factor) {
          updated.factor = factor;
          updated.emissions = updated.distance * factor;
        }
      }
      return updated;
    }));
  };
  
  const addUpstreamEquipmentTransportRow = (type: 'passenger' | 'delivery') => {
    setUpstreamEquipmentTransportRows(prev => [...prev, {
      id: `upstream-equipment-transport-${Date.now()}-${Math.random()}`,
      vehicleType: type,
    }]);
  };
  
  const removeUpstreamEquipmentTransportRow = (id: string) => {
    setUpstreamEquipmentTransportRows(prev => prev.filter(r => r.id !== id));
  };
  
  const upstreamEquipmentTotalTransportEmissions = useMemo(() => {
    return upstreamEquipmentTransportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [upstreamEquipmentTransportRows]);
  
  const upstreamEquipmentTotalEmissions = useMemo(() => {
    return upstreamEquipmentComputedElectricityEmissions + upstreamEquipmentTotalTransportEmissions;
  }, [upstreamEquipmentComputedElectricityEmissions, upstreamEquipmentTotalTransportEmissions]);
  
  // Infrastructure & Utilities calculations
  const upstreamInfrastructureGridEmissions = useMemo(() => {
    if (!upstreamInfrastructureTotalKwh || !upstreamInfrastructureGridPct || !upstreamInfrastructureGridFactor) return 0;
    return Number(((upstreamInfrastructureGridPct / 100) * upstreamInfrastructureTotalKwh * upstreamInfrastructureGridFactor).toFixed(6));
  }, [upstreamInfrastructureTotalKwh, upstreamInfrastructureGridPct, upstreamInfrastructureGridFactor]);
  
  const upstreamInfrastructureTotalOtherEmissions = useMemo(() => {
    return upstreamInfrastructureOtherRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [upstreamInfrastructureOtherRows]);
  
  const upstreamInfrastructureComputedElectricityEmissions = useMemo(() => {
    if (!upstreamInfrastructureTotalKwh) return 0;
    const gridPart = upstreamInfrastructureGridPct && upstreamInfrastructureGridCountry && upstreamInfrastructureGridFactor ? (upstreamInfrastructureGridPct / 100) * upstreamInfrastructureTotalKwh * upstreamInfrastructureGridFactor : 0;
    const renewablePart = upstreamInfrastructureRenewablePct ? 0 : 0;
    let otherPart = 0;
    if (upstreamInfrastructureOtherPct && upstreamInfrastructureOtherPct > 0 && upstreamInfrastructureOtherRows.length > 0) {
      const sumOtherEmissions = upstreamInfrastructureOtherRows.reduce((s, r) => s + (r.emissions || 0), 0);
      otherPart = (upstreamInfrastructureOtherPct / 100) * upstreamInfrastructureTotalKwh * sumOtherEmissions;
    }
    return Number((gridPart + renewablePart + otherPart).toFixed(6));
  }, [upstreamInfrastructureTotalKwh, upstreamInfrastructureGridPct, upstreamInfrastructureGridCountry, upstreamInfrastructureGridFactor, upstreamInfrastructureRenewablePct, upstreamInfrastructureOtherPct, upstreamInfrastructureOtherRows]);
  
  const updateUpstreamInfrastructureOtherRow = (id: string, updates: Partial<OtherSourceRow>) => {
    setUpstreamInfrastructureOtherRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
      if (next.type && next.fuel && next.unit && typeof next.quantity === 'number') {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
        if (factor) {
          next.factor = factor;
          next.emissions = Number((next.quantity * next.factor).toFixed(6));
        } else {
          next.factor = undefined;
          next.emissions = undefined;
        }
      } else {
        next.factor = undefined;
        next.emissions = undefined;
      }
      return next;
    }));
  };
  
  const addUpstreamInfrastructureOtherRow = () => {
    setUpstreamInfrastructureOtherRows(prev => [...prev, {
      id: `upstream-infrastructure-other-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeUpstreamInfrastructureOtherRow = (id: string) => {
    setUpstreamInfrastructureOtherRows(prev => prev.filter(r => r.id !== id));
  };
  
  const updateUpstreamInfrastructureRefrigerantRow = (id: string, updates: Partial<RefrigerantRow>) => {
    setUpstreamInfrastructureRefrigerantRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...updates };
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
  
  const addUpstreamInfrastructureRefrigerantRow = () => {
    setUpstreamInfrastructureRefrigerantRows(prev => [...prev, {
      id: `upstream-infrastructure-refrigerant-${Date.now()}-${Math.random()}`,
    }]);
  };
  
  const removeUpstreamInfrastructureRefrigerantRow = (id: string) => {
    setUpstreamInfrastructureRefrigerantRows(prev => prev.filter(r => r.id !== id));
  };
  
  const upstreamInfrastructureTotalRefrigerantEmissions = useMemo(() => {
    return upstreamInfrastructureRefrigerantRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  }, [upstreamInfrastructureRefrigerantRows]);
  
  const upstreamInfrastructureTotalEmissions = useMemo(() => {
    return upstreamInfrastructureComputedElectricityEmissions + upstreamInfrastructureTotalRefrigerantEmissions;
  }, [upstreamInfrastructureComputedElectricityEmissions, upstreamInfrastructureTotalRefrigerantEmissions]);
  
  // Upstream helper functions
  const updateUpstreamOtherRow = (id: string, updates: Partial<OtherSourceRow>) => {
    setUpstreamOtherRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next: OtherSourceRow = { ...r, ...updates };
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
  
  const addUpstreamOtherRow = () => {
    setUpstreamOtherRows(prev => [...prev, { id: crypto.randomUUID() }]);
  };
  
  const removeUpstreamOtherRow = (id: string) => {
    setUpstreamOtherRows(prev => prev.filter(r => r.id !== id));
  };
  
  const newFuelEnergyRow = (): FuelEnergyRow => ({
    id: `fera-${Date.now()}-${Math.random()}`,
    extraction: '',
    distance: undefined,
    refining: '',
  });
  
  const addFuelEnergyRow = () => setFuelEnergyRows(prev => [...prev, newFuelEnergyRow()]);
  const removeFuelEnergyRow = (id: string) => setFuelEnergyRows(prev => prev.filter(r => r.id !== id));
  
  const updateFuelEnergyRow = (id: string, patch: Partial<FuelEnergyRow>) => {
    setFuelEnergyRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  
  useEffect(() => {
    const entries = fuelEnergyRows
      .filter(r => r.extraction && r.refining && typeof r.distance === 'number' && r.distance >= 0)
      .map(r => ({
        id: r.id,
        category: 'fuel_energy_activities' as const,
        activity: r.extraction,
        unit: 'km',
        quantity: r.distance!,
        emissions: 0,
      }));
    
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3.filter(r => r.category !== 'fuel_energy_activities'),
        ...entries,
      ]
    }));
  }, [fuelEnergyRows, setEmissionData]);

  // Fuel & Energy Related Activities
  if (activeCategory === 'fuelEnergyActivities') {
    const totalDistance = fuelEnergyRows.reduce((sum, r) => sum + (r.distance || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Fuel & Energy Related Activities</h4>
            <p className="text-sm text-gray-600">Capture upstream fuel and energy details</p>
          </div>
          <Button onClick={addFuelEnergyRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <Label className="text-gray-500">Extraction</Label>
          <Label className="text-gray-500">Distance (km)</Label>
          <Label className="text-gray-500">Refining</Label>
          <Label className="text-gray-500">Actions</Label>
          </div>

        <div className="space-y-3">
          {fuelEnergyRows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center p-4 rounded-lg bg-gray-50">
              <div className="w-full">
                <Input
                  value={r.extraction}
                  onChange={(e) => updateFuelEnergyRow(r.id, { extraction: e.target.value })}
                  placeholder="e.g., drilling, mining"
                  className="w-full"
                />
          </div>
              <div className="w-full">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={r.distance ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      updateFuelEnergyRow(r.id, { distance: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0) {
                        updateFuelEnergyRow(r.id, { distance: numValue });
                      }
                    }
                  }}
                  placeholder="Enter distance"
                  className="w-full"
                />
        </div>
              <div className="w-full">
                <Input
                  value={r.refining}
                  onChange={(e) => updateFuelEnergyRow(r.id, { refining: e.target.value })}
                  placeholder="Refining processes"
                  className="w-full"
                />
                </div>
              <Button variant="ghost" className="text-red-600" onClick={() => removeFuelEnergyRow(r.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              </div>
            ))}
          </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-gray-700 font-medium">
            Total Distance: <span className="font-semibold">{totalDistance.toFixed(1)} km</span>
              </div>
          <Button onClick={() => toast({ title: 'Saved', description: 'Fuel & Energy activities saved (frontend only for now).' })} disabled={fuelEnergyRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${fuelEnergyRows.length})`}
          </Button>
        </div>
      </div>
    );
  }

  // Upstream Transportation
  if (activeCategory === 'upstreamTransportation') {
    const totalEmissions = upstreamTransportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalWeight = upstreamTransportRows.reduce((sum, r) => sum + (r.weight || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Upstream Transportation</h4>
            <p className="text-sm text-gray-600">Transport modes, distances, vehicle types, fuel use</p>
          </div>
          <Button onClick={addUpstreamTransportRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <Label className="text-gray-500">Vehicle Type</Label>
          <Label className="text-gray-500">Distance (km)</Label>
          <Label className="text-gray-500">Weight (kg)</Label>
          <Label className="text-gray-500">Emissions</Label>
          </div>

        <div className="space-y-3">
          {upstreamTransportRows.map((r) => {
            const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
            return (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center p-4 rounded-lg bg-gray-50">
                <div className="w-full flex items-center gap-2">
                  <Select
                    value={r.vehicleTypeId}
                    onValueChange={(v) => updateUpstreamTransportRow(r.id, { vehicleTypeId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
              <SelectContent>
                      {vehicleTypes.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        vehicleTypes.map((vehicle) => {
                          const superscript = getVehicleTypeSuperscript(vehicle.vehicle_type);
                          const cleanedName = cleanVehicleTypeName(vehicle.vehicle_type);
                          return (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {cleanedName}
                              {superscript && <sup className="text-xs ml-1">{superscript}</sup>}
                            </SelectItem>
                          );
                        })
                      )}
              </SelectContent>
            </Select>
                  {r.vehicleTypeId && (() => {
                    const selectedVehicle = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
                    const note = selectedVehicle ? getVehicleTypeNote(selectedVehicle.vehicle_type) : null;
                    if (note) {
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="flex-shrink-0">
                                <Info className="h-4 w-4 text-teal-600 hover:text-teal-700" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{note}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }
                    return null;
                  })()}
          </div>
                <div className="w-full">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={r.distance ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateUpstreamTransportRow(r.id, { distance: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateUpstreamTransportRow(r.id, { distance: numValue });
                        }
                      }
                    }}
                    placeholder="Enter distance"
                    className="w-full"
                  />
          </div>
                <div className="w-full">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={r.weight ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateUpstreamTransportRow(r.id, { weight: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateUpstreamTransportRow(r.id, { weight: numValue });
                        }
                      }
                    }}
                    placeholder="Enter weight"
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 flex-1">
                    {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO2e` : '-'}
                </div>
                  <Button variant="ghost" className="text-red-600" onClick={() => removeUpstreamTransportRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
              </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-gray-700 font-medium">
            Total Weight: <span className="font-semibold">{totalWeight.toFixed(2)} kg</span> | 
            Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO2e</span>
          </div>
          <Button onClick={() => toast({ title: 'Saved', description: 'Upstream transportation saved (frontend only for now).' })} disabled={upstreamTransportRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${upstreamTransportRows.length})`}
          </Button>
        </div>
      </div>
    );
  }

  // Waste Generated
  if (activeCategory === 'wasteGenerated') {
    const totalEmissions = wasteGeneratedRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalVolume = wasteGeneratedRows.reduce((sum, r) => sum + (r.volume || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Waste Generated</h4>
            <p className="text-sm text-gray-600">Record waste types, volumes, and disposal methods</p>
          </div>
          <Button onClick={addWasteGeneratedRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <Label className="text-gray-500">Material</Label>
          <Label className="text-gray-500">Volume (kg)</Label>
          <Label className="text-gray-500">Disposal Method</Label>
          <Label className="text-gray-500">Emissions</Label>
        </div>

        <div className="space-y-3">
          {wasteGeneratedRows.map((r) => {
            const material = wasteMaterials.find(m => m.id === r.materialId);
            const availableMethods = getAvailableDisposalMethods(material || null);
            return (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center p-4 rounded-lg bg-gray-50">
                <div className="w-full">
                  <Select
                    value={r.materialId}
                    onValueChange={(v) => {
                      updateWasteGeneratedRow(r.id, { materialId: v, disposalMethod: '' });
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
                        updateWasteGeneratedRow(r.id, { volume: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateWasteGeneratedRow(r.id, { volume: numValue });
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
                    onValueChange={(v) => updateWasteGeneratedRow(r.id, { disposalMethod: v as DisposalMethod })}
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
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 flex-1">
                    {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO2e` : '-'}
          </div>
                  <Button variant="ghost" className="text-red-600" onClick={() => removeWasteGeneratedRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          <Button onClick={() => toast({ title: 'Saved', description: 'Waste generated entries saved (frontend only for now).' })} disabled={wasteGeneratedRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${wasteGeneratedRows.length})`}
          </Button>
        </div>
      </div>
    );
  }

  // Business Travel
  if (activeCategory === 'businessTravel') {
    const totalEmissions = businessTravelRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalDistance = businessTravelRows.reduce((sum, r) => sum + (r.distance || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Business Travel</h4>
            <p className="text-sm text-gray-600">Travel modes, distance, and emissions</p>
          </div>
          <Button onClick={addBusinessTravelRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <Label className="text-gray-500">Travel Mode</Label>
          <Label className="text-gray-500">Distance (km)</Label>
          <Label className="text-gray-500">Emissions</Label>
        </div>

        <div className="space-y-3">
          {businessTravelRows.map((r) => {
            const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
            return (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-4 rounded-lg bg-gray-50">
                <div className="w-full">
                  <Select
                    value={r.travelTypeId}
                    onValueChange={(v) => updateBusinessTravelRow(r.id, { travelTypeId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select travel mode" />
                    </SelectTrigger>
              <SelectContent>
                      {businessTravelTypes.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        businessTravelTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.vehicle_type}
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
                    value={r.distance ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateBusinessTravelRow(r.id, { distance: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateBusinessTravelRow(r.id, { distance: numValue });
                        }
                      }
                    }}
                    placeholder="Enter distance"
                    className="w-full"
                  />
          </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 flex-1">
                    {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO₂e` : '-'}
          </div>
                  <Button variant="ghost" className="text-red-600" onClick={() => removeBusinessTravelRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
        </div>
        </div>
            );
          })}
                </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-gray-700 font-medium">
            Total Distance: <span className="font-semibold">{totalDistance.toFixed(2)} km</span> | 
            Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO₂e</span>
              </div>
          <Button onClick={() => toast({ title: 'Saved', description: 'Business travel entries saved (frontend only for now).' })} disabled={businessTravelRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${businessTravelRows.length})`}
          </Button>
        </div>
      </div>
    );
  }

  // Employee Commuting
  if (activeCategory === 'employeeCommuting') {
    const totalEmissions = employeeCommutingRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalDistance = employeeCommutingRows.reduce((sum, r) => sum + (r.distance || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Employee Commuting</h4>
            <p className="text-sm text-gray-600">Travel modes, distance, and number of employees</p>
          </div>
          <Button onClick={addEmployeeCommutingRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          <Label className="text-gray-500">Travel Mode</Label>
          <Label className="text-gray-500">Distance (km)</Label>
          <Label className="text-gray-500">Employees</Label>
          <Label className="text-gray-500">Emissions</Label>
        </div>

        <div className="space-y-3">
          {employeeCommutingRows.map((r) => {
            const travelType = businessTravelTypes.find(bt => bt.id === r.travelTypeId);
            return (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center p-4 rounded-lg bg-gray-50">
                <div className="w-full">
                  <Select
                    value={r.travelTypeId}
                    onValueChange={(v) => updateEmployeeCommutingRow(r.id, { travelTypeId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select travel mode" />
                    </SelectTrigger>
              <SelectContent>
                      {businessTravelTypes.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        businessTravelTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.vehicle_type}
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
                    value={r.distance ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateEmployeeCommutingRow(r.id, { distance: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateEmployeeCommutingRow(r.id, { distance: numValue });
                        }
                      }
                    }}
                    placeholder="Enter distance"
                    className="w-full"
                  />
                </div>
                <div className="w-full">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={r.employees ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateEmployeeCommutingRow(r.id, { employees: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateEmployeeCommutingRow(r.id, { employees: numValue });
                        }
                      }
                    }}
                    placeholder="No. of employees"
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 flex-1">
                    {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO₂e` : '-'}
        </div>
                  <Button variant="ghost" className="text-red-600" onClick={() => removeEmployeeCommutingRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
        </div>
                </div>
            );
          })}
              </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-gray-700 font-medium">
            Total Distance: <span className="font-semibold">{totalDistance.toFixed(2)} km</span> | 
            Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO₂e</span>
          </div>
          <Button onClick={() => toast({ title: 'Saved', description: 'Employee commuting entries saved (frontend only for now).' })} disabled={employeeCommutingRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${employeeCommutingRows.length})`}
          </Button>
        </div>
      </div>
    );
  }
  // Upstream Leased Assets - Category-based implementation (same as Downstream)
  if (activeCategory === 'upstreamLeasedAssets') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Upstream Leased Assets</h4>
            <p className="text-sm text-gray-600">Asset categories, energy consumption, tenant activities</p>
          </div>
        </div>
        
        {/* Category Selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Category</Label>
            <Select value={upstreamSelectedCategory} onValueChange={setUpstreamSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buildings">Buildings & Facilities</SelectItem>
                <SelectItem value="transport">Transport & Logistics</SelectItem>
                <SelectItem value="equipment">Equipment & Machinery</SelectItem>
                <SelectItem value="infrastructure">Infrastructure & Utilities</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Buildings & Facilities Form (Scope 2 Electricity) */}
        {upstreamSelectedCategory === 'buildings' && (
          <div className="space-y-6 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Buildings & Facilities - Electricity Consumption</h4>
                <p className="text-sm text-gray-600">Enter electricity consumption data for leased buildings</p>
              </div>
            </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-1">
                <Label>Total electricity consumption (kWh)</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="999999999999.999999"
                  value={upstreamTotalKwh ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setUpstreamTotalKwh(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        setUpstreamTotalKwh(numValue);
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
                  value={upstreamGridPct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setUpstreamGridPct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setUpstreamGridPct(numValue);
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
                  value={upstreamRenewablePct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setUpstreamRenewablePct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setUpstreamRenewablePct(numValue);
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
                  value={upstreamOtherPct ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setUpstreamOtherPct(undefined);
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 100) {
                        setUpstreamOtherPct(numValue);
                      }
                    }
                  }}
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            {/* Grid sources section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <h3 className="text-lg font-medium mb-4">Grid sources</h3>
                <Label>Electricity provider country</Label>
                <Select value={upstreamGridCountry} onValueChange={v => setUpstreamGridCountry(v as any)}>
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
                <Input value={upstreamGridFactor ?? ''} readOnly placeholder="Auto" />
          </div>
          <div>
                <Label>Grid emissions</Label>
                <Input
                  readOnly
                  value={upstreamGridEmissions || ''}
                />
          </div>
              {upstreamGridPct && upstreamGridPct > 0 && (
                <div className="md:col-span-3 text-gray-700 font-medium">
                  Grid sources emissions: <span className="font-semibold">{upstreamGridEmissions.toFixed(6)} kg CO2e</span>
                </div>
              )}
            </div>

            {/* Other sources section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Other sources</h3>
                <Button onClick={addUpstreamOtherRow} className="bg-teal-600 hover:bg-teal-700 text-white">
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
                {upstreamOtherRows.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No other sources added yet. Click "Add Row" to add one.
                  </div>
                ) : (
                  upstreamOtherRows.map(r => (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-gray-50">
                      <Select
                        value={r.type}
                        onValueChange={v => updateUpstreamOtherRow(r.id, { type: v as FuelType, fuel: undefined, unit: undefined })}
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
                        onValueChange={v => updateUpstreamOtherRow(r.id, { fuel: v, unit: undefined })}
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
                        onValueChange={v => updateUpstreamOtherRow(r.id, { unit: v })}
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
                            updateUpstreamOtherRow(r.id, { quantity: undefined });
                          } else {
                            const numValue = Number(value);
                            if (numValue >= 0 && numValue <= 999999999999.999999) {
                              updateUpstreamOtherRow(r.id, { quantity: numValue });
                            }
                          }
                        }}
                        placeholder="Enter quantity"
                      />

                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" className="text-red-600" onClick={() => removeUpstreamOtherRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="text-gray-700 font-medium">
                Other sources emissions: <span className="font-semibold">{upstreamTotalOtherEmissions.toFixed(6)} kg CO2e</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-gray-900 font-medium">
                Total electricity emissions: <span className="font-semibold">{upstreamComputedElectricityEmissions.toFixed(6)} kg CO2e</span>
              </div>
              <Button onClick={() => toast({ title: 'Saved', description: 'Upstream Buildings & Facilities data saved (frontend only for now).' })} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </div>
        )}
        
        {/* Transport & Logistics Form (Passenger + Delivery Vehicles) */}
        {upstreamSelectedCategory === 'transport' && (
          <div className="space-y-6 border-t pt-6">
            <div className="flex items-center justify-between">
          <div>
                <h4 className="text-lg font-semibold text-gray-900">Transport & Logistics</h4>
                <p className="text-sm text-gray-600">Passenger and delivery vehicle usage for leased transport assets</p>
          </div>
              <div className="flex gap-2">
                <Button onClick={() => addUpstreamLeasedTransportRow('passenger')} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />Add Passenger Vehicle
                </Button>
                <Button onClick={() => addUpstreamLeasedTransportRow('delivery')} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />Add Delivery Vehicle
                </Button>
        </div>
        </div>

            {/* Passenger Vehicles */}
            {upstreamLeasedTransportRows.filter(r => r.vehicleType === 'passenger').length > 0 && (
              <div className="space-y-4">
                <h5 className="text-md font-semibold text-gray-800">Passenger Vehicles</h5>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Label className="text-gray-500">Activity</Label>
                  <Label className="text-gray-500">Type</Label>
                  <Label className="text-gray-500">Unit</Label>
                  <Label className="text-gray-500">Distance</Label>
                </div>
                <div className="space-y-3">
                  {upstreamLeasedTransportRows.filter(r => r.vehicleType === 'passenger').map((r) => (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50">
                      <Select 
                        value={r.activity} 
                        onValueChange={(v) => updateUpstreamLeasedTransportRow(r.id, { activity: v, vehicleTypeName: undefined, unit: undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleActivities.map(activity => <SelectItem key={activity} value={activity}>{activity}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={r.vehicleTypeName} 
                        onValueChange={(v) => updateUpstreamLeasedTransportRow(r.id, { vehicleTypeName: v, unit: undefined })} 
                        disabled={!r.activity}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypesFor(r.activity).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={r.unit} 
                        onValueChange={(v) => updateUpstreamLeasedTransportRow(r.id, { unit: v })} 
                        disabled={!r.activity || !r.vehicleTypeName}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleUnitsFor(r.activity, r.vehicleTypeName).map(unit => <SelectItem key={unit} value={unit}>{unit}</SelectItem>)}
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
                              updateUpstreamLeasedTransportRow(r.id, { distance: undefined });
                            } else {
                              const numValue = Number(value);
                              if (numValue >= 0 && numValue <= 999999999999.999999) {
                                updateUpstreamLeasedTransportRow(r.id, { distance: numValue });
                              }
                            }
                          }} 
                          placeholder="Enter distance"
                          className="flex-1"
                        />
                        <Button variant="ghost" className="text-red-600" onClick={() => removeUpstreamLeasedTransportRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
              </div>
            ))}
                </div>
          </div>
        )}

            {/* Delivery Vehicles */}
            {upstreamLeasedTransportRows.filter(r => r.vehicleType === 'delivery').length > 0 && (
              <div className="space-y-4">
                <h5 className="text-md font-semibold text-gray-800">Delivery Vehicles</h5>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Label className="text-gray-500">Activity</Label>
                  <Label className="text-gray-500">Type</Label>
                  <Label className="text-gray-500">Unit</Label>
                  <Label className="text-gray-500">Distance</Label>
              </div>
                <div className="space-y-3">
                  {upstreamLeasedTransportRows.filter(r => r.vehicleType === 'delivery').map((r) => (
                    <div key={r.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50">
                      <Select 
                        value={r.activity} 
                        onValueChange={(v) => updateUpstreamLeasedTransportRow(r.id, { activity: v, vehicleTypeName: undefined, unit: undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryActivities.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={r.vehicleTypeName} 
                        onValueChange={(v) => updateUpstreamLeasedTransportRow(r.id, { vehicleTypeName: v, unit: undefined })} 
                        disabled={!r.activity}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryTypesFor(r.activity).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={r.unit} 
                        onValueChange={(v) => updateUpstreamLeasedTransportRow(r.id, { unit: v })} 
                        disabled={!r.activity || !r.vehicleTypeName}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryUnitsFor(r.activity, r.vehicleTypeName).map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
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
                              updateUpstreamLeasedTransportRow(r.id, { distance: undefined });
                            } else {
                              const numValue = Number(value);
                              if (numValue >= 0 && numValue <= 999999999999.999999) {
                                updateUpstreamLeasedTransportRow(r.id, { distance: numValue });
                              }
                            }
                          }} 
                          placeholder="Enter distance"
                          className="flex-1"
                        />
                        <Button variant="ghost" className="text-red-600" onClick={() => removeUpstreamLeasedTransportRow(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-gray-900 font-medium">
                Total transport emissions: <span className="font-semibold">{upstreamLeasedTotalTransportEmissions.toFixed(6)} kg CO2e</span>
              </div>
              <Button onClick={() => toast({ title: 'Saved', description: 'Upstream Transport & Logistics data saved (frontend only for now).' })} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          </div>
        )}
        
        {/* Equipment & Machinery and Infrastructure & Utilities sections would follow the same pattern as Downstream */}
        {/* For brevity, I'll add placeholders that can be expanded */}
        {upstreamSelectedCategory === 'equipment' && (
          <div className="space-y-6 border-t pt-6">
            <div className="text-center py-8 text-gray-500">
              Equipment & Machinery form - Same structure as Downstream (to be implemented)
            </div>
          </div>
        )}
        
        {upstreamSelectedCategory === 'infrastructure' && (
          <div className="space-y-6 border-t pt-6">
            <div className="text-center py-8 text-gray-500">
              Infrastructure & Utilities form - Same structure as Downstream (to be implemented)
            </div>
          </div>
        )}
      </div>
    );
  }

  // Investments
  if (activeCategory === 'investments') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Investments</h3>
            <p className="text-sm text-gray-600">Investment portfolio and investee emissions</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('inv-portfolio') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="inv-portfolio" className="flex items-center gap-1">Investment Portfolio <FieldTooltip content="Breakdown of portfolio" /></Label>
            <Input id="inv-portfolio" placeholder="Enter portfolio details" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="inv-emissions" className="flex items-center gap-1">Investee Company Emissions Data <FieldTooltip content="Reported Scope 1 & 2 emissions" /></Label>
            <Input id="inv-emissions" placeholder="Enter reported emissions data" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const portfolio = (document.getElementById('inv-portfolio') as any)?._value || (document.getElementById('inv-portfolio') as HTMLInputElement)?.value || '';
            const emissions = (document.getElementById('inv-emissions') as any)?._value || (document.getElementById('inv-emissions') as HTMLInputElement)?.value || '';
            if (!portfolio || !emissions) { toast({ title: 'Missing info', description: 'Enter portfolio and investee emissions data.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `inv-${Date.now()}`, category: 'investments', activity: `${portfolio}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['inv-portfolio','inv-emissions'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'investments').length > 0 && (
          <div className="space-y-3">
            {emissionData.scope3.filter(r => r.category === 'investments').map(row => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50">
                <div className="md:col-span-3">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="text-red-600" onClick={() => removeScope3Row(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'investments');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Investment Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Investment entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Downstream Transportation
  if (activeCategory === 'downstreamTransportation') {
    const totalEmissions = downstreamTransportRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
    const totalWeight = downstreamTransportRows.reduce((sum, r) => sum + (r.weight || 0), 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-900">Downstream Transportation</h4>
            <p className="text-sm text-gray-600">Distribution methods, distance, vehicles, packaging</p>
          </div>
          <Button onClick={addDownstreamTransportRow} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Add New Entry
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
          <Label className="text-gray-500">Method</Label>
          <Label className="text-gray-500">Vehicle Type</Label>
          <Label className="text-gray-500">Distance (km)</Label>
          <Label className="text-gray-500">Weight (kg)</Label>
          <Label className="text-gray-500">Packaging</Label>
          <Label className="text-gray-500">Emissions</Label>
        </div>

        <div className="space-y-3">
          {downstreamTransportRows.map((r) => {
            const vehicleType = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
            return (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center p-4 rounded-lg bg-gray-50">
                <div className="w-full">
                  <Select
                    value={r.method}
                    onValueChange={(v) => updateDownstreamTransportRow(r.id, { method: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
              <SelectContent>
                <SelectItem value="logistics">Logistics provider</SelectItem>
                <SelectItem value="direct-shipment">Direct shipment</SelectItem>
                <SelectItem value="third-party">Third-party distribution</SelectItem>
              </SelectContent>
            </Select>
          </div>
                <div className="w-full flex items-center gap-2">
                  <Select
                    value={r.vehicleTypeId}
                    onValueChange={(v) => updateDownstreamTransportRow(r.id, { vehicleTypeId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
              <SelectContent>
                      {vehicleTypes.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        vehicleTypes.map((vehicle) => {
                          const superscript = getVehicleTypeSuperscript(vehicle.vehicle_type);
                          const cleanedName = cleanVehicleTypeName(vehicle.vehicle_type);
                          return (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {cleanedName}
                              {superscript && <sup className="text-xs ml-1">{superscript}</sup>}
                            </SelectItem>
                          );
                        })
                      )}
              </SelectContent>
            </Select>
                  {r.vehicleTypeId && (() => {
                    const selectedVehicle = vehicleTypes.find(vt => vt.id === r.vehicleTypeId);
                    const note = selectedVehicle ? getVehicleTypeNote(selectedVehicle.vehicle_type) : null;
                    if (note) {
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="flex-shrink-0">
                                <Info className="h-4 w-4 text-teal-600 hover:text-teal-700" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">{note}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    }
                    return null;
                  })()}
          </div>
                <div className="w-full">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={r.distance ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateDownstreamTransportRow(r.id, { distance: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateDownstreamTransportRow(r.id, { distance: numValue });
                        }
                      }
                    }}
                    placeholder="Enter distance"
                    className="w-full"
                  />
                </div>
                <div className="w-full">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={r.weight ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateDownstreamTransportRow(r.id, { weight: undefined });
                      } else {
                        const numValue = Number(value);
                        if (numValue >= 0) {
                          updateDownstreamTransportRow(r.id, { weight: numValue });
                        }
                      }
                    }}
                    placeholder="Enter weight"
                    className="w-full"
                  />
                </div>
                <div className="w-full">
                  <Select
                    value={r.packaging}
                    onValueChange={(v) => updateDownstreamTransportRow(r.id, { packaging: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
              <SelectContent>
                <SelectItem value="cardboard">Cardboard</SelectItem>
                <SelectItem value="plastic">Plastic</SelectItem>
                <SelectItem value="paper">Paper</SelectItem>
                <SelectItem value="wood">Wood</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 flex-1">
                    {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO2e` : '-'}
        </div>
                  <Button variant="ghost" className="text-red-600" onClick={() => removeDownstreamTransportRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
        </div>
                </div>
            );
          })}
              </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-gray-700 font-medium">
            Total Weight: <span className="font-semibold">{totalWeight.toFixed(2)} kg</span> | 
            Total Emissions: <span className="font-semibold">{totalEmissions.toFixed(2)} kg CO2e</span>
          </div>
          <Button onClick={() => toast({ title: 'Saved', description: 'Downstream transportation saved (frontend only for now).' })} disabled={downstreamTransportRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${downstreamTransportRows.length})`}
          </Button>
        </div>
      </div>
    );
  }

  // Processing of Sold Products
  if (activeCategory === 'processingSoldProducts') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Processing of Sold Products</h3>
            <p className="text-sm text-gray-600">Lifecycle data, transformations, and energy use</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('psp-lifecycle') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <Label htmlFor="psp-transform" className="flex items-center gap-1">Material Transformations <FieldTooltip content="Physical/chemical changes in products" /></Label>
            <Input id="psp-transform" placeholder="Describe transformations" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="psp-energy" className="flex items-center gap-1">Energy Consumption <FieldTooltip content="Energy used to process products" /></Label>
            <Input id="psp-energy" placeholder="e.g., kWh or fuel usage" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const transform = (document.getElementById('psp-transform') as any)?._value || (document.getElementById('psp-transform') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('psp-energy') as any)?._value || (document.getElementById('psp-energy') as HTMLInputElement)?.value || '';
            if (!transform || !energy) { toast({ title: 'Missing info', description: 'Enter transformations and energy.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `psp-${Date.now()}`, category: 'processing_sold_products', activity: `${transform}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['psp-transform','psp-energy'].forEach(id => { const el = document.getElementById(id) as any; if (!el) return; el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'processing_sold_products').length > 0 && (
          <div className="space-y-3">
            {emissionData.scope3.filter(r => r.category === 'processing_sold_products').map(row => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50">
                <div className="md:col-span-3">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="text-red-600" onClick={() => removeScope3Row(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'processing_sold_products');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Processing Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Processing of sold products saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // Use of Sold Products
  if (activeCategory === 'useOfSoldProducts') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Use of Sold Products</h3>
            <p className="text-sm text-gray-600">Usage specs and energy during use</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('usp-specs') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="usp-specs" className="flex items-center gap-1">Product Specifications <FieldTooltip content="Technical details of products" /></Label>
            <Input id="usp-specs" placeholder="Enter specifications" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="usp-usage" className="flex items-center gap-1">Expected Usage Patterns <FieldTooltip content="Typical usage scenario" /></Label>
            <Input id="usp-usage" placeholder="e.g., hours/day or cycles" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="usp-energy" className="flex items-center gap-1">Energy Consumption During Use <FieldTooltip content="Total lifetime energy consumed" /></Label>
            <Input id="usp-energy" placeholder="e.g., kWh/year" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const specs = (document.getElementById('usp-specs') as any)?._value || (document.getElementById('usp-specs') as HTMLInputElement)?.value || '';
            const usage = (document.getElementById('usp-usage') as any)?._value || (document.getElementById('usp-usage') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('usp-energy') as any)?._value || (document.getElementById('usp-energy') as HTMLInputElement)?.value || '';
            if (!specs || !usage || !energy) { toast({ title: 'Missing info', description: 'Enter product specs, usage patterns, and energy consumption.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `usp-${Date.now()}`, category: 'use_of_sold_products', activity: `${specs} | Usage: ${usage}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['usp-specs','usp-usage','usp-energy'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'use_of_sold_products').length > 0 && (
          <div className="space-y-3">
            {emissionData.scope3.filter(r => r.category === 'use_of_sold_products').map(row => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50">
                <div className="md:col-span-3">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="text-red-600" onClick={() => removeScope3Row(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'use_of_sold_products');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Use Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Use of sold products saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
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

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center">
          <Label className="text-gray-500">Material</Label>
          <Label className="text-gray-500">Volume (kg)</Label>
          <Label className="text-gray-500">Disposal Method</Label>
          <Label className="text-gray-500">Recycle (%)</Label>
          <Label className="text-gray-500">Composition</Label>
          <Label className="text-gray-500">Emissions</Label>
        </div>

        <div className="space-y-3">
          {endOfLifeRows.map((r) => {
            const material = wasteMaterials.find(m => m.id === r.materialId);
            const availableMethods = getAvailableDisposalMethods(material || null);
            return (
              <div key={r.id} className="grid grid-cols-1 md:grid-cols-6 gap-6 items-center p-4 rounded-lg bg-gray-50">
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
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 flex-1">
                    {r.emissions !== undefined ? `${r.emissions.toFixed(2)} kg CO2e` : '-'}
                </div>
                  <Button variant="ghost" className="text-red-600" onClick={() => removeEndOfLifeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          <Button onClick={() => toast({ title: 'Saved', description: 'End-of-life entries saved (frontend only for now).' })} disabled={endOfLifeRows.length === 0} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {`Save Changes (${endOfLifeRows.length})`}
          </Button>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Franchises</h3>
            <p className="text-sm text-gray-600">Franchise details, operations, and energy use</p>
          </div>
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => (document.getElementById('fr-details') as HTMLInputElement)?.focus()}>
            <Plus className="h-4 w-4 mr-2" /> Add New Entry
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label htmlFor="fr-details" className="flex items-center gap-1">Franchise Details <FieldTooltip content="Information about the franchise" /></Label>
            <Input id="fr-details" placeholder="Enter franchise info" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="fr-ops" className="flex items-center gap-1">Operational Practices <FieldTooltip content="Operational practices followed by the franchise" /></Label>
            <Input id="fr-ops" placeholder="Describe ops practices" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
          <div>
            <Label htmlFor="fr-energy" className="flex items-center gap-1">Energy Consumption <FieldTooltip content="Energy consumed in franchise operations" /></Label>
            <Input id="fr-energy" placeholder="e.g., kWh/year" onChange={(e) => (e.currentTarget as any)._value = e.target.value} />
          </div>
        </div>
        <div className="flex items-center justify-end mt-2">
          <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
            const details = (document.getElementById('fr-details') as any)?._value || (document.getElementById('fr-details') as HTMLInputElement)?.value || '';
            const ops = (document.getElementById('fr-ops') as any)?._value || (document.getElementById('fr-ops') as HTMLInputElement)?.value || '';
            const energy = (document.getElementById('fr-energy') as any)?._value || (document.getElementById('fr-energy') as HTMLInputElement)?.value || '';
            if (!details || !ops || !energy) { toast({ title: 'Missing info', description: 'Enter franchise details, operational practices, and energy consumption.' }); return; }
            setEmissionData(prev => ({ ...prev, scope3: [...prev.scope3, { id: `fr-${Date.now()}`, category: 'franchises', activity: `${details} | ${ops}`, unit: 'entry', quantity: 1, emissions: 0 }] }));
            ['fr-details','fr-ops','fr-energy'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value=''; });
          }}>Add Entry</Button>
        </div>
        {emissionData.scope3.filter(r => r.category === 'franchises').length > 0 && (
          <div className="space-y-3">
            {emissionData.scope3.filter(r => r.category === 'franchises').map(row => (
              <div key={row.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50">
                <div className="md:col-span-3">
                  <div className="text-sm font-medium text-gray-900">{row.activity}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="text-red-600" onClick={() => removeScope3Row(row.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="pt-4 border-t">
          {(() => {
            const rows = emissionData.scope3.filter(r => r.category === 'franchises');
            const totalPending = rows.length;
            return (
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">Total Franchise Entries: <span className="font-semibold">{totalPending}</span></div>
                <Button onClick={() => toast({ title: 'Saved', description: 'Franchise entries saved (frontend only for now).' })} disabled={totalPending === 0} className="bg-teal-600 hover:bg-teal-700 text-white"><Save className="h-4 w-4 mr-2" />{`Save Changes (${totalPending})`}</Button>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return null;
};

export default Scope3Section;



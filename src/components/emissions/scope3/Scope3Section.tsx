import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
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
  const [existingProcessingRows, setExistingProcessingRows] = useState<Array<ProcessingSoldProductsRow & { dbId?: string }>>([]);
  const [savingProcessing, setSavingProcessing] = useState(false);
  const [isInitialLoadProcessing, setIsInitialLoadProcessing] = useState(true);

  // Row-based state for Use of Sold Products
  const [useRows, setUseRows] = useState<UseOfSoldProductsRow[]>([]);
  const [existingUseRows, setExistingUseRows] = useState<Array<UseOfSoldProductsRow & { dbId?: string }>>([]);
  const [savingUse, setSavingUse] = useState(false);
  const [isInitialLoadUse, setIsInitialLoadUse] = useState(true);

  const newProcessingRow = (): ProcessingSoldProductsRow => ({
    id: `psp-${Date.now()}-${Math.random()}`,
    processingActivity: '',
    factorType: undefined,
    combustionType: undefined,
    stationaryMainFuelType: undefined,
    stationarySubFuelType: undefined,
    stationaryCo2Factor: undefined,
    stationaryUnit: undefined,
    mobileFuelType: undefined,
    mobileKgCo2PerUnit: undefined,
    mobileUnit: undefined,
    heatSteamType: undefined,
    heatSteamKgCo2e: undefined,
    heatSteamUnit: undefined,
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
    combustionType: undefined,
    stationaryMainFuelType: undefined,
    stationarySubFuelType: undefined,
    stationaryCo2Factor: undefined,
    stationaryUnit: undefined,
    mobileFuelType: undefined,
    mobileKgCo2PerUnit: undefined,
    mobileUnit: undefined,
    stationaryQuantity: undefined,
    mobileQuantity: undefined,
    hybridFuelType: undefined,
    hybridFuel: undefined,
    hybridFuelUnit: undefined,
    hybridFuelQuantity: undefined,
    hybridFuelFactor: undefined,
    hybridFuelEmissions: undefined,
    hybridTotalKwh: undefined,
    hybridGridPct: undefined,
    hybridRenewablePct: undefined,
    hybridOtherPct: undefined,
    hybridGridCountry: undefined,
    hybridOtherSources: [],
    electricityTotalKwh: undefined,
    electricityGridPct: undefined,
    electricityRenewablePct: undefined,
    electricityOtherPct: undefined,
    electricityGridCountry: undefined,
    electricityOtherSources: [],
    refrigerantType: undefined,
    refrigerantFactor: undefined,
    coolingRefrigerantQuantity: undefined,
    gasMachineryFuelType: undefined,
    gasMachineryFuel: undefined,
    gasMachineryUnit: undefined,
    gasMachineryQuantity: undefined,
    gasMachineryFactor: undefined,
  });

  // Reset state when switching away from downstream products
  useEffect(() => {
    if (activeCategory !== 'processingUseOfSoldProducts') {
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
  
  // Combustion tables data
  const [stationaryCombustionData, setStationaryCombustionData] = useState<Array<{
    id: string | number;
    'Main Fuel Type': string;
    'Sub Fuel Type': string;
    'CO2 Factor': number;
    'Units': string;
  }>>([]);
  const [mobileCombustionData, setMobileCombustionData] = useState<Array<{
    id: string | number;
    'FuelType': string;
    'kg CO2 per unit': number;
    'Unit': string;
  }>>([]);
  
  // Heat and Steam data
  const [heatSteamData, setHeatSteamData] = useState<Array<{
    id: string | number;
    'Type': string;
    'Unit': string;
    'kg CO₂e': number;
  }>>([]);
  
  // Load combustion tables data
  useEffect(() => {
    const loadCombustionData = async () => {
      if (activeCategory !== 'processingUseOfSoldProducts') return;
      
      try {
        // Try different possible table names
        let stationaryData: any = null;
        let stationaryError: any = null;
        
        // Try with space first (most likely based on user's image)
        let result = await supabase
          .from('Stationary Combustion' as any)
          .select('*', { count: 'exact' });
        
        console.log('Query result for "Stationary Combustion":', {
          data: result.data,
          error: result.error,
          count: result.count,
          status: result.status,
          statusText: result.statusText
        });
        
        // If we get a count but no data, that's strange
        if (result.count !== null && result.count > 0 && (!result.data || result.data.length === 0)) {
          console.error('INCONSISTENCY: Count says', result.count, 'rows but data array is empty!');
        }
        
        if (result.error) {
          console.log('Tried "Stationary Combustion", got error:', result.error);
          // Try with quotes around table name
          result = await supabase
            .from('"Stationary Combustion"' as any)
            .select('*', { count: 'exact' });
          
          if (result.error) {
            console.log('Tried quoted "Stationary Combustion", got error:', result.error);
            // Try with underscore
            result = await supabase
              .from('stationary_combustion' as any)
              .select('*', { count: 'exact' });
            
            if (result.error) {
              console.log('Tried "stationary_combustion", got error:', result.error);
              // Try camelCase
              result = await supabase
                .from('StationaryCombustion' as any)
                .select('*', { count: 'exact' });
            }
          }
        }
        
        stationaryData = result.data;
        stationaryError = result.error;
        
        // If no error but no data, check if it's an RLS issue
        if (!stationaryError && (!stationaryData || stationaryData.length === 0)) {
          console.warn('Query succeeded but returned 0 rows. Possible causes:');
          console.warn('1. Table is empty - add some test data');
          console.warn('2. RLS policies are blocking access - check Supabase RLS settings');
          console.warn('3. Table name might be in a different schema');
          
          // Try a count query to see if RLS is the issue
          const countResult = await supabase
            .from('Stationary Combustion' as any)
            .select('*', { count: 'exact', head: true });
          
          console.log('Count query result:', countResult);
          if (countResult.count !== null && countResult.count > 0) {
            console.error('RLS ISSUE DETECTED: Table has', countResult.count, 'rows but SELECT returns 0. RLS policies are blocking access!');
            toast({
              title: "RLS Policy Issue",
              description: `Table has ${countResult.count} rows but RLS is blocking access. Please check Supabase RLS policies for "Stationary Combustion" table.`,
              variant: "destructive",
            });
          } else if (countResult.count === 0) {
            console.warn('Table is empty - no rows found');
            toast({
              title: "Empty Table",
              description: "The Stationary Combustion table is empty. Please add data to the table.",
              variant: "default",
            });
          }
        }
        
        if (stationaryError) {
          console.error('Stationary Combustion error:', stationaryError);
          console.error('Error details:', JSON.stringify(stationaryError, null, 2));
          // Don't throw, just log - might be RLS or empty table
          toast({
            title: "Warning",
            description: `Could not load Stationary Combustion data: ${stationaryError.message || 'Unknown error'}. Check if table has data and RLS policies.`,
            variant: "destructive",
          });
        }
        
        console.log('Stationary Combustion data received:', stationaryData);
        console.log('Number of rows:', stationaryData?.length);
        console.log('First row sample:', stationaryData?.[0]);
        if (stationaryData?.[0]) {
          console.log('Available keys in first row:', Object.keys(stationaryData[0]));
          console.log('First row values:', stationaryData[0]);
        } else {
          console.warn('No data returned from Stationary Combustion table. Check:');
          console.warn('1. Does the table have any rows?');
          console.warn('2. Are RLS policies blocking access?');
          console.warn('3. Is the table name correct?');
        }
        
        // Handle different possible column name formats
        // Note: Column name is "Sub FuelType" (no space) according to Supabase
        const formattedStationary = (stationaryData || []).map((row: any) => {
          // Try all possible column name variations
          const mainFuelType = row['Main Fuel Type'] || row['main fuel type'] || row.main_fuel_type || row['main_fuel_type'] || row['MainFuelType'] || row.mainFuelType;
          // Note: Supabase shows "Sub FuelType" (no space between Sub and FuelType)
          const subFuelType = row['Sub FuelType'] || row['Sub Fuel Type'] || row['sub fueltype'] || row['sub fuel type'] || row.sub_fuel_type || row['sub_fuel_type'] || row['SubFuelType'] || row.subFuelType;
          const co2Factor = row['CO2 Factor'] || row['co2 factor'] || row.co2_factor || row['co2_factor'] || row['CO2Factor'] || row.co2Factor;
          const units = row['Units'] || row['units'] || row.units || row['units'] || row.unit || row['unit'] || row.Unit;
          
          return {
            id: row.id || row.ID || row.Id,
            'Main Fuel Type': mainFuelType,
            'Sub Fuel Type': subFuelType, // We'll use this as the key internally
            'CO2 Factor': typeof co2Factor === 'number' ? co2Factor : parseFloat(co2Factor) || 0,
            'Units': units,
          };
        }).filter(row => row['Main Fuel Type']); // Filter out rows without main fuel type
        
        console.log('Formatted Stationary data:', formattedStationary);
        console.log('Unique Main Fuel Types:', Array.from(new Set(formattedStationary.map(d => d['Main Fuel Type']))));
        setStationaryCombustionData(formattedStationary as Array<{
          id: string | number;
          'Main Fuel Type': string;
          'Sub Fuel Type': string;
          'CO2 Factor': number;
          'Units': string;
        }>);
        
        // Load Mobile Combustion table (table name: "Mobile Combustion")
        let mobileResult = await supabase
          .from('Mobile Combustion' as any)
          .select('*', { count: 'exact' });
        
        console.log('Query result for "Mobile Combustion":', {
          data: mobileResult.data,
          error: mobileResult.error,
          count: mobileResult.count,
          status: mobileResult.status,
          statusText: mobileResult.statusText
        });
        
        // If we get a count but no data, that's strange
        if (mobileResult.count !== null && mobileResult.count > 0 && (!mobileResult.data || mobileResult.data.length === 0)) {
          console.error('INCONSISTENCY: Count says', mobileResult.count, 'rows but data array is empty!');
        }
        
        if (mobileResult.error) {
          console.log('Tried "Mobile Combustion", got error:', mobileResult.error);
          // Try with quotes around table name
          mobileResult = await supabase
            .from('"Mobile Combustion"' as any)
            .select('*', { count: 'exact' });
          
          if (mobileResult.error) {
            console.log('Tried quoted "Mobile Combustion", got error:', mobileResult.error);
            // Try with underscore
            mobileResult = await supabase
              .from('mobile_combustion' as any)
              .select('*', { count: 'exact' });
            
            if (mobileResult.error) {
              console.log('Tried "mobile_combustion", got error:', mobileResult.error);
              // Try camelCase
              mobileResult = await supabase
                .from('MobileCombustion' as any)
                .select('*', { count: 'exact' });
            }
          }
        }
        
        const mobileData = mobileResult.data;
        const mobileError = mobileResult.error;
        
        // If no error but no data, check what's happening
        if (!mobileError && (!mobileData || mobileData.length === 0)) {
          console.warn('Query succeeded but returned 0 rows.');
          console.warn('Count from query:', mobileResult.count);
          
          if (mobileResult.count === 0) {
            console.warn('Table is empty - no rows found in "Mobile Combustion" table');
            toast({
              title: "Empty Table",
              description: "The Mobile Combustion table is empty. Please add at least one row with data in Supabase.",
              variant: "default",
            });
          } else if (mobileResult.count !== null && mobileResult.count > 0) {
            console.error('INCONSISTENCY: Count says', mobileResult.count, 'rows exist but data array is empty!');
            toast({
              title: "Data Access Issue",
              description: `Table has ${mobileResult.count} rows but cannot retrieve them. Check table permissions.`,
              variant: "destructive",
            });
          } else {
            console.warn('Count is null - unable to determine row count');
          }
        }
        
        if (mobileError) {
          console.error('Mobile Combustion error:', mobileError);
          console.error('Error details:', JSON.stringify(mobileError, null, 2));
          toast({
            title: "Warning",
            description: `Could not load Mobile Combustion data: ${mobileError.message || 'Unknown error'}. Check if table has data and RLS policies.`,
            variant: "destructive",
          });
        }
        
        console.log('Mobile Combustion data received:', mobileData);
        console.log('Number of rows:', mobileData?.length);
        console.log('First row sample:', mobileData?.[0]);
        if (mobileData?.[0]) {
          console.log('Available keys in first row:', Object.keys(mobileData[0]));
          console.log('First row values:', mobileData[0]);
        } else {
          console.warn('No data returned from Mobile Combustion table. Check:');
          console.warn('1. Does the table have any rows?');
          console.warn('2. Are RLS policies blocking access?');
          console.warn('3. Is the table name correct?');
        }
        
        // Handle different possible column name formats
        // Actual column names from Supabase: "Fuel Type" (with space), "kg CO2 per unit", "Unit"
        const formattedMobile = (mobileData || []).map((row: any) => {
          // Try all possible column name variations - note: actual is "Fuel Type" with space (check this first!)
          const fuelType = row['Fuel Type'] || row['FuelType'] || row.fuel_type || row['fuel_type'] || row.fuelType || row['fuelType'];
          const kgCo2PerUnit = row['kg CO2 per unit'] || row['kg co2 per unit'] || row.kg_co2_per_unit || row['kg_co2_per_unit'] || row.kgCo2PerUnit;
          const unit = row['Unit'] || row.unit || row['unit'] || row.Unit;
          
          console.log('Processing row:', { fuelType, kgCo2PerUnit, unit, rawRow: row });
          
          return {
            id: row.id || row.ID || row.Id,
            'FuelType': fuelType, // We'll use FuelType as the key internally for consistency
            'kg CO2 per unit': typeof kgCo2PerUnit === 'number' ? kgCo2PerUnit : parseFloat(kgCo2PerUnit) || 0,
            'Unit': unit,
          };
        }).filter(row => row['FuelType'] && row['FuelType'].trim() !== ''); // Filter out rows without fuel type
        
        console.log('Formatted Mobile data:', formattedMobile);
        console.log('Unique Fuel Types:', Array.from(new Set(formattedMobile.map(d => d['FuelType']))));
        setMobileCombustionData(formattedMobile as Array<{
          id: string | number;
          'FuelType': string;
          'kg CO2 per unit': number;
          'Unit': string;
        }>);
      } catch (error: any) {
        console.error('Error loading combustion data:', error);
        toast({
          title: "Error",
          description: `Failed to load combustion data: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
      }
    };
    
    loadCombustionData();
  }, [activeCategory, toast]);
  
  // Load Heat and Steam data
  useEffect(() => {
    const loadHeatSteamData = async () => {
      if (activeCategory !== 'processingUseOfSoldProducts') return;
      
      try {
        const { data: heatSteamData, error: heatSteamError } = await supabase
          .from('heat and steam' as any)
          .select('*', { count: 'exact' });
        
        console.log('Query result for "heat and steam":', {
          data: heatSteamData,
          error: heatSteamError,
          count: heatSteamData?.length
        });
        
        if (heatSteamError) {
          console.error('Heat and Steam error:', heatSteamError);
          toast({
            title: "Warning",
            description: `Could not load Heat and Steam data: ${heatSteamError.message || 'Unknown error'}`,
            variant: "destructive",
          });
        }
        
        if (heatSteamData && heatSteamData.length > 0) {
          console.log('Heat and Steam data received:', heatSteamData);
          console.log('First row sample:', heatSteamData[0]);
          console.log('Available keys in first row:', Object.keys(heatSteamData[0]));
          
          // Format the data - handle different possible column name formats
          const formatted = heatSteamData.map((row: any) => ({
            id: row.id || row.ID || row.Id,
            'Type': row['Type'] || row.type || row['type'],
            'Unit': row['Unit'] || row.unit || row['unit'],
            'kg CO₂e': typeof row['kg CO₂e'] === 'number' ? row['kg CO₂e'] : parseFloat(row['kg CO₂e'] || row['kg CO2e'] || row.kg_co2e || 0),
          }));
          
          console.log('Formatted Heat and Steam data:', formatted);
          setHeatSteamData(formatted as Array<{
            id: string | number;
            'Type': string;
            'Unit': string;
            'kg CO₂e': number;
          }>);
        } else {
          console.warn('No Heat and Steam data found');
        }
      } catch (error: any) {
        console.error('Error loading heat and steam data:', error);
        toast({
          title: "Error",
          description: "Failed to load heat and steam data",
          variant: "destructive",
        });
      }
    };
    
    loadHeatSteamData();
  }, [activeCategory, toast]);
  
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

  // Load Processing of Sold Products
  useEffect(() => {
    const loadProcessing = async () => {
      if (activeCategory !== 'processingUseOfSoldProducts' || productType !== 'intermediate' || !user) {
        setIsInitialLoadProcessing(false);
        return;
      }

      setIsInitialLoadProcessing(true);
      try {
        let query = supabase
          .from('scope3_processing_sold_products' as any)
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await (query as any).order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry: any) => {
          // Reconstruct row from database entry, using row_data if available
          const rowData = entry.row_data || {};
          return {
            id: crypto.randomUUID(),
            dbId: entry.id,
            processingActivity: entry.processing_activity || rowData.processingActivity || '',
            factorType: entry.factor_type || rowData.factorType,
            combustionType: entry.combustion_type || rowData.combustionType,
            stationaryMainFuelType: entry.stationary_main_fuel_type || rowData.stationaryMainFuelType,
            stationarySubFuelType: entry.stationary_sub_fuel_type || rowData.stationarySubFuelType,
            stationaryCo2Factor: entry.stationary_co2_factor || rowData.stationaryCo2Factor,
            stationaryUnit: entry.stationary_unit || rowData.stationaryUnit,
            mobileFuelType: entry.mobile_fuel_type || rowData.mobileFuelType,
            mobileKgCo2PerUnit: entry.mobile_kg_co2_per_unit || rowData.mobileKgCo2PerUnit,
            mobileUnit: entry.mobile_unit || rowData.mobileUnit,
            heatSteamType: entry.heat_steam_type || rowData.heatSteamType,
            heatSteamKgCo2e: entry.heat_steam_kg_co2e || rowData.heatSteamKgCo2e,
            heatSteamUnit: entry.heat_steam_unit || rowData.heatSteamUnit,
            type: entry.fuel_type || rowData.type,
            fuel: entry.fuel || rowData.fuel,
            unit: entry.fuel_unit || rowData.unit,
            quantity: entry.fuel_quantity || entry.quantity || rowData.quantity,
            factor: entry.fuel_factor || rowData.factor,
            emissions: entry.emissions || rowData.emissions,
            totalKwh: entry.total_kwh || rowData.totalKwh,
            gridPct: entry.grid_pct || rowData.gridPct,
            renewablePct: entry.renewable_pct || rowData.renewablePct,
            otherPct: entry.other_pct || rowData.otherPct,
            gridCountry: entry.grid_country || rowData.gridCountry,
            otherSources: entry.other_sources || rowData.otherSources || [],
          } as ProcessingSoldProductsRow & { dbId: string };
        });

        setExistingProcessingRows(loadedRows);
        setProcessingRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading processing of sold products:', error);
        toast({ title: "Error", description: "Failed to load processing entries", variant: "destructive" });
      } finally {
        setIsInitialLoadProcessing(false);
      }
    };

    loadProcessing();
  }, [user, activeCategory, productType, companyContext, counterpartyId, toast]);

  // Load Use of Sold Products
  useEffect(() => {
    const loadUse = async () => {
      if (activeCategory !== 'processingUseOfSoldProducts' || productType !== 'final' || !user) {
        setIsInitialLoadUse(false);
        return;
      }

      setIsInitialLoadUse(true);
      try {
        let query = supabase
          .from('scope3_use_of_sold_products' as any)
          .select('*')
          .eq('user_id', user.id);

        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          query = query.is('counterparty_id', null);
        }

        const { data, error } = await (query as any).order('created_at', { ascending: false });

        if (error) throw error;

        const loadedRows = (data || []).map((entry: any) => {
          // Reconstruct row from database entry, using row_data if available
          const rowData = entry.row_data || {};
          return {
            id: crypto.randomUUID(),
            dbId: entry.id,
            processingActivity: entry.processing_activity || rowData.processingActivity || '',
            energyConsumption: entry.energy_consumption || rowData.energyConsumption || '',
            quantity: entry.quantity || rowData.quantity,
            emissions: entry.emissions || rowData.emissions,
            combustionType: entry.combustion_type || rowData.combustionType,
            stationaryMainFuelType: entry.stationary_main_fuel_type || rowData.stationaryMainFuelType,
            stationarySubFuelType: entry.stationary_sub_fuel_type || rowData.stationarySubFuelType,
            stationaryCo2Factor: entry.stationary_co2_factor || rowData.stationaryCo2Factor,
            stationaryUnit: entry.stationary_unit || rowData.stationaryUnit,
            stationaryQuantity: entry.stationary_quantity || rowData.stationaryQuantity,
            mobileFuelType: entry.mobile_fuel_type || rowData.mobileFuelType,
            mobileKgCo2PerUnit: entry.mobile_kg_co2_per_unit || rowData.mobileKgCo2PerUnit,
            mobileUnit: entry.mobile_unit || rowData.mobileUnit,
            mobileQuantity: entry.mobile_quantity || rowData.mobileQuantity,
            hybridFuelType: entry.hybrid_fuel_type || rowData.hybridFuelType,
            hybridFuel: entry.hybrid_fuel || rowData.hybridFuel,
            hybridFuelUnit: entry.hybrid_fuel_unit || rowData.hybridFuelUnit,
            hybridFuelQuantity: entry.hybrid_fuel_quantity || rowData.hybridFuelQuantity,
            hybridFuelFactor: entry.hybrid_fuel_factor || rowData.hybridFuelFactor,
            hybridFuelEmissions: entry.hybrid_fuel_emissions || rowData.hybridFuelEmissions,
            hybridTotalKwh: entry.hybrid_total_kwh || rowData.hybridTotalKwh,
            hybridGridPct: entry.hybrid_grid_pct || rowData.hybridGridPct,
            hybridRenewablePct: entry.hybrid_renewable_pct || rowData.hybridRenewablePct,
            hybridOtherPct: entry.hybrid_other_pct || rowData.hybridOtherPct,
            hybridGridCountry: entry.hybrid_grid_country || rowData.hybridGridCountry,
            hybridOtherSources: entry.hybrid_other_sources || rowData.hybridOtherSources || [],
            electricityTotalKwh: entry.electricity_total_kwh || rowData.electricityTotalKwh,
            electricityGridPct: entry.electricity_grid_pct || rowData.electricityGridPct,
            electricityRenewablePct: entry.electricity_renewable_pct || rowData.electricityRenewablePct,
            electricityOtherPct: entry.electricity_other_pct || rowData.electricityOtherPct,
            electricityGridCountry: entry.electricity_grid_country || rowData.electricityGridCountry,
            electricityOtherSources: entry.electricity_other_sources || rowData.electricityOtherSources || [],
            refrigerantType: entry.refrigerant_type || rowData.refrigerantType,
            refrigerantFactor: entry.refrigerant_factor || rowData.refrigerantFactor,
            coolingRefrigerantQuantity: entry.cooling_refrigerant_quantity || rowData.coolingRefrigerantQuantity,
            gasMachineryFuelType: entry.gas_machinery_fuel_type || rowData.gasMachineryFuelType,
            gasMachineryFuel: entry.gas_machinery_fuel || rowData.gasMachineryFuel,
            gasMachineryUnit: entry.gas_machinery_unit || rowData.gasMachineryUnit,
            gasMachineryQuantity: entry.gas_machinery_quantity || rowData.gasMachineryQuantity,
            gasMachineryFactor: entry.gas_machinery_factor || rowData.gasMachineryFactor,
          } as UseOfSoldProductsRow & { dbId: string };
        });

        setExistingUseRows(loadedRows);
        setUseRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error('Error loading use of sold products:', error);
        toast({ title: "Error", description: "Failed to load use entries", variant: "destructive" });
      } finally {
        setIsInitialLoadUse(false);
      }
    };

    loadUse();
  }, [user, activeCategory, productType, companyContext, counterpartyId, toast]);

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
  if (activeCategory === 'processingUseOfSoldProducts') {
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

        let fuelEmissions: number | undefined;

        // --- Combustion emissions (for Heating, melting, smelting) ---
        if (next.processingActivity === 'Heating, melting, smelting') {
          if (next.combustionType === 'stationary') {
            // Use Stationary Combustion data
            next.stationaryCo2Factor = next.stationaryCo2Factor || undefined;
            if (typeof next.quantity === 'number' && typeof next.stationaryCo2Factor === 'number') {
              fuelEmissions = next.quantity * next.stationaryCo2Factor;
            }
          } else if (next.combustionType === 'mobile') {
            // Use Mobile Combustion data
            next.mobileKgCo2PerUnit = next.mobileKgCo2PerUnit || undefined;
            if (typeof next.quantity === 'number' && typeof next.mobileKgCo2PerUnit === 'number') {
              fuelEmissions = next.quantity * next.mobileKgCo2PerUnit;
            }
          }
        } else if (next.processingActivity === 'Drying / Curing / Kilns') {
          // --- Heat and Steam emissions (for Drying / Curing / Kilns) ---
          next.heatSteamKgCo2e = next.heatSteamKgCo2e || undefined;
          if (typeof next.quantity === 'number' && typeof next.heatSteamKgCo2e === 'number') {
            fuelEmissions = next.quantity * next.heatSteamKgCo2e;
          }
        } else {
          // --- Regular Fuel emissions (for other activities) ---
        if (next.type && next.fuel && next.unit) {
          const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
          next.factor = typeof factor === 'number' ? factor : undefined;
        } else {
          next.factor = undefined;
        }

        if (typeof next.quantity === 'number' && typeof next.factor === 'number') {
          fuelEmissions = next.quantity * next.factor;
          }
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

        // Check for combustion emissions (Heating, melting, smelting)
        const hasCombustion = r.processingActivity === 'Heating, melting, smelting' && 
          r.combustionType && 
          typeof r.quantity === "number" && r.quantity > 0 &&
          ((r.combustionType === 'stationary' && r.stationaryCo2Factor !== undefined) ||
           (r.combustionType === 'mobile' && r.mobileKgCo2PerUnit !== undefined));
        
        // Check for heat and steam emissions (Drying / Curing / Kilns)
        const hasHeatSteam = r.processingActivity === 'Drying / Curing / Kilns' &&
          r.heatSteamType &&
          typeof r.quantity === "number" && r.quantity > 0 &&
          r.heatSteamKgCo2e !== undefined;
        
        // Check for regular fuel emissions
        const hasFuel =
          !!r.type && !!r.fuel && !!r.unit && typeof r.quantity === "number" && r.quantity > 0;
        
        // Check for electricity
        const hasElectricity = typeof r.totalKwh === "number" && r.totalKwh > 0;

        if (!hasCombustion && !hasHeatSteam && !hasFuel && !hasElectricity) return null;

        // Determine unit and quantity based on what's available
        let unit = "entry";
        let quantity = 1;
        
        if (hasCombustion) {
          if (r.combustionType === 'stationary') {
            unit = r.stationaryUnit || "entry";
            quantity = r.quantity || 1;
          } else if (r.combustionType === 'mobile') {
            unit = r.mobileUnit || "entry";
            quantity = r.quantity || 1;
          }
        } else if (hasHeatSteam) {
          unit = r.heatSteamUnit || "kWh";
          quantity = r.quantity || 1;
        } else if (hasFuel) {
          unit = r.unit || "entry";
          quantity = r.quantity || 1;
        } else if (hasElectricity) {
          unit = "kWh";
          quantity = r.totalKwh || 1;
        }

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
      mapRowToEntry: (r) => {
        if (!r.processingActivity) return null;

        // Check for combustion emissions (Internal combustion engine vehicles)
        const hasCombustion = r.processingActivity === 'Internal combustion engine vehicles (cars, trucks, bikes)' && 
          ((typeof r.stationaryQuantity === "number" && r.stationaryQuantity > 0 && r.stationaryCo2Factor !== undefined) ||
           (typeof r.mobileQuantity === "number" && r.mobileQuantity > 0 && r.mobileKgCo2PerUnit !== undefined));

        // Check for hybrid vehicle emissions (fuel or electricity)
        const hasHybridFuel = r.processingActivity === 'Hybrid vehicles' &&
          r.hybridFuelType && r.hybridFuel && r.hybridFuelUnit &&
          typeof r.hybridFuelQuantity === "number" && r.hybridFuelQuantity > 0 &&
          r.hybridFuelFactor !== undefined;
        
        const hasHybridElectricity = r.processingActivity === 'Hybrid vehicles' &&
          typeof r.hybridTotalKwh === "number" && r.hybridTotalKwh > 0;

        // For other activities, require energyConsumption
        const hasOtherData = r.energyConsumption && r.energyConsumption.trim() !== '';

        if (!hasCombustion && !hasHybridFuel && !hasHybridElectricity && !hasOtherData) return null;

        // Determine unit and quantity based on what's available
        let unit = "entry";
        let quantity = 1;
        
        if (hasCombustion) {
          if (typeof r.stationaryQuantity === "number" && r.stationaryQuantity > 0) {
            unit = r.stationaryUnit || "entry";
            quantity = r.stationaryQuantity || 1;
          } else if (typeof r.mobileQuantity === "number" && r.mobileQuantity > 0) {
            unit = r.mobileUnit || "entry";
            quantity = r.mobileQuantity || 1;
          }
        } else if (hasHybridFuel) {
          unit = r.hybridFuelUnit || "entry";
          quantity = r.hybridFuelQuantity || 1;
        } else if (hasHybridElectricity) {
          unit = "kWh";
          quantity = r.hybridTotalKwh || 1;
        } else {
          unit = "entry";
          quantity = r.quantity || 1;
        }

        return {
            id: r.id,
              category: "use_of_sold_products",
            activity: r.processingActivity,
          unit,
          quantity,
            emissions: r.emissions || 0,
        };
      },
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
                className="group relative p-8 rounded-xl border-2 border-gray-200 hover:border-teal-500 bg-white hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
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
                className="group relative p-8 rounded-xl border-2 border-gray-200 hover:border-teal-500 bg-white hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
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
      // Save Processing function (local to this block)
      const saveProcessingLocal = async () => {
        if (!user) {
          toast({ title: "Sign in required", description: "Please sign in to save entries", variant: "destructive" });
          return;
        }

        setSavingProcessing(true);
        try {
          // Identify new and changed entries
          const newEntries = processingRows.filter(r => !existingProcessingRows.find(e => e.id === r.id));
          const changedExisting = processingRows.filter(r => {
            const existing = existingProcessingRows.find(e => e.id === r.id);
            return existing && existing.dbId && JSON.stringify(existing) !== JSON.stringify(r);
          });
          const deletedIds = existingProcessingRows
            .filter(e => !processingRows.find(r => r.id === e.id))
            .map(e => e.dbId)
            .filter((id): id is string => !!id);

          // Delete removed entries
          if (deletedIds.length > 0) {
            const { error } = await supabase
              .from('scope3_processing_sold_products' as any)
              .delete()
              .in('id', deletedIds);
            if (error) throw error;
          }

          // Insert new entries
          if (newEntries.length > 0) {
            const payload = newEntries.map(r => ({
              user_id: user.id,
              counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
              processing_activity: r.processingActivity,
              factor_type: r.factorType,
              combustion_type: r.combustionType,
              stationary_main_fuel_type: r.stationaryMainFuelType,
              stationary_sub_fuel_type: r.stationarySubFuelType,
              stationary_co2_factor: r.stationaryCo2Factor,
              stationary_unit: r.stationaryUnit,
              mobile_fuel_type: r.mobileFuelType,
              mobile_kg_co2_per_unit: r.mobileKgCo2PerUnit,
              mobile_unit: r.mobileUnit,
              heat_steam_type: r.heatSteamType,
              heat_steam_kg_co2e: r.heatSteamKgCo2e,
              heat_steam_unit: r.heatSteamUnit,
              fuel_type: r.type,
              fuel: r.fuel,
              fuel_unit: r.unit,
              fuel_quantity: r.quantity,
              fuel_factor: r.factor,
              total_kwh: r.totalKwh,
              grid_pct: r.gridPct,
              renewable_pct: r.renewablePct,
              other_pct: r.otherPct,
              grid_country: r.gridCountry,
              other_sources: r.otherSources || [],
              quantity: r.quantity,
              emissions: r.emissions || 0,
              row_data: r, // Store full row data as JSONB
            }));

            const { data, error } = await supabase.from('scope3_processing_sold_products' as any).insert(payload).select('id');
            if (error) throw error;

            // Update existing rows with new dbIds
            const updatedRows = processingRows.map(r => {
              const newEntryIndex = newEntries.findIndex(ne => ne.id === r.id);
              if (newEntryIndex >= 0 && data && data[newEntryIndex] && (data[newEntryIndex] as any).id) {
                return { ...r, dbId: (data[newEntryIndex] as any).id };
              }
              return r;
            });
            setExistingProcessingRows(updatedRows as Array<ProcessingSoldProductsRow & { dbId?: string }>);
          }

          // Update changed entries
          if (changedExisting.length > 0) {
            const updates = changedExisting.map(r => {
              const existing = existingProcessingRows.find(e => e.id === r.id);
              return supabase
                .from('scope3_processing_sold_products' as any)
                .update({
                  processing_activity: r.processingActivity,
                  factor_type: r.factorType,
                  combustion_type: r.combustionType,
                  stationary_main_fuel_type: r.stationaryMainFuelType,
                  stationary_sub_fuel_type: r.stationarySubFuelType,
                  stationary_co2_factor: r.stationaryCo2Factor,
                  stationary_unit: r.stationaryUnit,
                  mobile_fuel_type: r.mobileFuelType,
                  mobile_kg_co2_per_unit: r.mobileKgCo2PerUnit,
                  mobile_unit: r.mobileUnit,
                  heat_steam_type: r.heatSteamType,
                  heat_steam_kg_co2e: r.heatSteamKgCo2e,
                  heat_steam_unit: r.heatSteamUnit,
                  fuel_type: r.type,
                  fuel: r.fuel,
                  fuel_unit: r.unit,
                  fuel_quantity: r.quantity,
                  fuel_factor: r.factor,
                  total_kwh: r.totalKwh,
                  grid_pct: r.gridPct,
                  renewable_pct: r.renewablePct,
                  other_pct: r.otherPct,
                  grid_country: r.gridCountry,
                  other_sources: r.otherSources || [],
                  quantity: r.quantity,
                  emissions: r.emissions || 0,
                  row_data: r, // Store full row data as JSONB
                })
                .eq('id', existing!.dbId!);
            });
            const results = await Promise.all(updates);
            const updateError = results.find(r => (r as any).error)?.error;
            if (updateError) throw updateError;
          }

          toast({ title: "Saved", description: "Processing of sold products saved successfully." });
          onSaveAndNext?.();
        } catch (e: any) {
          toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
        } finally {
          setSavingProcessing(false);
        }
      };

      const totalEmissions = processingRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
      
      return (
        <div className={`space-y-6 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToSelection}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </Button>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Processing of Sold Products</h3>
                <p className="text-sm text-gray-600 mt-1">Lifecycle data, transformations, and energy use</p>
              </div>
            </div>
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 text-white" 
              onClick={() => setProcessingRows(prev => [...prev, newProcessingRow()])}
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Entry
            </Button>
          </div>

          {/* Entries Section */}
          <div className="space-y-4">
            {processingRows.map((row, index) => (
              <Card 
                key={row.id} 
                className="overflow-hidden border-gray-200 hover:border-teal-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <CardContent className="p-6">
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
                          'Material forming (molding, extrusion)',
                          'Textile processing (dyeing, washing)',
                        ];

                        const shouldKeepElectricity = electricityAllowedActivities.includes(value);
                        const isHeatingMelting = value === 'Heating, melting, smelting';
                        const isDryingCuringKilns = value === 'Drying / Curing / Kilns';

                        updateProcessingRow(row.id, {
                          processingActivity: value,
                          // Clear combustion fields if not Heating, melting, smelting
                          combustionType: isHeatingMelting ? row.combustionType : undefined,
                          stationaryMainFuelType: isHeatingMelting ? row.stationaryMainFuelType : undefined,
                          stationarySubFuelType: isHeatingMelting ? row.stationarySubFuelType : undefined,
                          stationaryCo2Factor: isHeatingMelting ? row.stationaryCo2Factor : undefined,
                          stationaryUnit: isHeatingMelting ? row.stationaryUnit : undefined,
                          mobileFuelType: isHeatingMelting ? row.mobileFuelType : undefined,
                          mobileKgCo2PerUnit: isHeatingMelting ? row.mobileKgCo2PerUnit : undefined,
                          mobileUnit: isHeatingMelting ? row.mobileUnit : undefined,
                          // Clear heat and steam fields if not Drying / Curing / Kilns
                          heatSteamType: isDryingCuringKilns ? row.heatSteamType : undefined,
                          heatSteamKgCo2e: isDryingCuringKilns ? row.heatSteamKgCo2e : undefined,
                          heatSteamUnit: isDryingCuringKilns ? row.heatSteamUnit : undefined,
                          // Clear regular fuel fields if Heating, melting, smelting or Drying / Curing / Kilns (uses special tables instead)
                          type: (isHeatingMelting || isDryingCuringKilns) ? undefined : undefined,
                          fuel: (isHeatingMelting || isDryingCuringKilns) ? undefined : undefined,
                          unit: (isHeatingMelting || isDryingCuringKilns) ? undefined : undefined,
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

                {/* Combustion Type Selection for Heating, melting, smelting */}
                {row.processingActivity === 'Heating, melting, smelting' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Combustion Type</h4>
                    <div className="mb-4">
                      <Label className="flex items-center gap-1 mb-2">
                        Select Combustion Type <FieldTooltip content="Choose between Stationary or Mobile Combustion" />
                      </Label>
                      <Select 
                        value={row.combustionType || ''} 
                        onValueChange={(value) => {
                          updateProcessingRow(row.id, { 
                            combustionType: value as 'stationary' | 'mobile',
                            // Clear all combustion-related fields
                            stationaryMainFuelType: undefined,
                            stationarySubFuelType: undefined,
                            stationaryCo2Factor: undefined,
                            stationaryUnit: undefined,
                            mobileFuelType: undefined,
                            mobileKgCo2PerUnit: undefined,
                            mobileUnit: undefined,
                            quantity: undefined,
                            emissions: undefined,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select combustion type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stationary">Stationary Combustion</SelectItem>
                          <SelectItem value="mobile">Mobile Combustion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stationary Combustion Fields */}
                    {row.combustionType === 'stationary' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Stationary Combustion Details</h5>
                        {/* Debug info - remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-100 rounded">
                            Data loaded: {stationaryCombustionData.length} rows | 
                            Main Fuel Types: {Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).length}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Main Fuel Type <FieldTooltip content="Select main fuel type" />
                            </Label>
                            <Select 
                              value={row.stationaryMainFuelType || ''} 
                              onValueChange={(value) => {
                                updateProcessingRow(row.id, { 
                                  stationaryMainFuelType: value,
                                  stationarySubFuelType: undefined,
                                  stationaryCo2Factor: undefined,
                                  stationaryUnit: undefined,
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select main fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  (() => {
                                    const mainFuelTypes = Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean)));
                                    console.log('Main Fuel Types for dropdown:', mainFuelTypes);
                                    if (mainFuelTypes.length === 0) {
                                      return <SelectItem value="no-data" disabled>No fuel types found</SelectItem>;
                                    }
                                    return mainFuelTypes.map(mainType => (
                                      <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                    ));
                                  })()
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Sub Fuel Type <FieldTooltip content="Select sub fuel type" />
                            </Label>
                            <Select 
                              value={row.stationarySubFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = stationaryCombustionData.find(
                                  d => d['Main Fuel Type'] === row.stationaryMainFuelType && d['Sub Fuel Type'] === value
                                );
                                console.log('Selected sub fuel type:', selected);
                                updateProcessingRow(row.id, { 
                                  stationarySubFuelType: value,
                                  stationaryCo2Factor: selected?.['CO2 Factor'],
                                  stationaryUnit: selected?.['Units'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                              disabled={!row.stationaryMainFuelType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData
                                  .filter(d => d['Main Fuel Type'] === row.stationaryMainFuelType)
                                  .map(d => {
                                    const subType = d['Sub Fuel Type'];
                                    return (
                                      <SelectItem key={subType} value={subType}>
                                        {subType}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.stationaryUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                              disabled={!row.stationarySubFuelType}
                            />
                          </div>
                        </div>
                        {row.stationaryCo2Factor !== undefined && (
                          <div className="mt-2 text-sm text-gray-600">
                            CO2 Factor: <span className="font-semibold">{row.stationaryCo2Factor.toFixed(6)}</span>
                          </div>
                        )}
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Combustion Fields */}
                    {row.combustionType === 'mobile' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Mobile Combustion Details</h5>
                        {/* Debug info - remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-100 rounded">
                            Data loaded: {mobileCombustionData.length} rows | 
                            Fuel Types: {Array.from(new Set(mobileCombustionData.map(d => d['FuelType']).filter(Boolean))).length}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Fuel Type <FieldTooltip content="Select fuel type" />
                            </Label>
                            <Select 
                              value={row.mobileFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = mobileCombustionData.find(d => d['FuelType'] === value);
                                console.log('Selected fuel type:', selected);
                                updateProcessingRow(row.id, { 
                                  mobileFuelType: value,
                                  mobileKgCo2PerUnit: selected?.['kg CO2 per unit'],
                                  mobileUnit: selected?.['Unit'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {mobileCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  (() => {
                                    const fuelTypes = mobileCombustionData.map(d => d['FuelType']).filter(Boolean);
                                    console.log('Fuel Types for dropdown:', fuelTypes);
                                    if (fuelTypes.length === 0) {
                                      return <SelectItem value="no-data" disabled>No fuel types found</SelectItem>;
                                    }
                                    return fuelTypes.map(fuelType => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ));
                                  })()
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              kg CO2 per Unit <FieldTooltip content="CO2 emission factor" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileKgCo2PerUnit !== undefined ? row.mobileKgCo2PerUnit.toFixed(6) : ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                              disabled={!row.mobileFuelType}
                            />
                          </div>
                        </div>
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Heat and Steam Selection for Drying / Curing / Kilns */}
                {row.processingActivity === 'Drying / Curing / Kilns' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Heat and Steam Details</h4>
                    {/* Debug info - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-100 rounded">
                        Data loaded: {heatSteamData.length} rows
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Heat and Steam Type <FieldTooltip content="Select heat and steam type" />
                        </Label>
                        <Select 
                          value={row.heatSteamType || ''} 
                          onValueChange={(value) => {
                            const selected = heatSteamData.find(d => d['Type'] === value);
                            console.log('Selected heat and steam type:', selected);
                            updateProcessingRow(row.id, { 
                              heatSteamType: value,
                              heatSteamKgCo2e: selected?.['kg CO₂e'],
                              heatSteamUnit: selected?.['Unit'],
                              quantity: undefined,
                              emissions: undefined,
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select heat and steam type" />
                          </SelectTrigger>
                          <SelectContent>
                            {heatSteamData.length === 0 ? (
                              <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                            ) : (
                              heatSteamData.map(d => (
                                <SelectItem key={d['Type']} value={d['Type']}>
                                  {d['Type']}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Unit <FieldTooltip content="Unit of measurement" />
                        </Label>
                        <Input
                          type="text"
                          value={row.heatSteamUnit || ''}
                          disabled
                          className="bg-gray-100"
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Quantity (kWh) <FieldTooltip content="Enter quantity in kWh" />
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
                          disabled={!row.heatSteamType}
                        />
                      </div>
                    </div>
                    {row.heatSteamKgCo2e !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        CO₂e Factor: <span className="font-semibold">{row.heatSteamKgCo2e.toFixed(6)} kg CO₂e/kWh</span>
                      </div>
                    )}
                    {row.emissions !== undefined && (
                      <div className="mt-2 text-sm text-gray-700 font-medium">
                        Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO₂e</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Fuel Table - shown only when a processing activity is selected that can use fuel (but not Heating, melting, smelting or Drying / Curing / Kilns) */}
                {row.processingActivity &&
                 row.processingActivity !== 'Heating, melting, smelting' &&
                 row.processingActivity !== 'Drying / Curing / Kilns' &&
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
                  row.processingActivity === 'Forging / Foundry operations' ||
                  row.processingActivity === 'Material forming (molding, extrusion)' ||
                  row.processingActivity === 'Textile processing (dyeing, washing)') && (
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

                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setProcessingRows(prev => prev.filter(r => r.id !== row.id))}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Remove Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {processingRows.length === 0 && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center text-gray-500">
                    <p className="text-lg mb-2">No entries yet</p>
                    <p className="text-sm">Click "Add New Entry" to get started.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer Section */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">
                  <span className="text-sm text-gray-600">Total Processing Entries:</span> <span className="font-semibold text-lg">{processingRows.length}</span>
                  {totalEmissions > 0 && (
                    <span className="ml-6">
                      <span className="text-sm text-gray-600">Total Emissions:</span> <span className="font-semibold text-lg text-teal-700">{totalEmissions.toFixed(6)} kg CO2e</span>
                    </span>
                  )}
                </div>
                <Button 
                  onClick={saveProcessingLocal}
                  disabled={processingRows.length === 0 || savingProcessing} 
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingProcessing ? 'Saving...' : `Save and Next (${processingRows.length})`}
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>
    );
  }

    // Use of Sold Products Form (Final)
    if (productType === 'final') {
      // Helper function to get grid factor
      const getGridFactor = (country?: 'UAE' | 'Pakistan') => (country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined);

      // Update function for use rows (with combustion and hybrid calculations)
      const updateUseRow = (id: string, patch: Partial<UseOfSoldProductsRow>) => {
        setUseRows(prev => prev.map(r => {
          if (r.id !== id) return r;
          const next: UseOfSoldProductsRow = { ...r, ...patch };

          let emissions: number | undefined;

          // --- Combustion emissions (for Internal combustion engine vehicles, Sold fuels, Boilers) ---
          if (
            next.processingActivity === 'Internal combustion engine vehicles (cars, trucks, bikes)' ||
            next.processingActivity === 'Sold fuels (LPG, petrol, diesel)' ||
            next.processingActivity === 'Boilers, stoves, heaters (gas-based)'
          ) {
            // For Internal combustion engine vehicles, calculate both stationary and mobile
          if (next.processingActivity === 'Internal combustion engine vehicles (cars, trucks, bikes)') {
              // Calculate stationary emissions
              let stationaryEmissions: number | undefined;
              if (typeof next.stationaryQuantity === 'number' && typeof next.stationaryCo2Factor === 'number') {
                stationaryEmissions = next.stationaryQuantity * next.stationaryCo2Factor;
              }
              
              // Calculate mobile emissions
              let mobileEmissions: number | undefined;
              if (typeof next.mobileQuantity === 'number' && typeof next.mobileKgCo2PerUnit === 'number') {
                mobileEmissions = next.mobileQuantity * next.mobileKgCo2PerUnit;
              }
              
              // Total emissions = stationary + mobile (if both are present)
              const totalEmissions =
                (typeof stationaryEmissions === 'number' ? stationaryEmissions : 0) +
                (typeof mobileEmissions === 'number' ? mobileEmissions : 0);
              
              emissions =
                typeof stationaryEmissions === 'number' || typeof mobileEmissions === 'number'
                  ? Number(totalEmissions.toFixed(6))
                  : undefined;
            } else {
              // For other activities, use the original logic with combustionType
            if (next.combustionType === 'stationary') {
              // Use Stationary Combustion data
              next.stationaryCo2Factor = next.stationaryCo2Factor || undefined;
              if (typeof next.quantity === 'number' && typeof next.stationaryCo2Factor === 'number') {
                emissions = next.quantity * next.stationaryCo2Factor;
              }
            } else if (next.combustionType === 'mobile') {
              // Use Mobile Combustion data
              next.mobileKgCo2PerUnit = next.mobileKgCo2PerUnit || undefined;
              if (typeof next.quantity === 'number' && typeof next.mobileKgCo2PerUnit === 'number') {
                emissions = next.quantity * next.mobileKgCo2PerUnit;
                }
              }
            }
          } else if (next.processingActivity === 'Hybrid vehicles') {
            // --- Hybrid vehicles: Scope 1 fuel emissions ---
            let fuelEmissions: number | undefined;
            if (next.hybridFuelType && next.hybridFuel && next.hybridFuelUnit) {
              const factor = FACTORS[next.hybridFuelType]?.[next.hybridFuel]?.[next.hybridFuelUnit];
              next.hybridFuelFactor = typeof factor === 'number' ? factor : undefined;
            } else {
              next.hybridFuelFactor = undefined;
            }

            if (typeof next.hybridFuelQuantity === 'number' && typeof next.hybridFuelFactor === 'number') {
              fuelEmissions = next.hybridFuelQuantity * next.hybridFuelFactor;
              next.hybridFuelEmissions = Number(fuelEmissions.toFixed(6));
            } else {
              next.hybridFuelEmissions = undefined;
            }

            // --- Hybrid vehicles: Scope 2 electricity emissions ---
            let electricityEmissions: number | undefined;
            if (next.hybridTotalKwh) {
              const gridFactor = getGridFactor(next.hybridGridCountry);
              const gridPart = next.hybridGridPct && gridFactor ? (next.hybridGridPct / 100) * next.hybridTotalKwh * gridFactor : 0;
              const renewablePart = 0; // Renewable is always 0
              const otherEmissions = (next.hybridOtherSources || []).reduce((sum, s) => sum + (s.emissions || 0), 0);
              const otherPart =
                next.hybridOtherPct && next.hybridOtherPct > 0
                  ? (next.hybridOtherPct / 100) * next.hybridTotalKwh * (otherEmissions / (next.hybridTotalKwh || 1))
                  : 0;
              electricityEmissions = gridPart + renewablePart + otherPart;
            }

            // Total emissions = fuel + electricity (whichever are present)
            const totalEmissions =
              (typeof fuelEmissions === 'number' ? fuelEmissions : 0) +
              (typeof electricityEmissions === 'number' ? electricityEmissions : 0);

            emissions =
              typeof fuelEmissions === 'number' || typeof electricityEmissions === 'number'
                ? Number(totalEmissions.toFixed(6))
                : undefined;
          } else if (
            next.processingActivity === 'Electronics (laptops, TVs, phones)' ||
            next.processingActivity === 'Electric machinery/equipment' ||
            next.processingActivity === 'Batteries' ||
            next.processingActivity === 'Water-using devices' ||
            next.processingActivity === 'Electric vehicles (cars, 2-wheelers, buses)' ||
            next.processingActivity === 'Home appliances (ACs, fridges, fans, microwaves)'
          ) {
            // --- Electricity emissions for electronics categories (Scope 2 style) ---
            let electricityEmissions: number | undefined;
            if (next.electricityTotalKwh) {
              const gridFactor = getGridFactor(next.electricityGridCountry);
              const gridPart = next.electricityGridPct && gridFactor ? (next.electricityGridPct / 100) * next.electricityTotalKwh * gridFactor : 0;
              const renewablePart = 0; // Renewable is always 0
              let otherPart = 0;
              if (next.electricityOtherPct && next.electricityOtherPct > 0 && (next.electricityOtherSources || []).length > 0) {
                const sumOtherEmissions = (next.electricityOtherSources || []).reduce((sum, s) => sum + (s.emissions || 0), 0);
                otherPart = (next.electricityOtherPct / 100) * next.electricityTotalKwh * sumOtherEmissions;
              }
              electricityEmissions = gridPart + renewablePart + otherPart;
            }
            emissions = electricityEmissions !== undefined ? Number(electricityEmissions.toFixed(6)) : undefined;
          } else if (next.processingActivity === 'Refrigerants sold') {
            // --- Refrigerant emissions (Scope 1 style) ---
            if (next.refrigerantType) {
              const factor = REFRIGERANT_FACTORS[next.refrigerantType];
              next.refrigerantFactor = typeof factor === 'number' ? factor : undefined;
            } else {
              next.refrigerantFactor = undefined;
            }
            if (typeof next.quantity === 'number' && typeof next.refrigerantFactor === 'number') {
              emissions = Number((next.quantity * next.refrigerantFactor).toFixed(6));
            } else {
              emissions = undefined;
            }
          } else if (next.processingActivity === 'Cooling products (AC, refrigeration)') {
            // --- Cooling products: Scope 2 electricity emissions ---
            let electricityEmissions: number | undefined;
            if (next.electricityTotalKwh) {
              const gridFactor = getGridFactor(next.electricityGridCountry);
              const gridPart = next.electricityGridPct && gridFactor ? (next.electricityGridPct / 100) * next.electricityTotalKwh * gridFactor : 0;
              const renewablePart = 0; // Renewable is always 0
              let otherPart = 0;
              if (next.electricityOtherPct && next.electricityOtherPct > 0 && (next.electricityOtherSources || []).length > 0) {
                const sumOtherEmissions = (next.electricityOtherSources || []).reduce((sum, s) => sum + (s.emissions || 0), 0);
                otherPart = (next.electricityOtherPct / 100) * next.electricityTotalKwh * sumOtherEmissions;
              }
              electricityEmissions = gridPart + renewablePart + otherPart;
            }

            // --- Cooling products: Scope 1 refrigerant emissions ---
            let refrigerantEmissions: number | undefined;
            if (next.refrigerantType) {
              const factor = REFRIGERANT_FACTORS[next.refrigerantType];
              next.refrigerantFactor = typeof factor === 'number' ? factor : undefined;
            } else {
              next.refrigerantFactor = undefined;
            }
            if (typeof next.coolingRefrigerantQuantity === 'number' && typeof next.refrigerantFactor === 'number') {
              refrigerantEmissions = Number((next.coolingRefrigerantQuantity * next.refrigerantFactor).toFixed(6));
            } else {
              refrigerantEmissions = undefined;
            }

            // Total emissions = electricity + refrigerant (whichever are present)
            const totalEmissions =
              (typeof electricityEmissions === 'number' ? electricityEmissions : 0) +
              (typeof refrigerantEmissions === 'number' ? refrigerantEmissions : 0);

            emissions =
              typeof electricityEmissions === 'number' || typeof refrigerantEmissions === 'number'
                ? Number(totalEmissions.toFixed(6))
                : undefined;
          } else if (next.processingActivity === 'Gas-fired industrial machinery sold') {
            // --- Fuel emissions (Scope 1 style) ---
            if (next.gasMachineryFuelType && next.gasMachineryFuel && next.gasMachineryUnit) {
              const factor = FACTORS[next.gasMachineryFuelType]?.[next.gasMachineryFuel]?.[next.gasMachineryUnit];
              next.gasMachineryFactor = typeof factor === 'number' ? factor : undefined;
            } else {
              next.gasMachineryFactor = undefined;
            }
            if (typeof next.gasMachineryQuantity === 'number' && typeof next.gasMachineryFactor === 'number') {
              emissions = Number((next.gasMachineryQuantity * next.gasMachineryFactor).toFixed(6));
            } else {
              emissions = undefined;
            }
          }

          next.emissions = emissions !== undefined ? Number(emissions.toFixed(6)) : undefined;
          
          return next;
        }));
      };

      // Update other source row for hybrid electricity
      const updateHybridOtherSourceRow = (rowId: string, sourceId: string, patch: {
        type?: FuelType;
        fuel?: string;
        unit?: string;
        quantity?: number;
        factor?: number;
        emissions?: number;
      }) => {
        setUseRows(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          const otherSources = (r.hybridOtherSources || []).map(s => {
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
          const updated = { ...r, hybridOtherSources: otherSources };
          // Recalculate electricity emissions
          if (updated.hybridTotalKwh) {
            const gridFactor = getGridFactor(updated.hybridGridCountry);
            const gridPart = updated.hybridGridPct && gridFactor ? (updated.hybridGridPct / 100) * updated.hybridTotalKwh * gridFactor : 0;
            const renewablePart = 0;
            const otherEmissions = otherSources.reduce((sum, s) => sum + (s.emissions || 0), 0);
            const otherPart =
              updated.hybridOtherPct && updated.hybridOtherPct > 0
                ? (updated.hybridOtherPct / 100) * updated.hybridTotalKwh * (otherEmissions / (updated.hybridTotalKwh || 1))
                : 0;
            const electricityEmissions = gridPart + renewablePart + otherPart;
            const fuelEmissions =
              typeof updated.hybridFuelQuantity === 'number' && typeof updated.hybridFuelFactor === 'number'
                ? updated.hybridFuelQuantity * updated.hybridFuelFactor
                : 0;
            updated.emissions = Number((fuelEmissions + electricityEmissions).toFixed(6));
          }
          return updated;
        }));
      };

      // Add other source row for hybrid
      const addHybridOtherSourceRow = (rowId: string) => {
        setUseRows(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            hybridOtherSources: [...(r.hybridOtherSources || []), {
              id: `other-${Date.now()}-${Math.random()}`,
            }]
          };
        }));
      };

      // Remove other source row for hybrid
      const removeHybridOtherSourceRow = (rowId: string, sourceId: string) => {
        setUseRows(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            hybridOtherSources: (r.hybridOtherSources || []).filter(s => s.id !== sourceId)
          };
        }));
      };

      // Update other source row for electricity (electronics categories)
      const updateElectricityOtherSourceRow = (rowId: string, sourceId: string, patch: {
        type?: FuelType;
        fuel?: string;
        unit?: string;
        quantity?: number;
        factor?: number;
        emissions?: number;
      }) => {
        setUseRows(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          const otherSources = (r.electricityOtherSources || []).map(s => {
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
          const updated = { ...r, electricityOtherSources: otherSources };
          // Recalculate electricity emissions
          if (updated.electricityTotalKwh) {
            const gridFactor = getGridFactor(updated.electricityGridCountry);
            const gridPart = updated.electricityGridPct && gridFactor ? (updated.electricityGridPct / 100) * updated.electricityTotalKwh * gridFactor : 0;
            const renewablePart = 0;
            let otherPart = 0;
            if (updated.electricityOtherPct && updated.electricityOtherPct > 0 && otherSources.length > 0) {
              const sumOtherEmissions = otherSources.reduce((sum, s) => sum + (s.emissions || 0), 0);
              otherPart = (updated.electricityOtherPct / 100) * updated.electricityTotalKwh * sumOtherEmissions;
            }
            const electricityEmissions = gridPart + renewablePart + otherPart;
            
            // For Cooling products, also add refrigerant emissions
            if (updated.processingActivity === 'Cooling products (AC, refrigeration)') {
              let refrigerantEmissions = 0;
              if (typeof updated.coolingRefrigerantQuantity === 'number' && typeof updated.refrigerantFactor === 'number') {
                refrigerantEmissions = updated.coolingRefrigerantQuantity * updated.refrigerantFactor;
              }
              updated.emissions = Number((electricityEmissions + refrigerantEmissions).toFixed(6));
            } else {
              updated.emissions = Number(electricityEmissions.toFixed(6));
            }
          }
          return updated;
        }));
      };

      // Add other source row for electricity
      const addElectricityOtherSourceRow = (rowId: string) => {
        setUseRows(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            electricityOtherSources: [...(r.electricityOtherSources || []), {
              id: `other-${Date.now()}-${Math.random()}`,
            }]
          };
        }));
      };

      // Remove other source row for electricity
      const removeElectricityOtherSourceRow = (rowId: string, sourceId: string) => {
        setUseRows(prev => prev.map(r => {
          if (r.id !== rowId) return r;
          return {
            ...r,
            electricityOtherSources: (r.electricityOtherSources || []).filter(s => s.id !== sourceId)
          };
        }));
      };

      // Save Use function (local to this block)
      const saveUseLocal = async () => {
        if (!user) {
          toast({ title: "Sign in required", description: "Please sign in to save entries", variant: "destructive" });
          return;
        }

        setSavingUse(true);
        try {
          // Identify new and changed entries
          const newEntries = useRows.filter(r => !existingUseRows.find(e => e.id === r.id));
          const changedExisting = useRows.filter(r => {
            const existing = existingUseRows.find(e => e.id === r.id);
            return existing && existing.dbId && JSON.stringify(existing) !== JSON.stringify(r);
          });
          const deletedIds = existingUseRows
            .filter(e => !useRows.find(r => r.id === e.id))
            .map(e => e.dbId)
            .filter((id): id is string => !!id);

          // Delete removed entries
          if (deletedIds.length > 0) {
            const { error } = await supabase
              .from('scope3_use_of_sold_products' as any)
              .delete()
              .in('id', deletedIds);
            if (error) throw error;
          }

          // Insert new entries
          if (newEntries.length > 0) {
            const payload = newEntries.map(r => ({
              user_id: user.id,
              counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
              processing_activity: r.processingActivity,
              energy_consumption: r.energyConsumption,
              combustion_type: r.combustionType,
              stationary_main_fuel_type: r.stationaryMainFuelType,
              stationary_sub_fuel_type: r.stationarySubFuelType,
              stationary_co2_factor: r.stationaryCo2Factor,
              stationary_unit: r.stationaryUnit,
              stationary_quantity: r.stationaryQuantity,
              mobile_fuel_type: r.mobileFuelType,
              mobile_kg_co2_per_unit: r.mobileKgCo2PerUnit,
              mobile_unit: r.mobileUnit,
              mobile_quantity: r.mobileQuantity,
              hybrid_fuel_type: r.hybridFuelType,
              hybrid_fuel: r.hybridFuel,
              hybrid_fuel_unit: r.hybridFuelUnit,
              hybrid_fuel_quantity: r.hybridFuelQuantity,
              hybrid_fuel_factor: r.hybridFuelFactor,
              hybrid_fuel_emissions: r.hybridFuelEmissions,
              hybrid_total_kwh: r.hybridTotalKwh,
              hybrid_grid_pct: r.hybridGridPct,
              hybrid_renewable_pct: r.hybridRenewablePct,
              hybrid_other_pct: r.hybridOtherPct,
              hybrid_grid_country: r.hybridGridCountry,
              hybrid_other_sources: r.hybridOtherSources || [],
              electricity_total_kwh: r.electricityTotalKwh,
              electricity_grid_pct: r.electricityGridPct,
              electricity_renewable_pct: r.electricityRenewablePct,
              electricity_other_pct: r.electricityOtherPct,
              electricity_grid_country: r.electricityGridCountry,
              electricity_other_sources: r.electricityOtherSources || [],
              refrigerant_type: r.refrigerantType,
              refrigerant_factor: r.refrigerantFactor,
              cooling_refrigerant_quantity: r.coolingRefrigerantQuantity,
              gas_machinery_fuel_type: r.gasMachineryFuelType,
              gas_machinery_fuel: r.gasMachineryFuel,
              gas_machinery_unit: r.gasMachineryUnit,
              gas_machinery_quantity: r.gasMachineryQuantity,
              gas_machinery_factor: r.gasMachineryFactor,
              quantity: r.quantity,
              emissions: r.emissions || 0,
              row_data: r, // Store full row data as JSONB
            }));

            const { data, error } = await supabase.from('scope3_use_of_sold_products' as any).insert(payload).select('id');
            if (error) throw error;

            // Update existing rows with new dbIds
            const updatedRows = useRows.map(r => {
              const newEntryIndex = newEntries.findIndex(ne => ne.id === r.id);
              if (newEntryIndex >= 0 && data && data[newEntryIndex] && (data[newEntryIndex] as any).id) {
                return { ...r, dbId: (data[newEntryIndex] as any).id };
              }
              return r;
            });
            setExistingUseRows(updatedRows as Array<UseOfSoldProductsRow & { dbId?: string }>);
          }

          // Update changed entries
          if (changedExisting.length > 0) {
            const updates = changedExisting.map(r => {
              const existing = existingUseRows.find(e => e.id === r.id);
              return supabase
                .from('scope3_use_of_sold_products' as any)
                .update({
                  processing_activity: r.processingActivity,
                  energy_consumption: r.energyConsumption,
                  combustion_type: r.combustionType,
                  stationary_main_fuel_type: r.stationaryMainFuelType,
                  stationary_sub_fuel_type: r.stationarySubFuelType,
                  stationary_co2_factor: r.stationaryCo2Factor,
                  stationary_unit: r.stationaryUnit,
                  stationary_quantity: r.stationaryQuantity,
                  mobile_fuel_type: r.mobileFuelType,
                  mobile_kg_co2_per_unit: r.mobileKgCo2PerUnit,
                  mobile_unit: r.mobileUnit,
                  mobile_quantity: r.mobileQuantity,
                  hybrid_fuel_type: r.hybridFuelType,
                  hybrid_fuel: r.hybridFuel,
                  hybrid_fuel_unit: r.hybridFuelUnit,
                  hybrid_fuel_quantity: r.hybridFuelQuantity,
                  hybrid_fuel_factor: r.hybridFuelFactor,
                  hybrid_fuel_emissions: r.hybridFuelEmissions,
                  hybrid_total_kwh: r.hybridTotalKwh,
                  hybrid_grid_pct: r.hybridGridPct,
                  hybrid_renewable_pct: r.hybridRenewablePct,
                  hybrid_other_pct: r.hybridOtherPct,
                  hybrid_grid_country: r.hybridGridCountry,
                  hybrid_other_sources: r.hybridOtherSources || [],
                  electricity_total_kwh: r.electricityTotalKwh,
                  electricity_grid_pct: r.electricityGridPct,
                  electricity_renewable_pct: r.electricityRenewablePct,
                  electricity_other_pct: r.electricityOtherPct,
                  electricity_grid_country: r.electricityGridCountry,
                  electricity_other_sources: r.electricityOtherSources || [],
                  refrigerant_type: r.refrigerantType,
                  refrigerant_factor: r.refrigerantFactor,
                  cooling_refrigerant_quantity: r.coolingRefrigerantQuantity,
                  gas_machinery_fuel_type: r.gasMachineryFuelType,
                  gas_machinery_fuel: r.gasMachineryFuel,
                  gas_machinery_unit: r.gasMachineryUnit,
                  gas_machinery_quantity: r.gasMachineryQuantity,
                  gas_machinery_factor: r.gasMachineryFactor,
                  quantity: r.quantity,
                  emissions: r.emissions || 0,
                  row_data: r, // Store full row data as JSONB
                })
                .eq('id', existing!.dbId!);
            });
            const results = await Promise.all(updates);
            const updateError = results.find(r => (r as any).error)?.error;
            if (updateError) throw updateError;
          }

          toast({ title: "Saved", description: "Use of sold products saved successfully." });
          onSaveAndNext?.();
        } catch (e: any) {
          toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
        } finally {
          setSavingUse(false);
        }
      };

      const totalEmissions = useRows.reduce((sum, r) => sum + (r.emissions || 0), 0);
      
    return (
        <div className={`space-y-6 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToSelection}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back
              </Button>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Use of Sold Products</h3>
                <p className="text-sm text-gray-600 mt-1">Usage specs and energy during use</p>
              </div>
            </div>
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 text-white" 
              onClick={() => setUseRows(prev => [...prev, newUseRow()])}
            >
              <Plus className="h-4 w-4 mr-2" /> Add New Entry
            </Button>
          </div>

          {/* Entries Section */}
          <div className="space-y-4">
            {useRows.map((row, index) => (
              <Card 
                key={row.id} 
                className="overflow-hidden border-gray-200 hover:border-teal-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <CardContent className="p-6">
                <div className="mb-4">
                    <Label className="flex items-center gap-1 mb-2">
                      Processing Activity <FieldTooltip content="Select the processing activity type" />
                    </Label>
                    <Select 
                      value={row.processingActivity} 
                      onValueChange={(value) => {
                        const isInternalCombustion = value === 'Internal combustion engine vehicles (cars, trucks, bikes)';
                        const isSoldFuels = value === 'Sold fuels (LPG, petrol, diesel)';
                        const isBoilers = value === 'Boilers, stoves, heaters (gas-based)';
                        const isCombustionCategory = isInternalCombustion || isSoldFuels || isBoilers;
                        const isHybrid = value === 'Hybrid vehicles';
                        const isElectronicsCategory = 
                          value === 'Electronics (laptops, TVs, phones)' ||
                          value === 'Electric machinery/equipment' ||
                          value === 'Batteries' ||
                          value === 'Water-using devices' ||
                          value === 'Electric vehicles (cars, 2-wheelers, buses)' ||
                          value === 'Home appliances (ACs, fridges, fans, microwaves)';
                        const isRefrigerant = value === 'Refrigerants sold';
                        const isCoolingProducts = value === 'Cooling products (AC, refrigeration)';
                        const isGasMachinery = value === 'Gas-fired industrial machinery sold';
                        updateUseRow(row.id, {
                          processingActivity: value,
                          // Clear combustion fields if not combustion categories
                          combustionType: isCombustionCategory ? row.combustionType : undefined,
                          stationaryMainFuelType: isCombustionCategory ? row.stationaryMainFuelType : undefined,
                          stationarySubFuelType: isCombustionCategory ? row.stationarySubFuelType : undefined,
                          stationaryCo2Factor: isCombustionCategory ? row.stationaryCo2Factor : undefined,
                          stationaryUnit: isCombustionCategory ? row.stationaryUnit : undefined,
                          stationaryQuantity: undefined,
                          mobileFuelType: isCombustionCategory ? row.mobileFuelType : undefined,
                          mobileKgCo2PerUnit: isCombustionCategory ? row.mobileKgCo2PerUnit : undefined,
                          mobileUnit: isCombustionCategory ? row.mobileUnit : undefined,
                          mobileQuantity: undefined,
                          // Clear hybrid fields if not Hybrid vehicles
                          hybridFuelType: isHybrid ? row.hybridFuelType : undefined,
                          hybridFuel: isHybrid ? row.hybridFuel : undefined,
                          hybridFuelUnit: isHybrid ? row.hybridFuelUnit : undefined,
                          hybridFuelQuantity: undefined,
                          hybridFuelFactor: undefined,
                          hybridFuelEmissions: undefined,
                          hybridTotalKwh: isHybrid ? row.hybridTotalKwh : undefined,
                          hybridGridPct: isHybrid ? row.hybridGridPct : undefined,
                          hybridRenewablePct: isHybrid ? row.hybridRenewablePct : undefined,
                          hybridOtherPct: isHybrid ? row.hybridOtherPct : undefined,
                          hybridGridCountry: isHybrid ? row.hybridGridCountry : undefined,
                          hybridOtherSources: isHybrid ? row.hybridOtherSources : undefined,
                          // Clear electricity fields if not electronics categories or cooling products
                          electricityTotalKwh: (isElectronicsCategory || isCoolingProducts) ? row.electricityTotalKwh : undefined,
                          electricityGridPct: (isElectronicsCategory || isCoolingProducts) ? row.electricityGridPct : undefined,
                          electricityRenewablePct: (isElectronicsCategory || isCoolingProducts) ? row.electricityRenewablePct : undefined,
                          electricityOtherPct: (isElectronicsCategory || isCoolingProducts) ? row.electricityOtherPct : undefined,
                          electricityGridCountry: (isElectronicsCategory || isCoolingProducts) ? row.electricityGridCountry : undefined,
                          electricityOtherSources: (isElectronicsCategory || isCoolingProducts) ? row.electricityOtherSources : undefined,
                          // Clear refrigerant fields if not Refrigerants sold or Cooling products
                          refrigerantType: (isRefrigerant || isCoolingProducts) ? row.refrigerantType : undefined,
                          refrigerantFactor: (isRefrigerant || isCoolingProducts) ? row.refrigerantFactor : undefined,
                          coolingRefrigerantQuantity: isCoolingProducts ? row.coolingRefrigerantQuantity : undefined,
                          // Clear fuel fields if not Gas-fired industrial machinery sold
                          gasMachineryFuelType: isGasMachinery ? row.gasMachineryFuelType : undefined,
                          gasMachineryFuel: isGasMachinery ? row.gasMachineryFuel : undefined,
                          gasMachineryUnit: isGasMachinery ? row.gasMachineryUnit : undefined,
                          gasMachineryQuantity: undefined,
                          gasMachineryFactor: undefined,
                          quantity: undefined,
                          emissions: undefined,
                        });
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
                      <SelectItem value="Refrigerants sold">Refrigerants sold</SelectItem>
                        <SelectItem value="Batteries">Batteries</SelectItem>
                        <SelectItem value="Water-using devices">Water-using devices</SelectItem>
                      </SelectContent>
                    </Select>
          </div>

                {/* Combustion Sections for Internal combustion engine vehicles */}
                {row.processingActivity === 'Internal combustion engine vehicles (cars, trucks, bikes)' && (
                  <div className="space-y-4 mb-4">
                    {/* Stationary Combustion Fields */}
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200 mb-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Stationary Combustion Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
                    <Label className="flex items-center gap-1 mb-2">
                              Main Fuel Type <FieldTooltip content="Select main fuel type" />
                            </Label>
                            <Select 
                              value={row.stationaryMainFuelType || ''} 
                              onValueChange={(value) => {
                                updateUseRow(row.id, { 
                                  stationaryMainFuelType: value,
                                  stationarySubFuelType: undefined,
                                  stationaryCo2Factor: undefined,
                                  stationaryUnit: undefined,
                                  stationaryQuantity: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select main fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).map(mainType => (
                                    <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Sub Fuel Type <FieldTooltip content="Select sub fuel type" />
                            </Label>
                            <Select 
                              value={row.stationarySubFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = stationaryCombustionData.find(
                                  d => d['Main Fuel Type'] === row.stationaryMainFuelType && d['Sub Fuel Type'] === value
                                );
                                updateUseRow(row.id, { 
                                  stationarySubFuelType: value,
                                  stationaryCo2Factor: selected?.['CO2 Factor'],
                                  stationaryUnit: selected?.['Units'],
                                  stationaryQuantity: undefined,
                                });
                              }}
                              disabled={!row.stationaryMainFuelType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData
                                  .filter(d => d['Main Fuel Type'] === row.stationaryMainFuelType)
                                  .map(d => {
                                    const subType = d['Sub Fuel Type'];
                                    return (
                                      <SelectItem key={subType} value={subType}>
                                        {subType}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.stationaryUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                              value={row.stationaryQuantity ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                                updateUseRow(row.id, { stationaryQuantity: value });
                      }}
                              disabled={!row.stationarySubFuelType}
                    />
          </div>
                        </div>
                        {row.stationaryCo2Factor !== undefined && (
                          <div className="mt-2 text-sm text-gray-600">
                            CO2 Factor: <span className="font-semibold">{row.stationaryCo2Factor.toFixed(6)}</span>
                          </div>
                        )}
                        {row.stationaryQuantity !== undefined && row.stationaryCo2Factor !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Stationary Emissions: <span className="font-semibold">{(row.stationaryQuantity * row.stationaryCo2Factor).toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                </div>

                    {/* Mobile Combustion Fields */}
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Mobile Combustion Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Fuel Type <FieldTooltip content="Select fuel type" />
                            </Label>
                            <Select 
                              value={row.mobileFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = mobileCombustionData.find(d => d['FuelType'] === value);
                                updateUseRow(row.id, { 
                                  mobileFuelType: value,
                                  mobileKgCo2PerUnit: selected?.['kg CO2 per unit'],
                                  mobileUnit: selected?.['Unit'],
                                  mobileQuantity: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {mobileCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  (() => {
                                    const fuelTypes = mobileCombustionData.map(d => d['FuelType']).filter(Boolean);
                                    if (fuelTypes.length === 0) {
                                      return <SelectItem value="no-data" disabled>No fuel types found</SelectItem>;
                                    }
                                    return fuelTypes.map(fuelType => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ));
                                  })()
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              kg CO2 per Unit <FieldTooltip content="CO2 emission factor" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileKgCo2PerUnit !== undefined ? row.mobileKgCo2PerUnit.toFixed(6) : ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                              value={row.mobileQuantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                updateUseRow(row.id, { mobileQuantity: value });
                              }}
                              disabled={!row.mobileFuelType}
                            />
                          </div>
                        </div>
                        {row.mobileQuantity !== undefined && row.mobileKgCo2PerUnit !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Mobile Emissions: <span className="font-semibold">{(row.mobileQuantity * row.mobileKgCo2PerUnit).toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    
                    {/* Total Emissions Display */}
                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-300">
                        <div className="text-sm font-semibold text-gray-900">
                          Total Emissions: <span className="text-teal-600">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Combustion Type Selection for Sold fuels (LPG, petrol, diesel) */}
                {row.processingActivity === 'Sold fuels (LPG, petrol, diesel)' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Combustion Type</h4>
                    <div className="mb-4">
                      <Label className="flex items-center gap-1 mb-2">
                        Select Combustion Type <FieldTooltip content="Choose between Stationary or Mobile Combustion" />
                      </Label>
                      <Select 
                        value={row.combustionType || ''} 
                        onValueChange={(value) => {
                          updateUseRow(row.id, { 
                            combustionType: value as 'stationary' | 'mobile',
                            // Clear all combustion-related fields
                            stationaryMainFuelType: undefined,
                            stationarySubFuelType: undefined,
                            stationaryCo2Factor: undefined,
                            stationaryUnit: undefined,
                            mobileFuelType: undefined,
                            mobileKgCo2PerUnit: undefined,
                            mobileUnit: undefined,
                            quantity: undefined,
                            emissions: undefined,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select combustion type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stationary">Stationary Combustion</SelectItem>
                          <SelectItem value="mobile">Mobile Combustion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stationary Combustion Fields */}
                    {row.combustionType === 'stationary' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Stationary Combustion Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Main Fuel Type <FieldTooltip content="Select main fuel type" />
                            </Label>
                            <Select 
                              value={row.stationaryMainFuelType || ''} 
                              onValueChange={(value) => {
                                updateUseRow(row.id, { 
                                  stationaryMainFuelType: value,
                                  stationarySubFuelType: undefined,
                                  stationaryCo2Factor: undefined,
                                  stationaryUnit: undefined,
                                  stationaryQuantity: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select main fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).map(mainType => (
                                    <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Sub Fuel Type <FieldTooltip content="Select sub fuel type" />
                            </Label>
                            <Select 
                              value={row.stationarySubFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = stationaryCombustionData.find(
                                  d => d['Main Fuel Type'] === row.stationaryMainFuelType && d['Sub Fuel Type'] === value
                                );
                                console.log('Selected sub fuel type:', selected);
                                updateUseRow(row.id, { 
                                  stationarySubFuelType: value,
                                  stationaryCo2Factor: selected?.['CO2 Factor'],
                                  stationaryUnit: selected?.['Units'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                              disabled={!row.stationaryMainFuelType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData
                                  .filter(d => d['Main Fuel Type'] === row.stationaryMainFuelType)
                                  .map(d => {
                                    const subType = d['Sub Fuel Type'];
                                    return (
                                      <SelectItem key={subType} value={subType}>
                                        {subType}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.stationaryUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                                updateUseRow(row.id, { quantity: value });
                              }}
                              disabled={!row.stationarySubFuelType}
                            />
                          </div>
                        </div>
                        {row.stationaryCo2Factor !== undefined && (
                          <div className="mt-2 text-sm text-gray-600">
                            CO2 Factor: <span className="font-semibold">{row.stationaryCo2Factor.toFixed(6)}</span>
                          </div>
                        )}
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Combustion Fields */}
                    {row.combustionType === 'mobile' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Mobile Combustion Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Fuel Type <FieldTooltip content="Select fuel type" />
                            </Label>
                            <Select 
                              value={row.mobileFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = mobileCombustionData.find(d => d['FuelType'] === value);
                                console.log('Selected fuel type:', selected);
                                updateUseRow(row.id, { 
                                  mobileFuelType: value,
                                  mobileKgCo2PerUnit: selected?.['kg CO2 per unit'],
                                  mobileUnit: selected?.['Unit'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {mobileCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  (() => {
                                    const fuelTypes = mobileCombustionData.map(d => d['FuelType']).filter(Boolean);
                                    console.log('Fuel Types for dropdown:', fuelTypes);
                                    if (fuelTypes.length === 0) {
                                      return <SelectItem value="no-data" disabled>No fuel types found</SelectItem>;
                                    }
                                    return fuelTypes.map(fuelType => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ));
                                  })()
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              kg CO2 per Unit <FieldTooltip content="CO2 emission factor" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileKgCo2PerUnit !== undefined ? row.mobileKgCo2PerUnit.toFixed(6) : ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                                updateUseRow(row.id, { quantity: value });
                              }}
                              disabled={!row.mobileFuelType}
                    />
          </div>
                </div>
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Combustion Type Selection for Boilers, stoves, heaters (gas-based) */}
                {row.processingActivity === 'Boilers, stoves, heaters (gas-based)' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Combustion Type</h4>
                    <div className="mb-4">
                      <Label className="flex items-center gap-1 mb-2">
                        Select Combustion Type <FieldTooltip content="Choose between Stationary or Mobile Combustion" />
                      </Label>
                      <Select 
                        value={row.combustionType || ''} 
                        onValueChange={(value) => {
                          updateUseRow(row.id, { 
                            combustionType: value as 'stationary' | 'mobile',
                            // Clear all combustion-related fields
                            stationaryMainFuelType: undefined,
                            stationarySubFuelType: undefined,
                            stationaryCo2Factor: undefined,
                            stationaryUnit: undefined,
                            mobileFuelType: undefined,
                            mobileKgCo2PerUnit: undefined,
                            mobileUnit: undefined,
                            quantity: undefined,
                            emissions: undefined,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select combustion type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stationary">Stationary Combustion</SelectItem>
                          <SelectItem value="mobile">Mobile Combustion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Stationary Combustion Fields */}
                    {row.combustionType === 'stationary' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Stationary Combustion Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Main Fuel Type <FieldTooltip content="Select main fuel type" />
                            </Label>
                            <Select 
                              value={row.stationaryMainFuelType || ''} 
                              onValueChange={(value) => {
                                updateUseRow(row.id, { 
                                  stationaryMainFuelType: value,
                                  stationarySubFuelType: undefined,
                                  stationaryCo2Factor: undefined,
                                  stationaryUnit: undefined,
                                  stationaryQuantity: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select main fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  Array.from(new Set(stationaryCombustionData.map(d => d['Main Fuel Type']).filter(Boolean))).map(mainType => (
                                    <SelectItem key={mainType} value={mainType}>{mainType}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Sub Fuel Type <FieldTooltip content="Select sub fuel type" />
                            </Label>
                            <Select 
                              value={row.stationarySubFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = stationaryCombustionData.find(
                                  d => d['Main Fuel Type'] === row.stationaryMainFuelType && d['Sub Fuel Type'] === value
                                );
                                console.log('Selected sub fuel type:', selected);
                                updateUseRow(row.id, { 
                                  stationarySubFuelType: value,
                                  stationaryCo2Factor: selected?.['CO2 Factor'],
                                  stationaryUnit: selected?.['Units'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                              disabled={!row.stationaryMainFuelType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {stationaryCombustionData
                                  .filter(d => d['Main Fuel Type'] === row.stationaryMainFuelType)
                                  .map(d => {
                                    const subType = d['Sub Fuel Type'];
                                    return (
                                      <SelectItem key={subType} value={subType}>
                                        {subType}
                                      </SelectItem>
                                    );
                                  })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.stationaryUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                                updateUseRow(row.id, { quantity: value });
                              }}
                              disabled={!row.stationarySubFuelType}
                            />
                          </div>
                        </div>
                        {row.stationaryCo2Factor !== undefined && (
                          <div className="mt-2 text-sm text-gray-600">
                            CO2 Factor: <span className="font-semibold">{row.stationaryCo2Factor.toFixed(6)}</span>
                          </div>
                        )}
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mobile Combustion Fields */}
                    {row.combustionType === 'mobile' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Mobile Combustion Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Fuel Type <FieldTooltip content="Select fuel type" />
                            </Label>
                            <Select 
                              value={row.mobileFuelType || ''} 
                              onValueChange={(value) => {
                                const selected = mobileCombustionData.find(d => d['FuelType'] === value);
                                console.log('Selected fuel type:', selected);
                                updateUseRow(row.id, { 
                                  mobileFuelType: value,
                                  mobileKgCo2PerUnit: selected?.['kg CO2 per unit'],
                                  mobileUnit: selected?.['Unit'],
                                  quantity: undefined,
                                  emissions: undefined,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fuel type" />
                              </SelectTrigger>
                              <SelectContent>
                                {mobileCombustionData.length === 0 ? (
                                  <SelectItem value="no-data" disabled>Loading data...</SelectItem>
                                ) : (
                                  (() => {
                                    const fuelTypes = mobileCombustionData.map(d => d['FuelType']).filter(Boolean);
                                    console.log('Fuel Types for dropdown:', fuelTypes);
                                    if (fuelTypes.length === 0) {
                                      return <SelectItem value="no-data" disabled>No fuel types found</SelectItem>;
                                    }
                                    return fuelTypes.map(fuelType => (
                                      <SelectItem key={fuelType} value={fuelType}>
                                        {fuelType}
                                      </SelectItem>
                                    ));
                                  })()
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Unit <FieldTooltip content="Unit of measurement" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileUnit || ''}
                              disabled
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              kg CO2 per Unit <FieldTooltip content="CO2 emission factor" />
                            </Label>
                            <Input
                              type="text"
                              value={row.mobileKgCo2PerUnit !== undefined ? row.mobileKgCo2PerUnit.toFixed(6) : ''}
                              disabled
                              className="bg-gray-100"
                            />
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
                                updateUseRow(row.id, { quantity: value });
                              }}
                              disabled={!row.mobileFuelType}
                    />
          </div>
                </div>
                        {row.emissions !== undefined && (
                          <div className="mt-2 text-sm text-gray-700 font-medium">
                            Emissions: <span className="font-semibold">{row.emissions.toFixed(6)} kg CO2e</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Hybrid Vehicles - Scope 1 Fuel and Scope 2 Electricity */}
                {row.processingActivity === 'Hybrid vehicles' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Hybrid Vehicle Fuel & Energy Details</h4>
                    
                    {/* Scope 1 Style Fuel Selection */}
                    <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200 mb-4">
                      <h5 className="text-sm font-semibold text-purple-900 mb-3">Fuel</h5>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Type <FieldTooltip content="Select fuel type group" />
                          </Label>
                          <Select 
                            value={row.hybridFuelType || ''} 
                            onValueChange={(value) => {
                              updateUseRow(row.id, { 
                                hybridFuelType: value as FuelType,
                                hybridFuel: undefined,
                                hybridFuelUnit: undefined,
                                hybridFuelFactor: undefined,
                                hybridFuelEmissions: undefined,
                                hybridFuelQuantity: undefined,
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
                            value={row.hybridFuel || ''} 
                            onValueChange={(value) => {
                              updateUseRow(row.id, { 
                                hybridFuel: value,
                                hybridFuelUnit: undefined,
                                hybridFuelFactor: undefined,
                                hybridFuelEmissions: undefined,
                                hybridFuelQuantity: undefined,
                                emissions: undefined,
                              });
                            }}
                            disabled={!row.hybridFuelType}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select fuel" />
                            </SelectTrigger>
                            <SelectContent>
                              {row.hybridFuelType && Object.keys(FACTORS[row.hybridFuelType] || {}).map(f => (
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
                            value={row.hybridFuelUnit || ''} 
                            onValueChange={(value) => {
                              updateUseRow(row.id, { hybridFuelUnit: value });
                            }}
                            disabled={!row.hybridFuelType || !row.hybridFuel}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {row.hybridFuelType && row.hybridFuel && Object.keys(FACTORS[row.hybridFuelType]?.[row.hybridFuel] || {}).map(u => (
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
                            value={row.hybridFuelQuantity ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { hybridFuelQuantity: value });
                            }}
                            disabled={!row.hybridFuelType || !row.hybridFuel || !row.hybridFuelUnit}
                          />
                        </div>
                      </div>
                      {row.hybridFuelFactor !== undefined && (
                        <div className="mt-2 text-sm text-gray-600">
                          Emission Factor: <span className="font-semibold">{row.hybridFuelFactor.toFixed(6)}</span>
                        </div>
                      )}
                      {row.hybridFuelEmissions !== undefined && (
                        <div className="mt-2 text-sm text-gray-600">
                          Fuel Emissions: <span className="font-semibold">{row.hybridFuelEmissions.toFixed(6)} kg CO2e</span>
                        </div>
                      )}
                    </div>

                    {/* Scope 2 Style Electricity Selection */}
                    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Electricity</h5>
                      
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
                            value={row.hybridTotalKwh ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { hybridTotalKwh: value });
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
                            value={row.hybridGridPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { hybridGridPct: value });
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
                            value={row.hybridRenewablePct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { hybridRenewablePct: value });
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
                            value={row.hybridOtherPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { hybridOtherPct: value });
                            }}
                          />
                        </div>
                      </div>

                      {/* Grid sources section */}
                      {row.hybridGridPct && row.hybridGridPct > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Electricity provider country <FieldTooltip content="Select country for grid factor" />
                            </Label>
                            <Select 
                              value={row.hybridGridCountry || ''} 
                              onValueChange={(v) => updateUseRow(row.id, { hybridGridCountry: v as 'UAE' | 'Pakistan' })}
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
                        </div>
                      )}

                      {/* Other sources section */}
                      {row.hybridOtherPct && row.hybridOtherPct > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Other Energy Sources</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addHybridOtherSourceRow(row.id)}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Source
                            </Button>
                          </div>
                          {(row.hybridOtherSources || []).map((source) => (
                            <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded border">
                              <Select
                                value={source.type || ''}
                                onValueChange={(v) => updateHybridOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined, factor: undefined, emissions: undefined })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(FACTORS).map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.fuel || ''}
                                onValueChange={(v) => updateHybridOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined, factor: undefined, emissions: undefined })}
                                disabled={!source.type}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.unit || ''}
                                onValueChange={(v) => updateHybridOtherSourceRow(row.id, source.id, { unit: v })}
                                disabled={!source.type || !source.fuel}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
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
                                placeholder="Quantity"
                                value={source.quantity ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  updateHybridOtherSourceRow(row.id, source.id, { quantity: value });
                                }}
                                disabled={!source.type || !source.fuel || !source.unit}
                              />
                              <div className="flex items-center gap-2">
                                {source.emissions !== undefined && (
                                  <span className="text-xs text-gray-600 flex-1">
                                    {source.emissions.toFixed(2)} kg CO2e
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeHybridOtherSourceRow(row.id, source.id)}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                        {row.hybridFuelEmissions !== undefined && (
                          <div className="text-xs text-gray-600 mt-1">
                            (Fuel: {row.hybridFuelEmissions.toFixed(6)} kg CO2e)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Electricity Section for Electronics, Electric machinery, Batteries, Water-using devices, Electric vehicles, Home appliances */}
                {(row.processingActivity === 'Electronics (laptops, TVs, phones)' ||
                  row.processingActivity === 'Electric machinery/equipment' ||
                  row.processingActivity === 'Batteries' ||
                  row.processingActivity === 'Water-using devices' ||
                  row.processingActivity === 'Electric vehicles (cars, 2-wheelers, buses)' ||
                  row.processingActivity === 'Home appliances (ACs, fridges, fans, microwaves)') && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Electricity Consumption</h4>
                    
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
                          value={row.electricityTotalKwh ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateUseRow(row.id, { electricityTotalKwh: value });
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
                          value={row.electricityGridPct ?? ''}
                      onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateUseRow(row.id, { electricityGridPct: value });
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
                          value={row.electricityRenewablePct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateUseRow(row.id, { electricityRenewablePct: value });
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
                          value={row.electricityOtherPct ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateUseRow(row.id, { electricityOtherPct: value });
                      }}
                    />
        </div>
                </div>

                    {/* Grid sources section */}
                    {row.electricityGridPct && row.electricityGridPct > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Electricity provider country <FieldTooltip content="Select country for grid factor" />
                          </Label>
                          <Select 
                            value={row.electricityGridCountry || ''} 
                            onValueChange={(v) => updateUseRow(row.id, { electricityGridCountry: v as 'UAE' | 'Pakistan' })}
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
                            value={getGridFactor(row.electricityGridCountry) ?? ''} 
                            readOnly 
                            placeholder="Auto" 
                            className="bg-gray-100"
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Grid emissions <FieldTooltip content="Calculated grid emissions" />
                          </Label>
                          <Input
                            readOnly
                            value={row.electricityTotalKwh && row.electricityGridPct && getGridFactor(row.electricityGridCountry)
                              ? ((row.electricityGridPct / 100) * row.electricityTotalKwh * getGridFactor(row.electricityGridCountry)!).toFixed(6)
                              : ''}
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                    )}

                    {/* Other sources section */}
                    {row.electricityOtherPct && row.electricityOtherPct > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Other Energy Sources</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElectricityOtherSourceRow(row.id)}
                            className="text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Add Source
                          </Button>
                        </div>
                        {(row.electricityOtherSources || []).map((source) => (
                          <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded border">
                            <Select
                              value={source.type || ''}
                              onValueChange={(v) => updateElectricityOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined, factor: undefined, emissions: undefined })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.keys(FACTORS).map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={source.fuel || ''}
                              onValueChange={(v) => updateElectricityOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined, factor: undefined, emissions: undefined })}
                              disabled={!source.type}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Fuel" />
                              </SelectTrigger>
                              <SelectContent>
                                {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                  <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={source.unit || ''}
                              onValueChange={(v) => updateElectricityOtherSourceRow(row.id, source.id, { unit: v })}
                              disabled={!source.type || !source.fuel}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
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
                              placeholder="Quantity"
                              value={source.quantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                updateElectricityOtherSourceRow(row.id, source.id, { quantity: value });
                              }}
                              disabled={!source.type || !source.fuel || !source.unit}
                            />
                            <div className="flex items-center gap-2">
                              {source.emissions !== undefined && (
                                <span className="text-xs text-gray-600 flex-1">
                                  {source.emissions.toFixed(2)} kg CO2e
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeElectricityOtherSourceRow(row.id, source.id)}
                                className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Electricity Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Refrigerant Section for Refrigerants sold */}
                {row.processingActivity === 'Refrigerants sold' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Refrigerant Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Refrigerant Type <FieldTooltip content="Select the type of refrigerant" />
                        </Label>
                        <Select 
                          value={row.refrigerantType || ''} 
                          onValueChange={(v) => updateUseRow(row.id, { refrigerantType: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select refrigerant type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(REFRIGERANT_FACTORS).map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Quantity (kg) <FieldTooltip content="Enter quantity in kilograms" />
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          max="999999999999.999999"
                          placeholder="Enter quantity"
                          value={row.quantity ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateUseRow(row.id, { quantity: value });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Emission Factor <FieldTooltip content="Auto-calculated based on refrigerant type" />
                        </Label>
                        <Input 
                          value={row.refrigerantFactor !== undefined ? row.refrigerantFactor.toFixed(5) : ''} 
                          readOnly 
                          placeholder="Auto" 
                          className="bg-gray-100"
                        />
                      </div>
                    </div>

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Refrigerant Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Cooling Products Section - Electricity (Scope 2) and Refrigerant (Scope 1) */}
                {row.processingActivity === 'Cooling products (AC, refrigeration)' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Cooling Products: Electricity & Refrigerant Details</h4>
                    
                    {/* Electricity Section (Scope 2 Style) */}
                    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200 mb-4">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Electricity Consumption</h5>
                      
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
                            value={row.electricityTotalKwh ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { electricityTotalKwh: value });
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
                            value={row.electricityGridPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { electricityGridPct: value });
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
                            value={row.electricityRenewablePct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { electricityRenewablePct: value });
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
                            value={row.electricityOtherPct ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { electricityOtherPct: value });
                            }}
                          />
                        </div>
                      </div>

                      {/* Grid sources section */}
                      {row.electricityGridPct && row.electricityGridPct > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Electricity provider country <FieldTooltip content="Select country for grid factor" />
                            </Label>
                            <Select 
                              value={row.electricityGridCountry || ''} 
                              onValueChange={(v) => updateUseRow(row.id, { electricityGridCountry: v as 'UAE' | 'Pakistan' })}
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
                              value={getGridFactor(row.electricityGridCountry) ?? ''} 
                              readOnly 
                              placeholder="Auto" 
                              className="bg-gray-100"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 mb-2">
                              Grid emissions <FieldTooltip content="Calculated grid emissions" />
                            </Label>
                            <Input
                              readOnly
                              value={row.electricityTotalKwh && row.electricityGridPct && getGridFactor(row.electricityGridCountry)
                                ? ((row.electricityGridPct / 100) * row.electricityTotalKwh * getGridFactor(row.electricityGridCountry)!).toFixed(6)
                                : ''}
                              className="bg-gray-100"
                            />
                          </div>
                        </div>
                      )}

                      {/* Other sources section */}
                      {row.electricityOtherPct && row.electricityOtherPct > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Other Energy Sources</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addElectricityOtherSourceRow(row.id)}
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Source
                            </Button>
                          </div>
                          {(row.electricityOtherSources || []).map((source) => (
                            <div key={source.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded border">
                              <Select
                                value={source.type || ''}
                                onValueChange={(v) => updateElectricityOtherSourceRow(row.id, source.id, { type: v as FuelType, fuel: undefined, unit: undefined, factor: undefined, emissions: undefined })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(FACTORS).map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.fuel || ''}
                                onValueChange={(v) => updateElectricityOtherSourceRow(row.id, source.id, { fuel: v, unit: undefined, factor: undefined, emissions: undefined })}
                                disabled={!source.type}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                  {source.type && Object.keys(FACTORS[source.type] || {}).map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={source.unit || ''}
                                onValueChange={(v) => updateElectricityOtherSourceRow(row.id, source.id, { unit: v })}
                                disabled={!source.type || !source.fuel}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unit" />
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
                                placeholder="Quantity"
                                value={source.quantity ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : Number(e.target.value);
                                  updateElectricityOtherSourceRow(row.id, source.id, { quantity: value });
                                }}
                                disabled={!source.type || !source.fuel || !source.unit}
                              />
                              <div className="flex items-center gap-2">
                                {source.emissions !== undefined && (
                                  <span className="text-xs text-gray-600 flex-1">
                                    {source.emissions.toFixed(2)} kg CO2e
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeElectricityOtherSourceRow(row.id, source.id)}
                                  className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Refrigerant Section (Scope 1 Style) */}
                    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Refrigerant Details</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Refrigerant Type <FieldTooltip content="Select the type of refrigerant" />
                          </Label>
                          <Select 
                            value={row.refrigerantType || ''} 
                            onValueChange={(v) => updateUseRow(row.id, { refrigerantType: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select refrigerant type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(REFRIGERANT_FACTORS).map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Quantity (kg) <FieldTooltip content="Enter quantity in kilograms" />
                          </Label>
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            max="999999999999.999999"
                            placeholder="Enter quantity"
                            value={row.coolingRefrigerantQuantity ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? undefined : Number(e.target.value);
                              updateUseRow(row.id, { coolingRefrigerantQuantity: value });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1 mb-2">
                            Emission Factor <FieldTooltip content="Auto-calculated based on refrigerant type" />
                          </Label>
                          <Input 
                            value={row.refrigerantFactor !== undefined ? row.refrigerantFactor.toFixed(5) : ''} 
                            readOnly 
                            placeholder="Auto" 
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Emissions (Electricity + Refrigerant): <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gas-fired Industrial Machinery Section - Fuel (Scope 1 Style) */}
                {row.processingActivity === 'Gas-fired industrial machinery sold' && (
                  <div className="space-y-4 mb-4 p-4 bg-white rounded-lg border border-gray-300">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Fuel Details</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="flex items-center gap-1 mb-2">
                          Type <FieldTooltip content="Select fuel type group" />
                        </Label>
                        <Select 
                          value={row.gasMachineryFuelType || ''} 
                          onValueChange={(value) => {
                            updateUseRow(row.id, { 
                              gasMachineryFuelType: value as FuelType,
                              gasMachineryFuel: undefined,
                              gasMachineryUnit: undefined,
                              gasMachineryFactor: undefined,
                              gasMachineryQuantity: undefined,
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
                          value={row.gasMachineryFuel || ''} 
                          onValueChange={(value) => {
                            updateUseRow(row.id, { 
                              gasMachineryFuel: value,
                              gasMachineryUnit: undefined,
                              gasMachineryFactor: undefined,
                              gasMachineryQuantity: undefined,
                              emissions: undefined,
                            });
                          }}
                          disabled={!row.gasMachineryFuelType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.gasMachineryFuelType && Object.keys(FACTORS[row.gasMachineryFuelType] || {}).map(f => (
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
                          value={row.gasMachineryUnit || ''} 
                          onValueChange={(value) => {
                            updateUseRow(row.id, { gasMachineryUnit: value });
                          }}
                          disabled={!row.gasMachineryFuelType || !row.gasMachineryFuel}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.gasMachineryFuelType && row.gasMachineryFuel && Object.keys(FACTORS[row.gasMachineryFuelType]?.[row.gasMachineryFuel] || {}).map(u => (
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
                          max="999999999999.999999"
                          placeholder="Enter quantity"
                          value={row.gasMachineryQuantity ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : Number(e.target.value);
                            updateUseRow(row.id, { gasMachineryQuantity: value });
                          }}
                          disabled={!row.gasMachineryFuelType || !row.gasMachineryFuel || !row.gasMachineryUnit}
                        />
                      </div>
                    </div>

                    {row.gasMachineryFactor !== undefined && (
                      <div className="mt-2 text-sm text-gray-600">
                        Emission Factor: <span className="font-semibold">{row.gasMachineryFactor.toFixed(6)}</span>
                      </div>
                    )}

                    {row.emissions !== undefined && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="text-sm text-gray-700 font-medium">
                          Total Fuel Emissions: <span className="font-semibold text-gray-900">{row.emissions.toFixed(6)} kg CO2e</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setUseRows(prev => prev.filter(r => r.id !== row.id))}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Remove Entry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {useRows.length === 0 && (
              <Card>
                <CardContent className="p-12">
                  <div className="text-center text-gray-500">
                    <p className="text-lg mb-2">No entries yet</p>
                    <p className="text-sm">Click "Add New Entry" to get started.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Footer Section */}
          <Card className="bg-gray-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-gray-700 font-medium">
                  <span className="text-sm text-gray-600">Total Use Entries:</span> <span className="font-semibold text-lg">{useRows.length}</span>
                  {totalEmissions > 0 && (
                    <span className="ml-6">
                      <span className="text-sm text-gray-600">Total Emissions:</span> <span className="font-semibold text-lg text-teal-700">{totalEmissions.toFixed(6)} kg CO2e</span>
                    </span>
                  )}
                </div>
                <Button 
                  onClick={saveUseLocal}
                  disabled={useRows.length === 0 || savingUse} 
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingUse ? 'Saving...' : `Save and Next (${useRows.length})`}
                </Button>
              </div>
            </CardContent>
          </Card>
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



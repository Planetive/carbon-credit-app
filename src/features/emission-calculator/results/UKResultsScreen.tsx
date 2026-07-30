import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  exportFullEmissionReportPdf,
  mapEmissionResultsPageToCalculatorShape,
} from '@/utils/fullEmissionReportExport';
import type { EpaIpccResultsData } from '@/lib/epaIpccResults';
import ResultsSummaryCard from './components/ResultsSummaryCard';
import ScopeHighlightCards from './components/ScopeHighlightCards';
import EmissionsAnalyticsRow from './components/EmissionsAnalyticsRow';
import ResultsBreakdownTabs from './components/ResultsBreakdownTabs';

interface EmissionResultsData {
  scope1_completion: number;
  scope2_completion: number;
  scope3_completion: number;
  total_completion: number;
  status: string;
  submitted_at: string;
}

const UKResultsScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isEPA = searchParams.get('source') === 'epa';
  const [results, setResults] = useState<EmissionResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fuelEmissions, setFuelEmissions] = useState<number>(0);
  const [refrigerantEmissions, setRefrigerantEmissions] = useState<number>(0);
  const [passengerEmissions, setPassengerEmissions] = useState<number>(0);
  const [deliveryEmissions, setDeliveryEmissions] = useState<number>(0);
  // EPA-specific Scope 1 buckets
  const [epaMobileEmissions, setEpaMobileEmissions] = useState<number>(0);
  const [epaOnRoadGasEmissions, setEpaOnRoadGasEmissions] = useState<number>(0);
  const [epaOnRoadDieselEmissions, setEpaOnRoadDieselEmissions] = useState<number>(0);
  const [epaNonRoadEmissions, setEpaNonRoadEmissions] = useState<number>(0);
  // Scope 1 Heat and Steam (EPA) – same form as Fuel, separate table
  const [epaScope1HeatSteamEmissions, setEpaScope1HeatSteamEmissions] = useState<number>(0);
  const [electricityEmissions, setElectricityEmissions] = useState<number>(0);
  const [heatSteamEmissions, setHeatSteamEmissions] = useState<number>(0);
  // Scope 2 Purchased Heat and Steam (EPA)
  const [epaHeatSteamEmissions, setEpaHeatSteamEmissions] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  
  // Scope 3 emissions by category
  const [scope3PurchasedGoods, setScope3PurchasedGoods] = useState<number>(0);
  const [scope3CapitalGoods, setScope3CapitalGoods] = useState<number>(0);
  const [scope3FuelEnergy, setScope3FuelEnergy] = useState<number>(0);
  const [scope3UpstreamTransport, setScope3UpstreamTransport] = useState<number>(0);
  const [scope3WasteGenerated, setScope3WasteGenerated] = useState<number>(0);
  const [scope3BusinessTravel, setScope3BusinessTravel] = useState<number>(0);
  const [scope3EmployeeCommuting, setScope3EmployeeCommuting] = useState<number>(0);
  const [scope3Investments, setScope3Investments] = useState<number>(0);
  const [scope3Facilitated, setScope3Facilitated] = useState<number>(0);
  const [scope3DownstreamTransport, setScope3DownstreamTransport] = useState<number>(0);
  const [scope3EndOfLife, setScope3EndOfLife] = useState<number>(0);
  const [scope3ProcessingSold, setScope3ProcessingSold] = useState<number>(0);
  const [scope3UseOfSold, setScope3UseOfSold] = useState<number>(0);
  const [scope3LCAUpstream, setScope3LCAUpstream] = useState<number>(0);
  const [scope3LCADownstream, setScope3LCADownstream] = useState<number>(0);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState('scope1');

  useEffect(() => {
    if (isEPA) {
      navigate('/emission-results-calculator', { replace: true });
    }
  }, [isEPA, navigate]);

  const scope1Total = useMemo(() => {
    if (isEPA) {
      return (
        fuelEmissions +
        epaMobileEmissions +
        epaOnRoadGasEmissions +
        epaOnRoadDieselEmissions +
        epaNonRoadEmissions +
        epaScope1HeatSteamEmissions
      );
    }
    return fuelEmissions + refrigerantEmissions + passengerEmissions + deliveryEmissions;
  }, [
    isEPA,
    fuelEmissions,
    refrigerantEmissions,
    passengerEmissions,
    deliveryEmissions,
    epaMobileEmissions,
    epaOnRoadGasEmissions,
    epaOnRoadDieselEmissions,
    epaNonRoadEmissions,
    epaScope1HeatSteamEmissions,
  ]);

  const formatKg = (value: number) => {
    return value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const formatTonnes = (value: number) => {
    const tonnes = value / 1000;
    return tonnes.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const HIDDEN_DETAIL_COLUMNS = [
    "id",
    "user_id",
    "organization_id",
    "created_at",
    "updated_at",
    "counterparty_id",
    "factor",
    "emission_factor",
    "emissions_output",
    "emissions_output_unit",
    "standard",
  ];

  const applyFuelFrameworkFilter = (query: any) => {
    if (isEPA) return query.or("emission_framework.eq.epa,emission_framework.is.null");
    return query.eq("emission_framework", "uk");
  };

  const applyRefrigerantFrameworkFilter = (query: any) => {
    if (isEPA) return query.or("emission_framework.eq.epa,emission_framework.is.null");
    return query.eq("emission_framework", "uk");
  };

  const prettifyColumnLabel = (col: string) => {
    return col
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const loadCategoryDetails = async (key: string) => {
    if (!user) return;
    // Toggle off if same key clicked again
    if (detailKey === key) {
      setDetailKey(null);
      setDetailRows([]);
      setDetailError(null);
      return;
    }
    setDetailKey(key);
    setDetailLoading(true);
    setDetailError(null);
    try {
      let query: any = null;
      switch (key) {
        // Scope 1
        case 'fuel':
          query = applyFuelFrameworkFilter(
            (supabase as any).from('scope1_fuel_entries').select('*').eq('user_id', user.id)
          );
          break;
        case 'refrigerant':
          query = applyRefrigerantFrameworkFilter(
            (supabase as any).from('scope1_refrigerant_entries').select('*').eq('user_id', user.id)
          );
          break;
        case 'passenger':
          query = (supabase as any).from('scope1_passenger_vehicle_entries').select('*').eq('user_id', user.id);
          break;
        case 'delivery':
          query = (supabase as any).from('scope1_delivery_vehicle_entries').select('*').eq('user_id', user.id);
          break;
        case 'epa_mobile':
          query = (supabase as any).from('scope1_epa_mobile_fuel_entries').select('*').eq('user_id', user.id);
          break;
        case 'epa_on_road_gas':
          query = (supabase as any).from('scope1_epa_on_road_gasoline_entries').select('*').eq('user_id', user.id);
          break;
        case 'epa_on_road_diesel':
          query = (supabase as any).from('scope1_epa_on_road_diesel_alt_fuel_entries').select('*').eq('user_id', user.id);
          break;
        case 'epa_non_road':
          query = (supabase as any).from('scope1_epa_non_road_vehicle_entries').select('*').eq('user_id', user.id);
          break;
        case 'epa_scope1_heat_steam':
          query = (supabase as any).from('scope1_heatsteam_entries_epa').select('*').eq('user_id', user.id);
          break;
        case 'epa_heat_steam':
          query = (supabase as any).from('scope2_heatsteam_entries_epa').select('*').eq('user_id', user.id);
          break;
        // Scope 2
        case 'scope2_electricity':
          query = (supabase as any).from('scope2_electricity_subanswers').select('*').eq('user_id', user.id);
          break;
        case 'scope2_heatsteam':
          query = (supabase as any).from('scope2_heatsteam_entries').select('*').eq('user_id', user.id);
          break;
        // Scope 3 upstream
        case 'scope3_purchased_goods':
          query = (supabase as any).from('scope3_purchased_goods_services').select('*').eq('user_id', user.id);
          break;
        case 'scope3_capital_goods':
          query = (supabase as any).from('scope3_capital_goods').select('*').eq('user_id', user.id);
          break;
        case 'scope3_fuel_energy':
          query = (supabase as any).from('scope3_fuel_energy_activities').select('*').eq('user_id', user.id);
          break;
        case 'scope3_upstream_transport':
          query = (supabase as any).from('scope3_upstream_transportation').select('*').eq('user_id', user.id);
          break;
        case 'scope3_waste_generated':
          query = (supabase as any).from('scope3_waste_generated').select('*').eq('user_id', user.id);
          break;
        case 'scope3_business_travel':
          query = (supabase as any).from('scope3_business_travel').select('*').eq('user_id', user.id);
          break;
        case 'scope3_employee_commuting':
          query = (supabase as any).from('scope3_employee_commuting').select('*').eq('user_id', user.id);
          break;
        // Scope 3 downstream
        case 'scope3_downstream_transport':
          query = (supabase as any).from('scope3_downstream_transportation').select('*').eq('user_id', user.id);
          break;
        case 'scope3_processing_sold':
          query = (supabase as any).from('scope3_processing_sold_products').select('*').eq('user_id', user.id);
          break;
        case 'scope3_use_of_sold':
          query = (supabase as any).from('scope3_use_of_sold_products').select('*').eq('user_id', user.id);
          break;
        case 'scope3_end_of_life':
          query = (supabase as any).from('scope3_end_of_life_treatment').select('*').eq('user_id', user.id);
          break;
        case 'scope3_investments':
          query = (supabase as any).from('scope3_investments').select('*').eq('user_id', user.id);
          break;
        case 'scope3_facilitated':
          query = (supabase as any).from('scope3_facilitated_emissions').select('*').eq('user_id', user.id);
          break;
        default:
          query = null;
      }

      if (!query) {
        setDetailRows([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setDetailRows(data || []);
    } catch (e: any) {
      setDetailError(e.message || 'Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const breakdown = useMemo(() => {
    const baseData = isEPA
      ? [
          { key: 'fuel', label: 'Fuel', value: fuelEmissions, color: 'bg-rose-500' },
          { key: 'epa_mobile', label: 'Mobile fuel (EPA)', value: epaMobileEmissions, color: 'bg-amber-500' },
          { key: 'epa_on_road_gas', label: 'On-road gasoline (EPA)', value: epaOnRoadGasEmissions, color: 'bg-sky-500' },
          { key: 'epa_on_road_diesel', label: 'On-road diesel & alt fuel (EPA)', value: epaOnRoadDieselEmissions, color: 'bg-emerald-500' },
          { key: 'epa_non_road', label: 'Non-road vehicle (EPA)', value: epaNonRoadEmissions, color: 'bg-[#1D9E75]' },
          { key: 'epa_scope1_heat_steam', label: 'Heat and Steam', value: epaScope1HeatSteamEmissions, color: 'bg-amber-600' },
        ]
      : [
          { key: 'fuel', label: 'Fuel', value: fuelEmissions, color: 'bg-rose-500' },
          { key: 'refrigerant', label: 'Refrigerant', value: refrigerantEmissions, color: 'bg-amber-500' },
          { key: 'passenger', label: 'Passenger', value: passengerEmissions, color: 'bg-sky-500' },
          { key: 'delivery', label: 'Delivery', value: deliveryEmissions, color: 'bg-emerald-500' },
        ];
    return baseData.map(d => ({ ...d, pct: scope1Total > 0 ? (d.value / scope1Total) * 100 : 0 }));
  }, [
    isEPA,
    fuelEmissions,
    refrigerantEmissions,
    passengerEmissions,
    deliveryEmissions,
    epaMobileEmissions,
    epaOnRoadGasEmissions,
    epaOnRoadDieselEmissions,
    epaNonRoadEmissions,
    epaScope1HeatSteamEmissions,
    scope1Total,
  ]);

  const topContributor = useMemo(() => breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), [breakdown]);

  // Scope 2 breakdown (EPA: Electricity + Purchased Heat & Steam from scope2_heatsteam_entries_epa)
  const scope2Total = useMemo(
    () => (isEPA ? electricityEmissions + epaHeatSteamEmissions : electricityEmissions + heatSteamEmissions),
    [isEPA, electricityEmissions, heatSteamEmissions, epaHeatSteamEmissions]
  );
  const scope2Breakdown = useMemo(() => {
    if (isEPA) {
      const data = [
        { key: 'scope2_electricity', label: 'Electricity', value: electricityEmissions, color: 'bg-orange-500' },
        { key: 'epa_heat_steam', label: 'Heat and Steam', value: epaHeatSteamEmissions, color: 'bg-amber-600' },
      ];
      const total = scope2Total;
      return data.map(d => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));
    }
    const data = [
      { key: 'scope2_electricity', label: 'Electricity', value: electricityEmissions, color: 'bg-orange-500' },
      { key: 'scope2_heatsteam', label: 'Heat & Steam', value: heatSteamEmissions, color: 'bg-amber-600' },
    ];
    return data.map(d => ({ ...d, pct: scope2Total > 0 ? (d.value / scope2Total) * 100 : 0 }));
  }, [isEPA, electricityEmissions, heatSteamEmissions, epaHeatSteamEmissions, scope2Total]);
  const topContributorS2 = useMemo(() => scope2Breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), [scope2Breakdown]);

  // Scope 3 total and breakdown (excluding LCA entries as they are separate)
  const scope3Total = useMemo(() => {
    return scope3PurchasedGoods + scope3CapitalGoods + scope3FuelEnergy + 
           scope3UpstreamTransport + scope3WasteGenerated + scope3BusinessTravel + 
           scope3EmployeeCommuting + scope3Investments + scope3Facilitated + scope3DownstreamTransport + 
           scope3EndOfLife + scope3ProcessingSold + scope3UseOfSold;
  }, [scope3PurchasedGoods, scope3CapitalGoods, scope3FuelEnergy, scope3UpstreamTransport, 
      scope3WasteGenerated, scope3BusinessTravel, scope3EmployeeCommuting, scope3Investments, scope3Facilitated,
      scope3DownstreamTransport, scope3EndOfLife, scope3ProcessingSold, scope3UseOfSold]);

  // Scope 3 Upstream Emissions (Categories 1-8)
  const scope3UpstreamTotal = useMemo(() => {
    return scope3PurchasedGoods + scope3CapitalGoods + scope3FuelEnergy + 
           scope3UpstreamTransport + scope3WasteGenerated + scope3BusinessTravel + 
           scope3EmployeeCommuting;
  }, [scope3PurchasedGoods, scope3CapitalGoods, scope3FuelEnergy, scope3UpstreamTransport, 
      scope3WasteGenerated, scope3BusinessTravel, scope3EmployeeCommuting]);

  // Scope 3 Downstream Emissions (Categories 9-15)
  const scope3DownstreamTotal = useMemo(() => {
    return scope3DownstreamTransport + scope3ProcessingSold + scope3UseOfSold + 
           scope3EndOfLife + scope3Investments + scope3Facilitated;
  }, [scope3DownstreamTransport, scope3ProcessingSold, scope3UseOfSold, 
      scope3EndOfLife, scope3Investments, scope3Facilitated]);

  const scope3UpstreamBreakdown = useMemo(() => {
    const data = [
      { key: 'scope3_purchased_goods', label: 'Purchased Goods & Services', value: scope3PurchasedGoods, color: 'bg-purple-500', category: 'upstream' },
      { key: 'scope3_capital_goods', label: 'Capital Goods', value: scope3CapitalGoods, color: 'bg-indigo-500', category: 'upstream' },
      { key: 'scope3_fuel_energy', label: 'Fuel & Energy Activities', value: scope3FuelEnergy, color: 'bg-violet-500', category: 'upstream' },
      { key: 'scope3_upstream_transport', label: 'Upstream Transportation', value: scope3UpstreamTransport, color: 'bg-blue-500', category: 'upstream' },
      { key: 'scope3_waste_generated', label: 'Waste Generated', value: scope3WasteGenerated, color: 'bg-[#EDF8F3]0', category: 'upstream' },
      { key: 'scope3_business_travel', label: 'Business Travel', value: scope3BusinessTravel, color: 'bg-[#1D9E75]', category: 'upstream' },
      { key: 'scope3_employee_commuting', label: 'Employee Commuting', value: scope3EmployeeCommuting, color: 'bg-green-500', category: 'upstream' },
    ];
    return data.map(d => ({ ...d, pct: scope3UpstreamTotal > 0 ? (d.value / scope3UpstreamTotal) * 100 : 0 }));
  }, [scope3PurchasedGoods, scope3CapitalGoods, scope3FuelEnergy, scope3UpstreamTransport, 
      scope3WasteGenerated, scope3BusinessTravel, scope3EmployeeCommuting, scope3UpstreamTotal]);

  const scope3DownstreamBreakdown = useMemo(() => {
    const data = [
      { key: 'scope3_downstream_transport', label: 'Downstream Transportation', value: scope3DownstreamTransport, color: 'bg-lime-500', category: 'downstream' },
      { key: 'scope3_processing_sold', label: 'Processing of Sold Products', value: scope3ProcessingSold, color: 'bg-orange-500', category: 'downstream' },
      { key: 'scope3_use_of_sold', label: 'Use of Sold Products', value: scope3UseOfSold, color: 'bg-red-500', category: 'downstream' },
      { key: 'scope3_end_of_life', label: 'End of Life Treatment', value: scope3EndOfLife, color: 'bg-yellow-500', category: 'downstream' },
      { key: 'scope3_investments', label: 'Category 15 — Investments & finance', value: scope3Investments, color: 'bg-emerald-500', category: 'downstream' },
      { key: 'scope3_facilitated', label: 'Category 16 — Facilitated emissions', value: scope3Facilitated, color: 'bg-[#1D9E75]', category: 'downstream' },
    ];
    return data.map(d => ({ ...d, pct: scope3DownstreamTotal > 0 ? (d.value / scope3DownstreamTotal) * 100 : 0 }));
  }, [scope3DownstreamTransport, scope3ProcessingSold, scope3UseOfSold, 
      scope3EndOfLife, scope3Investments, scope3Facilitated, scope3DownstreamTotal]);

  // Combined breakdown for CSV export
  const scope3Breakdown = useMemo(() => {
    return [...scope3UpstreamBreakdown, ...scope3DownstreamBreakdown];
  }, [scope3UpstreamBreakdown, scope3DownstreamBreakdown]);

  const topContributorS3 = useMemo(() => 
    scope3Breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), 
    [scope3Breakdown]
  );

  const exportCsv = () => {
    const scope2TotalLocal = scope2Total;
    const grandTotal = scope1Total + scope2TotalLocal + scope3Total;

    // Build a comprehensive CSV across all scopes
    const rows: (string | number)[][] = [];

    // Meta header
    rows.push(['Generated At', new Date().toISOString()]);
    rows.push([]);

    // Scope 1 breakdown
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)', 'Share (%)']);
    breakdown.forEach(b => {
      rows.push(['Scope 1', b.label, b.value.toFixed(6), b.pct.toFixed(2)]);
    });
    rows.push(['Scope 1', 'Total', scope1Total.toFixed(6), '100.00']);
    rows.push([]);

    // Scope 2 breakdown (respect EPA vs UK breakdown)
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)', 'Share (%)']);
    scope2Breakdown.forEach(b => {
      rows.push(['Scope 2', b.label, b.value.toFixed(6), b.pct.toFixed(2)]);
    });
    rows.push(['Scope 2', 'Total', scope2TotalLocal.toFixed(6), '100.00']);
    rows.push([]);

    // Scope 3 breakdown - Upstream
    rows.push(['Scope 3', 'Upstream Emissions', '', '']);
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)', 'Share (%)']);
    scope3UpstreamBreakdown.forEach(b => {
      rows.push(['Scope 3', b.label, b.value.toFixed(6), b.pct.toFixed(2)]);
    });
    rows.push(['Scope 3', 'Upstream Total', scope3UpstreamTotal.toFixed(6), scope3Total > 0 ? ((scope3UpstreamTotal / scope3Total) * 100).toFixed(2) : '0.00']);
    rows.push([]);
    
    // Scope 3 breakdown - Downstream
    rows.push(['Scope 3', 'Downstream Emissions', '', '']);
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)', 'Share (%)']);
    scope3DownstreamBreakdown.forEach(b => {
      rows.push(['Scope 3', b.label, b.value.toFixed(6), b.pct.toFixed(2)]);
    });
    rows.push(['Scope 3', 'Downstream Total', scope3DownstreamTotal.toFixed(6), scope3Total > 0 ? ((scope3DownstreamTotal / scope3Total) * 100).toFixed(2) : '0.00']);
    rows.push([]);
    
    // Scope 3 Grand Total
    rows.push(['Scope 3', 'Total', scope3Total.toFixed(6), '100.00']);
    rows.push([]);

    // Grand total
    rows.push(['All Scopes', 'Grand Total', grandTotal.toFixed(6)]);

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emissions-all-scopes.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsvScope2 = () => {
    const rows: (string | number)[][] = [];
    rows.push(['Generated At', new Date().toISOString()]);
    rows.push([]);
    rows.push(['Scope 2', 'Category', 'Emissions (kg CO2e)', 'Share (%)']);
    scope2Breakdown.forEach(b => rows.push(['Scope 2', b.label, b.value.toFixed(6), b.pct.toFixed(2)]));
    rows.push(['Scope 2', 'Total', scope2Total.toFixed(6), '100.00']);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'emissions-scope2.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!user) return;
    setIsGeneratingPdf(true);
    try {
      const mapped = mapEmissionResultsPageToCalculatorShape(breakdown, scope2Breakdown, scope3Breakdown);
      await exportFullEmissionReportPdf({
        user,
        results: mapped,
        isMariUser: isEPA,
        fuelFramework: isEPA ? "epa" : "uk",
        submittedAt: results?.submitted_at,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    const loadScope1Totals = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [
          fuelRes,
          refRes,
          passRes,
          delRes,
          mobileEpaRes,
          onRoadGasRes,
          onRoadDieselRes,
          nonRoadEpaRes,
        ] = await Promise.all([
          applyFuelFrameworkFilter(
            (supabase as any).from('scope1_fuel_entries').select('emissions').eq('user_id', user.id)
          ),
          applyRefrigerantFrameworkFilter(
            (supabase as any).from('scope1_refrigerant_entries').select('emissions').eq('user_id', user.id)
          ),
          supabase.from('scope1_passenger_vehicle_entries').select('emissions').eq('user_id', user.id),
          supabase.from('scope1_delivery_vehicle_entries').select('emissions').eq('user_id', user.id),
          // EPA Scope 1 tables (new calculators)
          (supabase as any).from('scope1_epa_mobile_fuel_entries').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope1_epa_on_road_gasoline_entries').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope1_epa_on_road_diesel_alt_fuel_entries').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope1_epa_non_road_vehicle_entries').select('emissions').eq('user_id', user.id),
        ]);

        const sum = (arr: any[] | null | undefined) => (arr || []).reduce((s, r) => s + (Number(r.emissions) || 0), 0);

        // Include EPA Scope 1 calculators inside the "Fuel" bucket so they show
        // up in the existing Scope 1 breakdown and totals.
        const epaMobile = sum(mobileEpaRes.data);
        const epaOnRoadGas = sum(onRoadGasRes.data);
        const epaOnRoadDiesel = sum(onRoadDieselRes.data);
        const epaNonRoad = sum(nonRoadEpaRes.data);

        // Base fuel always includes stationary fuel entries.
        setFuelEmissions(sum(fuelRes.data));
        // Store EPA-specific scope 1 buckets separately for EPA results view.
        setEpaMobileEmissions(epaMobile);
        setEpaOnRoadGasEmissions(epaOnRoadGas);
        setEpaOnRoadDieselEmissions(epaOnRoadDiesel);
        setEpaNonRoadEmissions(epaNonRoad);
        setRefrigerantEmissions(sum(refRes.data));
        setPassengerEmissions(sum(passRes.data));
        setDeliveryEmissions(sum(delRes.data));

        // Scope 2 - Electricity: pull latest main and its subanswers
        const { data: mainRow } = await (supabase as any)
          .from('scope2_electricity_main')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let elecTotal = 0;
        if (mainRow) {
          const totalKwh = Number(mainRow.total_kwh) || 0;
          const gridPct = Number(mainRow.grid_pct) || 0;
          const otherPct = Number(mainRow.other_pct) || 0;

          const { data: subs } = await (supabase as any)
            .from('scope2_electricity_subanswers')
            .select('*')
            .eq('user_id', user.id)
            .eq('main_id', mainRow.id);

          const gridRow = (subs || []).find((r: any) => r.type === 'grid');
          const gridFactor = gridRow?.grid_emission_factor ? Number(gridRow.grid_emission_factor) : 0;
          const gridPart = totalKwh > 0 && gridPct > 0 && gridFactor > 0 ? (gridPct / 100) * totalKwh * gridFactor : 0;

          const otherRows = (subs || []).filter((r: any) => r.type === 'other');
          const sumOtherEmissions = otherRows.reduce((s: number, r: any) => s + (Number(r.other_sources_emissions) || 0), 0);
          const otherPart = totalKwh > 0 && otherPct > 0 ? (otherPct / 100) * totalKwh * sumOtherEmissions : 0;

          elecTotal = Number((gridPart + otherPart).toFixed(6));
        }
        setElectricityEmissions(elecTotal);

        // Scope 2 - Heat & Steam (UK table)
        const { data: heatRows } = await (supabase as any)
          .from('scope2_heatsteam_entries')
          .select('emissions')
          .eq('user_id', user.id);
        const heatTotal = (heatRows || []).reduce((s: number, r: any) => s + (Number(r.emissions) || 0), 0);
        const heatTotalRounded = Number(heatTotal.toFixed(6));
        setHeatSteamEmissions(heatTotalRounded);

        // Scope 2 - Heat & Steam (EPA table, separate storage)
        const { data: epaHeatRows } = await (supabase as any)
          .from('scope2_heatsteam_entries_epa')
          .select('emissions')
          .eq('user_id', user.id);
        const epaHeatTotal = (epaHeatRows || []).reduce((s: number, r: any) => s + (Number(r.emissions) || 0), 0);
        setEpaHeatSteamEmissions(Number(epaHeatTotal.toFixed(6)));

        // Scope 1 - Heat and Steam (EPA, same form as Fuel, separate table)
        const { data: scope1HeatSteamRows } = await (supabase as any)
          .from('scope1_heatsteam_entries_epa')
          .select('emissions')
          .eq('user_id', user.id);
        const scope1HeatSteamTotal = (scope1HeatSteamRows || []).reduce((s: number, r: any) => s + (Number(r.emissions) || 0), 0);
        setEpaScope1HeatSteamEmissions(Number(scope1HeatSteamTotal.toFixed(6)));

        // Scope 3 - Load all categories
        const [
          purchasedGoodsRes,
          capitalGoodsRes,
          fuelEnergyRes,
          upstreamTransportRes,
          wasteGeneratedRes,
          businessTravelRes,
          employeeCommutingRes,
          investmentsRes,
          facilitatedRes,
          downstreamTransportRes,
          endOfLifeRes,
          processingSoldRes,
          useOfSoldRes,
          lcaRes,
        ] = await Promise.all([
          (supabase as any).from('scope3_purchased_goods_services').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_capital_goods').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_fuel_energy_activities').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_upstream_transportation').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_waste_generated').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_business_travel').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_employee_commuting').select('emissions').eq('user_id', user.id),
          (supabase as any)
            .from('scope3_investments')
            .select('calculated_emissions, emissions, ownership_percentage')
            .eq('user_id', user.id),
          (supabase as any).from('scope3_facilitated_emissions').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_downstream_transportation').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_end_of_life_treatment').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_processing_sold_products').select('row_data').eq('user_id', user.id),
          (supabase as any).from('scope3_use_of_sold_products').select('row_data').eq('user_id', user.id),
          (supabase as any).from('scope3_lca_entries').select('emissions').eq('user_id', user.id).in('scope_type', ['scope3_upstream', 'scope3_downstream']),
        ]);

        const sumScope3 = (arr: any[] | null | undefined) => (arr || []).reduce((s, r) => s + (Number(r.emissions) || 0), 0);
        const sumInvestmentAttributed = (arr: any[] | null | undefined) =>
          (arr || []).reduce((s, r) => {
            const c = Number(r?.calculated_emissions);
            if (Number.isFinite(c)) return s + c;
            const inv = Number(r?.emissions) || 0;
            const pct = Number(r?.ownership_percentage) || 0;
            return s + (inv * pct) / 100;
          }, 0);

        setScope3PurchasedGoods(sumScope3(purchasedGoodsRes.data));
        setScope3CapitalGoods(sumScope3(capitalGoodsRes.data));
        setScope3FuelEnergy(sumScope3(fuelEnergyRes.data));
        setScope3UpstreamTransport(sumScope3(upstreamTransportRes.data));
        setScope3WasteGenerated(sumScope3(wasteGeneratedRes.data));
        setScope3BusinessTravel(sumScope3(businessTravelRes.data));
        setScope3EmployeeCommuting(sumScope3(employeeCommutingRes.data));
        setScope3Investments(sumInvestmentAttributed(investmentsRes.data));
        setScope3Facilitated(sumScope3(facilitatedRes.data));
        setScope3DownstreamTransport(sumScope3(downstreamTransportRes.data));
        setScope3EndOfLife(sumScope3(endOfLifeRes.data));

        // Processing and Use of Sold Products - extract emissions from JSONB
        const processingTotal = (processingSoldRes.data || []).reduce((s: number, r: any) => {
          const rowData = r.row_data;
          if (rowData && typeof rowData.emissions === 'number') {
            return s + rowData.emissions;
          }
          return s;
        }, 0);
        setScope3ProcessingSold(processingTotal);

        const useTotal = (useOfSoldRes.data || []).reduce((s: number, r: any) => {
          const rowData = r.row_data;
          if (rowData && typeof rowData.emissions === 'number') {
            return s + rowData.emissions;
          }
          return s;
        }, 0);
        setScope3UseOfSold(useTotal);

        // LCA entries are loaded but not included in Scope 3 totals (they are separate)
        const lcaUpstream = (lcaRes.data || []).filter((r: any) => r.scope_type === 'scope3_upstream');
        const lcaDownstream = (lcaRes.data || []).filter((r: any) => r.scope_type === 'scope3_downstream');
        setScope3LCAUpstream(sumScope3(lcaUpstream));
        setScope3LCADownstream(sumScope3(lcaDownstream));

        // Keep minimal meta so existing UI sections render (excluding LCA entries)
        const scope3TotalCalc = sumScope3(purchasedGoodsRes.data) + sumScope3(capitalGoodsRes.data) + 
          sumScope3(fuelEnergyRes.data) + sumScope3(upstreamTransportRes.data) + sumScope3(wasteGeneratedRes.data) + 
          sumScope3(businessTravelRes.data) + sumScope3(employeeCommutingRes.data) + sumInvestmentAttributed(investmentsRes.data) + 
          sumScope3(facilitatedRes.data) +
          sumScope3(downstreamTransportRes.data) + sumScope3(endOfLifeRes.data) + processingTotal + useTotal;

        setResults({
          scope1_completion: 100,
          scope2_completion: 100,
          scope3_completion: scope3TotalCalc > 0 ? 100 : 0,
          total_completion: 100,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
        // Trigger animation after data loads
        setTimeout(() => setMounted(true), 100);
      }
    };
    loadScope1Totals();
  }, [user]);


  const mappedResults: EpaIpccResultsData = useMemo(() => {
    const scope1 = breakdown.map(({ key, label, value }) => ({ key, label, value }));
    const scope2 = scope2Breakdown.map(({ key, label, value }) => ({ key, label, value }));
    const scope3 = scope3Breakdown.map(({ key, label, value }) => ({ key, label, value }));
    return {
      scope1,
      scope2,
      scope3,
      totals: {
        scope1: scope1Total,
        scope2: scope2Total,
        scope3: scope3Total,
        grand: scope1Total + scope2Total + scope3Total,
      },
    };
  }, [breakdown, scope2Breakdown, scope3Breakdown, scope1Total, scope2Total, scope3Total]);

  const categoriesWithScope = useMemo(
    () => [
      ...mappedResults.scope1.map((r) => ({ ...r, scope: "Scope 1" as const })),
      ...mappedResults.scope2.map((r) => ({ ...r, scope: "Scope 2" as const })),
      ...mappedResults.scope3.map((r) => ({ ...r, scope: "Scope 3" as const })),
    ],
    [mappedResults]
  );

  const categoriesCalculated = useMemo(
    () => categoriesWithScope.filter((r) => r.value > 0).length,
    [categoriesWithScope]
  );

  const submittedAt = results?.submitted_at || new Date().toISOString();

  const formatDetailValue = (column: string, value: any): string => {
    if (value == null) return "";
    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    return String(value);
  };

  const isNumericDetailColumn = (column: string, rows: any[]): boolean => {
    return rows.some((row) => {
      const v = row?.[column];
      return (
        typeof v === "number" ||
        column === "emissions" ||
        column === "quantity" ||
        /(_kg|_liters|_miles|_factor|_pct|_percent)$/i.test(column)
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#F8FAFC] flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D9E75] mx-auto mb-3" />
          <p className="text-slate-600">Loading assessment results…</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-full bg-[#F8FAFC] flex items-center justify-center px-4 py-24">
        <Card className="w-full max-w-lg border-slate-200 shadow-sm">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-slate-700">No results found yet for this emission calculator assessment.</p>
            <Button
              onClick={() => navigate("/emission-calculator-uk")}
              className="bg-[#1D9E75] hover:bg-[#178A66] text-white"
            >
              Back to calculator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <div className="w-full px-3 sm:px-4 py-5 sm:py-6 space-y-6">
        <ResultsSummaryCard
          grandTotalKg={mappedResults.totals.grand}
          categoriesCalculated={categoriesCalculated}
          submittedAt={submittedAt}
          methodologyLabel="DEFRA / GHG Protocol"
          onEditAssessment={() => navigate("/emission-calculator-uk")}
          onExportPdf={exportPdf}
          onExportExcel={exportCsv}
          isGeneratingPdf={isGeneratingPdf}
        />

        <ScopeHighlightCards
          scope1Kg={mappedResults.totals.scope1}
          scope2Kg={mappedResults.totals.scope2}
          scope3Kg={mappedResults.totals.scope3}
          grandKg={mappedResults.totals.grand}
        />

        <EmissionsAnalyticsRow
          scope1Kg={mappedResults.totals.scope1}
          scope2Kg={mappedResults.totals.scope2}
          scope3Kg={mappedResults.totals.scope3}
          grandKg={mappedResults.totals.grand}
          categories={categoriesWithScope}
        />

        <ResultsBreakdownTabs
          results={mappedResults}
          detailKey={detailKey}
          detailRows={detailRows}
          detailLoading={detailLoading}
          detailError={detailError}
          onToggleDetails={loadCategoryDetails}
          formatDetailValue={formatDetailValue}
          isNumericDetailColumn={isNumericDetailColumn}
          prettifyColumnLabel={prettifyColumnLabel}
          hiddenDetailColumns={HIDDEN_DETAIL_COLUMNS}
          activeTab={breakdownTab}
          onTabChange={setBreakdownTab}
        />
      </div>
    </div>
  );
};

export default UKResultsScreen;

import React, { useEffect, useState, useMemo, Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Share2, BarChart3, TrendingDown, Factory, Leaf, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface EmissionResultsData {
  scope1_completion: number;
  scope2_completion: number;
  scope3_completion: number;
  total_completion: number;
  status: string;
  submitted_at: string;
}

const EmissionResults = () => {
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
  const [electricityEmissions, setElectricityEmissions] = useState<number>(0);
  const [heatSteamEmissions, setHeatSteamEmissions] = useState<number>(0);
  // For EPA view, treat heat & steam as Scope 1
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

  const scope1Total = useMemo(() => {
    if (isEPA) {
      return (
        fuelEmissions +
        epaMobileEmissions +
        epaOnRoadGasEmissions +
        epaOnRoadDieselEmissions +
        epaNonRoadEmissions +
        epaHeatSteamEmissions
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
    epaHeatSteamEmissions,
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
          query = (supabase as any).from('scope1_fuel_entries').select('*').eq('user_id', user.id);
          break;
        case 'refrigerant':
          query = (supabase as any).from('scope1_refrigerant_entries').select('*').eq('user_id', user.id);
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
        case 'epa_heat_steam':
          query = (supabase as any).from('scope2_heatsteam_entries').select('*').eq('user_id', user.id);
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
          { key: 'epa_non_road', label: 'Non-road vehicle (EPA)', value: epaNonRoadEmissions, color: 'bg-teal-500' },
          { key: 'epa_heat_steam', label: 'Heat & Steam (EPA)', value: epaHeatSteamEmissions, color: 'bg-amber-600' },
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
    epaHeatSteamEmissions,
    scope1Total,
  ]);

  const topContributor = useMemo(() => breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), [breakdown]);

  // Scope 2 breakdown
  const scope2Total = useMemo(
    () => (isEPA ? electricityEmissions : electricityEmissions + heatSteamEmissions),
    [isEPA, electricityEmissions, heatSteamEmissions]
  );
  const scope2Breakdown = useMemo(() => {
    if (isEPA) {
      const data = [
        { key: 'scope2_electricity', label: 'Electricity', value: electricityEmissions, color: 'bg-orange-500' },
      ];
      const total = electricityEmissions;
      return data.map(d => ({ ...d, pct: total > 0 ? (d.value / total) * 100 : 0 }));
    }
    const data = [
      { key: 'scope2_electricity', label: 'Electricity', value: electricityEmissions, color: 'bg-orange-500' },
      { key: 'scope2_heatsteam', label: 'Heat & Steam', value: heatSteamEmissions, color: 'bg-amber-600' },
    ];
    return data.map(d => ({ ...d, pct: scope2Total > 0 ? (d.value / scope2Total) * 100 : 0 }));
  }, [isEPA, electricityEmissions, heatSteamEmissions, scope2Total]);
  const topContributorS2 = useMemo(() => scope2Breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), [scope2Breakdown]);

  // Scope 3 total and breakdown (excluding LCA entries as they are separate)
  const scope3Total = useMemo(() => {
    return scope3PurchasedGoods + scope3CapitalGoods + scope3FuelEnergy + 
           scope3UpstreamTransport + scope3WasteGenerated + scope3BusinessTravel + 
           scope3EmployeeCommuting + scope3Investments + scope3DownstreamTransport + 
           scope3EndOfLife + scope3ProcessingSold + scope3UseOfSold;
  }, [scope3PurchasedGoods, scope3CapitalGoods, scope3FuelEnergy, scope3UpstreamTransport, 
      scope3WasteGenerated, scope3BusinessTravel, scope3EmployeeCommuting, scope3Investments, 
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
           scope3EndOfLife + scope3Investments;
  }, [scope3DownstreamTransport, scope3ProcessingSold, scope3UseOfSold, 
      scope3EndOfLife, scope3Investments]);

  const scope3UpstreamBreakdown = useMemo(() => {
    const data = [
      { key: 'scope3_purchased_goods', label: 'Purchased Goods & Services', value: scope3PurchasedGoods, color: 'bg-purple-500', category: 'upstream' },
      { key: 'scope3_capital_goods', label: 'Capital Goods', value: scope3CapitalGoods, color: 'bg-indigo-500', category: 'upstream' },
      { key: 'scope3_fuel_energy', label: 'Fuel & Energy Activities', value: scope3FuelEnergy, color: 'bg-violet-500', category: 'upstream' },
      { key: 'scope3_upstream_transport', label: 'Upstream Transportation', value: scope3UpstreamTransport, color: 'bg-blue-500', category: 'upstream' },
      { key: 'scope3_waste_generated', label: 'Waste Generated', value: scope3WasteGenerated, color: 'bg-cyan-500', category: 'upstream' },
      { key: 'scope3_business_travel', label: 'Business Travel', value: scope3BusinessTravel, color: 'bg-teal-500', category: 'upstream' },
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
      { key: 'scope3_investments', label: 'Investments', value: scope3Investments, color: 'bg-emerald-500', category: 'downstream' },
    ];
    return data.map(d => ({ ...d, pct: scope3DownstreamTotal > 0 ? (d.value / scope3DownstreamTotal) * 100 : 0 }));
  }, [scope3DownstreamTransport, scope3ProcessingSold, scope3UseOfSold, 
      scope3EndOfLife, scope3Investments, scope3DownstreamTotal]);

  // Combined breakdown for CSV export
  const scope3Breakdown = useMemo(() => {
    return [...scope3UpstreamBreakdown, ...scope3DownstreamBreakdown];
  }, [scope3UpstreamBreakdown, scope3DownstreamBreakdown]);

  const topContributorS3 = useMemo(() => 
    scope3Breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), 
    [scope3Breakdown]
  );

  const exportCsv = () => {
    const scope2Total = electricityEmissions + heatSteamEmissions;
    const grandTotal = scope1Total + scope2Total + scope3Total;

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

    // Scope 2 breakdown
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)']);
    rows.push(['Scope 2', 'Electricity', electricityEmissions.toFixed(6)]);
    rows.push(['Scope 2', 'Heat & Steam', heatSteamEmissions.toFixed(6)]);
    rows.push(['Scope 2', 'Total', scope2Total.toFixed(6)]);
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
          supabase.from('scope1_fuel_entries').select('emissions').eq('user_id', user.id),
          supabase.from('scope1_refrigerant_entries').select('emissions').eq('user_id', user.id),
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

        // Scope 2 - Heat & Steam
        const { data: heatRows } = await (supabase as any)
          .from('scope2_heatsteam_entries')
          .select('emissions')
          .eq('user_id', user.id);
        const heatTotal = (heatRows || []).reduce((s: number, r: any) => s + (Number(r.emissions) || 0), 0);
        const heatTotalRounded = Number(heatTotal.toFixed(6));
        setHeatSteamEmissions(heatTotalRounded);
        // For EPA view, we treat all heat & steam as Scope 1 contribution.
        setEpaHeatSteamEmissions(heatTotalRounded);

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
          (supabase as any).from('scope3_investments').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_downstream_transportation').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_end_of_life_treatment').select('emissions').eq('user_id', user.id),
          (supabase as any).from('scope3_processing_sold_products').select('row_data').eq('user_id', user.id),
          (supabase as any).from('scope3_use_of_sold_products').select('row_data').eq('user_id', user.id),
          (supabase as any).from('scope3_lca_entries').select('emissions').eq('user_id', user.id).in('scope_type', ['scope3_upstream', 'scope3_downstream']),
        ]);

        const sumScope3 = (arr: any[] | null | undefined) => (arr || []).reduce((s, r) => s + (Number(r.emissions) || 0), 0);

        setScope3PurchasedGoods(sumScope3(purchasedGoodsRes.data));
        setScope3CapitalGoods(sumScope3(capitalGoodsRes.data));
        setScope3FuelEnergy(sumScope3(fuelEnergyRes.data));
        setScope3UpstreamTransport(sumScope3(upstreamTransportRes.data));
        setScope3WasteGenerated(sumScope3(wasteGeneratedRes.data));
        setScope3BusinessTravel(sumScope3(businessTravelRes.data));
        setScope3EmployeeCommuting(sumScope3(employeeCommutingRes.data));
        setScope3Investments(sumScope3(investmentsRes.data));
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
          sumScope3(businessTravelRes.data) + sumScope3(employeeCommutingRes.data) + sumScope3(investmentsRes.data) + 
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-teal-200 border-t-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium text-lg">Loading emission results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        </div>
        <div className="text-center relative z-10">
          <p className="text-gray-700 mb-4 text-lg">No emission results found</p>
          <Button onClick={() => navigate(isEPA ? '/emission-calculator-epa' : '/emission-calculator')} className="bg-teal-600 hover:bg-teal-700">
            Go to {isEPA ? 'EPA Calculator' : 'Emission Calculator'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Global Styles for Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes shimmer {
          0% {
            background-position: -1000px 0;
          }
          100% {
            background-position: 1000px 0;
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slideInRight 0.6s ease-out forwards;
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .progress-bar-animate {
          transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
        {/* Animated Background with Blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          
          {/* Floating particles */}
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-teal-300/20 animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${Math.random() * 4 + 4}s`,
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10">
          {/* Hero Section */}
          <div 
            className={`relative glass-effect rounded-3xl shadow-2xl mx-4 sm:mx-6 lg:mx-auto mt-6 sm:mt-8 max-w-7xl overflow-hidden ${
              mounted ? 'animate-fade-in-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '0.1s' }}
          >
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 animate-shimmer pointer-events-none"></div>
            
            <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-center">
    {/* Icon + Title */}
              <div className="flex flex-col items-center mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="relative">
                    <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 text-teal-600 relative z-10" />
                    <Sparkles className="h-6 w-6 text-teal-400 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
          Emission Results
        </h1>
      </div>
                <p className="text-gray-600 text-base md:text-xl mb-2">
        Your sustainability insights at a glance
      </p>

      {/* Submission Date */}
                <p className="text-sm text-gray-500">
        Submitted on{" "}
                  <span className="font-semibold text-gray-800">
          {new Date(results.submitted_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </p>
    </div>

    {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 flex-wrap">
      <Button
        variant="outline"
                  size="lg"
        onClick={() => navigate(isEPA ? '/emission-calculator-epa' : '/emission-calculator')}
                  className="glass-effect border-teal-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all duration-300 hover:scale-105"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Change your emissions
      </Button>
      <Button
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl"
                  size="lg"
        onClick={exportCsv}
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  </div>
</div>

          {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
              {/* Scope 1 */}
              <Card 
                className={`glass-effect shadow-lg card-hover rounded-2xl border border-white/50 h-full ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: '0.2s' }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                      <Factory className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-base font-semibold text-gray-800">Scope 1 Emissions</CardTitle>
                  </div>
            </CardHeader>
            <CardContent className="pt-0">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent tracking-tight">
                    {formatTonnes(scope1Total)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">t CO2e</div>
            </CardContent>
          </Card>

          {/* Scope 2 */}
              <Card 
                className={`glass-effect shadow-lg card-hover rounded-2xl border border-white/50 h-full ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: '0.3s' }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                      <BarChart3 className="h-6 w-6 text-white" />
                </div>
                    <CardTitle className="text-base font-semibold text-gray-800">Scope 2 Emissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent tracking-tight">
                    {formatTonnes(electricityEmissions + heatSteamEmissions)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">t CO2e</div>
            </CardContent>
          </Card>

              {/* Scope 3 */}
              <Card 
                className={`glass-effect shadow-lg card-hover rounded-2xl border border-white/50 h-full ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: '0.4s' }}
              >
                <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                      <TrendingDown className="h-6 w-6 text-white" />
                </div>
                    <CardTitle className="text-base font-semibold text-gray-800">Scope 3</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                    {formatTonnes(scope3Total)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">t CO2e</div>
            </CardContent>
          </Card>

              {/* Total */}
              <Card 
                className={`glass-effect shadow-lg card-hover rounded-2xl border border-white/50 h-full ${
                  mounted ? 'animate-fade-in-up' : 'opacity-0'
                }`}
                style={{ animationDelay: '0.5s' }}
              >
                <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                      <Leaf className="h-6 w-6 text-white" />
                </div>
                    <CardTitle className="text-base font-semibold text-gray-800">Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
                  <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent tracking-tight">
                    {formatTonnes(scope1Total + electricityEmissions + heatSteamEmissions + scope3Total)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">t CO2e (All Scopes)</div>
            </CardContent>
          </Card>
        </div>

        {/* Scope 1 Breakdown + Insights */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 ${
              mounted ? 'animate-fade-in-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '0.6s' }}
            >
              <Card className="lg:col-span-2 glass-effect shadow-xl rounded-2xl border border-white/50">
            <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                    Scope 1 Breakdown
                  </CardTitle>
            </CardHeader>
            <CardContent>
                  <div className="overflow-x-auto rounded-2xl border border-gray-200/60 bg-white/70 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50/90">
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4 text-right">Emissions (t CO2e)</th>
                          <th className="py-3 px-4 text-right">Share</th>
                          <th className="py-3 px-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                        {breakdown.map((b, idx) => (
                          <Fragment key={b.label}>
                            <tr 
                              className="hover:bg-gray-50 transition-colors"
                              style={{ animationDelay: `${0.7 + idx * 0.1}s` }}
                            >
                              <td className="py-3 px-4 font-medium text-gray-900">{b.label}</td>
                              <td className="py-3 px-4 font-semibold text-right text-gray-800">{formatTonnes(b.value)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`${b.color} h-2.5 rounded-full progress-bar-animate shadow-sm`} 
                                      style={{ width: `${b.pct}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-700 w-16 text-right">{b.pct.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadCategoryDetails(b.key)}
                                >
                                  {detailKey === b.key ? 'Hide' : 'View'}
                                </Button>
                              </td>
                            </tr>
                            {detailKey === b.key && !detailLoading && !detailError && detailRows.length > 0 && (
                              <tr>
                                <td colSpan={4} className="bg-white/60 px-4 pb-4">
                                  <div className="mt-2 space-y-2 text-xs text-gray-700">
                                    <div className="text-gray-500">
                                      {detailRows.length.toLocaleString()} entries • Total emissions{' '}
                                      <span className="font-semibold">
                                        {formatKg(
                                          detailRows.reduce(
                                            (sum: number, r: any) => sum + (Number(r.emissions) || 0),
                                            0
                                          )
                                        )}{' '}
                                        kg CO2e
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto border border-gray-200 rounded-md bg-white/80">
                                      <table className="min-w-full text-[11px]">
                                        <thead>
                                          <tr className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-600">
                                            {Object.keys(detailRows[0] || {})
                                              .filter((col) => !HIDDEN_DETAIL_COLUMNS.includes(col))
                                              .map((col) => (
                                                <th
                                                  key={col}
                                                  className="px-3 py-2 text-left font-semibold"
                                                >
                                                  {prettifyColumnLabel(col)}
                                                </th>
                                              ))}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {detailRows.map((row: any, ridx: number) => (
                                            <tr key={ridx} className="bg-white/70">
                                              {Object.keys(detailRows[0] || {})
                                                .filter((col) => !HIDDEN_DETAIL_COLUMNS.includes(col))
                                                .map((col) => {
                                                  const isNumeric = typeof row[col] === 'number' || col === 'emissions' || col === 'quantity';
                                                  const baseClasses = 'px-3 py-1.5 whitespace-nowrap text-[11px]';
                                                  const alignClasses = isNumeric ? 'text-right tabular-nums' : 'text-left';
                                                  return (
                                                    <td key={col} className={`${baseClasses} ${alignClasses}`}>
                                                      {col === 'emissions'
                                                        ? `${formatKg(Number(row[col]) || 0)} kg CO2e`
                                                        : typeof row[col] === 'number'
                                                        ? row[col].toLocaleString()
                                                        : row[col] != null
                                                        ? String(row[col])
                                                        : ''}
                                                    </td>
                                                  );
                                                })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {detailKey === b.key && detailLoading && (
                              <tr>
                                <td colSpan={4} className="px-4 pb-4 text-xs text-gray-500">
                                  Loading details...
                                </td>
                              </tr>
                            )}
                            {detailKey === b.key && detailError && (
                              <tr>
                                <td colSpan={4} className="px-4 pb-4 text-xs text-red-600">
                                  {detailError}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                  </tbody>
                  <tfoot>
                        <tr className="bg-gray-50/80">
                          <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                          <td className="py-3 px-4 font-bold text-right text-gray-900">{formatTonnes(scope1Total)}</td>
                          <td className="py-3 px-4 text-xs font-semibold text-gray-700 text-right pr-4">100%</td>
                          <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

              <Card className="glass-effect shadow-xl rounded-2xl border border-white/50">
            <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-600" />
                    Insights
                  </CardTitle>
            </CardHeader>
            <CardContent>
                  <ul className="space-y-4 text-sm">
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                      <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                      <span className="text-gray-700">
                        Largest contributor: <span className="font-bold text-gray-900">{topContributor.label}</span> ({(topContributor.pct || 0).toFixed(1)}%)
                  </span>
                </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                      <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                      <span className="text-gray-700">
                        Total Scope 1: <span className="font-bold text-gray-900">{formatTonnes(scope1Total)} t CO2e</span>
                      </span>
                </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                      <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                      <span className="text-gray-700">Export breakdown via CSV for reporting or audits.</span>
                </li>
              </ul>
                  <div className="mt-6">
                    <Button 
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 w-full shadow-lg transition-all duration-300 hover:scale-105" 
                      onClick={exportCsv}
                    >
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scope 2 Breakdown + Insights */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 ${
              mounted ? 'animate-fade-in-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '0.8s' }}
            >
              <Card className="lg:col-span-2 glass-effect shadow-xl rounded-2xl border border-white/50">
            <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
                    Scope 2 Breakdown
                  </CardTitle>
            </CardHeader>
            <CardContent>
                  <div className="overflow-x-auto rounded-xl border border-gray-200/50 bg-white/30">
                <table className="min-w-full">
                  <thead>
                        <tr className="text-left text-gray-700 text-sm bg-gradient-to-r from-gray-50/80 to-gray-100/80">
                          <th className="py-3 px-4 font-semibold">Category</th>
                          <th className="py-3 px-4 font-semibold">Emissions (kg CO2e)</th>
                          <th className="py-3 px-4 font-semibold">Share</th>
                          <th className="py-3 px-4 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                        {scope2Breakdown.map((b, idx) => (
                          <Fragment key={b.label}>
                            <tr 
                              className="border-t border-gray-200/50 hover:bg-white/50 transition-colors"
                              style={{ animationDelay: `${0.9 + idx * 0.1}s` }}
                            >
                              <td className="py-4 px-4 font-medium text-gray-900">{b.label}</td>
                              <td className="py-4 px-4 font-semibold text-gray-800">{formatKg(b.value)}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`${b.color} h-3 rounded-full progress-bar-animate shadow-sm`} 
                                      style={{ width: `${b.pct}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 w-16 text-right">{b.pct.toFixed(1)}%</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadCategoryDetails(b.key)}
                                >
                                  {detailKey === b.key ? 'Hide' : 'View'}
                                </Button>
                              </td>
                            </tr>
                            {detailKey === b.key && !detailLoading && !detailError && detailRows.length > 0 && (
                              <tr>
                                <td colSpan={4} className="bg-white/60 px-4 pb-4">
                                  <div className="mt-2 space-y-2 text-xs text-gray-700">
                                    <div className="text-gray-500">
                                      {detailRows.length.toLocaleString()} entries • Total emissions{' '}
                                      <span className="font-semibold">
                                        {formatKg(
                                          detailRows.reduce(
                                            (sum: number, r: any) => sum + (Number(r.emissions) || 0),
                                            0
                                          )
                                        )}{' '}
                                        kg CO2e
                                      </span>
                                    </div>
                                    <div className="overflow-x-auto border border-gray-200 rounded-md bg-white/80">
                                      <table className="min-w-full text-[11px]">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            {Object.keys(detailRows[0] || {})
                                              .filter((col) => !HIDDEN_DETAIL_COLUMNS.includes(col))
                                              .map((col) => (
                                                <th
                                                  key={col}
                                                  className="px-2 py-1 text-left font-semibold text-gray-700"
                                                >
                                                  {prettifyColumnLabel(col)}
                                                </th>
                                              ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detailRows.map((row: any, ridx: number) => (
                                            <tr key={ridx} className="border-t border-gray-200">
                                              {Object.keys(detailRows[0] || {})
                                                .filter((col) => !HIDDEN_DETAIL_COLUMNS.includes(col))
                                                .map((col) => (
                                                  <td key={col} className="px-2 py-1 whitespace-nowrap">
                                                    {col === 'emissions'
                                                      ? `${formatKg(Number(row[col]) || 0)} kg CO2e`
                                                      : typeof row[col] === 'number'
                                                      ? row[col].toLocaleString()
                                                      : row[col] != null
                                                      ? String(row[col])
                                                      : ''}
                                                  </td>
                                                ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            {detailKey === b.key && detailLoading && (
                              <tr>
                                <td colSpan={4} className="px-4 pb-4 text-xs text-gray-500">
                                  Loading details...
                                </td>
                              </tr>
                            )}
                            {detailKey === b.key && detailError && (
                              <tr>
                                <td colSpan={4} className="px-4 pb-4 text-xs text-red-600">
                                  {detailError}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                  </tbody>
                  <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gradient-to-r from-gray-50/80 to-gray-100/80">
                          <td className="py-4 px-4 font-bold text-gray-900">Total</td>
                          <td className="py-4 px-4 font-bold text-gray-900">{formatKg(scope2Total)}</td>
                          <td className="py-4 px-4 text-sm font-semibold text-gray-700">100%</td>
                          <td className="py-4 px-4" />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect shadow-xl rounded-2xl border border-white/50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-600" />
                    Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 text-sm">
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                      <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                      <span className="text-gray-700">
                        Largest contributor: <span className="font-bold text-gray-900">{topContributorS2.label}</span> ({(topContributorS2.pct || 0).toFixed(1)}%)
                      </span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                      <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                      <span className="text-gray-700">
                        Total Scope 2: <span className="font-bold text-gray-900">{formatKg(scope2Total)} kg CO2e</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                      <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                      <span className="text-gray-700">Export breakdown via CSV for reporting or audits.</span>
                    </li>
                  </ul>
                  <div className="mt-6">
                    <Button 
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 w-full shadow-lg transition-all duration-300 hover:scale-105" 
                      onClick={exportCsvScope2}
                    >
                      <Download className="h-4 w-4 mr-2" /> Download CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scope 3 Breakdown + Insights */}
            <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start ${
              mounted ? 'animate-fade-in-up' : 'opacity-0'
            }`}
            style={{ animationDelay: '1s' }}
            >
                <Card className="lg:col-span-2 glass-effect shadow-xl rounded-2xl border border-white/50">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                      Scope 3 Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-xl border border-gray-200/50 bg-white/30">
                      <table className="min-w-full">
                        <thead>
                          <tr className="text-left text-gray-700 text-sm bg-gradient-to-r from-gray-50/80 to-gray-100/80">
                            <th className="py-3 px-4 font-semibold">Category</th>
                            <th className="py-3 px-4 font-semibold">Emissions (kg CO2e)</th>
                            <th className="py-3 px-4 font-semibold">Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Upstream Emissions Section */}
                          <tr>
                            <td colSpan={3} className="py-3 px-4 bg-blue-50/50 border-t-2 border-blue-200">
                              <div className="font-bold text-blue-700 text-sm uppercase tracking-wide">Upstream Emissions</div>
                            </td>
                          </tr>
                          {scope3UpstreamBreakdown.map((b, idx) => (
                            <tr 
                              key={b.label} 
                              className="border-t border-gray-200/50 hover:bg-white/50 transition-colors"
                              style={{ animationDelay: `${1.1 + idx * 0.05}s` }}
                            >
                              <td className="py-4 px-4 font-medium text-gray-900 pl-8">{b.label}</td>
                              <td className="py-4 px-4 font-semibold text-gray-800">{formatKg(b.value)}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`${b.color} h-3 rounded-full progress-bar-animate shadow-sm`} 
                                      style={{ width: `${b.pct}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 w-16 text-right">{b.pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-blue-50/30">
                            <td className="py-3 px-4 font-semibold text-blue-800 pl-8">Upstream Total</td>
                            <td className="py-3 px-4 font-semibold text-blue-800">{formatKg(scope3UpstreamTotal)}</td>
                            <td className="py-3 px-4 text-sm font-semibold text-blue-700">
                              {scope3Total > 0 ? ((scope3UpstreamTotal / scope3Total) * 100).toFixed(1) : '0.0'}%
                            </td>
                          </tr>
                          
                          {/* Downstream Emissions Section */}
                          <tr>
                            <td colSpan={3} className="py-3 px-4 bg-green-50/50 border-t-2 border-green-200">
                              <div className="font-bold text-green-700 text-sm uppercase tracking-wide">Downstream Emissions</div>
                            </td>
                          </tr>
                          {scope3DownstreamBreakdown.map((b, idx) => (
                            <tr 
                              key={b.label} 
                              className="border-t border-gray-200/50 hover:bg-white/50 transition-colors"
                              style={{ animationDelay: `${1.1 + (scope3UpstreamBreakdown.length + idx) * 0.05}s` }}
                            >
                              <td className="py-4 px-4 font-medium text-gray-900 pl-8">{b.label}</td>
                              <td className="py-4 px-4 font-semibold text-gray-800">{formatKg(b.value)}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                      className={`${b.color} h-3 rounded-full progress-bar-animate shadow-sm`} 
                                      style={{ width: `${b.pct}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium text-gray-700 w-16 text-right">{b.pct.toFixed(1)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-green-50/30">
                            <td className="py-3 px-4 font-semibold text-green-800 pl-8">Downstream Total</td>
                            <td className="py-3 px-4 font-semibold text-green-800">{formatKg(scope3DownstreamTotal)}</td>
                            <td className="py-3 px-4 text-sm font-semibold text-green-700">
                              {scope3Total > 0 ? ((scope3DownstreamTotal / scope3Total) * 100).toFixed(1) : '0.0'}%
                            </td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gradient-to-r from-gray-50/80 to-gray-100/80">
                            <td className="py-4 px-4 font-bold text-gray-900">Scope 3 Total</td>
                            <td className="py-4 px-4 font-bold text-gray-900">{formatKg(scope3Total)}</td>
                            <td className="py-4 px-4 text-sm font-semibold text-gray-700">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

                <Card className="glass-effect shadow-xl rounded-2xl border border-white/50 self-start">
            <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-teal-600" />
                      Insights
                    </CardTitle>
            </CardHeader>
            <CardContent>
                    <ul className="space-y-4 text-sm">
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                        <span className="h-2 w-2 rounded-full bg-blue-500 mt-2 animate-pulse"></span>
                        <span className="text-gray-700">
                          Upstream Total: <span className="font-bold text-gray-900">{formatKg(scope3UpstreamTotal)} kg CO2e</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                        <span className="h-2 w-2 rounded-full bg-green-500 mt-2 animate-pulse"></span>
                        <span className="text-gray-700">
                          Downstream Total: <span className="font-bold text-gray-900">{formatKg(scope3DownstreamTotal)} kg CO2e</span>
                        </span>
                      </li>
                      {topContributorS3.label && (
                        <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                          <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                          <span className="text-gray-700">
                            Largest contributor: <span className="font-bold text-gray-900">{topContributorS3.label}</span> ({(topContributorS3.pct || 0).toFixed(1)}%)
                  </span>
                </li>
                      )}
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                        <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                        <span className="text-gray-700">
                          Total Scope 3: <span className="font-bold text-gray-900">{formatKg(scope3Total)} kg CO2e</span>
                        </span>
                </li>
                      <li className="flex items-start gap-3 p-3 rounded-lg bg-white/30 hover:bg-white/50 transition-colors">
                        <span className="h-2 w-2 rounded-full bg-teal-600 mt-2 animate-pulse"></span>
                        <span className="text-gray-700">Export breakdown via CSV for reporting or audits.</span>
                </li>
              </ul>
                    <div className="mt-6">
                      <Button 
                        className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 w-full shadow-lg transition-all duration-300 hover:scale-105" 
                        onClick={exportCsv}
                      >
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
            <div 
              className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 ${
                mounted ? 'animate-fade-in-up' : 'opacity-0'
              }`}
              style={{ animationDelay: '1.2s' }}
            >
      <Button 
        onClick={() => navigate(isEPA ? '/emission-calculator-epa' : '/emission-calculator')}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl"
                size="lg"
          >
            Edit Assessment
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
                className="glass-effect border-teal-200 hover:border-teal-400 hover:bg-teal-50/50 px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105"
                size="lg"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
      </div>
    </>
  );
};

export default EmissionResults;

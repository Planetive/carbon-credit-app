import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { readSelectedReportingYear } from './reportingYear';
import { fetchUkAnnualScope2 } from './ukScope2Results';
import { fetchScope3Verified, type Scope3VerifiedResults } from './scope3Results';
import {
  duplicatePcafFacilitatedKg,
  NOT_CALCULATED_SCOPE3_CATEGORIES,
  scope3CompletionPercent,
  verifiedAnnualGrandKg,
  verifiedScope3AnnualKg,
} from './scope3Reporting';
import {
  calculateLegacyScope2ElectricityTotal,
  loadLegacyCategoryDetailRows,
  safeListLegacyTable,
  sumEmissionsField,
  sumInvestmentAttributed,
  sumRowDataEmissions,
} from '@/integrations/supabase/ghgEntryAggregates';
import { loadFinancedReportingRowsSafe } from '@/utils/portfolioCalculationsForScope3';
import { sumCategory15AttributedSafely } from '@/utils/scope3FinancedImportSafety';
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
  const { currentOrganization } = useOrganization();
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
  const [verifiedElectricityKg, setVerifiedElectricityKg] = useState(0);
  const [verifiedHeatKg, setVerifiedHeatKg] = useState(0);
  const [scope3Verified, setScope3Verified] = useState<Scope3VerifiedResults | null>(null);
  const [scope2Note, setScope2Note] = useState(
    "Legacy undated Scope 2 records are excluded from the annual total."
  );
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
  const [scope3DuplicatePcafKg, setScope3DuplicatePcafKg] = useState(0);
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
      const rows = await loadLegacyCategoryDetailRows(key, user.id, {
        variant: 'uk',
        fuelFramework: isEPA ? 'epa' : 'uk',
      });
      setDetailRows(rows);
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
    () => (isEPA ? electricityEmissions + epaHeatSteamEmissions : verifiedElectricityKg + verifiedHeatKg),
    [isEPA, electricityEmissions, epaHeatSteamEmissions, verifiedElectricityKg, verifiedHeatKg]
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
      { key: 'uk_purchased_electricity', label: 'Purchased electricity (location-based, verified)', value: verifiedElectricityKg, color: 'bg-orange-500' },
      { key: 'uk_purchased_heat', label: 'Purchased heat and steam (verified)', value: verifiedHeatKg, color: 'bg-amber-600' },
    ];
    return data.map(d => ({ ...d, pct: scope2Total > 0 ? (d.value / scope2Total) * 100 : 0 }));
  }, [isEPA, electricityEmissions, epaHeatSteamEmissions, verifiedElectricityKg, verifiedHeatKg, scope2Total]);
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
      { key: 'scope3_facilitated', label: scope3DuplicatePcafKg > 0 ? 'Facilitated emissions (same PCAF calculation as Category 15 is not added again)' : 'Facilitated emissions', value: scope3Facilitated, color: 'bg-[#1D9E75]', category: 'downstream' },
    ];
    return data.map(d => ({ ...d, pct: scope3DownstreamTotal > 0 ? (d.value / scope3DownstreamTotal) * 100 : 0 }));
  }, [scope3DownstreamTransport, scope3ProcessingSold, scope3UseOfSold, 
      scope3EndOfLife, scope3Investments, scope3Facilitated, scope3DuplicatePcafKg, scope3DownstreamTotal]);

  // Combined breakdown for CSV export
  const scope3Breakdown = useMemo(() => {
    return [...scope3UpstreamBreakdown, ...scope3DownstreamBreakdown];
  }, [scope3UpstreamBreakdown, scope3DownstreamBreakdown]);

  const verifiedScope3Kg = useMemo(
    () => verifiedScope3AnnualKg(
      readSelectedReportingYear(),
      scope3Verified && scope3Verified.status !== "unavailable"
        ? scope3Verified.totalKgCo2e
        : null,
    ),
    [scope3Verified],
  );

  const annualGrandKg = useMemo(
    () => verifiedAnnualGrandKg({
      reportingYear: readSelectedReportingYear(),
      scope1Kg: scope1Total,
      scope2Kg: scope2Total,
      legacyScope3Kg: Math.max(0, scope3Total - scope3DuplicatePcafKg),
      verifiedScope3Kg,
    }),
    [scope1Total, scope2Total, scope3Total, scope3DuplicatePcafKg, verifiedScope3Kg],
  );

  const topContributorS3 = useMemo(() =>
    scope3Breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }),
    [scope3Breakdown]
  );

  const exportCsv = () => {
    const scope2TotalLocal = scope2Total;
    const grandTotal = annualGrandKg ?? scope1Total + scope2TotalLocal;
    const legacyScope3Kg = Math.max(0, scope3Total - scope3DuplicatePcafKg);

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
    rows.push(['Scope 2', 'Total', scope2TotalLocal.toFixed(6), isEPA ? '100.00' : 'partial']);
    if (!isEPA) {
      rows.push(['Scope 2', 'Legacy undated electricity and heat excluded', (electricityEmissions + heatSteamEmissions).toFixed(6), 'excluded']);
    }
    rows.push([]);

    // Scope 3 breakdown - Upstream
    rows.push(['Scope 3', 'Upstream Emissions', '', '']);
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)', 'Share (%)']);
    scope3UpstreamBreakdown.forEach(b => {
      rows.push(['Scope 3', b.label, b.value.toFixed(6), 'excluded']);
    });
    rows.push(['Scope 3', 'Upstream Total', scope3UpstreamTotal.toFixed(6), 'excluded']);
    rows.push([]);
    
    // Scope 3 breakdown - Downstream
    rows.push(['Scope 3', 'Downstream Emissions', '', '']);
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)', 'Share (%)']);
    scope3DownstreamBreakdown.forEach(b => {
      rows.push(['Scope 3', b.label, b.value.toFixed(6), 'excluded']);
    });
    rows.push(['Scope 3', 'Downstream Total', scope3DownstreamTotal.toFixed(6), 'excluded']);
    if (scope3DuplicatePcafKg > 0) {
      rows.push(['Scope 3', 'PCAF calculation already in Category 15', scope3DuplicatePcafKg.toFixed(6), 'excluded duplicate']);
    }
    rows.push([]);
    
    // Verified Scope 3 annual subtotal (same aggregation as dashboard / EPA CSV)
    if (verifiedScope3Kg == null) {
      rows.push(['Scope 3', 'Verified annual total', 'Unavailable', 'unavailable']);
    } else {
      (scope3Verified?.byCategory || [])
        .filter((row) => row.status === 'verified' && row.kgCo2e != null)
        .forEach((row) => {
          rows.push(['Scope 3', `${row.label} (verified)`, row.kgCo2e!.toFixed(6), 'verified partial']);
        });
      (scope3Verified?.byCategory || [])
        .filter((row) => row.status === 'no_activity')
        .forEach((row) => {
          rows.push(['Scope 3', row.label, 'No activity', 'incomplete']);
        });
      (scope3Verified?.byCategory || [])
        .filter((row) => row.status === 'unsupported' || row.status === 'awaiting_factors')
        .forEach((row) => {
          rows.push(['Scope 3', row.label, 'Not calculated', row.status]);
        });
      rows.push(['Scope 3', 'Verified partial total', verifiedScope3Kg.toFixed(6), 'partial']);
      rows.push(['Scope 3', 'Inventory status', 'Partial', 'Not a complete Scope 3 inventory']);
    }
    rows.push(['Scope 3', 'Legacy undated records excluded', legacyScope3Kg.toFixed(6), 'excluded']);
    NOT_CALCULATED_SCOPE3_CATEGORIES.forEach((category) => {
      rows.push(['Scope 3', category.label, 'Not calculated', 'not calculated']);
    });
    rows.push([]);

    // Grand total
    rows.push(['All Scopes', 'Grand Total', grandTotal.toFixed(6), verifiedScope3Kg == null ? 'partial' : 'partial with verified Scope 3']);

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
    rows.push(['Scope 2', 'Total', scope2Total.toFixed(6), 'partial']);
    rows.push(['Scope 2', 'Legacy undated electricity and heat excluded', (electricityEmissions + heatSteamEmissions).toFixed(6), 'excluded']);
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
        const fuelFramework = isEPA ? 'epa' : 'uk';
        const [
          fuelRows,
          refRows,
          passRows,
          delRows,
          mobileEpaRows,
          onRoadGasRows,
          onRoadDieselRows,
          nonRoadEpaRows,
          heatRows,
          epaHeatRows,
          scope1HeatSteamRows,
          purchasedGoodsRows,
          capitalGoodsRows,
          fuelEnergyRows,
          upstreamTransportRows,
          wasteGeneratedRows,
          businessTravelRows,
          employeeCommutingRows,
          investmentsRows,
          facilitatedRows,
          downstreamTransportRows,
          endOfLifeRows,
          processingSoldRows,
          useOfSoldRows,
          lcaRows,
        ] = await Promise.all([
          safeListLegacyTable('scope1_fuel_entries', user.id, { emission_framework: fuelFramework }),
          safeListLegacyTable('scope1_refrigerant_entries', user.id, { emission_framework: fuelFramework }),
          safeListLegacyTable('scope1_passenger_vehicle_entries', user.id),
          safeListLegacyTable('scope1_delivery_vehicle_entries', user.id),
          safeListLegacyTable('scope1_epa_mobile_fuel_entries', user.id),
          safeListLegacyTable('scope1_epa_on_road_gasoline_entries', user.id),
          safeListLegacyTable('scope1_epa_on_road_diesel_alt_fuel_entries', user.id),
          safeListLegacyTable('scope1_epa_non_road_vehicle_entries', user.id),
          safeListLegacyTable('scope2_heatsteam_entries', user.id),
          safeListLegacyTable('scope2_heatsteam_entries_epa', user.id),
          safeListLegacyTable('scope1_heatsteam_entries_epa', user.id),
          safeListLegacyTable('scope3_purchased_goods_services', user.id),
          safeListLegacyTable('scope3_capital_goods', user.id),
          safeListLegacyTable('scope3_fuel_energy_activities', user.id),
          safeListLegacyTable('scope3_upstream_transportation', user.id),
          safeListLegacyTable('scope3_waste_generated', user.id),
          safeListLegacyTable('scope3_business_travel', user.id),
          safeListLegacyTable('scope3_employee_commuting', user.id),
          safeListLegacyTable('scope3_investments', user.id),
          safeListLegacyTable('scope3_facilitated_emissions', user.id),
          safeListLegacyTable('scope3_downstream_transportation', user.id),
          safeListLegacyTable('scope3_end_of_life_treatment', user.id),
          safeListLegacyTable('scope3_processing_sold_products', user.id),
          safeListLegacyTable('scope3_use_of_sold_products', user.id),
          safeListLegacyTable('scope3_lca_entries', user.id, {}, (row) =>
            ['scope3_upstream', 'scope3_downstream'].includes(String(row.scope_type))
          ),
        ]);

        setFuelEmissions(sumEmissionsField(fuelRows));
        setEpaMobileEmissions(sumEmissionsField(mobileEpaRows));
        setEpaOnRoadGasEmissions(sumEmissionsField(onRoadGasRows));
        setEpaOnRoadDieselEmissions(sumEmissionsField(onRoadDieselRows));
        setEpaNonRoadEmissions(sumEmissionsField(nonRoadEpaRows));
        setRefrigerantEmissions(sumEmissionsField(refRows));
        setPassengerEmissions(sumEmissionsField(passRows));
        setDeliveryEmissions(sumEmissionsField(delRows));

        const elecTotal = await calculateLegacyScope2ElectricityTotal(user.id);
        setElectricityEmissions(elecTotal);

        const heatTotalRounded = Number(sumEmissionsField(heatRows).toFixed(6));
        setHeatSteamEmissions(heatTotalRounded);
        setEpaHeatSteamEmissions(Number(sumEmissionsField(epaHeatRows).toFixed(6)));
        setEpaScope1HeatSteamEmissions(Number(sumEmissionsField(scope1HeatSteamRows).toFixed(6)));

        const processingTotal = sumRowDataEmissions(processingSoldRows);
        const useTotal = sumRowDataEmissions(useOfSoldRows);
        const lcaUpstream = lcaRows.filter((r) => r.scope_type === 'scope3_upstream');
        const lcaDownstream = lcaRows.filter((r) => r.scope_type === 'scope3_downstream');

        setScope3PurchasedGoods(sumEmissionsField(purchasedGoodsRows));
        setScope3CapitalGoods(sumEmissionsField(capitalGoodsRows));
        setScope3FuelEnergy(sumEmissionsField(fuelEnergyRows));
        setScope3UpstreamTransport(sumEmissionsField(upstreamTransportRows));
        setScope3WasteGenerated(sumEmissionsField(wasteGeneratedRows));
        setScope3BusinessTravel(sumEmissionsField(businessTravelRows));
        setScope3EmployeeCommuting(sumEmissionsField(employeeCommutingRows));
        const financedReportingRows = await loadFinancedReportingRowsSafe();
        const investmentsTotal = financedReportingRows.length
          ? sumCategory15AttributedSafely(investmentsRows, financedReportingRows, "finance")
          : sumInvestmentAttributed(investmentsRows);
        const facilitatedTotal = financedReportingRows.length
          ? sumCategory15AttributedSafely(facilitatedRows, financedReportingRows, "facilitated")
          : sumEmissionsField(facilitatedRows);
        setScope3Investments(investmentsTotal);
        setScope3Facilitated(facilitatedTotal);
        setScope3DuplicatePcafKg(duplicatePcafFacilitatedKg(investmentsRows, facilitatedRows));
        setScope3DownstreamTransport(sumEmissionsField(downstreamTransportRows));
        setScope3EndOfLife(sumEmissionsField(endOfLifeRows));
        setScope3ProcessingSold(processingTotal);
        setScope3UseOfSold(useTotal);
        setScope3LCAUpstream(sumEmissionsField(lcaUpstream));
        setScope3LCADownstream(sumEmissionsField(lcaDownstream));

        const scope3TotalCalc =
          sumEmissionsField(purchasedGoodsRows) +
          sumEmissionsField(capitalGoodsRows) +
          sumEmissionsField(fuelEnergyRows) +
          sumEmissionsField(upstreamTransportRows) +
          sumEmissionsField(wasteGeneratedRows) +
          sumEmissionsField(businessTravelRows) +
          sumEmissionsField(employeeCommutingRows) +
          investmentsTotal +
          facilitatedTotal +
          sumEmissionsField(downstreamTransportRows) +
          sumEmissionsField(endOfLifeRows) +
          processingTotal +
          useTotal;

        setResults({
          scope1_completion: 100,
          scope2_completion: 100,
          scope3_completion: scope3CompletionPercent(
            scope3TotalCalc,
            verifiedScope3AnnualKg(readSelectedReportingYear()),
            0,
          ),
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

  useEffect(() => {
    if (isEPA) return;
    let cancelled = false;
    void (async () => {
      const year = readSelectedReportingYear();
      const [annual, scope3] = await Promise.all([
        fetchUkAnnualScope2({
          organizationId: currentOrganization?.id,
          reportingYear: year,
        }),
        fetchScope3Verified({
          organizationId: currentOrganization?.id,
          reportingYear: year,
        }),
      ]);
      if (cancelled) return;
      setVerifiedElectricityKg(annual.electricityKg);
      setVerifiedHeatKg(annual.heatKg);
      setScope3Verified(scope3);
      const legacyKg = electricityEmissions + heatSteamEmissions;
      setScope2Note(
        annual.error
          ? `${annual.error} Legacy undated electricity and heat records (${legacyKg.toFixed(3)} kg) are excluded.`
          : `Verified purchased electricity and heat are shown for ${year}. Legacy undated records (${legacyKg.toFixed(3)} kg) are excluded and are not a complete annual inventory. Purchased cooling is not included.`
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [isEPA, currentOrganization?.id, electricityEmissions, heatSteamEmissions]);


  const mappedResults: EpaIpccResultsData = useMemo(() => {
    const scope1 = breakdown.map(({ key, label, value }) => ({ key, label, value }));
    const scope2 = scope2Breakdown.map(({ key, label, value }) => ({ key, label, value }));
    const scope3 = scope3Breakdown.map(({ key, label, value }) => ({ key, label, value }));
    // Lazy import avoided — group at module level via dynamic require pattern not needed;
    // UK results keep flat scope1; empty activity rollup satisfies the shared type.
    return {
      scope1,
      scope1ByActivity: [],
      scope2,
      scope3,
      scope3Verified: scope3Verified ?? undefined,
      totals: {
        scope1: scope1Total,
        scope2: scope2Total,
        scope3: scope3Total,
        grand: annualGrandKg ?? scope1Total + scope2Total,
      },
    };
  }, [breakdown, scope2Breakdown, scope3Breakdown, scope1Total, scope2Total, scope3Total, annualGrandKg, scope3Verified]);

  const categoriesWithScope = useMemo(
    () => [
      ...mappedResults.scope1.map((r) => ({ ...r, scope: "Scope 1" as const })),
      ...mappedResults.scope2.map((r) => ({ ...r, scope: "Scope 2" as const })),
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
        <p className="text-sm text-slate-600">{scope2Note}</p>
        <p className="text-sm text-slate-600">
          Legacy Scope 3 records have no reporting period and are excluded from the verified annual total.
          {scope3DuplicatePcafKg > 0
            ? ` ${scope3DuplicatePcafKg.toFixed(3)} kg from a facilitated row repeats a Category 15 PCAF calculation and is not added again.`
            : ""}
          {" "}Franchises and leased assets are not calculated.
        </p>
        <ResultsSummaryCard
          grandTotalKg={mappedResults.totals.grand}
          categoriesCalculated={categoriesCalculated}
          submittedAt={submittedAt}
          methodologyLabel="DESNZ / GHG Protocol — partial Scope 2"
          onEditAssessment={() => navigate("/emission-calculator-uk")}
          onExportPdf={exportPdf}
          onExportExcel={exportCsv}
          isGeneratingPdf={isGeneratingPdf}
        />

        <ScopeHighlightCards
          scope1Kg={mappedResults.totals.scope1}
          scope2Kg={mappedResults.totals.scope2}
          scope3Kg={verifiedScope3Kg}
          grandKg={annualGrandKg ?? mappedResults.totals.scope1 + mappedResults.totals.scope2}
        />

        <EmissionsAnalyticsRow
          scope1Kg={mappedResults.totals.scope1}
          scope2Kg={mappedResults.totals.scope2}
          scope3Kg={verifiedScope3Kg}
          grandKg={annualGrandKg ?? mappedResults.totals.scope1 + mappedResults.totals.scope2}
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

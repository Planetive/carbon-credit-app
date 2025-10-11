import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Share2, BarChart3, TrendingDown, Factory, Leaf } from 'lucide-react';
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
  const [results, setResults] = useState<EmissionResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fuelEmissions, setFuelEmissions] = useState<number>(0);
  const [refrigerantEmissions, setRefrigerantEmissions] = useState<number>(0);
  const [passengerEmissions, setPassengerEmissions] = useState<number>(0);
  const [deliveryEmissions, setDeliveryEmissions] = useState<number>(0);
  const [electricityEmissions, setElectricityEmissions] = useState<number>(0);
  const [heatSteamEmissions, setHeatSteamEmissions] = useState<number>(0);

  const scope1Total = useMemo(() => {
    return fuelEmissions + refrigerantEmissions + passengerEmissions + deliveryEmissions;
  }, [fuelEmissions, refrigerantEmissions, passengerEmissions, deliveryEmissions]);

  const formatKg = (value: number) => {
    return value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  const breakdown = useMemo(() => {
    const data = [
      { label: 'Fuel', value: fuelEmissions, color: 'bg-rose-500' },
      { label: 'Refrigerant', value: refrigerantEmissions, color: 'bg-amber-500' },
      { label: 'Passenger', value: passengerEmissions, color: 'bg-sky-500' },
      { label: 'Delivery', value: deliveryEmissions, color: 'bg-emerald-500' },
    ];
    return data.map(d => ({ ...d, pct: scope1Total > 0 ? (d.value / scope1Total) * 100 : 0 }));
  }, [fuelEmissions, refrigerantEmissions, passengerEmissions, deliveryEmissions, scope1Total]);

  const topContributor = useMemo(() => breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), [breakdown]);

  // Scope 2 breakdown
  const scope2Total = useMemo(() => electricityEmissions + heatSteamEmissions, [electricityEmissions, heatSteamEmissions]);
  const scope2Breakdown = useMemo(() => {
    const data = [
      { label: 'Electricity', value: electricityEmissions, color: 'bg-orange-500' },
      { label: 'Heat & Steam', value: heatSteamEmissions, color: 'bg-amber-600' },
    ];
    return data.map(d => ({ ...d, pct: scope2Total > 0 ? (d.value / scope2Total) * 100 : 0 }));
  }, [electricityEmissions, heatSteamEmissions, scope2Total]);
  const topContributorS2 = useMemo(() => scope2Breakdown.reduce((a: any, b: any) => (b.value > a.value ? b : a), { label: '', value: 0, pct: 0, color: '' }), [scope2Breakdown]);

  const exportCsv = () => {
    const scope2Total = electricityEmissions + heatSteamEmissions;
    const scope3Total = 0;
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

    // Scope 3 placeholder
    rows.push(['Scope', 'Category', 'Emissions (kg CO2e)']);
    rows.push(['Scope 3', 'Total', scope3Total.toFixed(6)]);
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
        const [fuelRes, refRes, passRes, delRes] = await Promise.all([
          supabase.from('scope1_fuel_entries').select('emissions').eq('user_id', user.id),
          supabase.from('scope1_refrigerant_entries').select('emissions').eq('user_id', user.id),
          supabase.from('scope1_passenger_vehicle_entries').select('emissions').eq('user_id', user.id),
          supabase.from('scope1_delivery_vehicle_entries').select('emissions').eq('user_id', user.id),
        ]);

        const sum = (arr: any[] | null | undefined) => (arr || []).reduce((s, r) => s + (Number(r.emissions) || 0), 0);

        setFuelEmissions(sum(fuelRes.data));
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
        setHeatSteamEmissions(Number(heatTotal.toFixed(6)));

        // Keep minimal meta so existing UI sections render
        setResults({
          scope1_completion: 100,
          scope2_completion: 100,
          scope3_completion: 0,
          total_completion: 100,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };
    loadScope1Totals();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading emission results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No emission results found</p>
          <Button onClick={() => navigate('/emission-calculator')}>
            Go to Emission Calculator
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* Header - minimal */}
      {/* <div className="">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between mt-5">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center gap-2">
              <BarChart3 className="h-6 w-6 text-gray-800" />
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Emission Results</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" size="sm" onClick={exportCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div> */}
{/* Page Hero - Emission Results */}
<div className="relative bg-gradient-to-r from-teal-50 via-white to-teal-50 rounded-2xl shadow-sm border border-teal-100">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-center">
    
    {/* Icon + Title */}
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center gap-3 mb-2">
        <BarChart3 className="h-8 w-8 sm:h-10 sm:w-10 text-teal-600" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900">
          Emission Results
        </h1>
      </div>
      <p className="text-gray-600 text-sm md:text-lg">
        Your sustainability insights at a glance
      </p>

      {/* Submission Date */}
      <p className="mt-3 text-sm text-gray-500">
        Submitted on{" "}
        <span className="font-medium text-gray-800">
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
    <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 sm:gap-4 flex-col sm:flex-row">
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/emission-calculator')}
        className="text-gray-600 hover:text-teal-700 hover:border-teal-300 transition-colors w-full sm:w-auto"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Change your emissions
      </Button>
      <Button
        className="bg-teal-600 hover:bg-teal-700 text-white shadow-md px-5 py-2 rounded-xl transition-transform hover:scale-105 w-full sm:w-auto"
        size="sm"
        onClick={exportCsv}
      >
        <Download className="h-4 w-4 mr-2" />
        Export CSV
      </Button>
    </div>
  </div>
</div>




      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        
        {/* KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {/* Scope 1 - Primary Stat */}
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-gray-100 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-100 to-rose-50 flex items-center justify-center">
                    <Factory className="h-5 w-5 text-red-600" />
                  </div>
                  <CardTitle className="text-base font-medium text-gray-700 truncate">Scope 1 Emissions</CardTitle>
                </div></div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight break-words">{formatKg(scope1Total)}</div>
              <div className="text-xs sm:text-sm text-gray-500">kg CO2e</div>
            </CardContent>
          </Card>

          {/* Scope 2 */}
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-gray-100 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <CardTitle className="text-base font-medium text-gray-700 truncate">Scope 2 Emissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight break-words">{formatKg(electricityEmissions + heatSteamEmissions)}</div>
              <div className="text-xs sm:text-sm text-gray-500">kg CO2e</div>
            </CardContent>
          </Card>

          {/* Scope 3 - Placeholder */}
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-gray-100 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base font-medium text-gray-700">Scope 3</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{results.scope3_completion}%</div>
              <div className="text-xs sm:text-sm text-gray-500">Coming soon</div>
            </CardContent>
          </Card>

          {/* Total - Placeholder */}
          <Card className="shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-gray-100 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-base font-medium text-gray-700">Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight break-words">{formatKg(scope1Total + electricityEmissions + heatSteamEmissions)}</div>
              <div className="text-xs sm:text-sm text-gray-500">kg CO2e (Scopes 1 + 2)</div>
            </CardContent>
          </Card>
        </div>

        

        {/* Scope 1 Breakdown + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Scope 1 Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-gray-600 text-sm bg-gray-50/70">
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Emissions (kg CO2e)</th>
                      <th className="py-2">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map(b => (
                      <tr key={b.label} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 pr-4 font-medium text-gray-900">{b.label}</td>
                        <td className="py-3 pr-4">{formatKg(b.value)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-gray-100 rounded">
                              <div className={`${b.color} h-2 rounded`} style={{ width: `${b.pct}%` }}></div>
                            </div>
                            <span className="text-sm text-gray-600 w-14 text-right">{b.pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50/70">
                      <td className="py-3 pr-4 font-semibold text-gray-900">Total</td>
                      <td className="py-3 pr-4 font-semibold text-gray-900">{formatKg(scope1Total)}</td>
                      <td className="py-3 text-sm text-gray-600">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-600 mt-1.5"></span>
                  <span>
                    Largest contributor: <span className="font-medium text-gray-900">{topContributor.label}</span> ({(topContributor.pct || 0).toFixed(1)}%)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-600 mt-1.5"></span>
                  <span>Total Scope 1: <span className="font-medium text-gray-900">{formatKg(scope1Total)} kg CO2e</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-600 mt-1.5"></span>
                  <span>Export breakdown via CSV for reporting or audits.</span>
                </li>
              </ul>
              <div className="mt-4">
                <Button className="bg-teal-600 hover:bg-teal-700 w-full" onClick={exportCsv}>
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scope 2 Breakdown + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <Card className="lg:col-span-2 rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Scope 2 Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-left text-gray-600 text-sm bg-gray-50/70">
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Emissions (kg CO2e)</th>
                      <th className="py-2">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scope2Breakdown.map(b => (
                      <tr key={b.label} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 pr-4 font-medium text-gray-900">{b.label}</td>
                        <td className="py-3 pr-4">{formatKg(b.value)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-gray-100 rounded">
                              <div className={`${b.color} h-2 rounded`} style={{ width: `${b.pct}%` }}></div>
                            </div>
                            <span className="text-sm text-gray-600 w-14 text-right">{b.pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50/70">
                      <td className="py-3 pr-4 font-semibold text-gray-900">Total</td>
                      <td className="py-3 pr-4 font-semibold text-gray-900">{formatKg(scope2Total)}</td>
                      <td className="py-3 text-sm text-gray-600">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-800">Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-600 mt-1.5"></span>
                  <span>
                    Largest contributor: <span className="font-medium text-gray-900">{topContributorS2.label}</span> ({(topContributorS2.pct || 0).toFixed(1)}%)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-600 mt-1.5"></span>
                  <span>Total Scope 2: <span className="font-medium text-gray-900">{formatKg(scope2Total)} kg CO2e</span></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-600 mt-1.5"></span>
                  <span>Export breakdown via CSV for reporting or audits.</span>
                </li>
              </ul>
              <div className="mt-4">
                <Button className="bg-teal-600 hover:bg-teal-700 w-full" onClick={exportCsvScope2}>
                  <Download className="h-4 w-4 mr-2" /> Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
          <Button 
            onClick={() => navigate('/emission-calculator')}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Edit Assessment
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmissionResults;

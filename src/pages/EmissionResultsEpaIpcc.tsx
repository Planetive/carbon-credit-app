import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Download, Factory, Leaf, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadEpaIpccResults, EpaIpccResultsData } from "@/lib/epaIpccResults";
import { isMariEnergiesUserEmail } from "@/utils/roleUtils";
import { supabase } from "@/integrations/supabase/client";

const formatKg = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const formatTonnes = (value: number) =>
  (value / 1000).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const EmissionResultsEpaIpcc = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<EpaIpccResultsData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string>(new Date().toISOString());
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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

  const EMISSION_SELECTION_LABELS: Record<string, string> = {
    ch4_only: "CH4",
    n2o_only: "N2O",
    co2_only: "CO2",
    co2e: "CO2e",
  };

  const prettifyColumnLabel = (col: string) =>
    col
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatDateLike = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  };

  const formatObjectValue = (val: any): string => {
    if (val == null) return "";
    if (typeof val !== "object") return String(val);

    if (Array.isArray(val)) {
      if (val.length === 0) return "None";
      const first = val[0];
      if (typeof first === "object") {
        return val
          .map((item) => {
            if (item.formula && item.percentage != null) return `${item.formula}: ${item.percentage}%`;
            if (item.gas && item.percentage != null) return `${item.gas}: ${item.percentage}%`;
            return JSON.stringify(item);
          })
          .join(", ");
      }
      return val.map((x) => String(x)).join(", ");
    }

    // Common result payload shape from IPCC entries.
    if ("totalCO2e_kg" in val) {
      const kg = Number((val as any).totalCO2e_kg || 0);
      const tonnes = kg / 1000;
      return `${formatKg(kg)} kg CO2e (${formatTonnes(kg)} t CO2e)`;
    }

    return JSON.stringify(val);
  };

  const formatDetailValue = (column: string, value: any): string => {
    if (value == null) return "";

    if (column === "emission_selection" && typeof value === "string") {
      return EMISSION_SELECTION_LABELS[value] || value.replace(/_/g, " ").toUpperCase();
    }

    if (column === "month_start" && typeof value === "string") {
      return formatDateLike(value);
    }

    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "object") return formatObjectValue(value);
    if (typeof value === "string" && (value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value))) {
      return formatDateLike(value);
    }

    return String(value);
  };

  const isNumericDetailColumn = (column: string, rows: any[]): boolean => {
    return rows.some((row) => {
      const value = row?.[column];
      return (
        typeof value === "number" ||
        column === "emissions" ||
        column === "quantity" ||
        /(_kg|_liters|_miles|_factor|_pct|_percent)$/i.test(column)
      );
    });
  };

  useEffect(() => {
    document.title = "Emission Calculator Results";

    const run = async () => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      if (!isMariEnergiesUserEmail(user.email)) {
        navigate("/emission-results?source=epa", { replace: true });
        return;
      }

      try {
        const data = await loadEpaIpccResults(user.id);
        setResults(data);
        setSubmittedAt(new Date().toISOString());
      } finally {
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
      }
    };
    run();
  }, [user, navigate]);

  const exportCsv = () => {
    if (!results) return;

    const rows: (string | number)[][] = [];
    rows.push(["Report", "Emission Calculator Results"]);
    rows.push(["Generated By", "Emission Calculator"]);
    rows.push(["Generated At", new Date().toISOString()]);
    rows.push([]);
    rows.push(["Scope", "Category", "Emissions (kg CO2e)", "Emissions (t CO2e)"]);

    results.scope1.forEach((r) => rows.push(["Scope 1", r.label, r.value.toFixed(6), (r.value / 1000).toFixed(6)]));
    rows.push(["Scope 1", "Total", results.totals.scope1.toFixed(6), (results.totals.scope1 / 1000).toFixed(6)]);
    rows.push([]);

    results.scope2.forEach((r) => rows.push(["Scope 2", r.label, r.value.toFixed(6), (r.value / 1000).toFixed(6)]));
    rows.push(["Scope 2", "Total", results.totals.scope2.toFixed(6), (results.totals.scope2 / 1000).toFixed(6)]);
    rows.push([]);

    results.scope3.forEach((r) => rows.push(["Scope 3", r.label, r.value.toFixed(6), (r.value / 1000).toFixed(6)]));
    rows.push(["Scope 3", "Total", results.totals.scope3.toFixed(6), (results.totals.scope3 / 1000).toFixed(6)]);
    rows.push([]);
    rows.push(["All Scopes", "Grand Total", results.totals.grand.toFixed(6), (results.totals.grand / 1000).toFixed(6)]);

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emission-calculator-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const topScope1 = useMemo(() => {
    if (!results?.scope1?.length) return null;
    return [...results.scope1].sort((a, b) => b.value - a.value)[0];
  }, [results]);

  const loadCategoryDetails = async (key: string) => {
    if (!user) return;

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
        case "fuel":
          query = (supabase as any).from("scope1_fuel_entries").select("*").eq("user_id", user.id);
          break;
        case "mobile":
          query = (supabase as any).from("scope1_epa_mobile_fuel_entries").select("*").eq("user_id", user.id);
          break;
        case "onroad_gas":
          query = (supabase as any).from("scope1_epa_on_road_gasoline_entries").select("*").eq("user_id", user.id);
          break;
        case "onroad_diesel":
          query = (supabase as any).from("scope1_epa_on_road_diesel_alt_fuel_entries").select("*").eq("user_id", user.id);
          break;
        case "nonroad":
          query = (supabase as any).from("scope1_epa_non_road_vehicle_entries").select("*").eq("user_id", user.id);
          break;
        case "heatsteam":
          query = (supabase as any).from("scope1_heatsteam_entries_epa").select("*").eq("user_id", user.id);
          break;
        case "flaring":
          query = (supabase as any).from("ipcc_scope1_flaring_entries").select("*").eq("user_id", user.id);
          break;
        case "venting":
          query = (supabase as any).from("ipcc_scope1_venting_entries").select("*").eq("user_id", user.id);
          break;
        case "vehicular":
          query = (supabase as any).from("ipcc_scope1_vehicular_entries").select("*").eq("user_id", user.id);
          break;
        case "kitchen":
          query = (supabase as any).from("ipcc_scope1_kitchen_entries").select("*").eq("user_id", user.id);
          break;
        case "power":
          query = (supabase as any).from("ipcc_scope1_power_entries").select("*").eq("user_id", user.id);
          break;
        case "heating":
          query = (supabase as any).from("ipcc_scope1_heating_entries").select("*").eq("user_id", user.id);
          break;

        // Scope 2
        case "electricity":
          query = (supabase as any).from("scope2_electricity_subanswers").select("*").eq("user_id", user.id);
          break;
        case "scope2_heatsteam":
          query = (supabase as any).from("scope2_heatsteam_entries_epa").select("*").eq("user_id", user.id);
          break;

        // Scope 3
        case "purchased_goods":
          query = (supabase as any).from("scope3_purchased_goods_services").select("*").eq("user_id", user.id);
          break;
        case "capital_goods":
          query = (supabase as any).from("scope3_capital_goods").select("*").eq("user_id", user.id);
          break;
        case "fuel_energy":
          query = (supabase as any).from("scope3_fuel_energy_activities").select("*").eq("user_id", user.id);
          break;
        case "upstream_transport":
          query = (supabase as any).from("scope3_upstream_transportation").select("*").eq("user_id", user.id);
          break;
        case "waste":
          query = (supabase as any).from("scope3_waste_generated").select("*").eq("user_id", user.id);
          break;
        case "business_travel":
          query = (supabase as any).from("scope3_business_travel").select("*").eq("user_id", user.id);
          break;
        case "employee_commuting":
          query = (supabase as any).from("scope3_employee_commuting").select("*").eq("user_id", user.id);
          break;
        case "investments":
          query = (supabase as any).from("scope3_investments").select("*").eq("user_id", user.id);
          break;
        case "downstream_transport":
          query = (supabase as any).from("scope3_downstream_transportation").select("*").eq("user_id", user.id);
          break;
        case "end_of_life":
          query = (supabase as any).from("scope3_end_of_life_treatment").select("*").eq("user_id", user.id);
          break;
        case "processing_sold":
          query = (supabase as any).from("scope3_processing_sold_products").select("*").eq("user_id", user.id);
          break;
        case "use_of_sold":
          query = (supabase as any).from("scope3_use_of_sold_products").select("*").eq("user_id", user.id);
          break;
      }

      if (!query) {
        setDetailRows([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setDetailRows(data || []);
    } catch (e: any) {
      setDetailError(e?.message || "Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-3" />
          <p className="text-gray-700">Loading Emission Calculator results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg bg-white/90 border border-gray-200/50 shadow-xl rounded-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-gray-700">No results found yet for this emission calculator assessment.</p>
            <Button onClick={() => navigate("/emission-calculator-epa")} className="bg-teal-600 hover:bg-teal-700 text-white">
              Back to EPA Calculator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderScopeTable = (title: string, rows: EpaIpccResultsData["scope1"], total: number) => (
    <Card className="glass-effect border border-white/50 shadow-xl rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-gray-200/50 bg-white/30">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">kg CO2e</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">t CO2e</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.value > 0)
                .map((row) => (
                  <Fragment key={row.key}>
                    <tr className="border-t border-gray-200/50 hover:bg-white/50 transition-colors">
                      <td className="px-4 py-3 text-gray-800">{row.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatKg(row.value)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatTonnes(row.value)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => loadCategoryDetails(row.key)}>
                          {detailKey === row.key ? "Hide" : "View"}
                        </Button>
                      </td>
                    </tr>
                    {detailKey === row.key && !detailLoading && !detailError && detailRows.length > 0 && (
                      <tr>
                        <td colSpan={4} className="bg-white/60 px-4 pb-4">
                          <div className="mt-3 rounded-xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/30 p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold text-gray-800">Entry Details</div>
                              <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                {detailRows.length.toLocaleString()} entries
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gradient-to-r from-slate-100 via-gray-100 to-slate-100">
                                  {(() => {
                                    const visibleCols = Object.keys(detailRows[0] || {}).filter(
                                      (col) => !HIDDEN_DETAIL_COLUMNS.includes(col)
                                    );
                                    const numericCols = new Set(
                                      visibleCols.filter((col) => isNumericDetailColumn(col, detailRows))
                                    );
                                    return (
                                  <tr>
                                    <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide text-[10px] text-gray-500 whitespace-nowrap border-b border-gray-200 w-12">
                                      #
                                    </th>
                                        {visibleCols.map((col) => (
                                        <th
                                          key={col}
                                            className={`px-3 py-2.5 font-semibold uppercase tracking-wide text-[10px] text-gray-600 whitespace-nowrap border-b border-gray-200 ${
                                              numericCols.has(col) ? "text-right" : "text-left"
                                            }`}
                                        >
                                          {prettifyColumnLabel(col)}
                                        </th>
                                      ))}
                                  </tr>
                                    );
                                  })()}
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {detailRows.map((r: any, idx: number) => (
                                    <tr
                                      key={idx}
                                      className={`transition-colors hover:bg-teal-50/40 ${
                                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/45"
                                      }`}
                                    >
                                      <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 tabular-nums">
                                        {idx + 1}
                                      </td>
                                      {Object.keys(detailRows[0] || {})
                                        .filter((col) => !HIDDEN_DETAIL_COLUMNS.includes(col))
                                        .map((col) => {
                                          const isNumeric = isNumericDetailColumn(col, detailRows);
                                          return (
                                            <td
                                              key={col}
                                              className={`px-3 py-2.5 text-[12px] text-gray-800 align-top ${
                                                isNumeric ? "text-right tabular-nums" : "text-left"
                                              }`}
                                            >
                                              <div className="max-w-[260px] break-words leading-relaxed" title={formatDetailValue(col, r[col])}>
                                                {formatDetailValue(col, r[col])}
                                              </div>
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
                    {detailKey === row.key && detailLoading && (
                      <tr>
                        <td colSpan={4} className="px-4 pb-4 text-xs text-gray-500">
                          Loading details...
                        </td>
                      </tr>
                    )}
                    {detailKey === row.key && detailError && (
                      <tr>
                        <td colSpan={4} className="px-4 pb-4 text-xs text-red-600">
                          {detailError}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              <tr className="border-t-2 border-gray-300 bg-gradient-to-r from-gray-50/80 to-gray-100/80 font-semibold">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatKg(total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatTonnes(total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <style>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className={`relative glass-effect rounded-3xl shadow-2xl overflow-hidden ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <div className="px-4 sm:px-6 lg:px-8 py-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <BarChart3 className="h-10 w-10 text-teal-600" />
                <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Emission Calculator Results
                </h1>
              </div>
              <p className="text-gray-600 text-base sm:text-lg">
                Your emission calculator reporting view.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Submitted on{" "}
                <span className="font-semibold text-gray-800">
                  {new Date(submittedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate("/emission-calculator-epa")}
                  className="glass-effect border-teal-200 hover:border-teal-400 hover:bg-teal-50/50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to EPA Calculator
                </Button>
                <Button onClick={exportCsv} className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
                    <Factory className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Scope 1</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.scope1)} t
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Scope 2</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.scope2)} t
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Scope 3</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.scope3)} t
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <Leaf className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Grand Total</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.grand)} t
                </div>
              </CardContent>
            </Card>
          </div>

          {topScope1 && topScope1.value > 0 && (
            <Card className={`glass-effect border border-white/50 shadow-sm rounded-2xl ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
              <CardContent className="py-4 px-5 text-sm text-gray-700">
                Largest Scope 1 contributor: <span className="font-semibold text-gray-900">{topScope1.label}</span>
              </CardContent>
            </Card>
          )}

          <div className={`space-y-6 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            {renderScopeTable("Scope 1 Breakdown", results.scope1, results.totals.scope1)}
            {renderScopeTable("Scope 2 Breakdown", results.scope2, results.totals.scope2)}
            {renderScopeTable("Scope 3 Breakdown", results.scope3, results.totals.scope3)}
          </div>

          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <Button
              onClick={() => navigate("/emission-calculator-epa")}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              size="lg"
            >
              Edit Assessment
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="glass-effect border-teal-200 hover:border-teal-400 hover:bg-teal-50/50 px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              size="lg"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmissionResultsEpaIpcc;


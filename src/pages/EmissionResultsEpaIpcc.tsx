import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Download, Factory, Leaf, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadEpaIpccResults, EpaIpccResultsData } from "@/lib/epaIpccResults";
import { isMariEnergiesUserEmail } from "@/utils/roleUtils";

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

  useEffect(() => {
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
    a.download = "emissions-epa-ipcc-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const topScope1 = useMemo(() => {
    if (!results?.scope1?.length) return null;
    return [...results.scope1].sort((a, b) => b.value - a.value)[0];
  }, [results]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-3" />
          <p className="text-gray-700">Loading EPA + IPCC results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg bg-white/90 border border-gray-200/50 shadow-xl rounded-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-gray-700">No results found yet for this EPA + IPCC assessment.</p>
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
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.value > 0)
                .map((row) => (
                  <tr key={row.key} className="border-t border-gray-200/50 hover:bg-white/50 transition-colors">
                    <td className="px-4 py-3 text-gray-800">{row.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatKg(row.value)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatTonnes(row.value)}</td>
                  </tr>
                ))}
              <tr className="border-t-2 border-gray-300 bg-gradient-to-r from-gray-50/80 to-gray-100/80 font-semibold">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatKg(total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatTonnes(total)}</td>
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
                  EPA + IPCC Emission Results
                </h1>
              </div>
              <p className="text-gray-600 text-base sm:text-lg">
                Combined reporting view for EPA baseline and embedded IPCC Scope 1 modules.
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


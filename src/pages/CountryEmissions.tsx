import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

type CountryEmissionRow = Record<string, any>;

const pickValue = (row: CountryEmissionRow, patterns: RegExp[]): any => {
  const keys = Object.keys(row || {});
  for (const p of patterns) {
    const key = keys.find((k) => p.test(k));
    if (key) return row[key];
  }
  return undefined;
};

const toNumber = (value: any): number => {
  if (typeof value === "number") return isFinite(value) ? value : 0;
  if (value == null) return 0;
  const s = String(value).trim().replace(/,/g, "");
  const match = s.match(/^(-?\d*\.?\d+)\s*([kmbt])?/i);
  if (!match) return 0;
  const n = parseFloat(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  const mult = suffix === "k" ? 1e3 : suffix === "m" ? 1e6 : suffix === "b" ? 1e9 : suffix === "t" ? 1e12 : 1;
  return isFinite(n) ? n * mult : 0;
};

const formatCompact = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(n);

const formatHeroEmission = (n: number) => {
  if (!isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const CountryEmissions: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CountryEmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sector, setSector] = useState("all");
  const [region, setRegion] = useState("all");
  const [gas, setGas] = useState("all");
  const [timeHorizon, setTimeHorizon] = useState<"100 YR" | "20 YR">("100 YR");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("country_emissions" as any).select("*");
      if (!error) setRows(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const sectors = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => pickValue(r, [/^sector$/i, /sector/i]))
            .filter((v) => v != null && String(v).trim().length > 0)
            .map((v) => String(v).trim()),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const regions = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => pickValue(r, [/^region$/i, /region/i]))
            .filter((v) => v != null && String(v).trim().length > 0)
            .map((v) => String(v).trim()),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const gases = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => pickValue(r, [/^gas$/i, /ghg/i, /co2e/i]))
            .filter((v) => v != null && String(v).trim().length > 0)
            .map((v) => String(v).trim()),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const rowSector = String(pickValue(r, [/^sector$/i, /sector/i]) ?? "").trim();
      const rowRegion = String(pickValue(r, [/^region$/i, /region/i]) ?? "").trim();
      const rowGas = String(pickValue(r, [/^gas$/i, /ghg/i, /co2e/i]) ?? "").trim();
      return (sector === "all" || rowSector === sector) && (region === "all" || rowRegion === region) && (gas === "all" || rowGas === gas);
    });
  }, [rows, sector, region, gas]);

  const totalEmissions = useMemo(
    () =>
      filtered.reduce((sum, r) => {
        const v = pickValue(r, [/^emissions?$/i, /total.*emissions?/i, /co2e/i, /^value$/i]);
        return sum + toNumber(v);
      }, 0),
    [filtered],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-emerald-50/15 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Country Emissions</h1>
          <Button variant="outline" onClick={() => navigate("/explore")} className="border-teal-600 text-teal-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <Card className="border-teal-200/60 bg-white/90">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Sector</p>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sectors</SelectItem>
                  {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Region</p>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Time span</p>
              <div className="h-10 rounded-md border border-input bg-background px-3 flex items-center justify-between text-sm text-gray-700">
                <span>2020-01</span>
                <span className="text-gray-400">→</span>
                <span>2026-03</span>
                <Calendar className="w-4 h-4 text-gray-400 ml-2" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Gas</p>
              <Select value={gas} onValueChange={setGas}>
                <SelectTrigger><SelectValue placeholder="Gas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All gases</SelectItem>
                  {gases.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Time horizon</p>
              <div className="h-10 rounded-md border border-input bg-background flex items-center p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setTimeHorizon("100 YR")}
                  className={`flex-1 h-8 rounded text-xs font-medium ${timeHorizon === "100 YR" ? "bg-teal-100 text-teal-800" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  100 YR
                </button>
                <button
                  type="button"
                  onClick={() => setTimeHorizon("20 YR")}
                  className={`flex-1 h-8 rounded text-xs font-medium ${timeHorizon === "20 YR" ? "bg-teal-100 text-teal-800" : "text-gray-600 hover:bg-gray-100"}`}
                >
                  20 YR
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-2xl border border-gray-300 bg-white/90 shadow-sm">
            <CardContent className="h-36 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-800">{filtered.length.toLocaleString()}</p>
                <p className="text-lg font-semibold text-gray-700 mt-1">All countries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-gray-300 bg-white/90 shadow-sm">
            <CardContent className="h-36 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-800">{formatHeroEmission(totalEmissions)}<span className="text-2xl font-semibold ml-1">t</span></p>
                <p className="text-lg font-semibold text-gray-700 mt-1">{gas === "all" ? "CO2e" : gas} {timeHorizon.toLowerCase().replace(" ", "")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-gray-500 max-w-4xl">
          * Emissions totals exclude land use, land-use change, and forestry (LULUCF). To view those emissions, select Forestry and Land Use from sector filters if present in your dataset.
        </p>

        <Card className="border-teal-200/60">
          <CardHeader>
            <CardTitle>Country Ranking</CardTitle>
            <CardDescription>Explore emissions by country (no download actions)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-600">Loading country emissions...</div>
            ) : (
              <div className="overflow-auto max-h-[560px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">Country</th>
                      <th className="py-2">Emissions</th>
                      <th className="py-2">Percentage Change</th>
                      <th className="py-2">Emissions / Capita</th>
                      <th className="py-2">Global</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={i} className="border-b hover:bg-teal-50/40">
                        <td className="py-2 font-medium">{pickValue(r, [/^country$/i, /country/i]) ?? "-"}</td>
                        <td className="py-2">{pickValue(r, [/^emissions?$/i, /co2e/i, /total.*emissions?/i]) ?? "-"}</td>
                        <td className="py-2">{pickValue(r, [/percentage.*change/i, /change/i]) ?? "-"}</td>
                        <td className="py-2">{pickValue(r, [/emissions?.*capita/i, /capita/i]) ?? "-"}</td>
                        <td className="py-2">{pickValue(r, [/^global$/i, /global/i]) ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CountryEmissions;


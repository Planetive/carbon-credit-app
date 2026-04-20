import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Calendar, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactCountryFlag from "react-country-flag";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

type CountryEmissionRow = Record<string, any>;
type CountryAggregateRow = {
  key: string;
  name: string;
  alpha2?: string;
  emissions: number;
  percentageChangeAvg?: number;
};

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

const formatPct = (value: number | undefined): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
};

const formatEmissionWithUnit = (n: number): { value: string; unit: string } => {
  if (!Number.isFinite(n) || n === 0) return { value: "0", unit: "t of CO₂" };
  return { value: formatCompact(n), unit: "t of CO₂" };
};

const getRowYearMonth = (row: CountryEmissionRow): { year: number; month: number } | undefined => {
  const yearRaw = pickValue(row, [/^year$/i, /report.*year/i, /inventory.*year/i, /year/i]);
  const monthRaw = pickValue(row, [/^month$/i, /report.*month/i, /inventory.*month/i, /month/i]);
  const dateRaw = pickValue(row, [/^date$/i, /period/i, /timestamp/i, /created_at/i, /updated_at/i]);

  let year = Number(yearRaw);
  let month = Number(monthRaw);

  if ((!Number.isFinite(year) || year <= 0) && dateRaw) {
    const parsed = new Date(String(dateRaw));
    if (!Number.isNaN(parsed.getTime())) {
      year = parsed.getUTCFullYear();
      month = parsed.getUTCMonth() + 1;
    }
  }

  if (!Number.isFinite(year) || year <= 0) return undefined;
  if (!Number.isFinite(month) || month <= 0 || month > 12) month = 1;

  return { year, month };
};

const getRowSector = (row: CountryEmissionRow): string =>
  String(pickValue(row, [/^sector$/i, /sector/i]) ?? "").trim();

const getRowSubSector = (row: CountryEmissionRow): string =>
  String(
    pickValue(row, [/^sub[_\s-]?sector$/i, /sub.*sector/i, /^sub[_\s-]?category$/i, /sub.*category/i]) ?? "",
  ).trim();

const encodeFilterPart = (value: string): string => encodeURIComponent(value);
const decodeFilterPart = (value: string): string => decodeURIComponent(value);
const yearMonthToNumber = (year: number, month: number): number => year * 100 + month;
const humanizeToken = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parseMonthValue = (value: string): { year: number; month: number } | undefined => {
  if (!/^\d{4}-\d{2}$/.test(value)) return undefined;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return undefined;
  return { year, month };
};
const toMonthValue = (year: number, month: number): string => `${year}-${String(month).padStart(2, "0")}`;

const getCountryDisplay = (row: CountryEmissionRow): { name: string; alpha2?: string } => {
  const raw = String(
    pickValue(row, [
      /^country$/i,
      /^country_code$/i,
      /^country_iso3$/i,
      /^iso3$/i,
      /country.*code/i,
      /country/i,
    ]) ?? "",
  ).trim();

  if (!raw) return { name: "-" };

  const normalized = raw.toUpperCase();

  // ISO 3166-1 alpha-3 input (e.g., ARE)
  if (/^[A-Z]{3}$/.test(normalized)) {
    const alpha2 = countries.alpha3ToAlpha2(normalized) || undefined;
    const name = alpha2
      ? countries.getName(alpha2, "en") || countries.getName(normalized, "en")
      : countries.getName(normalized, "en");
    return { name: name || raw, alpha2 };
  }

  // ISO 3166-1 alpha-2 input (e.g., AE)
  if (/^[A-Z]{2}$/.test(normalized)) {
    const name = countries.getName(normalized, "en");
    return { name: name || raw, alpha2: normalized };
  }

  // Country name input
  const alpha2 = countries.getAlpha2Code(raw, "en") || undefined;
  return { name: raw, alpha2 };
};

const CountryEmissions: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CountryEmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sectorFilter, setSectorFilter] = useState("all");
  const [region, setRegion] = useState("all");
  const [gas, setGas] = useState("all");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [sectorPickerOpen, setSectorPickerOpen] = useState(false);
  const [sectorMenuSector, setSectorMenuSector] = useState("");
  const [activeTrendSectors, setActiveTrendSectors] = useState<string[]>([]);
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{
    x: number;
    y: number;
    sector: string;
    value: number;
    label: string;
    color: string;
  } | null>(null);
  const [exploreMode, setExploreMode] = useState<"rank" | "sector" | "trends">("rank");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const pageSize = 1000;
      let from = 0;
      const all: CountryEmissionRow[] = [];

      while (true) {
        const { data, error } = await supabase
          .from("country_emissions" as any)
          .select("*")
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("Failed loading country_emissions page:", error);
          break;
        }

        const chunk = data || [];
        all.push(...chunk);

        if (chunk.length < pageSize) break;
        from += pageSize;
      }

      setRows(all);
      setLoading(false);
    };
    load();
  }, []);

  const sectorMenu = useMemo(() => {
    const sectorMap = new Map<string, Set<string>>();
    for (const row of rows) {
      const sector = getRowSector(row);
      if (!sector) continue;
      if (!sectorMap.has(sector)) sectorMap.set(sector, new Set<string>());
      const sub = getRowSubSector(row);
      if (sub) sectorMap.get(sector)?.add(sub);
    }

    return Array.from(sectorMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([sector, subs]) => ({
        sector,
        subsectors: Array.from(subs).sort((a, b) => a.localeCompare(b)),
      }));
  }, [rows]);

  const selectedSectorLabel = useMemo(() => {
    if (sectorFilter === "all") return "All sectors";
    if (sectorFilter.startsWith("subsector::")) {
      const [, encodedSector, encodedSubSector] = sectorFilter.split("::");
      const sectorName = humanizeToken(decodeFilterPart(encodedSector || ""));
      const subName = humanizeToken(decodeFilterPart(encodedSubSector || ""));
      return `${sectorName} / ${subName}`;
    }
    if (sectorFilter.startsWith("sector::")) {
      const [, encodedSector] = sectorFilter.split("::");
      return humanizeToken(decodeFilterPart(encodedSector || ""));
    }
    return "All sectors";
  }, [sectorFilter]);

  useEffect(() => {
    if (!sectorPickerOpen) return;
    if (sectorMenuSector && sectorMenu.some((item) => item.sector === sectorMenuSector)) return;
    setSectorMenuSector(sectorMenu[0]?.sector || "");
  }, [sectorPickerOpen, sectorMenuSector, sectorMenu]);

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

  const availableTimeRange = useMemo(() => {
    let minPeriod: { year: number; month: number } | undefined;
    let maxPeriod: { year: number; month: number } | undefined;

    for (const row of rows) {
      const period = getRowYearMonth(row);
      if (!period) continue;
      const n = yearMonthToNumber(period.year, period.month);
      if (!minPeriod || n < yearMonthToNumber(minPeriod.year, minPeriod.month)) minPeriod = period;
      if (!maxPeriod || n > yearMonthToNumber(maxPeriod.year, maxPeriod.month)) maxPeriod = period;
    }

    const toInputValue = (p?: { year: number; month: number }) =>
      p ? `${p.year}-${String(p.month).padStart(2, "0")}` : "";

    return {
      min: toInputValue(minPeriod),
      max: toInputValue(maxPeriod),
    };
  }, [rows]);

  const yearOptions = useMemo(() => {
    const minParsed = parseMonthValue(availableTimeRange.min);
    const maxParsed = parseMonthValue(availableTimeRange.max);
    if (!minParsed || !maxParsed) return [] as number[];
    const years: number[] = [];
    for (let y = minParsed.year; y <= maxParsed.year; y += 1) years.push(y);
    return years;
  }, [availableTimeRange.max, availableTimeRange.min]);

  useEffect(() => {
    if (!availableTimeRange.min || !availableTimeRange.max) return;
    setTimeStart((prev) => prev || availableTimeRange.min);
    setTimeEnd((prev) => prev || availableTimeRange.max);
  }, [availableTimeRange.min, availableTimeRange.max]);

  const selectedStart = useMemo(() => parseMonthValue(timeStart), [timeStart]);
  const selectedEnd = useMemo(() => parseMonthValue(timeEnd), [timeEnd]);

  const selectMonth = (part: "start" | "end", year: number, month: number) => {
    const next = toMonthValue(year, month);
    if (part === "start") {
      setTimeStart(next);
      const endParsed = parseMonthValue(timeEnd);
      if (endParsed && yearMonthToNumber(year, month) > yearMonthToNumber(endParsed.year, endParsed.month)) {
        setTimeEnd(next);
      }
      return;
    }

    setTimeEnd(next);
    const startParsed = parseMonthValue(timeStart);
    if (startParsed && yearMonthToNumber(year, month) < yearMonthToNumber(startParsed.year, startParsed.month)) {
      setTimeStart(next);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const rowSector = getRowSector(r);
      const rowSubSector = getRowSubSector(r);
      const rowRegion = String(pickValue(r, [/^region$/i, /region/i]) ?? "").trim();
      const rowGas = String(pickValue(r, [/^gas$/i, /ghg/i, /co2e/i]) ?? "").trim();
      const period = getRowYearMonth(r);
      const rowPeriod = period ? yearMonthToNumber(period.year, period.month) : undefined;
      const startPeriod = /^\d{4}-\d{2}$/.test(timeStart)
        ? yearMonthToNumber(Number(timeStart.slice(0, 4)), Number(timeStart.slice(5, 7)))
        : undefined;
      const endPeriod = /^\d{4}-\d{2}$/.test(timeEnd)
        ? yearMonthToNumber(Number(timeEnd.slice(0, 4)), Number(timeEnd.slice(5, 7)))
        : undefined;
      const timeRangeMatch =
        rowPeriod == null
          ? true
          : (startPeriod == null || rowPeriod >= startPeriod) && (endPeriod == null || rowPeriod <= endPeriod);

      let sectorMatch = true;
      if (sectorFilter !== "all") {
        if (sectorFilter.startsWith("subsector::")) {
          const [, encodedSector, encodedSubSector] = sectorFilter.split("::");
          const selectedSector = decodeFilterPart(encodedSector || "");
          const selectedSubSector = decodeFilterPart(encodedSubSector || "");
          sectorMatch = rowSector === selectedSector && rowSubSector === selectedSubSector;
        } else if (sectorFilter.startsWith("sector::")) {
          const [, encodedSector] = sectorFilter.split("::");
          const selectedSector = decodeFilterPart(encodedSector || "");
          sectorMatch = rowSector === selectedSector;
        }
      }

      return (
        sectorMatch &&
        (region === "all" || rowRegion === region) &&
        (gas === "all" || rowGas === gas) &&
        timeRangeMatch
      );
    });
  }, [rows, sectorFilter, region, gas, timeStart, timeEnd]);

  const totalEmissions = useMemo(
    () =>
      filtered.reduce((sum, r) => {
        const v = pickValue(r, [/^emissions?$/i, /total.*emissions?/i, /co2e/i, /^value$/i]);
        return sum + toNumber(v);
      }, 0),
    [filtered],
  );

  const aggregatedByCountry = useMemo<CountryAggregateRow[]>(() => {
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        alpha2?: string;
        emissions: number;
        pctSum: number;
        pctCount: number;
      }
    >();

    for (const row of filtered) {
      const country = getCountryDisplay(row);
      const key = (country.alpha2 || country.name || "unknown").toUpperCase();
      const emissions = toNumber(pickValue(row, [/^emissions?$/i, /total.*emissions?/i, /co2e/i, /^value$/i]));
      const pctRaw = pickValue(row, [/percentage.*change/i, /change/i]);
      const pctVal = toNumber(pctRaw);

      const existing = map.get(key) || {
        key,
        name: country.name,
        alpha2: country.alpha2,
        emissions: 0,
        pctSum: 0,
        pctCount: 0,
      };

      existing.emissions += emissions;
      if (String(pctRaw ?? "").trim() !== "-" && Number.isFinite(pctVal)) {
        existing.pctSum += pctVal;
        existing.pctCount += 1;
      }
      map.set(key, existing);
    }

    return Array.from(map.values())
      .map((v) => ({
        key: v.key,
        name: v.name,
        alpha2: v.alpha2,
        emissions: v.emissions,
        percentageChangeAvg: v.pctCount > 0 ? v.pctSum / v.pctCount : undefined,
      }))
      .sort((a, b) => b.emissions - a.emissions);
  }, [filtered]);

  const aggregatedBySector = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of filtered) {
      const sectorName = String(pickValue(row, [/^sector$/i, /sector/i]) ?? "Unknown").trim() || "Unknown";
      const emissions = toNumber(pickValue(row, [/^emissions?$/i, /total.*emissions?/i, /co2e/i, /^value$/i]));
      m.set(sectorName, (m.get(sectorName) || 0) + emissions);
    }
    const total = Array.from(m.values()).reduce((s, v) => s + v, 0);
    return Array.from(m.entries())
      .map(([name, emissions]) => ({
        name,
        emissions,
        pct: total > 0 ? (emissions / total) * 100 : 0,
      }))
      .sort((a, b) => b.emissions - a.emissions);
  }, [filtered]);

  const sectorBlocks = useMemo(() => {
    if (aggregatedBySector.length === 0) return [];
    const minHeightPct = 5;
    const count = aggregatedBySector.length;
    const totalEmissions = aggregatedBySector.reduce((sum, s) => sum + s.emissions, 0);

    if (totalEmissions <= 0) {
      const equalHeight = 100 / count;
      return aggregatedBySector.map((s) => ({ ...s, heightPct: equalHeight }));
    }

    const minReserved = minHeightPct * count;
    if (minReserved >= 100) {
      const equalHeight = 100 / count;
      return aggregatedBySector.map((s) => ({ ...s, heightPct: equalHeight }));
    }

    const remaining = 100 - minReserved;
    return aggregatedBySector.map((s) => ({
      ...s,
      heightPct: minHeightPct + (s.emissions / totalEmissions) * remaining,
    }));
  }, [aggregatedBySector]);

  const sectorColors = ["#22a3ad", "#8b5cf6", "#f7b500", "#ff632e", "#1f9fd1", "#ff3e67", "#1e88e5", "#a7cc2a"];

  const sectorColorMap = useMemo(() => {
    const map = new Map<string, string>();
    aggregatedBySector.forEach((sector, idx) => {
      map.set(sector.name, sectorColors[idx % sectorColors.length]);
    });
    return map;
  }, [aggregatedBySector]);

  useEffect(() => {
    const names = aggregatedBySector.map((s) => s.name);
    setActiveTrendSectors((prev) => {
      if (!prev.length) return names;
      const kept = prev.filter((name) => names.includes(name));
      return kept.length ? kept : names;
    });
  }, [aggregatedBySector]);

  const trendData = useMemo(() => {
    const periodMap = new Map<number, string>();
    const bySectorPeriod = new Map<string, Map<number, number>>();

    for (const row of filtered) {
      const period = getRowYearMonth(row);
      if (!period) continue;
      if (period.year > 2025) continue;
      const sectorName = getRowSector(row) || "Unknown";
      const emissions = toNumber(pickValue(row, [/^emissions?$/i, /total.*emissions?/i, /co2e/i, /^value$/i]));
      const sortKey = period.year;
      const label = String(period.year);

      periodMap.set(sortKey, label);
      const sectorMap = bySectorPeriod.get(sectorName) || new Map<number, number>();
      sectorMap.set(sortKey, (sectorMap.get(sortKey) || 0) + emissions);
      bySectorPeriod.set(sectorName, sectorMap);
    }

    const keys = Array.from(periodMap.keys()).sort((a, b) => a - b);
    const labels = keys.map((k) => periodMap.get(k) || String(k));
    const sectors = aggregatedBySector.map((s) => s.name).filter((name) => bySectorPeriod.has(name));

    const series = sectors.map((name) => ({
      name,
      values: keys.map((k) => bySectorPeriod.get(name)?.get(k) || 0),
    }));

    return { keys, labels, series };
  }, [filtered, aggregatedBySector]);

  const visibleTrendSeries = useMemo(
    () => trendData.series.filter((s) => activeTrendSectors.includes(s.name)),
    [trendData.series, activeTrendSectors],
  );

  const trendChartMax = useMemo(() => {
    const max = Math.max(0, ...visibleTrendSeries.flatMap((s) => s.values));
    return max > 0 ? max : 1;
  }, [visibleTrendSeries]);

  const trendChart = {
    viewWidth: 980,
    viewHeight: 360,
    xMin: 52,
    xMax: 960,
    yMin: 28,
    yMax: 300,
    xLabelY: 332,
  } as const;

  const trendHoverTargets = useMemo(() => {
    const maxIndex = Math.max(1, trendData.labels.length - 1);
    return visibleTrendSeries.flatMap((series) => {
      const color = sectorColorMap.get(series.name) || "#22a3ad";
      return series.values.map((val, idx) => {
        const x = trendChart.xMin + (idx / maxIndex) * (trendChart.xMax - trendChart.xMin);
        const y = trendChart.yMin + (1 - val / trendChartMax) * (trendChart.yMax - trendChart.yMin);
        return {
          x,
          y,
          sector: series.name,
          value: val,
          label: trendData.labels[idx],
          color,
        };
      });
    });
  }, [visibleTrendSeries, trendData.labels, trendChartMax, trendChart.xMax, trendChart.xMin, trendChart.yMax, trendChart.yMin, sectorColorMap]);

  const handleTrendMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (trendHoverTargets.length === 0) {
      setHoveredTrendPoint(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * trendChart.viewWidth;
    const sy = ((e.clientY - rect.top) / rect.height) * trendChart.viewHeight;

    let nearest = trendHoverTargets[0];
    let minDistSq = Number.POSITIVE_INFINITY;
    for (const p of trendHoverTargets) {
      const dx = p.x - sx;
      const dy = p.y - sy;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        nearest = p;
      }
    }

    // Keep hover active in surrounding area, not only exact point.
    const hoverRadius = 26;
    if (minDistSq <= hoverRadius * hoverRadius) {
      setHoveredTrendPoint(nearest);
    } else {
      setHoveredTrendPoint(null);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Country Emissions</h1>
          <Button variant="outline" onClick={() => navigate("/explore")} className="border-teal-600 text-teal-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <Card className="rounded-2xl border border-gray-200/60 bg-white/90 backdrop-blur-sm shadow-xl">
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-600">Sector</p>
              <Popover open={sectorPickerOpen} onOpenChange={setSectorPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span className="truncate text-left">{selectedSectorLabel}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 rotate-90 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[520px] p-0" align="start">
                  <div className="grid grid-cols-2">
                    <div className="border-r border-gray-200 max-h-[320px] overflow-auto py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSectorFilter("all");
                          setSectorPickerOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${
                          sectorFilter === "all" ? "bg-teal-50 text-teal-800" : "text-gray-700"
                        }`}
                      >
                        All sectors
                      </button>
                      {sectorMenu.map((item) => {
                        const encodedSector = encodeFilterPart(item.sector);
                        const optionValue = `sector::${encodedSector}`;
                        const active = sectorFilter === optionValue || sectorMenuSector === item.sector;
                        return (
                          <button
                            key={item.sector}
                            type="button"
                            onMouseEnter={() => setSectorMenuSector(item.sector)}
                            onFocus={() => setSectorMenuSector(item.sector)}
                            onClick={() => setSectorFilter(optionValue)}
                            className={`w-full px-3 py-1.5 text-left text-sm flex items-center justify-between hover:bg-gray-100 ${
                              active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                            }`}
                          >
                            <span className="truncate pr-2">{humanizeToken(item.sector)}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="max-h-[320px] overflow-auto py-1">
                      {sectorMenu.find((item) => item.sector === sectorMenuSector)?.subsectors?.length ? (
                        sectorMenu
                          .find((item) => item.sector === sectorMenuSector)!
                          .subsectors.map((sub) => {
                            const value = `subsector::${encodeFilterPart(sectorMenuSector)}::${encodeFilterPart(sub)}`;
                            const active = sectorFilter === value;
                            return (
                              <button
                                key={`${sectorMenuSector}-${sub}`}
                                type="button"
                                onClick={() => {
                                  setSectorFilter(value);
                                  setSectorPickerOpen(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${
                                  active ? "bg-teal-50 text-teal-800" : "text-gray-700"
                                }`}
                              >
                                {humanizeToken(sub)}
                              </button>
                            );
                          })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No sub-sectors</div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
              <Popover open={timePickerOpen} onOpenChange={setTimePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <span className="truncate">{timeStart || "---- --"} {"\u2192"} {timeEnd || "---- --"}</span>
                    <Calendar className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] p-3" align="start">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600">Start</p>
                      <select
                        value={selectedStart?.year ?? ""}
                        onChange={(e) => {
                          const nextYear = Number(e.target.value);
                          if (!Number.isFinite(nextYear)) return;
                          const month = selectedStart?.month ?? 1;
                          selectMonth("start", nextYear, month);
                        }}
                        className="h-8 w-full rounded border border-gray-200 bg-white px-2 text-xs"
                      >
                        {yearOptions.map((y) => (
                          <option key={`start-${y}`} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-1">
                        {monthLabels.map((label, idx) => {
                          const month = idx + 1;
                          const active = selectedStart?.month === month;
                          return (
                            <button
                              key={`start-${label}`}
                              type="button"
                              onClick={() => selectMonth("start", selectedStart?.year ?? yearOptions[0], month)}
                              className={`h-7 rounded text-[11px] ${
                                active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600">End</p>
                      <select
                        value={selectedEnd?.year ?? ""}
                        onChange={(e) => {
                          const nextYear = Number(e.target.value);
                          if (!Number.isFinite(nextYear)) return;
                          const month = selectedEnd?.month ?? 12;
                          selectMonth("end", nextYear, month);
                        }}
                        className="h-8 w-full rounded border border-gray-200 bg-white px-2 text-xs"
                      >
                        {yearOptions.map((y) => (
                          <option key={`end-${y}`} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-1">
                        {monthLabels.map((label, idx) => {
                          const month = idx + 1;
                          const active = selectedEnd?.month === month;
                          return (
                            <button
                              key={`end-${label}`}
                              type="button"
                              onClick={() => selectMonth("end", selectedEnd?.year ?? yearOptions[yearOptions.length - 1], month)}
                              className={`h-7 rounded text-[11px] ${
                                active ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-2xl border border-gray-200/70 bg-white/90 shadow-lg">
            <CardContent className="h-36 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-800">{aggregatedByCountry.length.toLocaleString()}</p>
                <p className="text-lg font-semibold text-gray-700 mt-1">All countries</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-gray-200/70 bg-white/90 shadow-lg">
            <CardContent className="h-36 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-800">{formatHeroEmission(totalEmissions)}<span className="text-2xl font-semibold ml-1">t</span></p>
                <p className="text-lg font-semibold text-gray-700 mt-1">{gas === "all" ? "CO2e" : gas}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-sm text-gray-500 max-w-4xl">
          * Emissions totals exclude land use, land-use change, and forestry (LULUCF). To view those emissions, select Forestry and Land Use from sector filters if present in your dataset.
        </p>

        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-gray-800">Explore emissions by:</h3>
          <div className="inline-flex rounded-md border border-gray-300 overflow-hidden bg-white">
            {[
              { key: "rank", label: "Rank" },
              { key: "sector", label: "Sector" },
              { key: "trends", label: "Trends" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setExploreMode(tab.key as "rank" | "sector" | "trends")}
                className={`px-4 py-2 text-sm font-medium border-r last:border-r-0 ${
                  exploreMode === tab.key ? "bg-gray-50 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {exploreMode === "rank" && (
          <Card className="rounded-2xl border border-gray-200/60 bg-white/90 shadow-xl">
          <CardHeader>
            <CardTitle>Country Ranking</CardTitle>
            <CardDescription>Explore emissions by country (no download actions)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-600">Loading country emissions...</div>
            ) : (
              <div className="overflow-auto max-h-[560px]">
                <table className="w-full text-base">
                  <thead className="sticky top-0 bg-white">
                    <tr className="text-left text-gray-600 border-b">
                      <th className="py-3 font-semibold">Country</th>
                      <th className="py-3 font-semibold">Emissions</th>
                      <th className="py-3 font-semibold">Percentage Change</th>
                      <th className="py-3 font-semibold">Global</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedByCountry.map((r, i) => {
                      const emission = formatEmissionWithUnit(r.emissions);
                      return (
                      <tr key={i} className="border-b hover:bg-teal-50/40">
                        <td className="py-3 font-medium">
                          <div className="flex items-center gap-2.5">
                            <span className="text-gray-500 w-10 text-right text-lg">{String(i + 1).padStart(2, "0")}.</span>
                            <span className="text-2xl font-semibold text-gray-900">{r.name}</span>
                            {r.alpha2 && (
                              <ReactCountryFlag
                                countryCode={r.alpha2}
                                svg
                                style={{ width: "1.25em", height: "1.25em" }}
                                aria-label={r.name}
                              />
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-3xl font-semibold text-gray-900">{emission.value}</span>
                          <span className="ml-1.5 text-base text-gray-500">{emission.unit}</span>
                        </td>
                        <td className="py-3 text-2xl font-medium text-gray-900">{formatPct(r.percentageChangeAvg)}</td>
                        <td className="py-3 text-2xl font-medium text-gray-900">
                          {totalEmissions > 0 ? `${((r.emissions / totalEmissions) * 100).toFixed(2)}%` : "0.00%"}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {exploreMode === "sector" && (
          <Card className="rounded-2xl border border-gray-200/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle>Sector Breakdown</CardTitle>
              <CardDescription>Block size represents each sector's emissions share</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sectorBlocks.length === 0 ? (
                <div className="text-sm text-gray-600">No sector data for current filters.</div>
              ) : (
                <div className="h-[560px] w-full overflow-hidden rounded-xl border border-gray-200">
                  {sectorBlocks.map((s, idx) => {
                    const emission = formatEmissionWithUnit(s.emissions);
                    return (
                      <div
                        key={s.name}
                        className="px-4 md:px-5 text-white flex items-center justify-between border-b border-white/35 last:border-b-0"
                        style={{
                          backgroundColor: sectorColors[idx % sectorColors.length],
                          height: `${s.heightPct}%`,
                        }}
                      >
                        <span className="font-semibold text-sm md:text-base truncate pr-3">{s.name}</span>
                        <span className="font-semibold text-sm md:text-base whitespace-nowrap">
                          {emission.value} {emission.unit} ({s.pct.toFixed(2)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {exploreMode === "trends" && (
          <Card className="rounded-2xl border border-gray-200/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle>Emissions Trends</CardTitle>
              <CardDescription>Compare sector trajectories over time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trendData.labels.length === 0 ? (
                <div className="text-sm text-gray-600">No trend data for current filters.</div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTrendSectors(aggregatedBySector.map((s) => s.name))}
                      className={`min-w-[100px] rounded border px-3 py-2 text-left ${
                        activeTrendSectors.length === aggregatedBySector.length
                          ? "border-gray-900 bg-gray-100 text-gray-900"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <div className="text-sm font-semibold">All</div>
                      <div className="text-xs text-gray-600">{formatCompact(totalEmissions)} t</div>
                    </button>
                    {aggregatedBySector.map((s) => {
                      const selected = activeTrendSectors.includes(s.name);
                      return (
                        <button
                          key={s.name}
                          type="button"
                          onClick={() =>
                            setActiveTrendSectors((prev) =>
                              prev.includes(s.name) ? prev.filter((v) => v !== s.name) : [...prev, s.name],
                            )
                          }
                          className={`min-w-[118px] rounded border px-3 py-2 text-left text-white transition-opacity ${
                            selected ? "opacity-100 border-transparent" : "opacity-45 border-transparent"
                          }`}
                          style={{ backgroundColor: sectorColorMap.get(s.name) || "#22a3ad" }}
                        >
                          <div className="text-sm font-semibold leading-tight">{humanizeToken(s.name)}</div>
                          <div className="text-xs mt-1">{formatCompact(s.emissions)} t</div>
                          <div className="text-xs">{s.pct.toFixed(1)}%</div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-sm text-gray-600">Select to turn sector on/off (yearly trend view)</p>

                  <div className="overflow-x-auto">
                    <svg
                      viewBox="0 0 980 360"
                      className="w-full min-w-[860px] h-[360px]"
                      onMouseMove={handleTrendMouseMove}
                      onMouseLeave={() => setHoveredTrendPoint(null)}
                    >
                      {Array.from({ length: 6 }).map((_, i) => {
                        const y = trendChart.yMin + (i / 5) * (trendChart.yMax - trendChart.yMin);
                        const value = ((5 - i) / 5) * trendChartMax;
                        return (
                          <g key={`grid-${i}`}>
                            <line x1={trendChart.xMin} y1={y} x2={trendChart.xMax} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                            <text x="42" y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                              {formatCompact(value)}
                            </text>
                          </g>
                        );
                      })}

                      {visibleTrendSeries.map((series) => {
                        const color = sectorColorMap.get(series.name) || "#22a3ad";
                        const maxIndex = Math.max(1, trendData.labels.length - 1);
                        const points = series.values
                          .map((val, idx) => {
                            const x = trendChart.xMin + (idx / maxIndex) * (trendChart.xMax - trendChart.xMin);
                            const y = trendChart.yMin + (1 - val / trendChartMax) * (trendChart.yMax - trendChart.yMin);
                            return `${x},${y}`;
                          })
                          .join(" ");
                        return (
                          <g key={series.name}>
                            <polyline fill="none" stroke={color} strokeWidth="2.2" points={points} />
                            {series.values.map((val, idx) => {
                              const x = trendChart.xMin + (idx / maxIndex) * (trendChart.xMax - trendChart.xMin);
                              const y = trendChart.yMin + (1 - val / trendChartMax) * (trendChart.yMax - trendChart.yMin);
                              const isHovered =
                                hoveredTrendPoint?.sector === series.name && hoveredTrendPoint?.label === trendData.labels[idx];
                              return (
                                <g key={`${series.name}-${idx}`}>
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r={isHovered ? 4.2 : 2.6}
                                    fill={color}
                                    stroke={isHovered ? "#111827" : "none"}
                                    strokeWidth={isHovered ? 0.8 : 0}
                                  />
                                  <circle
                                    cx={x}
                                    cy={y}
                                    r="14"
                                    fill="transparent"
                                    onMouseEnter={() =>
                                      setHoveredTrendPoint({
                                        x,
                                        y,
                                        sector: series.name,
                                        value: val,
                                        label: trendData.labels[idx],
                                        color,
                                      })
                                    }
                                  />
                                </g>
                              );
                            })}
                          </g>
                        );
                      })}

                      {hoveredTrendPoint && (
                        <g pointerEvents="none">
                          {(() => {
                            const bubbleX = Math.max(100, Math.min(882, hoveredTrendPoint.x));
                            const bubbleY = Math.max(86, hoveredTrendPoint.y - 66);
                            return (
                              <>
                                <line
                                  x1={bubbleX}
                                  y1={bubbleY + 42}
                                  x2={hoveredTrendPoint.x}
                                  y2={hoveredTrendPoint.y + 4}
                                  stroke={hoveredTrendPoint.color}
                                  strokeWidth="1.5"
                                  opacity="0.7"
                                />
                                <g
                                  style={{
                                    transform: `translate(${bubbleX}px, ${bubbleY}px)`,
                                    transition: "transform 180ms ease-out, opacity 180ms ease-out",
                                  }}
                                >
                                  <circle cx={0} cy={0} r="52" fill={hoveredTrendPoint.color} opacity="0.95" />
                                  <text x={0} y={-16} textAnchor="middle" fontSize="11" fill="#ffffff" fontWeight="600">
                                    {humanizeToken(hoveredTrendPoint.sector).slice(0, 20)}
                                  </text>
                                  <text x={0} y={10} textAnchor="middle" fontSize="22" fill="#ffffff" fontWeight="700">
                                    {formatCompact(hoveredTrendPoint.value)}
                                  </text>
                                  <text x={0} y={26} textAnchor="middle" fontSize="11" fill="#ffffff" opacity="0.95">
                                    {hoveredTrendPoint.label}
                                  </text>
                                </g>
                              </>
                            );
                          })()}
                        </g>
                      )}

                      {trendData.labels.map((label, idx) => {
                        const x = trendChart.xMin + (idx / Math.max(1, trendData.labels.length - 1)) * (trendChart.xMax - trendChart.xMin);
                        const every = 1;
                        if (idx % every !== 0 && idx !== trendData.labels.length - 1) return null;
                        return (
                          <text key={`x-${label}-${idx}`} x={x} y={trendChart.xLabelY} textAnchor="middle" fontSize="11" fill="#6b7280">
                            {label}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CountryEmissions;


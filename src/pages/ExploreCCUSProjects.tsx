import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
  Line,
  Scatter
} from "recharts";
import { Filter } from "lucide-react";
import { ArrowRight } from "lucide-react";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const colorScale = [
  "#e0f7fa", // 1-9 (very light teal)
  "#b2ebf2", // 10-24
  "#80deea", // 25-49
  "#4dd0e1", // 50-74
  "#26c6da", // 75-99
  "#0097a7", // 100-249
  "#006064", // 250-499
  "#00363a", // >=500 (very dark teal)
];
function getColor(count: number) {
  if (count >= 500) return colorScale[7];
  if (count >= 250) return colorScale[6];
  if (count >= 100) return colorScale[5];
  if (count >= 75) return colorScale[4];
  if (count >= 50) return colorScale[3];
  if (count >= 25) return colorScale[2];
  if (count >= 10) return colorScale[1];
  if (count >= 1) return colorScale[0];
  return "#EEE";
}
function normalizeCountryName(name: string) {
  if (!name) return "";
  const map: Record<string, string> = {
    "United States": "United States of America",
    USA: "United States of America",
    "U.S.A.": "United States of America",
    UK: "United Kingdom",
    Russia: "Russian Federation",
    "South Korea": "Korea, Republic of",
    "North Korea": "Korea, Democratic People's Republic of",
    Vietnam: "Viet Nam",
    Iran: "Iran, Islamic Republic of",
    Syria: "Syrian Arab Republic",
    Czechia: "Czech Republic",
    "Ivory Coast": "Côte d'Ivoire",
    "Democratic Republic of the Congo": "Congo, The Democratic Republic of the",
    "Republic of the Congo": "Congo",
    Tanzania: "Tanzania, United Republic of",
    Laos: "Lao People's Democratic Republic",
    Moldova: "Moldova, Republic of",
    Bolivia: "Bolivia, Plurinational State of",
    Venezuela: "Venezuela, Bolivarian Republic of",
    Palestine: "Palestine, State of",
    "Viet Nam": "Viet Nam",
    DRC: "Congo, The Democratic Republic of the",
    Türkiye: "Turkey",
    "Côte d'Ivoire": "Côte d'Ivoire",
    "Cape Verde": "Cabo Verde",
    "Timor-Leste": "East Timor",
    "North Macedonia": "Macedonia",
    Myanmar: "Myanmar",
    International: "International",
    "New Caledonia": "New Caledonia",
    Aruba: "Aruba",
    Kosovo: "Kosovo",
    "Hong Kong": "Hong Kong",
    Taiwan: "Taiwan",
  };
  return map[name.trim()] || name.trim();
}

const ExploreCCUSProjects = () => {
  const navigate = useNavigate();
  // Filter state
  const [countries, setCountries] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [fates, setFates] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Multi-select filter state
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedFates, setSelectedFates] = useState<string[]>([]);

  // Project data
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart data
  const [typeData, setTypeData] = useState<{ type: string; count: number }[]>(
    []
  );
  const [countryData, setCountryData] = useState<
    { country: string; count: number }[]
  >([]);
  const [sectorData, setSectorData] = useState<
    { sector: string; count: number }[]
  >([]);
  const [statusData, setStatusData] = useState<
    { status: string; count: number }[]
  >([]);

  // Helper function to fetch all unique values for a column in batches
  async function fetchAllUniqueColumnValues(column: string): Promise<string[]> {
    const BATCH_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;
    while (keepFetching) {
      const { data, error } = await supabase
        .from("ccus_projects")
        .select(`"${column}"`)
        .range(from, to);
      if (error) throw error;
      allRows = allRows.concat(data || []);
      if (!data || data.length < BATCH_SIZE) {
        keepFetching = false;
      } else {
        from += BATCH_SIZE;
        to += BATCH_SIZE;
      }
    }
    return Array.from(
      new Set(
        allRows
          .map((p: any) => (p[column] || "").trim())
          .filter((val: string) => val.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
  }

  // Fetch unique filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setFiltersLoading(true);
      try {
        setCountries(await fetchAllUniqueColumnValues("Country or economy"));
        setStatuses(await fetchAllUniqueColumnValues("Project Status"));
        setSectors(await fetchAllUniqueColumnValues("Sector"));
        setFates(await fetchAllUniqueColumnValues("Fate of carbon"));
      } catch (e) {
        // Optionally, you can set an error state here
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilterOptions();
  }, []);

  // Helper function to fetch all filtered projects in batches
  async function fetchAllProjectsWithFilters(
    filters: {
      countries?: string[];
      statuses?: string[];
      sectors?: string[];
      fates?: string[];
    } = {}
  ) {
    const BATCH_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;

    while (keepFetching) {
      let query: any = supabase
        .from("ccus_projects")
        .select("*")
        .range(from, to);
      if (filters.countries && filters.countries.length > 0)
        query = query.in("Country or economy", filters.countries);
      if (filters.statuses && filters.statuses.length > 0)
        query = query.in("Project Status", filters.statuses);
      if (filters.sectors && filters.sectors.length > 0)
        query = query.in("Sector", filters.sectors);
      if (filters.fates && filters.fates.length > 0)
        query = query.in("Fate of carbon", filters.fates);

      const { data, error }: { data: any[]; error: any } = await query;
      if (error) throw error;
      allRows = allRows.concat(data || []);
      if (!data || data.length < BATCH_SIZE) {
        keepFetching = false;
      } else {
        from += BATCH_SIZE;
        to += BATCH_SIZE;
      }
    }
    return allRows;
  }

  // Fetch filtered projects whenever filters change (using batching)
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchAllProjectsWithFilters({
      countries: selectedCountries,
      statuses: selectedStatuses,
      sectors: selectedSectors,
      fates: selectedFates,
    })
      .then((allProjects) => {
        setProjects(allProjects);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load projects");
        setProjects([]);
        setLoading(false);
      });
  }, [selectedCountries, selectedStatuses, selectedSectors, selectedFates]);

  // Aggregate chart data whenever projects change
  useEffect(() => {
    // Project type distribution
    const typeMap = new Map<string, number>();
    const countryMap = new Map<string, number>();
    const sectorMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    projects.forEach((p) => {
      const type = p["Project type"];
      if (type) {
        typeMap.set(type, (typeMap.get(type) || 0) + 1);
      }
      const country = p["Country or economy"];
      if (country) {
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      }
      const sector = p["Sector"];
      if (sector) {
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + 1);
      }
      const status = p["Project Status"];
      if (status) {
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      }
    });
    setTypeData(
      Array.from(typeMap.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    );
    setCountryData(
      Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
    );
    setSectorData(
      Array.from(sectorMap.entries())
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
    );
    setStatusData(
      Array.from(statusMap.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count)
    );
  }, [projects]);

  // Multi-select dropdown component
  function MultiSelectDropdown({
    options,
    selected,
    setSelected,
    placeholder,
    loadingLabel = "Loading...",
  }: {
    options: string[];
    selected: string[];
    setSelected: (v: string[]) => void;
    placeholder: string;
    loadingLabel?: string;
  }) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-300 bg-blue-50 text-blue-900 font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed ${filtersLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={filtersLoading}
          >
            <Filter className="w-4 h-4 text-blue-500" />
            {filtersLoading
              ? loadingLabel
              : selected.length === 0
                ? placeholder
                : selected.length === 1
                  ? selected[0]
                  : `${selected.length} selected`}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 max-h-72 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${selected.length === 0 ? 'bg-blue-200 text-blue-900 border-blue-300' : 'bg-white text-blue-700 border-blue-200'} mb-1 transition`}
              onClick={() => setSelected([])}
            >
              All
            </button>
            {options.map((option) => (
              <div key={option} className="flex items-center gap-2 py-1">
                <Checkbox
                  id={`option-${option}`}
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelected([...selected, option]);
                    else setSelected(selected.filter((t) => t !== option));
                  }}
                />
                <label
                  htmlFor={`option-${option}`}
                  className="cursor-pointer select-none text-blue-900"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Custom label for type bars
  const TypeBarLabel = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload || !payload.type) return null;
    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        dy={4}
        fontSize={14}
        fill="#222"
        textAnchor="start"
      >
        {payload.type}
      </text>
    );
  };

  // Compute project count by country for the map
  const countryProjectCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      const country = normalizeCountryName(p["Country or economy"]);
      if (country) {
        map.set(country, (map.get(country) || 0) + 1);
      }
    });
    return map;
  }, [projects]);

  const pieColors = [
    "#20bfa9", // teal
    "#17817b", // deep teal
    "#ffc658", // gold
    "#ff8042", // orange
    "#a28fd0", // soft purple
    "#82ca9d", // green
    "#b6e880", // light green
    "#d8854f", // muted orange
    "#e28743", // muted gold
    "#8dd1e1", // light teal
    "#e2e2e2", // light gray
    "#b2b2b2", // gray
    "#c2f784", // lime
    "#f7c784", // peach
    "#b0b0b0", // muted gray
    "#d0ed57", // yellow-green
    "#f4e285", // pale yellow
    "#b0d0e2", // pale blue
    "#c0c0c0", // silver
    "#e0e0e0", // very light gray
  ];

  // Custom Tooltip for Lollipop Chart
  const CustomLollipopTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded shadow text-sm">
          <div className="font-semibold mb-1">Sector: {label}</div>
          <div className="text-teal-600 font-medium">Count: {payload[0].value} projects</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Explore CCUS Projects</h1>
          <Button
            onClick={() => navigate('/explore/ccus-policies')}
            variant="default"
            size="lg"
            className="transition-all duration-200 shadow-md hover:shadow-xl hover:bg-green-600 hover:text-white flex items-center gap-2"
          >
            View CCUS Policies
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <MultiSelectDropdown
            options={countries}
            selected={selectedCountries}
            setSelected={setSelectedCountries}
            placeholder="Country or economy"
            loadingLabel="Loading..."
          />
          <MultiSelectDropdown
            options={statuses}
            selected={selectedStatuses}
            setSelected={setSelectedStatuses}
            placeholder="Project Status"
            loadingLabel="Loading..."
          />
          <MultiSelectDropdown
            options={sectors}
            selected={selectedSectors}
            setSelected={setSelectedSectors}
            placeholder="Sector"
            loadingLabel="Loading..."
          />
          <MultiSelectDropdown
            options={fates}
            selected={selectedFates}
            setSelected={setSelectedFates}
            placeholder="Fate of carbon"
            loadingLabel="Loading..."
          />
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {/* Projects by Type */}
          <div>
            <h2 className="font-semibold mb-2">Projects by Type</h2>
            <ResponsiveContainer
              width="100%"
              height={Math.max(300, typeData.length * 30)}
            >
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="type"
                  type="category"
                  width={200}
                  tick={{ fontSize: 14, fill: "#222", fontWeight: "bold" }}
                  interval={0}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#00bfae" label={<TypeBarLabel />} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Projects by Status Pie Chart */}
          <div>
            <h2 className="font-semibold mb-2">Projects by Status</h2>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  labelLine
                >
                  {statusData.map((entry, idx) => (
                    <Cell
                      key={`cell-status-${idx}`}
                      fill={pieColors[idx % pieColors.length]}
                    />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Projects by Sector (Lollipop Chart) */}
          <div>
            <h2 className="font-semibold mb-2">Projects by Sector</h2>
            <ResponsiveContainer width="100%" height={Math.max(300, sectorData.length * 32)}>
              <ComposedChart
                layout="vertical"
                data={sectorData}
                margin={{ top: 16, right: 32, left: 32, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="sector" 
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 rounded shadow text-sm">
                          <div className="font-semibold mb-1">Sector: {label}</div>
                          <div className="text-teal-600 font-medium">Count: {payload[0].value} projects</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  dataKey="count" 
                  stroke="#20bfa9" 
                  strokeWidth={2}
                  dot={false}
                />
                <Scatter 
                  dataKey="count" 
                  fill="#20bfa9" 
                  r={8}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* View Details Button */}
        <div className="mb-8 flex justify-end">
          <Button
            onClick={() =>
              navigate("/explore/ccus-projects/details", {
                state: { projects },
              })
            }
            disabled={loading || projects.length === 0}
          >
            View Details
          </Button>
        </div>
        {/* Map section with project counts by country */}
        <div className="mb-8">
          <h2 className="font-semibold mb-2">Project Locations (Map)</h2>
          <div
            className="responsive-map-container"
            style={{
              width: "100%",
              maxWidth: "1200px",
              aspectRatio: "2.5/1",
              margin: "0 auto",
              background: "none",
              position: "relative",
              minHeight: "300px",
              overflow: "visible",
            }}
          >
            <MapWithProjectCounts countryData={countryData} />
          </div>
        </div>
        {/* Project Cards */}
        {/* Removed project cards grid as per user request */}
      </div>
    </div>
  );
};

export default ExploreCCUSProjects;

function MapWithProjectCounts({
  countryData,
}: {
  countryData: { country: string; count: number }[];
}) {
  const [tooltip, setTooltip] = React.useState<{
    x: number;
    y: number;
    content: string;
  } | null>(null);
  // Normalize country names in the data
  const countryCountMap = Object.fromEntries(
    countryData.map((d) => [normalizeCountryName(d.country), d.count])
  );
  return (
    <div style={{ position: "relative" }}>
      <ComposableMap
        projectionConfig={{ scale: 120 }}
        width={1200}
        height={480}
        style={{ width: "100%", height: "auto", minHeight: 200 }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const originalCountryName = geo.properties.name;
              const normalizedCountryName =
                normalizeCountryName(originalCountryName);
              let count = 0;
              if (countryCountMap[normalizedCountryName]) {
                count = countryCountMap[normalizedCountryName];
              } else {
                const match = Object.keys(countryCountMap).find(
                  (key) =>
                    key.toLowerCase() === normalizedCountryName.toLowerCase()
                );
                if (match) {
                  count = countryCountMap[match];
                } else {
                  const directMatch = Object.keys(countryCountMap).find(
                    (key) =>
                      key.toLowerCase() === originalCountryName.toLowerCase()
                  );
                  if (directMatch) {
                    count = countryCountMap[directMatch];
                  }
                }
              }
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(count)}
                  stroke="#DDD"
                  style={{ outline: "none", cursor: "pointer" }}
                  onMouseMove={(e) => {
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      content: `${originalCountryName}: ${count} project${
                        count === 1 ? "" : "s"
                      }`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 6,
            pointerEvents: "none",
            zIndex: 1000,
            fontSize: 15,
            fontWeight: 500,
          }}
        >
          {tooltip.content}
        </div>
      )}
      {/* Legend */}
      <div
        style={{
          position: "absolute",
          left: 24,
          bottom: 24,
          zIndex: 10,
          display: "inline-block",
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "12px 18px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            fontSize: 15,
            marginBottom: 8,
            background: "#3066be",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 3,
          }}
        >
          PROJECT COUNT
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 18,
                background: colorScale[0],
                border: "1px solid #bbb",
                display: "inline-block",
              }}
            ></div>
            <span style={{ fontSize: 14 }}>&lt; 25</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 18,
                background: colorScale[1],
                border: "1px solid #bbb",
                display: "inline-block",
              }}
            ></div>
            <span style={{ fontSize: 14 }}>25 - 49</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 18,
                background: colorScale[2],
                border: "1px solid #bbb",
                display: "inline-block",
              }}
            ></div>
            <span style={{ fontSize: 14 }}>50 - 74</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 18,
                background: colorScale[3],
                border: "1px solid #bbb",
                display: "inline-block",
              }}
            ></div>
            <span style={{ fontSize: 14 }}>75 - 99</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 18,
                background: colorScale[4],
                border: "1px solid #bbb",
                display: "inline-block",
              }}
            ></div>
            <span style={{ fontSize: 14 }}>100 - 249</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 18,
                background: colorScale[5],
                border: "1px solid #bbb",
                display: "inline-block",
              }}
            ></div>
            <span style={{ fontSize: 14 }}>250 - 499</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 18,
                background: colorScale[6],
                border: "1px solid #bbb",
                display: "inline-block",
              }}
            ></div>
            <span style={{ fontSize: 14 }}>&gt;= 500</span>
          </div>
        </div>
      </div>
    </div>
  );
}
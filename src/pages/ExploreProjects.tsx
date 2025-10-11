import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { LogOut, Home, BarChart3, Compass, Filter, Search, MapPin, Calendar, Users, ArrowRight, Download, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const pieColors = ["#00bfae", "#008080", "#ffc658", "#ff8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57", "#8dd1e1", "#d8854f", "#a28fd0", "#e28743", "#b6e880", "#e2e2e2"];

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Place colorScale and getColor here so they are available everywhere
const colorScale = [
  "#e0f7fa", // 1-9 (very light teal)
  "#b2ebf2", // 10-24
  "#80deea", // 25-49
  "#4dd0e1", // 50-124
  "#26c6da", // 125-249
  "#0097a7", // 250-499
  "#006064", // 500-999
  "#00363a"  // >=1000 (very dark teal)
];
function getColor(count: number) {
  if (count >= 1000) return colorScale[7];
  if (count >= 500) return colorScale[6];
  if (count >= 250) return colorScale[5];
  if (count >= 125) return colorScale[4];
  if (count >= 50)  return colorScale[3];
  if (count >= 25)  return colorScale[2];
  if (count >= 10)  return colorScale[1];
  if (count >= 1)   return colorScale[0];
  return "#EEE";
}

function normalizeCountryName(name: string) {
  if (!name) return "";
  const map: Record<string, string> = {
    // Common variations
    "United States": "United States of America",
    "USA": "United States of America",
    "U.S.A.": "United States of America",
    "UK": "United Kingdom",
    "Russia": "Russian Federation",
    "South Korea": "Korea, Republic of",
    "North Korea": "Korea, Democratic People's Republic of",
    "Vietnam": "Viet Nam",
    "Iran": "Iran, Islamic Republic of",
    "Syria": "Syrian Arab Republic",
    "Czechia": "Czech Republic",
    "Ivory Coast": "Côte d'Ivoire",
    "Democratic Republic of the Congo": "Congo, The Democratic Republic of the",
    "Republic of the Congo": "Congo",
    "Tanzania": "Tanzania, United Republic of",
    "Laos": "Lao People's Democratic Republic",
    "Moldova": "Moldova, Republic of",
    "Bolivia": "Bolivia, Plurinational State of",
    "Venezuela": "Venezuela, Bolivarian Republic of",
    "Brunei": "Brunei Darussalam",
    "Palestine": "Palestine, State of",
    
    // Specific mappings from your data
    "Viet Nam": "Viet Nam", // Already correct
    "DRC": "Congo, The Democratic Republic of the",
    "Türkiye": "Turkey",
    "Côte d'Ivoire": "Côte d'Ivoire", // Already correct
    "Cape Verde": "Cabo Verde",
    "Timor-Leste": "East Timor",
    "North Macedonia": "Macedonia",
    "Myanmar": "Myanmar",
    "International": "International", // This might not be on the map
    "New Caledonia": "New Caledonia", // This might not be on the map
    "Aruba": "Aruba", // This might not be on the map
    "Kosovo": "Kosovo", // This might not be on the map
    "Hong Kong": "Hong Kong", // This might not be on the map
    "Taiwan": "Taiwan", // This might not be on the map
  };
  return map[name.trim()] || name.trim();
}

const ExploreProjects = () => {
  const navigate = useNavigate();
  // Filter state
  const [regions, setRegions] = useState<string[]>([]);
  const [voluntaryStatuses, setVoluntaryStatuses] = useState<string[]>([]);
  const [voluntaryRegistries, setVoluntaryRegistries] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Multi-select filter state
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedVoluntaryStatuses, setSelectedVoluntaryStatuses] = useState<string[]>([]);
  const [selectedVoluntaryRegistries, setSelectedVoluntaryRegistries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedAreasOfInterest, setSelectedAreasOfInterest] = useState<string[]>([]);

  // Project data
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart data
  const [countryData, setCountryData] = useState<{ country: string, count: number }[]>([]);
  const [regionData, setRegionData] = useState<{ region: string, count: number }[]>([]);
  const [statusData, setStatusData] = useState<{ status: string, count: number }[]>([]);



  // Helper function to fetch all unique values for a column in batches
  async function fetchAllUniqueColumnValues(column: string): Promise<string[]> {
    const BATCH_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;
    while (keepFetching) {
      const { data, error } = await supabase.from("global_projects" as any).select(`"${column}"`).range(from, to);
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
        setRegions(await fetchAllUniqueColumnValues("Region"));
        setVoluntaryStatuses(await fetchAllUniqueColumnValues("Voluntary Status"));
        setVoluntaryRegistries(await fetchAllUniqueColumnValues("Voluntary Registry"));
        setCountries(await fetchAllUniqueColumnValues("Country"));
        setAreasOfInterest(await fetchAllUniqueColumnValues("Area of Interest"));
      } catch (e) {
        // Optionally, you can set an error state here
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilterOptions();
  }, []);

  // Helper function to fetch all filtered projects in batches
  async function fetchAllProjectsWithFilters(filters: {
    regions?: string[];
    voluntaryStatuses?: string[];
    voluntaryRegistries?: string[];
    countries?: string[];
    areasOfInterest?: string[];
  } = {}) {
    const BATCH_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;

    while (keepFetching) {
      let query: any = supabase.from("global_projects" as any).select('*').range(from, to);
      if (filters.regions && filters.regions.length > 0) query = query.in("Region", filters.regions);
      if (filters.voluntaryStatuses && filters.voluntaryStatuses.length > 0) query = query.in("Voluntary Status", filters.voluntaryStatuses);
      if (filters.voluntaryRegistries && filters.voluntaryRegistries.length > 0) query = query.in("Voluntary Registry", filters.voluntaryRegistries);
      if (filters.countries && filters.countries.length > 0) query = query.in("Country", filters.countries);
      if (filters.areasOfInterest && filters.areasOfInterest.length > 0) query = query.in("Area of Interest", filters.areasOfInterest);

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
      regions: selectedRegions,
      voluntaryStatuses: selectedVoluntaryStatuses,
      voluntaryRegistries: selectedVoluntaryRegistries,
      countries: selectedCountries,
      areasOfInterest: selectedAreasOfInterest,
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
  }, [selectedRegions, selectedVoluntaryStatuses, selectedVoluntaryRegistries, selectedCountries, selectedAreasOfInterest]);

  // Aggregate chart data whenever projects change
  useEffect(() => {
    // Projects by Country
    const countryMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    projects.forEach(p => {
      // Country count (check both 'Country' and 'country')
      const country = p["Country"] || p["country"];
      if (country) {
        countryMap.set(country, (countryMap.get(country) || 0) + 1);
      }
      // Region count
      if (p["Region"]) {
        const region = p["Region"];
        regionMap.set(region, (regionMap.get(region) || 0) + 1);
      }
      // Voluntary Status count
      if (p["Voluntary Status"]) {
        const status = p["Voluntary Status"];
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      }
    });
    setCountryData(Array.from(countryMap.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count));
    setRegionData(Array.from(regionMap.entries()).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count).slice(0, 15));
    setStatusData(Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count).slice(0, 15));
  }, [projects]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

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

  // Custom label for country bars
  const CountryBarLabel = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload || !payload.country) return null;
    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        dy={4}
        fontSize={14}
        fill="#222"
        fontWeight="bold"
        textAnchor="start"
      >
        {payload.country}
      </text>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Navigation Button */}
          <div className="mb-4 flex justify-end">
            <button
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition"
              onClick={() => navigate('/project-table')}
            >
              View Project Table
            </button>
          </div>
          <h1 className="text-2xl font-bold mb-6">Explore Projects</h1>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <MultiSelectDropdown
              options={regions}
              selected={selectedRegions}
              setSelected={setSelectedRegions}
              placeholder="Region"
              loadingLabel="Loading..."
            />
            <MultiSelectDropdown
              options={voluntaryStatuses}
              selected={selectedVoluntaryStatuses}
              setSelected={setSelectedVoluntaryStatuses}
              placeholder="Project Status"
              loadingLabel="Loading..."
            />
            <MultiSelectDropdown
              options={voluntaryRegistries}
              selected={selectedVoluntaryRegistries}
              setSelected={setSelectedVoluntaryRegistries}
              placeholder="Registry"
              loadingLabel="Loading..."
            />
            <MultiSelectDropdown
              options={countries}
              selected={selectedCountries}
              setSelected={setSelectedCountries}
              placeholder="Country"
              loadingLabel="Loading..."
            />
            <MultiSelectDropdown
              options={areasOfInterest}
              selected={selectedAreasOfInterest}
              setSelected={setSelectedAreasOfInterest}
              placeholder="Area of Interest"
              loadingLabel="Loading..."
            />
          </div>
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {/* Projects by Country */}
            <div className="bg-white rounded shadow p-4" style={{ maxHeight: 500, overflowY: countryData.length > 15 ? 'auto' : 'visible' }}>
              <h2 className="font-semibold mb-2">Projects by Country</h2>
              <ResponsiveContainer width="100%" height={Math.max(300, countryData.length * 30)}>
                <BarChart data={countryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="country" type="category" width={200} tick={{ fontSize: 14, fill: '#222', fontWeight: 'bold' }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#00bfae" label={<CountryBarLabel />} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Projects by Region */}
            <div className="bg-white rounded shadow p-4" style={{ maxHeight: 500, overflowY: 'auto' }}>
              <h2 className="font-semibold mb-2">Projects by Region</h2>
              <ResponsiveContainer width="100%" height={Math.max(300, regionData.length * 30)}>
                <BarChart data={regionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="region" type="category" width={200} tick={{ fontSize: 14, fill: '#222', fontWeight: 'bold' }} interval={0} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Projects by Voluntary Status Pie Chart */}
            <div className="bg-white rounded shadow p-4">
              <h2 className="font-semibold mb-2">Projects by Voluntary Status</h2>
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
                      <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Custom legend below the chart, compact, minimal gap, scrollable only if needed */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 10, maxHeight: 120, overflowY: statusData.length > 10 ? 'auto' : 'visible',
                padding: '4px 0',
              }}>
                {statusData.map((entry, idx) => (
                  <div key={entry.status} style={{ display: 'flex', alignItems: 'center', minWidth: 110 }}>
                    <span style={{ width: 14, height: 14, background: pieColors[idx % pieColors.length], display: 'inline-block', marginRight: 6, borderRadius: 3 }}></span>
                    <span style={{ fontWeight: 'bold', color: '#222', fontSize: 13 }}>{entry.status}</span>
                    <span style={{ marginLeft: 4, color: '#666', fontSize: 13 }}>({entry.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* View Details Button */}
          <div className="flex justify-center mb-8">
            <Button
              variant="default"
              size="lg"
              onClick={() => navigate('/project-cards', { state: { projects } })}
              disabled={loading || projects.length === 0}
            >
              View Details
            </Button>
          </div>
          <style>{`
            @media (max-width: 600px) {
              .responsive-map-container {
                aspect-ratio: 1.2/1 !important;
                min-height: 180px !important;
                max-width: 100vw !important;
              }
            }
          `}</style>
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Projects by Country (Map)</h2>
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
                overflow: "visible"
              }}
            >
              <MapWithProjectCounts countryData={countryData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function MapWithProjectCounts({ countryData }: { countryData: { country: string, count: number }[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  
  // Normalize country names in the data
  const countryCountMap = Object.fromEntries(
    countryData.map(d => [normalizeCountryName(d.country), d.count])
  );
  
  // Debug: Log the normalized country names from your data
  // console.log("Normalized country names from data:", Object.keys(countryCountMap));
  
  return (
    <div style={{ position: "relative" }}>
      <ComposableMap projectionConfig={{ scale: 120 }} width={1200} height={480} style={{ width: "100%", height: "auto", minHeight: 200 }}>
        <Geographies geography={geoUrl}>
          {({ geographies }) => {
            // Log geo.properties for the first 5 geographies
            // geographies.slice(0, 5).forEach(geo => {
            //   // Remove debug logs for production
            // });
            return geographies.map(geo => {
              const originalCountryName = geo.properties.name;
              const normalizedCountryName = normalizeCountryName(originalCountryName);
              
              // Try multiple matching strategies
              let count = 0;
              if (countryCountMap[normalizedCountryName]) {
                count = countryCountMap[normalizedCountryName];
              } else {
                // Try case-insensitive matching
                const match = Object.keys(countryCountMap).find(
                  key => key.toLowerCase() === normalizedCountryName.toLowerCase()
                );
                if (match) {
                  count = countryCountMap[match];
                } else {
                  // Try matching the original map name directly
                  const directMatch = Object.keys(countryCountMap).find(
                    key => key.toLowerCase() === originalCountryName.toLowerCase()
                  );
                  if (directMatch) {
                    count = countryCountMap[directMatch];
                  }
                }
              }
              
              // Debug: Log when we find a match
              // if (count > 0) {
              //   console.log(`Match found: "${originalCountryName}" -> "${normalizedCountryName}" = ${count} projects`);
              // }
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getColor(count)}
                  stroke="#DDD"
                  style={{ outline: "none", cursor: "pointer" }}
                  onMouseMove={e => {
                    setTooltip({
                      x: e.clientX,
                      y: e.clientY,
                      content: `${originalCountryName}: ${count} project${count === 1 ? "" : "s"}`
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            });
          }}
        </Geographies>
      </ComposableMap>
      {tooltip && (
        <div style={{
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
          fontWeight: 500
        }}>{tooltip.content}</div>
      )}
      {/* Legend */}
      <div style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        zIndex: 10,
        display: 'inline-block',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: '12px 18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 8 }}>PROJECT COUNT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[0], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>&lt; 10</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[1], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>10 - 24</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[2], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>25 - 49</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[3], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>50 - 124</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[4], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>125 - 249</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[5], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>250 - 499</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[6], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>500 - 999</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[7], border: '1px solid #bbb', display: 'inline-block' }}></div>
            <span style={{ fontSize: 14 }}>&gt;= 1000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExploreProjects; 
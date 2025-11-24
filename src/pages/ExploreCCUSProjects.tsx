import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  Scatter
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import React from "react";
import { Search, Filter, Database, Globe, MapPin, Building2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

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
  const [searchQuery, setSearchQuery] = useState("");

  // Multi-select filter state
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedFates, setSelectedFates] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Project data
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart data
  const [typeData, setTypeData] = useState<{ type: string; count: number }[]>([]);
  const [countryData, setCountryData] = useState<{ country: string; count: number }[]>([]);
  const [sectorData, setSectorData] = useState<{ sector: string; count: number }[]>([]);
  const [statusData, setStatusData] = useState<{ status: string; count: number }[]>([]);

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
        console.error("Error fetching filter options:", e);
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
        .select("*", { count: 'exact' })
        .range(from, to);
      if (filters.countries && filters.countries.length > 0)
        query = query.in("Country or economy", filters.countries);
      if (filters.statuses && filters.statuses.length > 0)
        query = query.in("Project Status", filters.statuses);
      if (filters.sectors && filters.sectors.length > 0)
        query = query.in("Sector", filters.sectors);
      if (filters.fates && filters.fates.length > 0)
        query = query.in("Fate of carbon", filters.fates);

      const { data, error, count }: { data: any[]; error: any; count: number | null } = await query;
      if (error) throw error;
      allRows = allRows.concat(data || []);
      if (!data || data.length < BATCH_SIZE || (count !== null && allRows.length >= count)) {
        keepFetching = false;
      } else {
        from += BATCH_SIZE;
        to += BATCH_SIZE;
      }
    }
    return allRows;
  }

  // Fetch filtered projects whenever filters change
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

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter((p) => {
      const name = String(p["Project name"] || "").toLowerCase();
      const country = String(p["Country or economy"] || "").toLowerCase();
      const sector = String(p["Sector"] || "").toLowerCase();
      return name.includes(query) || country.includes(query) || sector.includes(query);
    });
  }, [projects, searchQuery]);

  // Aggregate chart data whenever filtered projects change
  useEffect(() => {
    const typeMap = new Map<string, number>();
    const countryMap = new Map<string, number>();
    const sectorMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    
    filteredProjects.forEach((p) => {
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
  }, [filteredProjects]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredProjects.length;
    const operational = filteredProjects.filter(p => String(p["Project Status"] || "").toLowerCase().includes("operational")).length;
    const uniqueCountries = new Set(filteredProjects.map(p => p["Country or economy"]).filter(Boolean)).size;
    const uniqueSectors = new Set(filteredProjects.map(p => p["Sector"]).filter(Boolean)).size;

    return { total, operational, uniqueCountries, uniqueSectors };
  }, [filteredProjects]);

  const pieColors = [
    "#14b8a6", "#0d9488", "#10b981", "#059669", "#06b6d4", "#0891b2",
    "#22c55e", "#16a34a", "#34d399", "#2dd4bf", "#5eead4", "#6ee7b7",
    "#7dd3fc", "#a5f3fc", "#20bfa9", "#17817b", "#ffc658", "#ff8042"
  ];

  // Compute project count by country for the map
  const countryProjectCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    filteredProjects.forEach((p) => {
      const country = normalizeCountryName(p["Country or economy"]);
      if (country) {
        map.set(country, (map.get(country) || 0) + 1);
      }
    });
    return map;
  }, [filteredProjects]);

  if (loading || filtersLoading) {
    return <LoadingScreen message="Loading CCUS Database" subMessage="Fetching project data and analytics..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 animate-in fade-in duration-500">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="mb-4">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
              CCUS Database
            </h1>
            <p className="text-gray-600 text-lg">Explore Carbon Capture, Utilization, and Storage projects worldwide</p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => navigate('/explore/ccus-policies')}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex-1 sm:flex-initial"
            >
              View CCUS Policies
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() =>
                navigate("/explore/ccus-projects/details", {
                  state: { projects: filteredProjects },
                })
              }
              disabled={filteredProjects.length === 0}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
            >
              View Project Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Projects</p>
                  <p className="text-3xl font-bold text-teal-600 transition-all duration-300">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Database className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-emerald-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.15s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Operational</p>
                  <p className="text-3xl font-bold text-emerald-600 transition-all duration-300">{stats.operational}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-cyan-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Countries</p>
                  <p className="text-3xl font-bold text-cyan-600 transition-all duration-300">{stats.uniqueCountries}</p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Globe className="w-6 h-6 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-lime-200/50 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in" style={{ animationDelay: '0.25s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sectors</p>
                  <p className="text-3xl font-bold text-lime-600 transition-all duration-300">{stats.uniqueSectors}</p>
                </div>
                <div className="w-12 h-12 bg-lime-100 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Building2 className="w-6 h-6 text-lime-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors duration-300" />
                <Input
                  placeholder="Search projects by name, country, or sector..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-teal-200 focus:border-teal-400 transition-all duration-300 focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="border-teal-200 hover:bg-teal-50 transition-all duration-300 hover:scale-105">
                    <Filter className="w-4 h-4 mr-2 transition-transform duration-300" style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                    Filters
                    {(selectedCountries.length > 0 || selectedStatuses.length > 0 || selectedSectors.length > 0 || selectedFates.length > 0) && (
                      <Badge className="ml-2 bg-teal-500 animate-in fade-in duration-300">
                        {selectedCountries.length + selectedStatuses.length + selectedSectors.length + selectedFates.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                    <div>
                      <p className="font-semibold mb-2 text-sm">Country</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {countries.map(country => (
                          <div key={country} className="flex items-center space-x-2">
                            <Checkbox
                              id={`country-${country}`}
                              checked={selectedCountries.includes(country)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCountries([...selectedCountries, country]);
                                } else {
                                  setSelectedCountries(selectedCountries.filter(c => c !== country));
                                }
                              }}
                            />
                            <label htmlFor={`country-${country}`} className="text-sm cursor-pointer">{country}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-sm">Status</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {statuses.map(status => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={selectedStatuses.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStatuses([...selectedStatuses, status]);
                                } else {
                                  setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                                }
                              }}
                            />
                            <label htmlFor={`status-${status}`} className="text-sm cursor-pointer">{status}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-sm">Sector</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {sectors.map(sector => (
                          <div key={sector} className="flex items-center space-x-2">
                            <Checkbox
                              id={`sector-${sector}`}
                              checked={selectedSectors.includes(sector)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSectors([...selectedSectors, sector]);
                                } else {
                                  setSelectedSectors(selectedSectors.filter(s => s !== sector));
                                }
                              }}
                            />
                            <label htmlFor={`sector-${sector}`} className="text-sm cursor-pointer">{sector}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2 text-sm">Fate of Carbon</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {fates.map(fate => (
                          <div key={fate} className="flex items-center space-x-2">
                            <Checkbox
                              id={`fate-${fate}`}
                              checked={selectedFates.includes(fate)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedFates([...selectedFates, fate]);
                                } else {
                                  setSelectedFates(selectedFates.filter(f => f !== fate));
                                }
                              }}
                            />
                            <label htmlFor={`fate-${fate}`} className="text-sm cursor-pointer">{fate}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {(selectedCountries.length > 0 || selectedStatuses.length > 0 || selectedSectors.length > 0 || selectedFates.length > 0) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCountries([]);
                          setSelectedStatuses([]);
                          setSelectedSectors([]);
                          setSelectedFates([]);
                        }}
                        className="w-full text-red-600 hover:text-red-700"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Projects by Type */}
          <Card className="bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="text-lg">Projects by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(350, typeData.length * 35)}>
                <BarChart data={typeData} layout="vertical" className="animate-in fade-in duration-500">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="type"
                    type="category"
                    width={150}
                    tick={{ fontSize: 12, fill: "#666" }}
                    interval={0}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#14b8a6" animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Projects by Status Pie Chart */}
          <Card className="bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle className="text-lg">Projects by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(350, typeData.length * 35)}>
                <PieChart className="animate-in fade-in duration-500">
                  <Pie
                    data={statusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={Math.min(120, Math.max(350, typeData.length * 35) / 3)}
                    labelLine={false}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {statusData.map((entry, idx) => (
                      <Cell
                        key={`cell-status-${idx}`}
                        fill={pieColors[idx % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Projects by Sector - Full Width */}
          <Card className="bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500 lg:col-span-2" style={{ animationDelay: '0.6s' }}>
            <CardHeader>
              <CardTitle className="text-lg">Projects by Sector</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(400, sectorData.length * 35)}>
                <ComposedChart
                  layout="vertical"
                  data={sectorData}
                  margin={{ top: 16, right: 32, left: 32, bottom: 16 }}
                  className="animate-in fade-in duration-500"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="sector" 
                    width={120}
                    tick={{ fontSize: 12, fill: "#666" }}
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
                    stroke="#14b8a6" 
                    strokeWidth={2}
                    dot={false}
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                  <Scatter 
                    dataKey="count" 
                    fill="#14b8a6" 
                    r={8}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>


        {/* Map section */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-teal-200/50 shadow-lg animate-in fade-in duration-500" style={{ animationDelay: '0.8s' }}>
          <CardHeader>
            <CardTitle className="text-xl">Project Locations</CardTitle>
            <Badge variant="outline" className="text-sm w-fit mt-2">
              {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
            </Badge>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
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
              const normalizedCountryName = normalizeCountryName(originalCountryName);
              let count = 0;
              if (countryCountMap[normalizedCountryName]) {
                count = countryCountMap[normalizedCountryName];
              } else {
                const match = Object.keys(countryCountMap).find(
                  (key) => key.toLowerCase() === normalizedCountryName.toLowerCase()
                );
                if (match) {
                  count = countryCountMap[match];
                } else {
                  const directMatch = Object.keys(countryCountMap).find(
                    (key) => key.toLowerCase() === originalCountryName.toLowerCase()
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
                      content: `${originalCountryName}: ${count} project${count === 1 ? "" : "s"}`,
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
            background: "#14b8a6",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: 3,
          }}
        >
          PROJECT COUNT
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { color: colorScale[0], label: "< 10" },
            { color: colorScale[1], label: "10 - 24" },
            { color: colorScale[2], label: "25 - 49" },
            { color: colorScale[3], label: "50 - 74" },
            { color: colorScale[4], label: "75 - 99" },
            { color: colorScale[5], label: "100 - 249" },
            { color: colorScale[6], label: "250 - 499" },
            { color: colorScale[7], label: ">= 500" },
          ].map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 22,
                  height: 18,
                  background: item.color,
                  border: "1px solid #bbb",
                  display: "inline-block",
                }}
              ></div>
              <span style={{ fontSize: 14 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

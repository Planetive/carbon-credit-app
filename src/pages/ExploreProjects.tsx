import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { LogOut, Home, BarChart3, Compass, Filter, Search, MapPin, Calendar, Users, ArrowRight, Download, Eye, Globe, TrendingUp, Database, ArrowLeft, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";

// Modern teal/green color palette - keeping same number of colors
const pieColors = ["#14b8a6", "#0d9488", "#10b981", "#059669", "#06b6d4", "#0891b2", "#22c55e", "#16a34a", "#34d399", "#2dd4bf", "#5eead4", "#6ee7b7", "#7dd3fc", "#a5f3fc"];

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
  const [navigating, setNavigating] = useState(false);
  // Filter state
  const [regions, setRegions] = useState<string[]>([]);
  const [voluntaryStatuses, setVoluntaryStatuses] = useState<string[]>([]);
  const [voluntaryRegistries, setVoluntaryRegistries] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);

  // Multi-select filter state
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedVoluntaryStatuses, setSelectedVoluntaryStatuses] = useState<string[]>([]);
  const [selectedVoluntaryRegistries, setSelectedVoluntaryRegistries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedAreasOfInterest, setSelectedAreasOfInterest] = useState<string[]>([]);

  // Project data (minimal - only IDs until user clicks View Details)
  const [projects, setProjects] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Chart data
  const [countryData, setCountryData] = useState<{ country: string, count: number }[]>([]);
  const [regionData, setRegionData] = useState<{ region: string, count: number }[]>([]);
  const [statusData, setStatusData] = useState<{ status: string, count: number }[]>([]);

  // Chart display limits (for performance - show top 10 by default)
  const [countryLimit, setCountryLimit] = useState<number | 'all'>(10);
  const [regionLimit, setRegionLimit] = useState<number | 'all'>(10);
  const [statusLimit, setStatusLimit] = useState<number | 'all'>(10);
  
  // Computed limited data for charts
  const displayedCountryData = useMemo(() => {
    if (countryLimit === 'all') return countryData;
    return countryData.slice(0, countryLimit);
  }, [countryData, countryLimit]);
  
  const displayedRegionData = useMemo(() => {
    if (regionLimit === 'all') return regionData;
    return regionData.slice(0, regionLimit);
  }, [regionData, regionLimit]);
  
  const displayedStatusData = useMemo(() => {
    if (statusLimit === 'all') return statusData;
    return statusData.slice(0, statusLimit);
  }, [statusData, statusLimit]);
  
  // Dynamic filter options based on actual data length
  const getFilterOptions = (dataLength: number, chartType: 'country' | 'region' | 'status' = 'country') => {
    const options = [{ value: "10", label: "Top 10" }];
    
    // For country chart, show all options
    if (chartType === 'country') {
      if (dataLength > 10) options.push({ value: "25", label: "Top 25" });
      if (dataLength > 25) options.push({ value: "50", label: "Top 50" });
      if (dataLength > 50) options.push({ value: "100", label: "Top 100" });
    }
    // For region and status charts, only show Top 10 and All
    // (no Top 25, Top 50, Top 100)
    
    options.push({ value: "all", label: `All (${dataLength})` });
    return options;
  };



  // OPTIMIZED: Use database RPC functions for DISTINCT values (much faster!)
  async function fetchDistinctValues(functionName: string, resultKey: string): Promise<string[]> {
    try {
      const { data, error } = await (supabase.rpc as any)(functionName);
      if (error) {
        console.warn(`RPC function ${functionName} failed, falling back to batch method:`, error);
        // Fallback to old method if RPC fails
        return fetchAllUniqueColumnValuesFallback(resultKey);
      }
      // Data is already trimmed by SQL function, but double-check
      return (data || []).map((row: any) => String(row[resultKey] || "").trim()).filter((val: string) => val.length > 0);
    } catch (err) {
      console.warn(`RPC function ${functionName} error, falling back:`, err);
      return fetchAllUniqueColumnValuesFallback(resultKey);
    }
  }

  // Fallback method if RPC functions don't exist yet
  async function fetchAllUniqueColumnValuesFallback(column: string): Promise<string[]> {
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

  // OPTIMIZED: Use React Query with caching for filter options
  // Now uses fast RPC functions for DISTINCT values
  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery({
    queryKey: ['global-projects-filter-options'],
    queryFn: async () => {
      // Fetch all filter options in parallel using fast RPC functions
      const [regions, voluntaryStatuses, voluntaryRegistries, countries, areasOfInterest] = await Promise.all([
        fetchDistinctValues("get_distinct_regions", "region"),
        fetchDistinctValues("get_distinct_voluntary_statuses", "status"),
        fetchDistinctValues("get_distinct_voluntary_registries", "registry"),
        fetchDistinctValues("get_distinct_countries", "country"),
        fetchDistinctValues("get_distinct_areas_of_interest", "area"),
      ]);
      
      return {
        regions,
        voluntaryStatuses,
        voluntaryRegistries,
        countries,
        areasOfInterest,
      };
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Set filter options from React Query
  useEffect(() => {
    if (filterOptions) {
      setRegions(filterOptions.regions);
      setVoluntaryStatuses(filterOptions.voluntaryStatuses);
      setVoluntaryRegistries(filterOptions.voluntaryRegistries);
      setCountries(filterOptions.countries);
      setAreasOfInterest(filterOptions.areasOfInterest);
    }
  }, [filterOptions]);

  // OPTIMIZED: Fetch only minimal columns needed for dashboard (Country, Region, Voluntary Status)
  // This is MUCH faster than fetching all columns - reduces data transfer by 80-90%
  async function fetchMinimalProjectsForDashboard(filters: {
    regions?: string[];
    voluntaryStatuses?: string[];
    voluntaryRegistries?: string[];
    countries?: string[];
    areasOfInterest?: string[];
  } = {}) {
    const BATCH_SIZE = 1000; // Supabase's maximum rows per query
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;
    let consecutiveEmptyBatches = 0;

    while (keepFetching) {
      // Only select columns needed for charts, stats, and map
      let query: any = supabase.from("global_projects" as any)
        .select('"Country", "Region", "Voluntary Status"', { count: 'exact' })
        .range(from, to);
      
      // Apply filters (indexes will make these fast)
      if (filters.regions && filters.regions.length > 0) query = query.in("Region", filters.regions);
      if (filters.voluntaryStatuses && filters.voluntaryStatuses.length > 0) query = query.in("Voluntary Status", filters.voluntaryStatuses);
      if (filters.voluntaryRegistries && filters.voluntaryRegistries.length > 0) query = query.in("Voluntary Registry", filters.voluntaryRegistries);
      if (filters.countries && filters.countries.length > 0) query = query.in("Country", filters.countries);
      if (filters.areasOfInterest && filters.areasOfInterest.length > 0) query = query.in("Area of Interest", filters.areasOfInterest);

      const { data, error, count }: { data: any[]; error: any; count: number | null } = await query;
      
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        consecutiveEmptyBatches++;
        // Stop if we get 2 consecutive empty batches (safety check)
        if (consecutiveEmptyBatches >= 2) {
          keepFetching = false;
        } else {
          // Try next batch in case of gap
          from += BATCH_SIZE;
          to += BATCH_SIZE;
        }
      } else {
        consecutiveEmptyBatches = 0; // Reset counter
        allRows = allRows.concat(data);
        
        // Check if we've fetched all available data
        if (count !== null && allRows.length >= count) {
          keepFetching = false;
        } else if (data.length < BATCH_SIZE) {
          // Got less than batch size, likely at the end
          keepFetching = false;
        } else {
          // Continue fetching next batch
          from += BATCH_SIZE;
          to += BATCH_SIZE;
        }
      }
    }
    
    console.log(`Fetched ${allRows.length} projects (minimal columns) for dashboard`);
    return allRows;
  }

  // Fetch ALL columns only when user needs full data (for View Project Table/Details)
  async function fetchAllProjectsWithFilters(filters: {
    regions?: string[];
    voluntaryStatuses?: string[];
    voluntaryRegistries?: string[];
    countries?: string[];
    areasOfInterest?: string[];
  } = {}) {
    const BATCH_SIZE = 1000; // Supabase's maximum rows per query
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;
    let consecutiveEmptyBatches = 0;

    while (keepFetching) {
      let query: any = supabase.from("global_projects" as any).select('*', { count: 'exact' }).range(from, to);
      
      // Apply filters (indexes will make these fast)
      if (filters.regions && filters.regions.length > 0) query = query.in("Region", filters.regions);
      if (filters.voluntaryStatuses && filters.voluntaryStatuses.length > 0) query = query.in("Voluntary Status", filters.voluntaryStatuses);
      if (filters.voluntaryRegistries && filters.voluntaryRegistries.length > 0) query = query.in("Voluntary Registry", filters.voluntaryRegistries);
      if (filters.countries && filters.countries.length > 0) query = query.in("Country", filters.countries);
      if (filters.areasOfInterest && filters.areasOfInterest.length > 0) query = query.in("Area of Interest", filters.areasOfInterest);

      const { data, error, count }: { data: any[]; error: any; count: number | null } = await query;
      
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        consecutiveEmptyBatches++;
        // Stop if we get 2 consecutive empty batches (safety check)
        if (consecutiveEmptyBatches >= 2) {
        keepFetching = false;
      } else {
          // Try next batch in case of gap
        from += BATCH_SIZE;
        to += BATCH_SIZE;
      }
      } else {
        consecutiveEmptyBatches = 0; // Reset counter
        allRows = allRows.concat(data);
        
        // Check if we've fetched all available data
        if (count !== null && allRows.length >= count) {
          keepFetching = false;
        } else if (data.length < BATCH_SIZE) {
          // Got less than batch size, likely at the end
          keepFetching = false;
        } else {
          // Continue fetching next batch
          from += BATCH_SIZE;
          to += BATCH_SIZE;
        }
      }
    }
    
    console.log(`Fetched ${allRows.length} projects total (all columns)`);
    return allRows;
  }

  // OPTIMIZED: Use database aggregation functions for charts (MUCH faster than client-side)
  const filterKey = JSON.stringify({
      regions: selectedRegions,
      voluntaryStatuses: selectedVoluntaryStatuses,
      voluntaryRegistries: selectedVoluntaryRegistries,
      countries: selectedCountries,
      areasOfInterest: selectedAreasOfInterest,
  });

  // Fetch aggregated chart data from database (parallel queries for speed)
  const { data: chartData, isLoading: chartsLoading } = useQuery({
    queryKey: ['global-projects-charts', filterKey],
    queryFn: async () => {
      const filters = {
        regions: selectedRegions.length > 0 ? selectedRegions : null,
        voluntaryStatuses: selectedVoluntaryStatuses.length > 0 ? selectedVoluntaryStatuses : null,
        voluntaryRegistries: selectedVoluntaryRegistries.length > 0 ? selectedVoluntaryRegistries : null,
        countries: selectedCountries.length > 0 ? selectedCountries : null,
        areasOfInterest: selectedAreasOfInterest.length > 0 ? selectedAreasOfInterest : null,
      };

      // Run all aggregation queries in parallel
      const [countryResult, regionResult, statusResult, statsResult] = await Promise.all([
        (supabase.rpc as any)('get_country_counts', { 
          p_regions: filters.regions,
          p_voluntary_statuses: filters.voluntaryStatuses,
          p_voluntary_registries: filters.voluntaryRegistries,
          p_countries: filters.countries,
          p_areas_of_interest: filters.areasOfInterest,
        }),
        (supabase.rpc as any)('get_region_counts', { 
          p_regions: filters.regions,
          p_voluntary_statuses: filters.voluntaryStatuses,
          p_voluntary_registries: filters.voluntaryRegistries,
          p_countries: filters.countries,
          p_areas_of_interest: filters.areasOfInterest,
        }),
        (supabase.rpc as any)('get_status_counts', { 
          p_regions: filters.regions,
          p_voluntary_statuses: filters.voluntaryStatuses,
          p_voluntary_registries: filters.voluntaryRegistries,
          p_countries: filters.countries,
          p_areas_of_interest: filters.areasOfInterest,
        }),
        (supabase.rpc as any)('get_project_stats', { 
          p_regions: filters.regions,
          p_voluntary_statuses: filters.voluntaryStatuses,
          p_voluntary_registries: filters.voluntaryRegistries,
          p_countries: filters.countries,
          p_areas_of_interest: filters.areasOfInterest,
        }),
      ]);

      // Handle errors gracefully - fallback to client-side if RPC fails
      if (countryResult.error || regionResult.error || statusResult.error || statsResult.error) {
        console.warn('RPC functions not available, falling back to client-side aggregation');
        return null; // Will trigger fallback
      }

      return {
        countryData: (countryResult.data || []).map((r: any) => ({ country: r.country, count: Number(r.count) })),
        regionData: (regionResult.data || []).map((r: any) => ({ region: r.region, count: Number(r.count) })),
        statusData: (statusResult.data || []).map((r: any) => ({ status: r.status, count: Number(r.count) })),
        stats: statsResult.data && statsResult.data[0] ? {
          totalProjects: Number(statsResult.data[0].total_projects),
          uniqueCountries: Number(statsResult.data[0].unique_countries),
          uniqueRegions: Number(statsResult.data[0].unique_regions),
          activeProjects: Number(statsResult.data[0].active_projects),
        } : null,
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: !isLoadingFilters, // Only run after filter options are loaded
  });

  // Fetch minimal project data for map (only Country, Region, Voluntary Status columns)
  // This is MUCH faster than fetching all columns
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['global-projects-minimal', filterKey],
    queryFn: () => fetchMinimalProjectsForDashboard({
      regions: selectedRegions,
      voluntaryStatuses: selectedVoluntaryStatuses,
      voluntaryRegistries: selectedVoluntaryRegistries,
      countries: selectedCountries,
      areasOfInterest: selectedAreasOfInterest,
    }),
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    enabled: !isLoadingFilters, // Only run after filter options are loaded
  });

  // Set projects from React Query (minimal data for map)
  useEffect(() => {
    if (projectsData !== undefined) {
      setProjects(projectsData);
    }
  }, [projectsData]);

  // Use database-aggregated chart data if available, otherwise fallback to client-side aggregation
  useEffect(() => {
    if (chartData) {
      // Use database-aggregated data (fast!)
      setCountryData(chartData.countryData);
      setRegionData(chartData.regionData);
      setStatusData(chartData.statusData);
    } else if (projects && projects.length > 0) {
      // Fallback: client-side aggregation (if RPC functions not available)
    const countryMap = new Map<string, number>();
    const regionMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
      
    projects.forEach(p => {
      // Country count (check both 'Country' and 'country')
      const country = p["Country"] || p["country"];
        if (country && country.trim()) {
          const countryKey = country.trim();
          countryMap.set(countryKey, (countryMap.get(countryKey) || 0) + 1);
      }
      // Region count
        if (p["Region"] && p["Region"].trim()) {
          const region = p["Region"].trim();
        regionMap.set(region, (regionMap.get(region) || 0) + 1);
      }
      // Voluntary Status count
        if (p["Voluntary Status"] && p["Voluntary Status"].trim()) {
          const status = p["Voluntary Status"].trim();
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      }
    });
      
      // Store all data, we'll slice it in the render based on limits
      const allCountryData = Array.from(countryMap.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
      const allRegionData = Array.from(regionMap.entries()).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count);
      const allStatusData = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
      
      setCountryData(allCountryData);
      setRegionData(allRegionData);
      setStatusData(allStatusData);
    } else {
      setCountryData([]);
      setRegionData([]);
      setStatusData([]);
    }
  }, [chartData, projects]);

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
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-teal-300 bg-teal-50 text-teal-900 font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 hover:bg-teal-100 disabled:opacity-60 disabled:cursor-not-allowed ${isLoadingFilters ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={isLoadingFilters}
          >
            <Filter className="w-4 h-4 text-teal-600" />
            {isLoadingFilters
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
              className={`px-3 py-1 rounded-lg text-sm font-semibold border ${selected.length === 0 ? 'bg-teal-200 text-teal-900 border-teal-300' : 'bg-white text-teal-700 border-teal-200'} mb-1 transition`}
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
                  className="cursor-pointer select-none text-teal-900"
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

  // Custom label for country bars - removed to prevent overlap, using Y-axis labels instead
  const CountryBarLabel = () => null;

  // Calculate stats from database aggregation if available, otherwise from projects
  const stats = useMemo(() => {
    if (chartData?.stats) {
      // Use database-aggregated stats (fast!)
      return chartData.stats;
    } else if (projects && projects.length > 0) {
      // Fallback: calculate from projects
      return {
        totalProjects: projects.length,
        uniqueCountries: new Set(projects.map(p => p["Country"] || p["country"]).filter(Boolean)).size,
        uniqueRegions: new Set(projects.map(p => p["Region"]).filter(Boolean)).size,
        activeProjects: projects.filter(p => {
          const status = (p["Voluntary Status"] || "").toLowerCase();
          return status.includes('active') || status.includes('registered') || status.includes('verified');
        }).length,
      };
    }
    return {
      totalProjects: 0,
      uniqueCountries: 0,
      uniqueRegions: 0,
      activeProjects: 0,
    };
  }, [chartData, projects]);

  const totalProjects = stats.totalProjects;
  const uniqueCountries = stats.uniqueCountries;
  const uniqueRegions = stats.uniqueRegions;
  const activeProjects = stats.activeProjects;
  
  const loading = projectsLoading || chartsLoading || isLoadingFilters;

  // Show mesmerizing loading screen while data is loading
  if (loading) {
    return (
      <LoadingScreen 
        message="Loading Global Carbon Projects"
        subMessage="Analyzing data from around the world..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 relative overflow-hidden">
      {/* Beautiful Background - visual only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-200/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(20, 184, 166) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(20, 184, 166) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section - visual only */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/explore')}
                className="rounded-full hover:bg-teal-100"
              >
                <ArrowLeft className="h-5 w-5 text-teal-600" />
              </Button>
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-gray-900 via-teal-800 to-emerald-800 bg-clip-text text-transparent">
                  Global Carbon Projects
                </h1>
                <p className="text-gray-600 mt-2">Explore and analyze verified carbon projects worldwide</p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg"
              onClick={async () => {
                try {
                  setNavigating(true);
                  // Fetch full data when user clicks (only when needed)
                  const fullData = await fetchAllProjectsWithFilters({
                    regions: selectedRegions,
                    voluntaryStatuses: selectedVoluntaryStatuses,
                    voluntaryRegistries: selectedVoluntaryRegistries,
                    countries: selectedCountries,
                    areasOfInterest: selectedAreasOfInterest,
                  });
                  navigate('/project-table', { state: { projects: fullData } });
                } finally {
                  setNavigating(false);
                }
              }}
              disabled={navigating}
            >
              <Eye className="h-4 w-4 mr-2" />
              {navigating ? 'Loading...' : 'View Project Table'}
            </Button>
          </div>

          {navigating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <LoadingScreen message="Loading Project Table" subMessage="Preparing data..." />
            </div>
          )}

          {/* Stats Summary Cards - using existing data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Projects</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                      {totalProjects.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Countries</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                      {uniqueCountries}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Globe className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Regions</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                      {uniqueRegions}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl hover:shadow-2xl transition-all hover:scale-105">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Projects</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                      {activeProjects.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Filters Section - visual only */}
          <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-800">
                <Filter className="h-5 w-5" />
                Filter Projects
              </CardTitle>
              <CardDescription>Refine your search by selecting filters below</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
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
            </CardContent>
          </Card>
          {/* Charts - keeping exact same chart logic, only styling */}
          <div className="space-y-8 mb-8">
            {/* First Row: Country and Region Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Projects by Country - same chart config */}
              <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-teal-800">
                        <Globe className="h-5 w-5" />
                        Projects by Country
                      </CardTitle>
                      <CardDescription>Distribution of projects across countries</CardDescription>
                    </div>
                    <Select value={String(countryLimit)} onValueChange={(v) => setCountryLimit(v === 'all' ? 'all' : Number(v))}>
                      <SelectTrigger className="w-36 h-9 border-teal-300 bg-white hover:bg-teal-50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilterOptions(countryData.length, 'country').map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {displayedCountryData.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-gray-500">No data available</div>
                    </div>
                  ) : (
                    <div 
                      className={`w-full transition-all duration-500 ${countryLimit === 'all' ? 'max-h-[700px] overflow-y-auto pr-2' : ''}`}
                      style={{ 
                        minHeight: 300, 
                        maxHeight: countryLimit === 'all' ? 700 : 600 
                      }}
                    >
                      <ResponsiveContainer 
                        width="100%" 
                        height={countryLimit === 'all' 
                          ? Math.max(400, displayedCountryData.length * 35 + 50)
                          : Math.min(600, Math.max(300, displayedCountryData.length * 35 + 50))
                        }
                      >
                        <BarChart 
                          data={displayedCountryData} 
                          layout="vertical" 
                          margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                          className="animate-in fade-in duration-500"
                        >
                          <defs>
                            <linearGradient id="countryGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#14b8a6" />
                              <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            type="number" 
                            stroke="#6b7280" 
                            tick={{ fill: '#6b7280', fontSize: 14, fontWeight: '500' }}
                            allowDecimals={false}
                          />
                          <YAxis 
                            dataKey="country" 
                            type="category" 
                            width={displayedCountryData.length > 10 ? 180 : 140}
                            tick={{ fontSize: 13, fill: '#374151', fontWeight: '600' }} 
                            interval={0} 
                            stroke="#6b7280"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                              border: '1px solid #14b8a6', 
                              borderRadius: '8px', 
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              padding: '10px 14px',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                            formatter={(value: number) => [value.toLocaleString(), 'Projects']}
                            labelStyle={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#14b8a6"
                            radius={[0, 8, 8, 0]}
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                </BarChart>
              </ResponsiveContainer>
            </div>
                  )}
                </CardContent>
              </Card>

              {/* Projects by Region - same chart config */}
              <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl transition-all duration-300 hover:shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-teal-800">
                        <MapPin className="h-5 w-5" />
                        Projects by Region
                      </CardTitle>
                      <CardDescription>Geographic distribution by region</CardDescription>
                    </div>
                    <Select value={String(regionLimit)} onValueChange={(v) => setRegionLimit(v === 'all' ? 'all' : Number(v))}>
                      <SelectTrigger className="w-36 h-9 border-teal-300 bg-white hover:bg-teal-50 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilterOptions(regionData.length, 'region').map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {displayedRegionData.length === 0 ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-gray-500">No data available</div>
                    </div>
                  ) : (
                    <div 
                      className={`w-full transition-all duration-500 ${regionLimit === 'all' ? 'max-h-[700px] overflow-y-auto pr-2' : ''}`}
                      style={{ 
                        minHeight: 300, 
                        maxHeight: regionLimit === 'all' ? 700 : 600 
                      }}
                    >
                      <ResponsiveContainer 
                        width="100%" 
                        height={regionLimit === 'all' 
                          ? Math.max(400, displayedRegionData.length * 35 + 50)
                          : Math.min(600, Math.max(300, displayedRegionData.length * 35 + 50))
                        }
                      >
                        <BarChart 
                          data={displayedRegionData} 
                          layout="vertical" 
                          margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                          className="animate-in fade-in duration-500"
                        >
                          <defs>
                            <linearGradient id="regionGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#14b8a6" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            type="number" 
                            stroke="#6b7280" 
                            tick={{ fill: '#6b7280', fontSize: 14, fontWeight: '500' }}
                            allowDecimals={false}
                          />
                          <YAxis 
                            dataKey="region" 
                            type="category" 
                            width={displayedRegionData.length > 10 ? 180 : 140}
                            tick={{ fontSize: 13, fill: '#374151', fontWeight: '600' }} 
                            interval={0} 
                            stroke="#6b7280"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                              border: '1px solid #14b8a6', 
                              borderRadius: '8px', 
                              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                              padding: '10px 14px',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}
                            formatter={(value: number) => [value.toLocaleString(), 'Projects']}
                            labelStyle={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#06b6d4"
                            radius={[0, 8, 8, 0]}
                            animationBegin={100}
                            animationDuration={800}
                            animationEasing="ease-out"
                          />
                </BarChart>
              </ResponsiveContainer>
            </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Second Row: Status Pie Chart - same chart config */}
            <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl transition-all duration-300 hover:shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-teal-800">
                      <BarChart3 className="h-5 w-5" />
                      Projects by Voluntary Status
                    </CardTitle>
                    <CardDescription>Breakdown of project statuses</CardDescription>
                  </div>
                  <Select value={String(statusLimit)} onValueChange={(v) => setStatusLimit(v === 'all' ? 'all' : Number(v))}>
                    <SelectTrigger className="w-36 h-9 border-teal-300 bg-white hover:bg-teal-50 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getFilterOptions(statusData.length, 'status').map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {displayedStatusData.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">No data available</div>
                  </div>
                ) : (
                  <div className={`grid grid-cols-1 ${statusLimit === 'all' ? 'lg:grid-cols-1' : 'lg:grid-cols-2'} gap-6 animate-in fade-in duration-500`}>
                    <div className={statusLimit === 'all' ? 'w-full' : ''}>
                      <ResponsiveContainer 
                        width="100%" 
                        height={statusLimit === 'all' ? 450 : 350}
                      >
                <PieChart>
                  <Pie
                            data={displayedStatusData}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                            outerRadius={statusLimit === 'all' ? 140 : 120}
                            innerRadius={statusLimit === 'all' ? 50 : 40}
                            paddingAngle={statusLimit === 'all' ? 1 : 2}
                            label={statusLimit === 'all' 
                              ? false 
                              : ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                            animationBegin={0}
                            animationDuration={1000}
                            animationEasing="ease-out"
                  >
                            {displayedStatusData.map((entry, idx) => (
                              <Cell 
                                key={`cell-${idx}`} 
                                fill={pieColors[idx % pieColors.length]} 
                                stroke="#fff" 
                                strokeWidth={2}
                                style={{ transition: 'opacity 0.3s ease' }}
                              />
                    ))}
                  </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                            border: '1px solid #14b8a6', 
                            borderRadius: '8px', 
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            padding: '10px 14px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                          formatter={(value: number) => [value.toLocaleString(), 'Projects']}
                          labelStyle={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: '500' }}
                          iconSize={14}
                          fontSize={13}
                        />
                </PieChart>
              </ResponsiveContainer>
                    </div>
                    {/* Enhanced Legend - same data */}
                    <div className={`flex flex-col gap-3 ${statusLimit === 'all' ? 'justify-start' : 'justify-center'}`}>
                      <h3 className="font-semibold text-gray-700 mb-2 text-base">Status Breakdown</h3>
                      <div className={`space-y-2 ${statusLimit === 'all' ? 'max-h-[500px]' : 'max-h-80'} overflow-y-auto pr-2 custom-scrollbar`}>
                        {displayedStatusData.map((entry, idx) => (
                          <div 
                            key={entry.status} 
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-teal-50 transition-colors animate-in fade-in"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <div 
                              className="w-5 h-5 rounded flex-shrink-0 mt-0.5" 
                              style={{ backgroundColor: pieColors[idx % pieColors.length] }}
                            ></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="font-medium text-gray-700 break-words leading-snug text-sm">{entry.status}</span>
                                <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-200 flex-shrink-0 whitespace-nowrap text-sm font-semibold">
                                  {entry.count.toLocaleString()}
                                </Badge>
                              </div>
                            </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* View Details Button - same functionality */}
          <div className="flex justify-center gap-4 mb-8">
            <Button
              size="lg"
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-lg px-8"
              onClick={async () => {
                // Fetch full data when user clicks (only when needed)
                const fullData = await fetchAllProjectsWithFilters({
                  regions: selectedRegions,
                  voluntaryStatuses: selectedVoluntaryStatuses,
                  voluntaryRegistries: selectedVoluntaryRegistries,
                  countries: selectedCountries,
                  areasOfInterest: selectedAreasOfInterest,
                });
                navigate('/project-cards', { state: { projects: fullData } });
              }}
              disabled={loading || projects.length === 0}
            >
              <Eye className="h-5 w-5 mr-2" />
              View Project Details
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
          {/* World Map Section - same map logic */}
          <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-800">
                <Globe className="h-5 w-5" />
                Global Project Distribution Map
              </CardTitle>
              <CardDescription>Interactive map showing project density by country</CardDescription>
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
                overflow: "visible"
              }}
            >
              <MapWithProjectCounts countryData={countryData} />
            </div>
            </CardContent>
          </Card>
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
          background: "rgba(20, 184, 166, 0.95)",
          backdropFilter: "blur(10px)",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 8,
          pointerEvents: "none",
          zIndex: 1000,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.2)"
        }}>{tooltip.content}</div>
      )}
      {/* Enhanced Legend - same data */}
      <div style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        zIndex: 10,
        display: 'inline-block',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(20, 184, 166, 0.3)',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 10, color: '#0f766e' }}>PROJECT COUNT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[0], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>&lt; 10</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[1], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>10 - 24</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[2], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>25 - 49</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[3], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>50 - 124</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[4], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>125 - 249</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[5], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>250 - 499</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[6], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>500 - 999</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 18, background: colorScale[7], border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: 4, display: 'inline-block' }}></div>
            <span style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>&gt;= 1000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExploreProjects; 
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, ArrowLeft } from "lucide-react";

function MultiSelectDropdown({
  options, selected, setSelected, placeholder, loadingLabel = "Loading...", filtersLoading
}: {
  options: string[],
  selected: string[],
  setSelected: (v: string[]) => void,
  placeholder: string,
  loadingLabel?: string,
  filtersLoading: boolean
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-56" disabled={filtersLoading}>
          {filtersLoading
            ? loadingLabel
            : selected.length === 0
              ? placeholder
              : selected.length === 1
                ? selected[0]
                : `${selected.length} selected`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 max-h-72 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          <Button
            variant={selected.length === 0 ? "default" : "outline"}
            onClick={() => setSelected([])}
            className="mb-1"
          >
            All
          </Button>
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
              <label htmlFor={`option-${option}`} className="cursor-pointer select-none">
                {option}
              </label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const ProjectTable = () => {
  const navigate = useNavigate();
  // Filter options
  const [regions, setRegions] = useState<string[]>([]);
  const [voluntaryStatuses, setVoluntaryStatuses] = useState<string[]>([]);
  const [voluntaryRegistries, setVoluntaryRegistries] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  
  // Selected filters
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedVoluntaryStatuses, setSelectedVoluntaryStatuses] = useState<string[]>([]);
  const [selectedVoluntaryRegistries, setSelectedVoluntaryRegistries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedAreasOfInterest, setSelectedAreasOfInterest] = useState<string[]>([]);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [hasAreaOfInterestColumn, setHasAreaOfInterestColumn] = useState(false);

  // Helper function to fetch all unique values for a column in batches
  async function fetchAllUniqueColumnValues(column: string): Promise<string[]> {
    const BATCH_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;
    while (keepFetching) {
      const { data, error } = await supabase.from("global_projects_2025" as any).select(`"${column}"`).range(from, to);
      if (error) {
        console.error(`Error fetching ${column} from global_projects_2025:`, error);
        throw new Error(`Failed to fetch ${column}: ${error.message || error.code || 'Unknown error'}`);
      }
      allRows = allRows.concat(data || []);
      if (!data || data.length < BATCH_SIZE) {
        keepFetching = false;
      } else {
        from += BATCH_SIZE;
        to += BATCH_SIZE;
      }
    }
    const unique = Array.from(
      new Set(
        allRows
          .map((p: any) => (p[column] || "").trim())
          .filter((val: string) => val.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));
    return unique;
  }

  // Fetch all filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      setFiltersLoading(true);
      try {
        // Fetch required columns
        const [regionsData, statusesData, registriesData, countriesData] = await Promise.all([
          fetchAllUniqueColumnValues("Region"),
          fetchAllUniqueColumnValues("Voluntary Status"),
          fetchAllUniqueColumnValues("Voluntary Registry"),
          fetchAllUniqueColumnValues("Country"),
        ]);
        setRegions(regionsData);
        setVoluntaryStatuses(statusesData);
        setVoluntaryRegistries(registriesData);
        setCountries(countriesData);
        
        // Try to fetch Area of Interest, but don't fail if it doesn't exist
        try {
          const areasData = await fetchAllUniqueColumnValues("Area of Interest");
          setAreasOfInterest(areasData);
          setHasAreaOfInterestColumn(true);
        } catch (areaError: any) {
          console.warn("Area of Interest column not found, skipping:", areaError);
          setAreasOfInterest([]);
          setHasAreaOfInterestColumn(false);
        }
      } catch (e: any) {
        console.error("Error fetching filter options:", e);
        setError(`Failed to load filter options: ${e.message || 'Unknown error'}. Please check if the global_projects_2025 table exists and RLS policies are configured correctly.`);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchFilters();
  }, []);

  // Fetch projects with all filters
  useEffect(() => {
    setLoading(true);
    setError(null);
    // Build select columns - check if Area of Interest exists
    const selectColumns = '"Project Name", Methodology, "Country", "Region", "Voluntary Status", "Voluntary Registry"';
    
    let query: any = supabase.from("global_projects_2025" as any).select(
      hasAreaOfInterestColumn 
        ? `${selectColumns}, "Area of Interest"`
        : selectColumns
    );
    
    // Apply all filters
    if (selectedRegions.length > 0) query = query.in("Region", selectedRegions);
    if (selectedVoluntaryStatuses.length > 0) query = query.in("Voluntary Status", selectedVoluntaryStatuses);
    if (selectedVoluntaryRegistries.length > 0) query = query.in("Voluntary Registry", selectedVoluntaryRegistries);
    if (selectedCountries.length > 0) query = query.in("Country", selectedCountries);
    if (selectedAreasOfInterest.length > 0 && hasAreaOfInterestColumn) query = query.in("Area of Interest", selectedAreasOfInterest);
    
    query
      .then(({ data, error }: { data: any[]; error: any }) => {
        if (error) {
          console.error("Error loading projects:", error);
          setError(`Failed to load projects: ${error.message || error.code || 'Unknown error'}`);
          setProjects([]);
        } else {
          setProjects(data || []);
        }
        setLoading(false);
      })
      .catch((err: any) => {
        console.error("Unexpected error loading projects:", err);
        setError(`Failed to load projects: ${err.message || 'Unexpected error'}`);
        setProjects([]);
        setLoading(false);
      });
  }, [selectedRegions, selectedVoluntaryStatuses, selectedVoluntaryRegistries, selectedCountries, selectedAreasOfInterest]);

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project["Project Name"]?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    project["Methodology"]?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    project["Country"]?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    project["Region"]?.toLowerCase().includes(searchFilter.toLowerCase())
  );

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
          <Button variant="outline" className="w-56" disabled={filtersLoading}>
            <Filter className="w-4 h-4 mr-2" />
            {filtersLoading
              ? loadingLabel
              : selected.length === 0
                ? placeholder
                : selected.length === 1
                  ? selected[0]
                  : `${selected.length} selected`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 max-h-72 overflow-y-auto p-2">
          <div className="flex flex-col gap-1">
            <Button
              variant={selected.length === 0 ? "default" : "outline"}
              onClick={() => setSelected([])}
              className="mb-1"
            >
              All
            </Button>
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
                <label htmlFor={`option-${option}`} className="cursor-pointer select-none">
                  {option}
                </label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Multi-select dropdown for project types
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Global Project Table</h1>
          <Button
            variant="outline"
            onClick={() => navigate('/explore/global-projects')}
            className="border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-700 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search projects by name, methodology, country, or region..."
            className="border rounded px-3 py-2 text-sm w-full md:w-64"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />
        </div>
        
        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          <MultiSelectDropdown
            options={regions}
            selected={selectedRegions}
            setSelected={setSelectedRegions}
            placeholder="All Regions"
            loadingLabel="Loading regions..."
            filtersLoading={filtersLoading}
          />
          <MultiSelectDropdown
            options={countries}
            selected={selectedCountries}
            setSelected={setSelectedCountries}
            placeholder="All Countries"
            loadingLabel="Loading countries..."
            filtersLoading={filtersLoading}
          />
          <MultiSelectDropdown
            options={voluntaryStatuses}
            selected={selectedVoluntaryStatuses}
            setSelected={setSelectedVoluntaryStatuses}
            placeholder="All Statuses"
            loadingLabel="Loading statuses..."
            filtersLoading={filtersLoading}
          />
          <MultiSelectDropdown
            options={voluntaryRegistries}
            selected={selectedVoluntaryRegistries}
            setSelected={setSelectedVoluntaryRegistries}
            placeholder="All Registries"
            loadingLabel="Loading registries..."
            filtersLoading={filtersLoading}
          />
          {hasAreaOfInterestColumn && (
            <MultiSelectDropdown
              options={areasOfInterest}
              selected={selectedAreasOfInterest}
              setSelected={setSelectedAreasOfInterest}
              placeholder="All Areas of Interest"
              loadingLabel="Loading areas..."
              filtersLoading={filtersLoading}
            />
          )}
        </div>
        {/* Mobile Card View */}
        <div className="block md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-8">No projects found</div>
          ) : (
            filteredProjects.map((project, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4 border">
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Project Name</h3>
                  <p className="text-gray-700 text-sm">{project["Project Name"] || "N/A"}</p>
                </div>
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Methodology</h3>
                  <p className="text-gray-700 text-sm">{project.Methodology || "N/A"}</p>
                </div>
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Country</h3>
                  <p className="text-gray-700 text-sm">{project["Country"] || "N/A"}</p>
                </div>
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Region</h3>
                  <p className="text-gray-700 text-sm">{project["Region"] || "N/A"}</p>
                </div>
                <div className="mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Status</h3>
                  <p className="text-gray-700 text-sm">{project["Voluntary Status"] || "N/A"}</p>
                </div>
                {hasAreaOfInterestColumn && (
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">Area of Interest</h3>
                    <p className="text-gray-700 text-sm">{project["Area of Interest"] || "N/A"}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded shadow bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted text-foreground">
                <th className="px-4 py-2 text-left font-semibold">Project Name</th>
                <th className="px-4 py-2 text-left font-semibold">Methodology</th>
                <th className="px-4 py-2 text-left font-semibold">Country</th>
                <th className="px-4 py-2 text-left font-semibold">Region</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                {hasAreaOfInterestColumn && (
                  <th className="px-4 py-2 text-left font-semibold">Area of Interest</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={hasAreaOfInterestColumn ? 6 : 5} className="px-4 py-4 text-center">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="px-4 py-4 text-center text-red-500">{error}</td></tr>
              ) : filteredProjects.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-4 text-center">No projects found.</td></tr>
              ) : (
                filteredProjects.map((project, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-muted/50" : ""}>
                    <td className="px-4 py-2 whitespace-pre-line">{project["Project Name"] || "N/A"}</td>
                    <td className="px-4 py-2 whitespace-pre-line">{project.Methodology || "N/A"}</td>
                    <td className="px-4 py-2">{project["Country"] || "N/A"}</td>
                    <td className="px-4 py-2">{project["Region"] || "N/A"}</td>
                    <td className="px-4 py-2">{project["Voluntary Status"] || "N/A"}</td>
                    {hasAreaOfInterestColumn && (
                      <td className="px-4 py-2">{project["Area of Interest"] || "N/A"}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjectTable; 
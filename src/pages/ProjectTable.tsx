import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [selectedAreasOfInterest, setSelectedAreasOfInterest] = useState<string[]>([]); // Now an array
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Helper function to fetch all unique values for a column in batches
  async function fetchAllUniqueColumnValues(column: string): Promise<string[]> {
    const BATCH_SIZE = 1000;
    let allRows: any[] = [];
    let from = 0;
    let to = BATCH_SIZE - 1;
    let keepFetching = true;
    while (keepFetching) {
      const { data, error } = await supabase.from("global_projects" as any).select(`"${column}"`).range(from, to);
      // console.log(`[DEBUG] Supabase fetch for column '${column}':`, { data, error });
      if (error) throw error;
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
    // console.log(`[DEBUG] Unique values for '${column}':`, unique);
    return unique;
  }

  // Fetch unique project types on mount
  useEffect(() => {
    const fetchTypes = async () => {
      setFiltersLoading(true);
      try {
        const areasOfInterest = await fetchAllUniqueColumnValues("Area of Interest");
        // console.log("[DEBUG] Setting projectTypes:", areasOfInterest);
        setAreasOfInterest(areasOfInterest);
      } catch (e) {
        // console.error("[DEBUG] Error fetching project types:", e);
      } finally {
        setFiltersLoading(false);
      }
    };
    fetchTypes();
  }, []);

  // Fetch projects for selected types
  useEffect(() => {
    setLoading(true);
    setError(null);
    let query: any = supabase.from("global_projects" as any).select('"Project Name", Methodology');
    if (selectedAreasOfInterest.length > 0) query = query.in("Area of Interest", selectedAreasOfInterest);
    query
      .then(({ data, error }: { data: any[]; error: any }) => {
        // console.log("[DEBUG] Projects fetch result:", { data, error });
        if (error) {
          setError("Failed to load projects");
          setProjects([]);
        } else {
          setProjects(data || []);
        }
        setLoading(false);
      });
  }, [selectedAreasOfInterest]);

  // Filter projects based on search
  const filteredProjects = projects.filter(project =>
    project["Project Name"]?.toLowerCase().includes(searchFilter.toLowerCase()) ||
    project["Methodology"]?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Multi-select dropdown for project types
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Global Project Table</h1>
        
        {/* Search Bar - Mobile First */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search projects..."
            className="border rounded px-3 py-2 text-sm w-full md:w-64"
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
          />
        </div>
        
        {/* Project Type Multi-Select Button Group Filter */}
        <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
          <Button
            variant={selectedAreasOfInterest.length === 0 ? "default" : "outline"}
            onClick={() => setSelectedAreasOfInterest([])}
            disabled={filtersLoading}
            className={`text-xs md:text-sm ${selectedAreasOfInterest.length === 0 ? "bg-[#20C997] text-white" : "bg-white text-gray-700 border border-gray-300"}`}
          >
            All Areas of Interest
          </Button>
          {areasOfInterest.map((area) => (
            <Button
              key={area}
              variant="outline"
              onClick={() => {
                if (selectedAreasOfInterest.includes(area)) {
                  setSelectedAreasOfInterest(selectedAreasOfInterest.filter((t) => t !== area));
                } else {
                  setSelectedAreasOfInterest([...selectedAreasOfInterest, area]);
                }
              }}
              className={`text-xs md:text-sm ${
                selectedAreasOfInterest.includes(area)
                  ? "bg-[#20C997] text-white border-[#20C997]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {area}
            </Button>
          ))}
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
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">Methodology</h3>
                  <p className="text-gray-700 text-sm">{project.Methodology || "N/A"}</p>
                </div>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={2} className="px-4 py-4 text-center">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={2} className="px-4 py-4 text-center text-red-500">{error}</td></tr>
              ) : filteredProjects.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-4 text-center">No projects found.</td></tr>
              ) : (
                filteredProjects.map((project, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-muted/50" : ""}>
                    <td className="px-4 py-2 whitespace-pre-line">{project["Project Name"]}</td>
                    <td className="px-4 py-2 whitespace-pre-line">{project.Methodology}</td>
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
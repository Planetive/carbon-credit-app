import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

const statusColors: Record<string, string> = {
  "Cancelled": "bg-green-400",
  "Planned": "bg-teal-400",
  "Operational": "bg-emerald-400",
  "Under construction": "bg-cyan-400",
};

const CCUSProjectDetails = () => {
  const location = useLocation();
  const projects = location.state?.projects || (location.state?.project ? [location.state.project] : []);
  const [modalProject, setModalProject] = useState<any | null>(null);
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = React.useMemo(() => {
    if (!debouncedQuery) return projects;
    const q = debouncedQuery.toLowerCase();
    return projects.filter((p: any) => {
      const name = String(p["Project name"] || "").toLowerCase();
      return name.includes(q);
    });
  }, [projects, debouncedQuery]);

  if (!projects || projects.length === 0) {
    return <div className="container mx-auto px-4 py-8">No project data found.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              className="pl-10 pr-10 rounded-full shadow-sm focus:ring-2 focus:ring-teal-500"
              placeholder="Search by project name..."
              value={query} 
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Showing <span className="font-medium text-gray-900">{filtered.length}</span> of {projects.length} projects
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project: any, idx: number) => (
            <Card key={project.id || idx} className="bg-white/80">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{project["Project name"]}</CardTitle>
                  {project["Project Status"] && (
                    <Badge className={`ml-2 ${statusColors[project["Project Status"]] || "bg-teal-400"} text-white`}>{project["Project Status"]}</Badge>
                  )}
                </div>
                <CardDescription>
                  Country: {project["Country or economy"] || "-"} {project["Region"] ? `| Region: ${project["Region"]}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2"><b>Type:</b> {project["Project type"] || "-"}</div>
                <div className="mb-2"><b>Sector:</b> {project["Sector"] || "-"}</div>
                <div className="mb-2"><b>Fate of carbon:</b> {project["Fate of carbon"] || "-"}</div>
                <Button size="sm" className="mt-2 bg-primary text-white hover:bg-primary/90" onClick={() => setModalProject(project)}>
                  View More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Modal for full project details */}
        {modalProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
              <button
                className="absolute top-2 right-2 text-lg font-bold text-gray-500 hover:text-gray-800"
                onClick={() => setModalProject(null)}
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4">Full Project Details</h2>
              <div className="max-h-[60vh] overflow-y-auto">
                {Object.entries(modalProject)
                  .filter(([key]) => key !== "id" && key !== "created_at")
                  .map(([key, value]) => (
                    <div key={key} className="mb-2">
                      <b>{key}:</b>{" "}
                      {typeof value === "string" && value.match(/^https?:\/\//) ? (
                        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          {value}
                        </a>
                      ) : (
                        String(value)
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CCUSProjectDetails; 
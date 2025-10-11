import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LocationState {
  country: string;
  areaOfInterest: string;
  type: string;
  goal: string;
}

const FilteredProjects = () => {
  const location = useLocation();
  const state = location.state as any;
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState<any | null>(null);

  useEffect(() => {
    if (!state) {
      setError("No filter criteria provided.");
      setLoading(false);
      return;
    }
    async function fetchProjects() {
      setLoading(true);
      setError(null);
      const { areaOfInterest, type, goal } = state;
      // Only use type for filtering and display
      const filterType = type;
      try {
        const result: any = await supabase
          .from("global_projects"  as any)
          .select("*")
          .eq("Area of Interest", areaOfInterest)
          .eq("Type", type)
          .eq("End Goal", goal);
        const { data, error } = result;
        if (error) {
          setError(error.message);
          setProjects([]);
        } else {
          setProjects(data || []);
        }
      } catch (err: any) {
        setError(err.message || String(err));
        setProjects([]);
      }
      setLoading(false);
    }
    fetchProjects();
  }, [state]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col items-center py-10">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Filtered Projects</h1>
         {/* Show filter fields as badges/labels */}
         {state && (
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow border">
              <span className="font-semibold text-gray-600">Area of Interest:</span>
              <span className="text-primary">{state.areaOfInterest || '-'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow border">
              <span className="font-semibold text-gray-600">Type:</span>
              <span className="text-primary">{state.type || (projects[0]?.["Type"] ?? "-")}</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded px-3 py-1 shadow border">
              <span className="font-semibold text-gray-600">Goal:</span>
              <span className="text-primary">{state.goal || '-'}</span>
            </div>
          </div>
        )}
        {loading ? (
          <div>Loading projects...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : projects.length === 0 ? (
          <div>No projects found matching the selected criteria.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: any) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle>
                    {project["Project Name"]}
                    {project["Voluntary Status"] && (
                      <Badge className="ml-2">{project["Voluntary Status"]}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {project["Voluntary Registry"]}
                    {project["Country"] && ` | ${project["Country"]}`}
                    {project["Region"] && ` | ${project["Region"]}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-2"><b>Area of Interest:</b> {project["Area of Interest"]}</div>
                  <div className="mb-2"><b>Methodology:</b> {project["Methodology"]}</div>
                  <div className="mb-2"><b>Total Credits Issued:</b> {project["Total Credits Issued"]}</div>
                  {project["Sustainability Certifications"] && (
                    <div className="mb-2"><b>Sustainability Certifications:</b> {project["Sustainability Certifications"]}</div>
                  )}
                  <div className="mb-2"><b>Created:</b> {project["created_at"] ? new Date(project["created_at"]).toLocaleDateString() : "-"}</div>
                  <Button className="mt-2" onClick={() => setModalProject(project)}>
                    Read More Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
                {Object.entries(modalProject).map(([key, value]) => (
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
        <div className="mt-6 flex justify-end">
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FilteredProjects; 
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Building, Target, ArrowLeft } from "lucide-react";
import AppHeader from "@/components/ui/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CCUSProject {
  id: number;
  "Project name": string;
  "Country or economy": string;
  "Project type": string;
  "Project Status": string;
  "Project phase": string;
  "Announced capacity (Mt CO2/yr)": string;
  "Estimated capacity by IEA (Mt CO2/yr)": string;
  "Sector": string;
  "Fate of carbon": string;
  "Part of CCUS hub": string;
  "Region": string;
  "Partners": string;
  "Announcement": number;
  "FID": number;
  "Operation": number;
}

const FilteredCCUSProjects = () => {
  const location = useLocation();
  const state = location.state;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");
  const [projects, setProjects] = useState<CCUSProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisplayName = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();
      if (data && data.display_name) {
        setDisplayName(data.display_name);
      } else {
        setDisplayName("");
      }
    };
    fetchDisplayName();
  }, [user]);

  // Extract filter criteria from state
  const type = state?.type || state?.subcategory || "";
  const areaOfInterest = state?.areaOfInterest || "";
  const goal = state?.goal || "";

  // Fetch filtered CCUS projects
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("ccus_projects")
          .select("*");

        // Apply type filter if provided
        if (type && type.trim()) {
          query = query.eq("Project type", type);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setProjects(data || []);
      } catch (err) {
        // console.error("Error fetching CCUS projects:", err);
        setError("Failed to load projects");
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [type]);

  const formatCapacity = (capacity: string | number) => {
    if (!capacity) return "N/A";
    const num = typeof capacity === "string" ? parseFloat(capacity) : capacity;
    return isNaN(num) ? "N/A" : `${num} Mt CO2/yr`;
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "operational":
        return "bg-green-100 text-green-800";
      case "under construction":
        return "bg-blue-100 text-blue-800";
      case "planned":
        return "bg-yellow-100 text-yellow-800";
      case "announced":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case "feasibility":
        return "bg-orange-100 text-orange-800";
      case "engineering":
        return "bg-blue-100 text-blue-800";
      case "construction":
        return "bg-green-100 text-green-800";
      case "operation":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  CCUS Projects
                </h1>
                <p className="text-gray-600 mt-1">
                  {displayName ? `Welcome back, ${displayName}` : "Welcome"}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Filter Criteria
            </h2>
            <div className="flex flex-wrap gap-4">
              {type && (
                <Badge variant="secondary" className="text-sm">
                  Type: {type}
                </Badge>
              )}
              {areaOfInterest && (
                <Badge variant="secondary" className="text-sm">
                  Area: {areaOfInterest}
                </Badge>
              )}
              {goal && (
                <Badge variant="secondary" className="text-sm">
                  Goal: {goal}
                </Badge>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Found {projects.length} CCUS Project{projects.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-gray-600 mt-1">
                  Based on your selected criteria
                </p>
              </div>
              {loading && (
                <div className="text-sm text-gray-500">
                  Loading projects...
                </div>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Error Loading Projects
              </h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Projects Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {project["Project name"] || "Unnamed Project"}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{project["Country or economy"] || "Unknown Location"}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Project Type */}
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {project["Project type"] || "Unknown Type"}
                      </span>
                    </div>

                    {/* Status and Phase */}
                    <div className="flex flex-wrap gap-2">
                      {project["Project Status"] && (
                        <Badge className={getStatusColor(project["Project Status"])}>
                          {project["Project Status"]}
                        </Badge>
                      )}
                      {project["Project phase"] && (
                        <Badge className={getPhaseColor(project["Project phase"])}>
                          {project["Project phase"]}
                        </Badge>
                      )}
                    </div>

                    {/* Capacity Information */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">
                          Announced: {formatCapacity(project["Announced capacity (Mt CO2/yr)"])}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-gray-700">
                          Estimated: {formatCapacity(project["Estimated capacity by IEA (Mt CO2/yr)"])}
                        </span>
                      </div>
                    </div>

                    {/* Sector and Fate */}
                    <div className="space-y-2">
                      {project["Sector"] && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Sector:</span>{" "}
                          <span className="text-gray-600">{project["Sector"]}</span>
                        </div>
                      )}
                      {project["Fate of carbon"] && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Carbon Fate:</span>{" "}
                          <span className="text-gray-600">{project["Fate of carbon"]}</span>
                        </div>
                      )}
                    </div>

                    {/* Partners */}
                    {project["Partners"] && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Partners:</span>{" "}
                        <span className="text-gray-600 line-clamp-2">
                          {project["Partners"]}
                        </span>
                      </div>
                    )}

                    {/* CCUS Hub */}
                    {project["Part of CCUS hub"] && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">CCUS Hub:</span>{" "}
                        <span className="text-gray-600">{project["Part of CCUS hub"]}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Projects Found */}
          {!loading && !error && projects.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No CCUS Projects Found
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                No CCUS projects match your current filter criteria. Try adjusting your filters or explore all available projects.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate("/explore/ccus-projects")}
                  variant="default"
                >
                  Explore All CCUS Projects
                </Button>
                <Button
                  onClick={() => navigate("/project-wizard")}
                  variant="outline"
                >
                  Try Different Criteria
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FilteredCCUSProjects; 
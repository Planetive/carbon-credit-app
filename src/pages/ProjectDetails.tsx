import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!user || !id) return;
      setLoading(true);
      setError(null);
      // const { data, error } = await supabase
      //   .from("project_inputs")
      //   .select("*")
      //   .eq("id", id)
      //   .eq("user_id", user.id)
      //   .single();
      const { data, error } = await supabase
        .from("project_inputs" as any)
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) {
        setError("Project not found or you do not have access.");
        setProject(null);
      } else {
        setProject(data);
      }
      setLoading(false);
    };

    fetchProject();
  }, [id, user]);

  if (loading) return <div className="p-8">Loading project details...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!project) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{project.project_name || <span className="italic text-gray-400">(info not provided)</span>}</h1>
            <p className="text-gray-600">Project draft details and input summary</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-teal-600 text-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-700 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="grid gap-8">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-blue-50/60 border-blue-100">
              <CardHeader>
                <CardTitle className="text-lg">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><b>Name of Project:</b> {project.project_name || <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div><b>Country:</b> {project.country || <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div><b>Area of Interest:</b> {project.area_of_interest || <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div><b>Type:</b> {project.type || <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div><b>Goal:</b> {project.goal || <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div><b>Would you like to register your project for carbon credits?</b><br/>
                {project.register_for_credits === true ? "Yes" : project.register_for_credits === false ? "No" : <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div><b>Proposed developer of project:</b><br/>
                {project.development_strategy === "self"  ? "Self" : project.development_strategy === "third-party"  ? "Third Party": project.development_strategy === "info not provided" ? <span className="italic text-gray-400">(info not provided)</span> : project.development_strategy}
                </div>
                {/* <div><b>Additional Info:</b> {project.additional_info || <span className="italic text-gray-400">(info not provided)</span>}</div> */}
              </CardContent>
            </Card>

            <Card className="bg-green-50/60 border-green-100">
              <CardHeader>
                <CardTitle className="text-lg">Emissions & Waste Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><b>Do you have data available on your organization’s current emissions, wastewater discharge, or other discharges?</b><br/>
                {project.has_emissions_knowledge === "yes" ? "Yes" : project.has_emissions_knowledge === "no" ? "No" : <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div className="pl-2">
                  <div className="font-semibold">Greenhouse Gas Emissions</div>
                  <div><b>Types:</b> {project.ghg_types || <span className="italic text-gray-400">(info not provided)</span>}</div>
                  <div><b>Sources:</b> {project.ghg_sources || <span className="italic text-gray-400">(info not provided)</span>}</div>
                  <div><b>Annual emissions (tCO₂e):</b> {project.ghg_annual || <span className="italic text-gray-400">(info not provided)</span>}</div>
                </div>
                <div className="pl-2">
                  <div className="font-semibold">Wastewater Discharge</div>
                  <div><b>Volume (m³/day):</b> {project.waste_volume || <span className="italic text-gray-400">(info not provided)</span>}</div>
                  <div><b>Pollutants:</b> {project.waste_pollutants || <span className="italic text-gray-400">(info not provided)</span>}</div>
                  <div><b>Treatment methods:</b> {project.waste_treatment || <span className="italic text-gray-400">(info not provided)</span>}</div>
                  <div><b>Discharge destination:</b> {project.waste_destination || <span className="italic text-gray-400">(info not provided)</span>}</div>
                </div>
                <div className="pl-2">
                  <div className="font-semibold">Other Discharges</div>
                  <div><b>Type:</b> {project.other_type || <span className="italic text-gray-400">(info not provided)</span>}</div>
                  <div><b>Volume:</b> {project.other_volume || <span className="italic text-gray-400">(info not provided)</span>}</div>
                  <div><b>Disposal Method:</b> {project.other_disposal || <span className="italic text-gray-400">(info not provided)</span>}</div>

                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-yellow-50/60 border-yellow-100">
              <CardHeader>
                <CardTitle className="text-lg">Industry Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div><b>Current Industry:</b> {project.current_industry || <span className="italic text-gray-400">(info not provided)</span>}</div>
                <div><b>Industry Size:</b> {project.industry_size || <span className="italic text-gray-400">(info not provided)</span>}</div>
                {/* <div><b>Additional Info:</b> {project.additional_info || <span className="italic text-gray-400">(info not provided)</span>}</div> */}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-b from-blue-50 to-green-50 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">AI Analysis Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded p-3 text-gray-800 min-h-[60px]">
                  {project.additional_info || <span className="italic text-gray-400">(info not provided)</span>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails; 
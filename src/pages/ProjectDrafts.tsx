import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Clock, FileText, Trash2, Play, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const ProjectDrafts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [goalFilter, setGoalFilter] = useState("");
  const [uniqueGoals, setUniqueGoals] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrafts = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      const { data, error } = await (supabase as any)
        .from("project_inputs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setError("Failed to load drafts");
        setDrafts([]);
        setTypeOptions([]);
      } else {
        setDrafts(data || []);
        // Extract unique type values from the 'type' column
        const types = Array.from(new Set((data || []).map((d: any) => (d.type || '').trim()).filter(Boolean))) as string[];
        setTypeOptions(types);
      }
      setLoading(false);
    };
    fetchDrafts();
  }, [user]);

  const getProgressColor = (progress: number) => {
    if (progress >= 70) return "bg-green-500";
    if (progress >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Solar":
        return "bg-yellow-100 text-yellow-800";
      case "Forestry":
        return "bg-green-100 text-green-800";
      case "Waste":
        return "bg-purple-100 text-purple-800";
      case "Energy":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleDeleteDraft = async (id: string) => {
    const prevDrafts = drafts;
    setDrafts((drafts) => drafts.filter((d) => d.id !== id));
    const { error } = await (supabase as any).from("project_inputs").delete().eq("id", id);
    if (error) {
      // console.error("Delete error:", error);
    }
    if (error) {
      setDrafts(prevDrafts); // revert UI
      toast({
        title: "Failed to delete draft",
        description: error.message,
      });
    } else {
      toast({
        title: "Draft deleted",
        description: "The draft project was deleted successfully.",
      });
    }
  };

  // Filter drafts by search and type
  const filteredDrafts = drafts.filter((draft) => {
    const matchesSearch = draft.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedTypes.length === 0 ? true : selectedTypes.includes((draft.type || '').trim());
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="mr-4" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Project Drafts</h1>
          </div>
          <Button asChild className="w-full md:w-auto">
            <Link to="/bank-portfolio">
              Start New Portfolio
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Search and Filters */}
        <div className="mb-6 md:mb-8 space-y-4">
          <div className="flex flex-col gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drafts..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Type filter dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-48">
                    {selectedTypes.length === 0
                      ? "Filter by Type"
                      : selectedTypes.length === 1
                        ? selectedTypes[0]
                        : `${selectedTypes.length} selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full sm:w-48 max-h-72 overflow-y-auto p-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant={selectedTypes.length === 0 ? "default" : "outline"}
                      onClick={() => setSelectedTypes([])}
                      className="mb-1"
                    >
                      All
                    </Button>
                    {typeOptions.map((type) => (
                      <div key={type} className="flex items-center gap-2 py-1">
                        <Checkbox
                          id={`type-${type}`}
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedTypes([...selectedTypes, type]);
                            else setSelectedTypes(selectedTypes.filter((t) => t !== type));
                          }}
                        />
                        <label htmlFor={`type-${type}`} className="cursor-pointer select-none">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="outline" className="w-full sm:w-auto">
                Sort by Date
              </Button>
            </div>
          </div>
        </div>

        {/* Drafts List */}
        <div className="space-y-4">
          {loading ? (
            <div>Loading drafts...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : filteredDrafts.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <CardTitle className="mb-2">No Drafts Found</CardTitle>
                <CardDescription className="mb-6">
                  You don't have any saved project drafts yet. Start a new project to begin.
                </CardDescription>
                <Button asChild>
                  <Link to="/project-wizard">
                    Start Your First Project
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredDrafts.map((draft) => (
              <Card key={draft.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h3 className="font-semibold text-base md:text-lg">{draft.project_name}</h3>
                        <Badge className={`${getTypeColor(draft.type || "")} w-fit`}>
                          {draft.type || "Unknown"}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>Created {draft.created_at ? new Date(draft.created_at).toLocaleString() : "-"}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress: {/* TODO: Calculate progress if available */}N/A</span>
                        </div>
                        {/* Optionally add a progress bar if you have progress data */}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2 md:ml-6">
                      <Button size="sm" onClick={() => {
                        const typeToPass = draft.subcategory?.trim() || draft.type?.trim();
                        // console.log("Navigating with type:", typeToPass, "| Draft:", draft);
                        navigate('/filtered-projects-landing', {
                          state: {
                            country: draft.country,
                            areaOfInterest: draft.area_of_interest,
                            type: typeToPass,
                            subcategory: draft.subcategory,
                            goal: draft.goal,
                          }
                        });
                      }}>
                        <Play className="h-4 w-4 mr-2" />
                        Continue
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          navigate(`/project/${draft.id}`);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteDraft(draft.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Empty State */}
        {filteredDrafts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="mb-2">No Drafts Found</CardTitle>
              <CardDescription className="mb-6">
                You don't have any saved project drafts yet. Start a new project to begin.
              </CardDescription>
              <Button asChild>
                <Link to="/project-wizard">
                  Start Your First Project
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <div className="mt-8 md:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Total Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{drafts.length}</div>
              <p className="text-xs md:text-sm text-muted-foreground">
                Across all project types
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Estimated Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">82,500</div>
              <p className="text-xs md:text-sm text-muted-foreground">
                Total tCO2e potential
              </p>
            </CardContent>
          </Card>
          
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Average Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">51%</div>
              <p className="text-xs md:text-sm text-muted-foreground">
                Across all drafts
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectDrafts;
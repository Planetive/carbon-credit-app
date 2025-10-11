import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FolderOpen, Clock, BarChart3, Settings, LogOut, User, Globe, Sparkles, TrendingUp, FileText, ArrowRight, Search, Filter, Factory } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { signOut, user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [profileForm, setProfileForm] = useState({ organizationName: "", displayName: "", phone: "" });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [esgAssessment, setEsgAssessment] = useState<any>(null);
  const [esgScores, setEsgScores] = useState<any>(null);
  const [emissionData, setEmissionData] = useState<any>(null);
  const [hasAnyEmissions, setHasAnyEmissions] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, display_name")
        .eq("user_id", user.id)
        .single();
      if (!data || error) {
        setProfileMissing(true);
      } else {
        setProfileMissing(false);
      }
      if (data && data.display_name) {
        setDisplayName(data.display_name);
      } else {
        setDisplayName("");
      }
    };
    checkProfile();
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.organizationName || !profileForm.displayName) {
      toast({ title: "Missing fields", description: "Organization name and display name are required.", variant: "destructive" });
      return;
    }
    setProfileSubmitting(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .insert([
        {
          user_id: user.id,
          organization_name: profileForm.organizationName,
          display_name: profileForm.displayName,
          phone: profileForm.phone || null,
        },
      ]);
    setProfileSubmitting(false);
    if (error) {
      toast({ title: "Profile error", description: error.message, variant: "destructive" });
    } else {
      setProfileMissing(false);
      toast({ title: "Profile created!", description: "Your profile has been saved." });
    }
  };

  useEffect(() => {
    if (!user || profileMissing) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("project_inputs" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (projectsError) {
        setError("Failed to load projects");
        setProjects([]);
      } else {
        setProjects(projectsData || []);
      }

      // Fetch ESG assessment
      const { data: esgData, error: esgError } = await supabase
        .from("esg_assessments")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!esgError && esgData) {
        setEsgAssessment(esgData);
        
        // Fetch admin scores if assessment exists
        const { data: scoresData, error: scoresError } = await supabase
          .from("esg_scores")
          .select("*")
          .eq("assessment_id", esgData.id)
          .single();
          
        if (!scoresError && scoresData) {
          const updatedAtMs = esgData?.updated_at ? new Date(esgData.updated_at).getTime() : 0;
          const scoredAtMs = scoresData?.scored_at ? new Date(scoresData.scored_at).getTime() : 0;
          if (scoredAtMs >= updatedAtMs) {
            setEsgScores(scoresData);
          } else {
            setEsgScores(null);
          }
        } else {
          setEsgScores(null);
        }
      }

      // Fetch emission calculator data
      const { data: emissionData, error: emissionError } = await (supabase as any)
        .from("emission_calculator")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!emissionError && emissionData) {
        setEmissionData(emissionData);
      }

      // Determine if user has any scope 1 emission entries saved
      try {
        const [fuelCount, refCount, passCount, delCount] = await Promise.all([
          (supabase as any).from('scope1_fuel_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
          (supabase as any).from('scope1_refrigerant_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
          (supabase as any).from('scope1_passenger_vehicle_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
          (supabase as any).from('scope1_delivery_vehicle_entries').select('id', { count: 'exact' }).eq('user_id', user.id),
        ]);
        const totalCount = (fuelCount.count || 0) + (refCount.count || 0) + (passCount.count || 0) + (delCount.count || 0);
        setHasAnyEmissions(totalCount > 0);
      } catch (_) {
        setHasAnyEmissions(false);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [user, profileMissing]);

  if (profileMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4 sm:pb-6">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-teal-500/10 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">Complete Your Profile</CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600">To continue, please provide your organization and display name.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Organization Name</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm sm:text-base"
                  name="organizationName"
                  type="text"
                  value={profileForm.organizationName}
                  onChange={e => setProfileForm(f => ({ ...f, organizationName: e.target.value }))}
                  required
                  placeholder="Enter your organization name"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Designation</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm sm:text-base"
                  name="displayName"
                  type="text"
                  value={profileForm.displayName}
                  onChange={e => setProfileForm(f => ({ ...f, displayName: e.target.value }))}
                  required
                  placeholder="Enter your display name"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-1 sm:mb-2 text-sm sm:text-base">Phone Number</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm sm:text-base"
                  name="phone"
                  type="tel"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="03XX-XXXXXXX"
                />
              </div>
              <Button type="submit" className="w-full py-2 sm:py-3 text-base sm:text-lg font-semibold bg-teal-600 hover:bg-teal-700" disabled={profileSubmitting}>
                {profileSubmitting ? "Saving..." : "Complete Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Draft":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <section className="bg-[linear-gradient(to_right,rgba(220,252,231,0.2),rgba(204,251,241,0.2),rgba(207,250,254,0.2))] py-6 sm:py-8 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-bold text-teal-800">
                {displayName ? `Welcome back, ${displayName} ! 👋` : "Hello"}
              </h1>
              <p className="mt-2 text-sm sm:text-base md:text-xl text-gray-700">
                Manage your carbon credit projects and explore global opportunities
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Explore Section - Full Width Hero */}
      <section className="bg-gradient-to-r from-green-50 via-teal-50 to-cyan-50 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-teal-800 mb-3 sm:mb-4">
              Explore Global Carbon Projects
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto px-4">
              Discover thousands of verified carbon projects worldwide. Find the perfect investment opportunity 
              that aligns with your sustainability goals and financial objectives.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
            <div className="text-center">
              <div className="bg-teal-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-teal-800 mb-2">10,000+ Projects</h3>
              <p className="text-sm sm:text-base text-gray-600 px-2">Verified carbon projects across 50+ countries</p>
            </div>
            <div className="text-center">
              <div className="bg-cyan-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-teal-800 mb-2">Real-time Data</h3>
              <p className="text-sm sm:text-base text-gray-600 px-2">Live project updates and performance metrics</p>
            </div>
            <div className="text-center sm:col-span-2 md:col-span-1">
              <div className="bg-green-100 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-teal-800 mb-2">Detailed Analytics</h3>
              <p className="text-sm sm:text-base text-gray-600 px-2">Comprehensive project analysis and insights</p>
            </div>
          </div>

          <div className="text-center">
            <Link to="/explore">
              <Button size="lg" className="bg-teal-600 text-white hover:bg-teal-700 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold w-full sm:w-auto">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Start Exploring Projects
              </Button>
            </Link>
          </div>
        </div>
      </section>

             {/* Project Creation Section */}
       <section className="bg-white py-12 sm:py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-8 sm:mb-12">
             <h2 className="text-2xl sm:text-3xl font-bold text-teal-800 mb-3 sm:mb-4">
               Create Your Own Carbon Project
             </h2>
             <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
               Ready to make a difference? Our AI-powered wizard will guide you through creating 
               your own carbon credit project from concept to implementation.
             </p>
           </div>

           <div className="max-w-4xl mx-auto">
             <Link to="/project-wizard">
               <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-0 group overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <CardContent className="p-4 sm:p-6 md:p-8 relative z-10">
                   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                     <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-6">
                       <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                         <Plus className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                       </div>
                       <div className="text-center sm:text-left">
                         <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Start New Project</h3>
                         <p className="text-teal-100 text-sm sm:text-base md:text-lg">
                           AI-guided project creation with step-by-step assistance
                         </p>
                       </div>
                     </div>
                     <div className="text-center sm:text-right">
                       <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white/20 group-hover:text-white/30 transition-colors">
                         →
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </Link>
           </div>
         </div>
       </section>

             {/* Management Tools Section */}
       <section className="bg-gradient-to-r from-green-50 via-teal-50 to-cyan-50 py-12 sm:py-16">

         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-8 sm:mb-12">
             <h2 className="text-2xl sm:text-3xl font-bold text-teal-800 mb-3 sm:mb-4">
               Project Management Tools
             </h2>
             <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto px-4">
               Access powerful tools to manage your projects, track progress, and generate insights
             </p>
           </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <Link to="/drafts">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border-0 group h-full">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-teal-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto sm:mx-0">
                      <FolderOpen className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Project Drafts</h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                        Continue working on saved project drafts and incomplete evaluations. 
                        Pick up where you left off with all your progress preserved.
                      </p>
                      <div className="flex items-center justify-center sm:justify-start text-teal-600 font-semibold group-hover:text-teal-700 transition-colors">
                        <span>View Drafts</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/reports">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-white border-0 group h-full">
                <CardContent className="p-4 sm:p-6 md:p-8">
                  <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 bg-cyan-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform mx-auto sm:mx-0">
                      <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-600" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Reports & Analytics</h3>
                      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                        Generate comprehensive reports and analytics. Track performance, 
                        measure impact, and make data-driven decisions.
                      </p>
                      <div className="flex items-center text-cyan-600 font-semibold group-hover:text-cyan-700 transition-colors">
                        <span>View Reports</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>


          </div>
        </div>
      </section>

      {/* Recent Projects Section */}
      {/* {projects.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Recent Projects</h2>
                <p className="text-gray-600">Your latest project activities and updates</p>
              </div>
              <Button variant="outline" size="lg" className="hover:bg-teal-600 hover:text-white transition-colors">
                View All Projects
              </Button>
            </div>

            <div className="grid gap-6">
              {projects.slice(0, 5).map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow bg-white border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-teal-500/10 rounded-xl flex items-center justify-center">
                          <FileText className="h-6 w-6 text-teal-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-lg">{project.project_name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : new Date(project.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="h-4 w-4" />
                              <span>{project.carbon_sequestration ? `${project.carbon_sequestration} tCO2e` : "Not specified"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(project.status || "Draft")}>
                          {project.status || "Draft"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/project/${project.id}`)}>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )} */}

             {/* ESG Health Check Section */}
       {/* <section className="bg-gradient-to-r from-green-50 via-teal-50 to-cyan-50 py-16"> */}
       <section className="bg-white py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-12">
             <h2 className="text-3xl font-bold text-teal-800 mb-4">
               ESG Health Check
             </h2>
             <p className="text-lg text-gray-700 max-w-2xl mx-auto">
               Readiness assessment towards full ESG and sustainability reporting
             </p>
           </div>

           <div className="max-w-4xl mx-auto">
             <Link to="/esg-health-check">
               <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 group overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <CardContent className="p-8 relative z-10">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-6">
                       <div className="h-20 w-20 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                         <div className="flex items-center space-x-1">
                           <div className="h-8 w-8 bg-green-400 rounded-lg flex items-center justify-center">
                             <span className="text-white font-bold text-sm">E</span>
                           </div>
                           <div className="h-8 w-8 bg-blue-400 rounded-lg flex items-center justify-center">
                             <span className="text-white font-bold text-sm">S</span>
                           </div>
                           <div className="h-8 w-8 bg-purple-400 rounded-lg flex items-center justify-center">
                             <span className="text-white font-bold text-sm">G</span>
                           </div>
                         </div>
                       </div>
                       <div>
                         <h3 className="text-3xl font-bold mb-2">ESG Assessment</h3>
                         <p className="text-emerald-100 text-lg">
                           {esgAssessment ? (
                             esgAssessment.status === 'submitted' && esgScores ? 
                               'Assessment completed - View your results' : 
                               esgAssessment.status === 'submitted' ? 
                                 'Assessment submitted - Awaiting admin review' :
                                 'Continue your assessment'
                           ) : (
                             'Start your comprehensive ESG evaluation'
                           )}
                         </p>
                         {esgAssessment && (
                           <div className="flex items-center space-x-4 mt-4">
                             <div className="flex items-center space-x-2">
                               <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                               <span className="text-sm text-emerald-100">
                                 E: {esgAssessment.environmental_completion}%
                               </span>
                             </div>
                             <div className="flex items-center space-x-2">
                               <div className="h-3 w-3 bg-blue-400 rounded-full"></div>
                               <span className="text-sm text-emerald-100">
                                 S: {esgAssessment.social_completion}%
                               </span>
                             </div>
                             <div className="flex items-center space-x-2">
                               <div className="h-3 w-3 bg-purple-400 rounded-full"></div>
                               <span className="text-sm text-emerald-100">
                                 G: {esgAssessment.governance_completion}%
                               </span>
                             </div>
                           </div>
                         )}
                         {esgAssessment && (
                           <div className="mt-3">
                             <Badge 
                               variant="secondary" 
                               className={`${
                                 esgAssessment.status === 'submitted' 
                                   ? 'bg-green-100 text-green-800' 
                                   : 'bg-yellow-100 text-yellow-800'
                               }`}
                             >
                               {esgAssessment.status === 'submitted' ? 'Submitted' : 'Draft'}
                             </Badge>
                           </div>
                         )}
                         
                         {/* Form Completion Note */}
                         {esgAssessment && (
                           <div className="mt-3 text-xs text-emerald-200/80">
                             * Percentages show form completion progress, not ESG readiness scores
                           </div>
                         )}
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-6xl font-bold text-white/20 group-hover:text-white/30 transition-colors">
                         →
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </Link>
             
             {/* View Results Button - Outside main div, same width */}
             {esgAssessment && esgScores && esgAssessment.status === 'submitted' && (
               <div className="mt-6 ">
                                   <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-white/20 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:border-white/30 hover:text-white hover:scale-105 transition-all duration-300 py-6 text-lg font-semibold shadow-lg"
                    onClick={() => navigate('/esg-results')}
                  >
                   View ESG Results
                 </Button>
               </div>
             )}
           </div>
         </div>
       </section>

             {/* Emission Calculator Section */}
       <section className="bg-gradient-to-r from-green-50 via-teal-50 to-cyan-50 py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-12">
             <h2 className="text-3xl font-bold text-teal-800 mb-4">
               Emission Calculator
             </h2>
             <p className="text-lg text-gray-700 max-w-2xl mx-auto">
               Calculate and track your organization's greenhouse gas emissions across all scopes
             </p>
           </div>

           <div className="max-w-4xl mx-auto">
             <Link to="/emission-calculator">
               <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 group overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <CardContent className="p-8 relative z-10">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-6">
                       <div className="h-20 w-20 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                         <Factory className="h-10 w-10 text-white" />
                       </div>
                       <div>
                         <h3 className="text-3xl font-bold mb-2">Scope 1, 2 & 3 Emissions</h3>
                         <p className="text-emerald-100 text-lg">
                           Do emission estimations for your organization.
                         </p>
                         {hasAnyEmissions && (
                           <div className="mt-3 text-sm text-emerald-100">
                             You have emission data saved. To view your results, use the button below.
                           </div>
                         )}
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-6xl font-bold text-white/20 group-hover:text-white/30 transition-colors">
                         →
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </Link>
             
             {/* View Results Button - only show when there is emission data */}
             {hasAnyEmissions && (
               <div className="mt-6">
                 <Button 
                   variant="outline" 
                   size="lg" 
                   className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white border-white/20 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-600 hover:border-white/30 hover:text-white hover:scale-105 transition-all duration-300 py-6 text-lg font-semibold shadow-lg"
                   onClick={() => navigate('/emission-results')}
                 >
                   View Emission Results
                 </Button>
               </div>
             )}
           </div>
         </div>
       </section>

             {/* Emission History Section */}
       <section className="bg-white py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-12">
             <h2 className="text-3xl font-bold text-teal-800 mb-4">
               Emission History Assessment
             </h2>
             <p className="text-lg text-gray-700 max-w-2xl mx-auto">
               Track your organization's emission measurement journey and assess your current sustainability practices
             </p>
           </div>

           <div className="max-w-4xl mx-auto">
             <Link to="/emission-history">
               <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 group overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <CardContent className="p-8 relative z-10">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-6">
                       <div className="h-20 w-20 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                         <div className="flex items-center space-x-1">
                           <div className="h-8 w-8 bg-green-400 rounded-lg flex items-center justify-center">
                             <span className="text-white font-bold text-sm">📊</span>
                           </div>
                           <div className="h-8 w-8 bg-blue-400 rounded-lg flex items-center justify-center">
                             <span className="text-white font-bold text-sm">📈</span>
                           </div>
                           <div className="h-8 w-8 bg-purple-400 rounded-lg flex items-center justify-center">
                             <span className="text-white font-bold text-sm">📋</span>
                           </div>
                         </div>
                       </div>
                       <div>
                         <h3 className="text-3xl font-bold mb-2">Emission History</h3>
                         <p className="text-blue-100 text-lg">
                           Assess your current emission tracking practices and get personalized recommendations
                         </p>
                         <div className="mt-3 text-sm text-blue-100">
                           • Company information assessment<br/>
                           • Current emission measurement evaluation<br/>
                           • Personalized action recommendations
                         </div>
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-6xl font-bold text-white/20 group-hover:text-white/30 transition-colors">
                         →
                       </div>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </Link>
           </div>
         </div>
       </section>

             {/* Quick Stats Section */}
       {/* <section className="bg-white py-16"> */}
       <section className="bg-white py-16">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center mb-12">
             <h2 className="text-3xl font-bold text-teal-800 mb-4">
               Platform Overview
             </h2>
             <p className="text-gray-600 text-lg">
               Join thousands of organizations making a positive impact
             </p>
           </div>

           <div className="grid md:grid-cols-4 gap-8">
             <div className="text-center">
               <div className="text-4xl font-bold text-teal-600 mb-2">2,500+</div>
               <div className="text-gray-600">Active Projects</div>
             </div>
             <div className="text-center">
               <div className="text-4xl font-bold text-cyan-600 mb-2">50+</div>
               <div className="text-gray-600">Countries</div>
             </div>
             <div className="text-center">
               <div className="text-4xl font-bold text-teal-500 mb-2">1.2M</div>
               <div className="text-gray-600">tCO2e Reduced</div>
             </div>
             <div className="text-center">
               <div className="text-4xl font-bold text-cyan-500 mb-2">500+</div>
               <div className="text-gray-600">Organizations</div>
             </div>
           </div>
         </div>
       </section>
    </div>
  );
};

export default Dashboard;
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, BookOpen, DollarSign, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import AppHeader from "@/components/ui/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const FilteredProjectsLanding = () => {
  const location = useLocation();
  const state = location.state;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState<string>("");
  const [noProjectsFound, setNoProjectsFound] = useState<boolean | null>(null);
  const [hasCCUSProjects, setHasCCUSProjects] = useState<boolean>(false);

  useEffect(() => {
    const fetchDisplayName = async () => {
      if (!user) return;
      const { data, error } = await (supabase as any)
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

  // Extract user choices from state
  const areaOfInterest = state?.areaOfInterest || "your selected area";
  const type = state?.type || state?.subcategory || "your selected type";
  const goal = state?.goal || "your selected goal";

  // Check for matching projects on mount
  useEffect(() => {
    let cancelled = false;
    const checkProjects = async () => {
      if (!areaOfInterest || !type || !goal) {
        setNoProjectsFound(null);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("global_projects")
        .select("id")
        .eq("Area of Interest", areaOfInterest)
        .eq("Type", type)
        .eq("End Goal", goal);
      if (!cancelled) {
        setNoProjectsFound(!data || data.length === 0);
      }
    };
    checkProjects();
    return () => {
      cancelled = true;
    };
  }, [areaOfInterest, type, goal]);

  // Check for matching CCUS projects on mount
  useEffect(() => {
    let cancelled = false;
    const checkCCUSProjects = async () => {
      if (!type) {
        setHasCCUSProjects(false);
        return;
      }
      const { data, error } = await (supabase as any)
        .from("ccus_projects")
        .select("id")
        .eq("Project type", type);
      if (!cancelled) {
        setHasCCUSProjects(data && data.length > 0);
      }
    };
    checkCCUSProjects();
    return () => {
      cancelled = true;
    };
  }, [type]);

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-white flex flex-col lg:flex-row">
        {/* Main content: left side (2/3) */}
        <div className="flex-1 flex flex-col">
          {/* Header Section */}
          <div className="flex-1 flex-col justify-top items-start px-4 md:px-8 lg:px-12 pt-8 md:pt-16 pb-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
              {displayName ? `Hello ${displayName}` : "Hello"}
            </h1>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              Thank you for utilizing our carbon credit analysis platform. We've processed your requirements and prepared personalized recommendations.
            </p>
          </div>

          {/* Unified Analysis Results & Options Section */}
          <div className="flex-1 flex flex-col justify-center items-start px-4 md:px-8 lg:px-12 py-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4 md:p-6 lg:p-8 mb-8 w-full max-w-6xl">
                              <div className="flex items-center gap-3 mb-6 md:mb-8">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-teal-600" />
                  </div>
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900">Analysis Results</h2>
                </div>

              {noProjectsFound === null ? (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    <span className="text-teal-800 font-semibold text-lg">Processing your requirements...</span>
                  </div>
                  <p className="text-gray-600 text-lg">Our AI is analyzing your criteria to find the most suitable carbon credit opportunities.</p>
                </div>
              ) : noProjectsFound ? (
                <div className="space-y-8">
                  {/* Analysis Status */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                      <span className="text-amber-800 font-semibold text-lg">Analysis Complete</span>
                    </div>
                    
                    {/* Criteria Summary */}
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Criteria Summary:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-500 mb-1">Area of Interest</div>
                          <div className="text-gray-900 font-semibold">{areaOfInterest}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-500 mb-1">Project Type</div>
                          <div className="text-gray-900 font-semibold">{type}</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-500 mb-1">Primary Goal</div>
                          <div className="text-gray-900 font-semibold">{goal}</div>
                        </div>
                      </div>
                    </div>

                    {/* No Results Message */}
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-amber-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Exact Matches Found</h3>
                      <p className="text-gray-600 mb-8 max-w-3xl mx-auto text-lg leading-relaxed">
                        Our analysis indicates that no projects or methodologies perfectly match your current criteria. 
                        This is common in specialized carbon credit markets. We recommend adjusting your parameters 
                        to explore available opportunities.
                      </p>
                      <Button
                        size="lg"
                        className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-4 rounded-lg text-lg"
                        onClick={() => navigate("/project-wizard")}
                      >
                        Revise Criteria
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Analysis Status */}
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <CheckCircle className="w-6 h-6 text-teal-600" />
                      <span className="text-teal-800 font-semibold text-lg">Analysis Complete</span>
                    </div>
                    
                    {/* Criteria Summary */}
                    <div className="mb-6">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Your Criteria Summary:</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                        <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-500 mb-1">Area of Interest</div>
                          <div className="text-gray-900 font-semibold text-sm md:text-base">{areaOfInterest}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-500 mb-1">Project Type</div>
                          <div className="text-gray-900 font-semibold text-sm md:text-base">{type}</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                          <div className="text-sm font-medium text-gray-500 mb-1">Primary Goal</div>
                          <div className="text-gray-900 font-semibold text-sm md:text-base">{goal}</div>
                        </div>
                      </div>
                    </div>

                    {/* Success Message */}
                    <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                      <div className="flex items-center gap-3 md:gap-4 mb-4">
                        <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-teal-600" />
                        <h3 className="text-xl md:text-2xl font-semibold text-gray-900">Matches Found</h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                        Our AI has identified <span className="font-semibold text-teal-700">relevant carbon credit projects</span> and 
                        <span className="font-semibold text-teal-700"> optimized methodologies</span> that align with your requirements. 
                        These opportunities have been carefully selected based on your specified criteria and market conditions.
                      </p>
                    </div>
                  </div>

                  {/* Project Options - Integrated into the same card */}
                  <div className="border-t border-gray-200 pt-6 md:pt-8">
                    <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 text-center">Explore Your Options</h3>
                    
                    {hasCCUSProjects ? (
                      // When CCUS projects are available - show three options in two rows
                      <div className="space-y-6 md:space-y-8">
                        {/* First Row: Global Projects and CCUS Projects */}
                        <div className="flex flex-col lg:flex-row justify-center items-center gap-8 md:gap-16">
                          {/* Global Projects */}
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                              <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-teal-600" />
                            </div>
                            <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 text-center">Global Projects</h4>
                            <Button
                              size="lg"
                              className="w-56 md:w-64 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3"
                              onClick={() => {
                                const typeToPass =
                                  typeof state.type === "string" && state.type.trim()
                                    ? state.type
                                    : typeof state.subcategory === "string" &&
                                      state.subcategory.trim()
                                    ? state.subcategory
                                    : null;
                                if (!typeToPass) {
                                  alert("Type is missing. Cannot filter projects without a type.");
                                  return;
                                }
                                navigate("/filtered-projects", {
                                  state: {
                                    country: state.country,
                                    areaOfInterest: state.areaOfInterest,
                                    type: typeToPass,
                                    goal: state.goal,
                                  },
                                });
                              }}
                            >
                              View Global Projects
                            </Button>
                          </div>
                          
                                                     {/* Divider */}
                           <div className="hidden lg:block h-32 w-px bg-gradient-to-b from-gray-200 to-gray-300 mx-8" />
                           
                           {/* CCUS Projects */}
                           <div className="flex flex-col items-center gap-3">
                             <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                               <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-teal-600" />
                             </div>
                             <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 text-center">CCUS Projects</h4>
                             <Button
                               size="lg"
                               className="w-56 md:w-64 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3"
                              onClick={() => {
                                const typeToPass =
                                  typeof state.type === "string" && state.type.trim()
                                    ? state.type
                                    : typeof state.subcategory === "string" &&
                                      state.subcategory.trim()
                                    ? state.subcategory
                                    : null;
                                if (!typeToPass) {
                                  alert("Type is missing. Cannot filter projects without a type.");
                                  return;
                                }
                                navigate("/filtered-ccus-projects", {
                                  state: {
                                    country: state.country,
                                    areaOfInterest: state.areaOfInterest,
                                    type: typeToPass,
                                    goal: state.goal,
                                  },
                                });
                              }}
                            >
                              View CCUS Projects
                            </Button>
                          </div>
                        </div>
                        
                                                 {/* Second Row: Methodologies */}
                         <div className="flex flex-row justify-center items-center">
                           <div className="flex flex-col items-center gap-3">
                             <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                               <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-teal-600" />
                             </div>
                             <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 text-center">Methodologies</h4>
                             <Button
                               size="lg"
                               className="w-56 md:w-64 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3"
                              onClick={() => navigate("/filtered-methodologies", { state })}
                            >
                              View Methodologies
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                                             // When CCUS projects are NOT available - show Global Projects and Methodologies side by side
                       <div className="flex flex-col lg:flex-row justify-center items-center gap-8 md:gap-16">
                         {/* Global Projects */}
                         <div className="flex flex-col items-center gap-3">
                           <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                             <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-teal-600" />
                           </div>
                           <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 text-center">Global Projects</h4>
                           <Button
                             size="lg"
                             className="w-56 md:w-64 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3"
                            onClick={() => {
                              const typeToPass =
                                typeof state.type === "string" && state.type.trim()
                                  ? state.type
                                  : typeof state.subcategory === "string" &&
                                    state.subcategory.trim()
                                  ? state.subcategory
                                  : null;
                              if (!typeToPass) {
                                alert("Type is missing. Cannot filter projects without a type.");
                                return;
                              }
                              navigate("/filtered-projects", {
                                state: {
                                  country: state.country,
                                  areaOfInterest: state.areaOfInterest,
                                  type: typeToPass,
                                  goal: state.goal,
                                },
                              });
                            }}
                          >
                            View Global Projects
                          </Button>
                        </div>
                        
                                                 {/* Divider */}
                         <div className="hidden lg:block h-32 w-px bg-gradient-to-b from-gray-200 to-gray-300 mx-8" />
                         
                         {/* Methodologies */}
                         <div className="flex flex-col items-center gap-3">
                           <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                             <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-teal-600" />
                           </div>
                           <h4 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 text-center">Methodologies</h4>
                           <Button
                             size="lg"
                             className="w-56 md:w-64 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3"
                            onClick={() => navigate("/filtered-methodologies", { state })}
                          >
                            View Methodologies
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

                 {/* Finance section: right side (1/3) */}
         <div className="w-full lg:w-1/3 flex flex-col justify-between py-8 md:py-16 px-4 md:px-8 bg-gradient-to-b from-white/60 to-teal-50 border-t lg:border-l border-teal-200 min-h-screen order-last">
           <div>
             <h3 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-teal-700 flex items-center gap-2">
               <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-teal-600" />
               Finance
             </h3>
             <p className="text-base md:text-lg text-gray-700 mb-6 md:mb-8 leading-relaxed">
               Explore financial opportunities and investment strategies for carbon credit projects. 
               Our platform provides comprehensive analysis of market trends, pricing models, and 
               risk assessment to help you make informed investment decisions.
             </p>
             <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200 mb-6">
               <h4 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Key Financial Insights</h4>
               <ul className="space-y-2 text-sm md:text-base text-gray-600">
                 <li className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                   Market price analysis and trends
                 </li>
                 <li className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                   Risk assessment and mitigation strategies
                 </li>
                 <li className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                   Investment portfolio optimization
                 </li>
                 <li className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                   Regulatory compliance guidance
                 </li>
               </ul>
             </div>
           </div>
           <Button
             size="lg"
             className="w-full mt-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3"
             onClick={() => navigate("/project-wizard")}
           >
             Explore Financial Options
           </Button>
         </div>
      </div>
    </>
  );
};

export default FilteredProjectsLanding;

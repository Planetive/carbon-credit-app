import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Building2, Target, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import ReactCountryFlag from "react-country-flag";

// Helper to normalize country names (same as in ExploreCCUSPolicies)
function normalizeCountryName(name: string) {
  if (!name) return "";
  const map: Record<string, string> = {
    "UK": "United Kingdom",
    "United Kingdom": "United Kingdom",
    "EU": "European Union",
    "European Union": "European Union",
    "UAE": "UAE",
    "United Arab Emirates": "UAE",
    "Saudi Arabia": "Saudi Arabia",
    "Norway": "Norway",
    "Nigeria": "Nigeria",
    "Netherlands": "Netherlands",
    "Japan": "Japan",
    "China": "China",
    "Canada": "Canada",
    "Australia": "Australia",
    "South Africa": "South Africa",
    "United States": "United States",
    "USA": "United States",
    "US": "United States",
  };
  return map[name.trim()] || name.trim();
}

// Helper to get country code
function getCountryCode(country: string) {
  const countryCodeMap: Record<string, string> = {
    "United Kingdom": "GB", "UK": "GB",
    "European Union": "EU", "EU": "EU",
    "UAE": "AE", "United Arab Emirates": "AE",
    "Saudi Arabia": "SA", "Norway": "NO", "Nigeria": "NG",
    "Netherlands": "NL", "Japan": "JP", "China": "CN",
    "Canada": "CA", "Australia": "AU", "South Africa": "ZA",
    "United States": "US", "USA": "US", "US": "US",
  };
  return countryCodeMap[country] || null;
}

// Helper to render text as a list if it contains bullet points or newlines
function renderTextAsListOrParagraph(text: string | null) {
  if (!text) return <span className="text-gray-500">N/A</span>;
  
  // Split by double newlines to separate sections
  const sections = text.split(/\n\s*\n/).filter(section => section.trim().length > 0);
  
  return (
    <div className="space-y-4 text-gray-700">
      {sections.map((section, sectionIdx) => {
        const trimmedSection = section.trim();
        
        // Check if section starts with a letter followed by a period (a., b., c., etc.)
        const isSectionHeader = /^[a-z]\.\s/.test(trimmedSection);
        
        if (isSectionHeader) {
          // Split section header from content
          const lines = trimmedSection.split('\n');
          const header = lines[0];
          const content = lines.slice(1).join('\n').trim();
          
          return (
            <div key={sectionIdx} className="space-y-2">
              <p className="font-semibold text-gray-900 leading-relaxed">{header}</p>
              {content && content.includes('•') ? (
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  {content
                    .split('•')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map((line, idx) => (
                      <li key={idx} className="leading-relaxed">{line}</li>
                    ))}
                </ul>
              ) : (
                <p className="text-gray-700 leading-relaxed pl-4">{content}</p>
              )}
            </div>
          );
        }
        
        // If section contains bullet points, render as list
        if (trimmedSection.includes('•')) {
          const lines = trimmedSection
            .split('•')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          return (
            <ul key={sectionIdx} className="list-disc pl-6 space-y-2 text-gray-700">
              {lines.map((line, idx) => (
                <li key={idx} className="leading-relaxed">{line}</li>
              ))}
            </ul>
          );
        }
        
        // Otherwise render as paragraph
        return (
          <p key={sectionIdx} className="text-gray-700 leading-relaxed">
            {trimmedSection}
          </p>
        );
      })}
    </div>
  );
}

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  "Active": { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
  "Draft": { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock },
  "Inactive": { bg: "bg-gray-100", text: "text-gray-800", icon: AlertCircle },
  "Planned": { bg: "bg-blue-100", text: "text-blue-800", icon: Target },
};

const CCUSManagementStrategy = () => {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const [strategy, setStrategy] = useState<Database["public"]["Tables"]["ccus_management_strategies"]["Row"] | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const norm = normalizeCountryName(country || "");
      
      const [{ data: policiesData, error: policiesError }, { data: strategiesData, error: strategiesError }] = await Promise.all([
        supabase.from("ccus_policies").select("*"),
        supabase.from("ccus_management_strategies").select("*")
      ]);

      if (!policiesError && policiesData) {
        const countryPolicies = policiesData.filter((p: any) => normalizeCountryName(p["Country"]) === norm);
        setPolicies(countryPolicies);
      }

      if (!strategiesError && strategiesData) {
        const found = strategiesData.find((s: any) => normalizeCountryName(s.country) === norm);
        setStrategy(found || null);
      }

      setLoading(false);
    };
    fetchData();
  }, [country]);

  const displayCountry = country ? normalizeCountryName(country) : "";
  const countryCode = getCountryCode(displayCountry);

  if (loading) {
    return <LoadingScreen message={`Loading CCUS Policies for ${displayCountry}`} subMessage="Fetching regulatory landscapes and policies..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-4 mb-2">
            {countryCode && (
              <div className="w-16 h-16 rounded-lg bg-white shadow-md flex items-center justify-center border border-teal-200">
                <ReactCountryFlag countryCode={countryCode} svg style={{ width: '48px', height: '48px' }} />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-1">
                {displayCountry}
              </h1>
              <p className="text-gray-600 text-lg">CCUS Policies & Regulatory Landscapes</p>
            </div>
          </div>
        </div>

        {policies.length === 0 && !strategy ? (
          <Card className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-lg">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Data Available</h3>
              <p className="text-gray-500">No CCUS policies or regulatory landscapes found for this country.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Basic Policies Section */}
            {policies.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-6 h-6 text-teal-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Basic CCUS Policies</h2>
                  <Badge variant="outline" className="ml-2">{policies.length}</Badge>
                </div>
                <div className="space-y-4">
                  {policies.map((policy, idx) => {
                    const statusInfo = statusColors[policy["Status"]] || statusColors["Inactive"];
                    const StatusIcon = statusInfo.icon;
                    return (
                      <Card
                        key={policy.id || idx}
                        className="bg-white/90 backdrop-blur-sm border-teal-200/50 shadow-md hover:shadow-lg transition-shadow duration-300"
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <CardTitle className="text-xl font-semibold text-gray-900">
                              {policy["Key Policies"]}
                            </CardTitle>
                            <Badge className={`${statusInfo.bg} ${statusInfo.text} border-0 flex items-center gap-1.5`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {policy["Status"]}
                            </Badge>
                          </div>
                          {policy["created_at"] && (
                            <CardDescription className="flex items-center gap-1.5 mt-2">
                              <Calendar className="w-4 h-4" />
                              Added: {new Date(policy["created_at"]).toLocaleDateString()}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {policy["Mechanism"] && (
                            <div>
                              <span className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-teal-600" />
                                Mechanism
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {policy["Mechanism"].split(",").map((mech: string, i: number) => (
                                  <span key={i} className="inline-block bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 text-sm font-medium rounded">
                                    {mech.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {policy["Focus Areas"] && (
                            <div>
                              <span className="font-semibold text-gray-700 text-sm flex items-center gap-2 mb-2">
                                <Target className="w-4 h-4 text-emerald-600" />
                                Focus Areas
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {policy["Focus Areas"].split(",").map((fa: string, i: number) => (
                                  <span key={i} className="inline-block bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 text-sm font-medium rounded">
                                    {fa.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Management Strategy Section */}
            {strategy && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Regulatory Landscapes</h2>
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-emerald-600" />
                      Current Regulatory Landscapes
                    </h3>
                    <Card className="bg-white/90 backdrop-blur-sm border-emerald-200/50 shadow-md">
                      <CardContent className="p-6">
                        <div className="prose max-w-none">
                          {renderTextAsListOrParagraph(strategy.current_management_strategy)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-cyan-600" />
                      Deployment Policies & Programs
                    </h3>
                    <Card className="bg-white/90 backdrop-blur-sm border-cyan-200/50 shadow-md">
                      <CardContent className="p-6">
                        <div className="prose max-w-none">
                          {renderTextAsListOrParagraph(strategy.deployment_policies_and_programs)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5 text-lime-600" />
                      Priorities Going Forward
                    </h3>
                    <Card className="bg-white/90 backdrop-blur-sm border-lime-200/50 shadow-md">
                      <CardContent className="p-6">
                        <div className="prose max-w-none">
                          {renderTextAsListOrParagraph(strategy.priorities_going_forward)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {strategy.created_at && (
                    <div className="text-sm text-gray-500 text-right flex items-center justify-end gap-1.5">
                      <Calendar className="w-4 h-4" />
                      Added: {new Date(strategy.created_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CCUSManagementStrategy;

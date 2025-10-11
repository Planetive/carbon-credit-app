import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  };
  return map[name.trim()] || name.trim();
}

// Helper to render text as a list if it contains bullet points or newlines
function renderTextAsListOrParagraph(text: string | null) {
  if (!text) return <span className="text-gray-500">N/A</span>;
  // Only split into bullets if the text contains the '•' character
  if (text.includes('•')) {
    const lines = text
      .split('•')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    return (
      <ul className="list-disc pl-6 space-y-1">
        {lines.map((line, idx) => <li key={idx}>{line}</li>)}
      </ul>
    );
  }
  // Otherwise, render as a paragraph
  return <span>{text}</span>;
}

const statusColors: Record<string, string> = {
  "Active": "bg-green-400",
  "Draft": "bg-yellow-400",
  "Inactive": "bg-gray-400",
  "Planned": "bg-blue-400",
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
      
      // Fetch both policies and strategies
      const [{ data: policiesData, error: policiesError }, { data: strategiesData, error: strategiesError }] = await Promise.all([
        supabase.from("ccus_policies").select("*"),
        supabase.from("ccus_management_strategies").select("*")
      ]);

      if (!policiesError && policiesData) {
        // Filter policies for this country
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-green-100 flex flex-col relative">
      <div className="flex justify-center items-start w-full pt-12 pb-24">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-center text-primary mb-2 tracking-tight">
              {country ? normalizeCountryName(country) : ""} <span className="text-gray-700">- CCUS Policies & Regulatory Landscapes</span>
            </h1>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-green-400 mx-auto rounded mb-6" />
          </div>
          
          {loading ? (
            <div className="text-center text-lg text-gray-500 py-16">Loading...</div>
          ) : (
            <div className="space-y-10">
              {/* Basic Policies Section */}
              {policies.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Basic CCUS Policies</h2>
                  <div className="grid gap-6">
                    {policies.map((policy, idx) => (
                      <Card key={policy.id || idx} className="bg-gray-50 border border-gray-200">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-gray-700 mb-2">{policy["Key Policies"]}</CardTitle>
                          <CardDescription className="text-sm text-gray-500 mb-2">
                            {policy["created_at"] ? `Added: ${new Date(policy["created_at"]).toLocaleDateString()}` : null}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="mb-2 flex flex-wrap items-center">
                            <span className="font-semibold text-gray-700 mr-2">Mechanism:</span>
                            {policy["Mechanism"] && policy["Mechanism"].split(",").map((mech: string) => (
                              <Badge key={mech} className="bg-indigo-50 text-indigo-700 font-medium mr-1 mb-1 px-2 py-1 rounded-md shadow-none">
                                {mech.trim()}
                              </Badge>
                            ))}
                          </div>
                          <div className="mb-2 flex flex-wrap items-center">
                            <span className="font-semibold text-gray-700 mr-2">Focus Areas:</span>
                            {policy["Focus Areas"] && policy["Focus Areas"].split(",").map((fa: string) => (
                              <Badge key={fa} className="bg-green-50 text-green-700 font-medium mr-1 mb-1 px-2 py-1 rounded-md shadow-none">
                                {fa.trim()}
                              </Badge>
                            ))}
                          </div>
                          <div className="mb-2 flex items-center">
                            <span className="font-semibold text-gray-700 mr-2">Status:</span>
                            <Badge className={statusColors[policy["Status"]] + " text-white font-semibold px-2 py-1 rounded-md shadow-none"}>
                              {policy["Status"]}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Management Strategy Section */}
              {strategy && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Regulatory Landscapes</h2>
                  <div className="space-y-6">
                    <div>
                      <span className="font-semibold text-gray-800 block mb-2 text-xl">Current Regulatory Landscapes</span>
                      <div className="bg-gray-50 rounded-lg p-5 text-gray-900 shadow-inner">
                        {renderTextAsListOrParagraph(strategy.current_management_strategy)}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800 block mb-2 text-xl">Deployment Policies & Programs</span>
                      <div className="bg-gray-50 rounded-lg p-5 text-gray-900 shadow-inner">
                        {renderTextAsListOrParagraph(strategy.deployment_policies_and_programs)}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800 block mb-2 text-xl">Priorities Going Forward</span>
                      <div className="bg-gray-50 rounded-lg p-5 text-gray-900 shadow-inner">
                        {renderTextAsListOrParagraph(strategy.priorities_going_forward)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-2 text-right">
                      Added: {strategy.created_at ? new Date(strategy.created_at).toLocaleDateString() : "N/A"}
                    </div>
                  </div>
                </div>
              )}

              {/* No data message */}
              {policies.length === 0 && !strategy && (
                <div className="text-center text-red-500 text-lg py-16">
                  No CCUS policies or regulatory landscapes found for this country.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Back Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button variant="default" size="lg" className="shadow-lg px-8 py-3 text-lg font-semibold" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>
    </div>
  );
};

export default CCUSManagementStrategy; 
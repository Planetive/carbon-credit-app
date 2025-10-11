import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Building2, MapPin, Users, Calculator, CheckCircle, AlertCircle, Save } from "lucide-react";

const EmissionHistory: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Company basic info state
  const [companyInfo, setCompanyInfo] = useState({
    companyName: "",
    sector: "",
    location: "",
    governanceStructure: ""
  });

  // Emissions data state
  const [isMeasuringEmissions, setIsMeasuringEmissions] = useState<string>("");
  const [areEmissionsVerified, setAreEmissionsVerified] = useState<string>("");
  const [emissionsData, setEmissionsData] = useState({
    scope1: "",
    scope2: "",
    scope3: ""
  });
  const [wantsToUseCalculator, setWantsToUseCalculator] = useState<string>("");
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigatingToCalculator, setIsNavigatingToCalculator] = useState(false);
  const [existingAssessment, setExistingAssessment] = useState<EmissionHistoryAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Type definition for emission history assessment
  interface EmissionHistoryAssessment {
    id: string;
    user_id: string;
    company_name: string;
    sector: string;
    location: string;
    governance_structure: string;
    is_measuring_emissions: boolean;
    are_emissions_verified: boolean | null;
    scope1_emissions: number | null;
    scope2_emissions: number | null;
    scope3_emissions: number | null;
    wants_to_use_calculator: boolean | null;
    status: string;
    created_at: string;
    updated_at: string;
  }

  const handleCompanyInfoChange = (field: string, value: string) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
  };

  const handleEmissionsDataChange = (field: string, value: string) => {
    setEmissionsData(prev => ({ ...prev, [field]: value }));
  };

  const handleNavigateToCalculator = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please log in to save your progress",
        variant: "destructive"
      });
      return;
    }

    setIsNavigatingToCalculator(true);

    // Save current form data as draft before navigating
    try {
      const payload = {
        user_id: user.id,
        company_name: companyInfo.companyName,
        sector: companyInfo.sector,
        location: companyInfo.location,
        governance_structure: companyInfo.governanceStructure,
        is_measuring_emissions: isMeasuringEmissions === "yes",
        are_emissions_verified: isMeasuringEmissions === "yes" ? (areEmissionsVerified === "yes") : null,
        scope1_emissions: isMeasuringEmissions === "yes" && emissionsData.scope1 ? parseFloat(emissionsData.scope1) : null,
        scope2_emissions: isMeasuringEmissions === "yes" && emissionsData.scope2 ? parseFloat(emissionsData.scope2) : null,
        scope3_emissions: isMeasuringEmissions === "yes" && emissionsData.scope3 ? parseFloat(emissionsData.scope3) : null,
        wants_to_use_calculator: isMeasuringEmissions === "no" ? (wantsToUseCalculator === "yes") : null,
        status: 'draft'
      };

      if (existingAssessment) {
        await (supabase as any)
          .from('emission_history_assessments')
          .update(payload)
          .eq('id', existingAssessment.id);
      } else {
        await (supabase as any)
          .from('emission_history_assessments')
          .insert(payload);
      }

      toast({
        title: "Progress Saved",
        description: "Your assessment has been saved as draft",
      });

      // Navigate to calculator
      navigate("/emission-calculator");
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsNavigatingToCalculator(false);
    }
  };

  // Load existing assessment
  useEffect(() => {
    const loadExistingAssessment = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from('emission_history_assessments')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const assessment = data as EmissionHistoryAssessment;
          setExistingAssessment(assessment);
          setCompanyInfo({
            companyName: assessment.company_name || "",
            sector: assessment.sector || "",
            location: assessment.location || "",
            governanceStructure: assessment.governance_structure || ""
          });
          setIsMeasuringEmissions(assessment.is_measuring_emissions ? "yes" : "no");
          setAreEmissionsVerified(assessment.are_emissions_verified ? "yes" : "no");
          setEmissionsData({
            scope1: assessment.scope1_emissions?.toString() || "",
            scope2: assessment.scope2_emissions?.toString() || "",
            scope3: assessment.scope3_emissions?.toString() || ""
          });
          setWantsToUseCalculator(assessment.wants_to_use_calculator ? "yes" : "no");
        }
      } catch (error: any) {
        console.error('Error loading assessment:', error);
        toast({
          title: "Error",
          description: "Failed to load existing assessment",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingAssessment();
  }, [user, toast]);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please log in to submit the assessment",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user.id,
        company_name: companyInfo.companyName,
        sector: companyInfo.sector,
        location: companyInfo.location,
        governance_structure: companyInfo.governanceStructure,
        is_measuring_emissions: isMeasuringEmissions === "yes",
        are_emissions_verified: isMeasuringEmissions === "yes" ? (areEmissionsVerified === "yes") : null,
        scope1_emissions: isMeasuringEmissions === "yes" && emissionsData.scope1 ? parseFloat(emissionsData.scope1) : null,
        scope2_emissions: isMeasuringEmissions === "yes" && emissionsData.scope2 ? parseFloat(emissionsData.scope2) : null,
        scope3_emissions: isMeasuringEmissions === "yes" && emissionsData.scope3 ? parseFloat(emissionsData.scope3) : null,
        wants_to_use_calculator: isMeasuringEmissions === "no" ? (wantsToUseCalculator === "yes") : null,
        status: 'submitted'
      };

      if (existingAssessment) {
        const { error } = await (supabase as any)
          .from('emission_history_assessments')
          .update(payload)
          .eq('id', existingAssessment.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('emission_history_assessments')
          .insert(payload);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Assessment submitted successfully!",
      });

      // Navigate to dashboard or results page
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit assessment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompanyInfoComplete = companyInfo.companyName && companyInfo.sector && companyInfo.location && companyInfo.governanceStructure;
  const isEmissionsSectionComplete = isMeasuringEmissions && 
    (isMeasuringEmissions === "no" ? wantsToUseCalculator : (areEmissionsVerified && (emissionsData.scope1 || emissionsData.scope2 || emissionsData.scope3)));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-teal-600 rounded-full mb-6">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Emission History Assessment</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Help us understand your organization's current emission tracking and measurement practices
          </p>
          
          {/* Progress Indicator */}
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-700">
                {isCompanyInfoComplete ? 1 : 0} / 2 sections
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-600 to-teal-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(isCompanyInfoComplete ? 50 : 0) + (isEmissionsSectionComplete ? 50 : 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Company Basic Information Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              Company Basic Information
              {isCompanyInfoComplete && (
                <CheckCircle className="h-5 w-5 text-green-300 ml-auto" />
              )}
            </CardTitle>
            <p className="text-blue-100 mt-2">Tell us about your organization</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyInfo.companyName}
                  onChange={(e) => handleCompanyInfoChange("companyName", e.target.value)}
                  placeholder="Enter your company name"
                />
              </div>
              
              <div>
                <Label htmlFor="sector">Sector of Work *</Label>
                <Select value={companyInfo.sector} onValueChange={(value) => handleCompanyInfoChange("sector", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your sector" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="energy">Energy & Utilities</SelectItem>
                    <SelectItem value="transportation">Transportation & Logistics</SelectItem>
                    <SelectItem value="construction">Construction & Real Estate</SelectItem>
                    <SelectItem value="agriculture">Agriculture & Food</SelectItem>
                    <SelectItem value="healthcare">Healthcare & Pharmaceuticals</SelectItem>
                    <SelectItem value="finance">Finance & Banking</SelectItem>
                    <SelectItem value="retail">Retail & E-commerce</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="government">Government & Public Sector</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">Location (Country) *</Label>
                <Select value={companyInfo.location} onValueChange={(value) => handleCompanyInfoChange("location", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uae">United Arab Emirates</SelectItem>
                    <SelectItem value="pakistan">Pakistan</SelectItem>
                    <SelectItem value="saudi-arabia">Saudi Arabia</SelectItem>
                    <SelectItem value="qatar">Qatar</SelectItem>
                    <SelectItem value="kuwait">Kuwait</SelectItem>
                    <SelectItem value="bahrain">Bahrain</SelectItem>
                    <SelectItem value="oman">Oman</SelectItem>
                    <SelectItem value="india">India</SelectItem>
                    <SelectItem value="china">China</SelectItem>
                    <SelectItem value="usa">United States</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="germany">Germany</SelectItem>
                    <SelectItem value="france">France</SelectItem>
                    <SelectItem value="japan">Japan</SelectItem>
                    <SelectItem value="canada">Canada</SelectItem>
                    <SelectItem value="australia">Australia</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="governance">Governance Structure *</Label>
                <Select value={companyInfo.governanceStructure} onValueChange={(value) => handleCompanyInfoChange("governanceStructure", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select governance structure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public-listed">Public Listed Company</SelectItem>
                    <SelectItem value="private-limited">Private Limited Company</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="non-profit">Non-Profit Organization</SelectItem>
                    <SelectItem value="government-entity">Government Entity</SelectItem>
                    <SelectItem value="cooperative">Cooperative</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emissions Data Section */}
        <Card className="mb-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calculator className="h-6 w-6" />
              </div>
              Emissions Data Assessment
              {isEmissionsSectionComplete && (
                <CheckCircle className="h-5 w-5 text-green-300 ml-auto" />
              )}
            </CardTitle>
            <p className="text-green-100 mt-2">Assess your current emission tracking practices</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question 1: Is your company measuring emissions? */}
            <div>
              <Label className="text-base font-medium mb-4 block">
                Is your company currently measuring Scope 1, 2, and 3 emissions?
              </Label>
              <RadioGroup value={isMeasuringEmissions} onValueChange={setIsMeasuringEmissions}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="measuring-yes" />
                  <Label htmlFor="measuring-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="measuring-no" />
                  <Label htmlFor="measuring-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Conditional questions based on answer */}
            {isMeasuringEmissions === "yes" && (
              <div className="space-y-6 pl-6 border-l-4 border-green-400 bg-green-50 p-6 rounded-r-lg">
                {/* Question 2: Are emissions verified? */}
                <div>
                  <Label className="text-base font-medium mb-4 block">
                    Are your emissions data verified by a third party?
                  </Label>
                  <RadioGroup value={areEmissionsVerified} onValueChange={setAreEmissionsVerified}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="verified-yes" />
                      <Label htmlFor="verified-yes">Yes</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="verified-no" />
                      <Label htmlFor="verified-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Question 3: Input emissions data */}
                <div>
                  <Label className="text-base font-medium mb-4 block">
                    Please provide your current emissions data (in tonnes CO2e):
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="scope1">Scope 1 Emissions</Label>
                      <Input
                        id="scope1"
                        type="number"
                        step="any"
                        value={emissionsData.scope1}
                        onChange={(e) => handleEmissionsDataChange("scope1", e.target.value)}
                        placeholder="Enter tonnes CO2e"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scope2">Scope 2 Emissions</Label>
                      <Input
                        id="scope2"
                        type="number"
                        step="any"
                        value={emissionsData.scope2}
                        onChange={(e) => handleEmissionsDataChange("scope2", e.target.value)}
                        placeholder="Enter tonnes CO2e"
                      />
                    </div>
                    <div>
                      <Label htmlFor="scope3">Scope 3 Emissions</Label>
                      <Input
                        id="scope3"
                        type="number"
                        step="any"
                        value={emissionsData.scope3}
                        onChange={(e) => handleEmissionsDataChange("scope3", e.target.value)}
                        placeholder="Enter tonnes CO2e"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isMeasuringEmissions === "no" && (
              <div className="space-y-6 pl-6 border-l-4 border-orange-400 bg-orange-50 p-6 rounded-r-lg">
                <div>
                  <Label className="text-base font-medium mb-4 block">
                    Would you like to use our emission calculator to measure your emissions?
                  </Label>
                  <RadioGroup value={wantsToUseCalculator} onValueChange={setWantsToUseCalculator}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="calculator-yes" />
                      <Label htmlFor="calculator-yes">Yes, I'd like to use the calculator</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="calculator-no" />
                      <Label htmlFor="calculator-no">No, not at this time</Label>
                    </div>
                  </RadioGroup>
                </div>

                {wantsToUseCalculator === "yes" && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calculator className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900 mb-2">Ready to Calculate Your Emissions?</h4>
                        <p className="text-blue-800 mb-4">
                          Our comprehensive emission calculator will help you measure your organization's carbon footprint across all three scopes with industry-standard methodologies.
                        </p>
                        <Button 
                          onClick={handleNavigateToCalculator}
                          disabled={isNavigatingToCalculator}
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isNavigatingToCalculator ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving & Navigating...
                            </>
                          ) : (
                            <>
                              <Calculator className="h-4 w-4 mr-2" />
                              Go to Emission Calculator
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Section */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Submit?</h3>
                <p className="text-gray-600">Review your information and submit your emission history assessment</p>
              </div>
              
              <Button 
                size="lg" 
                disabled={!isCompanyInfoComplete || !isEmissionsSectionComplete || isSubmitting}
                onClick={handleSubmit}
                className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-12 py-4 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Submit Assessment
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
              
              {(!isCompanyInfoComplete || !isEmissionsSectionComplete) && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      Please complete all required fields to submit the assessment
                    </p>
                  </div>
                </div>
              )}
              
              {existingAssessment && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      You have a previous assessment. This will update your existing data.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmissionHistory;

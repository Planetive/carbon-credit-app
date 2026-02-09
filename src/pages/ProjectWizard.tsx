import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  MapPin, 
  Settings, 
  DollarSign, 
  Leaf, 
  AlertTriangle,
  Calendar,
  CheckCircle,
  Bot,
  LogOut,
  Home,
  BarChart3,
  Compass,
  User
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { methodologyMatcher } from "@/lib/methodologyMatcher";
import { getNames } from 'country-list';
import { useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

const steps = [
  { number: 1, title: "Project Details", icon: FileText },
  { number: 2, title: "Location & Geography", icon: MapPin },
  { number: 3, title: "Technology & Methodology", icon: Settings },
  { number: 4, title: "Financial Parameters", icon: DollarSign },
  { number: 5, title: "Environmental Impact", icon: Leaf },
  { number: 6, title: "Risk Assessment", icon: AlertTriangle },
  { number: 7, title: "Timeline & Milestones", icon: Calendar }
];

const ProjectWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activePart, setActivePart] = useState<'user' | 'project'>('user');
  const [areasOfInterest, setAreasOfInterest] = useState<string[]>([]);
  const [loadingAreasOfInterest, setLoadingAreasOfInterest] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    async function fetchAreasOfInterest() {
      setLoadingAreasOfInterest(true);
      let allRows: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let keepFetching = true;
      try {
        while (keepFetching) {
          const { data, error } = await supabase.from('global_projects_2025' as any).select('"Area of interest"').range(from, from + batchSize - 1);
          if (error) {
            console.error('Error fetching areas of interest:', error);
            toast({
              title: 'Error loading areas of interest',
              description: error.message || 'Failed to load areas of interest. Please check your connection.',
              variant: 'destructive',
            });
            break;
          }
          if (data && data.length > 0) {
            allRows = allRows.concat(data);
            if (data.length < batchSize) {
              keepFetching = false;
            } else {
              from += batchSize;
            }
          } else {
            keepFetching = false;
          }
        }
        const uniqueAreas = Array.from(new Set(allRows.map((d: any) => (d["Area of interest"] || '').trim()).filter(Boolean)));
        console.log('Fetched areas of interest:', uniqueAreas.length, 'items');
        setAreasOfInterest(uniqueAreas);
      } catch (err: any) {
        console.error('Unexpected error fetching areas of interest:', err);
        toast({
          title: 'Error loading areas of interest',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setLoadingAreasOfInterest(false);
      }
    }
    fetchAreasOfInterest();
  }, [toast]);
  const countryOptions = getNames();
  const [formData, setFormData] = useState({
    currentIndustry: '',
    industrySize: '',
    hasEmissionsKnowledge: '',
    ghgTypes: '',
    ghgSources: '',
    ghgAnnual: '',
    wasteVolume: '',
    wastePollutants: '',
    wasteTreatment: '',
    wasteDestination: '',
    otherType: '',
    otherVolume: '',
    otherDisposal: '',
    projectName: '',
    country: '',
    areaOfInterest: '',
    type: '',
    goal: '',
    registerForCredits: '',
    developmentStrategy: '',
    additionalInfo: '',
  });

  const [goals, setGoals] = useState<string[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  useEffect(() => {
    async function fetchGoals() {
      setLoadingGoals(true);
      let allRows: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let keepFetching = true;
      try {
        while (keepFetching) {
          const { data, error } = await supabase.from('global_projects_2025' as any).select('"End Goal"').range(from, from + batchSize - 1);
          if (error) {
            console.error('Error fetching goals:', error);
            toast({
              title: 'Error loading goals',
              description: error.message || 'Failed to load goals. Please check your connection.',
              variant: 'destructive',
            });
            break;
          }
          if (data && data.length > 0) {
            allRows = allRows.concat(data);
            if (data.length < batchSize) {
              keepFetching = false;
            } else {
              from += batchSize;
            }
          } else {
            keepFetching = false;
          }
        }
        const uniqueGoals = Array.from(new Set(allRows.map((d: any) => (d["End Goal"] || '').trim()).filter(Boolean)));
        console.log('Fetched goals:', uniqueGoals.length, 'items');
        setGoals(uniqueGoals);
      } catch (err: any) {
        console.error('Unexpected error fetching goals:', err);
        toast({
          title: 'Error loading goals',
          description: err.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      } finally {
        setLoadingGoals(false);
      }
    }
    fetchGoals();
  }, [toast]);
  const [types, setTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [filteredTypes, setFilteredTypes] = useState<string[]>([]);

  // Function to fetch types based on selected area of interest
  const fetchTypesByAreaOfInterest = async (areaOfInterest: string) => {
    if (!areaOfInterest) {
      setFilteredTypes([]);
      return;
    }

      setLoadingTypes(true);
      let allRows: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let keepFetching = true;

      while (keepFetching) {
      const { data, error } = await supabase
        .from("global_projects_2025" as any)
        .select('"Type"')
        .eq('"Area of interest"', areaOfInterest)
        .range(from, from + batchSize - 1);
      
        if (error) break;
        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          if (data.length < batchSize) {
            keepFetching = false;
          } else {
            from += batchSize;
          }
        } else {
          keepFetching = false;
        }
      }

      const uniqueTypes = Array.from(new Set(allRows.map((d: any) => (d["Type"] || '').trim()).filter(Boolean)));
    setFilteredTypes(uniqueTypes);
      setLoadingTypes(false);
  };

  // Effect to fetch types when area of interest changes
  useEffect(() => {
    if (formData.areaOfInterest) {
      fetchTypesByAreaOfInterest(formData.areaOfInterest);
      // Reset type selection when area of interest changes
      setFormData(prev => ({ ...prev, type: '' }));
    } else {
      setFilteredTypes([]);
    }
  }, [formData.areaOfInterest]);
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    // Validate only main required fields
    const requiredFields = [
      formData.currentIndustry,
      formData.industrySize,
      formData.hasEmissionsKnowledge,
      formData.projectName,
      formData.country,
      formData.areaOfInterest,
      formData.type, // Changed from subcategory to type
      formData.goal,
      formData.registerForCredits,
      formData.developmentStrategy,
    ];
    if (requiredFields.some(f => !f || (typeof f === 'string' && f.trim() === ''))) {
      toast({
        title: 'Please fill in all required fields.',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase
      .from("project_inputs" as any)
      .insert([{
        user_id: user.id,
        current_industry: formData.currentIndustry,
        industry_size: formData.industrySize,
        has_emissions_knowledge: formData.hasEmissionsKnowledge,
        ghg_types: formData.ghgTypes,
        ghg_sources: formData.ghgSources,
        ghg_annual: formData.ghgAnnual && !isNaN(Number(formData.ghgAnnual)) ? Number(formData.ghgAnnual) : null,
        waste_volume: formData.wasteVolume && !isNaN(Number(formData.wasteVolume)) ? Number(formData.wasteVolume) : null,
        waste_pollutants: formData.wastePollutants,
        waste_treatment: formData.wasteTreatment,
        waste_destination: formData.wasteDestination,
        other_type: formData.otherType,
        other_volume: formData.otherVolume && !isNaN(Number(formData.otherVolume)) ? Number(formData.otherVolume) : null,
        other_disposal: formData.otherDisposal,
        project_name: formData.projectName,
        country: formData.country,
        area_of_interest: formData.areaOfInterest,
        type: formData.type,
        goal: formData.goal,
        register_for_credits: formData.registerForCredits === "yes",
        development_strategy: formData.developmentStrategy,
        additional_info: formData.additionalInfo,
      }]);
    if (error) {
      toast({
        title: 'Error submitting project.',
        description: error.message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    } else {
      toast({
        title: 'Project submitted successfully!',
        description: 'Project submitted successfully!',
      });
      // Simulate AI thinking and then navigate
      setTimeout(() => {
        navigate('/filtered-projects-landing', {
          state: {
            country: formData.country,
            areaOfInterest: formData.areaOfInterest,
            type: formData.type,
            goal: formData.goal,
          },
        });
      }, 3000); // 3 seconds
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI is Thinking...</h3>
              <p className="text-gray-600">Analyzing your project details and generating personalized recommendations.</p>
            </div>
            
            <div className="flex items-center justify-center mb-6">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Processing your carbon reduction strategy...</p>
              <p className="mt-1">This will take just a moment.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="flex-1 flex items-center justify-center py-6 sm:py-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 w-full max-w-4xl border border-gray-100">
          {/* Header Section */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Project Wizard</h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
              Create your carbon reduction project with our comprehensive wizard. Fill in your details and get personalized recommendations.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center ${activePart === 'user' ? 'text-teal-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${activePart === 'user' ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'}`}>
                    1
                  </div>
                  <span className="ml-2 font-medium">User Information</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className={`flex items-center ${activePart === 'project' ? 'text-teal-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${activePart === 'project' ? 'bg-teal-600 border-teal-600 text-white' : 'border-gray-300'}`}>
                    2
                  </div>
                  <span className="ml-2 font-medium">Project Details</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Sections */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {activePart === 'user' && (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 sm:p-6 border border-teal-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <User className="h-6 w-6 mr-3 text-teal-600" />
                    User Information
                  </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="currentIndustry" className="font-semibold text-gray-700">Current Industry</Label>
                      <Input 
                        id="currentIndustry" 
                        value={formData.currentIndustry} 
                        onChange={e => handleInputChange('currentIndustry', e.target.value)} 
                        placeholder="e.g. Manufacturing" 
                        className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-colors" 
                        required 
                      />
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="industrySize" className="font-semibold text-gray-700">Industry Size</Label>
                      <Select value={formData.industrySize} onValueChange={value => handleInputChange('industrySize', value)} required>
                        <SelectTrigger className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-colors">
                          <SelectValue placeholder="Select industry size" />
                        </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                      <Label className="font-semibold text-gray-700 mb-3 block">Do you have data available on your organization's current emissions, wastewater discharge, or other discharges?</Label>
                      <RadioGroup
                        value={formData.hasEmissionsKnowledge}
                        onValueChange={value => handleInputChange('hasEmissionsKnowledge', value)}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-6"
                        required
                      >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="emissions-yes" />
                          <Label htmlFor="emissions-yes" className="text-gray-700">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="emissions-no" />
                          <Label htmlFor="emissions-no" className="text-gray-700">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {formData.hasEmissionsKnowledge === 'yes' && (
                      <div className="md:col-span-2 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                        <h4 className="font-semibold text-teal-600 mb-4 flex items-center">
                          <BarChart3 className="h-5 w-5 mr-2" />
                          Emissions Data
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label htmlFor="ghgTypes" className="text-sm font-medium text-gray-600">GHG Types</Label>
                            <Input 
                              id="ghgTypes" 
                              value={formData.ghgTypes} 
                              onChange={e => handleInputChange('ghgTypes', e.target.value)} 
                              placeholder="e.g., CO₂, CH₄, N₂O" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ghgSources" className="text-sm font-medium text-gray-600">Sources</Label>
                            <Input 
                              id="ghgSources" 
                              value={formData.ghgSources} 
                              onChange={e => handleInputChange('ghgSources', e.target.value)} 
                              placeholder="e.g., energy use" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="ghgAnnual" className="text-sm font-medium text-gray-600">Annual Emissions (tCO₂e)</Label>
                            <Input 
                              id="ghgAnnual" 
                              value={formData.ghgAnnual} 
                              onChange={e => handleInputChange('ghgAnnual', e.target.value)} 
                              placeholder="Enter amount" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                        </div>
                        <h4 className="font-semibold text-teal-600 mb-4 flex items-center">
                          <Leaf className="h-5 w-5 mr-2" />
                          Wastewater Discharge
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                          <div className="space-y-2">
                            <Label htmlFor="wasteVolume" className="text-sm font-medium text-gray-600">Volume (m³/day)</Label>
                            <Input 
                              id="wasteVolume" 
                              value={formData.wasteVolume} 
                              onChange={e => handleInputChange('wasteVolume', e.target.value)} 
                              placeholder="Enter volume" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wastePollutants" className="text-sm font-medium text-gray-600">Pollutants</Label>
                            <Input 
                              id="wastePollutants" 
                              value={formData.wastePollutants} 
                              onChange={e => handleInputChange('wastePollutants', e.target.value)} 
                              placeholder="Enter pollutants" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wasteTreatment" className="text-sm font-medium text-gray-600">Treatment Methods</Label>
                            <Input 
                              id="wasteTreatment" 
                              value={formData.wasteTreatment} 
                              onChange={e => handleInputChange('wasteTreatment', e.target.value)} 
                              placeholder="Enter methods" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wasteDestination" className="text-sm font-medium text-gray-600">Discharge Destination</Label>
                            <Input 
                              id="wasteDestination" 
                              value={formData.wasteDestination} 
                              onChange={e => handleInputChange('wasteDestination', e.target.value)} 
                              placeholder="Enter destination" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                      </div>
                      </div>
                        <h4 className="font-semibold text-teal-600 mb-4 flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          Other Discharges
                        </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="otherType" className="text-sm font-medium text-gray-600">Type</Label>
                            <Input 
                              id="otherType" 
                              value={formData.otherType} 
                              onChange={e => handleInputChange('otherType', e.target.value)} 
                              placeholder="e.g., solid waste" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="otherVolume" className="text-sm font-medium text-gray-600">Volume</Label>
                            <Input 
                              id="otherVolume" 
                              value={formData.otherVolume} 
                              onChange={e => handleInputChange('otherVolume', e.target.value)} 
                              placeholder="Enter volume" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="otherDisposal" className="text-sm font-medium text-gray-600">Disposal Method</Label>
                            <Input 
                              id="otherDisposal" 
                              value={formData.otherDisposal} 
                              onChange={e => handleInputChange('otherDisposal', e.target.value)} 
                              placeholder="Enter method" 
                              className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                </div>
              </div>
            )}
            {activePart === 'project' && (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-100">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <Settings className="h-6 w-6 mr-3 text-teal-600" />
                    Project Information
                  </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="projectName" className="font-semibold text-gray-700">Project Name</Label>
                      <Input 
                        id="projectName" 
                        value={formData.projectName} 
                        onChange={e => handleInputChange('projectName', e.target.value)} 
                        placeholder="Enter project name" 
                        className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-colors" 
                        required 
                      />
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="font-semibold text-gray-700">Country</Label>
                      <Select value={formData.country} onValueChange={value => handleInputChange('country', value)} required>
                        <SelectTrigger className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-colors">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      <SelectContent>
                        {countryOptions.map(country => (
                          <SelectItem key={country} value={country}>{country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="areaOfInterest" className="font-semibold text-gray-700">Area of Interest</Label>
                      <Select value={formData.areaOfInterest} onValueChange={value => handleInputChange('areaOfInterest', value)} disabled={loadingAreasOfInterest} required>
                        <SelectTrigger className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-colors">
                          <SelectValue placeholder={loadingAreasOfInterest ? 'Loading...' : 'Select area of interest'} />
                        </SelectTrigger>
                      <SelectContent>
                        {areasOfInterest.map(area => (
                          <SelectItem key={area} value={area}>{area}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="type" className="font-semibold text-gray-700">Type</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={value => handleInputChange('type', value)} 
                        disabled={loadingTypes || !formData.areaOfInterest} 
                        required
                      >
                        <SelectTrigger className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-colors">
                          <SelectValue placeholder={
                            !formData.areaOfInterest 
                              ? 'Please select Area of Interest first' 
                              : loadingTypes 
                                ? 'Loading...' 
                                : 'Select type'
                          } />
                        </SelectTrigger>
                      <SelectContent>
                          {filteredTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal" className="font-semibold text-gray-700">Goal</Label>
                      <Select value={formData.goal} onValueChange={value => handleInputChange('goal', value)} disabled={loadingGoals} required>
                        <SelectTrigger className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 transition-colors">
                          <SelectValue placeholder={loadingGoals ? 'Loading...' : 'Select goal'} />
                        </SelectTrigger>
                      <SelectContent>
                        {goals.map(goal => (
                          <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Would you like to register your project for carbon credits?</Label>
                      <RadioGroup value={formData.registerForCredits} onValueChange={value => handleInputChange('registerForCredits', value)} className="flex flex-row gap-6" required>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="register-yes" />
                          <Label htmlFor="register-yes" className="text-gray-700">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="register-no" />
                          <Label htmlFor="register-no" className="text-gray-700">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">Proposed developer of project</Label>
                      <RadioGroup value={formData.developmentStrategy} onValueChange={value => handleInputChange('developmentStrategy', value)} className="flex flex-row gap-6" required>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self" id="dev-self" />
                          <Label htmlFor="dev-self" className="text-gray-700">Self</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="third-party" id="dev-third-party" />
                          <Label htmlFor="dev-third-party" className="text-gray-700">Third Party</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="md:col-span-2">
                      <Label htmlFor="additionalInfo" className="font-semibold text-gray-700 mb-3 block flex items-center">
                        <Bot className="h-5 w-5 mr-2 text-teal-600" />
                        Instructions for AI Analysis
                      </Label>
                      <p className="text-sm text-gray-600 mb-3">Provide any specific instructions, context, or questions for our AI bot. The AI will generate a tailored analysis based on your input.</p>
                      <Textarea 
                        id="additionalInfo" 
                        value={formData.additionalInfo} 
                        onChange={e => handleInputChange('additionalInfo', e.target.value)} 
                        placeholder="e.g. Please analyze the carbon reduction potential and suggest improvements for my project." 
                        className="rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500/20 min-h-[100px] transition-colors" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              {activePart === 'project' && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setActivePart('user')} 
                  className="rounded-lg px-6 py-2 border-gray-300 hover:border-teal-500 hover:text-teal-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to User Info
                </Button>
              )}
              {activePart === 'user' && (
                <Button 
                  type="button" 
                  onClick={() => setActivePart('project')} 
                  className="rounded-lg px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white transition-all"
                >
                  Next: Project Info
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {activePart === 'project' && (
                <Button 
                  type="submit" 
                  className="rounded-lg px-6 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Thinking...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Project
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectWizard;
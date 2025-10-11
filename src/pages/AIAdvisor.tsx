import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Target, Calendar, DollarSign, Leaf, Sparkles } from "lucide-react";

const AIAdvisor = () => {
  const navigate = useNavigate();
  const [advisorData, setAdvisorData] = useState({
    primaryClimateGoal: "",
    targetPeriodStart: "",
    targetPeriodEnd: "",
    isNetZero: false,
    investmentCapacity: "",
    specificBudget: "",
    businessGoals: "",
    constraints: ""
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setAdvisorData(prev => ({ ...prev, [field]: value }));
  };

  const generateSuggestions = () => {
    setLoading(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const mockSuggestions = [
        {
          id: 1,
          title: "Forest Conservation & Reforestation",
          type: "Forestry & Land Use",
          match: 95,
          description: "Large-scale forest conservation project with carbon sequestration and biodiversity co-benefits",
          expectedCredits: "12,000 tCO2e/year",
          investmentRange: "$800K - $1.2M",
          timeline: "2025-2035",
          methodology: "VCS VM0006 - Afforestation/Reforestation",
          coBenefits: ["Biodiversity Conservation", "Water Quality", "Community Employment"],
          suitabilityReasons: [
            "Aligns with carbon neutrality goal",
            "Strong biodiversity co-benefits",
            "Fits within medium investment capacity",
            "10-year timeline matches target period"
          ]
        },
        {
          id: 2,
          title: "Renewable Energy - Solar Farm",
          type: "Renewable Energy",
          match: 88,
          description: "Solar photovoltaic installation for grid-connected renewable energy generation",
          expectedCredits: "8,500 tCO2e/year",
          investmentRange: "$900K - $1.5M",
          timeline: "2025-2030",
          methodology: "Gold Standard Renewable Energy",
          coBenefits: ["Energy Security", "Air Quality", "Job Creation"],
          suitabilityReasons: [
            "Direct GHG emission reduction",
            "Proven technology with lower risk",
            "Faster credit generation timeline",
            "Strong market demand for renewable credits"
          ]
        },
        {
          id: 3,
          title: "Improved Agricultural Practices",
          type: "Agriculture",
          match: 82,
          description: "Sustainable agriculture project with soil carbon enhancement and methane reduction",
          expectedCredits: "6,200 tCO2e/year",
          investmentRange: "$400K - $700K",
          timeline: "2025-2032",
          methodology: "VCS VM0026 - Improved Agricultural Management",
          coBenefits: ["Soil Health", "Water Conservation", "Food Security"],
          suitabilityReasons: [
            "Lower initial investment requirement",
            "Multiple environmental benefits",
            "Community engagement opportunities",
            "Supports sustainable development goals"
          ]
        }
      ];
      
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
      setLoading(false);
    }, 2000);
  };

  const selectProject = (project: any, editMode = false) => {
    // Create detailed project data based on the suggestion
    const detailedProjectData = {
      projectName: project.title,
      projectType: project.type.toLowerCase().replace(/\s+/g, '-'),
      description: project.description,
      projectDeveloper: "AI Suggested Project",
      country: "us",
      region: "California",
      coordinates: "",
      landArea: "1000",
      landUse: "forest",
      methodology: project.methodology,
      technology: project.description,
      certificationStandard: project.methodology.includes("VCS") ? "vcs" : "gold-standard",
      monitoringPlan: "Standard monitoring plan for " + project.type,
      initialInvestment: project.investmentRange.split(" - ")[0].replace(/[$K]/g, "") + "000",
      operationalCosts: "50000",
      creditPrice: "15",
      projectLifetime: "10",
      carbonSequestration: project.expectedCredits.split(" ")[0].replace(/[,]/g, ""),
      biodiversityImpact: project.coBenefits.includes("Biodiversity Conservation") ? "Significant positive impact on local biodiversity" : "",
      waterImpact: project.coBenefits.includes("Water Quality") ? "Improved water quality and conservation" : "",
      soilImpact: project.coBenefits.includes("Soil Health") ? "Enhanced soil health and carbon storage" : "",
      additionalBenefits: project.coBenefits,
      technicalRisks: "Low to moderate technical risks",
      financialRisks: "Market volatility for carbon credits",
      regulatoryRisks: "Changes in carbon credit regulations",
      marketRisks: "Demand fluctuations for carbon credits",
      mitigationStrategies: "Diversified credit buyers and robust monitoring",
      startDate: advisorData.targetPeriodStart,
      firstCreditDate: "2026-01-01",
      majorMilestones: "Project validation, implementation, first verification",
      reportingSchedule: "Annual verification and reporting"
    };

    if (editMode) {
      // Go to project wizard with pre-filled data for editing
      navigate("/project-wizard", { 
        state: { 
          prefillData: detailedProjectData,
          isAISuggested: true,
          suggestion: project
        } 
      });
    } else {
      // Go directly to results
      navigate("/project-results", { 
        state: { 
          projectData: detailedProjectData,
          isAISuggested: true,
          suggestion: project
        } 
      });
    }
  };

  const canGenerateSuggestions = advisorData.primaryClimateGoal && 
                                 advisorData.targetPeriodStart && 
                                 advisorData.targetPeriodEnd && 
                                 advisorData.investmentCapacity;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Button variant="ghost" size="sm" className="mr-4" asChild>
            <Link to="/new-project">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Project Options
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">AI Carbon Project Advisor</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {!showSuggestions ? (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Intro */}
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">
                Let's Find the Perfect Carbon Project for You
              </h2>
              <p className="text-muted-foreground">
                Our AI advisor will analyze your goals and constraints to recommend 
                the most suitable carbon project opportunities.
              </p>
            </div>

            {/* Input Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span>Tell us about your objectives</span>
                </CardTitle>
                <CardDescription>
                  Provide some basic information about your climate goals and business needs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Climate Goal */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Target className="h-4 w-4" />
                    <span>Primary Climate Goal *</span>
                  </Label>
                  <Select value={advisorData.primaryClimateGoal} onValueChange={(value) => handleInputChange("primaryClimateGoal", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="What's your main climate objective?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reduce-ghg">Reduce GHG Emissions</SelectItem>
                      <SelectItem value="carbon-neutral">Achieve Carbon Neutrality</SelectItem>
                      <SelectItem value="offsetting">Carbon Offsetting</SelectItem>
                      <SelectItem value="net-zero">Net Zero Commitment</SelectItem>
                      <SelectItem value="biodiversity">Biodiversity & Co-benefits</SelectItem>
                      <SelectItem value="esg">ESG & Sustainability Goals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Period */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Target Period *</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Start Year</Label>
                      <Select value={advisorData.targetPeriodStart} onValueChange={(value) => handleInputChange("targetPeriodStart", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Start year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="2026">2026</SelectItem>
                          <SelectItem value="2027">2027</SelectItem>
                          <SelectItem value="2028">2028</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">End Year</Label>
                      <Select value={advisorData.targetPeriodEnd} onValueChange={(value) => handleInputChange("targetPeriodEnd", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="End year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2030">2030</SelectItem>
                          <SelectItem value="2035">2035</SelectItem>
                          <SelectItem value="2040">2040</SelectItem>
                          <SelectItem value="2050">2050</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Net Zero vs Emission Reduction */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <Leaf className="h-4 w-4" />
                    <span>Approach Focus</span>
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isNetZero"
                      checked={advisorData.isNetZero}
                      onCheckedChange={(checked) => handleInputChange("isNetZero", checked as boolean)}
                    />
                    <Label htmlFor="isNetZero">
                      This is part of a Net Zero strategy (rather than just emission reduction)
                    </Label>
                  </div>
                </div>

                {/* Investment Capacity */}
                <div className="space-y-3">
                  <Label className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Investment Capacity *</span>
                  </Label>
                  <RadioGroup 
                    value={advisorData.investmentCapacity} 
                    onValueChange={(value) => handleInputChange("investmentCapacity", value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low">Low ($100K - $500K)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium">Medium ($500K - $2M)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high">High ($2M+)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="custom" />
                      <Label htmlFor="custom">Specific budget range</Label>
                    </div>
                  </RadioGroup>
                  
                  {advisorData.investmentCapacity === "custom" && (
                    <Input
                      placeholder="Enter your specific budget range (e.g., $800K - $1.5M)"
                      value={advisorData.specificBudget}
                      onChange={(e) => handleInputChange("specificBudget", e.target.value)}
                    />
                  )}
                </div>

                {/* Additional Context */}
                <div className="space-y-3">
                  <Label>Additional Business Goals & Constraints (Optional)</Label>
                  <Textarea
                    placeholder="Any specific business objectives, geographic preferences, timeline constraints, or other requirements..."
                    value={advisorData.businessGoals}
                    onChange={(e) => handleInputChange("businessGoals", e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={generateSuggestions}
                  disabled={!canGenerateSuggestions || loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing Your Requirements...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Get AI Project Recommendations
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Results Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">
                Recommended Carbon Projects
              </h2>
              <p className="text-muted-foreground">
                Based on your requirements, we've identified {suggestions.length} promising project opportunities
              </p>
            </div>

            {/* Project Suggestions */}
            <div className="grid gap-6">
              {suggestions.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center space-x-3">
                          <span>{project.title}</span>
                          <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {project.match}% Match
                          </span>
                        </CardTitle>
                        <CardDescription className="text-base">
                          {project.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Expected Credits</Label>
                        <p className="font-medium">{project.expectedCredits}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Investment Range</Label>
                        <p className="font-medium">{project.investmentRange}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Timeline</Label>
                        <p className="font-medium">{project.timeline}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Why this project fits your needs:</Label>
                      <ul className="space-y-1">
                        {project.suitabilityReasons.map((reason: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Co-benefits:</Label>
                      <div className="flex flex-wrap gap-2">
                        {project.coBenefits.map((benefit: string) => (
                          <span key={benefit} className="text-xs bg-muted px-2 py-1 rounded">
                            {benefit}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <Button onClick={() => selectProject(project)} className="flex-1">
                        Generate Report
                      </Button>
                      <Button variant="outline" onClick={() => selectProject(project, true)}>
                        View Details & Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={() => setShowSuggestions(false)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Modify Requirements
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAdvisor;
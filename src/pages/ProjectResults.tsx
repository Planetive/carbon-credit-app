import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Leaf,
  Calendar,
  BarChart3,
  PieChart,
  FileText,
  Target,
  Bot
} from "lucide-react";

const ProjectResults = () => {
  const location = useLocation();
  const projectData = location.state?.projectData || {};
  const methodologyResults = location.state?.methodologyResults || [];
  const feasibilityAssessment = location.state?.feasibilityAssessment || {};
  const isAISuggested = location.state?.isAISuggested || false;
  
  // Debug logging
  // console.log("ProjectResults - Received data:", {
  //   projectData,
  //   methodologyResults,
  //   feasibilityAssessment,
  //   isAISuggested
  // });
  
  // AI-powered calculation functions
  const calculateNPV = (data: any) => {
    const initialInvestment = parseInt(data.initialInvestment) || 0;
    const annualCredits = parseInt(data.carbonSequestration) || 0;
    const creditPrice = parseInt(data.creditPrice) || 15;
    const projectLifetime = parseInt(data.projectLifetime) || 10;
    const operationalCosts = parseInt(data.operationalCosts) || 0;
    
    let npv = -initialInvestment;
    for (let year = 1; year <= projectLifetime; year++) {
      const annualRevenue = annualCredits * creditPrice;
      const annualProfit = annualRevenue - operationalCosts;
      npv += annualProfit / Math.pow(1.1, year); // 10% discount rate
    }
    return Math.round(npv);
  };

  const calculateIRR = (data: any) => {
    const initialInvestment = parseInt(data.initialInvestment) || 0;
    const annualCredits = parseInt(data.carbonSequestration) || 0;
    const creditPrice = parseInt(data.creditPrice) || 15;
    const operationalCosts = parseInt(data.operationalCosts) || 0;
    
    if (initialInvestment === 0) return 0;
    const annualProfit = (annualCredits * creditPrice) - operationalCosts;
    const irr = (annualProfit / initialInvestment) * 100;
    return Math.round(irr * 10) / 10;
  };

  const calculatePaybackPeriod = (data: any) => {
    const initialInvestment = parseInt(data.initialInvestment) || 0;
    const annualCredits = parseInt(data.carbonSequestration) || 0;
    const creditPrice = parseInt(data.creditPrice) || 15;
    const operationalCosts = parseInt(data.operationalCosts) || 0;
    
    if (initialInvestment === 0) return 0;
    const annualProfit = (annualCredits * creditPrice) - operationalCosts;
    if (annualProfit <= 0) return 999; // Never payback
    return Math.round((initialInvestment / annualProfit) * 10) / 10;
  };

  const assessRiskLevel = (data: any) => {
    const risks = [];
    if (!data.technicalRisks || data.technicalRisks.length < 10) risks.push('technical');
    if (!data.financialRisks || data.financialRisks.length < 10) risks.push('financial');
    if (!data.regulatoryRisks || data.regulatoryRisks.length < 10) risks.push('regulatory');
    if (!data.mitigationStrategies || data.mitigationStrategies.length < 10) risks.push('operational');
    
    if (risks.length >= 3) return "High";
    if (risks.length >= 2) return "Medium";
    return "Low";
  };

  const calculateCertificationProbability = (methodologies: any[]) => {
    if (!methodologies || methodologies.length === 0) return 50;
    const eligibleCount = methodologies.filter(m => m.eligibility).length;
    const totalCount = methodologies.length;
    return Math.round((eligibleCount / totalCount) * 100);
  };

  const assessMarketReadiness = (data: any) => {
    const hasCompleteData = data.projectName && data.description && data.technology && 
                           data.initialInvestment && data.carbonSequestration;
    const hasMethodology = data.methodology && data.methodology !== "TBD";
    const hasTimeline = data.startDate && data.firstCreditDate;
    
    if (hasCompleteData && hasMethodology && hasTimeline) return "Ready";
    if (hasCompleteData && (hasMethodology || hasTimeline)) return "Nearly Ready";
    return "Needs Work";
  };
  
  // Calculate financial metrics first
  const totalRevenue = (parseInt(projectData.carbonSequestration) || 5000) * (parseInt(projectData.projectLifetime) || 10) * (parseInt(projectData.creditPrice) || 15);
  const totalCosts = (parseInt(projectData.operationalCosts) || 50000) * (parseInt(projectData.projectLifetime) || 10);
  const totalInvestment = parseInt(projectData.initialInvestment) || 500000;
  const profit = totalRevenue - totalCosts - totalInvestment;
  const roiPercentage = totalInvestment > 0 ? Math.round((profit / totalInvestment) * 100) : 0;

  // Enhanced analysis results based on the actual input data and methodology matching
  const analysisResults = {
    feasibilityScore: feasibilityAssessment.overall?.score || 78,
    feasibilityRating: feasibilityAssessment.overall?.score >= 80 ? "High" : 
                      feasibilityAssessment.overall?.score >= 60 ? "Medium" : "Low",
    expectedCredits: parseInt(projectData.carbonSequestration) * parseInt(projectData.projectLifetime) || 150000,
    netPresentValue: calculateNPV(projectData),
    internalRateOfReturn: calculateIRR(projectData),
    paybackPeriod: calculatePaybackPeriod(projectData),
    riskLevel: assessRiskLevel(projectData),
    certificationProbability: calculateCertificationProbability(methodologyResults),
    marketReadiness: assessMarketReadiness(projectData),
    
    // Detailed breakdowns
    financialMetrics: {
      totalInvestment: totalInvestment,
      totalRevenue: totalRevenue,
      totalCosts: totalCosts,
      profit: profit,
      roiPercentage: roiPercentage
    },
    
    environmentalImpact: {
      totalCarbonCredits: parseInt(projectData.carbonSequestration) * parseInt(projectData.projectLifetime) || 150000,
      annualCredits: parseInt(projectData.carbonSequestration) || 5000,
      biodiversityScore: 82,
      communityBenefits: projectData.additionalBenefits?.length || 0
    },
    
    risks: [
      { category: "Technical", level: "Low", description: "Well-established methodology" },
      { category: "Financial", level: "Medium", description: "Market price volatility" },
      { category: "Regulatory", level: "Low", description: "Stable regulatory environment" },
      { category: "Operational", level: "Medium", description: "Monitoring complexity" }
    ],
    
    timeline: [
      { phase: "Project Development", duration: "6 months", status: "upcoming" },
      { phase: "Validation", duration: "3 months", status: "upcoming" },
      { phase: "Implementation", duration: "12 months", status: "upcoming" },
      { phase: "First Verification", duration: "2 months", status: "upcoming" },
      { phase: "Credit Issuance", duration: "1 month", status: "upcoming" }
    ]
  };

  const getFeasibilityColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-blue-600 bg-blue-100";
    if (score >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "high": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  // Check if we have any data to display
  const hasData = Object.keys(projectData).length > 0;
  
  if (!hasData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="mr-4" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Project Analysis Results</h1>
                <p className="text-muted-foreground">No project data available</p>
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <h2 className="text-xl font-semibold mb-2">No Project Data Found</h2>
              <p className="text-muted-foreground mb-4">
                It seems no project data was passed to this page. Please complete the project wizard first.
              </p>
              <Button asChild>
                <Link to="/project-wizard">Go to Project Wizard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="mr-4" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Project Analysis Results</h1>
              <p className="text-muted-foreground">{projectData.projectName || "Unnamed Project"}</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* AI Report Notice */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-primary">AI-Generated Feasibility Report</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This comprehensive feasibility analysis has been generated using AI algorithms based on your project inputs, 
              methodology matching results, and industry best practices. The analysis includes financial projections, 
              risk assessment, and strategic recommendations.
            </p>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Feasibility Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{analysisResults.feasibilityScore}/100</div>
                <Badge className={getFeasibilityColor(analysisResults.feasibilityScore)}>
                  {analysisResults.feasibilityRating}
                </Badge>
              </div>
              <Progress value={analysisResults.feasibilityScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Expected Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-green-600" />
                <div className="text-2xl font-bold">{analysisResults.expectedCredits.toLocaleString()}</div>
              </div>
              <p className="text-sm text-muted-foreground">tCO2e over project lifetime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">NPV</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div className="text-2xl font-bold">${(analysisResults.netPresentValue / 1000000).toFixed(1)}M</div>
              </div>
              <p className="text-sm text-muted-foreground">Net Present Value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <Badge className={getRiskColor(analysisResults.riskLevel)}>
                  {analysisResults.riskLevel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Overall project risk</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="methodology" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="methodology">Methodology</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="environmental">Environmental</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="methodology" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Methodology Matching Results</span>
                  </CardTitle>
                  <CardDescription>
                    AI-powered analysis of compatible carbon methodologies
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {methodologyResults.length > 0 ? (
                    methodologyResults.slice(0, 3).map((methodology: any, index: number) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm">{methodology.name}</h4>
                          <Badge className={methodology.eligibility ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {methodology.eligibility ? "Eligible" : "Not Eligible"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{methodology.standard}</p>
                        <div className="flex justify-between text-sm">
                          <span>Match Score:</span>
                          <span className="font-semibold">{methodology.matchScore}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      <Target className="h-8 w-8 mx-auto mb-2" />
                      <p>No methodology matching data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Feasibility Assessment</span>
                  </CardTitle>
                  <CardDescription>
                    Overall project feasibility across major standards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(feasibilityAssessment).map(([standard, assessment]: [string, any]) => {
                    if (standard === 'overall') return null;
                    return (
                      <div key={standard} className="flex justify-between items-center p-2 border rounded">
                        <span className="text-sm capitalize">{standard}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold">{assessment.score}/100</span>
                          <Badge className={assessment.eligible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {assessment.eligible ? "Eligible" : "Not Eligible"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {feasibilityAssessment.overall && (
                    <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded">
                      <span className="font-semibold">Overall Assessment</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">{feasibilityAssessment.overall.score}/100</span>
                        <Badge className={feasibilityAssessment.overall.eligible ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {feasibilityAssessment.overall.eligible ? "Feasible" : "Not Feasible"}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {methodologyResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Methodology Recommendations</CardTitle>
                  <CardDescription>
                    Detailed analysis and suggestions for methodology selection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {methodologyResults.slice(0, 2).map((methodology: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2">{methodology.name} ({methodology.id})</h4>
                        <p className="text-sm text-muted-foreground mb-3">{methodology.reasoning}</p>
                        {methodology.suggestions && methodology.suggestions.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-sm font-medium mb-1">Suggestions:</h5>
                            <ul className="text-sm space-y-1">
                              {methodology.suggestions.map((suggestion: string, idx: number) => (
                                <li key={idx} className="flex items-start space-x-2">
                                  <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {methodology.requirements && methodology.requirements.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-1">Requirements:</h5>
                            <ul className="text-sm space-y-1">
                              {methodology.requirements.map((req: string, idx: number) => (
                                <li key={idx} className="flex items-start space-x-2">
                                  <Target className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Financial Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Investment</span>
                    <span className="font-semibold">${analysisResults.financialMetrics.totalInvestment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expected Revenue</span>
                    <span className="font-semibold text-green-600">${analysisResults.financialMetrics.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Costs</span>
                    <span className="font-semibold text-red-600">${analysisResults.financialMetrics.totalCosts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Net Profit</span>
                    <span className="font-bold text-green-600">${analysisResults.financialMetrics.profit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ROI</span>
                    <span className="font-semibold">{analysisResults.financialMetrics.roiPercentage}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Performance Indicators</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Internal Rate of Return</span>
                    <span className="font-semibold">{analysisResults.internalRateOfReturn}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payback Period</span>
                    <span className="font-semibold">{analysisResults.paybackPeriod} years</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Certification Probability</span>
                    <span className="font-semibold">{analysisResults.certificationProbability}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market Readiness</span>
                    <Badge className="bg-green-100 text-green-800">{analysisResults.marketReadiness}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Projection</CardTitle>
                <CardDescription>Annual carbon credit revenue over project lifetime</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                    <p>Interactive chart would be displayed here</p>
                    <p className="text-sm">Showing projected annual revenues</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="environmental" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Leaf className="h-5 w-5" />
                    <span>Carbon Impact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Carbon Credits</span>
                    <span className="font-semibold">{analysisResults.environmentalImpact.totalCarbonCredits.toLocaleString()} tCO2e</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Annual Credits</span>
                    <span className="font-semibold">{analysisResults.environmentalImpact.annualCredits.toLocaleString()} tCO2e/year</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Biodiversity Score</span>
                    <span className="font-semibold">{analysisResults.environmentalImpact.biodiversityScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Community Benefits</span>
                    <span className="font-semibold">{analysisResults.environmentalImpact.communityBenefits} identified</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>SDG Alignment</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Climate Action (SDG 13)</span>
                    <Badge className="bg-green-100 text-green-800">High</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Life on Land (SDG 15)</span>
                    <Badge className="bg-green-100 text-green-800">High</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Decent Work (SDG 8)</span>
                    <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Clean Water (SDG 6)</span>
                    <Badge className="bg-blue-100 text-blue-800">Medium</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Co-Benefits Analysis</CardTitle>
                <CardDescription>Additional environmental and social benefits beyond carbon sequestration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {projectData.additionalBenefits?.map((benefit: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks" className="space-y-6">
            <div className="grid gap-4">
              {analysisResults.risks.map((risk, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <h3 className="font-semibold">{risk.category} Risk</h3>
                          <p className="text-sm text-muted-foreground">{risk.description}</p>
                        </div>
                      </div>
                      <Badge className={getRiskColor(risk.level)}>
                        {risk.level}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Risk Mitigation Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Recommended Actions:</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Establish long-term contracts to reduce price volatility risk</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Implement robust monitoring systems for accurate measurement</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Diversify project portfolio to spread risks</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>Engage early with certification bodies and regulators</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Project Timeline</span>
                </CardTitle>
                <CardDescription>Key phases and milestones for project implementation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResults.timeline.map((phase, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold">{phase.phase}</h4>
                        <p className="text-sm text-muted-foreground">Duration: {phase.duration}</p>
                      </div>
                      <Badge variant="outline">
                        {phase.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Critical Path Analysis</CardTitle>
                <CardDescription>Activities that could impact project timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p>Gantt chart would be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span>Strengths</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Strong financial viability with positive NPV</li>
                    <li>• Well-established methodology reduces technical risk</li>
                    <li>• Multiple co-benefits enhance project value</li>
                    <li>• Good market conditions for carbon credits</li>
                    <li>• Clear regulatory framework in place</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Areas for Improvement</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Consider diversifying credit buyers early</li>
                    <li>• Strengthen monitoring and verification plan</li>
                    <li>• Develop community engagement strategy</li>
                    <li>• Plan for potential regulatory changes</li>
                    <li>• Consider insurance for major risks</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
                <CardDescription>Recommended actions to move forward with this project</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-semibold mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold">Conduct detailed feasibility study</h4>
                      <p className="text-sm text-muted-foreground">Validate assumptions with field studies and expert consultation</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-semibold mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold">Secure initial funding</h4>
                      <p className="text-sm text-muted-foreground">Apply for grants and seek investor partnerships</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-semibold mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold">Begin project design document</h4>
                      <p className="text-sm text-muted-foreground">Start preparing PDD for certification body review</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-semibold mt-0.5">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold">Engage stakeholders</h4>
                      <p className="text-sm text-muted-foreground">Involve local communities and potential credit buyers</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center space-x-4">
              <Button size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Generate Full Report
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectResults;
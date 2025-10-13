import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Play, 
  BarChart3, 
  Map, 
  TrendingUp, 
  FileText, 
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Shield,
  Globe,
  Building,
  Factory,
  Car,
  Home,
  Briefcase,
  Landmark,
  Zap,
  Target
} from 'lucide-react';

// Import separated scenario building logic
import {
  PCAF_ASSET_CLASSES,
  SECTOR_SEGMENTS,
  CLIMATE_SCENARIOS,
  convertPortfolioToScenario,
  calculateScenarioResults,
  type PortfolioEntry,
  type ScenarioPortfolioEntry,
  type ScenarioResult,
  type ScenarioBuildingState
} from './scenario-building';

// Icon mapping for asset classes
const ASSET_CLASS_ICONS: { [key: string]: any } = {
  'listed_equity': Building,
  'business_loans': Briefcase,
  'project_finance': Factory,
  'commercial_real_estate': Building,
  'mortgages': Home,
  'motor_vehicle_loans': Car,
  'sovereign_debt': Landmark,
  'insurance_facilitation': Shield
};




const PCAFScenarioBuilding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('PCAFScenarioBuilding component loaded successfully');
  
  const [currentView, setCurrentView] = useState<'upload' | 'scenarios' | 'results'>('scenarios');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedAssetClasses, setSelectedAssetClasses] = useState<string[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [portfolioEntries, setPortfolioEntries] = useState<ScenarioPortfolioEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get portfolio data from BankPortfolio (passed via navigation state)
  const bankPortfolioData = location.state as PortfolioEntry | PortfolioEntry[] | undefined;

  useEffect(() => {
    console.log('PCAFScenarioBuilding - bankPortfolioData:', bankPortfolioData);
    
    if (bankPortfolioData) {
      // Handle both single entry and array of entries
      const portfolioArray = Array.isArray(bankPortfolioData) ? bankPortfolioData : [bankPortfolioData];
      console.log('PCAFScenarioBuilding - portfolioArray:', portfolioArray);
      
      if (portfolioArray.length > 0) {
        // Convert BankPortfolio data to Scenario Building format
        const convertedPortfolio = convertPortfolioToScenario(portfolioArray);
        console.log('PCAFScenarioBuilding - convertedPortfolio:', convertedPortfolio);
        setPortfolioEntries(convertedPortfolio);
      } else {
        // Fallback to sample data
        console.log('PCAFScenarioBuilding - Loading sample data (empty array)');
        loadSampleData();
      }
    } else {
      // Fallback to sample data
      console.log('PCAFScenarioBuilding - Loading sample data (no data)');
      loadSampleData();
    }
  }, [bankPortfolioData]);

  const loadSampleData = () => {
    // Fallback to sample data if no portfolio data is available
    const samplePortfolio: PortfolioEntry[] = [
      {
        id: '1',
        company: 'Acme Manufacturing Ltd.',
        amount: 70000000000, // 70 billion PKR
        counterparty: 'ACME001',
        sector: 'Manufacturing',
        geography: 'Pakistan',
        probabilityOfDefault: 2.5,
        lossGivenDefault: 45,
        tenor: 36
      },
      {
        id: '2',
        company: 'Green Energy Corp.',
        amount: 126000000000, // 126 billion PKR
        counterparty: 'GREEN001',
        sector: 'Energy',
        geography: 'Pakistan',
        probabilityOfDefault: 1.8,
        lossGivenDefault: 40,
        tenor: 60
      },
      {
        id: '3',
        company: 'Prime Retail Pvt.',
        amount: 42000000000, // 42 billion PKR
        counterparty: 'PRIME001',
        sector: 'Retail',
        geography: 'Pakistan',
        probabilityOfDefault: 3.2,
        lossGivenDefault: 50,
        tenor: 24
      },
      {
        id: '4',
        company: 'Metro Real Estate',
        amount: 84000000000, // 84 billion PKR
        counterparty: 'METRO001',
        sector: 'Real Estate',
        geography: 'Pakistan',
        probabilityOfDefault: 2.0,
        lossGivenDefault: 35,
        tenor: 48
      }
    ];
    
    const convertedPortfolio = convertPortfolioToScenario(samplePortfolio);
    setPortfolioEntries(convertedPortfolio);
  };

  const runScenario = async () => {
    if (!selectedScenario) {
      setError('Please select a scenario type');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResults(null);
    setCurrentView('results');

    // Simulate API call with progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Use the separated calculation engine - include ALL portfolio entries
      const calculationParams = {
        selectedScenario,
        portfolioEntries,
        selectedAssetClasses: [], // Include all asset classes
        selectedSectors: [] // Include all sectors
      };
      
      const results = calculateScenarioResults(calculationParams);
      setResults(results);
      clearInterval(progressInterval);
    } catch (err) {
      setError('Failed to run scenario analysis');
      clearInterval(progressInterval);
    } finally {
      setIsRunning(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PCAF Climate Stress Testing</h1>
              <p className="text-gray-600 mt-2">
                Build and analyze climate scenarios using PCAF methodology
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              <Target className="h-4 w-4 mr-1" />
              PCAF Compliant
            </Badge>
          </div>
        </div>

        {/* Portfolio Info */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Your Portfolio:</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <div>Total Entries: {portfolioEntries.length}</div>
            {portfolioEntries.length > 0 && (
              <>
                <div>Total Value: {formatCurrency(portfolioEntries.reduce((sum, entry) => sum + entry.amount, 0))}</div>
                <div className="mt-2">
                  <strong>Portfolio Contents:</strong>
                  {portfolioEntries.map(entry => (
                    <div key={entry.id} className="ml-2">
                      • {entry.company}: {formatCurrency(entry.amount)} ({entry.sector} sector, {entry.assetClass} asset class)
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Selection Info */}
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-2">Current Selections:</h3>
          <div className="text-xs text-green-700 space-y-1">
            <div>Selected Asset Classes: {selectedAssetClasses.length > 0 ? selectedAssetClasses.join(', ') : 'None (will include all)'}</div>
            <div>Selected Sectors: {selectedSectors.length > 0 ? selectedSectors.join(', ') : 'None (will include all)'}</div>
            <div>Selected Scenario: {selectedScenario || 'None'}</div>
            {selectedAssetClasses.length > 0 || selectedSectors.length > 0 ? (
              <div className="mt-2 text-orange-600">
                <strong>⚠️ Tip:</strong> To include all portfolio entries, deselect all asset classes and sectors.
              </div>
            ) : (
              <div className="mt-2 text-green-600">
                <strong>✅ All portfolio entries will be included in the analysis.</strong>
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-4">
              <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="font-medium">Portfolio Setup</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="font-medium">Risk Mapping</span>
              </div>
              <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-teal-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="font-medium">Scenario Analysis</span>
              </div>
            </div>
          </div>
          <Progress value={(currentStep / 3) * 100} className="h-2" />
        </div>

        <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(parseInt(value))}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="1">Portfolio Setup</TabsTrigger>
            <TabsTrigger value="2">Risk Mapping</TabsTrigger>
            <TabsTrigger value="3">Scenario Analysis</TabsTrigger>
          </TabsList>

          {/* Step 1: Portfolio Setup */}
          <TabsContent value="1" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="h-5 w-5" />
                    <span>STEP 1: Define Scope and Portfolios</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAssetClasses([]);
                      setSelectedSectors([]);
                    }}
                    className="text-xs"
                  >
                    Clear All Selections
                  </Button>
                </CardTitle>
                <CardDescription>
                  Use PCAF Asset Classes to structure your portfolio — these correspond to different forms of financed or facilitated emissions exposure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {PCAF_ASSET_CLASSES.map((assetClass) => {
                    const Icon = ASSET_CLASS_ICONS[assetClass.id] || Building;
                    const isSelected = selectedAssetClasses.includes(assetClass.id);
                    
                    return (
                      <Card
                        key={assetClass.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'ring-2 ring-teal-500 bg-teal-50' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedAssetClasses(prev => prev.filter(id => id !== assetClass.id));
                          } else {
                            setSelectedAssetClasses(prev => [...prev, assetClass.id]);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 ${assetClass.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`h-5 w-5 ${assetClass.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-gray-900 mb-1">
                                {assetClass.name}
                              </h3>
                              <p className="text-xs text-gray-600 mb-2">
                                {assetClass.description}
                              </p>
                              <div className="space-y-1">
                                {assetClass.riskTypes.map((risk, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {risk}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Selected: {selectedAssetClasses.length} asset classes
                  </div>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    disabled={selectedAssetClasses.length === 0}
                  >
                    Next: Risk Mapping
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Risk Mapping */}
          <TabsContent value="2" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Map className="h-5 w-5" />
                  <span>STEP 2: Identify and Map Transition & Physical Risks by Sector Segment</span>
                </CardTitle>
                <CardDescription>
                  Map sectors to primary risk drivers relevant for each, grouped by PCAF asset exposure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {SECTOR_SEGMENTS.map((sector) => {
                    const isSelected = selectedSectors.includes(sector.id);
                    
                    return (
                      <Card
                        key={sector.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'ring-2 ring-teal-500 bg-teal-50' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSectors(prev => prev.filter(id => id !== sector.id));
                          } else {
                            setSelectedSectors(prev => [...prev, sector.id]);
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2">
                                {sector.name}
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-green-700 mb-1">Transition Risks</h4>
                                  <div className="space-y-1">
                                    {sector.transitionRisks.map((risk, index) => (
                                      <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                        {risk}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-blue-700 mb-1">Physical Risks</h4>
                                  <div className="space-y-1">
                                    {sector.physicalRisks.map((risk, index) => (
                                      <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {risk}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  Typical Asset Class: {sector.typicalAssetClass}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-gray-600">
                    Selected: {selectedSectors.length} sectors
                  </div>
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      disabled={selectedSectors.length === 0}
                    >
                      Next: Scenario Analysis
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 3: Scenario Analysis */}
          <TabsContent value="3" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>STEP 3: Define Climate Stress Scenarios</span>
                </CardTitle>
                <CardDescription>
                  Three plausible, TCFD-aligned scenarios with percentage or qualitative assumptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {CLIMATE_SCENARIOS.map((scenario) => {
                    const isSelected = selectedScenario === scenario.id;
                    
                    return (
                      <Card
                        key={scenario.id}
                        className={`cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'ring-2 ring-teal-500 bg-teal-50' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedScenario(scenario.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 ${scenario.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Shield className={`h-6 w-6 ${scenario.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {scenario.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">
                                {scenario.description}
                              </p>
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="font-medium">GDP Impact:</span>
                                    <span className="ml-1">{scenario.assumptions.gdpImpact}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Carbon Price:</span>
                                    <span className="ml-1">{scenario.assumptions.carbonPrice}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Physical Damage:</span>
                                    <span className="ml-1">{scenario.assumptions.physicalDamage}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium">Crop Yields:</span>
                                    <span className="ml-1">{scenario.assumptions.cropYields}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-red-800">{error}</span>
                    </div>
                  </div>
                )}

                {isRunning && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Running Scenario Analysis...</span>
                      <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <Button variant="outline" onClick={() => setCurrentStep(2)}>
                    Previous
                  </Button>
                  <Button
                    onClick={runScenario}
                    disabled={!selectedScenario || isRunning}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {isRunning ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Running Analysis...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Scenario Analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {results && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>Scenario Analysis Results: {results.scenarioType}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(results.totalPortfolioValue)}
                      </div>
                      <div className="text-sm text-gray-600">Total Portfolio Value</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatNumber(results.totalFinancedEmissions)} tCO₂e
                      </div>
                      <div className="text-sm text-gray-600">Total Financed Emissions</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(results.totalPortfolioLoss)}
                      </div>
                      <div className="text-sm text-red-600">Estimated Portfolio Loss</div>
                      <div className="text-xs text-red-500 mt-1">
                        ({results.portfolioLossPercentage.toFixed(2)}% of portfolio)
                      </div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="text-2xl font-bold text-orange-600">
                        +{results.riskIncrease.toFixed(1)}%
                      </div>
                      <div className="text-sm text-orange-600">Risk Increase</div>
                    </div>
                  </div>

                  <Tabs defaultValue="exposures" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="exposures">Top Exposures</TabsTrigger>
                      <TabsTrigger value="asset-classes">Asset Classes</TabsTrigger>
                      <TabsTrigger value="sectors">Sectors</TabsTrigger>
                      <TabsTrigger value="impact-breakdown">Impact Breakdown</TabsTrigger>
                    </TabsList>

                    <TabsContent value="exposures">
                      <div className="space-y-4">
                        {results.topExposures.map((exposure, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{exposure.company}</h3>
                                  <p className="text-sm text-gray-600">
                                    {exposure.sector} • {exposure.assetClass}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    {formatCurrency(exposure.amount)}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Risk: {exposure.baselineRisk.toFixed(1)}% → {exposure.scenarioRisk.toFixed(1)}%
                                  </div>
                                  <div className="text-sm font-medium text-red-600">
                                    Est. Loss: {formatCurrency(exposure.estimatedLoss)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="asset-classes">
                      <div className="space-y-4">
                        {results.assetClassBreakdown.map((item, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{item.assetClass}</h3>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    {formatCurrency(item.amount)}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Risk: {item.baselineRisk.toFixed(1)}% → {item.scenarioRisk.toFixed(1)}%
                                  </div>
                                  <div className="text-sm font-medium text-red-600">
                                    Est. Loss: {formatCurrency(item.estimatedLoss)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="sectors">
                      <div className="space-y-4">
                        {results.sectorBreakdown.map((item, index) => (
                          <Card key={index}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{item.sector}</h3>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-gray-900">
                                    {formatCurrency(item.amount)}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Risk: {item.baselineRisk.toFixed(1)}% → {item.scenarioRisk.toFixed(1)}%
                                  </div>
                                  <div className="text-sm font-medium text-red-600">
                                    Est. Loss: {formatCurrency(item.estimatedLoss)}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="impact-breakdown">
                      <div className="space-y-6">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            STEP 4: Quantified Impacts by Sector Segment
                          </h3>
                          <p className="text-sm text-gray-600">
                            Detailed breakdown of transition and physical risk impacts
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Transition Risk Impacts */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                <span>Transition Risk Impacts</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {SECTOR_SEGMENTS.filter(sector => 
                                  results.sectorBreakdown.some(item => item.sector === sector.name)
                                ).map((sector, index) => {
                                  const impact = sector.impacts.transition;
                                  return (
                                    <div key={index} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                      <h4 className="font-semibold text-green-900 mb-2">{sector.name}</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        {impact.revenueChange !== 0 && (
                                          <div>
                                            <span className="font-medium">Revenue:</span>
                                            <span className={`ml-1 ${impact.revenueChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                              {impact.revenueChange > 0 ? '+' : ''}{impact.revenueChange}%
                                            </span>
                                          </div>
                                        )}
                                        {impact.costIncrease !== 0 && (
                                          <div>
                                            <span className="font-medium">Cost:</span>
                                            <span className="ml-1 text-red-600">
                                              +{impact.costIncrease}%
                                            </span>
                                          </div>
                                        )}
                                        {impact.demandChange !== 0 && (
                                          <div>
                                            <span className="font-medium">Demand:</span>
                                            <span className={`ml-1 ${impact.demandChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                              {impact.demandChange > 0 ? '+' : ''}{impact.demandChange}%
                                            </span>
                                          </div>
                                        )}
                                        {impact.strandedAssets !== 0 && (
                                          <div>
                                            <span className="font-medium">Stranded Assets:</span>
                                            <span className="ml-1 text-red-600">
                                              {impact.strandedAssets}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Physical Risk Impacts */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <Globe className="h-5 w-5 text-blue-600" />
                                <span>Physical Risk Impacts</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {SECTOR_SEGMENTS.filter(sector => 
                                  results.sectorBreakdown.some(item => item.sector === sector.name)
                                ).map((sector, index) => {
                                  const impact = sector.impacts.physical;
                                  return (
                                    <div key={index} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      <h4 className="font-semibold text-blue-900 mb-2">{sector.name}</h4>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        {impact.damage !== 0 && (
                                          <div>
                                            <span className="font-medium">Damage:</span>
                                            <span className="ml-1 text-red-600">
                                              {impact.damage}%
                                            </span>
                                          </div>
                                        )}
                                        {impact.efficiencyLoss !== 0 && (
                                          <div>
                                            <span className="font-medium">Efficiency Loss:</span>
                                            <span className="ml-1 text-red-600">
                                              {impact.efficiencyLoss}%
                                            </span>
                                          </div>
                                        )}
                                        {impact.outputLoss !== 0 && (
                                          <div>
                                            <span className="font-medium">Output Loss:</span>
                                            <span className="ml-1 text-red-600">
                                              {impact.outputLoss}%
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Estimated Portfolio Loss Summary */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <span>Estimated Portfolio Loss Summary</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {SECTOR_SEGMENTS.filter(sector => 
                                results.sectorBreakdown.some(item => item.sector === sector.name)
                              ).map((sector, index) => {
                                const sectorResult = results.sectorBreakdown.find(item => item.sector === sector.name);
                                return (
                                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-semibold text-gray-900 mb-2">{sector.name}</h4>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span>Exposure:</span>
                                        <span className="font-medium">{formatCurrency(sectorResult?.amount || 0)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Est. Loss:</span>
                                        <span className="font-medium text-red-600">{formatCurrency(sectorResult?.estimatedLoss || 0)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Loss %:</span>
                                        <span className="font-medium text-red-600">
                                          {sectorResult?.amount ? ((sectorResult.estimatedLoss / sectorResult.amount) * 100).toFixed(2) : '0.00'}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export Results
                    </Button>
                    <Button onClick={() => {
                      setResults(null);
                      setCurrentStep(1);
                      setSelectedAssetClasses([]);
                      setSelectedSectors([]);
                      setSelectedScenario('');
                    }}>
                      Run New Analysis
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PCAFScenarioBuilding;

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Play, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  Building,
  Briefcase,
  Zap,
  CheckCircle
} from 'lucide-react';

// Import separated scenario building logic
import {
  CLIMATE_SCENARIOS,
  convertPortfolioToScenario,
  calculateScenarioResults,
  type PortfolioEntry,
  type ScenarioPortfolioEntry
} from './scenario-building';

const SimpleScenarioBuilding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [portfolioEntries, setPortfolioEntries] = useState<ScenarioPortfolioEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Get portfolio data from BankPortfolio (passed via navigation state)
  const bankPortfolioData = location.state as PortfolioEntry | PortfolioEntry[] | undefined;
  
  // Check if we're coming back from results page with already converted data
  const resultsPageData = location.state as { 
    portfolioEntries?: ScenarioPortfolioEntry[], 
    selectedScenario?: string 
  } | undefined;

  useEffect(() => {
    console.log('SimpleScenarioBuilding - Received data:', { bankPortfolioData, resultsPageData });
    
    // If coming back from results page with already converted portfolio data
    if (resultsPageData?.portfolioEntries) {
      console.log('SimpleScenarioBuilding - Using portfolio data from results page:', resultsPageData.portfolioEntries);
      setPortfolioEntries(resultsPageData.portfolioEntries);
      if (resultsPageData.selectedScenario) {
        setSelectedScenario(resultsPageData.selectedScenario);
      }
      return;
    }
    
    // Original logic for BankPortfolio data
    if (bankPortfolioData) {
      // Handle both single entry and array of entries
      const portfolioArray = Array.isArray(bankPortfolioData) ? bankPortfolioData : [bankPortfolioData];
      
      console.log('SimpleScenarioBuilding - Portfolio array:', portfolioArray);
      
      if (portfolioArray.length > 0) {
        // Convert BankPortfolio data to Scenario Building format
        convertPortfolioToScenario(portfolioArray).then(convertedPortfolio => {
          console.log('SimpleScenarioBuilding - Converted portfolio:', convertedPortfolio);
          setPortfolioEntries(convertedPortfolio);
        }).catch(error => {
          console.error('Error converting portfolio:', error);
          // Fallback to sample data on error
          loadSampleData();
        });
      } else {
        // Fallback to sample data
        console.log('SimpleScenarioBuilding - Using sample data (empty portfolio)');
        loadSampleData();
      }
    } else {
      // Fallback to sample data
      console.log('SimpleScenarioBuilding - Using sample data (no portfolio data)');
      loadSampleData();
    }
  }, [bankPortfolioData, resultsPageData]);

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
    
    convertPortfolioToScenario(samplePortfolio).then(convertedPortfolio => {
      setPortfolioEntries(convertedPortfolio);
    }).catch(error => {
      console.error('Error converting sample portfolio:', error);
      // Fallback to basic portfolio entries
      setPortfolioEntries(samplePortfolio.map(entry => ({
        ...entry,
        assetClass: 'Business Loan',
        financedEmissions: 0
      })));
    });
  };

  const runScenario = async () => {
    if (!selectedScenario) {
      setError('Please select a scenario type');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError(null);

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
      // Transform portfolio entries for backend API
      const backendPortfolioEntries = portfolioEntries.map(entry => ({
        id: entry.id,
        company: entry.company,
        amount: entry.amount,
        counterparty: entry.counterparty,
        sector: entry.sector,
        geography: entry.geography,
        probability_of_default: entry.probabilityOfDefault,
        loss_given_default: entry.lossGivenDefault,
        tenor: entry.tenor
      }));

      // Map frontend scenario IDs to backend scenario types
      const scenarioTypeMap: { [key: string]: string } = {
        'baseline': 'transition', // Use transition as default for baseline
        'transition_shock': 'transition',
        'physical_shock': 'physical',
        'dual_stress': 'combined'
      };

      const backendScenarioType = scenarioTypeMap[selectedScenario] || 'transition';

      console.log('Frontend - Sending portfolio data to backend:', {
        portfolioEntriesCount: backendPortfolioEntries.length,
        entries: backendPortfolioEntries,
        selectedScenario,
        backendScenarioType
      });

      // Call backend API
      const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000');
      const response = await fetch(`${backendUrl}/scenario/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_type: backendScenarioType,
          portfolio_entries: backendPortfolioEntries
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to calculate scenario';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const backendResults = await response.json();

      // Transform backend results to frontend format
      const sortedResults = backendResults.results.sort((a, b) => b.loss_increase - a.loss_increase);

      const sectorBreakdown = backendResults.results.reduce((acc, result) => {
        if (!acc[result.sector]) {
          acc[result.sector] = {
            sector: result.sector,
            amount: 0,
            estimatedLoss: 0
          };
        }
        acc[result.sector].amount += result.exposure;
        acc[result.sector].estimatedLoss += result.climate_adjusted_expected_loss;
        return acc;
      }, {});

      const sectorBreakdownArray = Object.values(sectorBreakdown).map((sector: any) => ({
        sector: sector.sector,
        amount: sector.amount,
        percentage: (sector.amount / backendResults.total_exposure) * 100,
        estimatedLoss: sector.estimatedLoss
      }));

      // Asset Class Breakdown - Use portfolio entries with proper asset class names
      const assetClassBreakdown = portfolioEntries.reduce((acc, entry) => {
        if (!acc[entry.assetClass]) {
          acc[entry.assetClass] = {
            assetClass: entry.assetClass,
            amount: 0,
            estimatedLoss: 0
          };
        }
        acc[entry.assetClass].amount += entry.amount;
        
        // Find corresponding backend result for this entry to get estimated loss
        const backendResult = backendResults.results.find(r => r.company === entry.company);
        if (backendResult) {
          acc[entry.assetClass].estimatedLoss += backendResult.climate_adjusted_expected_loss;
        }
        return acc;
      }, {});

      const assetClassBreakdownArray = Object.values(assetClassBreakdown).map((assetClass: any) => ({
        assetClass: assetClass.assetClass,
        amount: assetClass.amount,
        percentage: (assetClass.amount / backendResults.total_exposure) * 100,
        estimatedLoss: assetClass.estimatedLoss
      }));

      console.log('Asset Class Breakdown Debug:', {
        portfolioEntries: portfolioEntries.map(e => ({ company: e.company, assetClass: e.assetClass })),
        assetClassBreakdown: assetClassBreakdown,
        assetClassBreakdownArray: assetClassBreakdownArray
      });

      // Calculate correct total loss percentage
      const totalLossPercentage = backendResults.total_exposure > 0 
        ? (backendResults.total_climate_adjusted_expected_loss / backendResults.total_exposure) * 100
        : 0;

      // Calculate proper risk metrics using actual portfolio data
      const totalExposure = backendResults.total_exposure || 0;
      const totalBaselineExpectedLoss = backendResults.total_baseline_expected_loss || 0;
      
      // Calculate portfolio-weighted baseline risk from actual data
      const baselineRisk = totalExposure > 0 ? (totalBaselineExpectedLoss / totalExposure) * 100 : 0;
      const riskIncreasePercentage = backendResults.total_loss_increase_percentage || 0;
      const scenarioRisk = baselineRisk + (baselineRisk * riskIncreasePercentage / 100);
      
      // Calculate the actual risk increase percentage for display
      const actualRiskIncrease = baselineRisk > 0 ? ((scenarioRisk - baselineRisk) / baselineRisk) * 100 : 0;

      console.log('Risk Calculation Debug:', {
        baselineRisk,
        riskIncreasePercentage,
        scenarioRisk,
        totalLossPercentage,
        backendResults: {
          total_loss_increase_percentage: backendResults.total_loss_increase_percentage,
          total_climate_adjusted_expected_loss: backendResults.total_climate_adjusted_expected_loss,
          total_exposure: backendResults.total_exposure
        }
      });

      const results = {
        scenarioType: backendResults.scenario_type,
        totalPortfolioValue: backendResults.total_exposure,
        totalPortfolioLoss: backendResults.total_climate_adjusted_expected_loss,
        portfolioLossPercentage: totalLossPercentage,
        baselineRisk: baselineRisk,
        scenarioRisk: scenarioRisk,
        riskIncrease: actualRiskIncrease,
        totalFinancedEmissions: 0, // Add missing property
        assetClassBreakdown: assetClassBreakdownArray,
        sectorBreakdown: sectorBreakdownArray,
        topExposures: sortedResults.map(result => ({
          company: result.company,
          sector: result.sector,
          assetClass: 'Business Loans',
          amount: result.exposure,
          baselineRisk: result.baseline_pd,
          scenarioRisk: result.adjusted_pd,
          estimatedLoss: result.climate_adjusted_expected_loss
        }))
      };

      // Navigate to results page with data
      navigate('/climate-risk-results', {
        state: {
          results,
          selectedScenario,
          portfolioEntries
        }
      });
      clearInterval(progressInterval);
    } catch (err) {
      console.error('Scenario calculation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to run scenario analysis');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Climate Risk Analysis
                  </h1>
                  <p className="text-xl text-gray-600 mt-2">
                    Advanced TCFD-compliant climate stress testing
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Portfolio Summary */}
        <div className="mb-10">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                <Building className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Portfolio Overview</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Total Investments</p>
                    <p className="text-3xl font-bold text-blue-900">{portfolioEntries.length}</p>
                  </div>
                  <div className="p-3 bg-blue-500 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600 mb-1">Portfolio Value</p>
                    <p className="text-3xl font-bold text-emerald-900">
                      {formatCurrency(portfolioEntries.reduce((sum, entry) => sum + entry.amount, 0))}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500 rounded-xl">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">

            {/* Scenario Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Climate Scenarios</h2>
                  <p className="text-gray-600 mt-1">Select a scenario to analyze your portfolio's climate risk exposure</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CLIMATE_SCENARIOS.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                      selectedScenario === scenario.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-2xl ring-4 ring-blue-200'
                        : 'bg-white/70 hover:bg-white/90 shadow-lg hover:shadow-xl border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl ${
                          selectedScenario === scenario.id 
                            ? 'bg-white/20' 
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}>
                          <Zap className={`h-5 w-5 ${
                            selectedScenario === scenario.id ? 'text-white' : 'text-white'
                          }`} />
                        </div>
                        <h3 className={`font-bold text-lg ${
                          selectedScenario === scenario.id ? 'text-white' : 'text-gray-900'
                        }`}>
                          {scenario.name}
                        </h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedScenario === scenario.id
                          ? 'bg-white/20 text-white'
                          : scenario.bgColor
                      }`}>
                        {scenario.type}
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${
                      selectedScenario === scenario.id ? 'text-white/90' : 'text-gray-600'
                    }`}>
                      {scenario.description}
                    </p>
                    {selectedScenario === scenario.id && (
                      <div className="absolute top-4 right-4">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between space-x-6">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex items-center space-x-3 px-6 py-3 bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:border-gray-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back to Portfolio</span>
              </Button>

              <div className="flex-1 max-w-md">
                <Button
                  onClick={runScenario}
                  disabled={!selectedScenario || isRunning}
                  size="lg"
                  className="w-full px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isRunning ? (
                    <>
                      <Clock className="h-5 w-5 mr-3 animate-spin" />
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-3" />
                      Run Climate Risk Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>

            {!selectedScenario && (
              <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-center space-x-3">
                  <div className="p-2 bg-amber-100 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-amber-800 font-medium">
                    Please select a scenario to run the analysis
                  </span>
                </div>
              </div>
            )}
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                </div>
              )}
        </div>

        {/* Loading State */}
        {isRunning && (
          <Card className="mt-10">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-8 w-8 text-blue-600 animate-spin" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Portfolio Risk...</h3>
                  <p className="text-gray-600 mb-4">
                    Running climate scenario analysis on your portfolio
                  </p>
                </div>
                
                <div className="max-w-md mx-auto">
                  <Progress value={progress} className="h-3 mb-4" />
                  <div className="flex justify-between text-sm text-gray-600 mb-4">
                    <span>Processing...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{portfolioEntries.length}</div>
                    <div className="text-sm text-gray-600">Investments</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(portfolioEntries.reduce((sum, entry) => sum + entry.amount, 0))}
                    </div>
                    <div className="text-sm text-gray-600">Portfolio Value</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {CLIMATE_SCENARIOS.find(s => s.id === selectedScenario)?.name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-600">Scenario</div>
                  </div>
                </div>
                
                <div className="mt-6 text-sm text-gray-500">
                  <p>This may take a few moments depending on portfolio size...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default SimpleScenarioBuilding;

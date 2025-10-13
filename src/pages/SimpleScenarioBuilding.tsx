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
  Map, 
  TrendingUp, 
  FileText, 
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  Factory,
  Car,
  Home,
  Briefcase,
  Landmark,
  Zap
} from 'lucide-react';

// Import separated scenario building logic
import {
  CLIMATE_SCENARIOS,
  convertPortfolioToScenario,
  calculateScenarioResults,
  type PortfolioEntry,
  type ScenarioPortfolioEntry,
  type ScenarioResult
} from './scenario-building';

const SimpleScenarioBuilding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentView, setCurrentView] = useState<'scenarios' | 'results'>('scenarios');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('current');
  const [portfolioEntries, setPortfolioEntries] = useState<ScenarioPortfolioEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get portfolio data from BankPortfolio (passed via navigation state)
  const bankPortfolioData = location.state as PortfolioEntry | PortfolioEntry[] | undefined;

  useEffect(() => {
    if (bankPortfolioData) {
      // Handle both single entry and array of entries
      const portfolioArray = Array.isArray(bankPortfolioData) ? bankPortfolioData : [bankPortfolioData];
      
      if (portfolioArray.length > 0) {
        // Convert BankPortfolio data to Scenario Building format
        const convertedPortfolio = convertPortfolioToScenario(portfolioArray);
        setPortfolioEntries(convertedPortfolio);
      } else {
        // Fallback to sample data
        loadSampleData();
      }
    } else {
      // Fallback to sample data
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

  // Portfolio options for selection
  const portfolioOptions = [
    {
      id: 'current',
      name: 'Current Portfolio',
      description: 'Portfolio data from Bank Portfolio page',
      count: portfolioEntries.length,
      totalValue: portfolioEntries.reduce((sum, entry) => sum + entry.amount, 0)
    },
    {
      id: 'sample',
      name: 'Sample Portfolio',
      description: 'Demo portfolio with sample data',
      count: 4,
      totalValue: 322000000000 // Sample data total
    },
    {
      id: 'upload',
      name: 'Upload New Dataset',
      description: 'Upload CSV/Excel file with loan data',
      count: 0,
      totalValue: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Climate Risk Scenario Analysis</h1>
              <p className="mt-2 text-gray-600">
                TCFD-compliant climate stress testing for your portfolio
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              TCFD Compliant
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setCurrentView('scenarios')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'scenarios'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Run Scenarios
              </button>
              <button
                onClick={() => setCurrentView('results')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'results'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                View Results
              </button>
            </nav>
          </div>
        </div>

        {/* Portfolio Summary */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Your Portfolio</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{portfolioEntries.length}</div>
                  <div className="text-sm text-gray-600">Total Investments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(portfolioEntries.reduce((sum, entry) => sum + entry.amount, 0))}
                  </div>
                  <div className="text-sm text-gray-600">Total Portfolio Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatNumber(portfolioEntries.reduce((sum, entry) => sum + entry.financedEmissions, 0))} tCO₂e
                  </div>
                  <div className="text-sm text-gray-600">Financed Emissions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {currentView === 'scenarios' && (
          <div className="space-y-6">
            {/* Portfolio Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Select Portfolio/Dataset</span>
                </CardTitle>
                <CardDescription>
                  Choose which portfolio or dataset to apply the climate scenario to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {portfolioOptions.map((option) => (
                    <Card
                      key={option.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedPortfolio === option.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => {
                        setSelectedPortfolio(option.id);
                        if (option.id === 'sample') {
                          loadSampleData();
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{option.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                            <div className="mt-3 space-y-1">
                              <div className="text-sm">
                                <span className="font-medium">{option.count}</span> investments
                              </div>
                              <div className="text-sm">
                                <span className="font-medium">{formatCurrency(option.totalValue)}</span> total value
                              </div>
                            </div>
                          </div>
                          {selectedPortfolio === option.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Upload Interface */}
                {selectedPortfolio === 'upload' && (
                  <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Loan/Investment Data</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Upload a CSV or Excel file with your loan/investment data
                      </p>
                      <div className="space-y-2 text-xs text-gray-500 mb-4">
                        <div><strong>Required fields:</strong> Company, Amount, Sector, Geography, PD, LGD, Tenor</div>
                        <div><strong>Supported formats:</strong> CSV, Excel (.xlsx, .xls)</div>
                        <div><strong>Max file size:</strong> 10MB</div>
                      </div>
                      <Button variant="outline" className="mb-2">
                        <Download className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                      <div className="text-xs text-gray-500">
                        Or drag and drop your file here
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scenario Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Select Climate Scenario</span>
                </CardTitle>
                <CardDescription>
                  Choose a climate scenario to analyze your portfolio's risk exposure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CLIMATE_SCENARIOS.map((scenario) => (
                    <Card
                      key={scenario.id}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedScenario === scenario.id
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{scenario.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                            <div className="mt-3">
                              <Badge variant="outline" className="text-xs">
                                {scenario.type}
                              </Badge>
                            </div>
                          </div>
                          {selectedScenario === scenario.id && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Run Analysis Button */}
            <div className="text-center">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Analysis Configuration</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Portfolio:</strong> {portfolioOptions.find(p => p.id === selectedPortfolio)?.name}</div>
                  <div><strong>Scenario:</strong> {selectedScenario ? CLIMATE_SCENARIOS.find(s => s.id === selectedScenario)?.name : 'Not selected'}</div>
                </div>
              </div>
              
              <Button
                onClick={runScenario}
                disabled={!selectedScenario || !selectedPortfolio || isRunning}
                size="lg"
                className="px-8 py-3"
              >
                {isRunning ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Running Analysis...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Climate Risk Analysis
                  </>
                )}
              </Button>
              
              {(!selectedScenario || !selectedPortfolio) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-600">
                      Please select both a portfolio and a scenario to run the analysis
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

          </div>
        )}

        {/* Results View */}
        {currentView === 'results' && (
          <div className="space-y-6">
            {/* Loading State */}
            {isRunning && (
              <Card>
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

            {/* Results Display */}
            {!isRunning && results && (
              <div className="space-y-6">
            {/* Portfolio Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Portfolio Summary - {results.scenarioType}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(results.totalPortfolioValue)}
                    </div>
                    <div className="text-sm text-gray-600">Total Portfolio Value</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(results.totalPortfolioLoss)}
                    </div>
                    <div className="text-sm text-gray-600">Expected Loss</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {results.portfolioLossPercentage.toFixed(2)}%
                    </div>
                    <div className="text-sm text-gray-600">Loss Percentage</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatNumber(results.totalFinancedEmissions)} tCO₂e
                    </div>
                    <div className="text-sm text-gray-600">Financed Emissions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Exposures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Top Risk Exposures</span>
                </CardTitle>
                <CardDescription>
                  Investments with the highest expected losses under this scenario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.topExposures.slice(0, 5).map((exposure, index) => (
                    <div key={exposure.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-red-600">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-semibold">{exposure.company}</div>
                          <div className="text-sm text-gray-600">{exposure.sector} • {exposure.assetClass}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {formatCurrency(exposure.estimatedLoss)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(exposure.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sector Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Sector Risk Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.sectorBreakdown.slice(0, 5).map((sector) => (
                    <div key={sector.sector} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-semibold">{sector.sector}</div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(sector.amount)} • {sector.riskIncrease.toFixed(1)}% risk increase
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-600">
                          {formatCurrency(sector.estimatedLoss)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Expected Loss
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

                {/* Export Button */}
                <div className="text-center">
                  <Button variant="outline" size="lg" className="px-8 py-3">
                    <Download className="h-4 w-4 mr-2" />
                    Export TCFD Report
                  </Button>
                </div>
              </div>
            )}

            {/* No Results State */}
            {!isRunning && !results && (
              <Card>
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Run a climate scenario analysis to see your portfolio risk results
                    </p>
                    <Button 
                      onClick={() => setCurrentView('scenarios')}
                      className="px-6 py-2"
                    >
                      Go to Scenarios
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Portfolio</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SimpleScenarioBuilding;

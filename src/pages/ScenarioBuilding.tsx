import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
  Globe
} from 'lucide-react';

interface PortfolioEntry {
  id: string;
  company: string;
  amount: number;
  counterparty: string;
  sector: string;
  geography: string;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
}

interface ScenarioResult {
  scenarioType: string;
  totalBaselineLoss: number;
  totalScenarioLoss: number;
  riskIncrease: number;
  topExposures: Array<{
    company: string;
    sector: string;
    geography: string;
    amount: number;
    baselineRisk: number;
    scenarioRisk: number;
    financedEmissions: number;
  }>;
  sectorBreakdown: Array<{
    sector: string;
    baselineRisk: number;
    scenarioRisk: number;
    riskIncrease: number;
  }>;
  geographyBreakdown: Array<{
    geography: string;
    baselineRisk: number;
    scenarioRisk: number;
    riskIncrease: number;
  }>;
}

const ScenarioBuilding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const portfolioData: PortfolioEntry = location?.state || null;
  
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('current');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScenarioResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scenarios = [
    {
      id: 'transition',
      name: 'Transition Risk',
      description: 'Assess risks from rapid transition to low-carbon economy',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'physical',
      name: 'Physical Risk',
      description: 'Evaluate risks from climate-related physical events',
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'combined',
      name: 'Combined Risk',
      description: 'Comprehensive analysis of both transition and physical risks',
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  const runScenario = async () => {
    if (!selectedScenario) {
      setError('Please select a scenario type');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResults(null);

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
      
      // Mock results data
      const mockResults: ScenarioResult = {
        scenarioType: selectedScenario,
        totalBaselineLoss: 125000000,
        totalScenarioLoss: 187500000,
        riskIncrease: 50,
        topExposures: [
          {
            company: 'Acme Manufacturing Ltd.',
            sector: 'Manufacturing',
            geography: 'Pakistan',
            amount: 250000000,
            baselineRisk: 2.5,
            scenarioRisk: 4.2,
            financedEmissions: 12500
          },
          {
            company: 'Green Energy Corp.',
            sector: 'Energy',
            geography: 'Pakistan',
            amount: 450000000,
            baselineRisk: 1.8,
            scenarioRisk: 2.9,
            financedEmissions: 22500
          },
          {
            company: 'Prime Retail Pvt.',
            sector: 'Retail',
            geography: 'Pakistan',
            amount: 150000000,
            baselineRisk: 3.2,
            scenarioRisk: 4.8,
            financedEmissions: 7500
          }
        ],
        sectorBreakdown: [
          { sector: 'Manufacturing', baselineRisk: 2.5, scenarioRisk: 4.2, riskIncrease: 68 },
          { sector: 'Energy', baselineRisk: 1.8, scenarioRisk: 2.9, riskIncrease: 61 },
          { sector: 'Retail', baselineRisk: 3.2, scenarioRisk: 4.8, riskIncrease: 50 }
        ],
        geographyBreakdown: [
          { geography: 'Pakistan', baselineRisk: 2.3, scenarioRisk: 3.8, riskIncrease: 65 }
        ]
      };

      setResults(mockResults);
    } catch (err) {
      setError('Failed to run scenario analysis. Please try again.');
    } finally {
      setIsRunning(false);
      clearInterval(progressInterval);
    }
  };

  const exportTCFDReport = () => {
    // Mock TCFD report generation
    const reportData = {
      scenario: selectedScenario,
      results: results,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TCFD_Report_${selectedScenario}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currencyFormat = (value: number) =>
    (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/bank-portfolio')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portfolio
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Scenario Building</h1>
          <p className="text-gray-600">Run climate risk scenarios and analyze portfolio impact</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scenario Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Select Scenario
                </CardTitle>
                <CardDescription>Choose the type of climate risk scenario to analyze</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scenarios.map((scenario) => {
                    const IconComponent = scenario.icon;
                    return (
                      <Card
                        key={scenario.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedScenario === scenario.id
                            ? `${scenario.borderColor} border-2 ${scenario.bgColor}`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedScenario(scenario.id)}
                      >
                        <CardContent className="p-4 text-center">
                          <IconComponent className={`h-8 w-8 mx-auto mb-2 ${scenario.color}`} />
                          <h3 className="font-semibold text-sm mb-1">{scenario.name}</h3>
                          <p className="text-xs text-gray-600">{scenario.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Separator />

                <div>
                  <Label htmlFor="portfolio">Portfolio Selection</Label>
                  <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Portfolio</SelectItem>
                      <SelectItem value="all">All Companies</SelectItem>
                      <SelectItem value="filtered">Filtered Results</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={runScenario}
                  disabled={isRunning || !selectedScenario}
                  className="w-full"
                  size="lg"
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

                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Processing scenario data...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Portfolio Info */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Portfolio Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">3</div>
                  <div className="text-sm text-gray-600">Total Companies</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">PKR 850M</div>
                  <div className="text-sm text-gray-600">Total Exposure</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">2.3%</div>
                  <div className="text-sm text-gray-600">Avg. PD</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Scenario Results</h2>
              <Button onClick={exportTCFDReport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export TCFD Report
              </Button>
            </div>

            {/* Portfolio Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Portfolio Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">Baseline Expected Loss</div>
                    <div className="text-2xl font-bold text-blue-700">
                      PKR {currencyFormat(results.totalBaselineLoss)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-600 mb-1">Scenario Expected Loss</div>
                    <div className="text-2xl font-bold text-red-700">
                      PKR {currencyFormat(results.totalScenarioLoss)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-orange-600 mb-1">Risk Increase</div>
                    <div className="text-2xl font-bold text-orange-700">
                      +{results.riskIncrease}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Exposures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Top Exposures
                </CardTitle>
                <CardDescription>Companies with highest risk increase</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Company</th>
                        <th className="text-left p-2">Sector</th>
                        <th className="text-left p-2">Geography</th>
                        <th className="text-right p-2">Amount</th>
                        <th className="text-right p-2">Baseline Risk</th>
                        <th className="text-right p-2">Scenario Risk</th>
                        <th className="text-right p-2">Emissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.topExposures.map((exposure, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{exposure.company}</td>
                          <td className="p-2">{exposure.sector}</td>
                          <td className="p-2">{exposure.geography}</td>
                          <td className="p-2 text-right">{currencyFormat(exposure.amount)}</td>
                          <td className="p-2 text-right">{exposure.baselineRisk}%</td>
                          <td className="p-2 text-right font-medium text-red-600">
                            {exposure.scenarioRisk}%
                          </td>
                          <td className="p-2 text-right">{currencyFormat(exposure.financedEmissions)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Sector Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Sector Risk Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.sectorBreakdown.map((sector, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{sector.sector}</div>
                          <div className="text-sm text-gray-600">
                            {sector.baselineRisk}% → {sector.scenarioRisk}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">+{sector.riskIncrease}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    Geographic Risk Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.geographyBreakdown.map((geo, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{geo.geography}</div>
                          <div className="text-sm text-gray-600">
                            {geo.baselineRisk}% → {geo.scenarioRisk}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-600">+{geo.riskIncrease}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioBuilding;

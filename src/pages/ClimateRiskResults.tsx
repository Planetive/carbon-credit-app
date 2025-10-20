import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Building,
  Download,
  FileText,
  PieChart,
  Zap
} from 'lucide-react';
import { type ScenarioResult } from './scenario-building/types';

const ClimateRiskResults: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get results data from navigation state
  const results = location.state?.results as ScenarioResult | undefined;
  const selectedScenario = location.state?.selectedScenario as string | undefined;
  const portfolioEntries = location.state?.portfolioEntries || [];

  // Redirect if no results data
  if (!results) {
    navigate('/scenario-building');
    return null;
  }

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

  const handleExportReport = () => {
    // TODO: Implement PDF export functionality
    console.log('Exporting TCFD report...');
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Climate Risk Results
                </h1>
                <p className="text-lg text-gray-600 mt-1">
                  {results.scenarioType} Scenario Analysis
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => navigate('/bank-portfolio')}
                className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:border-gray-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Portfolio</span>
              </Button>
              <Button
                onClick={handleExportReport}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                <span>Export Report</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(results.totalPortfolioValue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {portfolioEntries.length} investments
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Expected Loss</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(results.totalPortfolioLoss)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Under {results.scenarioType} scenario
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Loss Percentage</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {results.portfolioLossPercentage.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{results.riskIncrease.toFixed(2)}% vs baseline
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="space-y-8">
          
          {/* Risk Impact Summary - Full Width */}
            
            {/* Risk Impact Summary */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <span>Risk Impact Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Risk Calculation:</strong> Baseline risk represents the current portfolio risk level. 
                    Scenario risk shows the projected risk under climate stress conditions. 
                    The progress bars are scaled (×10) to better visualize the relative difference.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-600">Baseline Risk</span>
                      <span className="text-lg font-bold text-blue-900">{results.baselineRisk.toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(results.baselineRisk * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-red-600">Scenario Risk</span>
                      <span className="text-lg font-bold text-red-900">{results.scenarioRisk.toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-red-200 rounded-full h-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(results.scenarioRisk * 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-1">
                        +{results.riskIncrease.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Risk Increase</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-100">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {portfolioEntries.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Investments</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Breakdown Cards - 3 Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Risk Exposures */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Top Risk Exposures</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.topExposures.slice(0, 4).map((exposure, index) => (
                    <div key={exposure.company || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-red-600">{index + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-sm truncate">{exposure.company}</div>
                          <div className="text-xs text-gray-600 truncate">{exposure.sector}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 text-sm">
                          {formatCurrency(exposure.estimatedLoss || 0)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(exposure.amount || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sector Breakdown */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  <span>Sector Risk Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.sectorBreakdown.slice(0, 4).map((sector, index) => (
                    <div key={sector.sector} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-600">{index + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-sm truncate">{sector.sector}</div>
                          <div className="text-xs text-gray-600">{(sector.percentage || 0).toFixed(1)}% of portfolio</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 text-sm">
                          {formatCurrency(sector.estimatedLoss || 0)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(sector.amount || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Asset Class Breakdown */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span>Asset Class Risk Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.assetClassBreakdown.slice(0, 4).map((assetClass, index) => (
                    <div key={assetClass.assetClass} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 text-sm truncate">{assetClass.assetClass}</div>
                          <div className="text-xs text-gray-600">{(assetClass.percentage || 0).toFixed(1)}% of portfolio</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-red-600 text-sm">
                          {formatCurrency(assetClass.estimatedLoss || 0)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatCurrency(assetClass.amount || 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Bottom Section - Analysis Summary and Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Analysis Summary */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span>Analysis Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Scenario Type</span>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {results.scenarioType}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Analysis Date</span>
                    <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Investments</span>
                    <span className="text-sm font-medium">{portfolioEntries.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Actions */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5 text-indigo-600" />
                  <span>Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleExportReport}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export TCFD Report</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/scenario-building', { 
                    state: { 
                      portfolioEntries: portfolioEntries,
                      selectedScenario: selectedScenario 
                    } 
                  })}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Run New Analysis</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClimateRiskResults;

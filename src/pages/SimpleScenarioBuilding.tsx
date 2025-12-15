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
import { PortfolioClient } from '@/integrations/supabase/portfolioClient';
import { useToast } from '@/hooks/use-toast';

const SimpleScenarioBuilding: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [portfolioEntries, setPortfolioEntries] = useState<ScenarioPortfolioEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get navigation state - can be either direct data or wrapped in an object
  const navState = location.state as any;
  
  // Get portfolio data from BankPortfolio (passed via navigation state)
  // Can be direct array/object or nested in state.bankPortfolioData
  const bankPortfolioData = navState?.bankPortfolioData || 
    (Array.isArray(navState) ? navState : 
     (navState && !navState.portfolioEntries ? navState : undefined));
  
  // Check if we're coming back from results page with already converted data
  const resultsPageData = navState?.portfolioEntries ? {
    portfolioEntries: navState.portfolioEntries,
    selectedScenario: navState.selectedScenario 
  } : undefined;
  
  // Get referrer/source page to navigate back to
  const referrer = navState?.referrer || '/bank-portfolio';

  useEffect(() => {
    console.log('SimpleScenarioBuilding - Received data:', { bankPortfolioData, resultsPageData });
    
    // If coming back from results page with already converted portfolio data
    if (resultsPageData?.portfolioEntries) {
      console.log('SimpleScenarioBuilding - Using portfolio data from results page:', resultsPageData.portfolioEntries);
      setPortfolioEntries(resultsPageData.portfolioEntries);
      if (resultsPageData.selectedScenario) {
        setSelectedScenario(resultsPageData.selectedScenario);
      }
      setLoading(false); // Turn off loading when using results page data
      return;
    }
    
    // Original logic for BankPortfolio data
    if (bankPortfolioData) {
      // Handle both single entry and array of entries
      const portfolioArray = Array.isArray(bankPortfolioData) ? bankPortfolioData : [bankPortfolioData];
      
      console.log('SimpleScenarioBuilding - Portfolio array:', portfolioArray);
      console.log('SimpleScenarioBuilding - Total portfolio entries:', portfolioArray.length);
      
      // Convert BankPortfolio data to Scenario Building format (including entries with 0 amount)
      convertPortfolioToScenario(portfolioArray).then(convertedPortfolio => {
        console.log('SimpleScenarioBuilding - Converted portfolio:', convertedPortfolio);
        setPortfolioEntries(convertedPortfolio);
        setLoading(false); // Turn off loading after conversion completes
      }).catch(error => {
        console.error('Error converting portfolio:', error);
        // Fallback to loading real data from database on error
        loadRealPortfolioData();
      });
    } else {
      // Load real portfolio data from database instead of using sample data
      console.log('SimpleScenarioBuilding - Loading real portfolio data from database');
      loadRealPortfolioData();
    }
  }, [bankPortfolioData, resultsPageData]);

  const loadRealPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('SimpleScenarioBuilding - Loading portfolio data from database...');
      
      // Verify authentication first
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('User not authenticated. Please log in again.');
      }
      
      console.log('SimpleScenarioBuilding - User authenticated:', user.id);
      
      // Load counterparties and exposures from database (same logic as BankPortfolio)
      console.log('SimpleScenarioBuilding - Calling getCounterparties...');
      const counterparties = await PortfolioClient.getCounterparties();
      console.log('SimpleScenarioBuilding - Fetched counterparties:', counterparties?.length || 0);
      
      const exposures = await PortfolioClient.getExposures();
      console.log('SimpleScenarioBuilding - Fetched exposures:', exposures?.length || 0);
      
      if (!counterparties || counterparties.length === 0) {
        console.log('SimpleScenarioBuilding - No counterparties found in database');
        setPortfolioEntries([]);
        toast({
          title: "No Portfolio Data",
          description: "No companies found in your portfolio. Please add companies and complete finance emission calculations first.",
          variant: "default"
        });
        return;
      }
      
      if (!exposures || exposures.length === 0) {
        console.log('SimpleScenarioBuilding - No exposures found in database');
        setPortfolioEntries([]);
        toast({
          title: "No Exposure Data",
          description: "No exposure data found. Please add exposure information for your companies.",
          variant: "default"
        });
        return;
      }
      
      // Get outstanding amounts from exposures table (same as BankPortfolio)
      const counterpartyIds = counterparties.map(c => c.id);
      console.log('SimpleScenarioBuilding - Fetching outstanding amounts for counterparties:', counterpartyIds);
      
      const outstandingAmounts = await PortfolioClient.getOutstandingAmountsForCounterparties(counterpartyIds);
      console.log('SimpleScenarioBuilding - Fetched outstanding amounts for', outstandingAmounts.size, 'counterparties');
      
      // Combine counterparty and exposure data into PortfolioEntry format
      const portfolioEntries: PortfolioEntry[] = counterparties
        .map(counterparty => {
          const exposure = exposures.find(e => e.counterparty_id === counterparty.id);
          if (!exposure) return null;
          
          // Get outstanding amount from exposures table
          const outstandingAmount = outstandingAmounts.get(counterparty.id) || exposure.amount_pkr || 0;
          
          // Include all entries, even with zero amount (indicates finance emission not calculated)
          return {
            id: exposure.exposure_id,
            company: counterparty.name,
            amount: outstandingAmount,
            counterpartyType: counterparty.counterparty_type || 'SME',
            counterpartyId: counterparty.id,
            sector: counterparty.sector || 'N/A',
            geography: counterparty.geography || 'N/A',
            probabilityOfDefault: exposure.probability_of_default || 0,
            lossGivenDefault: exposure.loss_given_default || 0,
            tenor: exposure.tenor_months || 0
          };
        })
        .filter(Boolean) as PortfolioEntry[];
      
      if (portfolioEntries.length === 0) {
        console.log('SimpleScenarioBuilding - No portfolio entries found');
        setPortfolioEntries([]);
        toast({
          title: "No Portfolio Data",
          description: "No portfolio entries found. Please add companies to your portfolio.",
          variant: "default"
        });
        setLoading(false);
        return;
      }
      
      console.log('SimpleScenarioBuilding - Loaded portfolio entries from database:', portfolioEntries.length);
      
      // Convert to scenario format
      console.log('SimpleScenarioBuilding - Converting portfolio to scenario format...');
      try {
        const convertedPortfolio = await convertPortfolioToScenario(portfolioEntries);
        console.log('SimpleScenarioBuilding - Converted portfolio entries:', convertedPortfolio.length);
        setPortfolioEntries(convertedPortfolio);
      } catch (conversionError) {
        console.error('Error converting portfolio to scenario format:', conversionError);
        // If conversion fails, still set the entries so the page doesn't hang
        // The entries won't have assetClass/financedEmissions but will display
        const basicEntries = portfolioEntries.map(entry => ({
          ...entry,
          counterparty: entry.counterpartyType || 'N/A',
          assetClass: 'Business Loans', // Default fallback
          financedEmissions: 0 // Default fallback
        }));
        setPortfolioEntries(basicEntries as any);
        toast({
          title: "Conversion Warning",
          description: "Loaded portfolio data but some calculations may be incomplete.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading real portfolio data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load portfolio data. Please try again.');
      setPortfolioEntries([]);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load portfolio data from database. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      const backendPortfolioEntries = portfolioEntries.map(entry => {
        // Ensure counterparty field is set (fallback to counterpartyType if needed)
        const counterparty = entry.counterparty || (entry as any).counterpartyType || 'N/A';
        
        // Ensure all required fields have valid values
        const portfolioEntry = {
          id: entry.id || 'unknown',
          company: entry.company || 'Unknown Company',
          amount: entry.amount || 0,
          counterparty: counterparty,
          sector: entry.sector || 'Other',
          geography: entry.geography || 'N/A',
          probability_of_default: entry.probabilityOfDefault || 0,
          loss_given_default: entry.lossGivenDefault || 0,
          tenor: entry.tenor || 0
        };
        
        // Validate required fields before sending
        if (!portfolioEntry.counterparty || portfolioEntry.counterparty === 'undefined') {
          throw new Error(`Missing counterparty for entry: ${portfolioEntry.company}`);
        }
        if (!portfolioEntry.sector || portfolioEntry.sector === 'undefined') {
          throw new Error(`Missing sector for entry: ${portfolioEntry.company}`);
        }
        if (!portfolioEntry.geography || portfolioEntry.geography === 'undefined') {
          throw new Error(`Missing geography for entry: ${portfolioEntry.company}`);
        }
        
        return portfolioEntry;
      });

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

      // Call backend API with timeout
      const backendUrl = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000');
      const requestUrl = `${backendUrl}/scenario/calculate`;
      const requestBody = {
        scenario_type: backendScenarioType,
        portfolio_entries: backendPortfolioEntries
      };
      
      console.log('='.repeat(80));
      console.log('DEBUG: Frontend - Preparing scenario calculation request');
      console.log('DEBUG: VITE_BACKEND_URL env var:', import.meta.env.VITE_BACKEND_URL);
      console.log('DEBUG: Backend URL resolved to:', backendUrl);
      console.log('DEBUG: Request URL:', requestUrl);
      console.log('DEBUG: Request method: POST');
      console.log('DEBUG: Request origin:', window.location.origin);
      console.log('DEBUG: Request body size:', JSON.stringify(requestBody).length, 'bytes');
      console.log('DEBUG: Portfolio entries count:', backendPortfolioEntries.length);
      console.log('='.repeat(80));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let response;
      try {
        console.log('DEBUG: Frontend - Sending fetch request...');
        response = await fetch(requestUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
          credentials: 'include' // Include credentials for CORS
        });
        
        console.log('DEBUG: Frontend - Fetch completed');
        console.log('DEBUG: Response status:', response.status, response.statusText);
        console.log('DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));
        console.log('DEBUG: Response OK:', response.ok);
        console.log('DEBUG: CORS headers present:', {
          'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
          'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
          'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials'),
        });
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('DEBUG: Frontend - Fetch error caught:', error);
        console.error('DEBUG: Error name:', error.name);
        console.error('DEBUG: Error message:', error.message);
        console.error('DEBUG: Error stack:', error.stack);
        console.error('DEBUG: Attempted URL:', requestUrl);
        console.error('DEBUG: Backend URL from env:', backendUrl);
        
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. The backend may be slow or unresponsive. Please check if the backend server is running.');
        }
        
        // Enhanced error message for connection refused errors
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('NetworkError'))) {
          console.error('DEBUG: Connection refused error detected!');
          console.error('DEBUG: This usually means:');
          console.error('  1. Backend server is not running');
          console.error('  2. Backend is running on a different port');
          console.error('  3. Firewall is blocking the connection');
          console.error('  4. Frontend needs to be restarted to pick up VITE_BACKEND_URL');
          throw new Error(
            `Cannot connect to backend server at ${backendUrl}.\n\n` +
            `Please ensure:\n` +
            `1. Backend server is running (check terminal where you started it)\n` +
            `2. Backend is accessible at ${backendUrl}\n` +
            `3. If you changed .env file, restart the frontend dev server\n` +
            `4. Try accessing ${backendUrl}/health in your browser to verify backend is running`
          );
        }
        
        // Enhanced error message for CORS errors
        if (error.message && error.message.includes('CORS')) {
          console.error('DEBUG: CORS error detected!');
          console.error('DEBUG: This usually means:');
          console.error('  1. Backend is not returning proper CORS headers');
          console.error('  2. Backend OPTIONS preflight is failing');
          console.error('  3. Origin is not in allowed list');
          throw new Error(`CORS Error: ${error.message}. Check backend logs for CORS header details.`);
        }
        
        throw error;
      }
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          // Handle different error response formats
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            // FastAPI validation errors come as arrays
            errorMessage = errorData.detail.map((err: any) => {
              if (typeof err === 'string') return err;
              if (err?.msg) return err.msg;
              if (err?.loc && err?.msg) return `${err.loc.join('.')}: ${err.msg}`;
              return JSON.stringify(err);
            }).join(', ');
          } else if (errorData.detail && typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } catch (e) {
          // If we can't parse JSON, use the status message
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      let backendResults;
      try {
        backendResults = await response.json();
      } catch (parseError) {
        console.error('Error parsing backend response:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      // Validate backend results
      if (!backendResults || !backendResults.results || !Array.isArray(backendResults.results)) {
        throw new Error('Invalid response format from server. Expected results array.');
      }

      // Transform backend results to frontend format
      // Sort by climate_adjusted_expected_loss (estimatedLoss) descending - highest risk first
      const sortedResults = backendResults.results.sort((a, b) => b.climate_adjusted_expected_loss - a.climate_adjusted_expected_loss);

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

      const sectorBreakdownArray = Object.values(sectorBreakdown)
        .map((sector: any) => ({
          sector: sector.sector,
          amount: sector.amount,
          percentage: (sector.amount / backendResults.total_exposure) * 100,
          estimatedLoss: sector.estimatedLoss
        }))
        // Sort by estimatedLoss descending - highest risk first
        .sort((a, b) => b.estimatedLoss - a.estimatedLoss);

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

      const assetClassBreakdownArray = Object.values(assetClassBreakdown)
        .map((assetClass: any) => ({
          assetClass: assetClass.assetClass,
          amount: assetClass.amount,
          percentage: (assetClass.amount / backendResults.total_exposure) * 100,
          estimatedLoss: assetClass.estimatedLoss
        }))
        // Sort by estimatedLoss descending - highest risk first
        .sort((a, b) => b.estimatedLoss - a.estimatedLoss);

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

      // Navigate to results page with data (pass referrer so we can navigate back correctly)
      navigate('/climate-risk-results', {
        state: {
          results,
          selectedScenario,
          portfolioEntries,
          referrer: referrer // Pass referrer to results page
        }
      });
      clearInterval(progressInterval);
    } catch (err) {
      console.error('Scenario calculation error:', err);
      
      // Better error message extraction
      let errorMessage = 'Failed to run scenario analysis';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        // Try to extract message from error object
        if ('message' in err && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if ('detail' in err) {
          if (typeof err.detail === 'string') {
            errorMessage = err.detail;
          } else {
            errorMessage = JSON.stringify(err.detail);
          }
        } else {
          errorMessage = JSON.stringify(err);
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Calculation Error",
        description: errorMessage,
        variant: "destructive"
      });
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
    <>
      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="bg-white shadow-xl max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Loading Portfolio Data</h3>
                  <p className="text-sm text-gray-600">Fetching your portfolio data from the database...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
                onClick={() => navigate(referrer)}
                className="flex items-center space-x-3 px-6 py-3 bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:border-gray-300 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
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
    </>
  );
};

export default SimpleScenarioBuilding;

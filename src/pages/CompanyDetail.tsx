import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Building2, Wallet, Calculator, TrendingUp, BarChart3, MapPin, Shield, Calendar, Hash, Layers, Edit, CheckCircle } from 'lucide-react';
import { PortfolioClient, EmissionCalculation } from '@/integrations/supabase/portfolioClient';
import { useToast } from '@/hooks/use-toast';

const currencyFormat = (value: number) => (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

interface PortfolioEntry {
  id: string;
  company: string;
  amount: number;
  counterpartyType: string;
  counterpartyId?: string;
  sector: string;
  geography: string;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
}

const CompanyDetail: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { id } = useParams();
  const location = useLocation() as any;
  const currentPath = location.pathname; // e.g., '/bank-portfolio/0001'
  
  // State for portfolio data (can be loaded from state or database)
  const [portfolioData, setPortfolioData] = useState<PortfolioEntry>(
    location?.state || {
      company: 'Company',
      amount: 0,
      counterparty: 'N/A',
      sector: 'N/A',
      geography: 'N/A',
      probabilityOfDefault: 0,
      lossGivenDefault: 0,
      tenor: 0
    }
  );

  // Load all portfolio entries for scenario building
  const [allPortfolioEntries, setAllPortfolioEntries] = useState<PortfolioEntry[]>([]);
  
  // Load company data from database if location.state is missing (e.g., when navigating back)
  useEffect(() => {
    const loadCompanyData = async () => {
      // If we already have state data, don't reload
      if (location?.state && Object.keys(location.state).length > 0) {
        return;
      }

      // If we have an id parameter, try to load the company data from the database
      if (!id) {
        return;
      }

      try {
        const counterparties = await PortfolioClient.getCounterparties();
        const exposures = await PortfolioClient.getExposures();
        
        // Combine counterparty and exposure data
        const portfolioEntries: PortfolioEntry[] = exposures.map(exposure => {
          const counterparty = counterparties.find(cp => cp.id === exposure.counterparty_id);
          return {
            id: exposure.exposure_id,
            company: counterparty?.name || 'Unknown Company',
            amount: exposure.amount_pkr,
            counterpartyType: counterparty?.counterparty_type || 'SME',
            counterpartyId: counterparty?.id,
            sector: counterparty?.sector || 'N/A',
            geography: counterparty?.geography || 'N/A',
            probabilityOfDefault: exposure.probability_of_default,
            lossGivenDefault: exposure.loss_given_default,
            tenor: exposure.tenor_months
          };
        });
        
        setAllPortfolioEntries(portfolioEntries);
        
        // Find the company matching the id parameter
        const matchingEntry = portfolioEntries.find(entry => entry.id === id);
        if (matchingEntry) {
          console.log('CompanyDetail - Loaded company data from database for id:', id, matchingEntry);
          setPortfolioData(matchingEntry);
        } else {
          console.warn('CompanyDetail - No matching entry found for id:', id);
        }
      } catch (error) {
        console.error('Error loading company data:', error);
      }
    };
    
    loadCompanyData();
  }, [id, location?.state]);

  // Load all portfolio entries for scenario building
  useEffect(() => {
    const loadAllPortfolioEntries = async () => {
      try {
        const counterparties = await PortfolioClient.getCounterparties();
        const exposures = await PortfolioClient.getExposures();
        
        // Combine counterparty and exposure data
        const portfolioEntries: PortfolioEntry[] = exposures.map(exposure => {
          const counterparty = counterparties.find(cp => cp.id === exposure.counterparty_id);
          return {
            id: exposure.exposure_id,
            company: counterparty?.name || 'Unknown Company',
            amount: exposure.amount_pkr,
            counterpartyType: counterparty?.counterparty_type || 'SME',
            counterpartyId: counterparty?.id,
            sector: counterparty?.sector || 'N/A',
            geography: counterparty?.geography || 'N/A',
            probabilityOfDefault: exposure.probability_of_default,
            lossGivenDefault: exposure.loss_given_default,
            tenor: exposure.tenor_months
          };
        });
        
        setAllPortfolioEntries(portfolioEntries);
      } catch (error) {
        console.error('Error loading portfolio entries:', error);
      }
    };
    
    loadAllPortfolioEntries();
  }, []);
  
  const {
    company,
    amount,
    counterparty,
    counterpartyId,
    sector,
    geography,
    probabilityOfDefault,
    lossGivenDefault,
    tenor
  } = portfolioData;

  // State for emission calculations
  const [emissionCalculations, setEmissionCalculations] = useState<EmissionCalculation[]>([]);
  const [loading, setLoading] = useState(true);

  // Load emission calculations for this counterparty
  const loadEmissionCalculations = async () => {
    if (!counterpartyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 CompanyDetail - Loading emission calculations for counterpartyId:', counterpartyId);
      const calculations = await PortfolioClient.getEmissionCalculations(counterpartyId);
      console.log('🔍 CompanyDetail - Loaded calculations:', calculations);
      console.log('🔍 CompanyDetail - Finance calculations:', calculations.filter(c => c.calculation_type === 'finance'));
      console.log('🔍 CompanyDetail - Facilitated calculations:', calculations.filter(c => c.calculation_type === 'facilitated'));
      setEmissionCalculations(calculations);
    } catch (error) {
      console.error('Error loading emission calculations:', error);
      toast({
        title: "Error",
        description: "Failed to load emission calculations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load emission calculations on mount and when counterpartyId changes
  useEffect(() => {
    loadEmissionCalculations();
  }, [counterpartyId]);

  // Reload emission calculations when component becomes visible (e.g., when returning from wizard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && counterpartyId) {
        loadEmissionCalculations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also reload on focus (when user navigates back to this tab)
    const handleFocus = () => {
      if (counterpartyId) {
        loadEmissionCalculations();
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [counterpartyId]);

  // Reload emission calculations when location changes (e.g., when returning from wizard)
  useEffect(() => {
    if (counterpartyId && location.pathname.includes('/bank-portfolio/')) {
      // Small delay to ensure navigation is complete
      const timer = setTimeout(() => {
        loadEmissionCalculations();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname, counterpartyId]);

  // Helper functions to get emission results
  const getFinanceEmissionResult = () => {
    // Filter finance calculations and exclude null/zero emissions
    const financeCalculations = emissionCalculations
      .filter(calc => 
        calc.calculation_type === 'finance' && 
        calc.financed_emissions !== null && 
        calc.financed_emissions !== undefined &&
        calc.financed_emissions > 0 &&
        isFinite(calc.financed_emissions)
      )
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    console.log('🔍 CompanyDetail - getFinanceEmissionResult - Filtered calculations:', financeCalculations);
    console.log('🔍 CompanyDetail - getFinanceEmissionResult - Selected result:', financeCalculations[0]);
    
    if (financeCalculations[0]) return financeCalculations[0];

    // Fallback to cached summary if DB returned nothing (immediate return from wizard)
    try {
      if (counterpartyId) {
        const cacheKey = `latestEmissionSummary:${counterpartyId}:finance`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('🔍 CompanyDetail - Using cached finance emission summary:', parsed);
          return {
            id: 'cached',
            user_id: '',
            counterparty_id: counterpartyId,
            exposure_id: null,
            questionnaire_id: null,
            calculation_type: 'finance',
            company_type: '',
            formula_id: 'aggregate',
            inputs: {},
            results: {},
            financed_emissions: parsed.financed_emissions || 0,
            attribution_factor: parsed.attribution_factor || 0,
            evic: parsed.denominator_value || 0,
            total_equity_plus_debt: parsed.denominator_value || 0,
            status: 'completed',
            created_at: parsed.updated_at,
            updated_at: parsed.updated_at
          } as any;
        }
      }
    } catch {}

    return undefined;
  };

  const getFacilitatedEmissionResult = () => {
    // Filter facilitated calculations and exclude null/zero emissions
    const facilitatedCalculations = emissionCalculations
      .filter(calc => 
        calc.calculation_type === 'facilitated' && 
        calc.financed_emissions !== null && 
        calc.financed_emissions !== undefined &&
        calc.financed_emissions > 0 &&
        isFinite(calc.financed_emissions)
      )
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    
    console.log('🔍 CompanyDetail - getFacilitatedEmissionResult - Filtered calculations:', facilitatedCalculations);
    console.log('🔍 CompanyDetail - getFacilitatedEmissionResult - Selected result:', facilitatedCalculations[0]);

    if (facilitatedCalculations[0]) return facilitatedCalculations[0];

    // Fallback to cached summary
    try {
      if (counterpartyId) {
        const cacheKey = `latestEmissionSummary:${counterpartyId}:facilitated`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          console.log('🔍 CompanyDetail - Using cached facilitated emission summary:', parsed);
          return {
            id: 'cached',
            user_id: '',
            counterparty_id: counterpartyId,
            exposure_id: null,
            questionnaire_id: null,
            calculation_type: 'facilitated',
            company_type: '',
            formula_id: 'aggregate',
            inputs: {},
            results: {},
            financed_emissions: parsed.financed_emissions || 0,
            attribution_factor: parsed.attribution_factor || 0,
            evic: parsed.denominator_value || 0,
            total_equity_plus_debt: parsed.denominator_value || 0,
            status: 'completed',
            created_at: parsed.updated_at,
            updated_at: parsed.updated_at
          } as any;
        }
      }
    } catch {}

    return undefined;
  };

  const formatEmissionValue = (value: number | null) => {
    if (!value || !isFinite(value)) return '0';
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate('/bank-portfolio')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portfolio
          </Button>
        </div>

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/90 to-cyan-600/90"></div>
          <div className="relative p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{company}</h1>
                    <p className="text-teal-100 text-lg">Loan Portfolio Management</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-5 w-5" />
                      <span className="text-sm font-medium">Loan Amount</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{currencyFormat(amount)} PKR</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-5 w-5" />
                      <span className="text-sm font-medium">Counterparty Type</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{portfolioData.counterpartyType || 'SME'}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-sm font-medium">Sector</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{sector}</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5" />
                      <span className="text-sm font-medium">Geography</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold">{geography}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Risk Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Credit Risk & Loan Details
            </CardTitle>
            <CardDescription>Key risk metrics and loan terms for this counterparty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-red-700">Probability of Default</span>
                </div>
                <div className="text-3xl font-bold text-red-600">{probabilityOfDefault}%</div>
                <div className="text-xs text-red-500 mt-1">Baseline PD</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Loss Given Default</span>
                </div>
                <div className="text-3xl font-bold text-orange-600">{lossGivenDefault}%</div>
                <div className="text-xs text-orange-500 mt-1">Baseline LGD</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Tenor/Maturity</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">{tenor}</div>
                <div className="text-xs text-blue-500 mt-1">months</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center shadow-sm">
                  <Calculator className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl text-green-800">Finance Emission</CardTitle>
                  <CardDescription className="text-green-600">
                    {getFinanceEmissionResult() ? 
                      `Last updated: ${new Date(getFinanceEmissionResult()?.updated_at || '').toLocaleDateString()}` : 
                      'Calculate financed emissions for this loan'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Loading emission data...</div>
                </div>
              ) : getFinanceEmissionResult() ? (
                <div className="space-y-4">
                  {/* Main Emission Value Card */}
                  <div className="bg-white rounded-xl p-5 border shadow-sm">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {formatEmissionValue(getFinanceEmissionResult()?.financed_emissions)} tCO₂e
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Action Button */}
                  <Button
                    onClick={() => navigate('/finance-emission', { 
                      state: { 
                        mode: 'finance', 
                        startFresh: true, 
                        returnUrl: currentPath,
                        ...portfolioData 
                      } 
                    })}
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Calculation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Assess the carbon footprint associated with this specific loan using PCAF methodology.
                  </p>
                  <Button
                    onClick={() => navigate('/finance-emission', { state: { mode: 'finance', ...portfolioData } })}
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    Open Finance Emission Calculator
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-sm">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl text-blue-800">Facilitated Emission</CardTitle>
                  <CardDescription className="text-blue-600">
                    {getFacilitatedEmissionResult() ? 
                      `Last updated: ${new Date(getFacilitatedEmissionResult()?.updated_at || '').toLocaleDateString()}` : 
                      'Calculate facilitated emissions for this loan'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">
                  <div className="text-sm text-muted-foreground">Loading emission data...</div>
                </div>
              ) : getFacilitatedEmissionResult() ? (
                <div className="space-y-4">
                  {/* Main Emission Value Card */}
                  <div className="bg-white rounded-xl p-5 border shadow-sm">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {formatEmissionValue(getFacilitatedEmissionResult()?.financed_emissions)} tCO₂e
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Action Button */}
                  <Button
                    onClick={() => navigate('/finance-emission', { 
                      state: { 
                        mode: 'facilitated', 
                        startFresh: true, 
                        returnUrl: currentPath,
                        ...portfolioData 
                      } 
                    })}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Calculation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Evaluate the environmental impact of facilitating this loan using advanced metrics.
                  </p>
                  <Button
                    onClick={() => navigate('/finance-emission', { state: { mode: 'facilitated', ...portfolioData } })}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    Open Facilitated Emission Calculator
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-50 to-violet-50">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Layers className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Scenario Building & Risk Analysis</CardTitle>
                  <CardDescription>Build scenarios and assess climate risks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create and evaluate various scenarios including stress testing, climate scenarios, and market conditions. 
                Includes comprehensive risk analysis with credit risk, climate risk, and portfolio impact assessment.
              </p>
              <Button
                onClick={() => navigate('/scenario-building', { 
                  state: {
                    bankPortfolioData: allPortfolioEntries,
                    referrer: currentPath 
                  }
                })}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                Open Scenario Builder & Risk Analysis
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetail;



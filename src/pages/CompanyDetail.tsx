import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Building2, Wallet, Calculator, TrendingUp, BarChart3, MapPin, Shield, Calendar, Hash, Layers, Edit, CheckCircle, Activity, Zap, Target, AlertCircle, Info, Sparkles } from 'lucide-react';
import { PortfolioClient, EmissionCalculation } from '@/integrations/supabase/portfolioClient';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

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
      counterpartyType: 'N/A',
      sector: 'N/A',
      geography: 'N/A',
      probabilityOfDefault: 0,
      lossGivenDefault: 0,
      tenor: 0
    }
  );

  // Load all portfolio entries for scenario building
  const [allPortfolioEntries, setAllPortfolioEntries] = useState<PortfolioEntry[]>([]);

  // Ensure we don't accidentally reuse wizard-specific fields like `mode`/`returnUrl`
  const { mode: _ignoredMode, returnUrl: _ignoredReturnUrl, ...cleanPortfolioData } = (portfolioData as any) || {};
  
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
    counterpartyType,
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
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-cyan-50/30 relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(20, 184, 166) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(20, 184, 166) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
        
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {/* Summary Card - Key Metrics Overview */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Card className="border border-teal-100/50 shadow-xl bg-gradient-to-r from-teal-50/50 via-cyan-50/30 to-teal-50/50 backdrop-blur-sm rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 flex-1">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-xl">
                    <Building2 className="h-10 w-10 text-white" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-teal-700 to-cyan-700 bg-clip-text text-transparent mb-2">
                      {company}
                    </h1>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-teal-100 text-teal-700 border-teal-300 rounded-full px-3 py-1">
                        {portfolioData.counterpartyType || 'SME'}
                      </Badge>
                      <span className="text-sm text-gray-600">Portfolio Company</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/dashboard', { state: { activeSection: 'portfolio' } })}
                    className="border-teal-200 text-teal-700 hover:bg-teal-50 hover:border-teal-300 rounded-xl transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portfolio
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Hero Stats - Wrapped in Card for Consistency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6"
        >
          <Card className="border border-gray-200/60 shadow-lg bg-white/90 backdrop-blur-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-800">Company Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 p-5 border-2 border-teal-100/80 shadow-md hover:shadow-xl hover:border-teal-300 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-teal-200/20 rounded-full -mr-14 -mt-14"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
                        <Wallet className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-teal-700">Loan Amount</span>
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="text-3xl font-bold text-teal-600 mb-2"
                    >
                      {currencyFormat(amount)}
                    </motion.div>
                    <div className="text-xs text-teal-500 font-medium">PKR</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 p-5 border-2 border-cyan-100/80 shadow-md hover:shadow-xl hover:border-cyan-300 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-200/20 rounded-full -mr-14 -mt-14"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-cyan-700">Sector</span>
                    </div>
                    <div className="text-2xl font-bold text-cyan-600 mb-2 truncate">{sector}</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 border-2 border-emerald-100/80 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-200/20 rounded-full -mr-14 -mt-14"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-emerald-700">Geography</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 mb-2 truncate">{geography}</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 border-2 border-blue-100/80 shadow-md hover:shadow-xl hover:border-blue-300 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-blue-200/20 rounded-full -mr-14 -mt-14"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-blue-700">Tenor</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{tenor}</div>
                    <div className="text-xs text-blue-500 font-medium">months</div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Credit Risk Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="mb-6 border border-gray-200/60 shadow-xl bg-white/90 backdrop-blur-sm rounded-2xl">
            <CardHeader className="pb-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-800">Credit Risk & Loan Details</CardTitle>
                  <CardDescription className="text-base text-gray-600">Key risk metrics and loan terms for this counterparty</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* PD Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 p-6 border-2 border-red-100/80 shadow-lg hover:shadow-xl hover:border-red-200 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-red-200/20 rounded-full -mr-20 -mt-20"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-14 w-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-md">
                        <AlertCircle className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-red-700">Probability of Default</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-red-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The likelihood that a borrower will default on their loan obligations within a given time period.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="text-5xl font-bold text-red-600 mb-3">{probabilityOfDefault}%</div>
                    <div className="text-xs text-red-500 mt-3 font-medium">Baseline PD</div>
                  </div>
                </motion.div>
                
                {/* LGD Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-6 border-2 border-orange-100/80 shadow-lg hover:shadow-xl hover:border-orange-200 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-orange-200/20 rounded-full -mr-20 -mt-20"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-14 w-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-md">
                        <Target className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold text-orange-700">Loss Given Default</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-orange-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>The percentage of exposure that would be lost if a default occurs, accounting for recovery value.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="text-5xl font-bold text-orange-600 mb-3">{lossGivenDefault}%</div>
                    <div className="text-xs text-orange-500 mt-3 font-medium">Baseline LGD</div>
                  </div>
                </motion.div>
                
                {/* Tenor Card */}
                <motion.div 
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 border-2 border-blue-100/80 shadow-lg hover:shadow-xl hover:border-blue-200 transition-all duration-300"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/20 rounded-full -mr-20 -mt-20"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                        <Calendar className="h-7 w-7 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-blue-700">Tenor/Maturity</span>
                    </div>
                    <div className="text-5xl font-bold text-blue-600 mb-3">{tenor}</div>
                    <div className="text-xs text-blue-500 mt-3 font-medium">months</div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Emission Cards - Matching Credit Risk Style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {/* Finance Emission Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-2 border-green-100/80 shadow-lg hover:shadow-xl hover:border-green-200 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-green-200/20 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-md">
                  <Calculator className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-green-700">Finance Emission</span>
              </div>
              
              {loading ? (
                <div className="text-center py-6">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-xs text-green-500 font-medium">Loading...</p>
                </div>
              ) : getFinanceEmissionResult() ? (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    className="text-5xl font-bold text-green-600 mb-3"
                  >
                    {formatEmissionValue(getFinanceEmissionResult()?.financed_emissions)}
                  </motion.div>
                  <div className="flex items-center gap-1 mb-5">
                    <span className="text-xs text-green-500 font-medium">tCO₂e</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-green-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Tonnes of carbon dioxide equivalent - a standard unit for measuring carbon footprint.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-5xl font-bold text-green-300 mb-3">—</div>
                  <div className="text-xs text-green-500 mt-2 mb-4 font-medium">Not calculated</div>
                  <div className="bg-green-50 rounded-xl p-4 mb-5 border-2 border-green-100">
                    <p className="text-xs text-green-700 leading-relaxed">
                      Calculate financed emissions using PCAF methodology to assess the carbon footprint of this loan.
                    </p>
                  </div>
                </>
              )}
              
              <Button
              onClick={() => navigate('/finance-emission', { 
                state: getFinanceEmissionResult() ? {
                  ...cleanPortfolioData,
                  mode: 'finance', 
                  startFresh: true, 
                  returnUrl: currentPath
                } : { 
                  ...cleanPortfolioData,
                  mode: 'finance' 
                }
              })}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 rounded-xl h-11"
                size="default"
              >
                {getFinanceEmissionResult() ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Calculation
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Calculate Emissions
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Facilitated Emission Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 border-2 border-blue-100/80 shadow-lg hover:shadow-xl hover:border-blue-200 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200/20 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md">
                  <BarChart3 className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-blue-700">Facilitated Emission</span>
              </div>
              
              {loading ? (
                <div className="text-center py-6">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-xs text-blue-500 font-medium">Loading...</p>
                </div>
              ) : getFacilitatedEmissionResult() ? (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    className="text-5xl font-bold text-blue-600 mb-3"
                  >
                    {formatEmissionValue(getFacilitatedEmissionResult()?.financed_emissions)}
                  </motion.div>
                  <div className="flex items-center gap-1 mb-5">
                    <span className="text-xs text-blue-500 font-medium">tCO₂e</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-blue-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Tonnes of carbon dioxide equivalent - a standard unit for measuring carbon footprint.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-5xl font-bold text-blue-300 mb-3">—</div>
                  <div className="text-xs text-blue-500 mt-2 mb-4 font-medium">Not calculated</div>
                </>
              )}
              
              <Button
              onClick={() => navigate('/finance-emission', { 
                state: getFacilitatedEmissionResult() ? {
                  ...cleanPortfolioData,
                  mode: 'facilitated', 
                  startFresh: true, 
                  returnUrl: currentPath
                } : { 
                  ...cleanPortfolioData,
                  mode: 'facilitated' 
                }
              })}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 rounded-xl h-11"
                size="default"
              >
                {getFacilitatedEmissionResult() ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Calculation
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Calculate Emissions
                  </>
                )}
              </Button>
            </div>
          </motion.div>

          {/* Scenario Building Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-violet-50 p-6 border-2 border-purple-100/80 shadow-lg hover:shadow-xl hover:border-purple-200 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-200/20 rounded-full -mr-20 -mt-20"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                  <Layers className="h-7 w-7 text-white" />
                </div>
                <span className="text-sm font-semibold text-purple-700">Risk Analysis</span>
              </div>
              
              <div className="mb-5">
                <p className="text-sm text-purple-600 leading-relaxed">
                  Build scenarios and assess climate risks with comprehensive analysis tools
                </p>
              </div>
              
              <Button
                onClick={() => navigate('/scenario-building', { 
                  state: {
                    bankPortfolioData: allPortfolioEntries,
                    referrer: currentPath 
                  }
                })}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 rounded-xl h-11"
                size="default"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Open Scenario Builder
              </Button>
            </div>
          </motion.div>
        </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CompanyDetail;



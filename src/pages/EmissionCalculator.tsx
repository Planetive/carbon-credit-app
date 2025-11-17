import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight,
  Factory,
  Zap,
  Thermometer,
  Flame,
  Snowflake,
  Car,
  Truck,
  Plus,
  Save,
  Trash2,
  Settings,
  Info,
  Building2,
  X,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EmissionData, ScopeTotals } from "@/components/emissions/shared/types";
import FuelEmissions from "@/components/emissions/scope1/FuelEmissions";
import RefrigerantEmissions from "@/components/emissions/scope1/RefrigerantEmissions";
import PassengerVehicleEmissions from "@/components/emissions/scope1/PassengerVehicleEmissions";
import DeliveryVehicleEmissions from "@/components/emissions/scope1/DeliveryVehicleEmissions";
import ElectricityEmissions from "@/components/emissions/scope2/ElectricityEmissions";
import HeatSteamEmissions from "@/components/emissions/scope2/HeatSteamEmissions";
import Scope3Section from "@/components/emissions/scope3/Scope3Section";
import Scope3Questionnaire from "@/components/emissions/scope3/Scope3Questionnaire";

const EmissionCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeScope, setActiveScope] = useState("scope1");
  const [activeCategory, setActiveCategory] = useState("fuel");
  const [resetKey, setResetKey] = useState(0);
  const [hasWizardContext, setHasWizardContext] = useState(false);
  const [wizardMode, setWizardMode] = useState<'finance' | 'facilitated'>('finance');
  const [companyContext, setCompanyContext] = useState<{
    counterpartyId: string;
    returnUrl: string;
    timestamp: number;
  } | null>(null);
  const [expandedScopes, setExpandedScopes] = useState<{[key: string]: boolean}>({
    scope1: true,
    scope2: true,
    scope3: true
  });
  const [scope3GroupsExpanded, setScope3GroupsExpanded] = useState<{ upstream: boolean; downstream: boolean }>({ upstream: false, downstream: false });
  const [scope3QuestionnaireCompleted, setScope3QuestionnaireCompleted] = useState(false);
  const [scope3CalculationMode, setScope3CalculationMode] = useState<'lca' | 'manual' | null>(null);
  const [emissionData, setEmissionData] = useState<EmissionData>({
    scope1: {
      fuel: [],
      refrigerant: [],
      passengerVehicle: [],
      deliveryVehicle: [],
    },
    scope2: [],
    scope3: [],
  });

  // Calculate totals
  const scopeTotals: ScopeTotals = {
    scope1: emissionData.scope1.fuel.reduce((sum, r) => sum + (r.emissions || 0), 0) +
            emissionData.scope1.refrigerant.reduce((sum, r) => sum + (r.emissions || 0), 0) +
            emissionData.scope1.passengerVehicle.reduce((sum, r) => sum + (r.emissions || 0), 0) +
            emissionData.scope1.deliveryVehicle.reduce((sum, r) => sum + (r.emissions || 0), 0),
    scope2: emissionData.scope2.reduce((sum, r) => sum + (r.emissions || 0), 0),
    scope3: emissionData.scope3.reduce((sum, r) => sum + (r.emissions || 0), 0),
    total: 0,
  };
  scopeTotals.total = scopeTotals.scope1 + scopeTotals.scope2 + scopeTotals.scope3;

  // Handle individual category data changes
  const handleFuelDataChange = (data: any[]) => {
    setEmissionData(prev => ({
      ...prev,
      scope1: { ...prev.scope1, fuel: data },
    }));
  };

  const handleRefrigerantDataChange = (data: any[]) => {
    setEmissionData(prev => ({
      ...prev,
      scope1: { ...prev.scope1, refrigerant: data },
    }));
  };

  const handlePassengerVehicleDataChange = (data: any[]) => {
    setEmissionData(prev => ({
      ...prev,
      scope1: { ...prev.scope1, passengerVehicle: data },
    }));
  };

  const handleDeliveryVehicleDataChange = (data: any[]) => {
    setEmissionData(prev => ({
      ...prev,
      scope1: { ...prev.scope1, deliveryVehicle: data },
    }));
  };

  const handleElectricityDataChange = (total: number) => {
    setEmissionData(prev => ({
      ...prev,
      scope2: [{ id: 'electricity-total', emissions: total }] as any,
    }));
  };

  const handleHeatSteamDataChange = (total: number) => {
    setEmissionData(prev => ({
      ...prev,
      scope2: [...prev.scope2.filter(item => item.id !== 'heat-total'), { id: 'heat-total', emissions: total }] as any,
    }));
  };

  // Scope 3: Purchased Goods & Services - simple frontend data capture
  const addPurchasedGoodsEntry = (entry: {
    supplierName: string;
    materialTonnes: number;
    transportMethod: string;
    supplierScore?: number;
  }) => {
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3,
        {
          id: `pgs-${Date.now()}`,
          category: 'purchased_goods_services',
          activity: `${entry.supplierName} | ${entry.transportMethod}`,
          unit: 'tonnes',
          quantity: entry.materialTonnes,
          emissions: 0
        }
      ]
    }));
  };

  const removeScope3Row = (rowId: string) => {
    setEmissionData(prev => ({
      ...prev,
      scope3: prev.scope3.filter(r => r.id !== rowId)
    }));
  };

  // Scope 3: Capital Goods - simple frontend data capture
  const addCapitalGoodsEntry = (entry: {
    equipmentSpecs: string;
    country: string;
    materials: string;
    lcaAvailable: string; // 'yes' | 'no'
  }) => {
    setEmissionData(prev => ({
      ...prev,
      scope3: [
        ...prev.scope3,
        {
          id: `capg-${Date.now()}`,
          category: 'capital_goods',
          activity: `${entry.equipmentSpecs} | ${entry.country}`,
          unit: 'item',
          quantity: 1,
          emissions: 0
        }
      ]
    }));
  };

  // Save company emissions to database
  const saveCompanyEmissions = async (scopeTotals: ScopeTotals) => {
    if (!companyContext) return;

    try {
      const { PortfolioClient } = await import('@/integrations/supabase/portfolioClient');
      
      await PortfolioClient.upsertCompanyEmissions({
        counterparty_id: companyContext.counterpartyId,
        is_bank_emissions: false,
        scope1_emissions: scopeTotals.scope1,
        scope2_emissions: scopeTotals.scope2,
        scope3_emissions: scopeTotals.scope3,
        calculation_source: 'emission_calculator',
        notes: 'Calculated using emission calculator'
      });

      console.log('Company emissions saved successfully:', {
        counterpartyId: companyContext.counterpartyId,
        scope1: scopeTotals.scope1,
        scope2: scopeTotals.scope2,
        scope3: scopeTotals.scope3
      });

      // Clear company context
      sessionStorage.removeItem('companyEmissionsContext');
      
      // Navigate back to finance form with counterpartyId using React Router
      const returnUrl = `${companyContext.returnUrl}?counterpartyId=${companyContext.counterpartyId}`;
      navigate(returnUrl);
      
    } catch (error) {
      console.error('Error saving company emissions:', error);
      toast({
        title: "Error",
        description: "Failed to save company emissions. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Detect if we arrived from the questionnaire wizard
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromWizard = params.get('from') === 'wizard';
      const modeParam = params.get('mode');
      const counterpartyId = params.get('counterpartyId');
      const saved = sessionStorage.getItem('esgWizardState');
      
      if (fromWizard && saved) {
        const parsed = JSON.parse(saved);
        const recentEnough = typeof parsed?.ts === 'number' ? (Date.now() - parsed.ts) < 1000 * 60 * 30 : true; // 30 min window
        if (recentEnough) {
          setHasWizardContext(true);
          if (modeParam === 'finance' || modeParam === 'facilitated') {
            setWizardMode(modeParam);
          } else if (parsed?.mode) {
            setWizardMode(parsed.mode);
          }
          
          // Reset calculator when coming from wizard
          resetCalculatorState();
          
          // If we have a counterpartyId from the URL, set it as company context
          if (counterpartyId) {
            console.log('Setting company context from URL:', { counterpartyId, returnUrl: '/finance-emission' });
            setCompanyContext({
              counterpartyId,
              returnUrl: '/finance-emission',
              timestamp: Date.now()
            });
          }
        } else {
          setHasWizardContext(false);
          // Reset calculator when wizard context expires
          resetCalculatorState();
        }
      } else {
        setHasWizardContext(false);
        // Reset calculator when no wizard context
        resetCalculatorState();
      }
    } catch {
      setHasWizardContext(false);
      // Reset calculator on error
      resetCalculatorState();
    }
  }, []);

  // Detect company context for editing company emissions
  useEffect(() => {
    try {
      const companyContextData = sessionStorage.getItem('companyEmissionsContext');
      if (companyContextData) {
        const parsed = JSON.parse(companyContextData);
        const recentEnough = (Date.now() - parsed.timestamp) < 1000 * 60 * 30; // 30 min window
        if (recentEnough) {
          setCompanyContext(parsed);
          console.log('Company context detected:', parsed);
          
          // Load existing company emission data if available
          loadExistingCompanyEmissions(parsed.counterpartyId);
        } else {
          sessionStorage.removeItem('companyEmissionsContext');
          // Reset calculator when context expires
          resetCalculatorState();
        }
      } else {
        // Check URL parameters for company context (but don't override if coming from wizard)
        const urlParams = new URLSearchParams(window.location.search);
        const fromWizard = urlParams.get('from') === 'wizard';
        const counterpartyId = urlParams.get('counterpartyId');
        
        // Only set company context if not coming from wizard (wizard already sets it correctly)
        if (counterpartyId && !fromWizard) {
          setCompanyContext({
            counterpartyId,
            returnUrl: '/bank-portfolio',
            timestamp: Date.now()
          });
          console.log('Company context from URL:', counterpartyId);
          loadExistingCompanyEmissions(counterpartyId);
        } else if (!counterpartyId) {
          // No company context - reset calculator for individual use
          console.log('No company context - resetting for individual use');
          resetCalculatorState();
          setCompanyContext(null);
        }
        // If fromWizard is true, the first useEffect already set companyContext correctly
      }
    } catch (error) {
      console.error('Error parsing company context:', error);
      // Reset calculator on error
      resetCalculatorState();
    }
  }, []);

  // Load existing company emission data
  const loadExistingCompanyEmissions = async (counterpartyId: string) => {
    try {
      const { PortfolioClient } = await import('@/integrations/supabase/portfolioClient');
      const existingEmissions = await PortfolioClient.getCompanyEmissions(counterpartyId, false);
      
      // Always reset calculator state first, regardless of existing data
      resetCalculatorState();
      
      if (existingEmissions) {
        console.log('Loading existing company emissions:', existingEmissions);
        
        // Show existing data notification
        if (existingEmissions.scope1_emissions > 0 || existingEmissions.scope2_emissions > 0 || existingEmissions.scope3_emissions > 0) {
          toast({
            title: "Existing Data Found",
            description: `This company has existing emissions: Scope 1: ${existingEmissions.scope1_emissions}, Scope 2: ${existingEmissions.scope2_emissions}, Scope 3: ${existingEmissions.scope3_emissions}`,
          });
        }
      } else {
        console.log('No existing emissions found for company:', counterpartyId);
        // Show fresh start notification
        toast({
          title: "Fresh Start",
          description: "No existing emissions found. Starting with blank calculator.",
        });
      }
    } catch (error) {
      console.error('Error loading existing company emissions:', error);
      // Reset calculator to blank state on error
      resetCalculatorState();
      toast({
        title: "Error",
        description: "Could not load existing emissions. Starting with blank calculator.",
        variant: "destructive"
      });
    }
  };

  // Reset calculator state to blank
  const resetCalculatorState = () => {
    console.log('Resetting calculator state for new company');
    
    // Force a complete reset of all emission data
    const blankEmissionData = {
      scope1: {
        fuel: [],
        refrigerant: [],
        passengerVehicle: [],
        deliveryVehicle: [],
      },
      scope2: [],
      scope3: [],
    };
    
    // Reset all state variables
    setEmissionData(blankEmissionData);
    setActiveScope("scope1");
    setActiveCategory("fuel");
    setResetKey(prev => prev + 1); // Force re-render of all components
    
    // Show reset notification
    toast({
      title: "Calculator Reset",
      description: "Starting with fresh calculations",
    });
  };

  // Sidebar navigation structure
  const sidebarItems = [
    {
      id: 'scope1',
      title: 'Scope 1',
      icon: Factory,
      description: 'Direct emissions from owned or controlled sources',
      categories: [
        { id: 'fuel', title: 'Fuel', icon: Flame, description: 'Stationary combustion fuels' },
        { id: 'refrigerant', title: 'Refrigerant', icon: Snowflake, description: 'Fugitive emissions from refrigerants' },
        { id: 'passengerVehicle', title: 'Passenger Vehicle', icon: Car, description: 'Company passenger vehicles' },
        { id: 'deliveryVehicle', title: 'Delivery Vehicle', icon: Truck, description: 'Company delivery vehicles' }
      ]
    },
    {
      id: 'scope2',
      title: 'Scope 2',
      icon: Zap,
      description: 'Indirect emissions from purchased energy',
      categories: [
        { id: 'electricity', title: 'Electricity', icon: Zap, description: 'Purchased electricity consumption' },
        { id: 'heat', title: 'Heat & Steam', icon: Thermometer, description: 'Purchased heat and steam' }
      ]
    },
    {
      id: 'scope3',
      title: 'Scope 3',
      icon: Factory,
      description: 'Value chain emissions',
      categories: [
        // Upstream emissions (1-8)
        { id: 'purchasedGoods', title: 'Purchased Goods & Services', icon: Truck, description: 'Upstream purchased goods and services', group: 'upstream' },
        { id: 'capitalGoods', title: 'Capital Goods', icon: Factory, description: 'Purchased capital goods and equipment', group: 'upstream' },
        { id: 'fuelEnergyActivities', title: 'Fuel & Energy Related Activities', icon: Flame, description: 'Upstream fuel and energy related activities', group: 'upstream' },
        { id: 'upstreamTransportation', title: 'Upstream Transportation', icon: Truck, description: 'Transport of fuels/materials before processing', group: 'upstream' },
        { id: 'wasteGenerated', title: 'Waste Generated', icon: Factory, description: 'Waste generated in operations', group: 'upstream' },
        { id: 'businessTravel', title: 'Business Travel', icon: Car, description: 'Employee business travel', group: 'upstream' },
        { id: 'employeeCommuting', title: 'Employee Commuting', icon: Car, description: 'Daily commute to workplace', group: 'upstream' },
        { id: 'upstreamLeasedAssets', title: 'Upstream Leased Assets', icon: Building2, description: 'Leased assets upstream of operations', group: 'upstream' },
        // Downstream emissions (9-15)
        { id: 'investments', title: 'Investments', icon: Building2, description: 'Financed emissions from investments', group: 'downstream' },
        { id: 'downstreamTransportation', title: 'Downstream Transportation', icon: Truck, description: 'Distribution of sold products', group: 'downstream' },
        { id: 'processingSoldProducts', title: 'Processing of Sold Products', icon: Factory, description: 'Processing activities by third parties', group: 'downstream' },
        { id: 'useOfSoldProducts', title: 'Use of Sold Products', icon: Factory, description: 'Emissions from product use phase', group: 'downstream' },
        { id: 'endOfLifeTreatment', title: 'End-of-Life Treatment', icon: Factory, description: 'End-of-life processing and disposal', group: 'downstream' },
        { id: 'downstreamLeasedAssets', title: 'Downstream Leased Assets', icon: Building2, description: 'Leased assets downstream (tenants)', group: 'downstream' },
        { id: 'franchises', title: 'Franchises', icon: Building2, description: 'Franchise operations', group: 'downstream' }
      ]
    }
  ];

  const toggleScope = (scopeId: string) => {
    setExpandedScopes(prev => ({
      ...prev,
      [scopeId]: !prev[scopeId]
    }));
  };

  const handleCategoryClick = (scopeId: string, categoryId: string) => {
    setActiveScope(scopeId);
    setActiveCategory(categoryId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the emission calculator.</p>
          <Button onClick={() => navigate('/login')} className="bg-teal-600 hover:bg-teal-700 text-white">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Sidebar */}
      <div className="w-96 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-teal-600 hover:text-teal-700 p-0">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/emission-results')} 
                className="text-teal-600 hover:text-teal-700 p-0"
              >
                View Results
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Factory className="h-6 w-6 text-teal-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Emission Calculator</h1>
              <p className="text-sm text-gray-600 mt-1">Add annual figures for your organization</p>
            </div>
          </div>
        </div>

        {/* Company Context Header */}
        {companyContext && (
          <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/50 animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-3">
              {/* Top row with title and clear button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-blue-100 rounded-lg shadow-sm flex-shrink-0">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-base font-semibold text-blue-900 truncate">Company-Specific Emissions</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 hover:shadow-sm flex-shrink-0"
                  onClick={() => {
                    sessionStorage.removeItem('companyEmissionsContext');
                    setCompanyContext(null);
                    resetCalculatorState();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              
              {/* Bottom row with company ID */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-blue-600 font-medium">Company ID:</span>
                <code className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-mono rounded border shadow-sm flex-1 min-w-0">
                  <span className="truncate block">{companyContext.counterpartyId}</span>
                </code>
              </div>
            </div>
          </div>
        )}
          
          {/* Summary Cards */}
        <div className="p-6 border-b border-gray-200" key={`summary-${resetKey}`}>
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-teal-600">{scopeTotals.scope1.toFixed(1)}</div>
                <div className="text-xs text-gray-600">Scope 1</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-blue-600">{scopeTotals.scope2.toFixed(1)}</div>
                <div className="text-xs text-gray-600">Scope 2</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-purple-600">{scopeTotals.scope3.toFixed(1)}</div>
                <div className="text-xs text-gray-600">Scope 3</div>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-gray-800">{scopeTotals.total.toFixed(1)}</div>
                <div className="text-xs text-gray-600">Total</div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-3 text-center">
            <div className="text-sm text-gray-600">Total: <span className="font-semibold">{(scopeTotals.total / 1000).toFixed(2)} tonnes CO2e</span></div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 p-6">
          <nav className="space-y-2">
            {sidebarItems.map((scope) => (
              <div key={scope.id}>
                <button
                  onClick={() => toggleScope(scope.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeScope === scope.id 
                      ? 'bg-teal-100 text-teal-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <scope.icon className="h-4 w-4" />
                    <span>{scope.title}</span>
                  </div>
                  {expandedScopes[scope.id] ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </button>
                
                {/* Categories */}
                {expandedScopes[scope.id] && (
                  <div className="ml-6 mt-1 space-y-1">
                    {scope.id !== 'scope3' ? (
                      // Default rendering for scope1 and scope2
                      scope.categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryClick(scope.id, category.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                            activeScope === scope.id && activeCategory === category.id
                              ? 'bg-teal-50 text-teal-700 border-l-2 border-teal-500'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <category.icon className="h-4 w-4" />
                          <span>{category.title}</span>
                        </button>
                      ))
                    ) : (
                      // Grouped rendering for scope3
                      <div className="space-y-3">
                        {/* Upstream Group */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setScope3GroupsExpanded(prev => ({ ...prev, upstream: !prev.upstream }))}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700/90 hover:bg-teal-50 rounded"
                          >
                            <span>Upstream emissions</span>
                            {scope3GroupsExpanded.upstream ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          {scope3GroupsExpanded.upstream && (
                            <div className="mt-1">
                              {scope.categories.filter((c:any) => c.group === 'upstream').map((category:any) => (
                                <button
                                  key={category.id}
                                  onClick={() => handleCategoryClick(scope.id, category.id)}
                                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                    activeScope === scope.id && activeCategory === category.id
                                      ? 'bg-teal-50 text-teal-700 border-l-2 border-teal-500'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <category.icon className="h-4 w-4" />
                                  <span>{category.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Downstream Group */}
                        <div className="pt-2 border-t border-gray-200/70">
                          <button
                            type="button"
                            onClick={() => setScope3GroupsExpanded(prev => ({ ...prev, downstream: !prev.downstream }))}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-purple-700/90 hover:bg-purple-50 rounded"
                          >
                            <span>Downstream emissions</span>
                            {scope3GroupsExpanded.downstream ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                          {scope3GroupsExpanded.downstream && (
                            <div className="mt-1">
                              {scope.categories.filter((c:any) => c.group === 'downstream').map((category:any) => (
                                <button
                                  key={category.id}
                                  onClick={() => handleCategoryClick(scope.id, category.id)}
                                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                                    activeScope === scope.id && activeCategory === category.id
                                      ? 'bg-teal-50 text-teal-700 border-l-2 border-teal-500'
                                      : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <category.icon className="h-4 w-4" />
                                  <span>{category.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {(() => {
                  const scope = sidebarItems.find(s => s.id === activeScope);
                  const category = scope?.categories.find(c => c.id === activeCategory);
                  return category ? `${scope?.title} - ${category.title}` : 'Select a Category';
                })()}
              </h2>
              <p className="text-gray-600 mt-1">
                {(() => {
                  const scope = sidebarItems.find(s => s.id === activeScope);
                  const category = scope?.categories.find(c => c.id === activeCategory);
                  return category?.description || 'Choose a category from the sidebar to start calculating emissions';
                })()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Info className="h-4 w-4 mr-2" />
                Help
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gray-50">
          {activeScope === 'scope1' && activeCategory === 'fuel' && (
            <div className="max-w-4xl" key={`fuel-${resetKey}`}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <FuelEmissions onDataChange={handleFuelDataChange} companyContext={!!companyContext} counterpartyId={companyContext?.counterpartyId} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'refrigerant' && (
            <div className="max-w-4xl" key={`refrigerant-${resetKey}`}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <RefrigerantEmissions onDataChange={handleRefrigerantDataChange} companyContext={!!companyContext} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'passengerVehicle' && (
            <div className="max-w-4xl" key={`passenger-${resetKey}`}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <PassengerVehicleEmissions onDataChange={handlePassengerVehicleDataChange} companyContext={!!companyContext} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'deliveryVehicle' && (
            <div className="max-w-4xl" key={`delivery-${resetKey}`}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <DeliveryVehicleEmissions onDataChange={handleDeliveryVehicleDataChange} companyContext={!!companyContext} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope2' && activeCategory === 'electricity' && (
            <div className="max-w-4xl" key={`electricity-${resetKey}`}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <ElectricityEmissions onTotalChange={handleElectricityDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope2' && activeCategory === 'heat' && (
            <div className="max-w-4xl" key={`heat-${resetKey}`}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <HeatSteamEmissions onTotalChange={handleHeatSteamDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope3' && (
            <div className="w-full" key={`scope3-${resetKey}`}>
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  {!scope3QuestionnaireCompleted ? (
                    <Scope3Questionnaire
                      emissionData={emissionData}
                      setEmissionData={setEmissionData}
                      onComplete={(mode) => {
                        setScope3QuestionnaireCompleted(true);
                        setScope3CalculationMode(mode);
                        if (mode === 'manual') {
                          // Auto-select first category for manual calculation
                          setActiveCategory('purchasedGoods');
                        }
                      }}
                    />
                  ) : scope3CalculationMode === 'lca' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
                      <div className="text-center py-8">
                        <div className="flex justify-center mb-6">
                          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="h-10 w-10 text-white" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          LCA Data Saved Successfully
                        </h3>
                        <p className="text-gray-600 mb-6">
                          Your Scope 3 emissions have been calculated from your LCA data.
                        </p>
                        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 max-w-md mx-auto">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-teal-900">Total Scope 3 Emissions:</span>
                              <span className="text-lg font-bold text-teal-700">
                                {emissionData.scope3
                                  .filter(r => r.category === 'lca_total')
                                  .reduce((sum, r) => sum + (r.emissions || 0), 0)
                                  .toFixed(2)} kg CO2e
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setScope3QuestionnaireCompleted(false);
                            setScope3CalculationMode(null);
                            setEmissionData(prev => ({
                              ...prev,
                              scope3: prev.scope3.filter(r => r.category !== 'lca_total')
                            }));
                          }}
                          variant="outline"
                          className="mt-6"
                        >
                          Start Over
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeCategory === 'purchasedGoods' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'capitalGoods' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'fuelEnergyActivities' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'upstreamTransportation' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'wasteGenerated' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'businessTravel' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'employeeCommuting' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'upstreamLeasedAssets' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'investments' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'downstreamTransportation' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'processingSoldProducts' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'useOfSoldProducts' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'endOfLifeTreatment' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'downstreamLeasedAssets' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}

                      {activeCategory === 'franchises' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} />
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {!activeScope && (
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Factory className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Category</h3>
                    <p className="text-gray-600 mb-6">
                      Choose a category from the sidebar to start calculating your organization's emissions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
        {/* Bottom-right Continue button (only when coming from wizard or company context) */}
        {(hasWizardContext || companyContext) && (
          <div className="fixed right-6 bottom-6 z-40">
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg px-5 py-2 rounded-lg"
              onClick={async () => {
                try {
                  // Prioritize wizard context - if coming from wizard, always return to finance-emission form
                  if (hasWizardContext) {
                    // Save company emissions if companyContext exists
                    if (companyContext) {
                      await saveCompanyEmissions(scopeTotals);
                    }
                    
                    // Original wizard flow - navigate back to finance emission form at calculation step
                    const saved = sessionStorage.getItem('esgWizardState');
                    const parsed = saved ? JSON.parse(saved) : {};
                    
                    // Pass emission data from calculator to the form
                    const totalEmissions = scopeTotals.total;
                    
                    // Auto-calculate verified/unverified emissions based on verification status
                    let verified_emissions = 0;
                    let unverified_emissions = 0;
                    const verificationStatus = parsed.formData?.verificationStatus || '';
                    if (verificationStatus === 'verified') {
                      verified_emissions = totalEmissions;
                      unverified_emissions = 0;
                    } else if (verificationStatus === 'unverified') {
                      unverified_emissions = totalEmissions;
                      verified_emissions = 0;
                    }
                    
                    const updatedState = {
                      ...parsed,
                      resumeAtCalculation: true, // Flag to resume at emission-calculation step
                      // Pass emission data to pre-fill the form
                      scope1Emissions: scopeTotals.scope1,
                      scope2Emissions: scopeTotals.scope2,
                      scope3Emissions: scopeTotals.scope3,
                      verified_emissions,
                      unverified_emissions,
                      totalEmissions: totalEmissions
                    };
                    
                    sessionStorage.setItem('esgWizardState', JSON.stringify(updatedState));
                    console.log('Navigating back to finance-emission with resumeAtCalculation flag');
                    navigate('/finance-emission', { state: { mode: wizardMode } });
                  } else if (companyContext) {
                    // Not from wizard, but has company context (e.g., editing from CompanyDetail)
                    await saveCompanyEmissions(scopeTotals);
                    navigate(companyContext.returnUrl);
                  }
                } catch (error) {
                  console.error('Error saving state:', error);
                  if (hasWizardContext) {
                    navigate('/finance-emission', { state: { mode: wizardMode } });
                  } else if (companyContext) {
                    navigate(companyContext.returnUrl);
                  } else {
                    navigate('/emission-calculator');
                  }
                }
              }}
            >
              {companyContext ? 'Save & Return' : (wizardMode === 'finance' ? 'Continue to Finance Emission' : 'Continue to Facilitated Emission')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmissionCalculator;

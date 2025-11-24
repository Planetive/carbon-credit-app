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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import LCAQuestionnaire from "@/components/emissions/LCAQuestionnaire";

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
  const [initialQuestionnaireCompleted, setInitialQuestionnaireCompleted] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'lca' | 'manual' | null>(null);
  const [showSwitchToLCADialog, setShowSwitchToLCADialog] = useState(false);
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

  // Calculate totals - handle both LCA and manual modes
  const scopeTotals: ScopeTotals = {
    scope1: calculationMode === 'lca' 
      ? (emissionData.scope3.find(r => r.category === 'lca_scope1')?.emissions || 0)
      : emissionData.scope1.fuel.reduce((sum, r) => sum + (r.emissions || 0), 0) +
        emissionData.scope1.refrigerant.reduce((sum, r) => sum + (r.emissions || 0), 0) +
        emissionData.scope1.passengerVehicle.reduce((sum, r) => sum + (r.emissions || 0), 0) +
        emissionData.scope1.deliveryVehicle.reduce((sum, r) => sum + (r.emissions || 0), 0),
    scope2: calculationMode === 'lca'
      ? (emissionData.scope3.find(r => r.category === 'lca_scope2')?.emissions || 0)
      : emissionData.scope2.reduce((sum, r) => sum + (r.emissions || 0), 0),
    scope3: calculationMode === 'lca'
      ? (emissionData.scope3.find(r => r.category === 'lca_upstream')?.emissions || 0) +
        (emissionData.scope3.find(r => r.category === 'lca_downstream')?.emissions || 0)
      : emissionData.scope3.filter(r => !r.category?.startsWith('lca_')).reduce((sum, r) => sum + (r.emissions || 0), 0),
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

  // Function to get the next category in sequence
  const getNextCategory = (currentScope: string, currentCategory: string): { scope: string; category: string } | null => {
    const currentScopeItem = sidebarItems.find(s => s.id === currentScope);
    if (!currentScopeItem) return null;

    const currentIndex = currentScopeItem.categories.findIndex(c => c.id === currentCategory);
    
    // If there's a next category in the same scope
    if (currentIndex >= 0 && currentIndex < currentScopeItem.categories.length - 1) {
      return {
        scope: currentScope,
        category: currentScopeItem.categories[currentIndex + 1].id
      };
    }
    
    // Otherwise, move to the next scope's first category
    const currentScopeIndex = sidebarItems.findIndex(s => s.id === currentScope);
    if (currentScopeIndex >= 0 && currentScopeIndex < sidebarItems.length - 1) {
      const nextScope = sidebarItems[currentScopeIndex + 1];
      if (nextScope.categories.length > 0) {
        return {
          scope: nextScope.id,
          category: nextScope.categories[0].id
        };
      }
    }
    
    return null; // No next category
  };

  // Function to navigate to next category and scroll to top
  const navigateToNextCategory = () => {
    const next = getNextCategory(activeScope, activeCategory);
    if (next) {
      setActiveScope(next.scope);
      setActiveCategory(next.category);
      
      // Expand the scope if it's collapsed
      if (!expandedScopes[next.scope]) {
        setExpandedScopes(prev => ({ ...prev, [next.scope]: true }));
      }
      
      // Scroll to top of the content area
      setTimeout(() => {
        const contentArea = document.querySelector('[data-content-area]') as HTMLElement;
        if (contentArea) {
          contentArea.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
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

  // Show initial questionnaire if not completed
  if (!initialQuestionnaireCompleted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6">
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                <CardContent className="p-8">
              <LCAQuestionnaire
                emissionData={emissionData}
                setEmissionData={setEmissionData}
                showInitialQuestion={true}
                showHeader={false}
                onSwitchToManual={() => {
                  setInitialQuestionnaireCompleted(true);
                  setCalculationMode('manual');
                  setActiveScope('scope1');
                  setActiveCategory('fuel');
                }}
                onInitialAnswer={(hasLCA) => {
                  setInitialQuestionnaireCompleted(true);
                  setCalculationMode(hasLCA ? 'lca' : 'manual');
                  if (!hasLCA) {
                    // Auto-select first category for manual mode
                    setActiveScope('scope1');
                    setActiveCategory('fuel');
                  }
                }}
                onComplete={() => {
                  // Questionnaire completed
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Handle mode switching
  const handleSwitchToManual = () => {
    setCalculationMode('manual');
    setActiveScope('scope1');
    setActiveCategory('fuel');
  };

  const handleSwitchToLCA = () => {
    // Clear all manual data
    setEmissionData({
      scope1: {
        fuel: [],
        refrigerant: [],
        passengerVehicle: [],
        deliveryVehicle: [],
      },
      scope2: [],
      scope3: [],
    });
    setCalculationMode('lca');
    setShowSwitchToLCADialog(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex">
      {/* Left Sidebar - Hidden in LCA mode */}
      {calculationMode !== 'lca' && (
      <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col shadow-sm">
        {/* Sidebar Header */}
        <div className="p-8 border-b border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')} 
              className="text-gray-600 hover:text-teal-600 hover:bg-teal-50/50 rounded-lg px-3 py-2 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Back</span>
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/emission-results')} 
              className="text-gray-600 hover:text-teal-600 hover:bg-teal-50/50 rounded-lg px-3 py-2 transition-all duration-200"
            >
              <span className="text-sm font-medium">Results</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg">
              <Factory className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Emission Calculator</h1>
              <p className="text-sm text-gray-500 mt-1">Track your carbon footprint</p>
            </div>
          </div>
        </div>

        {/* Company Context Header - Modern Design */}
        {companyContext && (
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-blue-50/80 backdrop-blur-sm border-b border-blue-200/50 animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-4">
              {/* Top row with title and clear button */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg flex-shrink-0">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900 truncate">Company-Specific Emissions</h3>
                    <p className="text-xs text-blue-600/80 mt-0.5">Calculating for specific counterparty</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 hover:shadow-md rounded-lg px-4 py-2 flex-shrink-0"
                  onClick={() => {
                    sessionStorage.removeItem('companyEmissionsContext');
                    setCompanyContext(null);
                    resetCalculatorState();
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
              
              {/* Bottom row with company ID */}
              <div className="flex items-center gap-3 px-2">
                <span className="text-sm text-blue-700 font-semibold">Company ID:</span>
                <code className="px-3 py-1.5 bg-white/80 text-blue-800 text-sm font-mono rounded-lg border border-blue-200/50 shadow-sm flex-1 min-w-0 backdrop-blur-sm">
                  <span className="truncate block">{companyContext.counterpartyId}</span>
                </code>
              </div>
            </div>
          </div>
        )}
          
          {/* Summary Cards - Modern Design */}
        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-b from-white to-gray-50/30" key={`summary-${resetKey}`}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200/50 hover:border-red-300/70 hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-extrabold text-red-600 mb-1 group-hover:scale-110 transition-transform duration-300">{scopeTotals.scope1.toFixed(1)}</div>
                <div className="text-xs font-semibold text-red-700/80 uppercase tracking-wide">Scope 1</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-200/50 hover:border-yellow-300/70 hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-extrabold text-yellow-600 mb-1 group-hover:scale-110 transition-transform duration-300">{scopeTotals.scope2.toFixed(1)}</div>
                <div className="text-xs font-semibold text-yellow-700/80 uppercase tracking-wide">Scope 2</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200/50 hover:border-blue-300/70 hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-extrabold text-blue-600 mb-1 group-hover:scale-110 transition-transform duration-300">{scopeTotals.scope3.toFixed(1)}</div>
                <div className="text-xs font-semibold text-blue-700/80 uppercase tracking-wide">Scope 3</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300/50 hover:border-teal-400/70 hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardContent className="p-4 text-center relative z-10">
                <div className="text-2xl font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-1 group-hover:scale-110 transition-transform duration-300">{scopeTotals.total.toFixed(1)}</div>
                <div className="text-xs font-semibold text-teal-700/80 uppercase tracking-wide">Total</div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-teal-50/30 rounded-xl border border-gray-200/50">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Total Emissions</div>
              <div className="text-lg font-bold bg-gradient-to-r from-gray-800 to-teal-700 bg-clip-text text-transparent">
                {(scopeTotals.total / 1000).toFixed(2)} <span className="text-sm font-normal text-gray-600">tonnes CO₂e</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation - Modern Design */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <nav className="space-y-3">
            {sidebarItems.map((scope) => (
              <div key={scope.id}>
                <button
                  onClick={() => toggleScope(scope.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    activeScope === scope.id 
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30' 
                      : 'text-gray-700 hover:bg-gray-100/80 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <scope.icon className={`h-5 w-5 ${activeScope === scope.id ? 'text-white' : 'text-gray-600'}`} />
                    <span>{scope.title}</span>
                  </div>
                  {expandedScopes[scope.id] ? 
                    <ChevronDown className={`h-4 w-4 transition-transform ${activeScope === scope.id ? 'text-white' : 'text-gray-500'}`} /> : 
                    <ChevronRight className={`h-4 w-4 transition-transform ${activeScope === scope.id ? 'text-white' : 'text-gray-500'}`} />
                  }
                </button>
                
                {/* Categories - Modern Design */}
                {expandedScopes[scope.id] && (
                  <div className="ml-2 mt-2 space-y-1.5 pl-2 border-l-2 border-gray-200/50">
                    {scope.id !== 'scope3' ? (
                      // Default rendering for scope1 and scope2
                      scope.categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryClick(scope.id, category.id)}
                          className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                            activeScope === scope.id && activeCategory === category.id
                              ? 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-l-4 border-teal-500 shadow-sm font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:translate-x-1'
                          }`}
                        >
                          <category.icon className={`h-4 w-4 ${activeScope === scope.id && activeCategory === category.id ? 'text-teal-600' : 'text-gray-500'}`} />
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
                            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-teal-700/90 hover:bg-teal-50/50 rounded-lg transition-all duration-200"
                          >
                            <span>Upstream emissions</span>
                            {scope3GroupsExpanded.upstream ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          {scope3GroupsExpanded.upstream && (
                            <div className="mt-1.5 space-y-1">
                              {scope.categories.filter((c:any) => c.group === 'upstream').map((category:any) => (
                                <button
                                  key={category.id}
                                  onClick={() => handleCategoryClick(scope.id, category.id)}
                                  className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                                    activeScope === scope.id && activeCategory === category.id
                                      ? 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-l-4 border-teal-500 shadow-sm font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 hover:translate-x-1'
                                  }`}
                                >
                                  <category.icon className={`h-4 w-4 ${activeScope === scope.id && activeCategory === category.id ? 'text-teal-600' : 'text-gray-500'}`} />
                                  <span>{category.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Downstream Group */}
                        <div className="pt-3 border-t border-gray-200/50">
                          <button
                            type="button"
                            onClick={() => setScope3GroupsExpanded(prev => ({ ...prev, downstream: !prev.downstream }))}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-purple-700/90 hover:bg-purple-50/50 rounded-lg transition-all duration-200"
                          >
                            <span>Downstream emissions</span>
                            {scope3GroupsExpanded.downstream ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                          {scope3GroupsExpanded.downstream && (
                            <div className="mt-1.5 space-y-1">
                              {scope.categories.filter((c:any) => c.group === 'downstream').map((category:any) => (
                                <button
                                  key={category.id}
                                  onClick={() => handleCategoryClick(scope.id, category.id)}
                                  className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                                    activeScope === scope.id && activeCategory === category.id
                                      ? 'bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-l-4 border-teal-500 shadow-sm font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 hover:translate-x-1'
                                  }`}
                                >
                                  <category.icon className={`h-4 w-4 ${activeScope === scope.id && activeCategory === category.id ? 'text-teal-600' : 'text-gray-500'}`} />
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
      )}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${calculationMode === 'lca' ? '' : ''}`}>
        {/* Top Header - Only show in manual mode */}
        {calculationMode === 'manual' && (
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-8 py-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                {(() => {
                  const scope = sidebarItems.find(s => s.id === activeScope);
                  const category = scope?.categories.find(c => c.id === activeCategory);
                  return category ? `${scope?.title} - ${category.title}` : 'Select a Category';
                })()}
              </h2>
              <p className="text-gray-600 text-base">
                {(() => {
                  const scope = sidebarItems.find(s => s.id === activeScope);
                  const category = scope?.categories.find(c => c.id === activeCategory);
                  return category?.description || 'Choose a category from the sidebar to start calculating emissions';
                })()}
              </p>
            </div>
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-full border border-gray-200/50">
              <span className="text-sm font-semibold text-gray-700">Manual</span>
              <Switch
                checked={false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setShowSwitchToLCADialog(true);
                  }
                }}
                className="data-[state=checked]:bg-teal-600"
              />
              <span className="text-sm font-semibold text-gray-700">LCA</span>
            </div>
          </div>
        </header>
        )}

        {/* Switch to LCA Confirmation Dialog */}
        <AlertDialog open={showSwitchToLCADialog} onOpenChange={setShowSwitchToLCADialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {calculationMode === 'lca' ? 'Switch to Manual Calculation?' : 'Switch to LCA Input?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {calculationMode === 'lca' 
                  ? 'Switching to manual calculation will clear all your current LCA data. This action cannot be undone. Are you sure you want to continue?'
                  : 'Switching to LCA input will clear all your current manual calculation data. This action cannot be undone. Are you sure you want to continue?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (calculationMode === 'lca') {
                    handleSwitchToManual();
                  } else {
                    handleSwitchToLCA();
                  }
                  setShowSwitchToLCADialog(false);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Switch and Clear Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50" data-content-area>
          {/* LCA Mode */}
          {calculationMode === 'lca' && (
            <div className="max-w-5xl mx-auto">
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                <CardContent className="p-8">
                  <LCAQuestionnaire
                    emissionData={emissionData}
                    setEmissionData={setEmissionData}
                    showInitialQuestion={false}
                    showHeader={false}
                    onSwitchToManual={() => setShowSwitchToLCADialog(true)}
                    onComplete={() => {
                      // Questionnaire completed, user can continue
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Manual Mode */}
          {calculationMode === 'manual' && (
            <>
          {activeScope === 'scope1' && activeCategory === 'fuel' && (
            <div className="w-full" key={`fuel-${resetKey}`}>
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <FuelEmissions onDataChange={handleFuelDataChange} companyContext={!!companyContext} counterpartyId={companyContext?.counterpartyId} onSaveAndNext={navigateToNextCategory} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'refrigerant' && (
            <div className="w-full" key={`refrigerant-${resetKey}`}>
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <RefrigerantEmissions onDataChange={handleRefrigerantDataChange} companyContext={!!companyContext} onSaveAndNext={navigateToNextCategory} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'passengerVehicle' && (
            <div className="w-full" key={`passenger-${resetKey}`}>
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <PassengerVehicleEmissions onDataChange={handlePassengerVehicleDataChange} companyContext={!!companyContext} onSaveAndNext={navigateToNextCategory} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'deliveryVehicle' && (
            <div className="w-full" key={`delivery-${resetKey}`}>
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <DeliveryVehicleEmissions onDataChange={handleDeliveryVehicleDataChange} companyContext={!!companyContext} onSaveAndNext={navigateToNextCategory} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope2' && activeCategory === 'electricity' && (
            <div className="w-full" key={`electricity-${resetKey}`}>
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <ElectricityEmissions onTotalChange={handleElectricityDataChange} onSaveAndNext={navigateToNextCategory} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope2' && activeCategory === 'heat' && (
            <div className="w-full" key={`heat-${resetKey}`}>
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                  <HeatSteamEmissions onTotalChange={handleHeatSteamDataChange} onSaveAndNext={navigateToNextCategory} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope3' && (
            <div className="w-full" key={`scope3-${resetKey}`}>
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8">
                      {activeCategory === 'purchasedGoods' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'capitalGoods' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'fuelEnergyActivities' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'upstreamTransportation' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'wasteGenerated' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'businessTravel' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'employeeCommuting' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'upstreamLeasedAssets' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'investments' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'downstreamTransportation' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'processingSoldProducts' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'useOfSoldProducts' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'endOfLifeTreatment' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'downstreamLeasedAssets' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}

                      {activeCategory === 'franchises' && (
                        <Scope3Section activeCategory={activeCategory} emissionData={emissionData} setEmissionData={setEmissionData} onSaveAndNext={navigateToNextCategory} />
                      )}
                </CardContent>
              </Card>
            </div>
          )}
            </>
          )}

          {calculationMode === 'manual' && !activeScope && (
            <div className="max-w-4xl">
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                <CardContent className="p-8">
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

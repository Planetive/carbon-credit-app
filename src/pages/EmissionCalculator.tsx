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
  Settings,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EmissionData, ScopeTotals } from "@/components/emissions/shared/types";
import FuelEmissions from "@/components/emissions/scope1/FuelEmissions";
import RefrigerantEmissions from "@/components/emissions/scope1/RefrigerantEmissions";
import PassengerVehicleEmissions from "@/components/emissions/scope1/PassengerVehicleEmissions";
import DeliveryVehicleEmissions from "@/components/emissions/scope1/DeliveryVehicleEmissions";
import ElectricityEmissions from "@/components/emissions/scope2/ElectricityEmissions";
import HeatSteamEmissions from "@/components/emissions/scope2/HeatSteamEmissions";

const EmissionCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeScope, setActiveScope] = useState("scope1");
  const [activeCategory, setActiveCategory] = useState("fuel");
  const [hasWizardContext, setHasWizardContext] = useState(false);
  const [wizardMode, setWizardMode] = useState<'finance' | 'facilitated'>('finance');
  const [expandedScopes, setExpandedScopes] = useState<{[key: string]: boolean}>({
    scope1: true,
    scope2: true,
    scope3: false
  });
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

  // Detect if we arrived from the questionnaire wizard
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromWizard = params.get('from') === 'wizard';
      const modeParam = params.get('mode');
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
        }
      } else {
        setHasWizardContext(false);
      }
    } catch {
      setHasWizardContext(false);
    }
  }, []);

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
        { id: 'coming-soon', title: 'Coming Soon', icon: Settings, description: 'Scope 3 categories will be added soon' }
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
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-200">
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">Emission Calculator</h1>
          <p className="text-sm text-gray-600">Add annual figures for your organization</p>
        </div>
          
          {/* Summary Cards */}
        <div className="p-6 border-b border-gray-200">
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
                    {scope.categories.map((category) => (
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
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <FuelEmissions onDataChange={handleFuelDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'refrigerant' && (
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <RefrigerantEmissions onDataChange={handleRefrigerantDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'passengerVehicle' && (
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <PassengerVehicleEmissions onDataChange={handlePassengerVehicleDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope1' && activeCategory === 'deliveryVehicle' && (
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <DeliveryVehicleEmissions onDataChange={handleDeliveryVehicleDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope2' && activeCategory === 'electricity' && (
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <ElectricityEmissions onTotalChange={handleElectricityDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope2' && activeCategory === 'heat' && (
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
                  <HeatSteamEmissions onTotalChange={handleHeatSteamDataChange} />
                </CardContent>
              </Card>
            </div>
          )}

          {activeScope === 'scope3' && (
            <div className="max-w-4xl">
              <Card className="bg-white border border-gray-200">
                <CardContent className="p-6">
              <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🚧</div>
                    <h3 className="text-xl font-medium text-gray-600 mb-2">Scope 3 Coming Soon</h3>
                <p className="text-gray-500">Scope 3 emissions calculation will be implemented in the next update.</p>
              </div>
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
        {/* Bottom-right Continue button (only when coming from wizard) */}
        {hasWizardContext && (
          <div className="fixed right-6 bottom-6 z-40">
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg px-5 py-2 rounded-lg"
              onClick={() => {
                try {
                  const saved = sessionStorage.getItem('esgWizardState');
                  const parsed = saved ? JSON.parse(saved) : {};
                  sessionStorage.setItem('esgWizardState', JSON.stringify({ ...parsed, resumeAtCalculation: true }));
                } catch {}
                navigate('/finance-emission', { state: { mode: wizardMode } });
              }}
            >
              {wizardMode === 'finance' ? 'Continue to Finance Emission' : 'Continue to Facilitated Emission'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmissionCalculator;

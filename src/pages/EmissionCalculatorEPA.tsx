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
  Truck,
  Building2,
  X,
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { EmissionData, ScopeTotals } from "@/components/emissions/shared/types";
import { supabase } from "@/integrations/supabase/client";
import FuelEmissions from "@/components/emissions/scope1/FuelEmissions";
import MobileFuelEmissions from "@/components/emissions/scope1/MobileFuelEmissions";
import OnRoadGasolineEmissions from "@/components/emissions/scope1/OnRoadGasolineEmissions";
import OnRoadDieselAltFuelEmissions from "@/components/emissions/scope1/OnRoadDieselAltFuelEmissions";
import NonRoadVehicleEmissions from "@/components/emissions/scope1/NonRoadVehicleEmissions";
import HeatSteamEPAEmissions from "@/components/emissions/scope1/HeatSteamEPAEmissions";
import ElectricityEmissions from "@/components/emissions/scope2/ElectricityEmissions";
import Scope3Section from "@/components/emissions/scope3/Scope3Section";
import LCAQuestionnaire from "@/components/emissions/LCAQuestionnaire";

const EmissionCalculatorEPA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeScope, setActiveScope] = useState("scope1");
  const [activeCategory, setActiveCategory] = useState("fuel");
  const [resetKey, setResetKey] = useState(0);
  const [hasWizardContext, setHasWizardContext] = useState(false);
  const [wizardMode, setWizardMode] = useState<"finance" | "facilitated">("finance");
  const [companyContext, setCompanyContext] = useState<{
    counterpartyId: string;
    returnUrl: string;
    timestamp: number;
  } | null>(null);
  const [expandedScopes, setExpandedScopes] = useState<{ [key: string]: boolean }>({
    scope1: true,
    scope2: true,
    scope3: true,
  });
  const [scope3GroupsExpanded, setScope3GroupsExpanded] = useState<{ upstream: boolean; downstream: boolean }>({
    upstream: false,
    downstream: false,
  });
  const [initialQuestionnaireCompleted, setInitialQuestionnaireCompleted] = useState(false);
  const [calculationMode, setCalculationMode] = useState<"lca" | "manual" | null>(null);
  const [showSwitchToLCADialog, setShowSwitchToLCADialog] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
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
  const [mobileFuelRows, setMobileFuelRows] = useState<Array<{ emissions?: number }>>([]);
  const [onRoadGasolineRows, setOnRoadGasolineRows] = useState<Array<{ emissions?: number }>>([]);
  const [onRoadDieselAltFuelRows, setOnRoadDieselAltFuelRows] = useState<Array<{ emissions?: number }>>([]);
  const [nonRoadVehicleRows, setNonRoadVehicleRows] = useState<Array<{ emissions?: number }>>([]);
  const [heatSteamTotal, setHeatSteamTotal] = useState<number>(0);

  // Totals – Scope 1 uses only fuel, Scope 2 uses electricity total, Scope 3 unchanged
  const scopeTotals: ScopeTotals = {
    scope1:
      calculationMode === "lca"
        ? emissionData.scope3.find((r) => r.category === "lca_scope1")?.emissions || 0
        : emissionData.scope1.fuel.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          mobileFuelRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          onRoadGasolineRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          onRoadDieselAltFuelRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          nonRoadVehicleRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          heatSteamTotal,
    scope2:
      calculationMode === "lca"
        ? emissionData.scope3.find((r) => r.category === "lca_scope2")?.emissions || 0
        : emissionData.scope2.reduce((sum, r) => sum + (r.emissions || 0), 0),
    scope3:
      calculationMode === "lca"
        ? (emissionData.scope3.find((r) => r.category === "lca_upstream")?.emissions || 0) +
          (emissionData.scope3.find((r) => r.category === "lca_downstream")?.emissions || 0)
        : emissionData.scope3
            .filter((r) => !r.category?.startsWith("lca_"))
            .reduce((sum, r) => sum + (r.emissions || 0), 0),
    total: 0,
  };
  scopeTotals.total = scopeTotals.scope1 + scopeTotals.scope2 + scopeTotals.scope3;

  // Handlers for Scope 1 fuel and Scope 2 electricity
  const handleFuelDataChange = (data: any[]) => {
    setEmissionData((prev) => ({
      ...prev,
      scope1: { ...prev.scope1, fuel: data },
    }));
  };

  const handleElectricityDataChange = (total: number) => {
    setEmissionData((prev) => ({
      ...prev,
      scope2: [{ id: "electricity-total", emissions: total }] as any,
    }));
  };

  const handleMobileFuelDataChange = (rows: Array<{ emissions?: number }>) => {
    setMobileFuelRows(rows);
  };

  const handleOnRoadGasolineDataChange = (rows: Array<{ emissions?: number }>) => {
    setOnRoadGasolineRows(rows);
  };

  const handleOnRoadDieselAltFuelDataChange = (rows: Array<{ emissions?: number }>) => {
    setOnRoadDieselAltFuelRows(rows);
  };

  const handleNonRoadVehicleDataChange = (rows: Array<{ emissions?: number }>) => {
    setNonRoadVehicleRows(rows);
  };

  const handleHeatSteamTotalChange = (total: number) => {
    setHeatSteamTotal(total);
  };

  // Save company emissions to database (same as main calculator)
  const saveCompanyEmissions = async (totals: ScopeTotals) => {
    if (!companyContext) return;

    try {
      const { PortfolioClient } = await import("@/integrations/supabase/portfolioClient");

      await PortfolioClient.upsertCompanyEmissions({
        counterparty_id: companyContext.counterpartyId,
        is_bank_emissions: false,
        scope1_emissions: totals.scope1,
        scope2_emissions: totals.scope2,
        scope3_emissions: totals.scope3,
        // Reuse the same calculation_source type as the main calculator
        calculation_source: "emission_calculator",
        notes: "Calculated using EPA emission calculator version",
      });

      sessionStorage.removeItem("companyEmissionsContext");
      const returnUrl = `${companyContext.returnUrl}?counterpartyId=${companyContext.counterpartyId}`;
      navigate(returnUrl);
    } catch (error) {
      console.error("Error saving company emissions (EPA):", error);
      toast({
        title: "Error",
        description: "Failed to save company emissions. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load LCA preferences
  useEffect(() => {
    const loadLCAPreferences = async () => {
      if (!user) {
        setLoadingPreferences(false);
        return;
      }

      try {
        const { data, error } = await (supabase as any)
          .from("emission_calculator_preferences")
          .select("has_lca_data, calculation_mode, initial_questionnaire_completed")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading LCA preferences (EPA):", error);
        } else if (data) {
          if (data.initial_questionnaire_completed) {
            setInitialQuestionnaireCompleted(true);
            if (data.calculation_mode) {
              setCalculationMode(data.calculation_mode as "lca" | "manual");
            } else {
              setCalculationMode(data.has_lca_data ? "lca" : "manual");
            }
          }
        }
      } catch (error) {
        console.error("Error loading LCA preferences (EPA):", error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadLCAPreferences();
  }, [user]);

  // Save LCA preferences
  const saveLCAPreferences = async (hasLCA: boolean, mode: "lca" | "manual") => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from("emission_calculator_preferences")
        .upsert(
          {
            user_id: user.id,
            has_lca_data: hasLCA,
            calculation_mode: mode,
            initial_questionnaire_completed: true,
          },
          {
            onConflict: "user_id",
          },
        );

      if (error) {
        console.error("Error saving LCA preferences (EPA):", error);
        toast({
          title: "Error",
          description: "Failed to save preferences. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving LCA preferences (EPA):", error);
    }
  };

  // Detect wizard context
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromWizard = params.get("from") === "wizard";
      const modeParam = params.get("mode");
      const counterpartyId = params.get("counterpartyId");
      const saved = sessionStorage.getItem("esgWizardState");

      if (fromWizard && saved) {
        const parsed = JSON.parse(saved);
        const recentEnough = typeof parsed?.ts === "number" ? Date.now() - parsed.ts < 1000 * 60 * 30 : true;
        if (recentEnough) {
          setHasWizardContext(true);
          if (modeParam === "finance" || modeParam === "facilitated") {
            setWizardMode(modeParam);
          } else if (parsed?.mode) {
            setWizardMode(parsed.mode);
          }

          resetCalculatorState();

          if (counterpartyId) {
            setCompanyContext({
              counterpartyId,
              returnUrl: "/finance-emission",
              timestamp: Date.now(),
            });
          }
        } else {
          setHasWizardContext(false);
          resetCalculatorState();
        }
      } else {
        setHasWizardContext(false);
        resetCalculatorState();
      }
    } catch {
      setHasWizardContext(false);
      resetCalculatorState();
    }
  }, []);

  // Detect company context (same logic as main calculator)
  useEffect(() => {
    try {
      const companyContextData = sessionStorage.getItem("companyEmissionsContext");
      if (companyContextData) {
        const parsed = JSON.parse(companyContextData);
        const recentEnough = Date.now() - parsed.timestamp < 1000 * 60 * 30;
        if (recentEnough) {
          setCompanyContext(parsed);
        } else {
          sessionStorage.removeItem("companyEmissionsContext");
          resetCalculatorState();
        }
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const fromWizard = urlParams.get("from") === "wizard";
        const counterpartyId = urlParams.get("counterpartyId");

        if (counterpartyId && !fromWizard) {
          setCompanyContext({
            counterpartyId,
            returnUrl: "/bank-portfolio",
            timestamp: Date.now(),
          });
        } else if (!counterpartyId) {
          resetCalculatorState();
          setCompanyContext(null);
        }
      }
    } catch (error) {
      console.error("Error parsing company context (EPA):", error);
      resetCalculatorState();
    }
  }, []);

  const resetCalculatorState = () => {
    const blankEmissionData: EmissionData = {
      scope1: {
        fuel: [],
        refrigerant: [],
        passengerVehicle: [],
        deliveryVehicle: [],
      },
      scope2: [],
      scope3: [],
    };

    setEmissionData(blankEmissionData);
    setActiveScope("scope1");
    setActiveCategory("fuel");
    setResetKey((prev) => prev + 1);

    toast({
      title: "Calculator Reset",
      description: "Starting with fresh EPA calculations",
    });
  };

  // Sidebar – EPA version: Scope 1 only Fuel, Scope 2 only Electricity, Scope 3 unchanged
  const sidebarItems = [
    {
      id: "scope1",
      title: "Scope 1 (EPA Fuel)",
      icon: Factory,
      description: "Direct emissions from fuel combustion (EPA factors)",
      categories: [
        { id: "fuel", title: "Fuel", icon: Flame, description: "Stationary combustion fuels (EPA factors)" },
        { id: "mobileFuel", title: "Mobile Fuel", icon: Truck, description: "Mobile fuel using Mobile Combustion table" },
        { id: "onRoadGasoline", title: "On-Road Gasoline", icon: Truck, description: "On-road gasoline using On-Road Gasoline table" },
        { id: "onRoadDieselAltFuel", title: "On-Road Diesel & Alt Fuel", icon: Truck, description: "On-road diesel/alt fuel using On-Road Diesel & Alt Fuel table" },
        { id: "nonRoadVehicle", title: "Non-Road Vehicle", icon: Truck, description: "Non-road vehicle fuel using Non-Road Vehicle table" },
        { id: "heatSteam", title: "Heat & Steam", icon: Thermometer, description: "Heat & steam (EPA standard)" },
      ],
    },
    {
      id: "scope2",
      title: "Scope 2 (Electricity)",
      icon: Zap,
      description: "Indirect emissions from purchased electricity",
      categories: [
        { id: "electricity", title: "Electricity", icon: Zap, description: "Purchased electricity consumption" },
      ],
    },
    {
      id: "scope3",
      title: "Scope 3",
      icon: Factory,
      description: "Value chain emissions (same as main calculator)",
      categories: [
        { id: "purchasedGoods", title: "Purchased Goods & Services", icon: Truck, description: "Upstream purchased goods and services", group: "upstream" },
        { id: "capitalGoods", title: "Capital Goods", icon: Factory, description: "Purchased capital goods and equipment", group: "upstream" },
        { id: "fuelEnergyActivities", title: "Fuel & Energy Related Activities", icon: Flame, description: "Upstream fuel and energy related activities", group: "upstream" },
        { id: "upstreamTransportation", title: "Upstream Transportation", icon: Truck, description: "Transport of fuels/materials before processing", group: "upstream" },
        { id: "wasteGenerated", title: "Waste Generated", icon: Factory, description: "Waste generated in operations", group: "upstream" },
        { id: "businessTravel", title: "Business Travel", icon: Truck, description: "Employee business travel", group: "upstream" },
        { id: "employeeCommuting", title: "Employee Commuting", icon: Truck, description: "Daily commute to workplace", group: "upstream" },
        { id: "upstreamLeasedAssets", title: "Upstream Leased Assets", icon: Building2, description: "Leased assets upstream of operations", group: "upstream" },
        { id: "investments", title: "Investments", icon: Building2, description: "Financed emissions from investments", group: "downstream" },
        { id: "downstreamTransportation", title: "Downstream Transportation", icon: Truck, description: "Distribution of sold products", group: "downstream" },
        {
          id: "processingUseOfSoldProducts",
          title: "Processing / Use of Sold Products",
          icon: Factory,
          description: "Processing by third parties and use-phase emissions",
          group: "downstream",
        },
        { id: "endOfLifeTreatment", title: "End-of-Life Treatment", icon: Factory, description: "End-of-life processing and disposal", group: "downstream" },
        { id: "downstreamLeasedAssets", title: "Downstream Leased Assets", icon: Building2, description: "Leased assets downstream (tenants)", group: "downstream" },
        { id: "franchises", title: "Franchises", icon: Building2, description: "Franchise operations", group: "downstream" },
      ],
    },
  ];

  const toggleScope = (scopeId: string) => {
    setExpandedScopes((prev) => ({
      ...prev,
      [scopeId]: !prev[scopeId],
    }));
  };

  const handleCategoryClick = (scopeId: string, categoryId: string) => {
    setActiveScope(scopeId);
    setActiveCategory(categoryId);
  };

  const getNextCategory = (
    currentScope: string,
    currentCategory: string,
  ): { scope: string; category: string } | null => {
    const currentScopeItem = sidebarItems.find((s) => s.id === currentScope);
    if (!currentScopeItem) return null;

    const currentIndex = currentScopeItem.categories.findIndex((c) => c.id === currentCategory);

    if (currentIndex >= 0 && currentIndex < currentScopeItem.categories.length - 1) {
      return {
        scope: currentScope,
        category: currentScopeItem.categories[currentIndex + 1].id,
      };
    }

    const currentScopeIndex = sidebarItems.findIndex((s) => s.id === currentScope);
    if (currentScopeIndex >= 0 && currentScopeIndex < sidebarItems.length - 1) {
      const nextScope = sidebarItems[currentScopeIndex + 1];
      if (nextScope.categories.length > 0) {
        return {
          scope: nextScope.id,
          category: nextScope.categories[0].id,
        };
      }
    }

    return null;
  };

  const navigateToNextCategory = () => {
    const next = getNextCategory(activeScope, activeCategory);
    if (next) {
      setActiveScope(next.scope);
      setActiveCategory(next.category);

      if (!expandedScopes[next.scope]) {
        setExpandedScopes((prev) => ({ ...prev, [next.scope]: true }));
      }

      setTimeout(() => {
        const contentArea = document.querySelector("[data-content-area]") as HTMLElement | null;
        if (contentArea) {
          contentArea.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the EPA emission calculator.</p>
          <Button onClick={() => navigate("/login")} className="bg-teal-600 hover:bg-teal-700 text-white">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loadingPreferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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
                  setCalculationMode("manual");
                  setActiveScope("scope1");
                  setActiveCategory("fuel");
                  saveLCAPreferences(false, "manual");
                }}
                onInitialAnswer={(hasLCA) => {
                  setInitialQuestionnaireCompleted(true);
                  const mode = hasLCA ? "lca" : "manual";
                  setCalculationMode(mode);
                  if (!hasLCA) {
                    setActiveScope("scope1");
                    setActiveCategory("fuel");
                  }
                  saveLCAPreferences(hasLCA, mode);
                }}
                onComplete={() => {
                  // no-op
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSwitchToManual = () => {
    setCalculationMode("manual");
    setActiveScope("scope1");
    setActiveCategory("fuel");
    saveLCAPreferences(false, "manual");
  };

  const handleSwitchToLCA = () => {
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
    setCalculationMode("lca");
    setShowSwitchToLCADialog(false);
    saveLCAPreferences(true, "lca");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex">
      {/* Sidebar (hidden in LCA mode) */}
      {calculationMode !== "lca" && (
        <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col shadow-sm">
          <div className="p-8 border-b border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50">
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-teal-600 hover:bg-teal-50/50 rounded-lg px-3 py-2 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Back</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/emission-results")}
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  EPA Emission Calculator
                </h1>
                <p className="text-sm text-gray-500 mt-1">Scope 1 fuel (EPA) + Scope 2 electricity + Scope 3</p>
              </div>
            </div>
          </div>

          {companyContext && (
            <div className="px-6 py-5 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-blue-50/80 backdrop-blur-sm border-b border-blue-200/50">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg flex-shrink-0">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-900 truncate">Company-Specific Emissions</h3>
                      <p className="text-xs text-blue-600/80 mt-0.5">EPA calculator for specific counterparty</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-200 hover:shadow-md rounded-lg px-4 py-2 flex-shrink-0"
                    onClick={() => {
                      sessionStorage.removeItem("companyEmissionsContext");
                      setCompanyContext(null);
                      resetCalculatorState();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
                <div className="flex items-center gap-3 px-2">
                  <span className="text-sm text-blue-700 font-semibold">Company ID:</span>
                  <code className="px-3 py-1.5 bg-white/80 text-blue-800 text-sm font-mono rounded-lg border border-blue-200/50 shadow-sm flex-1 min-w-0 backdrop-blur-sm">
                    <span className="truncate block">{companyContext.counterpartyId}</span>
                  </code>
                </div>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-b from-white to-gray-50/30" key={`summary-${resetKey}`}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-extrabold text-red-600 mb-1">
                    {scopeTotals.scope1.toFixed(1)}
                  </div>
                  <div className="text-xs font-semibold text-red-700/80 uppercase tracking-wide">Scope 1 (Fuel)</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-200/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-extrabold text-yellow-600 mb-1">
                    {scopeTotals.scope2.toFixed(1)}
                  </div>
                  <div className="text-xs font-semibold text-yellow-700/80 uppercase tracking-wide">Scope 2 (Electricity)</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-extrabold text-blue-600 mb-1">
                    {scopeTotals.scope3.toFixed(1)}
                  </div>
                  <div className="text-xs font-semibold text-blue-700/80 uppercase tracking-wide">Scope 3</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-1">
                    {scopeTotals.total.toFixed(1)}
                  </div>
                  <div className="text-xs font-semibold text-teal-700/80 uppercase tracking-wide">Total</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <nav className="space-y-3">
              {sidebarItems.map((scope) => (
                <div key={scope.id}>
                  <button
                    onClick={() => toggleScope(scope.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      activeScope === scope.id
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30"
                        : "text-gray-700 hover:bg-gray-100/80 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <scope.icon
                        className={`h-5 w-5 ${activeScope === scope.id ? "text-white" : "text-gray-600"}`}
                      />
                      <span>{scope.title}</span>
                    </div>
                    {expandedScopes[scope.id] ? (
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          activeScope === scope.id ? "text-white" : "text-gray-500"
                        }`}
                      />
                    ) : (
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          activeScope === scope.id ? "text-white" : "text-gray-500"
                        }`}
                      />
                    )}
                  </button>

                  {expandedScopes[scope.id] && (
                    <div className="ml-2 mt-2 space-y-1.5 pl-2 border-l-2 border-gray-200/50">
                      {scope.id !== "scope3" ? (
                        scope.categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => handleCategoryClick(scope.id, category.id)}
                            className={`w-full flex items-center justify-start space-x-3 px-4 py-2.5 text-sm text-left rounded-lg transition-all duration-200 ${
                              activeScope === scope.id && activeCategory === category.id
                                ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-l-4 border-teal-500 shadow-sm font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                            }`}
                          >
                            <category.icon
                              className={`h-4 w-4 flex-shrink-0 ${
                                activeScope === scope.id && activeCategory === category.id
                                  ? "text-teal-600"
                                  : "text-gray-500"
                              }`}
                            />
                            <span className="text-left">{category.title}</span>
                          </button>
                        ))
                      ) : (
                        <div className="space-y-3">
                          {/* Upstream group */}
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setScope3GroupsExpanded((prev) => ({ ...prev, upstream: !prev.upstream }))
                              }
                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-teal-700/90 hover:bg-teal-50/50 rounded-lg transition-all duration-200"
                            >
                              <span>Upstream emissions</span>
                              {scope3GroupsExpanded.upstream ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {scope3GroupsExpanded.upstream && (
                              <div className="mt-1.5 space-y-1">
                                {scope.categories
                                  .filter((c: any) => c.group === "upstream")
                                  .map((category: any) => (
                                    <button
                                      key={category.id}
                                      onClick={() => handleCategoryClick(scope.id, category.id)}
                                      className={`w-full flex items-center justify-start space-x-3 px-4 py-2.5 text-sm text-left rounded-lg transition-all duration-200 ${
                                        activeScope === scope.id && activeCategory === category.id
                                          ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-l-4 border-teal-500 shadow-sm font-medium"
                                          : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                                      }`}
                                    >
                                      <category.icon
                                        className={`h-4 w-4 flex-shrink-0 ${
                                          activeScope === scope.id && activeCategory === category.id
                                            ? "text-teal-600"
                                            : "text-gray-500"
                                        }`}
                                      />
                                      <span className="text-left">{category.title}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Downstream group */}
                          <div className="pt-3 border-t border-gray-200/50">
                            <button
                              type="button"
                              onClick={() =>
                                setScope3GroupsExpanded((prev) => ({
                                  ...prev,
                                  downstream: !prev.downstream,
                                }))
                              }
                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-purple-700/90 hover:bg-purple-50/50 rounded-lg transition-all duration-200"
                            >
                              <span>Downstream emissions</span>
                              {scope3GroupsExpanded.downstream ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            {scope3GroupsExpanded.downstream && (
                              <div className="mt-1.5 space-y-1">
                                {scope.categories
                                  .filter((c: any) => c.group === "downstream")
                                  .map((category: any) => (
                                    <button
                                      key={category.id}
                                      onClick={() => handleCategoryClick(scope.id, category.id)}
                                      className={`w-full flex items-center justify-start space-x-3 px-4 py-2.5 text-sm text-left rounded-lg transition-all duration-200 ${
                                        activeScope === scope.id && activeCategory === category.id
                                          ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border-l-4 border-teal-500 shadow-sm font-medium"
                                          : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                                      }`}
                                    >
                                      <category.icon
                                        className={`h-4 w-4 flex-shrink-0 ${
                                          activeScope === scope.id && activeCategory === category.id
                                            ? "text-teal-600"
                                            : "text-gray-500"
                                        }`}
                                      />
                                      <span className="text-left">{category.title}</span>
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header with mode switch */}
        {(calculationMode === "manual" || calculationMode === "lca") && (
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-8 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {calculationMode === "manual" ? (
                  <>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                      {(() => {
                        const scope = sidebarItems.find((s) => s.id === activeScope);
                        const category = scope?.categories.find((c) => c.id === activeCategory);
                        return category ? `${scope?.title} - ${category.title}` : "Select a Category";
                      })()}
                    </h2>
                    <p className="text-gray-600 text-base">
                      {(() => {
                        const scope = sidebarItems.find((s) => s.id === activeScope);
                        const category = scope?.categories.find((c) => c.id === activeCategory);
                        return (
                          category?.description ||
                          "Choose a category from the sidebar to start calculating emissions (EPA variant)"
                        );
                      })()}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                      LCA Input Mode
                    </h2>
                    <p className="text-gray-600 text-base">
                      Enter your emissions data directly from your lifecycle assessment studies
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-full border border-gray-200/50">
                <span className="text-sm font-semibold text-gray-700">Manual</span>
                <Switch
                  checked={calculationMode === "lca"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowSwitchToLCADialog(true);
                    } else {
                      handleSwitchToManual();
                    }
                  }}
                  className="data-[state=checked]:bg-teal-600"
                />
                <span className="text-sm font-semibold text-gray-700">LCA</span>
              </div>
            </div>
          </header>
        )}

        {/* Switch confirmation */}
        <AlertDialog open={showSwitchToLCADialog} onOpenChange={setShowSwitchToLCADialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {calculationMode === "lca" ? "Switch to Manual Calculation?" : "Switch to LCA Input?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {calculationMode === "lca"
                  ? "Switching to manual calculation will clear all your current LCA data. This action cannot be undone. Are you sure you want to continue?"
                  : "Switching to LCA input will clear all your current manual calculation data. This action cannot be undone. Are you sure you want to continue?"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (calculationMode === "lca") {
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

        {/* Content */}
        <main className="flex-1 p-8 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50" data-content-area>
          {calculationMode === "lca" && (
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
                      // no-op
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {calculationMode === "manual" && (
            <>
              {/* Scope 1 – Fuel only (EPA factors handled inside FuelEmissions) */}
              {activeScope === "scope1" && activeCategory === "fuel" && (
                <div className="w-full" key={`fuel-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <FuelEmissions
                        onDataChange={handleFuelDataChange}
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
                        onSaveAndNext={navigateToNextCategory}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 1 – Mobile Fuel (Mobile Combustion reference) */}
              {activeScope === "scope1" && activeCategory === "mobileFuel" && (
                <div className="w-full" key={`mobile-fuel-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <MobileFuelEmissions
                        onDataChange={handleMobileFuelDataChange}
                        onSaveAndNext={navigateToNextCategory}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 1 – On-Road Gasoline (On-Road Gasoline reference) */}
              {activeScope === "scope1" && activeCategory === "onRoadGasoline" && (
                <div className="w-full" key={`on-road-gasoline-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <OnRoadGasolineEmissions
                        onDataChange={handleOnRoadGasolineDataChange}
                        onSaveAndNext={navigateToNextCategory}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 1 – On-Road Diesel & Alt Fuel */}
              {activeScope === "scope1" && activeCategory === "onRoadDieselAltFuel" && (
                <div className="w-full" key={`on-road-diesel-alt-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <OnRoadDieselAltFuelEmissions
                        onDataChange={handleOnRoadDieselAltFuelDataChange}
                        onSaveAndNext={navigateToNextCategory}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 1 – Non-Road Vehicle */}
              {activeScope === "scope1" && activeCategory === "nonRoadVehicle" && (
                <div className="w-full" key={`non-road-vehicle-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <NonRoadVehicleEmissions
                        onDataChange={handleNonRoadVehicleDataChange}
                        onSaveAndNext={navigateToNextCategory}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 1 – Heat & Steam (EPA Standard) */}
              {activeScope === "scope1" && activeCategory === "heatSteam" && (
                <div className="w-full" key={`heat-steam-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <HeatSteamEPAEmissions
                        onTotalChange={handleHeatSteamTotalChange}
                        onSaveAndNext={navigateToNextCategory}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 2 – Electricity only */}
              {activeScope === "scope2" && activeCategory === "electricity" && (
                <div className="w-full" key={`electricity-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <ElectricityEmissions
                        onTotalChange={handleElectricityDataChange}
                        onSaveAndNext={navigateToNextCategory}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 3 – unchanged */}
              {activeScope === "scope3" && (
                <div className="w-full" key={`scope3-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <Scope3Section
                        activeCategory={activeCategory}
                        emissionData={emissionData}
                        setEmissionData={setEmissionData}
                        onSaveAndNext={navigateToNextCategory}
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>

        {/* Bottom-right continue button (wizard/company flow) */}
        {(hasWizardContext || companyContext) && (
          <div className="fixed right-6 bottom-6 z-40">
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg px-5 py-2 rounded-lg"
              onClick={async () => {
                try {
                  if (hasWizardContext) {
                    if (companyContext) {
                      await saveCompanyEmissions(scopeTotals);
                    }

                    const saved = sessionStorage.getItem("esgWizardState");
                    const parsed = saved ? JSON.parse(saved) : {};
                    const totalEmissions = scopeTotals.total;

                    let verified_emissions = 0;
                    let unverified_emissions = 0;
                    const verificationStatus = parsed.formData?.verificationStatus || "";
                    if (verificationStatus === "verified") {
                      verified_emissions = totalEmissions;
                      unverified_emissions = 0;
                    } else if (verificationStatus === "unverified") {
                      unverified_emissions = totalEmissions;
                      verified_emissions = 0;
                    }

                    const updatedState = {
                      ...parsed,
                      resumeAtCalculation: true,
                      scope1Emissions: scopeTotals.scope1,
                      scope2Emissions: scopeTotals.scope2,
                      scope3Emissions: scopeTotals.scope3,
                      verified_emissions,
                      unverified_emissions,
                      totalEmissions,
                    };

                    sessionStorage.setItem("esgWizardState", JSON.stringify(updatedState));
                    navigate("/finance-emission", { state: { mode: wizardMode } });
                  } else if (companyContext) {
                    await saveCompanyEmissions(scopeTotals);
                    navigate(companyContext.returnUrl);
                  }
                } catch (error) {
                  console.error("Error saving EPA calculator state:", error);
                  if (hasWizardContext) {
                    navigate("/finance-emission", { state: { mode: wizardMode } });
                  } else if (companyContext) {
                    navigate(companyContext.returnUrl);
                  } else {
                    navigate("/emission-calculator-epa");
                  }
                }
              }}
            >
              {companyContext
                ? "Save & Return"
                : wizardMode === "finance"
                  ? "Continue to Finance Emission"
                  : "Continue to Facilitated Emission"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmissionCalculatorEPA;


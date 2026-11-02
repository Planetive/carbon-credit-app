import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
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
  Car,
  Wind,
  Snowflake,
  Building2,
  HandCoins,
  X,
  Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { loadEpaIpccResults, type EpaIpccResultsData } from "@/lib/epaIpccResults";
import { buildEpaSidebarDisplay } from "./epaSidebarTotals";
import { EpaReportingYearControl } from "@/features/emission-calculator/results/EpaReportingYearControl";
import {
  readSelectedReportingYear,
  writeSelectedReportingYear,
} from "@/features/emission-calculator/results/reportingYear";
import {
  blockEpaCompanySnapshot,
  blockEpaWizardHandoff,
} from "./epaCompanyHandoff";
import {
  loadCalculatorPreferences,
  saveCalculatorPreferences,
} from "@/integrations/supabase/calculatorPreferencesClient";
import { PurchasedHeatSteam } from "@/features/emission-calculator/scope2/components/PurchasedHeatSteam";
import ElectricityEmissions from "@/components/emissions/scope2/ElectricityEmissions";
import Scope3Section from "@/features/emission-calculator/scope3/Scope3Section";
import LCAQuestionnaire from "@/components/emissions/LCAQuestionnaire";
import { SourceScreeningPanel } from "@/features/emission-calculator/scope1/activity-based/components/SourceScreeningPanel";
import { StationaryCombustionSection } from "@/features/emission-calculator/scope1/activity-based/components/StationaryCombustionSection";
import { VehiclesMobileSection } from "@/features/emission-calculator/scope1/activity-based/components/VehiclesMobileSection";
import { LeaksReleasesSection } from "@/features/emission-calculator/scope1/activity-based/components/LeaksReleasesSection";
import { IndustrialOtherSection } from "@/features/emission-calculator/scope1/activity-based/components/IndustrialOtherSection";
import {
  DEFAULT_SCOPE1_SCREENING,
  type Scope1ScreeningState,
} from "@/features/emission-calculator/scope1/activity-based/types";
import {
  loadScope1Screening,
  loadScope1ScreeningResolved,
  saveScope1ScreeningResolved,
  inventoryHasUnresolvedSources,
  isScreeningFullyAnswered,
  markGroupCalculated,
} from "@/features/emission-calculator/scope1/activity-based/screeningStorage";
import { isGroupVisible } from "@/features/emission-calculator/scope1/activity-based/components/SourceScreeningPanel";
import type { Scope1ActivityGroupId } from "@/features/emission-calculator/scope1/activity-based/types";

/** Activity-based Scope 1 nav (methodology sheet names removed from user navigation). */
type Scope1GroupId = "activity";

type EpaSidebarCategory = {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  group?: Scope1GroupId | "upstream" | "downstream";
  comingSoon?: boolean;
};

const SCOPE1_NAV_GROUPS: { id: Scope1GroupId; label: string; headerClass: string }[] = [
  {
    id: "activity",
    label: "Direct emission sources",
    headerClass: "text-[#0F6E56]/90 hover:bg-[#EAF7F1]/50",
  },
];

const SCOPE1_CATEGORY_TO_ACTIVITY: Record<string, Scope1ActivityGroupId | null> = {
  scope1Screening: null,
  stationaryCombustion: "stationary",
  vehiclesMobile: "vehicles_mobile",
  leaksReleases: "leaks_releases",
  industrialOther: "industrial_other",
};

const EPA_SCOPE1_CATEGORIES: EpaSidebarCategory[] = [
  {
    id: "scope1Screening",
    title: "Source screening",
    icon: Info,
    description: "Which Scope 1 sources apply to your organization",
    group: "activity",
  },
  {
    id: "stationaryCombustion",
    title: "Stationary Combustion",
    icon: Flame,
    description: "Fuel burned in generators, boilers, heaters, furnaces, and cooking equipment",
    group: "activity",
  },
  {
    id: "vehiclesMobile",
    title: "Vehicles and Mobile Equipment",
    icon: Car,
    description: "Fuel burned in company vehicles and mobile equipment",
    group: "activity",
  },
  {
    id: "leaksReleases",
    title: "Leaks and Gas Releases",
    icon: Snowflake,
    description: "GHGs from cooling equipment and other gas-containing systems",
    group: "activity",
  },
  {
    id: "industrialOther",
    title: "Industrial and Other Direct",
    icon: Factory,
    description: "Flaring, venting, process and other direct sources",
    group: "activity",
  },
];

const EmissionCalculatorEPA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization, loading: organizationLoading } = useOrganization();
  const [reportingYear, setReportingYear] = useState(readSelectedReportingYear);
  const { toast } = useToast();
  const defaultManualCategory = "scope1Screening";

  const [activeScope, setActiveScope] = useState("scope1");
  const [activeCategory, setActiveCategory] = useState(defaultManualCategory);
  const [scope1Screening, setScope1Screening] =
    useState<Scope1ScreeningState>(DEFAULT_SCOPE1_SCREENING);
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
  const [scope1GroupsExpanded, setScope1GroupsExpanded] = useState<Record<Scope1GroupId, boolean>>({
    activity: true,
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
  const [scope1HeatSteamRows, setScope1HeatSteamRows] = useState<Array<{ emissions?: number }>>([]);
  const [ipccScope1Totals, setIpccScope1Totals] = useState<Record<string, number>>({});
  const [companyInventoryNotice, setCompanyInventoryNotice] = useState<string | null>(null);
  const [reportResults, setReportResults] = useState<EpaIpccResultsData | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    // Instant local cache, then merge DB answers once available.
    setScope1Screening(loadScope1Screening(user.id));
    void loadScope1ScreeningResolved(user.id, companyContext?.counterpartyId).then(
      setScope1Screening
    );
  }, [user?.id, companyContext?.counterpartyId]);

  const sidebarDisplay = buildEpaSidebarDisplay(reportResults, reportError);

  const markScope1ScreeningCalculated = (groupId: Scope1ActivityGroupId) => {
    setScope1Screening((prev) => {
      const next = markGroupCalculated(prev, groupId);
      if (next === prev) return prev;
      if (user?.id) {
        saveScope1ScreeningResolved(user.id, next, companyContext?.counterpartyId);
      }
      return next;
    });
  };

  // Handlers for Scope 1 fuel and Scope 2 electricity
  const handleFuelDataChange = (data: any[]) => {
    setEmissionData((prev) => ({
      ...prev,
      scope1: { ...prev.scope1, fuel: data },
    }));
    if (data.some((r) => (r.emissions || 0) > 0)) {
      markScope1ScreeningCalculated("stationary");
    }
  };

  const handleElectricityDataChange = (total: number) => {
    setEmissionData((prev) => {
      const existing = (prev.scope2 as any[]).find((item: any) => item.id === "electricity-total");
      if (existing && Number(existing.emissions) === Number(total)) return prev;
      return {
        ...prev,
        scope2: [
          ...(prev.scope2 as any[]).filter((item: any) => item.id !== "electricity-total"),
          { id: "electricity-total", emissions: total },
        ] as any,
      };
    });
  };

  const handleMobileFuelDataChange = (rows: Array<{ emissions?: number }>) => {
    const liveTotal = rows.reduce((s, r) => s + (r.emissions || 0), 0);
    // Unified vehicles form reports one assembled activity total. When live input exists,
    // park it in mobileFuelRows and clear sheet buckets so sidebar does not double-count.
    setMobileFuelRows(rows);
    if (liveTotal > 0) {
      setOnRoadGasolineRows([]);
      setOnRoadDieselAltFuelRows([]);
      setNonRoadVehicleRows([]);
      markScope1ScreeningCalculated("vehicles_mobile");
    }
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

  const handleScope1HeatSteamDataChange = (data: Array<{ emissions?: number }>) => {
    setScope1HeatSteamRows(data);
  };

  const handleRefrigerantDataChange = (data: Array<{ emissions?: number }>) => {
    setEmissionData((prev) => ({
      ...prev,
      scope1: {
        ...prev.scope1,
        refrigerant: data.map((row, index) => ({
          id: prev.scope1.refrigerant[index]?.id ?? `uk-refrigerant-${index}`,
          emissions: row.emissions,
          isExisting: prev.scope1.refrigerant[index]?.isExisting,
        })),
      },
    }));
    if (data.some((r) => (r.emissions || 0) > 0)) {
      markScope1ScreeningCalculated("leaks_releases");
    }
  };

  const handleHeatSteamTotalChange = (total: number) => {
    setEmissionData((prev) => {
      const existing = (prev.scope2 as any[]).find((item: any) => item.id === "heat-total");
      if (existing && Number(existing.emissions) === Number(total)) return prev;
      return {
        ...prev,
        scope2: [
          ...(prev.scope2 as any[]).filter((item: any) => item.id !== "heat-total"),
          { id: "heat-total", emissions: total },
        ] as any,
      };
    });
  };

  /**
   * Re-read entry tables and push Scope 1/2 into sidebar cards.
   * Call after delete/save so totals stay live without a full page reload.
   * No schema change required — activity groups are a UI map over existing tables.
   */
  const refreshSummaryFromDb = useCallback(
    async (opts?: { seedScope3IfEmpty?: boolean }) => {
      if (!user?.id || organizationLoading) return;
      if (!currentOrganization?.id) {
        setReportResults(null);
        setReportError("An organization is required before emissions can be shown.");
        return;
      }

      try {
        const results = await loadEpaIpccResults(user.id, {
          organizationId: currentOrganization.id,
          counterpartyId: companyContext?.counterpartyId,
          reportingYear,
        });
        setReportResults(results);
        setReportError(null);
        const electricityTotal = Number(
          (results.scope2.find((r) => r.key === "electricity")?.value ?? 0).toFixed(6)
        );
        const heatVerified = results.heatSteamVerified;
        const heatTotal = Number(
          (heatVerified
            ? heatVerified.status === "unavailable"
              ? 0
              : heatVerified.totalKgCo2e
            : (results.scope2.find((r) => r.key === "heatsteam")?.value ?? 0)
          ).toFixed(6)
        );
        const refrigerantTotal = Number(
          (results.scope1.find((r) => r.key === "uk_refrigerant")?.value ?? 0).toFixed(6)
        );
        const fuelTotal = Number(
          (results.scope1.find((r) => r.key === "fuel")?.value ?? 0).toFixed(6)
        );
        const heatSteamS1 = Number(
          (results.scope1.find((r) => r.key === "heatsteam")?.value ?? 0).toFixed(6)
        );
        const mobileTotal = Number(
          (results.scope1.find((r) => r.key === "mobile")?.value ?? 0).toFixed(6)
        );
        const onRoadGas = Number(
          (results.scope1.find((r) => r.key === "onroad_gas")?.value ?? 0).toFixed(6)
        );
        const onRoadDiesel = Number(
          (results.scope1.find((r) => r.key === "onroad_diesel")?.value ?? 0).toFixed(6)
        );
        const nonRoad = Number(
          (results.scope1.find((r) => r.key === "nonroad")?.value ?? 0).toFixed(6)
        );
        const kg = (key: string) =>
          Number((results.scope1.find((r) => r.key === key)?.value ?? 0).toFixed(6));

        setMobileFuelRows(mobileTotal > 0 ? [{ emissions: mobileTotal }] : []);
        setOnRoadGasolineRows(onRoadGas > 0 ? [{ emissions: onRoadGas }] : []);
        setOnRoadDieselAltFuelRows(onRoadDiesel > 0 ? [{ emissions: onRoadDiesel }] : []);
        setNonRoadVehicleRows(nonRoad > 0 ? [{ emissions: nonRoad }] : []);
        setScope1HeatSteamRows(heatSteamS1 > 0 ? [{ emissions: heatSteamS1 }] : []);
        setIpccScope1Totals({
          flaring: kg("flaring"),
          venting: kg("venting"),
          vehicularCarbonFootprints: kg("vehicular"),
          kitchenFootprints: kg("kitchen"),
          powerFuelConsumption: kg("power"),
          heatingFootprints: kg("heating"),
        });

        const scope3CategoryByKey: Record<string, string> = {
          purchased_goods: "purchased_goods_services",
          capital_goods: "capital_goods",
          fuel_energy: "fuel_energy_activities",
          upstream_transport: "upstream_transportation",
          waste: "waste_generated",
          business_travel: "business_travel",
          employee_commuting: "employee_commuting",
          investments: "investments",
          facilitated: "facilitated_emissions",
          downstream_transport: "downstream_transportation",
          end_of_life: "end_of_life_treatment",
          processing_sold: "processing_use_of_sold_products",
          use_of_sold: "processing_use_of_sold_products",
        };

        const hydratedScope3 = results.scope3
          .filter((r) => r.value > 0)
          .map((r) => ({
            id: `scope3-${r.key}`,
            category: scope3CategoryByKey[r.key] ?? r.key,
            emissions: r.value,
          })) as any[];

        setEmissionData((prev) => ({
          ...prev,
          scope1: {
            ...prev.scope1,
            // Always mirror DB (including zero after full delete).
            fuel:
              fuelTotal > 0
                ? [{ id: "fuel-hydrated", emissions: fuelTotal, isExisting: true } as any]
                : [],
            refrigerant:
              refrigerantTotal > 0
                ? [
                    {
                      id: "uk-refrigerant-hydrated",
                      emissions: refrigerantTotal,
                      isExisting: true,
                    } as any,
                  ]
                : [],
          },
          scope2: [
            ...prev.scope2.filter(
              (item: any) => item.id !== "electricity-total" && item.id !== "heat-total"
            ),
            { id: "electricity-total", emissions: electricityTotal },
            { id: "heat-total", emissions: heatTotal },
          ] as any,
          scope3:
            opts?.seedScope3IfEmpty && prev.scope3.length === 0
              ? hydratedScope3
              : prev.scope3,
        }));
      } catch (e) {
        console.warn("Failed to refresh EPA summary totals:", e);
        setReportResults(null);
        setReportError(
          e instanceof Error && e.message
            ? e.message
            : "EPA totals could not be loaded. This is not a zero inventory."
        );
      }
    },
    [user?.id, companyContext, organizationLoading, currentOrganization?.id, reportingYear]
  );

  // Initial hydrate so Scope cards show saved totals immediately.
  useEffect(() => {
    if (!user?.id || organizationLoading) return;
    void refreshSummaryFromDb({ seedScope3IfEmpty: true });
  }, [user?.id, organizationLoading, refreshSummaryFromDb]);

  // Session totals are kilograms and are not a complete company inventory.
  // Do not write them to company_emissions. Stationary activity saves are separate.
  const refuseCompanyInventorySave = () => {
    const decision = blockEpaCompanySnapshot();
    setCompanyInventoryNotice(decision.message);
    toast({
      title: "Company inventory not saved",
      description: decision.message,
    });
    return decision;
  };

  // Load LCA preferences
  useEffect(() => {
    const loadLCAPreferences = async () => {
      if (!user) {
        setLoadingPreferences(false);
        return;
      }

      try {
        const data = await loadCalculatorPreferences(user.id);
        if (data?.initial_questionnaire_completed) {
          setInitialQuestionnaireCompleted(true);
          if (data.calculation_mode === "lca" || data.calculation_mode === "manual") {
            setCalculationMode(data.calculation_mode);
          } else {
            setCalculationMode(data.has_lca_data ? "lca" : "manual");
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
      await saveCalculatorPreferences(user.id, {
        has_lca_data: hasLCA,
        calculation_mode: mode,
        initial_questionnaire_completed: true,
      });
    } catch (error) {
      console.error("Error saving LCA preferences (EPA):", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
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

          const resolvedCounterpartyId =
            counterpartyId || parsed?.counterpartyId || parsed?.formData?.counterpartyId;
          if (resolvedCounterpartyId) {
            setCompanyContext({
              counterpartyId: resolvedCounterpartyId,
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
        if (fromWizard) {
          // Wizard flow context is handled by the wizard-context effect.
          return;
        }

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
    setIpccScope1Totals({});
    setActiveScope("scope1");
    setActiveCategory(defaultManualCategory);
    setResetKey((prev) => prev + 1);

    toast({
      title: "Calculator Reset",
      description: "Starting with fresh EPA calculations",
    });
  };

  const handleIpccScope1TotalChange = (categoryId: string, totalMeT: number) => {
    setIpccScope1Totals((prev) => {
      if (prev[categoryId] === totalMeT) return prev;
      return { ...prev, [categoryId]: totalMeT };
    });
    if (
      (categoryId === "flaring" || categoryId === "venting") &&
      totalMeT > 0
    ) {
      markScope1ScreeningCalculated("industrial_other");
    }
  };

  const expandScope1GroupForCategory = (categoryId: string) => {
    const group = EPA_SCOPE1_CATEGORIES.find((c) => c.id === categoryId)?.group;
    if (group && group !== "upstream" && group !== "downstream") {
      setScope1GroupsExpanded((prev) => ({ ...prev, [group]: true }));
    }
  };

  const sidebarItems = [
    {
      id: "scope1",
      title: "Scope 1",
      icon: Factory,
      description: "Direct emissions by activity source (stationary, vehicles, leaks, industrial)",
      categories: EPA_SCOPE1_CATEGORIES,
    },
    {
      id: "scope2",
      title: "Scope 2",
      icon: Zap,
      description: "Indirect emissions from purchased energy",
      categories: [
        { id: "electricity", title: "Electricity", icon: Zap, description: "Purchased electricity consumption" },
        { id: "heatSteam", title: "Heat & Steam", icon: Thermometer, description: "Purchased Heat and Steam" },
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
        { id: "investments", title: "Investments", icon: Building2, description: "Category 15: equity stakes and financed emissions", group: "downstream" },
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
        {
          id: "facilitatedEmissions",
          title: "Facilitated emissions",
          icon: HandCoins,
          description: "Underwriting, advisory, or other facilitated emissions",
          group: "downstream",
        },
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
    const category = EPA_SCOPE1_CATEGORIES.find((c) => c.id === categoryId);
    if (category?.comingSoon) {
      toast({
        title: "Coming soon",
        description: `${category.title} calculators will be available in a future release.`,
      });
    }
    setActiveScope(scopeId);
    setActiveCategory(categoryId);
    if (scopeId === "scope1") {
      expandScope1GroupForCategory(categoryId);
    }
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

      if (next.scope === "scope1") {
        expandScope1GroupForCategory(next.category);
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
      <div className="min-h-screen bg-gradient-to-br from-[#EAF7F1] via-[#EDF8F3] to-[#F0F9F6] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the EPA emission calculator.</p>
          <Button onClick={() => navigate("/login")} className="bg-[#1D9E75] hover:bg-[#22B87E] text-white">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D9E75] mx-auto mb-4" />
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
            <CardContent className="p-4 sm:p-6">
              <LCAQuestionnaire
                emissionData={emissionData}
                setEmissionData={setEmissionData}
                showInitialQuestion={true}
                showHeader={false}
                onSwitchToManual={() => {
                  setInitialQuestionnaireCompleted(true);
                  setCalculationMode("manual");
                  setActiveScope("scope1");
                  setActiveCategory(defaultManualCategory);
                  saveLCAPreferences(false, "manual");
                }}
                onInitialAnswer={(hasLCA) => {
                  setInitialQuestionnaireCompleted(true);
                  const mode = hasLCA ? "lca" : "manual";
                  setCalculationMode(mode);
                  if (!hasLCA) {
                    setActiveScope("scope1");
                    setActiveCategory(defaultManualCategory);
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
    setActiveCategory(defaultManualCategory);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col lg:flex-row lg:items-start">
      {/* Sidebar — sticky while the form scrolls; scrolls itself if taller than the viewport */}
      {calculationMode !== "lca" && (
        <div className="w-full lg:w-80 lg:shrink-0 bg-white/80 backdrop-blur-sm border-b lg:border-b-0 lg:border-r border-gray-200/50 flex flex-col shadow-sm lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto custom-scrollbar">
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-[#1D9E75] hover:bg-[#EAF7F1]/50 rounded-lg px-3 py-2 transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Back</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/emission-results-calculator")}
                className="text-gray-600 hover:text-[#1D9E75] hover:bg-[#EAF7F1]/50 rounded-lg px-3 py-2 transition-all duration-200"
              >
                <span className="text-sm font-medium">Results</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 bg-gradient-to-br from-[#1C7A53] to-[#1D9E75] rounded-2xl shadow-lg">
                <Factory className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  EPA
                </h1>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="p-6 border-b border-gray-200/50 bg-gradient-to-b from-white to-gray-50/30" key={`summary-${resetKey}`}>
            <div className="grid grid-cols-1 gap-4 mb-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold text-red-600">
                      {sidebarDisplay.scope1Label}
                    </div>
                    <div className="text-xs font-semibold text-red-700/80 uppercase tracking-wide text-right">
                      Scope 1
                      <div className="normal-case tracking-normal">{sidebarDisplay.unit}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-200/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold text-yellow-600">
                      {sidebarDisplay.scope2Label}
                    </div>
                    <div className="text-xs font-semibold text-yellow-700/80 uppercase tracking-wide text-right">
                      Scope 2
                      <div className="normal-case tracking-normal">{sidebarDisplay.unit}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold text-blue-600">
                      {sidebarDisplay.scope3Label}
                    </div>
                    <div className="text-xs font-semibold text-blue-700/80 uppercase tracking-wide text-right">
                      Scope 3
                      <div className="normal-case tracking-normal">{sidebarDisplay.unit}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-[#BFE3D3]/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold bg-gradient-to-r from-[#1D9E75] to-emerald-600 bg-clip-text text-transparent">
                      {sidebarDisplay.grandLabel}
                    </div>
                    <div className="text-xs font-semibold text-[#0F6E56]/80 uppercase tracking-wide text-right">
                      Total
                      <div className="normal-case tracking-normal">{sidebarDisplay.unit}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <EpaReportingYearControl
              year={reportingYear}
              onChange={(year) => {
                writeSelectedReportingYear(year);
                setReportingYear(year);
              }}
            />
            {sidebarDisplay.compactNote ? (
              <p className="mt-3 text-xs leading-snug text-gray-500 line-clamp-2">
                {sidebarDisplay.compactNote}
              </p>
            ) : null}
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 sm:p-6">
            <nav className="space-y-3">
              {sidebarItems.map((scope) => (
                <div key={scope.id}>
                  <button
                    onClick={() => toggleScope(scope.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                      activeScope === scope.id
                        ? "bg-gradient-to-r from-[#1D9E75] to-emerald-500 text-white shadow-lg shadow-[0_10px_24px_-8px_rgba(29,158,117,0.35)]"
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
                      {scope.id === "scope1" ? (
                        <div className="space-y-3">
                          {SCOPE1_NAV_GROUPS.map((group, groupIndex) => {
                            const groupCategories = scope.categories.filter((c) => {
                              if ((c as EpaSidebarCategory).group !== group.id) return false;
                              const activityId = SCOPE1_CATEGORY_TO_ACTIVITY[c.id];
                              if (activityId == null) return true; // screening always visible
                              // Hide forms marked not applicable; screening remains editable.
                              return isGroupVisible(scope1Screening, activityId);
                            });
                            if (groupCategories.length === 0) return null;
                            return (
                              <div key={group.id} className={groupIndex > 0 ? "pt-3 border-t border-gray-200/50" : ""}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setScope1GroupsExpanded((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                                  }
                                  className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 text-left ${group.headerClass}`}
                                >
                                  <span className="flex-1 min-w-0 text-left leading-snug">{group.label}</span>
                                  {scope1GroupsExpanded[group.id] ? (
                                    <ChevronDown className="h-4 w-4 shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                  )}
                                </button>
                                {scope1GroupsExpanded[group.id] && (
                                  <div className="mt-1.5 space-y-1">
                                    {groupCategories.map((category) => {
                                      const epaCategory = category as EpaSidebarCategory;
                                      const isComingSoon = epaCategory.comingSoon === true;
                                      return (
                                        <button
                                          key={category.id}
                                          onClick={() => handleCategoryClick(scope.id, category.id)}
                                          className={`w-full flex items-center justify-start gap-3 px-4 py-2.5 text-sm text-left rounded-lg transition-all duration-200 ${
                                            activeScope === scope.id && activeCategory === category.id
                                              ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-[#0F6E56] border-l-4 border-[#1D9E75] shadow-sm font-medium"
                                              : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                                          }`}
                                        >
                                          <category.icon
                                            className={`h-4 w-4 flex-shrink-0 ${
                                              activeScope === scope.id && activeCategory === category.id
                                                ? "text-[#1D9E75]"
                                                : "text-gray-500"
                                            }`}
                                          />
                                          <span className="flex-1 min-w-0 text-left leading-snug">{category.title}</span>
                                          {isComingSoon && (
                                            <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                              Soon
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : scope.id === "scope2" ? (
                        scope.categories.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => handleCategoryClick(scope.id, category.id)}
                            className={`w-full flex items-center justify-start space-x-3 px-4 py-2.5 text-sm text-left rounded-lg transition-all duration-200 ${
                              activeScope === scope.id && activeCategory === category.id
                                ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-[#0F6E56] border-l-4 border-[#1D9E75] shadow-sm font-medium"
                                : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                            }`}
                          >
                            <category.icon
                              className={`h-4 w-4 flex-shrink-0 ${
                                activeScope === scope.id && activeCategory === category.id
                                  ? "text-[#1D9E75]"
                                  : "text-gray-500"
                              }`}
                            />
                            <span className="flex items-center gap-1.5 text-left">
                              {category.title}
                              {category.id === "heatSteam" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-gray-400 hover:text-[#1D9E75]" />
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs max-w-xs">
                                    Purchased Heat and Steam
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
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
                              className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0F6E56]/90 hover:bg-[#EAF7F1]/50 rounded-lg transition-all duration-200"
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
                                          ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-[#0F6E56] border-l-4 border-[#1D9E75] shadow-sm font-medium"
                                          : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                                      }`}
                                    >
                                      <category.icon
                                        className={`h-4 w-4 flex-shrink-0 ${
                                          activeScope === scope.id && activeCategory === category.id
                                            ? "text-[#1D9E75]"
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
                                          ? "bg-gradient-to-r from-teal-50 to-emerald-50 text-[#0F6E56] border-l-4 border-[#1D9E75] shadow-sm font-medium"
                                          : "text-gray-600 hover:bg-gray-50 hover:translate-x-1"
                                      }`}
                                    >
                                      <category.icon
                                        className={`h-4 w-4 flex-shrink-0 ${
                                          activeScope === scope.id && activeCategory === category.id
                                            ? "text-[#1D9E75]"
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

      {/* Main content — scrolls with the page */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with mode switch */}
        {(calculationMode === "manual" || calculationMode === "lca") && (
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-3 sm:px-4 py-3 sm:py-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              <div className="flex-1 min-w-0">
                {calculationMode === "manual" ? (
                  // Scope 1 activity forms render their own title — avoid a second loud header.
                  activeScope === "scope1" && activeCategory !== "scope1Screening" ? (
                    <p className="text-sm text-gray-500">
                      {sidebarItems
                        .find((s) => s.id === activeScope)
                        ?.categories.find((c) => c.id === activeCategory)?.description ||
                        "Direct emission sources"}
                    </p>
                  ) : (
                  <>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                      {(() => {
                        const scope = sidebarItems.find((s) => s.id === activeScope);
                        const category = scope?.categories.find((c) => c.id === activeCategory);
                        if (!category) return "Select a category";
                        if (activeScope === "scope1" && activeCategory === "scope1Screening") {
                          return "Scope 1";
                        }
                        return `${scope?.title} · ${category.title}`;
                      })()}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {(() => {
                        const category = sidebarItems
                          .find((s) => s.id === activeScope)
                          ?.categories.find((c) => c.id === activeCategory);
                        if (activeScope === "scope1" && activeCategory === "scope1Screening") {
                          return "Identify which direct emission sources apply";
                        }
                        return (
                          category?.description ||
                          "Choose a category from the sidebar to start calculating"
                        );
                      })()}
                    </p>
                  </>
                  )
                ) : (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                      LCA Input Mode
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Enter your emissions data directly from your lifecycle assessment studies
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 self-start md:self-auto">
                <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 bg-gray-50 rounded-full border border-gray-200/50">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Manual</span>
                <Switch
                  checked={calculationMode === "lca"}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowSwitchToLCADialog(true);
                    } else {
                      handleSwitchToManual();
                    }
                  }}
                  className="data-[state=checked]:bg-[#1D9E75]"
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-700">LCA</span>
                </div>
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
        <main className="flex-1 p-3 sm:p-4 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50" data-content-area>
          {calculationMode === "lca" && (
            <div className="w-full max-w-none">
              <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                <CardContent className="p-4 sm:p-6">
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
              {activeScope === "scope1" &&
                isScreeningFullyAnswered(scope1Screening) &&
                inventoryHasUnresolvedSources(scope1Screening) &&
                activeCategory !== "scope1Screening" && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3.5 py-2 text-xs text-amber-900/90">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    Some sources you marked Yes still need numbers — missing data isn’t treated as
                    zero.
                  </div>
                )}

              {activeScope === "scope1" && activeCategory === "scope1Screening" && (
                <div className="w-full" key={`scope1-screening-${resetKey}`}>
                  <Card className="bg-white border border-gray-200/60 shadow-sm rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <SourceScreeningPanel
                        screening={scope1Screening}
                        onChange={(next) => {
                          setScope1Screening(next);
                          if (user?.id) {
                            saveScope1ScreeningResolved(
                              user.id,
                              next,
                              companyContext?.counterpartyId
                            );
                          }
                        }}
                        onContinue={(nextId) => {
                          setActiveCategory(nextId || "scope1Screening");
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeScope === "scope1" &&
                isScreeningFullyAnswered(scope1Screening) &&
                activeCategory === "stationaryCombustion" &&
                isGroupVisible(scope1Screening, "stationary") && (
                <div className="w-full" key={`stationary-${resetKey}`}>
                  <Card className="bg-white border border-gray-200/60 shadow-sm rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <StationaryCombustionSection
                        onDataChange={handleFuelDataChange}
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
                        reportingYear={reportingYear}
                        onSaveAndNext={navigateToNextCategory}
                        onInventoryChanged={() => void refreshSummaryFromDb()}
                        onSaved={() => void refreshSummaryFromDb()}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeScope === "scope1" &&
                isScreeningFullyAnswered(scope1Screening) &&
                activeCategory === "vehiclesMobile" &&
                isGroupVisible(scope1Screening, "vehicles_mobile") && (
                <div className="w-full" key={`vehicles-${resetKey}`}>
                  <Card className="bg-white border border-gray-200/60 shadow-sm rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <VehiclesMobileSection
                        onDataChange={(kg) =>
                          handleMobileFuelDataChange([{ emissions: kg }])
                        }
                        counterpartyId={companyContext?.counterpartyId}
                        reportingYear={reportingYear}
                        onSaveAndNext={navigateToNextCategory}
                        onInventoryChanged={() => void refreshSummaryFromDb()}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeScope === "scope1" &&
                isScreeningFullyAnswered(scope1Screening) &&
                activeCategory === "leaksReleases" &&
                isGroupVisible(scope1Screening, "leaks_releases") && (
                <div className="w-full" key={`leaks-${resetKey}`}>
                  <Card className="bg-white border border-gray-200/60 shadow-sm rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <LeaksReleasesSection
                        onDataChange={handleRefrigerantDataChange}
                        onSaveAndNext={navigateToNextCategory}
                        onInventoryChanged={() => void refreshSummaryFromDb()}
                        counterpartyId={companyContext?.counterpartyId}
                        reportingYear={reportingYear}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeScope === "scope1" &&
                isScreeningFullyAnswered(scope1Screening) &&
                activeCategory === "industrialOther" &&
                isGroupVisible(scope1Screening, "industrial_other") && (
                <div className="w-full" key={`industrial-${resetKey}`}>
                  <Card className="bg-white border border-gray-200/60 shadow-sm rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <IndustrialOtherSection
                        onScope1CategoryTotalChange={handleIpccScope1TotalChange}
                        onInventoryChanged={() => void refreshSummaryFromDb()}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 2 – Heat & Steam (EPA Standard) — purchased energy only */}
              {activeScope === "scope2" && activeCategory === "heatSteam" && (
                <div className="w-full" key={`heat-steam-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <PurchasedHeatSteam
                        onTotalChange={handleHeatSteamTotalChange}
                        onSaveAndNext={navigateToNextCategory}
                        counterpartyId={companyContext?.counterpartyId}
                        reportingYear={reportingYear}
                        onInventoryChanged={() => void refreshSummaryFromDb()}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 2 – Electricity */}
              {activeScope === "scope2" && activeCategory === "electricity" && (
                <div className="w-full" key={`electricity-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <ElectricityEmissions
                        onTotalChange={handleElectricityDataChange}
                        onSaveAndNext={navigateToNextCategory}
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
                        authoritativeInventory
                        reportingYear={reportingYear}
                        onInventoryChanged={() => void refreshSummaryFromDb()}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 3 – unchanged */}
              {activeScope === "scope3" && (
                <div className="w-full" key={`scope3-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-4 sm:p-6">
                      <Scope3Section
                        activeCategory={activeCategory}
                        emissionData={emissionData}
                        setEmissionData={setEmissionData}
                        onSaveAndNext={navigateToNextCategory}
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
                        framework="epa"
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
          <div className="fixed right-6 bottom-6 z-40 max-w-sm">
            {companyInventoryNotice ? (
              <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950 shadow">
                {companyInventoryNotice}
              </p>
            ) : null}
            <Button
              className="bg-[#1D9E75] hover:bg-[#22B87E] text-white shadow-lg px-5 py-2 rounded-lg"
              onClick={() => {
                refuseCompanyInventorySave();
                if (!hasWizardContext) return;
                try {
                  const saved = sessionStorage.getItem("esgWizardState");
                  const parsed = saved ? JSON.parse(saved) : {};
                  const blocked = blockEpaWizardHandoff({
                    ...parsed,
                    mode: wizardMode || parsed.mode,
                    counterpartyId:
                      companyContext?.counterpartyId ||
                      parsed.counterpartyId ||
                      parsed.formData?.counterpartyId,
                    resumeAtCalculation: parsed.resumeAtCalculation === true,
                    formData: {
                      ...(parsed.formData || {}),
                      counterpartyId:
                        companyContext?.counterpartyId ||
                        parsed.counterpartyId ||
                        parsed.formData?.counterpartyId,
                    },
                    ts: Date.now(),
                  });
                  sessionStorage.setItem("esgWizardState", JSON.stringify(blocked));
                } catch (error) {
                  console.error("Error blocking EPA wizard handoff:", error);
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


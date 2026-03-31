import { useState, useEffect, useRef } from "react";
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
  Info,
  Download,
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
import { isMariEnergiesUserEmail } from "@/utils/roleUtils";
import EmissionCalculatorIPCC from "@/pages/EmissionCalculatorIPCC";

type EmissionPdfReportData = {
  company: string;
  period: string;
  year: string;
  description?: string;
  preparedBy?: string;
  date?: string;
  s1: { stationary: number; mobile: number; fugitive: number; process: number };
  s2: { electricity: number; heat: number };
  s3: { upstream: number; downstream: number; travel: number; commute: number; waste: number };
  targetYear?: string;
  targetPct?: string;
};

const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getReportCSS = (): string => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .report { width: 800px; font-family: Arial, sans-serif; background: #ffffff; color: #1a2318; }
  .cover { width: 800px; height: 1131px; background: #e8f0eb; position: relative; display: flex; flex-direction: column; padding: 0; page-break-after: always; overflow: hidden; }
  .cover-border-top { position: absolute; top: 0; left: 0; width: 100%; height: 52px; background: #1a3d2e; }
  .cover-border-bottom { position: absolute; bottom: 0; left: 0; width: 100%; height: 52px; background: #1a3d2e; }
  .cover-border-left { position: absolute; top: 0; left: 0; width: 52px; height: 100%; background: #1a3d2e; }
  .cover-border-right { position: absolute; top: 0; right: 0; width: 52px; height: 100%; background: #1a3d2e; }
  .cover-header { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; padding: 14px 80px; height: 52px; }
  .cover-logo { display: flex; align-items: center; gap: 10px; color: #e8f0eb; font-size: 15px; font-weight: 500; }
  .cover-logo-icon { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #4ade80; display: flex; align-items: center; justify-content: center; }
  .cover-logo-inner { width: 10px; height: 10px; border-radius: 50%; border: 1.5px solid #4ade80; }
  .cover-year { color: #e8f0eb; font-size: 16px; font-weight: 500; }
  .cover-body { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0 80px; }
  .cover-title { font-size: 72px; font-weight: 400; color: #1a3d2e; line-height: 1.1; letter-spacing: -1px; margin-bottom: 32px; }
  .cover-company { font-size: 22px; font-weight: 400; color: #1a3d2e; margin-bottom: 8px; }
  .cover-period { font-size: 18px; font-weight: 300; color: #5a7260; }
  .cover-description { font-size: 14px; font-weight: 300; color: #5a7260; margin-top: 24px; line-height: 1.7; max-width: 520px; }
  .cover-footer { position: relative; z-index: 2; padding: 0 80px 66px; font-size: 11px; color: #5a7260; text-align: center; line-height: 1.6; }
  .inner-page { width: 800px; min-height: 1131px; background: #ffffff; padding: 0 0 60px; page-break-after: always; }
  .page-header { background: #1a3d2e; padding: 14px 40px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
  .page-header-logo { color: #ffffff; font-size: 13px; font-weight: 400; }
  .page-header-meta { color: rgba(255,255,255,0.7); font-size: 11px; }
  .page-content { padding: 0 40px; }
  .page-title { font-size: 32px; font-weight: 400; color: #1a3d2e; margin-bottom: 6px; }
  .page-divider { height: 1px; background: #3a7d57; margin-bottom: 28px; }
  .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 36px; }
  .summary-card { background: #e8f0eb; border-radius: 8px; padding: 16px 14px; text-align: center; }
  .summary-card-label { font-size: 10px; font-weight: 500; color: #3a7d57; letter-spacing: 0.3px; margin-bottom: 8px; text-transform: uppercase; }
  .summary-card-value { font-size: 22px; font-weight: 500; color: #1a3d2e; margin-bottom: 2px; }
  .summary-card-unit { font-size: 10px; color: #5a7260; }
  .summary-card.total .summary-card-label { color: #a32d2d; }
  .summary-card.total .summary-card-value { color: #a32d2d; }
  .scope-section { margin-bottom: 24px; }
  .scope-header { background: #1a3d2e; padding: 8px 16px; border-radius: 4px 4px 0 0; }
  .scope-header-text { font-size: 11px; font-weight: 500; color: #ffffff; letter-spacing: 0.8px; text-transform: uppercase; }
  .scope-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 16px; font-size: 12px; color: #2a4a32; border-bottom: 1px solid #e8f0eb; }
  .scope-row.shaded { background: #f4f8f5; }
  .scope-subtotal { display: flex; justify-content: space-between; align-items: center; padding: 9px 16px; font-size: 12px; font-weight: 500; color: #1a3d2e; border-top: 1.5px solid #3a7d57; border-bottom: 1px solid #e8f0eb; }
  .scope-subheading { font-size: 11px; font-weight: 700; color: #1a3d2e; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.4px; }
  .grand-total { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #1a3d2e; border-radius: 4px; margin-top: 20px; }
  .grand-total-label { font-size: 13px; font-weight: 500; color: #ffffff; letter-spacing: 0.5px; }
  .grand-total-value { font-size: 14px; font-weight: 500; color: #ffffff; }
  .reduction-target { background: #e8f8ec; border-radius: 6px; padding: 14px 16px; margin-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  .reduction-label { font-size: 10px; font-weight: 500; color: #3a7d57; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 4px; }
  .reduction-text { font-size: 13px; color: #1a3d2e; }
  .page-number { text-align: center; font-size: 10px; color: #5a7260; padding: 24px 0 0; }
  .back-cover { width: 800px; height: 1131px; background: #1a3d2e; display: flex; align-items: flex-end; justify-content: flex-end; padding: 60px 72px; }
  .powered-by { text-align: right; }
  .powered-by-label { font-size: 16px; color: rgba(255,255,255,0.6); margin-bottom: 4px; }
  .powered-by-name { font-size: 22px; color: #ffffff; }
`;

const getReportContent = (data: EmissionPdfReportData): string => {
  const totalS1 = data.s1.stationary + data.s1.mobile + data.s1.fugitive + data.s1.process;
  const totalS2 = data.s2.electricity + data.s2.heat;
  const totalS3 = data.s3.upstream + data.s3.downstream + data.s3.travel + data.s3.commute + data.s3.waste;
  const grandTotal = totalS1 + totalS2 + totalS3;
  const fmt = (n: number) => n.toFixed(2);

  return `
  <div class="report">
    <div class="cover">
      <div class="cover-border-top"></div><div class="cover-border-bottom"></div><div class="cover-border-left"></div><div class="cover-border-right"></div>
      <div class="cover-header">
        <div class="cover-logo"><div class="cover-logo-icon"><div class="cover-logo-inner"></div></div>Rethink Carbon</div>
        <div class="cover-year">${escapeHtml(data.year)}</div>
      </div>
      <div class="cover-body">
        <div class="cover-title">Carbon Emissions<br>Report</div>
        <div class="cover-company">${escapeHtml(data.company)}</div>
        <div class="cover-period">${escapeHtml(data.period)}</div>
        ${data.description ? `<div class="cover-description">${escapeHtml(data.description)}</div>` : ""}
      </div>
      <div class="cover-footer">This report contains proprietary and confidential information of ${escapeHtml(data.company)} and is intended solely for internal use and authorized stakeholders.</div>
    </div>
    <div class="inner-page">
      <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(data.company)} &nbsp;|&nbsp; ${escapeHtml(data.period)}</div></div>
      <div class="page-content">
        <div class="page-title">Executive Summary</div><div class="page-divider"></div>
        <div class="summary-cards">
          <div class="summary-card"><div class="summary-card-label">Scope 1 · Direct</div><div class="summary-card-value">${fmt(totalS1)}</div><div class="summary-card-unit">tCO2e</div></div>
          <div class="summary-card"><div class="summary-card-label">Scope 2 · Indirect</div><div class="summary-card-value">${fmt(totalS2)}</div><div class="summary-card-unit">tCO2e</div></div>
          <div class="summary-card"><div class="summary-card-label">Scope 3 · Value Chain</div><div class="summary-card-value">${fmt(totalS3)}</div><div class="summary-card-unit">tCO2e</div></div>
          <div class="summary-card total"><div class="summary-card-label">Total Emissions</div><div class="summary-card-value">${fmt(grandTotal)}</div><div class="summary-card-unit">tCO2e</div></div>
        </div>
        <div class="scope-section">
          <div class="scope-header"><div class="scope-header-text">Scope 1 — Direct Emissions</div></div>
          <div class="scope-row"><span>Stationary Combustion</span><span>${fmt(data.s1.stationary)} tCO2e</span></div>
          <div class="scope-row shaded"><span>Mobile Combustion</span><span>${fmt(data.s1.mobile)} tCO2e</span></div>
          <div class="scope-row"><span>Fugitive Emissions</span><span>${fmt(data.s1.fugitive)} tCO2e</span></div>
          <div class="scope-row shaded"><span>Process Emissions</span><span>${fmt(data.s1.process)} tCO2e</span></div>
          <div class="scope-subtotal"><span>Scope 1 Total</span><span>${fmt(totalS1)} tCO2e</span></div>
        </div>
        <div class="scope-section">
          <div class="scope-header"><div class="scope-header-text">Scope 2 — Indirect Energy Emissions</div></div>
          <div class="scope-row"><span>Purchased Electricity</span><span>${fmt(data.s2.electricity)} tCO2e</span></div>
          <div class="scope-row shaded"><span>Purchased Heat / Steam</span><span>${fmt(data.s2.heat)} tCO2e</span></div>
          <div class="scope-subtotal"><span>Scope 2 Total</span><span>${fmt(totalS2)} tCO2e</span></div>
        </div>
        <div class="scope-section">
          <div class="scope-header"><div class="scope-header-text">Scope 3 — Value Chain Emissions</div></div>
          <div class="scope-subheading">Upstream</div>
          <div class="scope-row"><span>Upstream Activities</span><span>${fmt(data.s3.upstream)} tCO2e</span></div>
          <div class="scope-row shaded"><span>Business Travel</span><span>${fmt(data.s3.travel)} tCO2e</span></div>
          <div class="scope-row"><span>Employee Commuting</span><span>${fmt(data.s3.commute)} tCO2e</span></div>
          <div class="scope-row shaded"><span>Waste</span><span>${fmt(data.s3.waste)} tCO2e</span></div>
          <div class="scope-subheading">Downstream</div>
          <div class="scope-row"><span>Downstream Activities</span><span>${fmt(data.s3.downstream)} tCO2e</span></div>
          <div class="scope-subtotal"><span>Scope 3 Total</span><span>${fmt(totalS3)} tCO2e</span></div>
        </div>
        <div class="grand-total"><div class="grand-total-label">GRAND TOTAL EMISSIONS</div><div class="grand-total-value">${fmt(grandTotal)} tCO2e</div></div>
        ${data.targetYear && data.targetPct ? `<div class="reduction-target"><div><div class="reduction-label">Reduction Target</div><div class="reduction-text">Achieve ${escapeHtml(data.targetPct)}% reduction in total emissions by ${escapeHtml(data.targetYear)}</div></div></div>` : ""}
        ${data.preparedBy || data.date ? `<div style="margin-top: 24px; font-size: 11px; color: #5a7260;">${data.preparedBy ? `Prepared by: ${escapeHtml(data.preparedBy)}` : ""}${data.preparedBy && data.date ? "&nbsp;&nbsp;·&nbsp;&nbsp;" : ""}${data.date ? `Date: ${escapeHtml(data.date)}` : ""}</div>` : ""}
        <div class="page-number">2</div>
      </div>
    </div>
    <div class="back-cover"><div class="powered-by"><div class="powered-by-label">Powered by</div><div class="powered-by-name">Rethink Carbon</div></div></div>
  </div>
  `;
};

const EmissionCalculatorEPA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMariUser = isMariEnergiesUserEmail(user?.email);
  const defaultManualCategory = "fuel";
  const mariScope1CategoryIds = [
    "flaring",
    "venting",
    "vehicularCarbonFootprints",
    "kitchenFootprints",
    "powerFuelConsumption",
    "heatingFootprints",
  ];

  const [activeScope, setActiveScope] = useState("scope1");
  const [activeCategory, setActiveCategory] = useState(defaultManualCategory);
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
  const hasHydratedSummaryRef = useRef(false);
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
  const [mariIpccScope1Totals, setMariIpccScope1Totals] = useState<Record<string, number>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // Totals – Scope 1 fuel + vehicle tables + Heat and Steam (Scope 1), Scope 2 = electricity + heat & steam, Scope 3 unchanged
  const scopeTotals: ScopeTotals = {
    scope1:
      calculationMode === "lca"
        ? emissionData.scope3.find((r) => r.category === "lca_scope1")?.emissions || 0
        : emissionData.scope1.fuel.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          mobileFuelRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          onRoadGasolineRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          onRoadDieselAltFuelRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          nonRoadVehicleRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          scope1HeatSteamRows.reduce((sum, r) => sum + (r.emissions || 0), 0) +
          (isMariUser ? Object.values(mariIpccScope1Totals).reduce((sum, v) => sum + (v || 0), 0) : 0),
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
      scope2: [...prev.scope2.filter((item: any) => item.id !== "electricity-total"), { id: "electricity-total", emissions: total }] as any,
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

  const handleScope1HeatSteamDataChange = (data: Array<{ emissions?: number }>) => {
    setScope1HeatSteamRows(data);
  };

  const handleHeatSteamTotalChange = (total: number) => {
    setEmissionData((prev) => ({
      ...prev,
      scope2: [...prev.scope2.filter((item: any) => item.id !== "heat-total"), { id: "heat-total", emissions: total }] as any,
    }));
  };

  // Hydrate sidebar totals from saved DB entries so Scope 2/3 appear immediately.
  useEffect(() => {
    const hydrateSavedTotals = async () => {
      if (!user?.id || hasHydratedSummaryRef.current) return;
      hasHydratedSummaryRef.current = true;

      try {
        const { data: mainRow } = await (supabase as any)
          .from("scope2_electricity_main")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let electricityTotal = 0;
        if (mainRow) {
          const totalKwh = Number(mainRow.total_kwh) || 0;
          const gridPct = Number(mainRow.grid_pct) || 0;
          const otherPct = Number(mainRow.other_pct) || 0;
          const { data: subs } = await (supabase as any)
            .from("scope2_electricity_subanswers")
            .select("*")
            .eq("user_id", user.id)
            .eq("main_id", mainRow.id);
          const gridRow = (subs || []).find((r: any) => r.type === "grid");
          const gridFactor = Number(gridRow?.grid_emission_factor || 0);
          const gridPart = totalKwh > 0 && gridPct > 0 && gridFactor > 0 ? (gridPct / 100) * totalKwh * gridFactor : 0;
          const otherRows = (subs || []).filter((r: any) => r.type === "other");
          const sumOtherEmissions = otherRows.reduce((s: number, r: any) => s + (Number(r.other_sources_emissions) || 0), 0);
          const otherPart = totalKwh > 0 && otherPct > 0 ? (otherPct / 100) * totalKwh * sumOtherEmissions : 0;
          electricityTotal = Number((gridPart + otherPart).toFixed(6));
        }

        const { data: heatRows } = await (supabase as any)
          .from("scope2_heatsteam_entries_epa")
          .select("emissions")
          .eq("user_id", user.id);
        const heatTotal = Number(
          ((heatRows || []).reduce((s: number, r: any) => s + (Number(r.emissions) || 0), 0)).toFixed(6)
        );

        const sumEmissions = (rows: any[] | null | undefined) =>
          (rows || []).reduce((s: number, r: any) => s + (Number(r.emissions) || 0), 0);
        const sumRowDataEmissions = (rows: any[] | null | undefined) =>
          (rows || []).reduce((s: number, r: any) => s + (Number(r?.row_data?.emissions) || 0), 0);

        const [
          purchasedGoodsRes,
          capitalGoodsRes,
          fuelEnergyRes,
          upstreamTransportRes,
          wasteGeneratedRes,
          businessTravelRes,
          employeeCommutingRes,
          investmentsRes,
          downstreamTransportRes,
          endOfLifeRes,
          processingSoldRes,
          useOfSoldRes,
        ] = await Promise.all([
          (supabase as any).from("scope3_purchased_goods_services").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_capital_goods").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_fuel_energy_activities").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_upstream_transportation").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_waste_generated").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_business_travel").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_employee_commuting").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_investments").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_downstream_transportation").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_end_of_life_treatment").select("emissions").eq("user_id", user.id),
          (supabase as any).from("scope3_processing_sold_products").select("row_data").eq("user_id", user.id),
          (supabase as any).from("scope3_use_of_sold_products").select("row_data").eq("user_id", user.id),
        ]);

        const hydratedScope3 = [
          { id: "scope3-purchased-goods", category: "purchased_goods_services", emissions: sumEmissions(purchasedGoodsRes.data) },
          { id: "scope3-capital-goods", category: "capital_goods", emissions: sumEmissions(capitalGoodsRes.data) },
          { id: "scope3-fuel-energy", category: "fuel_energy_activities", emissions: sumEmissions(fuelEnergyRes.data) },
          { id: "scope3-upstream-transport", category: "upstream_transportation", emissions: sumEmissions(upstreamTransportRes.data) },
          { id: "scope3-waste-generated", category: "waste_generated", emissions: sumEmissions(wasteGeneratedRes.data) },
          { id: "scope3-business-travel", category: "business_travel", emissions: sumEmissions(businessTravelRes.data) },
          { id: "scope3-employee-commuting", category: "employee_commuting", emissions: sumEmissions(employeeCommutingRes.data) },
          { id: "scope3-investments", category: "investments", emissions: sumEmissions(investmentsRes.data) },
          { id: "scope3-downstream-transport", category: "downstream_transportation", emissions: sumEmissions(downstreamTransportRes.data) },
          { id: "scope3-end-of-life", category: "end_of_life_treatment", emissions: sumEmissions(endOfLifeRes.data) },
          { id: "scope3-processing-sold", category: "processing_use_of_sold_products", emissions: sumRowDataEmissions(processingSoldRes.data) },
          { id: "scope3-use-of-sold", category: "processing_use_of_sold_products", emissions: sumRowDataEmissions(useOfSoldRes.data) },
        ].filter((r) => (r.emissions || 0) > 0) as any[];

        setEmissionData((prev) => ({
          ...prev,
          scope2: [
            ...prev.scope2.filter((item: any) => item.id !== "electricity-total" && item.id !== "heat-total"),
            { id: "electricity-total", emissions: electricityTotal },
            { id: "heat-total", emissions: heatTotal },
          ] as any,
          scope3: prev.scope3.length > 0 ? prev.scope3 : hydratedScope3,
        }));
      } catch (e) {
        console.warn("Failed to hydrate EPA summary totals:", e);
      }
    };

    hydrateSavedTotals();
  }, [user?.id]);

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
    setMariIpccScope1Totals({});
    setActiveScope("scope1");
    setActiveCategory(defaultManualCategory);
    setResetKey((prev) => prev + 1);

    toast({
      title: "Calculator Reset",
      description: "Starting with fresh EPA calculations",
    });
  };

  const handleMariScope1TotalChange = (categoryId: string, totalMeT: number) => {
    setMariIpccScope1Totals((prev) => {
      if (prev[categoryId] === totalMeT) return prev;
      return { ...prev, [categoryId]: totalMeT };
    });
  };

  // Sidebar – EPA version: Scope 1 Fuel only, Scope 2 Electricity + Heat & Steam, Scope 3 unchanged
  const baseScope1Categories = [
    { id: "fuel", title: "Fuel", icon: Flame, description: "Stationary combustion fuels (EPA factors)" },
    { id: "scope1HeatSteam", title: "Heat and Steam", icon: Thermometer, description: "Heat and steam (Scope 1, same form as Fuel)" },
    { id: "mobileFuel", title: "Mobile Fuel", icon: Truck, description: "Mobile fuel using Mobile Combustion table" },
    { id: "onRoadGasoline", title: "On-Road Gasoline", icon: Truck, description: "On-road gasoline using On-Road Gasoline table" },
    { id: "onRoadDieselAltFuel", title: "On-Road Diesel & Alt Fuel", icon: Truck, description: "On-road diesel/alt fuel using On-Road Diesel & Alt Fuel table" },
    { id: "nonRoadVehicle", title: "Non-Road Vehicle", icon: Truck, description: "Non-road vehicle fuel using Non-Road Vehicle table" },
  ];

  const mariIpccScope1Categories = [
    { id: "flaring", title: "Flaring", icon: Flame, description: "Scope 1 flaring calculator" },
    { id: "venting", title: "Venting", icon: Flame, description: "Scope 1 venting calculator" },
    {
      id: "vehicularCarbonFootprints",
      title: "Vehicular Carbon Footprints",
      icon: Truck,
      description: "Scope 1 vehicular emissions calculator",
    },
    { id: "kitchenFootprints", title: "Kitchen Footprints", icon: Flame, description: "Scope 1 kitchen emissions calculator" },
    {
      id: "powerFuelConsumption",
      title: "Fuel Consumption for Power",
      icon: Factory,
      description: "Scope 1 power fuel emissions calculator",
    },
    { id: "heatingFootprints", title: "Heating", icon: Thermometer, description: "Scope 1 heating emissions calculator" },
  ];

  const scope1Categories = isMariUser
    ? [...baseScope1Categories, ...mariIpccScope1Categories]
    : baseScope1Categories;

  const sidebarItems = [
    {
      id: "scope1",
      title: isMariUser ? "Scope 1" : "Scope 1 (EPA Fuel)",
      icon: Factory,
      description: isMariUser
        ? "Scope 1 calculators available for your account"
        : "Direct emissions from fuel combustion (EPA factors)",
      categories: scope1Categories,
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

  const sumScope3ByCategories = (categories: string[]) =>
    emissionData.scope3
      .filter((row) => categories.includes(String(row.category || "")))
      .reduce((sum, row) => sum + (Number(row.emissions) || 0), 0);

  const buildPdfReportData = (): EmissionPdfReportData => {
    const stationary = emissionData.scope1.fuel.reduce((sum, row) => sum + (row.emissions || 0), 0);
    const mobile =
      mobileFuelRows.reduce((sum, row) => sum + (row.emissions || 0), 0) +
      onRoadGasolineRows.reduce((sum, row) => sum + (row.emissions || 0), 0) +
      onRoadDieselAltFuelRows.reduce((sum, row) => sum + (row.emissions || 0), 0) +
      nonRoadVehicleRows.reduce((sum, row) => sum + (row.emissions || 0), 0) +
      (mariIpccScope1Totals.vehicularCarbonFootprints || 0);
    const fugitive = (mariIpccScope1Totals.flaring || 0) + (mariIpccScope1Totals.venting || 0);
    const process =
      scope1HeatSteamRows.reduce((sum, row) => sum + (row.emissions || 0), 0) +
      (mariIpccScope1Totals.kitchenFootprints || 0) +
      (mariIpccScope1Totals.powerFuelConsumption || 0) +
      (mariIpccScope1Totals.heatingFootprints || 0);

    const electricity = emissionData.scope2.find((item: any) => item.id === "electricity-total")?.emissions || 0;
    const heat = emissionData.scope2.find((item: any) => item.id === "heat-total")?.emissions || 0;

    const travel = sumScope3ByCategories(["business_travel", "businessTravel"]);
    const commute = sumScope3ByCategories(["employee_commuting", "employeeCommuting"]);
    const upstream = sumScope3ByCategories([
      "purchased_goods_services",
      "capital_goods",
      "fuel_energy_activities",
      "upstream_transportation",
      "upstream_leased_assets",
    ]);
    const downstream = sumScope3ByCategories([
      "investments",
      "downstream_transportation",
      "processing_use_of_sold_products",
      "end_of_life_treatment",
      "downstream_leased_assets",
      "franchises",
    ]);
    const waste = sumScope3ByCategories(["waste_generated", "wasteGenerated"]);

    return {
      company: companyContext?.counterpartyId || "Organization",
      period: new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      year: String(new Date().getFullYear()),
      description: "EPA + IPCC greenhouse gas emissions summary report.",
      preparedBy: user?.email || "Rethink Carbon User",
      date: new Date().toLocaleDateString(),
      s1: { stationary, mobile, fugitive, process },
      s2: { electricity, heat },
      s3: { upstream, downstream, travel, commute, waste },
    };
  };

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");
      const reportData = buildPdfReportData();

      const wrapper = document.createElement("div");
      wrapper.style.width = "800px";
      wrapper.style.position = "absolute";
      wrapper.style.left = "-99999px";
      wrapper.style.top = "0";
      wrapper.style.background = "#ffffff";
      wrapper.innerHTML = `<style>${getReportCSS()}</style>${getReportContent(reportData)}`;
      document.body.appendChild(wrapper);

      const target = wrapper.querySelector(".report") as HTMLElement;
      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: true,
      });

      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      const fileDate = new Date().toISOString().slice(0, 10);
      pdf.save(`EPA_IPCC_Emissions_Report_${fileDate}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({
        title: "PDF generation failed",
        description: "Could not generate the report PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar (hidden in LCA mode) */}
      {calculationMode !== "lca" && (
        <div className="w-full lg:w-80 bg-white/80 backdrop-blur-sm border-b lg:border-b-0 lg:border-r border-gray-200/50 flex flex-col shadow-sm">
          <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
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
                onClick={() => navigate(isMariUser ? "/emission-results-calculator" : "/emission-results?source=epa")}
                className="text-gray-600 hover:text-teal-600 hover:bg-teal-50/50 rounded-lg px-3 py-2 transition-all duration-200"
              >
                <span className="text-sm font-medium">Results</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-3 sm:p-3.5 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl shadow-lg">
                <Factory className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Emission Calculator
                </h1>
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
            <div className="grid grid-cols-1 gap-4 mb-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-2 border-red-200/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold text-red-600">
                      {scopeTotals.scope1.toLocaleString(undefined, {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}
                    </div>
                    <div className="text-xs font-semibold text-red-700/80 uppercase tracking-wide text-right">
                      Scope 1
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-2 border-yellow-200/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold text-yellow-600">
                      {scopeTotals.scope2.toLocaleString(undefined, {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}
                    </div>
                    <div className="text-xs font-semibold text-yellow-700/80 uppercase tracking-wide text-right">
                      Scope 2
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-2 border-blue-200/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold text-blue-600">
                      {scopeTotals.scope3.toLocaleString(undefined, {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}
                    </div>
                    <div className="text-xs font-semibold text-blue-700/80 uppercase tracking-wide text-right">
                      Scope 3
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-2 border-teal-300/50">
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-2xl font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                      {scopeTotals.total.toLocaleString(undefined, {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}
                    </div>
                    <div className="text-xs font-semibold text-teal-700/80 uppercase tracking-wide text-right">
                      Total
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
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
                            <span className="flex items-center gap-1.5 text-left">
                              {category.title}
                              {scope.id === "scope2" && category.id === "heatSteam" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-gray-400 hover:text-teal-600" />
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
          <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-4 sm:px-6 md:px-8 py-4 sm:py-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              <div className="flex-1">
                {calculationMode === "manual" ? (
                  <>
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
                      {(() => {
                        const scope = sidebarItems.find((s) => s.id === activeScope);
                        const category = scope?.categories.find((c) => c.id === activeCategory);
                        return category ? `${scope?.title} - ${category.title}` : "Select a Category";
                      })()}
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base">
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
                  className="data-[state=checked]:bg-teal-600"
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
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-50/50 via-white to-gray-50/50" data-content-area>
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
              {isMariUser && activeScope === "scope1" && mariScope1CategoryIds.includes(activeCategory) && (
                <div className="w-full" key={`mari-ipcc-embedded-${activeCategory}-${resetKey}`}>
                  <EmissionCalculatorIPCC
                    embedded
                    forcedCategory={activeCategory}
                    onScope1CategoryTotalChange={handleMariScope1TotalChange}
                  />
                </div>
              )}

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

              {/* Scope 1 – Heat and Steam (same as Fuel, different name; no hover icon) */}
              {activeScope === "scope1" && activeCategory === "scope1HeatSteam" && (
                <div className="w-full" key={`scope1-heat-steam-${resetKey}`}>
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-xl rounded-2xl">
                    <CardContent className="p-8">
                      <FuelEmissions
                        onDataChange={handleScope1HeatSteamDataChange}
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
                        onSaveAndNext={navigateToNextCategory}
                        sectionTitle="Heat and Steam"
                        sectionDescription="Add your organization's heat and steam consumption data"
                        variant="scope1HeatSteam"
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
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
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
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
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
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
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
                        companyContext={!!companyContext}
                        counterpartyId={companyContext?.counterpartyId}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Scope 2 – Heat & Steam (EPA Standard) */}
              {activeScope === "scope2" && activeCategory === "heatSteam" && (
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

              {/* Scope 2 – Electricity */}
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


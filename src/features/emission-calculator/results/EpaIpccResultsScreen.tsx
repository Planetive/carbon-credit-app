import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { loadEpaIpccResults, EpaIpccResultsData } from "@/lib/epaIpccResults";
import { loadLegacyCategoryDetailRows } from "@/integrations/supabase/ghgEntryAggregates";
import { buildReportingTotals } from "./reportingTotals";
import { buildEpaResultsCsv } from "./resultsExport";
import { exportFullEmissionReportPdf } from "@/utils/fullEmissionReportExport";
import ResultsSummaryCard from "./components/ResultsSummaryCard";
import ScopeHighlightCards from "./components/ScopeHighlightCards";
import EmissionsAnalyticsRow from "./components/EmissionsAnalyticsRow";
import ResultsBreakdownTabs from "./components/ResultsBreakdownTabs";
import { formatKg, formatTonnes } from "./components/formatters";

const HIDDEN_DETAIL_COLUMNS = [
  "id",
  "user_id",
  "organization_id",
  "created_at",
  "updated_at",
  "counterparty_id",
  "factor",
  "emission_factor",
  "emissions_output",
  "emissions_output_unit",
  "standard",
];

const EMISSION_SELECTION_LABELS: Record<string, string> = {
  ch4_only: "CH4",
  n2o_only: "N2O",
  co2_only: "CO2",
  co2e: "CO2e",
};

function readResultsCounterpartyId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fromUrl = new URLSearchParams(window.location.search).get("counterpartyId");
  if (fromUrl) return fromUrl;
  try {
    const raw = sessionStorage.getItem("companyEmissionsContext");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { counterpartyId?: string; timestamp?: number };
    if (!parsed.counterpartyId) return undefined;
    if (typeof parsed.timestamp === "number" && Date.now() - parsed.timestamp >= 1000 * 60 * 30) {
      return undefined;
    }
    return parsed.counterpartyId;
  } catch {
    return undefined;
  }
}

const EpaIpccResultsScreen = () => {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<EpaIpccResultsData | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string>(new Date().toISOString());
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState("scope1");

  const prettifyColumnLabel = (col: string) =>
    col.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const formatDateLike = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  };

  const formatObjectValue = (val: any): string => {
    if (val == null) return "";
    if (typeof val !== "object") return String(val);

    if (Array.isArray(val)) {
      if (val.length === 0) return "None";
      const first = val[0];
      if (typeof first === "object") {
        return val
          .map((item) => {
            if (item.formula && item.percentage != null) return `${item.formula}: ${item.percentage}%`;
            if (item.gas && item.percentage != null) return `${item.gas}: ${item.percentage}%`;
            return JSON.stringify(item);
          })
          .join(", ");
      }
      return val.map((x) => String(x)).join(", ");
    }

    if ("totalCO2e_kg" in val) {
      const kg = Number((val as any).totalCO2e_kg || 0);
      return `${formatKg(kg)} kg CO2e (${formatTonnes(kg)} t CO2e)`;
    }

    return JSON.stringify(val);
  };

  const formatDetailValue = (column: string, value: any): string => {
    if (value == null) return "";

    if (column === "emission_selection" && typeof value === "string") {
      return EMISSION_SELECTION_LABELS[value] || value.replace(/_/g, " ").toUpperCase();
    }

    if (column === "month_start" && typeof value === "string") {
      return formatDateLike(value);
    }

    if (typeof value === "number") return value.toLocaleString();
    if (typeof value === "object") return formatObjectValue(value);
    if (typeof value === "string" && (value.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(value))) {
      return formatDateLike(value);
    }

    return String(value);
  };

  const isNumericDetailColumn = (column: string, rows: any[]): boolean => {
    return rows.some((row) => {
      const value = row?.[column];
      return (
        typeof value === "number" ||
        column === "emissions" ||
        column === "quantity" ||
        /(_kg|_liters|_miles|_factor|_pct|_percent)$/i.test(column)
      );
    });
  };

  useEffect(() => {
    document.title = "Carbon Footprint Assessment";

    let cancelled = false;
    const run = async (quiet = false) => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      if (!quiet) setLoading(true);
      try {
        const data = await loadEpaIpccResults(user.id, {
          organizationId: currentOrganization?.id,
          counterpartyId: readResultsCounterpartyId(),
        });
        if (cancelled) return;
        setResults(data);
        setSubmittedAt(new Date().toISOString());
      } finally {
        if (!cancelled && !quiet) setLoading(false);
      }
    };
    void run(false);
    const onVisible = () => {
      if (document.visibilityState === "visible") void run(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, navigate, currentOrganization?.id]);

  const exportCsv = () => {
    if (!results) return;

    const csv = buildEpaResultsCsv(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emission-calculator-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!results) return;
    setIsGeneratingPdf(true);
    try {
      await exportFullEmissionReportPdf({
        user,
        results,
        isMariUser: true,
        fuelFramework: "epa",
        submittedAt,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const loadCategoryDetails = async (key: string) => {
    if (!user) return;

    if (detailKey === key) {
      setDetailKey(null);
      setDetailRows([]);
      setDetailError(null);
      return;
    }

    setDetailKey(key);
    setDetailLoading(true);
    setDetailError(null);

    try {
      const rows = await loadLegacyCategoryDetailRows(key, user.id, { variant: "epa_ipcc" });
      setDetailRows(rows);
    } catch (e: any) {
      setDetailError(e?.message || "Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  const reporting = useMemo(() => (results ? buildReportingTotals(results) : null), [results]);

  const categoriesWithScope = useMemo(() => {
    if (!results || !reporting || reporting.status === "incomplete") return [];
    const verified = results.stationaryVerified;
    const verifiedRow =
      verified?.status === "ready" && reporting.verifiedKg != null && reporting.verifiedKg > 0
        ? [
            {
              key: "stationary_verified",
              label: "Stationary combustion (verified)",
              value: reporting.verifiedKg,
              scope: "Scope 1" as const,
            },
          ]
        : [];
    return [
      ...verifiedRow,
      ...reporting.reportableScope1.map((r) => ({ ...r, scope: "Scope 1" as const })),
      ...results.scope2.map((r) => ({ ...r, scope: "Scope 2" as const })),
      ...results.scope3.map((r) => ({ ...r, scope: "Scope 3" as const })),
    ];
  }, [results, reporting]);

  const categoriesCalculated = useMemo(() => {
    return categoriesWithScope.filter((r) => r.value > 0).length;
  }, [categoriesWithScope]);

  if (loading) {
    return (
      <div className="min-h-full bg-[#F8FAFC] flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D9E75] mx-auto mb-3" />
          <p className="text-slate-600">Loading assessment results…</p>
        </div>
      </div>
    );
  }

  if (!results || !reporting) {
    return (
      <div className="min-h-full bg-[#F8FAFC] flex items-center justify-center px-4 py-24">
        <Card className="w-full max-w-lg border-slate-200 shadow-sm">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-slate-700">No results found yet for this emission calculator assessment.</p>
            <Button
              onClick={() => navigate("/emission-calculator-epa")}
              className="bg-[#1D9E75] hover:bg-[#178A66] text-white"
            >
              Back to calculator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      <div className="w-full px-3 sm:px-4 py-5 sm:py-6 space-y-6">
        <ResultsSummaryCard
          grandTotalKg={reporting.grandKg ?? 0}
          categoriesCalculated={categoriesCalculated}
          submittedAt={submittedAt}
          inventoryStatus={reporting.status}
          statusNote={reporting.statusLabel}
          onEditAssessment={() => navigate("/emission-calculator-epa")}
          onExportPdf={exportPdf}
          onExportExcel={exportCsv}
          isGeneratingPdf={isGeneratingPdf}
        />

        {reporting.status === "incomplete" ? null : (
          <>
            <ScopeHighlightCards
              scope1Kg={reporting.scope1Kg ?? 0}
              scope2Kg={results.totals.scope2}
              scope3Kg={results.totals.scope3}
              grandKg={reporting.grandKg ?? 0}
            />

            <EmissionsAnalyticsRow
              scope1Kg={reporting.scope1Kg ?? 0}
              scope2Kg={results.totals.scope2}
              scope3Kg={results.totals.scope3}
              grandKg={reporting.grandKg ?? 0}
              categories={categoriesWithScope}
            />
          </>
        )}

        <ResultsBreakdownTabs
          results={results}
          detailKey={detailKey}
          detailRows={detailRows}
          detailLoading={detailLoading}
          detailError={detailError}
          onToggleDetails={loadCategoryDetails}
          formatDetailValue={formatDetailValue}
          isNumericDetailColumn={isNumericDetailColumn}
          prettifyColumnLabel={prettifyColumnLabel}
          hiddenDetailColumns={HIDDEN_DETAIL_COLUMNS}
          activeTab={breakdownTab}
          onTabChange={setBreakdownTab}
        />
      </div>
    </div>
  );
};

export default EpaIpccResultsScreen;

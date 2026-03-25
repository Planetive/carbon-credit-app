import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Download, Factory, Leaf, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadEpaIpccResults, EpaIpccResultsData } from "@/lib/epaIpccResults";
import { isMariEnergiesUserEmail } from "@/utils/roleUtils";
import { supabase } from "@/integrations/supabase/client";

const formatKg = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const formatTonnes = (value: number) =>
  (value / 1000).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const escapeHtml = (unsafe: string): string =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getReportCSS = (): string => `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  .report { width: 800px; font-family: 'DM Sans', Arial, sans-serif; color: #1f2a23; background: #fff; }

  /* Cover page (styled like provided sample) */
  .cover { width: 800px; height: 1131px; background: #d9e0e3; position: relative; overflow: hidden; page-break-after: always; }
  .cover-border-top { position: absolute; top: 0; left: 0; width: 100%; height: 30px; background: #0c4a3f; }
  .cover-border-bottom { position: absolute; bottom: 0; left: 0; width: 100%; height: 30px; background: #0c4a3f; }
  .cover-border-left { position: absolute; top: 0; left: 0; width: 30px; height: 100%; background: #0c4a3f; }
  .cover-border-right { position: absolute; top: 0; right: 0; width: 30px; height: 100%; background: #0c4a3f; }
  .cover-inner { position: absolute; top: 30px; right: 30px; bottom: 30px; left: 30px; padding: 28px 30px 34px; }
  .cover-header { display: flex; justify-content: space-between; align-items: center; }
  .cover-logo-wrap { display: flex; align-items: center; margin-top: 8px; }
  .cover-logo-wrap img {
    height: 68px;
    width: auto;
    max-width: 220px;
    display: block;
    object-fit: contain;
  }
  .cover-year { font-family: 'Playfair Display', serif; font-size: 34px; color: #0A3D2E; }
  .cover-body { margin-top: 190px; padding-left: 20px; }
  .cover-title { font-family: 'Playfair Display', serif; font-size: 62px; line-height: 1.04; letter-spacing: -0.6px; color: #0A3D2E; margin-bottom: 26px; }
  .cover-company { font-family: 'Playfair Display', serif; font-size: 42px; color: #0A3D2E; margin-bottom: 8px; }
  .cover-period { font-family: 'Playfair Display', serif; font-size: 34px; color: #0A3D2E; margin-bottom: 18px; }
  .cover-description { font-size: 14px; color: #526158; line-height: 1.7; max-width: 560px; }
  .cover-footer { position: absolute; right: 20px; bottom: 8px; left: 20px; font-size: 10px; color: #3d4b42; text-align: center; }

  /* Inner summary page */
  .inner-page { width: 800px; min-height: 1131px; background: #fff; page-break-after: always; position: relative; }
  .page-header { background: #0c4a3f; color: #fff; padding: 14px 34px; display: flex; justify-content: space-between; align-items: center; }
  .page-header-logo { font-family: 'Playfair Display', serif; font-size: 16px; }
  .page-header-meta { font-size: 11px; opacity: 0.85; }
  .page-content { padding: 30px 34px 66px; }
  .page-title { font-family: 'Playfair Display', serif; font-size: 34px; color: #0A3D2E; margin-bottom: 6px; }
  .page-divider { height: 1px; background: #9cb0a6; margin-bottom: 20px; }
  .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
  .summary-card { border: 1px solid #dce6df; background: #f4f8f5; border-radius: 10px; padding: 12px; text-align: center; }
  .summary-card-label { font-size: 10px; color: #0A3D2E; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; letter-spacing: 0.4px; }
  .summary-card-value { font-size: 20px; font-weight: 700; color: #0A3D2E; }
  .summary-card-unit { font-size: 10px; color: #6a7a72; margin-top: 2px; }
  .summary-card.total { background: #fff2f2; border-color: #f2c8c8; }
  .summary-card.total .summary-card-label, .summary-card.total .summary-card-value { color: #9b2f2f; }
  .scope-section { border: 1px solid #d9e3dd; border-radius: 8px; overflow: hidden; margin-bottom: 14px; }
  .scope-header { background: #0A3D2E; padding: 8px 12px; }
  .scope-header-text { font-size: 11px; color: #fff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
  .scope-row, .scope-subtotal, .grand-total { display: flex; justify-content: space-between; align-items: center; }
  .scope-row { padding: 9px 12px; font-size: 12px; border-top: 1px solid #edf3ef; color: #264435; }
  .scope-row.shaded { background: #f8fbf9; }
  .scope-subtotal { padding: 10px 12px; font-size: 12px; font-weight: 700; color: #0A3D2E; background: #f0f7f3; border-top: 1px solid #d7e4dc; }
  .grand-total { margin-top: 14px; background: #15392c; color: #fff; border-radius: 8px; padding: 12px 14px; font-weight: 700; }
  .grand-total-label { font-size: 12px; letter-spacing: 0.4px; }
  .grand-total-value { font-size: 13px; }
  .page-number {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 20px;
    text-align: center;
    font-size: 10px;
    color: #6c7e74;
  }
  .toc-title { font-family: 'Playfair Display', serif; font-size: 30px; color: #0A3D2E; margin-bottom: 14px; }
  .toc-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid #d8e3dd; }
  .toc-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 2px; border-bottom: 1px solid #e8efeb; font-size: 14px; color: #274739; }
  .about-box { margin-top: 24px; border: 1px solid #d9e5df; border-radius: 10px; background: #f8fbf9; padding: 14px 16px; }
  .about-title { font-size: 16px; font-weight: 700; color: #0A3D2E; margin-bottom: 8px; }
  .about-text { font-size: 12px; color: #355244; line-height: 1.65; }
  .section-title { font-family: 'Playfair Display', serif; font-size: 30px; color: #0A3D2E; margin-bottom: 8px; }
  .subsection-title { font-size: 18px; font-weight: 700; color: #0A3D2E; margin-top: 6px; margin-bottom: 10px; }
  .body-text { font-size: 12px; color: #2f4a3d; line-height: 1.65; margin-bottom: 10px; }
  .bullet-list {
    margin: 0 0 10px 0;
    padding: 0;
    list-style: none;
  }
  .bullet-list li {
    font-size: 12px;
    color: #2f4a3d;
    line-height: 1.55;
    margin-bottom: 6px;
    padding-left: 18px;
    position: relative;
  }
  .bullet-list li::before {
    content: "•";
    position: absolute;
    left: 4px;
    top: 0;
    color: #0A3D2E;
    font-size: 13px;
    line-height: 1.45;
  }
  .methodology-figure { margin-top: 10px; border: 1px solid #d9e5df; border-radius: 10px; padding: 8px; background: #fff; }
  .methodology-figure img { width: 100%; max-height: 430px; object-fit: contain; display: block; }
  .figure-caption { font-size: 10px; color: #5b6f64; margin-top: 8px; text-align: center; }
  .op-table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #cfded5; }
  .op-table th { background: #0A3D2E; color: #fff; text-align: left; font-size: 10px; letter-spacing: 0.35px; text-transform: uppercase; padding: 8px; }
  .op-table td { border-top: 1px solid #dce8e1; padding: 7px 8px; font-size: 11px; color: #2f4a3d; vertical-align: top; line-height: 1.45; }
  .op-group td { background: #edf5f1; font-weight: 700; color: #0A3D2E; border-top: 1px solid #cfe0d7; }
  .op-subhead { font-weight: 700; color: #0A3D2E; }
  .exec-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-bottom: 14px; }
  .exec-card { border: 1px solid #dce7e1; border-radius: 10px; background: #fbfdfc; padding: 12px; }
  .exec-card-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.35px; color: #0A3D2E; margin-bottom: 8px; }
  .exec-kpi { font-size: 24px; font-weight: 700; color: #0A3D2E; margin-bottom: 10px; }
  .scope-bar { margin-bottom: 8px; }
  .scope-bar-top { display: flex; justify-content: space-between; font-size: 11px; color: #2b4a3c; margin-bottom: 4px; }
  .scope-bar-track { height: 7px; width: 100%; border-radius: 999px; background: #e7efea; overflow: hidden; }
  .scope-bar-fill { height: 100%; border-radius: 999px; }
  .insights-list { margin: 0; padding-left: 16px; }
  .insights-list li { font-size: 12px; color: #2f4a3d; line-height: 1.55; margin-bottom: 8px; }
  .actions-table { width: 100%; border-collapse: collapse; border: 1px solid #dce5df; border-radius: 10px; overflow: hidden; }
  .actions-table th { text-align: left; font-size: 11px; color: #fff; background: #0A3D2E; padding: 9px 10px; letter-spacing: 0.4px; text-transform: uppercase; }
  .actions-table td { font-size: 12px; color: #2f4a3d; padding: 10px; border-top: 1px solid #e6eeea; vertical-align: middle; }
  .actions-table td:nth-child(2), .actions-table td:nth-child(3) { white-space: nowrap; }
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 74px;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    box-sizing: border-box;
  }
  .badge-impact-high { color: #9b2f2f; background: #fce8e8; }
  .badge-impact-medium { color: #7a4a07; background: #fff3dc; }
  .badge-effort-low { color: #0f6d45; background: #e3f8ee; }
  .badge-effort-medium { color: #755b13; background: #fdf5db; }
  .inventory-table, .trend-table, .scope3-table { width: 100%; border-collapse: collapse; border: 1px solid #d6e3dc; margin-top: 8px; }
  .inventory-table th, .trend-table th, .scope3-table th { background: #0A3D2E; color: #fff; text-align: left; font-size: 11px; padding: 9px; }
  .inventory-table td, .trend-table td, .scope3-table td { border-top: 1px solid #e5ede9; font-size: 12px; color: #2f4a3d; padding: 8px 9px; }
  .inventory-table td.num, .trend-table td.num, .scope3-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .chip-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
  .chip-card { border: 1px solid #dce8e1; border-radius: 10px; background: #f7fbf9; padding: 10px; }
  .chip-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; color: #0A3D2E; font-weight: 700; }
  .chip-value { font-size: 18px; color: #0A3D2E; font-weight: 700; margin-top: 4px; }
  .insight-box { border: 1px solid #d6e6de; background: #f3faf6; border-left: 4px solid #0A3D2E; border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
  .insight-text { font-size: 12px; color: #274739; line-height: 1.55; }
  .chart-bars { margin-top: 10px; }
  .chart-row { margin-bottom: 9px; }
  .chart-meta { display: flex; justify-content: space-between; font-size: 11px; color: #2d4b3d; margin-bottom: 4px; }
  .chart-track { width: 100%; height: 8px; background: #e5efea; border-radius: 999px; overflow: hidden; }
  .chart-fill { height: 100%; border-radius: 999px; }
  .donut-wrap { display: flex; align-items: center; gap: 14px; margin-top: 10px; }
  .donut {
    width: 122px; height: 122px; border-radius: 50%;
    background: conic-gradient(#ef4444 0 var(--s1), #f59e0b var(--s1) calc(var(--s1) + var(--s2)), #2563eb calc(var(--s1) + var(--s2)) 100%);
    position: relative;
  }
  .donut::after { content: ""; position: absolute; inset: 24px; background: #fff; border-radius: 50%; }
  .legend { display: grid; gap: 5px; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #2b4a3c; }
  .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }

  /* Back cover */
  .back-cover { width: 800px; height: 1131px; background: #123b2f; display: flex; align-items: flex-end; justify-content: flex-end; padding: 56px 62px; }
  .powered-by-label { color: rgba(255,255,255,0.72); font-size: 15px; text-align: right; }
  .powered-by-name { color: #fff; font-family: 'Playfair Display', serif; font-size: 26px; text-align: right; margin-top: 2px; }
`;

const EmissionResultsEpaIpcc = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<EpaIpccResultsData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string>(new Date().toISOString());
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const prettifyColumnLabel = (col: string) =>
    col
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

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

    // Common result payload shape from IPCC entries.
    if ("totalCO2e_kg" in val) {
      const kg = Number((val as any).totalCO2e_kg || 0);
      const tonnes = kg / 1000;
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
    document.title = "Emission Calculator Results";

    const run = async () => {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      if (!isMariEnergiesUserEmail(user.email)) {
        navigate("/emission-results?source=epa", { replace: true });
        return;
      }

      try {
        const data = await loadEpaIpccResults(user.id);
        setResults(data);
        setSubmittedAt(new Date().toISOString());
      } finally {
        setLoading(false);
        setTimeout(() => setMounted(true), 100);
      }
    };
    run();
  }, [user, navigate]);

  const exportCsv = () => {
    if (!results) return;

    const rows: (string | number)[][] = [];
    rows.push(["Report", "Emission Calculator Results"]);
    rows.push(["Generated By", "Emission Calculator"]);
    rows.push(["Generated At", new Date().toISOString()]);
    rows.push([]);
    rows.push(["Scope", "Category", "Emissions (kg CO2e)", "Emissions (t CO2e)"]);

    results.scope1.forEach((r) => rows.push(["Scope 1", r.label, r.value.toFixed(6), (r.value / 1000).toFixed(6)]));
    rows.push(["Scope 1", "Total", results.totals.scope1.toFixed(6), (results.totals.scope1 / 1000).toFixed(6)]);
    rows.push([]);

    results.scope2.forEach((r) => rows.push(["Scope 2", r.label, r.value.toFixed(6), (r.value / 1000).toFixed(6)]));
    rows.push(["Scope 2", "Total", results.totals.scope2.toFixed(6), (results.totals.scope2 / 1000).toFixed(6)]);
    rows.push([]);

    results.scope3.forEach((r) => rows.push(["Scope 3", r.label, r.value.toFixed(6), (r.value / 1000).toFixed(6)]));
    rows.push(["Scope 3", "Total", results.totals.scope3.toFixed(6), (results.totals.scope3 / 1000).toFixed(6)]);
    rows.push([]);
    rows.push(["All Scopes", "Grand Total", results.totals.grand.toFixed(6), (results.totals.grand / 1000).toFixed(6)]);

    const csv = rows.map((r) => r.join(",")).join("\n");
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
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      const historicalByYear: Record<number, { scope1: number; scope2: number; scope3: number; total: number }> = {};
      if (user?.id) {
        const { data: historyRows } = await (supabase as any)
          .from("emission_history_assessments")
          .select("created_at, scope1_emissions, scope2_emissions, scope3_emissions")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        (historyRows || []).forEach((row: any) => {
          const dt = row?.created_at ? new Date(row.created_at) : null;
          if (!dt || Number.isNaN(dt.getTime())) return;
          const year = dt.getFullYear();
          if (historicalByYear[year]) return; // keep latest record per year due to desc order
          const s1 = Number(row?.scope1_emissions || 0);
          const s2 = Number(row?.scope2_emissions || 0);
          const s3 = Number(row?.scope3_emissions || 0);
          historicalByYear[year] = { scope1: s1, scope2: s2, scope3: s3, total: s1 + s2 + s3 };
        });
      }

      const mapScopeRows = (rows: EpaIpccResultsData["scope1"]) => {
        const [a, b, c, d] = [...rows.filter((r) => r.value > 0), { value: 0 }, { value: 0 }, { value: 0 }, { value: 0 }];
        return {
          first: a.value || 0,
          second: b.value || 0,
          third: c.value || 0,
          fourth: d.value || 0,
        };
      };

      const scope1 = mapScopeRows(results.scope1);
      const scope2 = mapScopeRows(results.scope2);
      const scope3 = mapScopeRows(results.scope3);
      const submitted = new Date(submittedAt);
      const generatedAt = new Date();
      const company = user?.email?.split("@")[0] || "Organization";
      const period = submitted.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const year = String(generatedAt.getFullYear());
      const reportPeriodStart = `01/01/${year}`;
      const reportPeriodEnd = generatedAt.toLocaleDateString("en-GB");
      const nextIterationStart = new Date(generatedAt);
      nextIterationStart.setDate(nextIterationStart.getDate() + 1);
      const nextIterationStartText = nextIterationStart.toLocaleDateString("en-GB");
      const fmt = (n: number) => (n / 1000).toFixed(2);
      const pct = (value: number, total: number) => (total > 0 ? ((value / total) * 100).toFixed(1) : "0.0");
      const pctNum = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);
      const dominantScope = [
        { name: "Scope 1", value: results.totals.scope1 },
        { name: "Scope 2", value: results.totals.scope2 },
        { name: "Scope 3", value: results.totals.scope3 },
      ].sort((a, b) => b.value - a.value)[0];
      const topScope3Drivers = [...results.scope3]
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 2)
        .map((r) => r.label)
        .join(" and ");
      const scope1Pct = pct(results.totals.scope1, results.totals.grand);
      const scope2Pct = pct(results.totals.scope2, results.totals.grand);
      const scope3Pct = pct(results.totals.scope3, results.totals.grand);
      const scope1PctNum = pctNum(results.totals.scope1, results.totals.grand);
      const scope2PctNum = pctNum(results.totals.scope2, results.totals.grand);
      const scope3PctNum = pctNum(results.totals.scope3, results.totals.grand);

      const allRows = [
        ...results.scope1.map((r) => ({ scope: "Scope 1", label: r.label, value: r.value })),
        ...results.scope2.map((r) => ({ scope: "Scope 2", label: r.label, value: r.value })),
        ...results.scope3.map((r) => ({ scope: "Scope 3", label: r.label, value: r.value })),
      ].filter((r) => r.value > 0);

      const classifyBucket = (label: string, scope: string) => {
        const v = label.toLowerCase();
        if (/waste|end.?of.?life/.test(v)) return "Waste";
        if (/transport|travel|commut|vehicle|mobile|logistics|on-road|non-road/.test(v)) return "Transport";
        if (/purchased goods|capital|materials|services|processing|use of sold|investments/.test(v)) return "Materials";
        if (scope === "Scope 2" || /electricity|fuel|heat|steam|power|energy/.test(v)) return "Energy";
        return "Energy";
      };

      const bucketTotals = allRows.reduce(
        (acc, row) => {
          const key = classifyBucket(row.label, row.scope);
          acc[key] += row.value;
          return acc;
        },
        { Energy: 0, Transport: 0, Materials: 0, Waste: 0 }
      );

      const scope3Sorted = [...results.scope3].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
      const scope3TopRows = scope3Sorted.slice(0, 5);
      const topCount = Math.max(1, Math.ceil(scope3Sorted.length * 0.2));
      const topShare = scope3Sorted.slice(0, topCount).reduce((sum, r) => sum + r.value, 0);
      const topSharePct = pct(topShare, results.totals.scope3);

      const logisticsDriver = allRows
        .filter((r) => /transport|travel|commut|logistics|vehicle|mobile|on-road|non-road/i.test(r.label))
        .reduce((sum, r) => sum + r.value, 0);
      const supplyChainDriver = allRows
        .filter((r) => /purchased goods|capital|services|processing|use of sold|investments/i.test(r.label))
        .reduce((sum, r) => sum + r.value, 0);
      const energyDriver = results.totals.scope1 + results.totals.scope2 - logisticsDriver;
      const safeEnergyDriver = Math.max(0, energyDriver);

      const currentYearNum = generatedAt.getFullYear();
      const prevYear1 = currentYearNum - 1;
      const prevYear2 = currentYearNum - 2;
      const hasPreviousYearValues =
        Boolean(historicalByYear[prevYear1]) || Boolean(historicalByYear[prevYear2]);
      const y1 = historicalByYear[prevYear2];
      const y2 = historicalByYear[prevYear1];

      const topScope1Category = [...results.scope1].filter((r) => r.value > 0).sort((a, b) => b.value - a.value)[0];
      const topScope2Category = [...results.scope2].filter((r) => r.value > 0).sort((a, b) => b.value - a.value)[0];
      const topDriverName = [
        { name: "energy operations", value: safeEnergyDriver },
        { name: "supply chain activities", value: supplyChainDriver },
        { name: "logistics and mobility", value: logisticsDriver },
      ].sort((a, b) => b.value - a.value)[0].name;

      const keyInsights = [
        `${dominantScope.name} emissions dominate (${pct(dominantScope.value, results.totals.grand)}%) and are currently the main decarbonization lever.`,
        topScope3Drivers
          ? `Scope 3 concentration is highest in ${topScope3Drivers}, indicating value-chain hotspots.`
          : "Scope 3 activity is currently limited; data coverage expansion can improve hotspot precision.",
        topScope2Category
          ? `${topScope2Category.label} is the largest controllable energy-related source in Scope 2.`
          : "Scope 2 data is limited; increasing energy data granularity is recommended.",
      ];

      const scope1Insight = topScope1Category
        ? `${topScope1Category.label} contributes the largest share of Scope 1 (${pct(topScope1Category.value, results.totals.scope1)}%).`
        : "Scope 1 emissions are currently low or unavailable.";
      const scope2Insight = results.totals.scope2 > 0
        ? `Scope 2 is split across available electricity/heat sources; cleaner procurement can reduce ${scope2Pct}% of total emissions.`
        : "Scope 2 emissions are currently not significant in this reporting period.";
      const driversInsight = `Emissions are structurally driven by ${topDriverName}, based on current activity concentration.`;

      const buildActionFromLabel = (label: string): { action: string; impact: "High" | "Medium"; effort: "Low" | "Medium"; timeline: string } => {
        const v = label.toLowerCase();
        if (v.includes("purchased") || v.includes("capital") || v.includes("services")) {
          return { action: "Engage suppliers on low-carbon purchasing criteria and material substitutions.", impact: "High", effort: "Medium", timeline: "6-12 months" };
        }
        if (v.includes("transport") || v.includes("travel") || v.includes("commuting") || v.includes("vehicle") || v.includes("mobile")) {
          return { action: "Optimize mobility and logistics routes; shift to lower-emission transport modes.", impact: "High", effort: "Medium", timeline: "3-9 months" };
        }
        if (v.includes("electricity") || v.includes("heat") || v.includes("steam") || v.includes("power")) {
          return { action: "Improve energy efficiency and increase renewable electricity procurement.", impact: "High", effort: "Medium", timeline: "6-18 months" };
        }
        if (v.includes("waste") || v.includes("end of life")) {
          return { action: "Reduce waste intensity and improve recycling/diversion controls.", impact: "Medium", effort: "Low", timeline: "1-6 months" };
        }
        if (v.includes("investments")) {
          return { action: "Introduce climate criteria into portfolio screening and engagement.", impact: "Medium", effort: "Low", timeline: "3-6 months" };
        }
        return { action: "Establish monthly emissions governance and performance tracking routines.", impact: "Medium", effort: "Low", timeline: "1-3 months" };
      };

      const prioritizedActions = [...allRows]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((r) => buildActionFromLabel(r.label));
      while (prioritizedActions.length < 5) {
        prioritizedActions.push({ action: "Strengthen emissions data quality and category-level verification practices.", impact: "Medium", effort: "Low", timeline: "1-3 months" });
      }

      const reportHtml = `
      <div class="report">
        <div class="cover">
          <div class="cover-border-top"></div><div class="cover-border-bottom"></div><div class="cover-border-left"></div><div class="cover-border-right"></div>
          <div class="cover-inner">
            <div class="cover-header">
              <div class="cover-logo-wrap">
                <img src="/logoo.png" alt="Rethink Carbon logo" />
              </div>
              <div class="cover-year">${escapeHtml(year)}</div>
            </div>
            <div class="cover-body">
              <div class="cover-title">Carbon Emissions Report</div>
              <div class="cover-company">${escapeHtml(company)}</div>
              <div class="cover-period">Year i.e ${escapeHtml(period)}</div>
            </div>
            <div class="cover-footer">This report contains proprietary and confidential information of ${escapeHtml(company)} and is intended solely for internal use and authorized stakeholders.</div>
          </div>
        </div>
        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="toc-title">Table of Contents</div>
            <ul class="toc-list">
              <li class="toc-item"><span>1. About Rethink Carbon</span><span>03</span></li>
              <li class="toc-item"><span>2. Executive Summary</span><span>04</span></li>
              <li class="toc-item"><span>3. Introduction</span><span>05</span></li>
              <li class="toc-item"><span>4. Methodology Overview</span><span>06</span></li>
              <li class="toc-item"><span>5. Operational Boundaries</span><span>07</span></li>
              <li class="toc-item"><span>6. Emissions Inventory</span><span>09</span></li>
              <li class="toc-item"><span>7. Scope 1 / Scope 2 / Scope 3 Analysis</span><span>10-12</span></li>
              <li class="toc-item"><span>8. Emissions Drivers Analysis</span><span>13</span></li>
              ${hasPreviousYearValues ? `<li class="toc-item"><span>9. Full Detail & Trend Analysis</span><span>14</span></li>` : ""}
            </ul>
            <div class="page-number">2</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">About Rethink Carbon</div>
            <div class="about-box">
              <div class="about-text" style="margin-bottom:0;">
                Rethink Carbon is an AI-powered climate intelligence platform designed to help organizations measure,
                understand, and reduce their greenhouse gas (GHG) emissions. The platform enables companies to move
                beyond basic carbon accounting by providing actionable insights, scenario analysis, and data-driven
                decarbonization strategies.
                <br /><br />
                By combining robust emissions calculation methodologies with advanced analytics, Rethink Carbon supports
                organizations in transitioning from compliance-focused reporting to performance-driven sustainability.
              </div>
            </div>
            <div class="page-number">3</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="page-title">Executive Summary</div><div class="page-divider"></div>
            <div class="exec-grid">
              <div class="exec-card">
                <div class="exec-card-title">A. Emissions Snapshot</div>
                <div class="exec-kpi">${fmt(results.totals.grand)} tCO2e</div>

                <div class="scope-bar">
                  <div class="scope-bar-top"><span>Scope 1</span><span>${scope1Pct}%</span></div>
                  <div class="scope-bar-track"><div class="scope-bar-fill" style="width:${scope1Pct}%;background:#e11d48;"></div></div>
                </div>
                <div class="scope-bar">
                  <div class="scope-bar-top"><span>Scope 2</span><span>${scope2Pct}%</span></div>
                  <div class="scope-bar-track"><div class="scope-bar-fill" style="width:${scope2Pct}%;background:#f59e0b;"></div></div>
                </div>
                <div class="scope-bar">
                  <div class="scope-bar-top"><span>Scope 3</span><span>${scope3Pct}%</span></div>
                  <div class="scope-bar-track"><div class="scope-bar-fill" style="width:${scope3Pct}%;background:#2563eb;"></div></div>
                </div>
              </div>
              <div class="exec-card">
                <div class="exec-card-title">B. Key Insights (Auto-generated)</div>
                <ul class="insights-list">
                  ${keyInsights.map((insight) => `<li>${escapeHtml(insight)}</li>`).join("")}
                </ul>
              </div>
            </div>

            <div class="exec-card-title" style="margin-bottom:8px;">Top 5 Actions (Prioritized)</div>
            <table class="actions-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Impact</th>
                  <th>Effort</th>
                  <th>Timeline</th>
                </tr>
              </thead>
              <tbody>
                ${prioritizedActions.map((item) => `
                  <tr>
                    <td>${escapeHtml(item.action)}</td>
                    <td><span class="badge ${item.impact === "High" ? "badge-impact-high" : "badge-impact-medium"}">${item.impact}</span></td>
                    <td><span class="badge ${item.effort === "Low" ? "badge-effort-low" : "badge-effort-medium"}">${item.effort}</span></td>
                    <td>${escapeHtml(item.timeline)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="grand-total"><div class="grand-total-label">GRAND TOTAL EMISSIONS</div><div class="grand-total-value">${fmt(results.totals.grand)} tCO2e</div></div>
            <div class="page-number">4</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">1. Introduction</div>
            <div class="subsection-title">1.1. About This Report</div>

            <p class="body-text">
              This report contains the carbon footprint of the organization — ${escapeHtml(company)} for the reporting period Y-${escapeHtml(year)}: ${escapeHtml(reportPeriodStart)} to ${escapeHtml(reportPeriodEnd)}.
              The purpose of this report is to disseminate the inventory of greenhouse gas (GHG) emissions with great attention to the accounting principles of
              relevance, accuracy, consistency, completeness and transparency.
            </p>

            <p class="body-text">
              This report is intended for all stakeholders interested in the GHG emissions inventory and the associated reporting structure and explanations.
            </p>

            <p class="body-text">This report:</p>
            <ul class="bullet-list">
              <li>Covers the footprint of the entire organization: ${escapeHtml(company)}.</li>
              <li>Has been prepared in accordance with the requirements of the Greenhouse Gas Protocol reporting standards (Corporate Accounting and Reporting Standard, 2004; Corporate Value Chain Accounting and Reporting Standard, 2011).</li>
            </ul>

            <p class="body-text">
              The reporting period covered in this document is ${escapeHtml(reportPeriodStart)} to ${escapeHtml(reportPeriodEnd)}. The period of the next iteration of this footprint is expected to be of the same length,
              starting from the first day following this reporting period (${escapeHtml(nextIterationStartText)}). Any deviation from this will be mentioned in communication at the time of publication.
            </p>

            <p class="body-text">The objective of this report is to:</p>
            <ul class="bullet-list">
              <li>Quantify emissions across Scope 1, Scope 2, and relevant Scope 3 categories.</li>
              <li>Identify key emissions drivers and operational hotspots.</li>
              <li>Provide benchmarking and performance insights.</li>
              <li>Highlight actionable opportunities for emissions reduction.</li>
              <li>Support internal decision-making and external reporting requirements.</li>
            </ul>

            <p class="body-text">
              This document is intended for use by management, sustainability teams, investors, and other stakeholders involved in climate-related decision-making.
            </p>

            <div class="page-number">5</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">Methodology Overview</div>

            <p class="body-text">
              This assessment of GHG emissions is compliant with the Greenhouse Gas Protocol, a globally recognized standard jointly developed by the World Resources Institute and the World Business Council for Sustainable Development.
              The Greenhouse Gas Protocol provides comprehensive, standardized frameworks for quantifying and managing GHG emissions across private and public sector operations, value chains, and mitigation efforts.
            </p>

            <p class="body-text">Five key accounting principles are central to the Greenhouse Gas Protocol methodology:</p>
            <ul class="bullet-list">
              <li><strong>Relevance:</strong> Ensure that the GHG data collection accurately records and presents all relevant emissions from the organization.</li>
              <li><strong>Completeness:</strong> The calculation captures all emitted GHGs. If any emission sources are omitted, clear and detailed justifications are given.</li>
              <li><strong>Consistency:</strong> The calculations are based on uniform methods. Any changes in data sources, calculation boundaries, or emission factors are always reported.</li>
              <li><strong>Transparency:</strong> All collected data is clearly and coherently reported, preferably through an accurate audit scheme. All assumptions on methods, approximations and emission factors are well documented.</li>
              <li><strong>Accuracy:</strong> The quantification of GHG emissions is without systematic overestimation or underestimation, and uncertainties are minimized wherever possible.</li>
            </ul>

            <p class="body-text">
              The Greenhouse Gas Protocol classifies emissions into 3 scopes and 21 categories:
              Scope 1 direct emissions from owned/controlled sources, Scope 2 indirect energy emissions, and Scope 3 other indirect value chain emissions (upstream and downstream).
              These scopes are further subdivided into distinct activity categories.
            </p>

            <div class="methodology-figure">
              <img src="/images/methadology_pdf.png" alt="Overview of GHG Protocol scopes and value chain emissions" />
              <div class="figure-caption">Figure 1.1: Overview of GHG Protocol scopes and emissions across the value chain</div>
            </div>

            <p class="body-text" style="margin-top:10px;">
              To assess the global warming impact of emissions, the GHGs are evaluated using the Global Warming Potential (GWP) over a 100-year timeframe.
              In subsequent sections, activity categories may be customized in naming, order, and subdivision to improve transparency and comparability,
              while remaining linked to standard Greenhouse Gas Protocol category types.
            </p>

            <div class="page-number">6</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">5. Operational Boundaries</div>
            <p class="body-text">
              Details on the description of the activity categories, as well as their rationale to include and their
              respective Greenhouse Gas Protocol references, can be found in the table below.
            </p>

            <table class="op-table">
              <thead>
                <tr>
                  <th style="width:24%;">Category</th>
                  <th style="width:20%;">Field</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                <tr class="op-group"><td colspan="3">Direct</td></tr>

                <tr><td class="op-subhead">Stationary Combustion</td><td>Description</td><td>Emissions resulting from combustion of fuels in stationary sources.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Directly related to the organization's operations.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>1.1 Stationary combustion.</td></tr>

                <tr><td class="op-subhead">Gas turbines</td><td>Description</td><td>Emissions resulting from combustion of fuels in stationary sources.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Directly related to the organization's operations.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>1.1 Stationary combustion.</td></tr>

                <tr><td class="op-subhead">Mobile Combustion</td><td>Description</td><td>Emissions resulting from combustion of fuels in company-owned/controlled mobile combustion sources.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Directly related to the organization's operations.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>1.2 Mobile combustion.</td></tr>

                <tr><td class="op-subhead">Fugitive Emissions</td><td>Description</td><td>Emissions resulting from leakage of refrigerants or direct release of greenhouse gases.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important indicator for potential leaks or losses in the system.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>1.4 Fugitive emissions.</td></tr>

                <tr class="op-group"><td colspan="3">Electricity</td></tr>
                <tr><td class="op-subhead">Electricity</td><td>Description</td><td>Emissions resulting from generation of electricity purchased by the company.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Major source of indirect emissions.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>2.1 Purchased electricity.</td></tr>

                <tr class="op-group"><td colspan="3">Upstream</td></tr>
                <tr><td class="op-subhead">Goods</td><td>Description</td><td>Embedded emissions in purchased goods and services.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important overview of major indirect emission sources in the supply chain.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.1 Purchased goods and services.</td></tr>

                <tr><td class="op-subhead">Services</td><td>Description</td><td>Embedded emissions in purchased goods and services.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important overview of major indirect emission sources in the supply chain.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.1 Purchased goods and services.</td></tr>

                <tr><td class="op-subhead">Energy Supply</td><td>Description</td><td>Embedded emissions in the purchase of fuels and energy in other activity categories.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Reflects important upstream emissions coupled with the organization's fuel and energy use.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.3 Fuel and energy-related activities.</td></tr>

                <tr><td class="op-subhead">Transport Upstream</td><td>Description</td><td>Emissions related to transport of goods upstream of production process or any transport purchased by the company.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Reflects the indirect carbon footprint of logistics in the value chain.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.4 Upstream transportation and distribution.</td></tr>

                <tr><td class="op-subhead">Waste</td><td>Description</td><td>Emissions related to disposal and processing of waste generated in operations.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important indicator for impact of waste streams.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.5 Waste generated in operations.</td></tr>

                <tr><td class="op-subhead">Business Travel</td><td>Description</td><td>Emissions related to transportation of employees for business-related activities.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important for understanding and managing travel-related emissions.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.6 Business travel.</td></tr>

                <tr><td class="op-subhead">Commuting</td><td>Description</td><td>Emissions related to commutes of employees in vehicles not under control of the company.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important for understanding and managing employee commuting emissions.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.7 Employee commuting.</td></tr>

              </tbody>
            </table>

            <div class="page-number">7</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">5. Operational Boundaries (Continued)</div>
            <table class="op-table">
              <thead>
                <tr>
                  <th style="width:24%;">Category</th>
                  <th style="width:20%;">Field</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                <tr class="op-group"><td colspan="3">Downstream</td></tr>
                <tr><td class="op-subhead">Transport Downstream</td><td>Description</td><td>Emissions related to transport of goods downstream of the production process not paid for by the company.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Reflects the indirect carbon footprint of logistics happening downstream in the value chain.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.9 Downstream transportation and distribution.</td></tr>

                <tr><td class="op-subhead">Use of Product</td><td>Description</td><td>Emissions related to energy use of the product during its planned lifetime.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important for understanding the full lifecycle impact of products.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.11 Use of sold products.</td></tr>

                <tr><td class="op-subhead">Investments</td><td>Description</td><td>Emissions related to operation of investments.</td></tr>
                <tr><td></td><td>Rationale to include</td><td>Important for understanding the impact of financial investments.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.15 Investments.</td></tr>

                <tr class="op-group"><td colspan="3">Excluded Activities</td></tr>
                <tr><td class="op-subhead">Process Emissions</td><td>Description</td><td>Emissions resulting from release of greenhouse gases in production processes.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>Emissions category not applicable.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>1.3 Process emissions.</td></tr>

                <tr><td class="op-subhead">Steam, Heat, Cooling</td><td>Description</td><td>Emissions resulting from generation of steam, heating, or cooling purchased by the company.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>Emissions category not applicable.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>2.2 Purchased steam, heat, cooling.</td></tr>

                <tr><td class="op-subhead">Capital Goods</td><td>Description</td><td>Embedded emissions in capital goods like buildings, cars, ICT and machinery.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>Emissions are estimated to be insignificant and available data is of poor quality.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.2 Capital goods.</td></tr>

                <tr><td class="op-subhead">Leased Assets as Lessee</td><td>Description</td><td>Emissions related to operation of assets leased by the reporting company.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>Not relevant for the applied consolidation approach.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.8 Upstream leased assets (as lessee).</td></tr>

                <tr><td class="op-subhead">End-of-life of Product</td><td>Description</td><td>Emissions related to disposal of sold product at end of its planned lifetime.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>The organization's influence on emission source is too limited.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.12 End-of-life treatment of sold products.</td></tr>

                <tr><td class="op-subhead">Processing of Product</td><td>Description</td><td>Emissions related to further processing of sold products.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>The organization's influence on emission source is too limited.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.10 Processing of sold products.</td></tr>

                <tr><td class="op-subhead">Leased Assets as Lessor</td><td>Description</td><td>Emissions related to operation of assets owned by the reporting company.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>Emissions category not applicable.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.13 Downstream leased assets (as lessor).</td></tr>

                <tr><td class="op-subhead">Franchises</td><td>Description</td><td>Emissions related to operation of franchises.</td></tr>
                <tr><td></td><td>Rationale to Exclude</td><td>Emissions category not applicable.</td></tr>
                <tr><td></td><td>GHG Protocol Reference</td><td>3.14 Franchises.</td></tr>
              </tbody>
            </table>
            <div class="page-number">8</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">6. Emissions Inventory</div>
            <div class="subsection-title">A. Total Emissions Table with Gas Breakdown</div>
            <table class="inventory-table">
              <thead><tr><th>Scope</th><th>Emissions (tCO2e)</th><th>% Contribution</th></tr></thead>
              <tbody>
                <tr><td>Scope 1</td><td class="num">${fmt(results.totals.scope1)}</td><td class="num">${scope1Pct}%</td></tr>
                <tr><td>Scope 2</td><td class="num">${fmt(results.totals.scope2)}</td><td class="num">${scope2Pct}%</td></tr>
                <tr><td>Scope 3</td><td class="num">${fmt(results.totals.scope3)}</td><td class="num">${scope3Pct}%</td></tr>
                <tr><td><strong>Total</strong></td><td class="num"><strong>${fmt(results.totals.grand)}</strong></td><td class="num"><strong>100.0%</strong></td></tr>
              </tbody>
            </table>

            <div class="subsection-title" style="margin-top:16px;">B. Category Breakdown</div>
            <div class="chip-grid">
              <div class="chip-card"><div class="chip-label">Energy</div><div class="chip-value">${fmt(bucketTotals.Energy)}</div></div>
              <div class="chip-card"><div class="chip-label">Transport</div><div class="chip-value">${fmt(bucketTotals.Transport)}</div></div>
              <div class="chip-card"><div class="chip-label">Materials</div><div class="chip-value">${fmt(bucketTotals.Materials)}</div></div>
              <div class="chip-card"><div class="chip-label">Waste</div><div class="chip-value">${fmt(bucketTotals.Waste)}</div></div>
            </div>
            <div class="page-number">9</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">7. Scope 1 Analysis</div>
            <div class="donut-wrap">
              <div class="donut" style="--s1:${scope1PctNum.toFixed(2)}%;--s2:${scope2PctNum.toFixed(2)}%;"></div>
              <div class="legend">
                <div class="legend-item"><span class="dot" style="background:#ef4444;"></span>Scope 1: ${scope1Pct}%</div>
                <div class="legend-item"><span class="dot" style="background:#f59e0b;"></span>Scope 2: ${scope2Pct}%</div>
                <div class="legend-item"><span class="dot" style="background:#2563eb;"></span>Scope 3: ${scope3Pct}%</div>
              </div>
            </div>
            <div class="chart-bars">
              ${results.scope1.filter((r) => r.value > 0).slice(0, 6).map((r) => `
                <div class="chart-row">
                  <div class="chart-meta"><span>${escapeHtml(r.label)}</span><span>${fmt(r.value)} tCO2e</span></div>
                  <div class="chart-track"><div class="chart-fill" style="width:${pct(r.value, results.totals.scope1)}%;background:#ef4444;"></div></div>
                </div>
              `).join("")}
            </div>
            <div class="insight-box"><div class="insight-text">${escapeHtml(scope1Insight)}</div></div>
            <div class="page-number">10</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">8. Scope 2 Analysis</div>
            <div class="chart-bars">
              ${results.scope2.filter((r) => r.value > 0).map((r) => `
                <div class="chart-row">
                  <div class="chart-meta"><span>${escapeHtml(r.label)}</span><span>${fmt(r.value)} tCO2e</span></div>
                  <div class="chart-track"><div class="chart-fill" style="width:${pct(r.value, results.totals.scope2)}%;background:#f59e0b;"></div></div>
                </div>
              `).join("")}
            </div>
            <div class="insight-box"><div class="insight-text">${escapeHtml(scope2Insight)}</div></div>
            <div class="page-number">11</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">9. Scope 3 Analysis</div>
            <table class="scope3-table">
              <thead><tr><th>Category</th><th>Emissions (tCO2e)</th><th>% of Scope 3</th></tr></thead>
              <tbody>
                ${scope3TopRows.map((r) => `<tr><td>${escapeHtml(r.label)}</td><td class="num">${fmt(r.value)}</td><td class="num">${pct(r.value, results.totals.scope3)}%</td></tr>`).join("")}
              </tbody>
            </table>
            <div class="chart-bars">
              ${scope3TopRows.map((r) => `
                <div class="chart-row">
                  <div class="chart-meta"><span>${escapeHtml(r.label)}</span><span>${pct(r.value, results.totals.scope3)}%</span></div>
                  <div class="chart-track"><div class="chart-fill" style="width:${pct(r.value, results.totals.scope3)}%;background:#2563eb;"></div></div>
                </div>
              `).join("")}
            </div>
            <div class="insight-box"><div class="insight-text">Top 20% of categories contribute ${topSharePct}% of Scope 3 emissions.</div></div>
            <div class="page-number">12</div>
          </div>
        </div>

        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">10. Emissions Drivers Analysis</div>
            <div class="chart-bars">
              <div class="chart-row">
                <div class="chart-meta"><span>Energy</span><span>${pct(safeEnergyDriver, results.totals.grand)}%</span></div>
                <div class="chart-track"><div class="chart-fill" style="width:${pct(safeEnergyDriver, results.totals.grand)}%;background:#0ea5a3;"></div></div>
              </div>
              <div class="chart-row">
                <div class="chart-meta"><span>Supply chain</span><span>${pct(supplyChainDriver, results.totals.grand)}%</span></div>
                <div class="chart-track"><div class="chart-fill" style="width:${pct(supplyChainDriver, results.totals.grand)}%;background:#6366f1;"></div></div>
              </div>
              <div class="chart-row">
                <div class="chart-meta"><span>Logistics</span><span>${pct(logisticsDriver, results.totals.grand)}%</span></div>
                <div class="chart-track"><div class="chart-fill" style="width:${pct(logisticsDriver, results.totals.grand)}%;background:#f97316;"></div></div>
              </div>
            </div>
            <div class="insight-box"><div class="insight-text">${escapeHtml(driversInsight)}</div></div>
            <div class="page-number">13</div>
          </div>
        </div>

        ${hasPreviousYearValues ? `
        <div class="inner-page">
          <div class="page-header"><div class="page-header-logo">Rethink Carbon</div><div class="page-header-meta">${escapeHtml(company)} &nbsp;|&nbsp; ${escapeHtml(period)}</div></div>
          <div class="page-content">
            <div class="section-title">11. Full Detail Table & Trend Analysis</div>
            <table class="trend-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>${currentYearNum - 2}</th>
                  <th>${currentYearNum - 1}</th>
                  <th>${currentYearNum}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Scope 1 Emissions (tCO2e)</td><td class="num">${y1 ? fmt(y1.scope1 * 1000) : "N/A"}</td><td class="num">${y2 ? fmt(y2.scope1 * 1000) : "N/A"}</td><td class="num">${fmt(results.totals.scope1)}</td></tr>
                <tr><td>Scope 2 Emissions (tCO2e)</td><td class="num">${y1 ? fmt(y1.scope2 * 1000) : "N/A"}</td><td class="num">${y2 ? fmt(y2.scope2 * 1000) : "N/A"}</td><td class="num">${fmt(results.totals.scope2)}</td></tr>
                <tr><td>Scope 3 Emissions (tCO2e)</td><td class="num">${y1 ? fmt(y1.scope3 * 1000) : "N/A"}</td><td class="num">${y2 ? fmt(y2.scope3 * 1000) : "N/A"}</td><td class="num">${fmt(results.totals.scope3)}</td></tr>
                <tr><td>Grand Total Emissions (tCO2e)</td><td class="num">${y1 ? fmt(y1.total * 1000) : "N/A"}</td><td class="num">${y2 ? fmt(y2.total * 1000) : "N/A"}</td><td class="num">${fmt(results.totals.grand)}</td></tr>
              </tbody>
            </table>
            <div class="insight-box"><div class="insight-text">Historic year-wise values can be populated automatically as prior-year inventory snapshots are stored in the platform.</div></div>
            <div class="page-number">14</div>
          </div>
        </div>
        ` : ""}
        <div class="back-cover"><div class="powered-by"><div class="powered-by-label">Powered by</div><div class="powered-by-name">Rethink Carbon</div></div></div>
      </div>
      `;

      const wrapper = document.createElement("div");
      wrapper.style.width = "800px";
      wrapper.style.position = "absolute";
      wrapper.style.left = "-99999px";
      wrapper.style.top = "0";
      wrapper.style.background = "#ffffff";
      wrapper.innerHTML = `<style>${getReportCSS()}</style>${reportHtml}`;
      document.body.appendChild(wrapper);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 0;
      const pageNodes = Array.from(
        wrapper.querySelectorAll(".cover, .inner-page, .back-cover")
      ) as HTMLElement[];

      for (let i = 0; i < pageNodes.length; i++) {
        const node = pageNodes[i];
        const canvas = await html2canvas(node, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: true,
        });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, "PNG", margin, margin, pageWidth, pageHeight);
      }
      document.body.removeChild(wrapper);

      const fileDate = new Date().toISOString().slice(0, 10);
      pdf.save(`EPA_IPCC_Results_Report_${fileDate}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const topScope1 = useMemo(() => {
    if (!results?.scope1?.length) return null;
    return [...results.scope1].sort((a, b) => b.value - a.value)[0];
  }, [results]);

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
      let query: any = null;
      switch (key) {
        // Scope 1
        case "fuel":
          query = (supabase as any).from("scope1_fuel_entries").select("*").eq("user_id", user.id);
          break;
        case "mobile":
          query = (supabase as any).from("scope1_epa_mobile_fuel_entries").select("*").eq("user_id", user.id);
          break;
        case "onroad_gas":
          query = (supabase as any).from("scope1_epa_on_road_gasoline_entries").select("*").eq("user_id", user.id);
          break;
        case "onroad_diesel":
          query = (supabase as any).from("scope1_epa_on_road_diesel_alt_fuel_entries").select("*").eq("user_id", user.id);
          break;
        case "nonroad":
          query = (supabase as any).from("scope1_epa_non_road_vehicle_entries").select("*").eq("user_id", user.id);
          break;
        case "heatsteam":
          query = (supabase as any).from("scope1_heatsteam_entries_epa").select("*").eq("user_id", user.id);
          break;
        case "flaring":
          query = (supabase as any).from("ipcc_scope1_flaring_entries").select("*").eq("user_id", user.id);
          break;
        case "venting":
          query = (supabase as any).from("ipcc_scope1_venting_entries").select("*").eq("user_id", user.id);
          break;
        case "vehicular":
          query = (supabase as any).from("ipcc_scope1_vehicular_entries").select("*").eq("user_id", user.id);
          break;
        case "kitchen":
          query = (supabase as any).from("ipcc_scope1_kitchen_entries").select("*").eq("user_id", user.id);
          break;
        case "power":
          query = (supabase as any).from("ipcc_scope1_power_entries").select("*").eq("user_id", user.id);
          break;
        case "heating":
          query = (supabase as any).from("ipcc_scope1_heating_entries").select("*").eq("user_id", user.id);
          break;

        // Scope 2
        case "electricity":
          query = (supabase as any).from("scope2_electricity_subanswers").select("*").eq("user_id", user.id);
          break;
        case "scope2_heatsteam":
          query = (supabase as any).from("scope2_heatsteam_entries_epa").select("*").eq("user_id", user.id);
          break;

        // Scope 3
        case "purchased_goods":
          query = (supabase as any).from("scope3_purchased_goods_services").select("*").eq("user_id", user.id);
          break;
        case "capital_goods":
          query = (supabase as any).from("scope3_capital_goods").select("*").eq("user_id", user.id);
          break;
        case "fuel_energy":
          query = (supabase as any).from("scope3_fuel_energy_activities").select("*").eq("user_id", user.id);
          break;
        case "upstream_transport":
          query = (supabase as any).from("scope3_upstream_transportation").select("*").eq("user_id", user.id);
          break;
        case "waste":
          query = (supabase as any).from("scope3_waste_generated").select("*").eq("user_id", user.id);
          break;
        case "business_travel":
          query = (supabase as any).from("scope3_business_travel").select("*").eq("user_id", user.id);
          break;
        case "employee_commuting":
          query = (supabase as any).from("scope3_employee_commuting").select("*").eq("user_id", user.id);
          break;
        case "investments":
          query = (supabase as any).from("scope3_investments").select("*").eq("user_id", user.id);
          break;
        case "downstream_transport":
          query = (supabase as any).from("scope3_downstream_transportation").select("*").eq("user_id", user.id);
          break;
        case "end_of_life":
          query = (supabase as any).from("scope3_end_of_life_treatment").select("*").eq("user_id", user.id);
          break;
        case "processing_sold":
          query = (supabase as any).from("scope3_processing_sold_products").select("*").eq("user_id", user.id);
          break;
        case "use_of_sold":
          query = (supabase as any).from("scope3_use_of_sold_products").select("*").eq("user_id", user.id);
          break;
      }

      if (!query) {
        setDetailRows([]);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setDetailRows(data || []);
    } catch (e: any) {
      setDetailError(e?.message || "Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-3" />
          <p className="text-gray-700">Loading Emission Calculator results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center px-4">
        <Card className="w-full max-w-lg bg-white/90 border border-gray-200/50 shadow-xl rounded-2xl">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-gray-700">No results found yet for this emission calculator assessment.</p>
            <Button onClick={() => navigate("/emission-calculator-epa")} className="bg-teal-600 hover:bg-teal-700 text-white">
              Back to EPA Calculator
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderScopeTable = (title: string, rows: EpaIpccResultsData["scope1"], total: number) => (
    <Card className="glass-effect border border-white/50 shadow-xl rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold text-gray-800">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-gray-200/50 bg-white/30">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">kg CO2e</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">t CO2e</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.value > 0)
                .map((row) => (
                  <Fragment key={row.key}>
                    <tr className="border-t border-gray-200/50 hover:bg-white/50 transition-colors">
                      <td className="px-4 py-3 text-gray-800">{row.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatKg(row.value)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-800">{formatTonnes(row.value)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => loadCategoryDetails(row.key)}>
                          {detailKey === row.key ? "Hide" : "View"}
                        </Button>
                      </td>
                    </tr>
                    {detailKey === row.key && !detailLoading && !detailError && detailRows.length > 0 && (
                      <tr>
                        <td colSpan={4} className="bg-white/60 px-4 pb-4">
                          <div className="mt-3 rounded-xl border border-teal-100 bg-gradient-to-br from-white to-teal-50/30 p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold text-gray-800">Entry Details</div>
                              <div className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2.5 py-1">
                                {detailRows.length.toLocaleString()} entries
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow">
                              <table className="min-w-full text-sm">
                                <thead className="bg-gradient-to-r from-slate-100 via-gray-100 to-slate-100">
                                  {(() => {
                                    const visibleCols = Object.keys(detailRows[0] || {}).filter(
                                      (col) => !HIDDEN_DETAIL_COLUMNS.includes(col)
                                    );
                                    const numericCols = new Set(
                                      visibleCols.filter((col) => isNumericDetailColumn(col, detailRows))
                                    );
                                    return (
                                  <tr>
                                    <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide text-[10px] text-gray-500 whitespace-nowrap border-b border-gray-200 w-12">
                                      #
                                    </th>
                                        {visibleCols.map((col) => (
                                        <th
                                          key={col}
                                            className={`px-3 py-2.5 font-semibold uppercase tracking-wide text-[10px] text-gray-600 whitespace-nowrap border-b border-gray-200 ${
                                              numericCols.has(col) ? "text-right" : "text-left"
                                            }`}
                                        >
                                          {prettifyColumnLabel(col)}
                                        </th>
                                      ))}
                                  </tr>
                                    );
                                  })()}
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {detailRows.map((r: any, idx: number) => (
                                    <tr
                                      key={idx}
                                      className={`transition-colors hover:bg-teal-50/40 ${
                                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/45"
                                      }`}
                                    >
                                      <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 tabular-nums">
                                        {idx + 1}
                                      </td>
                                      {Object.keys(detailRows[0] || {})
                                        .filter((col) => !HIDDEN_DETAIL_COLUMNS.includes(col))
                                        .map((col) => {
                                          const isNumeric = isNumericDetailColumn(col, detailRows);
                                          return (
                                            <td
                                              key={col}
                                              className={`px-3 py-2.5 text-[12px] text-gray-800 align-top ${
                                                isNumeric ? "text-right tabular-nums" : "text-left"
                                              }`}
                                            >
                                              <div className="max-w-[260px] break-words leading-relaxed" title={formatDetailValue(col, r[col])}>
                                                {formatDetailValue(col, r[col])}
                                              </div>
                                            </td>
                                          );
                                        })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {detailKey === row.key && detailLoading && (
                      <tr>
                        <td colSpan={4} className="px-4 pb-4 text-xs text-gray-500">
                          Loading details...
                        </td>
                      </tr>
                    )}
                    {detailKey === row.key && detailError && (
                      <tr>
                        <td colSpan={4} className="px-4 pb-4 text-xs text-red-600">
                          {detailError}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              <tr className="border-t-2 border-gray-300 bg-gradient-to-r from-gray-50/80 to-gray-100/80 font-semibold">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatKg(total)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-900">{formatTonnes(total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
      <style>{`
        .glass-effect {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className={`relative glass-effect rounded-3xl shadow-2xl overflow-hidden ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <div className="px-4 sm:px-6 lg:px-8 py-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <BarChart3 className="h-10 w-10 text-teal-600" />
                <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Emission Calculator Results
                </h1>
              </div>
              <p className="text-gray-600 text-base sm:text-lg">
                Your emission calculator reporting view.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Submitted on{" "}
                <span className="font-semibold text-gray-800">
                  {new Date(submittedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate("/emission-calculator-epa")}
                  className="glass-effect border-teal-200 hover:border-teal-400 hover:bg-teal-50/50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to EPA Calculator
                </Button>
                <Button onClick={exportCsv} className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={exportPdf} disabled={isGeneratingPdf} className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg">
                  <Download className="h-4 w-4 mr-2" />
                  {isGeneratingPdf ? "Generating PDF..." : "Download PDF"}
                </Button>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center">
                    <Factory className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Scope 1</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.scope1)} t
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Scope 2</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.scope2)} t
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Scope 3</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.scope3)} t
                </div>
              </CardContent>
            </Card>

            <Card className="glass-effect border border-white/50 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <Leaf className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-gray-600">Grand Total</div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {formatTonnes(results.totals.grand)} t
                </div>
              </CardContent>
            </Card>
          </div>

          {topScope1 && topScope1.value > 0 && (
            <Card className={`glass-effect border border-white/50 shadow-sm rounded-2xl ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
              <CardContent className="py-4 px-5 text-sm text-gray-700">
                Largest Scope 1 contributor: <span className="font-semibold text-gray-900">{topScope1.label}</span>
              </CardContent>
            </Card>
          )}

          <div className={`space-y-6 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            {renderScopeTable("Scope 1 Breakdown", results.scope1, results.totals.scope1)}
            {renderScopeTable("Scope 2 Breakdown", results.scope2, results.totals.scope2)}
            {renderScopeTable("Scope 3 Breakdown", results.scope3, results.totals.scope3)}
          </div>

          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 ${mounted ? "animate-fade-in-up" : "opacity-0"}`}>
            <Button
              onClick={() => navigate("/emission-calculator-epa")}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white shadow-lg px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              size="lg"
            >
              Edit Assessment
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="glass-effect border-teal-200 hover:border-teal-400 hover:bg-teal-50/50 px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105"
              size="lg"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmissionResultsEpaIpcc;


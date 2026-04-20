import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Save, Trash2, ChevronRight, Link2, PieChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmissionSync } from "../hooks/useEmissionSync";
import type { InvestmentRow, InvestmentLineType } from "../types/scope3Types";
import type { EmissionData } from "@/components/emissions/shared/types";
import { fetchPortfolioCalculationsForScope3 } from "@/lib/portfolioCalculationsForScope3";

interface InvestmentsSectionProps {
  user: { id: string };
  companyContext?: boolean;
  counterpartyId?: string;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
}

function investeeTotalFromDb(entry: Record<string, unknown>): number {
  const v = entry.emissions ?? entry.total_emissions;
  return typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0;
}

function lineTypeFromDb(entry: Record<string, unknown>): InvestmentLineType {
  return entry.line_type === "financed" ? "financed" : "equity";
}

const prettifyField = (key: string): string =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const humanizeToken = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "—";
  // Keep IDs/uuids/hex-like values untouched.
  if (/^[a-f0-9-]{20,}$/i.test(trimmed)) return trimmed;
  if (/^[a-z0-9_-]+$/i.test(trimmed)) {
    return trimmed
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return trimmed;
};

const displayValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "—";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return humanizeToken(value);
  if (Array.isArray(value)) {
    const rendered = value.map((v) => displayValue(v)).filter((v) => v !== "—");
    return rendered.length ? rendered.join(", ") : "—";
  }
  try {
    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>)
        .slice(0, 4)
        .map(([k, v]) => `${prettifyField(k)}: ${displayValue(v)}`);
      return entries.length ? entries.join(" | ") : "—";
    }
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const InvestmentsSection: React.FC<InvestmentsSectionProps> = ({
  user,
  companyContext,
  counterpartyId,
  setEmissionData,
  onSaveAndNext,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<"equity" | "financed">("equity");
  const [investmentRows, setInvestmentRows] = useState<InvestmentRow[]>([]);
  const [existingInvestments, setExistingInvestments] = useState<InvestmentRow[]>([]);
  const [savingInvestments, setSavingInvestments] = useState(false);
  const [deletingInvestments, setDeletingInvestments] = useState<Set<string>>(new Set());
  const [isInitialLoadInvestments, setIsInitialLoadInvestments] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [userType, setUserType] = useState<string>("corporate");
  const [userTypeResolved, setUserTypeResolved] = useState(false);
  const [corporateCompanyName, setCorporateCompanyName] = useState("");
  const [creatingCorporateJourney, setCreatingCorporateJourney] = useState(false);
  const [expandedFinancedRows, setExpandedFinancedRows] = useState<Set<string>>(new Set());
  const [financedDetailsByRowId, setFinancedDetailsByRowId] = useState<
    Record<string, Array<{ label: string; value: string }>>
  >({});
  const [portfolioRows, setPortfolioRows] = useState<Awaited<ReturnType<typeof fetchPortfolioCalculationsForScope3>>>(
    [],
  );

  const isCorporateUser = userTypeResolved ? userType === "corporate" : true;

  const newInvestmentRow = (): InvestmentRow => ({
    id: `inv-${Date.now()}-${Math.random()}`,
    companyName: "",
    emissions: undefined,
    percentage: undefined,
    calculatedEmissions: undefined,
    lineType: "equity",
  });

  const addInvestmentRow = () => setInvestmentRows((prev) => [...prev, newInvestmentRow()]);
  const removeInvestmentRow = (id: string) => setInvestmentRows((prev) => prev.filter((r) => r.id !== id));

  const updateInvestmentRow = (id: string, patch: Partial<InvestmentRow>) => {
    setInvestmentRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.lineType === "financed") return r;
        const updated = { ...r, ...patch };
        if (
          typeof updated.emissions === "number" &&
          updated.emissions >= 0 &&
          typeof updated.percentage === "number" &&
          updated.percentage >= 0 &&
          updated.percentage <= 100
        ) {
          updated.calculatedEmissions = (updated.emissions * updated.percentage) / 100;
        } else {
          updated.calculatedEmissions = undefined;
        }
        return updated;
      }),
    );
  };

  const loadInvestments = useCallback(async () => {
    if (!user) return;
    if (companyContext && !counterpartyId) {
      setInvestmentRows([]);
      setExistingInvestments([]);
      setIsInitialLoadInvestments(false);
      return;
    }
    try {
      let query = (supabase as any).from("scope3_investments").select("*").eq("user_id", user.id);
      if (companyContext && counterpartyId) {
        query = query.eq("counterparty_id", counterpartyId);
      } else {
        query = query.is("counterparty_id", null);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      const loadedRows: InvestmentRow[] = (data || []).map((entry: Record<string, unknown>) => {
        const lt = lineTypeFromDb(entry);
        const inv = investeeTotalFromDb(entry);
        const pct = Number(entry.ownership_percentage) || 0;
        const calc = Number(entry.calculated_emissions) || 0;
        return {
          id: crypto.randomUUID(),
          dbId: entry.id as string,
          isExisting: true,
          companyName: (entry.company_name as string) || "",
          emissions: inv,
          percentage: pct,
          calculatedEmissions: calc,
          lineType: lt,
          linkedEmissionCalculationId: (entry.linked_emission_calculation_id as string) || null,
          linkedFinanceEmissionCalculationId: (entry.linked_finance_emission_calculation_id as string) || null,
        };
      });
      setExistingInvestments(loadedRows);
      setInvestmentRows(loadedRows.length > 0 ? loadedRows : []);
    } catch (error: unknown) {
      console.error("Error loading investments:", error);
      toast({
        title: "Error",
        description: "Failed to load investments entries",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoadInvestments(false);
    }
  }, [user.id, companyContext, counterpartyId]);

  useEffect(() => {
    loadInvestments();
  }, [loadInvestments]);

  useEffect(() => {
    const loadUserType = async () => {
      try {
        const { data } = (await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .single()) as { data: { user_type?: string } | null };
        if (data?.user_type) {
          setUserType(data.user_type);
        }
      } catch {
        // Keep safe default as corporate for this inline journey.
      } finally {
        setUserTypeResolved(true);
      }
    };
    loadUserType();
  }, [user.id]);

  const getOrCreateCorporateCounterparty = useCallback(
    async (name: string): Promise<string> => {
      const normalized = name.trim();
      const { data: existing, error: existingErr } = await (supabase as any)
        .from("counterparties")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", normalized)
        .limit(1)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (existing?.id) return existing.id;

      const { data: created, error: createErr } = await (supabase as any)
        .from("counterparties")
        .insert({
          user_id: user.id,
          name: normalized,
          sector: "General",
          geography: "Unknown",
          counterparty_type: "Corporate",
        })
        .select("id")
        .single();
      if (createErr) throw createErr;
      return created.id as string;
    },
    [user.id],
  );

  useEmissionSync({
    category: "investments",
    rows: investmentRows,
    isInitialLoad: isInitialLoadInvestments,
    mapRowToEntry: (r) => {
      if (!r.companyName?.trim()) return null;
      if (r.lineType === "financed") {
        if (typeof r.calculatedEmissions !== "number" || r.calculatedEmissions < 0) return null;
        return {
          id: r.id,
          category: "investments",
          activity: `${r.companyName.trim()} (financed)`,
          unit: "tCO₂e",
          quantity: 100,
          factor: r.emissions ?? r.calculatedEmissions,
          emissions: r.calculatedEmissions,
        };
      }
      if (
        typeof r.emissions !== "number" ||
        r.emissions < 0 ||
        typeof r.percentage !== "number" ||
        r.percentage < 0 ||
        r.percentage > 100
      ) {
        return null;
      }
      return {
        id: r.id,
        category: "investments",
        activity: `${r.companyName.trim()} (${r.percentage}% owned)`,
        unit: "tCO₂e",
        quantity: r.percentage,
        factor: r.emissions,
        emissions: r.calculatedEmissions || 0,
      };
    },
    setEmissionData,
  });

  const openImportFinance = async () => {
    setImportOpen(true);
    setImportLoading(true);
    try {
      const list = await fetchPortfolioCalculationsForScope3(
        supabase,
        user.id,
        "finance",
        companyContext && counterpartyId ? counterpartyId : null,
      );
      setPortfolioRows(list);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      toast({ title: "Could not load portfolio", description: msg, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  const importFinanceRow = async (p: (typeof portfolioRows)[0]) => {
    const name = p.counterpartyName || "Financed counterparty";
    const fe = p.financedEmissions;
    const dupQ =
      p.source === "emission_calculations"
        ? (supabase as any)
            .from("scope3_investments")
            .select("id")
            .eq("user_id", user.id)
            .eq("linked_emission_calculation_id", p.id)
            .maybeSingle()
        : (supabase as any)
            .from("scope3_investments")
            .select("id")
            .eq("user_id", user.id)
            .eq("linked_finance_emission_calculation_id", p.id)
            .maybeSingle();
    const { data: dup } = await dupQ;
    if (dup?.id) {
      toast({ title: "Already added", description: "This finance result is already in Investments." });
      return;
    }
    const basePayload: Record<string, unknown> = {
      user_id: user.id,
      counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
      company_name: name.slice(0, 500),
      emissions: fe,
      ownership_percentage: 100,
      calculated_emissions: fe,
      line_type: "financed",
    };
    if (p.source === "emission_calculations") {
      basePayload.linked_emission_calculation_id = p.id;
    } else {
      basePayload.linked_finance_emission_calculation_id = p.id;
    }

    const { error } = await (supabase as any).from("scope3_investments").insert(basePayload as Record<string, unknown>);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already added", description: "This finance result is already linked." });
      } else {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Added", description: "Financed emissions added to Investments." });
    setImportOpen(false);
    await loadInvestments();
    setTab("financed");
  };

  const syncCorporateFinanceResults = useCallback(async () => {
    if (!isCorporateUser) return;
    const list = await fetchPortfolioCalculationsForScope3(
      supabase,
      user.id,
      "finance",
      companyContext && counterpartyId ? counterpartyId : null,
    );
    if (!list.length) return;

    let added = 0;
    for (const p of list) {
      const basePayload: Record<string, unknown> = {
        user_id: user.id,
        counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
        company_name: (p.counterpartyName || p.formulaName || "Finance emission").slice(0, 500),
        emissions: p.financedEmissions,
        ownership_percentage: 100,
        calculated_emissions: p.financedEmissions,
        line_type: "financed",
      };
      if (p.source === "emission_calculations") {
        basePayload.linked_emission_calculation_id = p.id;
      } else {
        basePayload.linked_finance_emission_calculation_id = p.id;
      }
      const { error } = await (supabase as any).from("scope3_investments").insert(basePayload as Record<string, unknown>);
      if (!error) {
        added += 1;
      } else if (error.code !== "23505") {
        throw error;
      }
    }
    if (added > 0) {
      await loadInvestments();
      toast({
        title: "Updated from questionnaire",
        description: `${added} financed line${added > 1 ? "s" : ""} added to Investments.`,
      });
    }
  }, [isCorporateUser, user.id, companyContext, counterpartyId, loadInvestments, toast]);

  useEffect(() => {
    if (!userTypeResolved || tab !== "financed" || !isCorporateUser) return;
    syncCorporateFinanceResults().catch((e: any) => {
      toast({
        title: "Sync error",
        description: e?.message || "Failed to fetch finance questionnaire results.",
        variant: "destructive",
      });
    });
  }, [userTypeResolved, tab, isCorporateUser, syncCorporateFinanceResults, toast]);

  const saveInvestments = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }
    const newEntries = investmentRows.filter(
      (r) =>
        r.lineType !== "financed" &&
        !r.isExisting &&
        r.companyName?.trim() &&
        typeof r.emissions === "number" &&
        r.emissions >= 0 &&
        typeof r.percentage === "number" &&
        r.percentage >= 0 &&
        r.percentage <= 100,
    );
    const changedExisting = investmentRows.filter((r) => {
      if (!r.isExisting || !r.dbId || r.lineType === "financed") return false;
      const ex = existingInvestments.find((e) => e.dbId === r.dbId);
      if (!ex) return false;
      return (
        ex.companyName !== r.companyName ||
        ex.emissions !== r.emissions ||
        ex.percentage !== r.percentage ||
        Math.abs((ex.calculatedEmissions || 0) - (r.calculatedEmissions || 0)) > 0.01
      );
    });
    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed equity lines." });
      return;
    }
    setSavingInvestments(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map((r) => ({
          user_id: user.id,
          counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
          company_name: r.companyName!.trim(),
          emissions: r.emissions!,
          ownership_percentage: r.percentage!,
          calculated_emissions: r.calculatedEmissions!,
          line_type: "equity" as const,
          linked_emission_calculation_id: null,
          linked_finance_emission_calculation_id: null,
        }));
        const { error } = await (supabase as any).from("scope3_investments").insert(payload);
        if (error) throw error;
      }
      if (changedExisting.length > 0) {
        const updates = changedExisting.map((r) =>
          (supabase as any)
            .from("scope3_investments")
            .update({
              company_name: r.companyName,
              emissions: r.emissions!,
              ownership_percentage: r.percentage!,
              calculated_emissions: r.calculatedEmissions!,
              line_type: "equity",
            })
            .eq("id", r.dbId!),
        );
        const results = await Promise.all(updates);
        const updateError = results.find((x) => (x as { error?: { message: string } }).error)?.error;
        if (updateError) throw updateError;
      }
      toast({
        title: "Saved",
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} equity lines.`,
      });
      await loadInvestments();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSavingInvestments(false);
    }
  };

  const deleteInvestmentRow = async (id: string) => {
    const row = investmentRows.find((r) => r.id === id);
    if (!row || !row.dbId) {
      removeInvestmentRow(id);
      return;
    }
    if (!confirm("Delete this entry?")) return;
    setDeletingInvestments((prev) => new Set(prev).add(id));
    try {
      const { error } = await (supabase as any).from("scope3_investments").delete().eq("id", row.dbId);
      if (error) throw error;
      toast({ title: "Deleted" });
      setInvestmentRows((prev) => prev.filter((r) => r.id !== id));
      setExistingInvestments((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeletingInvestments((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const startCorporateFinanceJourney = async () => {
    const name = corporateCompanyName.trim();
    if (!name && !(companyContext && counterpartyId)) {
      toast({ title: "Company name required", description: "Enter a company name first." });
      return;
    }
    setCreatingCorporateJourney(true);
    try {
      const cpId = companyContext && counterpartyId ? counterpartyId : await getOrCreateCorporateCounterparty(name);
      navigate("/finance-emission", {
        state: {
          mode: "finance",
          counterpartyId: cpId,
          returnUrl: "/emission-calculator",
        },
      });
    } catch (e: any) {
      toast({
        title: "Unable to start questionnaire",
        description: e?.message || "Could not create/open the company finance questionnaire.",
        variant: "destructive",
      });
    } finally {
      setCreatingCorporateJourney(false);
    }
  };

  const equityRows = investmentRows.filter((r) => r.lineType !== "financed");
  const financedRows = investmentRows.filter((r) => r.lineType === "financed");
  const totalEmissions = investmentRows.reduce((sum, r) => sum + (r.calculatedEmissions || 0), 0);
  const toggleFinancedDetails = (id: string) => {
    setExpandedFinancedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const loadFinancedDetails = async () => {
      const linkedRows = financedRows.filter((r) => r.linkedEmissionCalculationId || r.linkedFinanceEmissionCalculationId);
      if (linkedRows.length === 0) {
        setFinancedDetailsByRowId({});
        return;
      }

      const emissionIds = [...new Set(linkedRows.map((r) => r.linkedEmissionCalculationId).filter(Boolean))] as string[];
      const financeIds = [...new Set(linkedRows.map((r) => r.linkedFinanceEmissionCalculationId).filter(Boolean))] as string[];

      const [ecRes, fecRes] = await Promise.all([
        emissionIds.length
          ? (supabase as any)
              .from("emission_calculations")
              .select(
                "id, calculation_type, company_type, formula_id, financed_emissions, attribution_factor, data_quality_score, evic, total_equity_plus_debt, status, created_at, inputs",
              )
              .in("id", emissionIds)
          : Promise.resolve({ data: [] }),
        financeIds.length
          ? (supabase as any)
              .from("finance_emission_calculations")
              .select(
                "id, calculation_type, formula_name, formula_id, company_type, outstanding_amount, financed_emissions, attribution_factor, data_quality_score, total_assets, evic, total_equity_plus_debt, share_price, outstanding_shares, total_debt, total_equity, minority_interest, preferred_stock, status, created_at",
              )
              .in("id", financeIds)
          : Promise.resolve({ data: [] }),
      ]);

      const ecMap = new Map<string, any>((ecRes.data || []).map((x: any) => [x.id, x]));
      const fecMap = new Map<string, any>((fecRes.data || []).map((x: any) => [x.id, x]));
      const next: Record<string, Array<{ label: string; value: string }>> = {};

      linkedRows.forEach((row) => {
        const ec = row.linkedEmissionCalculationId ? ecMap.get(row.linkedEmissionCalculationId) : null;
        const fec = row.linkedFinanceEmissionCalculationId ? fecMap.get(row.linkedFinanceEmissionCalculationId) : null;
        const entries: Array<{ label: string; value: string }> = [];

        if (ec) {
          entries.push(
            { label: "Source", value: "Emission calculation" },
            { label: "Calculation type", value: displayValue(ec.calculation_type) },
            { label: "Company type", value: displayValue(ec.company_type) },
            { label: "Formula", value: displayValue(ec.formula_id) },
            { label: "Attributed emissions", value: `${displayValue(ec.financed_emissions)} tCO₂e` },
            { label: "Attribution factor", value: displayValue(ec.attribution_factor) },
            { label: "Data quality score", value: displayValue(ec.data_quality_score) },
            { label: "EVIC", value: displayValue(ec.evic) },
            { label: "Total equity + debt", value: displayValue(ec.total_equity_plus_debt) },
            { label: "Status", value: displayValue(ec.status) },
            { label: "Created", value: ec.created_at ? new Date(ec.created_at).toLocaleString() : "—" },
          );
          const inputs = ec.inputs && typeof ec.inputs === "object" ? (ec.inputs as Record<string, unknown>) : null;
          if (inputs) {
            Object.entries(inputs)
              .slice(0, 8)
              .forEach(([k, v]) => entries.push({ label: `Input: ${prettifyField(k)}`, value: displayValue(v) }));
          }
        } else if (fec) {
          entries.push(
            { label: "Source", value: "Finance calculation" },
            { label: "Calculation type", value: displayValue(fec.calculation_type) },
            { label: "Formula", value: displayValue(fec.formula_name || fec.formula_id) },
            { label: "Company type", value: displayValue(fec.company_type) },
            { label: "Outstanding amount", value: displayValue(fec.outstanding_amount) },
            { label: "Attributed emissions", value: `${displayValue(fec.financed_emissions)} tCO₂e` },
            { label: "Attribution factor", value: displayValue(fec.attribution_factor) },
            { label: "Data quality score", value: displayValue(fec.data_quality_score) },
            { label: "Total assets", value: displayValue(fec.total_assets) },
            { label: "EVIC", value: displayValue(fec.evic) },
            { label: "Total equity + debt", value: displayValue(fec.total_equity_plus_debt) },
            { label: "Total debt", value: displayValue(fec.total_debt) },
            { label: "Total equity", value: displayValue(fec.total_equity) },
            { label: "Share price", value: displayValue(fec.share_price) },
            { label: "Outstanding shares", value: displayValue(fec.outstanding_shares) },
            { label: "Minority interest", value: displayValue(fec.minority_interest) },
            { label: "Preferred stock", value: displayValue(fec.preferred_stock) },
            { label: "Status", value: displayValue(fec.status) },
            { label: "Created", value: fec.created_at ? new Date(fec.created_at).toLocaleString() : "—" },
          );
        }

        next[row.id] = entries.filter((e) => e.value !== "—");
      });

      setFinancedDetailsByRowId(next);
    };

    loadFinancedDetails().catch(() => {
      // details are supplemental, keep UI usable even if load fails
      setFinancedDetailsByRowId({});
    });
  }, [financedRows]);

  const pendingEquityNew = investmentRows.filter(
    (r) =>
      r.lineType !== "financed" &&
      !r.isExisting &&
      r.companyName?.trim() &&
      typeof r.emissions === "number" &&
      typeof r.percentage === "number",
  ).length;
  const pendingEquityUpdates = investmentRows.filter((r) => {
    if (!r.isExisting || !r.dbId || r.lineType === "financed") return false;
    const ex = existingInvestments.find((e) => e.dbId === r.dbId);
    if (!ex) return false;
    return (
      ex.companyName !== r.companyName ||
      ex.emissions !== r.emissions ||
      ex.percentage !== r.percentage ||
      Math.abs((ex.calculatedEmissions || 0) - (r.calculatedEmissions || 0)) > 0.01
    );
  }).length;
  const totalPendingSave = pendingEquityNew + pendingEquityUpdates;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">Investments</h3>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "equity" | "financed")} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100/80">
          <TabsTrigger value="equity" className="gap-1.5 data-[state=active]:bg-white">
            <PieChart className="h-4 w-4" />
            Equity &amp; ownership
          </TabsTrigger>
          <TabsTrigger value="financed" className="gap-1.5 data-[state=active]:bg-white">
            <Link2 className="h-4 w-4" />
            Financed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equity" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Investee totals and your ownership share</p>
            <Button onClick={addInvestmentRow} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add row
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center mb-2">
            <Label className="text-gray-500 font-medium">Investee</Label>
            <Label className="text-gray-500 font-medium">Their emissions (tCO₂e)</Label>
            <Label className="text-gray-500 font-medium">Your ownership (%)</Label>
            <Label className="text-gray-500 font-medium">Your share (tCO₂e)</Label>
          </div>
          <div className="space-y-4">
            {equityRows.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                No equity lines yet. Add a row or switch to Financed to import from portfolio.
              </p>
            )}
            {equityRows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
              >
                <Input
                  value={r.companyName}
                  onChange={(e) => updateInvestmentRow(r.id, { companyName: e.target.value })}
                  placeholder="Company name"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={r.emissions ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateInvestmentRow(r.id, {
                      emissions: v === "" ? undefined : Math.max(0, Number(v) || 0),
                    });
                  }}
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={r.percentage ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateInvestmentRow(r.id, {
                      percentage: v === "" ? undefined : Math.min(100, Math.max(0, Number(v) || 0)),
                    });
                  }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800 flex-1">
                    {r.calculatedEmissions !== undefined ? `${r.calculatedEmissions.toFixed(2)}` : "—"}
                  </span>
                  {r.isExisting ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => deleteInvestmentRow(r.id)}
                      disabled={deletingInvestments.has(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeInvestmentRow(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
            <Button
              onClick={saveInvestments}
              disabled={savingInvestments || totalPendingSave === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {savingInvestments ? "Saving…" : `Save equity (${totalPendingSave})`}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="financed" className="mt-6 space-y-4">
          {isCorporateUser ? (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <div className="md:col-span-3">
                  <Label className="mb-1 block">Company name</Label>
                  <Input
                    value={corporateCompanyName}
                    onChange={(e) => setCorporateCompanyName(e.target.value)}
                    placeholder={
                      companyContext && counterpartyId
                        ? "Using selected company context"
                        : "Enter company name to start questionnaire"
                    }
                    disabled={!!(companyContext && counterpartyId)}
                  />
                </div>
                <Button
                  type="button"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={creatingCorporateJourney}
                  onClick={startCorporateFinanceJourney}
                >
                  {creatingCorporateJourney ? "Opening..." : "Start questionnaire"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">Attributed emissions from lending / investing (portfolio tool)</p>
              <Button type="button" variant="outline" className="border-teal-600 text-teal-700" onClick={openImportFinance}>
                <Link2 className="h-4 w-4 mr-2" />
                Import from portfolio
              </Button>
            </div>
          )}
          {financedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              {isCorporateUser
                ? "No financed lines yet. Use the questionnaire above to calculate and add financed emissions."
                : "No financed lines yet. Import a completed finance calculation from your portfolio."}
            </p>
          ) : (
            <ul className="space-y-2">
              {financedRows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900">{r.companyName}</div>
                      <div className="text-sm text-muted-foreground">
                        {(r.calculatedEmissions ?? 0).toFixed(2)} tCO₂e attributed
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-700"
                        onClick={() => toggleFinancedDetails(r.id)}
                      >
                        <ChevronRight
                          className={`h-4 w-4 mr-1 transition-transform ${
                            expandedFinancedRows.has(r.id) ? "rotate-90" : ""
                          }`}
                        />
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => deleteInvestmentRow(r.id)}
                        disabled={deletingInvestments.has(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedFinancedRows.has(r.id) && (
                    <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                      <table className="w-full text-xs md:text-sm">
                        <tbody>
                          {(financedDetailsByRowId[r.id] || [
                            { label: "Line type", value: "Financed emissions" },
                            { label: "Attributed emissions", value: `${(r.calculatedEmissions ?? 0).toFixed(2)} tCO₂e` },
                            { label: "Investee emissions", value: `${(r.emissions ?? 0).toFixed(2)} tCO₂e` },
                            { label: "Attribution share", value: `${(r.percentage ?? 100).toFixed(2)}%` },
                          ]).map((item) => (
                            <tr key={`${r.id}-${item.label}`} className="border-b last:border-b-0">
                              <td className="py-1.5 pr-3 text-gray-500 w-1/2">{item.label}</td>
                              <td className="py-1.5 text-gray-900 font-medium break-all">{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
        <p className="text-sm text-gray-700">
          Investments total: <span className="font-semibold">{totalEmissions.toFixed(2)} tCO₂e</span>
        </p>
        {onSaveAndNext && (
          <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import financed emissions</DialogTitle>
            <DialogDescription>
              Completed finance calculations from your portfolio. Each can only be added once.
            </DialogDescription>
          </DialogHeader>
          {importLoading ? (
            <p className="text-sm text-muted-foreground py-6">Loading…</p>
          ) : portfolioRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No completed finance calculations found. Run the finance emission flow for a counterparty in Projects
              first, then import here.
            </p>
          ) : (
            <ul className="space-y-2">
              {portfolioRows.map((p) => (
                <li
                  key={`${p.source}-${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{p.counterpartyName || "Counterparty"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.financedEmissions.toFixed(2)} tCO₂e · {new Date(p.createdAt).toLocaleDateString()}
                      {p.formulaName ? ` · ${p.formulaName}` : ""}
                    </div>
                  </div>
                  <Button type="button" size="sm" className="shrink-0 bg-teal-600 hover:bg-teal-700" onClick={() => importFinanceRow(p)}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


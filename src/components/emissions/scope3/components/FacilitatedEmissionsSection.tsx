import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, ChevronRight, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEmissionSync } from "../hooks/useEmissionSync";
import type { EmissionData } from "@/components/emissions/shared/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchPortfolioCalculationsForScope3 } from "@/utils/portfolioCalculationsForScope3";
import { confirmAction } from "@/utils/confirmAction";

export interface FacilitatedEmissionRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  activityLabel: string;
  emissions: number | undefined;
  linkedEmissionCalculationId?: string | null;
  linkedFinanceEmissionCalculationId?: string | null;
}

interface FacilitatedEmissionsSectionProps {
  user: { id: string };
  companyContext?: boolean;
  counterpartyId?: string;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
}

type EmissionCalculationDetails = {
  id: string;
  calculation_type?: unknown;
  company_type?: unknown;
  formula_id?: unknown;
  financed_emissions?: unknown;
  attribution_factor?: unknown;
  data_quality_score?: unknown;
  status?: unknown;
  created_at?: string | null;
  inputs?: Record<string, unknown> | null;
};

type FinanceCalculationDetails = {
  id: string;
  calculation_type?: unknown;
  formula_name?: unknown;
  formula_id?: unknown;
  company_type?: unknown;
  outstanding_amount?: unknown;
  financed_emissions?: unknown;
  attribution_factor?: unknown;
  data_quality_score?: unknown;
  total_assets?: unknown;
  evic?: unknown;
  total_equity_plus_debt?: unknown;
  status?: unknown;
  created_at?: string | null;
};

function newRow(): FacilitatedEmissionRow {
  return {
    id: `fac-${Date.now()}-${Math.random()}`,
    activityLabel: "",
    emissions: undefined,
  };
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

export const FacilitatedEmissionsSection: React.FC<FacilitatedEmissionsSectionProps> = ({
  user,
  companyContext,
  counterpartyId,
  setEmissionData,
  onSaveAndNext,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<FacilitatedEmissionRow[]>([]);
  const [existing, setExisting] = useState<FacilitatedEmissionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [initialLoad, setInitialLoad] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [detailsByRowId, setDetailsByRowId] = useState<Record<string, Array<{ label: string; value: string }>>>({});
  const [userType, setUserType] = useState<string>("corporate");
  const [userTypeResolved, setUserTypeResolved] = useState(false);
  const [corporateCompanyName, setCorporateCompanyName] = useState("");
  const [creatingCorporateJourney, setCreatingCorporateJourney] = useState(false);
  const [portfolioRows, setPortfolioRows] = useState<Awaited<
    ReturnType<typeof fetchPortfolioCalculationsForScope3>
  >>([]);
  const isCorporateUser = userTypeResolved ? userType === "corporate" : true;

  const loadRows = useCallback(async () => {
    if (!user) return;
    if (companyContext && !counterpartyId) {
      setRows([]);
      setExisting([]);
      setInitialLoad(false);
      return;
    }
    try {
      let q = supabase
        .from("scope3_facilitated_emissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (companyContext && counterpartyId) {
        q = q.eq("counterparty_id", counterpartyId);
      }
      // Main calculator (no company context): load all lines for this user.
      const { data, error } = await q;
      if (error) throw error;
      const mapped: FacilitatedEmissionRow[] = (data || []).map((e: any) => ({
        id: crypto.randomUUID(),
        dbId: e.id,
        isExisting: true,
        activityLabel: e.activity_label || "",
        emissions: Number(e.emissions) || 0,
        linkedEmissionCalculationId: e.linked_emission_calculation_id ?? null,
        linkedFinanceEmissionCalculationId: e.linked_finance_emission_calculation_id ?? null,
      }));
      setExisting(mapped);
      setRows(mapped.length ? mapped : []);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load facilitated emissions", variant: "destructive" });
    } finally {
      setInitialLoad(false);
    }
  }, [user.id, companyContext, counterpartyId]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

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
      const { data: existingCounterparty, error: existingErr } = await (supabase as any)
        .from("counterparties")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", normalized)
        .limit(1)
        .maybeSingle();
      if (existingErr) throw existingErr;
      if (existingCounterparty?.id) return existingCounterparty.id;

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
    category: "facilitated_emissions",
    rows,
    isInitialLoad: initialLoad,
    mapRowToEntry: (r) => {
      if (!r.activityLabel?.trim() || typeof r.emissions !== "number" || r.emissions < 0) return null;
      return {
        id: r.id,
        category: "facilitated_emissions",
        activity: r.activityLabel.trim(),
        unit: "tCO₂e",
        quantity: r.emissions,
        emissions: r.emissions,
      };
    },
    setEmissionData,
  });

  const openImport = async () => {
    setImportOpen(true);
    setImportLoading(true);
    try {
      const list = await fetchPortfolioCalculationsForScope3(
        supabase,
        user.id,
        "facilitated",
        companyContext && counterpartyId ? counterpartyId : null,
      );
      setPortfolioRows(list);
    } catch (e: any) {
      toast({ title: "Could not load portfolio", description: e.message, variant: "destructive" });
    } finally {
      setImportLoading(false);
    }
  };

  const importOne = async (p: (typeof portfolioRows)[0]) => {
    const label =
      [p.counterpartyName, p.formulaName || p.formulaId || "Facilitated"].filter(Boolean).join(" · ") ||
      "Facilitated emissions";
    const payload: Record<string, unknown> = {
      user_id: user.id,
      counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
      activity_label: label.slice(0, 500),
      emissions: p.financedEmissions,
    };
    if (p.source === "emission_calculations") {
      payload.linked_emission_calculation_id = p.id;
    } else {
      payload.linked_finance_emission_calculation_id = p.id;
    }
    const { error } = await supabase.from("scope3_facilitated_emissions").insert(payload);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already added", description: "This portfolio result is already in Category 16." });
      } else {
        toast({ title: "Import failed", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Added", description: "Facilitated line added from portfolio." });
    setImportOpen(false);
    await loadRows();
  };

  const syncCorporateFacilitatedResults = useCallback(async () => {
    if (!isCorporateUser) return;
    const list = await fetchPortfolioCalculationsForScope3(
      supabase,
      user.id,
      "facilitated",
      companyContext && counterpartyId ? counterpartyId : null,
    );
    if (!list.length) return;

    let added = 0;
    for (const p of list) {
      const payload: Record<string, unknown> = {
        user_id: user.id,
        counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
        activity_label: [p.counterpartyName, p.formulaName || p.formulaId || "Facilitated"].filter(Boolean).join(" · ").slice(0, 500),
        emissions: p.financedEmissions,
      };
      if (p.source === "emission_calculations") {
        payload.linked_emission_calculation_id = p.id;
      } else {
        payload.linked_finance_emission_calculation_id = p.id;
      }
      const { error } = await (supabase as any).from("scope3_facilitated_emissions").insert(payload);
      if (!error) {
        added += 1;
      } else if (error.code !== "23505") {
        throw error;
      }
    }
    if (added > 0) {
      await loadRows();
      toast({
        title: "Updated from questionnaire",
        description: `${added} facilitated line${added > 1 ? "s" : ""} added to Category 16.`,
      });
    }
  }, [isCorporateUser, user.id, companyContext, counterpartyId, loadRows, toast]);

  useEffect(() => {
    if (!userTypeResolved || !isCorporateUser) return;
    syncCorporateFacilitatedResults().catch((e: any) => {
      toast({
        title: "Sync error",
        description: e?.message || "Failed to fetch facilitated questionnaire results.",
        variant: "destructive",
      });
    });
  }, [userTypeResolved, isCorporateUser, syncCorporateFacilitatedResults, toast]);

  const startCorporateFacilitatedJourney = async () => {
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
          mode: "facilitated",
          counterpartyId: cpId,
          returnUrl: "/emission-calculator",
        },
      });
    } catch (e: any) {
      toast({
        title: "Unable to start questionnaire",
        description: e?.message || "Could not create/open the facilitated emissions questionnaire.",
        variant: "destructive",
      });
    } finally {
      setCreatingCorporateJourney(false);
    }
  };

  const saveManual = async () => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    const pending = rows.filter(
      (r) =>
        !r.isExisting &&
        r.activityLabel.trim() &&
        typeof r.emissions === "number" &&
        r.emissions >= 0 &&
        !r.linkedEmissionCalculationId &&
        !r.linkedFinanceEmissionCalculationId,
    );
    const updates = rows.filter((r) => {
      if (!r.isExisting || !r.dbId) return false;
      const o = existing.find((e) => e.dbId === r.dbId);
      if (!o) return false;
      return o.activityLabel !== r.activityLabel || Math.abs((o.emissions || 0) - (r.emissions || 0)) > 1e-6;
    });
    if (pending.length === 0 && updates.length === 0) {
      toast({ title: "Nothing to save", description: "Add a label and emissions, or edit an existing row." });
      return;
    }
    setSaving(true);
    try {
      for (const r of pending) {
        const { error } = await supabase.from("scope3_facilitated_emissions").insert({
          user_id: user.id,
          counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
          activity_label: r.activityLabel.trim(),
          emissions: r.emissions ?? 0,
        });
        if (error) throw error;
      }
      for (const r of updates) {
        const { error } = await supabase
          .from("scope3_facilitated_emissions")
          .update({
            activity_label: r.activityLabel.trim(),
            emissions: r.emissions!,
          })
          .eq("id", r.dbId!);
        if (error) throw error;
      }
      toast({ title: "Saved", description: "Facilitated emissions saved." });
      await loadRows();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeLocal = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const deleteRow = async (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (!r?.dbId) {
      removeLocal(id);
      return;
    }
    if (!confirmAction({ title: "Delete this facilitated emissions line?" })) return;
    setDeleting((prev) => new Set(prev).add(id));
    try {
      const { error } = await supabase.from("scope3_facilitated_emissions").delete().eq("id", r.dbId);
      if (error) throw error;
      toast({ title: "Deleted" });
      await loadRows();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeleting((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    }
  };

  const total = rows.reduce((s, r) => s + (typeof r.emissions === "number" ? r.emissions : 0), 0);
  const rowDetailsKey = useMemo(
    () =>
      rows
        .map((r) => `${r.id}:${r.linkedEmissionCalculationId || ""}:${r.linkedFinanceEmissionCalculationId || ""}`)
        .sort()
        .join("|"),
    [rows],
  );
  const linkedRowsForDetails = useMemo(
    () => rows.filter((r) => r.linkedEmissionCalculationId || r.linkedFinanceEmissionCalculationId),
    [rowDetailsKey],
  );
  const toggleDetails = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const loadRowDetails = async () => {
      const linkedRows = linkedRowsForDetails;
      if (linkedRows.length === 0) {
        setDetailsByRowId({});
        return;
      }

      const emissionIds = [...new Set(linkedRows.map((r) => r.linkedEmissionCalculationId).filter(Boolean))] as string[];
      const financeIds = [...new Set(linkedRows.map((r) => r.linkedFinanceEmissionCalculationId).filter(Boolean))] as string[];

      const [ecRes, fecRes] = await Promise.all([
        emissionIds.length
          ? (supabase as any)
              .from("emission_calculations")
              .select(
                "id, calculation_type, company_type, formula_id, financed_emissions, attribution_factor, data_quality_score, status, created_at, inputs",
              )
              .in("id", emissionIds)
          : Promise.resolve({ data: [] }),
        financeIds.length
          ? (supabase as any)
              .from("finance_emission_calculations")
              .select(
                "id, calculation_type, formula_name, formula_id, company_type, outstanding_amount, financed_emissions, attribution_factor, data_quality_score, total_assets, evic, total_equity_plus_debt, status, created_at",
              )
              .in("id", financeIds)
          : Promise.resolve({ data: [] }),
      ]);

      const ecRows = (ecRes.data || []) as EmissionCalculationDetails[];
      const fecRows = (fecRes.data || []) as FinanceCalculationDetails[];
      const ecMap = new Map<string, EmissionCalculationDetails>(ecRows.map((x) => [x.id, x]));
      const fecMap = new Map<string, FinanceCalculationDetails>(fecRows.map((x) => [x.id, x]));
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
            { label: "Status", value: displayValue(fec.status) },
            { label: "Created", value: fec.created_at ? new Date(fec.created_at).toLocaleString() : "—" },
          );
        }

        next[row.id] = entries.filter((e) => e.value !== "—");
      });

      setDetailsByRowId(next);
    };

    loadRowDetails().catch(() => {
      setDetailsByRowId({});
    });
  }, [rowDetailsKey, linkedRowsForDetails]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Category 16: Facilitated emissions</h4>
          <p className="text-sm text-gray-600">Manual entries or portfolio import</p>
        </div>
        {!isCorporateUser && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="border-teal-600 text-teal-700" onClick={openImport}>
              <Link2 className="h-4 w-4 mr-2" />
              Import from portfolio
            </Button>
            <Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setRows((p) => [...p, newRow()])}>
              <Plus className="h-4 w-4 mr-2" />
              Add manual line
            </Button>
          </div>
        )}
      </div>

      {isCorporateUser && (
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
              onClick={startCorporateFacilitatedJourney}
            >
              {creatingCorporateJourney ? "Opening..." : "Start questionnaire"}
            </Button>
          </div>
        </div>
      )}

      {!isCorporateUser && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-2">
          <Label className="text-gray-600">Activity / description</Label>
          <Label className="text-gray-600">Emissions (tCO₂e)</Label>
          <span />
        </div>
      )}

      <div className="space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            {isCorporateUser
              ? "No facilitated lines yet. Use the questionnaire above to calculate and add facilitated emissions."
              : "No lines yet. Add a manual line or import from portfolio."}
          </p>
        )}
        {rows.map((r) => {
          const linked = !!(r.linkedEmissionCalculationId || r.linkedFinanceEmissionCalculationId);

          if (isCorporateUser) {
            return (
              <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{r.activityLabel || "Facilitated entry"}</div>
                    <div className="text-sm text-muted-foreground">
                      {(r.emissions ?? 0).toFixed(2)} tCO₂e attributed
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-gray-700"
                      onClick={() => toggleDetails(r.id)}
                    >
                      <ChevronRight
                        className={`h-4 w-4 mr-1 transition-transform ${expandedRows.has(r.id) ? "rotate-90" : ""}`}
                      />
                      Details
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      disabled={deleting.has(r.id)}
                      onClick={() => deleteRow(r.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expandedRows.has(r.id) && (
                  <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
                    <table className="w-full text-xs md:text-sm">
                      <tbody>
                        {(detailsByRowId[r.id] || [
                          { label: "Line type", value: "Facilitated emissions" },
                          { label: "Attributed emissions", value: `${(r.emissions ?? 0).toFixed(2)} tCO₂e` },
                          { label: "Source", value: linked ? "Portfolio calculation" : "Manual entry" },
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
              </div>
            );
          }

          return (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
            >
              <Input
                value={r.activityLabel}
                disabled={linked}
                onChange={(e) =>
                  setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, activityLabel: e.target.value } : x)))
                }
                placeholder="e.g. Underwriting — Project Atlas"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                disabled={linked}
                value={r.emissions ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setRows((prev) =>
                    prev.map((x) =>
                      x.id === r.id
                        ? { ...x, emissions: v === "" ? undefined : Math.max(0, Number(v) || 0) }
                        : x,
                    ),
                  );
                }}
              />
              <div className="flex justify-end gap-2">
                {linked && (
                  <span className="text-xs text-teal-700 self-center mr-auto">From portfolio</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  disabled={deleting.has(r.id)}
                  onClick={() => deleteRow(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
        <p className="text-sm text-gray-700">
          Facilitated emissions total: <span className="font-semibold">{total.toFixed(2)} tCO₂e</span>
        </p>
        <div className="flex gap-2">
          {!isCorporateUser && (
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={saving}
              onClick={saveManual}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          )}
          {onSaveAndNext && (
            <Button type="button" variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import facilitated emissions</DialogTitle>
            <DialogDescription>
              Completed calculations from your portfolio. Selecting one adds it to Category 16.
            </DialogDescription>
          </DialogHeader>
          {importLoading ? (
            <p className="text-sm text-muted-foreground py-6">Loading…</p>
          ) : portfolioRows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No completed calculations found. Complete an entry in your portfolio flow
              first, or add lines manually above.
            </p>
          ) : (
            <ul className="space-y-2">
              {portfolioRows.map((p) => (
                <li
                  key={`${p.source}-${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <div className="font-medium text-gray-900">{p.counterpartyName || "Counterparty"}</div>
                    <div className="text-muted-foreground text-xs">
                      {p.financedEmissions.toFixed(2)} tCO₂e · {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button type="button" size="sm" className="shrink-0 bg-teal-600 hover:bg-teal-700" onClick={() => importOne(p)}>
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


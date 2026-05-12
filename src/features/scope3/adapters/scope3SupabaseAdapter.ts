import { supabase } from "@/integrations/supabase/client";
import type { EmissionCalculationDetails, FinanceCalculationDetails } from "../types/calculationDetails";

type Scope3InvestmentRecord = {
  id: string;
  company_name: string | null;
  emissions: number | null;
  total_emissions: number | null;
  ownership_percentage: number | null;
  calculated_emissions: number | null;
  line_type: string | null;
  linked_emission_calculation_id: string | null;
  linked_finance_emission_calculation_id: string | null;
};

type Scope3FacilitatedRecord = {
  id: string;
  activity_label: string | null;
  emissions: number | null;
  linked_emission_calculation_id: string | null;
  linked_finance_emission_calculation_id: string | null;
};

type CounterpartyIdRecord = { id: string };

export async function fetchScope3Investments(
  userId: string,
  companyContext?: boolean,
  counterpartyId?: string,
): Promise<Scope3InvestmentRecord[]> {
  let query = supabase
    .from("scope3_investments")
    .select(
      "id, company_name, emissions, total_emissions, ownership_percentage, calculated_emissions, line_type, linked_emission_calculation_id, linked_finance_emission_calculation_id",
    )
    .eq("user_id", userId);

  if (companyContext && counterpartyId) {
    query = query.eq("counterparty_id", counterpartyId);
  } else {
    query = query.is("counterparty_id", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Scope3InvestmentRecord[];
}

export async function findScope3InvestmentDuplicate(
  userId: string,
  source: "emission_calculations" | "finance_emission_calculations",
  linkedId: string,
): Promise<{ id: string } | null> {
  const linkedField =
    source === "emission_calculations"
      ? "linked_emission_calculation_id"
      : "linked_finance_emission_calculation_id";

  const { data, error } = await supabase
    .from("scope3_investments")
    .select("id")
    .eq("user_id", userId)
    .eq(linkedField, linkedId)
    .maybeSingle();

  if (error) throw error;
  return (data as { id: string } | null) || null;
}

export async function insertScope3Investment(payload: Record<string, unknown>) {
  const { error } = await supabase.from("scope3_investments").insert(payload);
  if (error) throw error;
}

export async function insertScope3Investments(payload: Record<string, unknown>[]) {
  const { error } = await supabase.from("scope3_investments").insert(payload);
  if (error) throw error;
}

export async function updateScope3Investment(id: string, payload: Record<string, unknown>) {
  const { error } = await supabase.from("scope3_investments").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteScope3Investment(id: string) {
  const { error } = await supabase.from("scope3_investments").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchScope3FacilitatedEmissions(
  userId: string,
  companyContext?: boolean,
  counterpartyId?: string,
): Promise<Scope3FacilitatedRecord[]> {
  let query = supabase
    .from("scope3_facilitated_emissions")
    .select("id, activity_label, emissions, linked_emission_calculation_id, linked_finance_emission_calculation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (companyContext && counterpartyId) {
    query = query.eq("counterparty_id", counterpartyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Scope3FacilitatedRecord[];
}

export async function insertScope3FacilitatedEmission(payload: Record<string, unknown>) {
  const { error } = await supabase.from("scope3_facilitated_emissions").insert(payload);
  if (error) throw error;
}

export async function updateScope3FacilitatedEmission(id: string, payload: Record<string, unknown>) {
  const { error } = await supabase.from("scope3_facilitated_emissions").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteScope3FacilitatedEmission(id: string) {
  const { error } = await supabase.from("scope3_facilitated_emissions").delete().eq("id", id);
  if (error) throw error;
}

export async function getOrCreateCorporateCounterparty(userId: string, name: string): Promise<string> {
  const normalized = name.trim();
  const { data: existing, error: existingErr } = await supabase
    .from("counterparties")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", normalized)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;

  const existingTyped = existing as CounterpartyIdRecord | null;
  if (existingTyped?.id) return existingTyped.id;

  const { data: created, error: createErr } = await supabase
    .from("counterparties")
    .insert({
      user_id: userId,
      name: normalized,
      sector: "General",
      geography: "Unknown",
      counterparty_type: "Corporate",
    })
    .select("id")
    .single();
  if (createErr) throw createErr;

  return (created as CounterpartyIdRecord).id;
}

export async function fetchLinkedCalculationDetails(
  emissionIds: string[],
  financeIds: string[],
): Promise<{
  emissionRows: EmissionCalculationDetails[];
  financeRows: FinanceCalculationDetails[];
}> {
  const [ecRes, fecRes] = await Promise.all([
    emissionIds.length
      ? supabase
          .from("emission_calculations")
          .select(
            "id, calculation_type, company_type, formula_id, financed_emissions, attribution_factor, data_quality_score, evic, total_equity_plus_debt, status, created_at, inputs",
          )
          .in("id", emissionIds)
      : Promise.resolve({ data: [] as unknown[] }),
    financeIds.length
      ? supabase
          .from("finance_emission_calculations")
          .select(
            "id, calculation_type, formula_name, formula_id, company_type, outstanding_amount, financed_emissions, attribution_factor, data_quality_score, total_assets, evic, total_equity_plus_debt, share_price, outstanding_shares, total_debt, total_equity, minority_interest, preferred_stock, status, created_at",
          )
          .in("id", financeIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  if ("error" in ecRes && ecRes.error) throw ecRes.error;
  if ("error" in fecRes && fecRes.error) throw fecRes.error;

  return {
    emissionRows: ((ecRes.data as EmissionCalculationDetails[]) || []) as EmissionCalculationDetails[],
    financeRows: ((fecRes.data as FinanceCalculationDetails[]) || []) as FinanceCalculationDetails[],
  };
}

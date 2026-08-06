import { supabase } from './client';
import { USE_JWT_AUTH } from '@/api/config';
import {
  createCounterpartyApi,
  createExposureApi,
  deleteCounterpartyApi,
  getCounterpartyApi,
  getCounterpartyQuestionnaireApi,
  listCompanyEmissions,
  listCounterparties,
  listExposures,
  patchCompanyEmissionApi,
  patchCounterpartyApi,
  patchExposureApi,
  patchQuestionnaireApi,
  upsertCounterpartyQuestionnaireApi,
  type QuestionnaireOut,
} from '@/api/portfolio';
import {
  createFinancedEmission,
  deleteFinancedEmission,
  listFinancedEmissions,
  patchFinancedEmission,
  type FinancedEmission,
} from '@/api/financed';
import { resolveFinancedCalculation } from '@/api/financedConnection';

function financedToEmissionCalculation(row: FinancedEmission): EmissionCalculation {
  const calcType =
    row.calc_kind === 'facilitated' ? 'facilitated' : 'finance';
  return {
    id: row.id,
    user_id: row.user_id,
    counterparty_id: row.counterparty_id ?? null,
    exposure_id: row.exposure_id ?? null,
    questionnaire_id: row.questionnaire_id ?? null,
    calculation_type: calcType,
    company_type: row.company_type || '',
    formula_id: row.formula_id || '',
    inputs: (row.inputs || {}) as Record<string, unknown>,
    results: (row.results || {}) as Record<string, unknown>,
    financed_emissions: Number(row.financed_emissions ?? 0),
    attribution_factor:
      row.attribution_factor == null ? null : Number(row.attribution_factor),
    data_quality_score:
      row.data_quality_score == null ? null : Number(row.data_quality_score),
    evic: null,
    total_equity_plus_debt: null,
    status: (row.status as EmissionCalculation['status']) || 'completed',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

function apiToQuestionnaire(row: QuestionnaireOut): CounterpartyQuestionnaire {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    counterparty_id: String(row.counterparty_id),
    corporate_structure: row.corporate_structure || 'unlisted',
    has_emissions: Boolean(row.has_emissions),
    scope1_emissions: row.scope1_emissions ?? null,
    scope2_emissions: row.scope2_emissions ?? null,
    scope3_emissions: row.scope3_emissions ?? null,
    verification_status: row.verification_status || 'unverified',
    verifier_name: row.verifier_name ?? null,
    evic: row.evic ?? null,
    total_equity_plus_debt: row.total_equity_plus_debt ?? null,
    share_price: row.share_price ?? null,
    outstanding_shares: row.outstanding_shares ?? null,
    total_debt: row.total_debt ?? null,
    minority_interest: row.minority_interest ?? null,
    preferred_stock: row.preferred_stock ?? null,
    total_equity: row.total_equity ?? null,
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
  };
}

// Types matching our database schema
export interface Counterparty {
  id: string;
  user_id: string;
  name: string;
  sector: string;
  geography: string;
  counterparty_type: string;
  created_at: string;
  updated_at: string;
}

export interface Exposure {
  id: string;
  user_id: string;
  counterparty_id: string;
  exposure_id: string;
  amount_pkr: number;
  probability_of_default: number;
  loss_given_default: number;
  tenor_months: number;
  created_at: string;
  updated_at: string;
}

export interface CounterpartyQuestionnaire {
  id: string;
  user_id: string;
  counterparty_id: string;
  corporate_structure: string;
  has_emissions: boolean;
  scope1_emissions: number | null;
  scope2_emissions: number | null;
  scope3_emissions: number | null;
  verification_status: string;
  verifier_name: string | null;
  evic: number | null;
  total_equity_plus_debt: number | null;
  share_price: number | null;
  outstanding_shares: number | null;
  total_debt: number | null;
  minority_interest: number | null;
  preferred_stock: number | null;
  total_equity: number | null;
  created_at: string;
  updated_at: string;
}

export interface EmissionCalculation {
  id: string;
  user_id: string;
  counterparty_id: string | null;
  exposure_id: string | null;
  questionnaire_id: string | null;
  calculation_type: string;
  company_type: string;
  formula_id: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  financed_emissions: number;
  attribution_factor: number | null;
  data_quality_score: number | null;
  evic: number | null;
  total_equity_plus_debt: number | null;
  status: 'draft' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CompanyEmissions {
  id: string;
  user_id: string;
  counterparty_id: string | null;
  is_bank_emissions: boolean;
  scope1_emissions: number;
  scope2_emissions: number;
  scope3_emissions: number;
  total_emissions: number;
  calculation_source: 'emission_calculator' | 'questionnaire' | 'manual';
  calculation_date: string;
  status: 'active' | 'archived';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioTotals {
  user_id: string;
  total_finance_emissions: number;
  total_facilitated_emissions: number;
  total_exposure_pkr: number;
  total_counterparties: number;
  total_exposures: number;
}

// Portfolio Operations
export class PortfolioClient {
  // Counterparties
  static async createCounterparty(counterpartyData: Omit<Counterparty, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (USE_JWT_AUTH) {
      return (await createCounterpartyApi({
        name: counterpartyData.name,
        sector: counterpartyData.sector,
        geography: counterpartyData.geography,
        counterparty_type: counterpartyData.counterparty_type,
      })) as Counterparty;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: result, error } = await supabase
      .from('counterparties')
      .insert({
        ...counterpartyData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return result as Counterparty;
  }

  static async getCounterparties(): Promise<Counterparty[]> {
    if (USE_JWT_AUTH) {
      return (await listCounterparties()) as Counterparty[];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: counterpartiesData, error } = await supabase
      .from('counterparties')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return counterpartiesData as Counterparty[];
  }

  static async getCounterparty(id: string): Promise<Counterparty | null> {
    if (USE_JWT_AUTH) {
      try {
        return (await getCounterpartyApi(id)) as Counterparty;
      } catch (err: any) {
        if (err?.status === 404) return null;
        throw err;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: counterpartyData, error } = await supabase
      .from('counterparties')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return counterpartyData as Counterparty;
  }

  static async updateCounterparty(id: string, updateData: Partial<Counterparty>) {
    if (USE_JWT_AUTH) {
      return (await patchCounterpartyApi(id, {
        name: updateData.name,
        sector: updateData.sector,
        geography: updateData.geography,
        counterparty_type: updateData.counterparty_type,
      })) as Counterparty;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: result, error } = await supabase
      .from('counterparties')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return result as Counterparty;
  }

  static async deleteCounterparty(id: string) {
    if (USE_JWT_AUTH) {
      await deleteCounterpartyApi(id);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    const { error } = await supabase
      .from('counterparties')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
  }

  // Exposures
  static async createExposure(exposureData: Omit<Exposure, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (USE_JWT_AUTH) {
      return (await createExposureApi({
        counterparty_id: exposureData.counterparty_id,
        exposure_id: exposureData.exposure_id,
        amount_pkr: exposureData.amount_pkr,
        probability_of_default: exposureData.probability_of_default,
        loss_given_default: exposureData.loss_given_default,
        tenor_months: exposureData.tenor_months,
      })) as Exposure;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: result, error } = await supabase
      .from('exposures')
      .insert({
        ...exposureData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return result as Exposure;
  }

  static async getExposures(): Promise<Exposure[]> {
    if (USE_JWT_AUTH) {
      return (await listExposures()) as Exposure[];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: exposuresData, error } = await supabase
      .from('exposures')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return exposuresData as Exposure[];
  }

  static async updateExposure(id: string, updateData: Partial<Exposure>) {
    if (USE_JWT_AUTH) {
      return (await patchExposureApi(id, {
        exposure_id: updateData.exposure_id,
        amount_pkr: updateData.amount_pkr,
        probability_of_default: updateData.probability_of_default,
        loss_given_default: updateData.loss_given_default,
        tenor_months: updateData.tenor_months,
      })) as Exposure;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: result, error } = await supabase
      .from('exposures')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return result as Exposure;
  }

  static async updateExposureAmountForCounterparty(counterpartyId: string, amountPkr: number) {
    if (USE_JWT_AUTH) {
      const existing = await listExposures(counterpartyId);
      if (!existing.length) {
        return (await createExposureApi({
          counterparty_id: counterpartyId,
          exposure_id: '0001',
          amount_pkr: amountPkr,
          probability_of_default: 0,
          loss_given_default: 0,
          tenor_months: 0,
        })) as Exposure;
      }
      return (await patchExposureApi(existing[0].id, { amount_pkr: amountPkr })) as Exposure;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Find the exposure for this counterparty
    const { data: exposure, error: findError } = await supabase
      .from('exposures')
      .select('id')
      .eq('counterparty_id', counterpartyId)
      .eq('user_id', user.id)
      .single();

    if (findError) {
      if (findError.code === 'PGRST116') {
        // No exposure found, create one
        const { data: newExposure, error: createError } = await supabase
          .from('exposures')
          .insert({
            counterparty_id: counterpartyId,
            exposure_id: '0001', // Default exposure ID
            amount_pkr: amountPkr,
            probability_of_default: 0,
            loss_given_default: 0,
            tenor_months: 0,
            user_id: user.id
          })
          .select()
          .single();

        if (createError) throw createError;
        return newExposure as Exposure;
      }
      throw findError;
    }

    // Update existing exposure
    const { data: result, error: updateError } = await supabase
      .from('exposures')
      .update({ amount_pkr: amountPkr })
      .eq('id', exposure.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) throw updateError;
    return result as Exposure;
  }

  // Questionnaires
  static async createQuestionnaire(questionnaireData: Omit<CounterpartyQuestionnaire, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (USE_JWT_AUTH) {
      const { counterparty_id, ...body } = questionnaireData;
      const row = await upsertCounterpartyQuestionnaireApi(counterparty_id, body);
      return apiToQuestionnaire(row);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: result, error } = await supabase
      .from('counterparty_questionnaires')
      .insert({
        ...questionnaireData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return result as CounterpartyQuestionnaire;
  }

  static async getQuestionnaire(counterpartyId: string): Promise<CounterpartyQuestionnaire | null> {
    if (USE_JWT_AUTH) {
      const row = await getCounterpartyQuestionnaireApi(counterpartyId);
      return row ? apiToQuestionnaire(row) : null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: questionnaireData, error } = await supabase
      .from('counterparty_questionnaires')
      .select('*')
      .eq('counterparty_id', counterpartyId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return questionnaireData as CounterpartyQuestionnaire;
  }

  static async updateQuestionnaire(id: string, updateData: Partial<CounterpartyQuestionnaire>) {
    if (USE_JWT_AUTH) {
      const {
        id: _id,
        user_id: _userId,
        counterparty_id: _cp,
        created_at: _created,
        updated_at: _updated,
        ...body
      } = updateData;
      const row = await patchQuestionnaireApi(id, body);
      return apiToQuestionnaire(row);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: result, error } = await supabase
      .from('counterparty_questionnaires')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return result as CounterpartyQuestionnaire;
  }

  // Emission Calculations
  static async createEmissionCalculation(calculationData: Omit<EmissionCalculation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    if (USE_JWT_AUTH) {
      const calcKind =
        calculationData.calculation_type === 'facilitated'
          ? 'facilitated'
          : 'finance';
      const row = await createFinancedEmission({
        calc_kind: calcKind,
        company_type: calculationData.company_type,
        formula_id: calculationData.formula_id,
        inputs: calculationData.inputs,
        results: calculationData.results,
        financed_emissions: calculationData.financed_emissions,
        attribution_factor: calculationData.attribution_factor,
        data_quality_score: calculationData.data_quality_score,
        counterparty_id: calculationData.counterparty_id,
        exposure_id: calculationData.exposure_id,
        questionnaire_id: calculationData.questionnaire_id,
        status: calculationData.status || 'completed',
      });
      return financedToEmissionCalculation(row);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: result, error } = await supabase
      .from('emission_calculations')
      .insert({
        ...calculationData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return result as EmissionCalculation;
  }

  static async getEmissionCalculations(counterpartyId?: string): Promise<EmissionCalculation[]> {
    if (USE_JWT_AUTH) {
      const rows = await listFinancedEmissions({
        counterparty_id: counterpartyId,
      });
      return rows.map(financedToEmissionCalculation);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('🔍 PortfolioClient - getEmissionCalculations called with counterpartyId:', counterpartyId);
    console.log('🔍 PortfolioClient - user.id:', user.id);

    let query = supabase
      .from('emission_calculations')
      .select('*')
      .eq('user_id', user.id);

    if (counterpartyId) {
      query = query.eq('counterparty_id', counterpartyId);
      console.log('🔍 PortfolioClient - Filtering by counterparty_id:', counterpartyId);
    } else {
      console.log('🔍 PortfolioClient - No counterpartyId filter, getting all calculations for user');
    }

    const { data: calculationsData, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ PortfolioClient - getEmissionCalculations error:', error);
      throw error;
    }

    let rows = (calculationsData as EmissionCalculation[]) || [];

    console.log('🔍 PortfolioClient - emission_calculations result count:', rows.length);

    // Fallback: if no rows found (or RLS filtered), try finance_emission_calculations and map results
    if (rows.length === 0 && counterpartyId) {
      console.warn('⚠️ PortfolioClient - No rows in emission_calculations; falling back to finance_emission_calculations');
      const { data: financeRows, error: financeErr } = await supabase
        .from('finance_emission_calculations')
        .select('*')
        .eq('user_id', user.id)
        .eq('counterparty_id', counterpartyId)
        .order('created_at', { ascending: false });

      if (financeErr) {
        console.error('❌ PortfolioClient - finance_emission_calculations fallback error:', financeErr);
      } else if (financeRows && financeRows.length > 0) {
        rows = financeRows.map((r: {
          id: string;
          user_id: string;
          counterparty_id: string | null;
          calculation_type: string;
          company_type: string;
          formula_id: string;
          formula_name: string | null;
          financed_emissions: number;
          attribution_factor: number | null;
          evic: number | null;
          total_equity_plus_debt: number | null;
          status: 'draft' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        }) => ({
          id: r.id,
          user_id: r.user_id,
          counterparty_id: r.counterparty_id,
          exposure_id: null,
          questionnaire_id: null,
          calculation_type: r.calculation_type === 'finance_emission' ? 'finance' : 'facilitated',
          company_type: r.company_type,
          formula_id: r.formula_id,
          inputs: {},
          results: {
            attributionFactor: r.attribution_factor,
            financedEmissions: r.financed_emissions,
            denominatorLabel: r.evic ? 'EVIC' : 'Total Equity + Debt',
            denominatorValue: r.evic || r.total_equity_plus_debt,
            loanType: r.formula_id,
            loanLabel: r.formula_name
          },
          financed_emissions: r.financed_emissions,
          attribution_factor: r.attribution_factor,
          evic: r.evic,
          total_equity_plus_debt: r.total_equity_plus_debt,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at
        })) as unknown as EmissionCalculation[];
        console.log('🔍 PortfolioClient - Fallback mapped rows count:', rows.length);
      }
    }

    console.log('🔍 PortfolioClient - getEmissionCalculations final result:', {
      count: rows.length,
      calculations: rows.map(c => ({
        id: c.id,
        counterparty_id: c.counterparty_id,
        calculation_type: c.calculation_type,
        formula_id: c.formula_id,
        financed_emissions: c.financed_emissions,
        created_at: c.created_at,
        updated_at: c.updated_at
      }))
    });

    return rows;
  }

  

  // Bulk operations for BankPortfolio
  static async createCounterpartyWithExposure(
    counterpartyData: Omit<Counterparty, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    exposureData: Omit<Exposure, 'id' | 'user_id' | 'counterparty_id' | 'created_at' | 'updated_at'>
  ) {
    if (USE_JWT_AUTH) {
      const counterparty = await createCounterpartyApi({
        name: counterpartyData.name,
        sector: counterpartyData.sector,
        geography: counterpartyData.geography,
        counterparty_type: counterpartyData.counterparty_type,
        exposure: {
          exposure_id: exposureData.exposure_id,
          amount_pkr: exposureData.amount_pkr,
          probability_of_default: exposureData.probability_of_default,
          loss_given_default: exposureData.loss_given_default,
          tenor_months: exposureData.tenor_months,
        },
      });
      const exposures = await listExposures(counterparty.id);
      return {
        counterparty: counterparty as Counterparty,
        exposure: (exposures[0] || null) as Exposure,
      };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create counterparty first
    const { data: counterparty, error: counterpartyError } = await supabase
      .from('counterparties')
      .insert({
        ...counterpartyData,
        user_id: user.id
      })
      .select()
      .single();

    if (counterpartyError) throw counterpartyError;

    // Create exposure linked to counterparty
    const { data: exposure, error: exposureError } = await supabase
      .from('exposures')
      .insert({
        ...exposureData,
        counterparty_id: counterparty.id,
        user_id: user.id
      })
      .select()
      .single();

    if (exposureError) throw exposureError;

    return { counterparty: counterparty as Counterparty, exposure: exposure as Exposure };
  }

  // Upsert questionnaire data (update if exists, insert if not)
  static async upsertCounterpartyQuestionnaire(data: Omit<CounterpartyQuestionnaire, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<CounterpartyQuestionnaire> {
    if (USE_JWT_AUTH) {
      const { counterparty_id, ...body } = data;
      const row = await upsertCounterpartyQuestionnaireApi(counterparty_id, body);
      return apiToQuestionnaire(row);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    // First, try to find existing questionnaire for this counterparty
    const { data: existing, error: findError } = await supabase
      .from('counterparty_questionnaires')
      .select('*')
      .eq('user_id', user.id)
      .eq('counterparty_id', data.counterparty_id)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw findError;
    }

    if (existing) {
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('counterparty_questionnaires')
        .update({
          ...data,
          user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updated as CounterpartyQuestionnaire;
    } else {
      // Create new record
      const { data: created, error: createError } = await supabase
        .from('counterparty_questionnaires')
        .insert({
          ...data,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) throw createError;
      return created as CounterpartyQuestionnaire;
    }
  }

  // Upsert emission calculation (update if exists, insert if not)
  static async upsertEmissionCalculation(data: Omit<EmissionCalculation, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<EmissionCalculation> {
    if (USE_JWT_AUTH) {
      const calcKind =
        data.calculation_type === 'facilitated' ? 'facilitated' : 'finance';
      const existing = await listFinancedEmissions({
        counterparty_id: data.counterparty_id || undefined,
        calc_kind: calcKind,
      });
      const match = existing.find(
        (r) =>
          r.formula_id === data.formula_id &&
          (r.counterparty_id || null) === (data.counterparty_id || null)
      );
      if (match) {
        const updated = await patchFinancedEmission(match.id, {
          company_type: data.company_type,
          formula_id: data.formula_id,
          inputs: data.inputs,
          results: data.results,
          financed_emissions: data.financed_emissions,
          attribution_factor: data.attribution_factor,
          data_quality_score: data.data_quality_score,
          counterparty_id: data.counterparty_id,
          exposure_id: data.exposure_id,
          questionnaire_id: data.questionnaire_id,
          status: data.status || 'completed',
        });
        return financedToEmissionCalculation(updated);
      }
      return PortfolioClient.createEmissionCalculation(data);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    console.log('🔍 PortfolioClient - upsertEmissionCalculation called with:', {
      counterparty_id: data.counterparty_id,
      calculation_type: data.calculation_type,
      formula_id: data.formula_id,
      financed_emissions: data.financed_emissions,
      user_id: user.id
    });

    // First, try to find existing calculation with same counterparty_id, calculation_type, and formula_id
    const { data: existing, error: findError } = await supabase
      .from('emission_calculations')
      .select('*')
      .eq('user_id', user.id)
      .eq('counterparty_id', data.counterparty_id)
      .eq('calculation_type', data.calculation_type)
      .eq('formula_id', data.formula_id)
      .single();

    console.log('🔍 PortfolioClient - Existing calculation lookup:', {
      existing: existing,
      findError: findError?.code === 'PGRST116' ? 'Not found (OK)' : findError
    });

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw findError;
    }

    if (existing) {
      // Update existing record
      console.log('🔍 PortfolioClient - Updating existing calculation with id:', existing.id);
      const { data: updated, error: updateError } = await supabase
        .from('emission_calculations')
        .update({
          ...data,
          user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ PortfolioClient - Update error:', updateError);
        throw updateError;
      }
      console.log('✅ PortfolioClient - Successfully updated calculation:', updated);
      return updated as EmissionCalculation;
    } else {
      // Create new record
      console.log('🔍 PortfolioClient - Creating new calculation record');
      const { data: created, error: createError } = await supabase
        .from('emission_calculations')
        .insert({
          ...data,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ PortfolioClient - Insert error:', createError);
        throw createError;
      }
      console.log('✅ PortfolioClient - Successfully created calculation:', created);
      return created as EmissionCalculation;
    }
  }

  // Company Emissions Methods
  static async getCompanyEmissions(counterpartyId: string | null, isBankEmissions: boolean = false): Promise<CompanyEmissions | null> {
    if (USE_JWT_AUTH) {
      const rows = await listCompanyEmissions({
        counterparty_id: counterpartyId || undefined,
        status: 'active',
      });
      const match = rows.find(
        (r) =>
          Boolean(r.is_bank_emissions) === isBankEmissions &&
          (counterpartyId
            ? r.counterparty_id === counterpartyId
            : r.counterparty_id == null)
      );
      return (match as CompanyEmissions) || null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('company_emissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('counterparty_id', counterpartyId)
      .eq('is_bank_emissions', isBankEmissions)
      .eq('status', 'active')
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] as CompanyEmissions : null;
  }

  static async upsertCompanyEmissions(emissionsData: {
    counterparty_id?: string | null;
    is_bank_emissions?: boolean;
    scope1_emissions: number;
    scope2_emissions: number;
    scope3_emissions: number;
    calculation_source?: 'emission_calculator' | 'questionnaire' | 'manual';
    notes?: string;
  }): Promise<CompanyEmissions> {
    if (USE_JWT_AUTH) {
      const { counterparty_id, is_bank_emissions = false, ...data } = emissionsData;
      const total_emissions =
        data.scope1_emissions + data.scope2_emissions + data.scope3_emissions;
      const existing = await PortfolioClient.getCompanyEmissions(
        counterparty_id ?? null,
        is_bank_emissions
      );
      if (!existing) {
        throw new Error(
          'Creating company_emissions via API is not available yet (PATCH-only). Existing rows can be updated.'
        );
      }
      return (await patchCompanyEmissionApi(existing.id, {
        scope1_emissions: data.scope1_emissions,
        scope2_emissions: data.scope2_emissions,
        scope3_emissions: data.scope3_emissions,
        total_emissions,
        notes: data.notes ?? null,
        status: 'active',
      })) as CompanyEmissions;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { counterparty_id, is_bank_emissions = false, ...data } = emissionsData;

    // Calculate total emissions
    const total_emissions = data.scope1_emissions + data.scope2_emissions + data.scope3_emissions;

    // Use upsert to handle the unique constraint properly
    const { data: result, error } = await supabase
      .from('company_emissions')
      .upsert({
        ...data,
        total_emissions,
        counterparty_id,
        is_bank_emissions,
        user_id: user.id,
        status: 'active',
        calculation_date: new Date().toISOString()
      }, {
        onConflict: 'user_id,counterparty_id,is_bank_emissions'
      })
      .select()
      .single();

    if (error) throw error;
    return result as CompanyEmissions;
  }

  static async deleteCompanyEmissions(counterpartyId: string | null, isBankEmissions: boolean = false): Promise<void> {
    if (USE_JWT_AUTH) {
      const existing = await PortfolioClient.getCompanyEmissions(counterpartyId, isBankEmissions);
      if (existing) {
        await patchCompanyEmissionApi(existing.id, { status: 'archived' });
      }
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('company_emissions')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('counterparty_id', counterpartyId)
      .eq('is_bank_emissions', isBankEmissions)
      .eq('status', 'active');

    if (error) throw error;
  }

  // Portfolio totals
  static async getPortfolioTotals(): Promise<PortfolioTotals> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: totals, error } = await supabase
      .rpc('get_portfolio_totals', { p_user_id: user.id });

    if (error) throw error;
    return totals as PortfolioTotals;
  }

  // Loan type mappings for scenario building
  static async getLoanTypeMappings(): Promise<Map<string, string>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: mappings, error } = await supabase
      .from('emission_calculations')
      .select('counterparty_id, formula_id')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (error) throw error;

    const map = new Map<string, string>();
    mappings?.forEach(mapping => {
      if (mapping.counterparty_id && mapping.formula_id) {
        map.set(mapping.counterparty_id, mapping.formula_id);
      }
    });

    return map;
  }

  // Get outstanding amount from finance emission calculations for a counterparty
  static async getOutstandingAmountForCounterparty(counterpartyId: string): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: outstandingAmount, error } = await supabase
      .rpc('get_outstanding_amount_for_counterparty_v2', {
        p_counterparty_id: counterpartyId,
        p_user_id: user.id
      });

    if (error) throw error;
    return outstandingAmount || 0;
  }

  // Get outstanding amounts for multiple counterparties
  static async getOutstandingAmountsForCounterparties(counterpartyIds: string[]): Promise<Map<string, number>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const amounts = new Map<string, number>();
    
    // Get all outstanding amounts from exposures table (this is where we store loan amounts)
    const { data: results, error } = await supabase
      .from('exposures')
      .select('counterparty_id, amount_pkr')
      .eq('user_id', user.id)
      .in('counterparty_id', counterpartyIds)
      .not('amount_pkr', 'is', null)
      .gt('amount_pkr', 0);

    if (error) throw error;

    // Sum up outstanding amounts by counterparty
    results?.forEach(result => {
      if (result.counterparty_id) {
        const current = amounts.get(result.counterparty_id) || 0;
        amounts.set(result.counterparty_id, current + (result.amount_pkr || 0));
      }
    });

    return amounts;
  }

  // Save finance emission calculation to the finance_emission_calculations table
  static async saveFinanceEmissionCalculation(data: {
    counterparty_id: string;
    outstanding_amount: number;
    calculation_type: 'finance_emission' | 'facilitated_emission';
    formula_id: string;
    formula_name: string;
    company_type: 'listed' | 'unlisted';
    data_quality_score?: number | null;
    [key: string]: unknown;
  }): Promise<void> {
    const calcKind =
      data.calculation_type === 'facilitated_emission' ? 'facilitated' : 'finance';
    const financedEmissions = Number(data.financed_emissions ?? 0) || 0;
    const attributionFactor =
      data.attribution_factor == null ? null : Number(data.attribution_factor);
    const dataQualityScore =
      data.data_quality_score == null ? null : Number(data.data_quality_score);

    if (USE_JWT_AUTH) {
      let financedEmissionsFinal = financedEmissions;
      let attributionFactorFinal = attributionFactor;
      let dataQualityScoreFinal = dataQualityScore;

      const pcafFormulaId =
        typeof data.pcaf_formula_id === 'string' ? data.pcaf_formula_id : null;
      const pcafInputs =
        data.pcaf_inputs && typeof data.pcaf_inputs === 'object'
          ? (data.pcaf_inputs as Record<string, unknown>)
          : null;
      const companyTypeForCalc =
        typeof data.company_type === 'string' ? data.company_type : 'unlisted';

      if (pcafFormulaId && pcafInputs) {
        const confirmed = await resolveFinancedCalculation({
          calc_kind: calcKind,
          formula_id: pcafFormulaId,
          company_type: companyTypeForCalc,
          inputs: pcafInputs,
          counterparty_id: data.counterparty_id,
          persist: false,
          local: {
            attributionFactor: attributionFactor ?? 0,
            financedEmissions,
            dataQualityScore: dataQualityScore ?? undefined,
          },
        });
        financedEmissionsFinal = confirmed.financedEmissions;
        attributionFactorFinal = confirmed.attributionFactor;
        dataQualityScoreFinal =
          confirmed.dataQualityScore == null
            ? null
            : confirmed.dataQualityScore;
      }

      const existing = await listFinancedEmissions({
        counterparty_id: data.counterparty_id,
        calc_kind: calcKind,
      });
      const match = existing.find(
        (r) =>
          r.formula_id === data.formula_id &&
          (r.counterparty_id || null) === data.counterparty_id
      );
      const payload = {
        calc_kind: calcKind,
        company_type: data.company_type,
        formula_id: data.formula_id,
        formula_name: data.formula_name,
        inputs: {
          outstanding_amount: data.outstanding_amount,
          total_assets: data.total_assets,
          share_price: data.share_price,
          outstanding_shares: data.outstanding_shares,
          total_debt: data.total_debt,
          total_equity: data.total_equity,
          minority_interest: data.minority_interest,
          preferred_stock: data.preferred_stock,
          evic: data.evic,
          total_equity_plus_debt: data.total_equity_plus_debt,
          ...(pcafInputs || {}),
          pcaf_formula_id: pcafFormulaId,
        },
        results: {
          financed_emissions: financedEmissionsFinal,
          attribution_factor: attributionFactorFinal,
          data_quality_score: dataQualityScoreFinal,
        },
        financed_emissions: financedEmissionsFinal,
        attribution_factor: attributionFactorFinal,
        data_quality_score: dataQualityScoreFinal,
        counterparty_id: data.counterparty_id,
        status: (data.status as string) || 'completed',
      };
      if (match) {
        await patchFinancedEmission(match.id, payload);
      } else {
        await createFinancedEmission(payload);
      }
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('💾 PortfolioClient - saveFinanceEmissionCalculation called:', {
      user_id: user.id,
      counterparty_id: data.counterparty_id,
      calculation_type: data.calculation_type,
      financed_emissions: data.financed_emissions
    });

    // First, try to find existing calculation with same counterparty_id, calculation_type, and formula_id
    const { data: existing, error: findError } = await supabase
      .from('finance_emission_calculations')
      .select('*')
      .eq('user_id', user.id)
      .eq('counterparty_id', data.counterparty_id)
      .eq('calculation_type', data.calculation_type)
      .eq('formula_id', data.formula_id)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ PortfolioClient - Error finding existing record:', findError);
      throw findError;
    }

    if (existing) {
      console.log('📝 PortfolioClient - Updating existing record:', existing.id);
      // Update existing record
      const { data: updated, error: updateError } = await supabase
        .from('finance_emission_calculations')
        .update({
          ...data,
          user_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ PortfolioClient - Error updating record:', updateError);
        throw updateError;
      }
      console.log('✅ PortfolioClient - Record updated successfully:', updated);
    } else {
      console.log('➕ PortfolioClient - Creating new record');
      // Create new record
      const { data: created, error: createError } = await supabase
        .from('finance_emission_calculations')
        .insert({
          ...data,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ PortfolioClient - Error creating record:', createError);
        console.error('   Data being inserted:', { ...data, user_id: user.id });
        throw createError;
      }
      console.log('✅ PortfolioClient - Record created successfully:', created);
    }
  }

  /** Delete all finance/facilitated calcs for a counterparty+mode (fresh start). */
  static async deleteAllEmissionCalculationsForMode(
    counterpartyId: string,
    calculationMode: 'finance' | 'facilitated'
  ): Promise<void> {
    if (USE_JWT_AUTH) {
      const rows = await listFinancedEmissions({
        counterparty_id: counterpartyId,
        calc_kind: calculationMode,
      });
      await Promise.all(rows.map((r) => deleteFinancedEmission(r.id)));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const financeType =
      calculationMode === 'finance' ? 'finance_emission' : 'facilitated_emission';

    const { error: financeError } = await supabase
      .from('finance_emission_calculations')
      .delete()
      .eq('user_id', user.id)
      .eq('counterparty_id', counterpartyId)
      .eq('calculation_type', financeType);
    if (financeError) {
      console.warn('Error deleting all finance emission calculations:', financeError);
    }

    const { error: emissionError } = await supabase
      .from('emission_calculations')
      .delete()
      .eq('user_id', user.id)
      .eq('counterparty_id', counterpartyId)
      .eq('calculation_type', calculationMode);
    if (emissionError) {
      console.warn('Error deleting all emission calculations:', emissionError);
    }
  }

  /**
   * Remove stale per-formula rows that are no longer in the current results.
   * Never deletes formula_id === 'aggregate'.
   */
  static async cleanupStaleEmissionCalculations(
    counterpartyId: string,
    calculationMode: 'finance' | 'facilitated',
    keepFormulaIds: string[]
  ): Promise<void> {
    const keep = new Set(keepFormulaIds.filter(Boolean));
    keep.add('aggregate');

    if (USE_JWT_AUTH) {
      const rows = await listFinancedEmissions({
        counterparty_id: counterpartyId,
        calc_kind: calculationMode,
      });
      const stale = rows.filter((r) => r.formula_id && !keep.has(r.formula_id));
      await Promise.all(stale.map((r) => deleteFinancedEmission(r.id)));
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const financeType =
      calculationMode === 'finance' ? 'finance_emission' : 'facilitated_emission';

    const { data: financeRows } = await supabase
      .from('finance_emission_calculations')
      .select('id, formula_id')
      .eq('user_id', user.id)
      .eq('counterparty_id', counterpartyId)
      .eq('calculation_type', financeType);

    const financeStaleIds = (financeRows || [])
      .filter((r: { formula_id?: string }) => r.formula_id && !keep.has(r.formula_id))
      .map((r: { id: string }) => r.id);
    if (financeStaleIds.length > 0) {
      const { error } = await supabase
        .from('finance_emission_calculations')
        .delete()
        .in('id', financeStaleIds);
      if (error) console.warn('Error cleaning up old finance emission calculations:', error);
    }

    const { data: emissionRows } = await supabase
      .from('emission_calculations')
      .select('id, formula_id')
      .eq('user_id', user.id)
      .eq('counterparty_id', counterpartyId)
      .eq('calculation_type', calculationMode);

    const emissionStaleIds = (emissionRows || [])
      .filter((r: { formula_id?: string }) => r.formula_id && !keep.has(r.formula_id))
      .map((r: { id: string }) => r.id);
    if (emissionStaleIds.length > 0) {
      const { error } = await supabase
        .from('emission_calculations')
        .delete()
        .in('id', emissionStaleIds);
      if (error) console.warn('Error cleaning up old emission calculations:', error);
    }
  }
}

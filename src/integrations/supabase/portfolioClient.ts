import { supabase } from './client';

// Types matching our database schema
export interface Counterparty {
  id: string;
  user_id: string;
  counterparty_code: string;
  name: string;
  sector: string;
  geography: string;
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
  inputs: any;
  results: any;
  financed_emissions: number;
  attribution_factor: number | null;
  evic: number | null;
  total_equity_plus_debt: number | null;
  status: 'draft' | 'completed' | 'failed';
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

  // Exposures
  static async createExposure(exposureData: Omit<Exposure, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
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

  // Questionnaires
  static async createQuestionnaire(questionnaireData: Omit<CounterpartyQuestionnaire, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    let query = supabase
      .from('emission_calculations')
      .select('*')
      .eq('user_id', user.id);

    if (counterpartyId) {
      query = query.eq('counterparty_id', counterpartyId);
    }

    const { data: calculationsData, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return calculationsData as EmissionCalculation[];
  }

  // Get loan type mappings for portfolio entries
  static async getLoanTypeMappings(): Promise<Map<string, string>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: calculationsData, error } = await supabase
      .from('emission_calculations')
      .select('counterparty_id, formula_id, results')
      .eq('user_id', user.id)
      .eq('calculation_type', 'finance'); // Only finance calculations have loan types

    if (error) throw error;

    const loanTypeMap = new Map<string, string>();
    
    calculationsData?.forEach(calc => {
      if (calc.counterparty_id && calc.formula_id) {
        // Try to get loan type from results first, fallback to formula_id
        const loanType = calc.results?.loanType || calc.formula_id;
        loanTypeMap.set(calc.counterparty_id, loanType);
      }
    });

    return loanTypeMap;
  }

  // Portfolio Totals
  static async getPortfolioTotals(): Promise<PortfolioTotals | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: totalsData, error } = await supabase
      .from('v_user_portfolio_totals')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return totalsData as PortfolioTotals;
  }

  // Bulk operations for BankPortfolio
  static async createCounterpartyWithExposure(
    counterpartyData: Omit<Counterparty, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    exposureData: Omit<Exposure, 'id' | 'user_id' | 'counterparty_id' | 'created_at' | 'updated_at'>
  ) {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    // First, try to find existing calculation with same counterparty_id, calculation_type, and formula_id
    const { data: existing, error: findError } = await supabase
      .from('emission_calculations')
      .select('*')
      .eq('user_id', user.id)
      .eq('counterparty_id', data.counterparty_id)
      .eq('calculation_type', data.calculation_type)
      .eq('formula_id', data.formula_id)
      .single();

    if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw findError;
    }

    if (existing) {
      // Update existing record
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

      if (updateError) throw updateError;
      return updated as EmissionCalculation;
    } else {
      // Create new record
      const { data: created, error: createError } = await supabase
        .from('emission_calculations')
        .insert({
          ...data,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) throw createError;
      return created as EmissionCalculation;
    }
  }
}

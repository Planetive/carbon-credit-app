import { supabase } from './client';

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

  static async updateExposureAmountForCounterparty(counterpartyId: string, amountPkr: number) {
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
        rows = financeRows.map((r: any) => ({
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
        created_at: (c as any).created_at,
        updated_at: (c as any).updated_at
      }))
    });

    return rows;
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
    [key: string]: any;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

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
      throw findError;
    }

    if (existing) {
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

      if (updateError) throw updateError;
    } else {
      // Create new record
      const { data: created, error: createError } = await supabase
        .from('finance_emission_calculations')
        .insert({
          ...data,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) throw createError;
    }
  }
}

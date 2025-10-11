import { FormulaConfig, CalculationResult, CompanyData, FormulaValidationResult } from '../types/formula';
import { ALL_FORMULAS, getFormulaById } from '../config/corporateBondAndBusinessLoanFormulaConfigs';
import { PROJECT_FINANCE_FORMULAS } from '../config/projectFinanceFormulaConfigs';
import { MORTGAGE_FORMULAS } from '../config/mortgageFormulaConfigs';
import { COMMERCIAL_REAL_ESTATE_FORMULAS } from '../config/commercialRealEstateFormulaConfigs';
import { SOVEREIGN_DEBT_FORMULAS } from '../config/sovereignDebtFormulaConfigs';
import { MOTOR_VEHICLE_LOAN_FORMULAS } from '../config/motorVehicleLoanFormulaConfigs';
import { ALL_FACILITATED_FORMULAS } from '../config/facilitatedEmissionFormulaConfigs';

/**
 * Main calculation engine for PCAF formulas
 * Handles validation, calculation, and result processing
 */
export class CalculationEngine {
  private formulas: FormulaConfig[] = [
    ...ALL_FORMULAS, 
    ...PROJECT_FINANCE_FORMULAS, 
    ...MORTGAGE_FORMULAS,
    ...COMMERCIAL_REAL_ESTATE_FORMULAS,
    ...SOVEREIGN_DEBT_FORMULAS,
    ...MOTOR_VEHICLE_LOAN_FORMULAS,
    ...ALL_FACILITATED_FORMULAS
  ];

  /**
   * Get all available formulas
   */
  getAllFormulas(): FormulaConfig[] {
    return this.formulas;
  }

  /**
   * Get formulas by category
   */
  getFormulasByCategory(category: 'listed_equity' | 'facilitated_emission'): FormulaConfig[] {
    return this.formulas.filter(formula => formula.category === category);
  }

  /**
   * Get formulas by data quality score
   */
  getFormulasByScore(score: number): FormulaConfig[] {
    return this.formulas.filter(formula => formula.dataQualityScore === score);
  }

  /**
   * Get formula by ID
   */
  getFormulaById(id: string): FormulaConfig | undefined {
    return this.formulas.find(formula => formula.id === id);
  }

  /**
   * Get applicable formulas for a company type
   */
  getApplicableFormulas(companyType: 'listed' | 'private'): FormulaConfig[] {
    return this.formulas.filter(formula => {
      // For now, all formulas are applicable to both types
      // In the future, we can add specific company type restrictions
      return true;
    });
  }

  /**
   * Validate inputs for a specific formula
   */
  validateInputs(formulaId: string, inputs: Record<string, any>): FormulaValidationResult {
    const formula = this.getFormulaById(formulaId);
    
    // DEBUG: Log validation details
    console.log('🔍 CALCULATION ENGINE DEBUG - Formula ID:', formulaId);
    console.log('🔍 CALCULATION ENGINE DEBUG - Formula:', formula?.name);
    console.log('🔍 CALCULATION ENGINE DEBUG - Inputs received:', inputs);
    console.log('🔍 CALCULATION ENGINE DEBUG - Required inputs:', formula?.inputs.filter(i => i.required).map(i => i.name));
    
    if (!formula) {
      return {
        isValid: false,
        errors: [`Formula '${formulaId}' not found`],
        warnings: [],
        missingInputs: []
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const missingInputs: string[] = [];

    // Check required inputs
    formula.inputs.forEach(input => {
      if (input.required) {
        console.log(`🔍 CALCULATION ENGINE DEBUG - Checking required input: ${input.name} = ${inputs[input.name]}`);
        if (!(input.name in inputs) || inputs[input.name] === null || inputs[input.name] === undefined) {
          console.log(`❌ CALCULATION ENGINE DEBUG - Missing required input: ${input.name}`);
          missingInputs.push(input.name);
          errors.push(`${input.label} is required`);
        } else if (input.type === 'number' && (isNaN(inputs[input.name]) || inputs[input.name] < 0)) {
          console.log(`❌ CALCULATION ENGINE DEBUG - Invalid number input: ${input.name} = ${inputs[input.name]}`);
          errors.push(`${input.label} must be a non-negative number`);
        } else {
          console.log(`✅ CALCULATION ENGINE DEBUG - Valid required input: ${input.name} = ${inputs[input.name]}`);
        }
      }
    });

    // Check input validation rules
    formula.inputs.forEach(input => {
      if (input.name in inputs && input.validation) {
        const value = inputs[input.name];
        
        if (input.validation.min !== undefined && value < input.validation.min) {
          errors.push(`${input.label} must be at least ${input.validation.min}`);
        }
        
        if (input.validation.max !== undefined && value > input.validation.max) {
          errors.push(`${input.label} must be at most ${input.validation.max}`);
        }
        
        if (input.validation.pattern && typeof value === 'string') {
          const regex = new RegExp(input.validation.pattern);
          if (!regex.test(value)) {
            errors.push(`${input.label} format is invalid`);
          }
        }
      }
    });

    // Add formula-specific validations
    this.addFormulaSpecificValidations(formula, inputs, errors, warnings);

    // DEBUG: Log final validation result
    console.log('🔍 CALCULATION ENGINE DEBUG - Final validation result:');
    console.log('🔍 CALCULATION ENGINE DEBUG - Is Valid:', errors.length === 0);
    console.log('🔍 CALCULATION ENGINE DEBUG - Errors:', errors);
    console.log('🔍 CALCULATION ENGINE DEBUG - Missing Inputs:', missingInputs);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingInputs
    };
  }

  /**
   * Calculate financed emissions using a specific formula
   */
  calculate(
    formulaId: string, 
    inputs: Record<string, any>, 
    companyType: 'listed' | 'private'
  ): CalculationResult {
    const formula = this.getFormulaById(formulaId);
    
    if (!formula) {
      throw new Error(`Formula '${formulaId}' not found`);
    }

    // Validate inputs first
    const validation = this.validateInputs(formulaId, inputs);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Execute calculation
    const result = formula.calculate(inputs, companyType);
    
    // Add validation warnings to result metadata
    if (validation.warnings.length > 0) {
      result.metadata = {
        ...result.metadata,
        validationWarnings: validation.warnings
      };
    }

    return result;
  }

  /**
   * Calculate multiple formulas and return results
   */
  calculateMultiple(
    formulaIds: string[],
    inputs: Record<string, any>,
    companyType: 'listed' | 'private'
  ): Map<string, CalculationResult> {
    const results = new Map<string, CalculationResult>();
    
    formulaIds.forEach(formulaId => {
      try {
        const result = this.calculate(formulaId, inputs, companyType);
        results.set(formulaId, result);
      } catch (error) {
        console.error(`Failed to calculate ${formulaId}:`, error);
        // Continue with other calculations
      }
    });
    
    return results;
  }

  /**
   * Get the best available formula based on data quality and available inputs
   */
  getBestFormula(
    availableInputs: string[],
    companyType: 'listed' | 'private',
    category: 'listed_equity' | 'facilitated_emission'
  ): FormulaConfig | null {
    const applicableFormulas = this.getFormulasByCategory(category)
      .filter(formula => {
        // Check if all required inputs are available
        const requiredInputs = formula.inputs
          .filter(input => input.required)
          .map(input => input.name);
        
        return requiredInputs.every(input => availableInputs.includes(input));
      })
      .sort((a, b) => a.dataQualityScore - b.dataQualityScore); // Lower score is better

    return applicableFormulas[0] || null;
  }

  /**
   * Get calculation summary for a result
   */
  getCalculationSummary(result: CalculationResult): {
    dataQuality: string;
    methodology: string;
    keyMetrics: Record<string, number>;
    recommendations: string[];
  } {
    const dataQualityLabels = {
      1: 'Excellent (Verified Data)',
      2: 'Good (Unverified Data)',
      3: 'Fair (Activity Data)',
      4: 'Poor (Sector Data)',
      5: 'Very Poor (Estimated Data)'
    };

    const recommendations: string[] = [];
    
    if (result.dataQualityScore > 2) {
      recommendations.push('Consider collecting more detailed company-specific data to improve accuracy');
    }
    
    if (result.dataQualityScore > 3) {
      recommendations.push('This calculation has significant uncertainty - use with caution');
    }
    
    if (result.attributionFactor > 0.5) {
      recommendations.push('High attribution factor - this represents a significant portion of the company');
    }

    return {
      dataQuality: dataQualityLabels[result.dataQualityScore as keyof typeof dataQualityLabels] || 'Unknown',
      methodology: result.methodology,
      keyMetrics: {
        attributionFactor: result.attributionFactor,
        emissionFactor: result.emissionFactor,
        financedEmissions: result.financedEmissions
      },
      recommendations
    };
  }

  /**
   * Add formula-specific validations
   */
  private addFormulaSpecificValidations(
    formula: FormulaConfig,
    inputs: Record<string, any>,
    errors: string[],
    warnings: string[]
  ): void {
    // Option 1a/1b specific validations
    if (formula.optionCode === '1a' || formula.optionCode === '1b') {
      if (inputs.outstanding_amount && inputs.evic && inputs.outstanding_amount > inputs.evic) {
        warnings.push('Outstanding amount exceeds EVIC - please verify data');
      }
    }

    // Option 2a specific validations
    if (formula.optionCode === '2a') {
      if (inputs.energy_consumption && inputs.emission_factor) {
        const calculatedEmissions = inputs.energy_consumption * inputs.emission_factor;
        if (calculatedEmissions > 1000000) { // 1 million tCO2e
          warnings.push('Very high calculated emissions - please verify emission factors');
        }
      }
    }


    // General validations
    if (inputs.outstanding_amount && inputs.outstanding_amount < 0) {
      errors.push('Outstanding amount must be non-negative');
    }
  }

  /**
   * Export calculation results to different formats
   */
  exportResults(
    results: Map<string, CalculationResult>,
    format: 'json' | 'csv' | 'summary'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(Array.from(results.entries()), null, 2);
      
      case 'csv':
        const csvHeaders = 'Formula,Data Quality Score,Attribution Factor,Emission Factor,Financed Emissions,Methodology';
        const csvRows = Array.from(results.entries()).map(([formulaId, result]) => 
          `${formulaId},${result.dataQualityScore},${result.attributionFactor},${result.emissionFactor},${result.financedEmissions},"${result.methodology}"`
        );
        return [csvHeaders, ...csvRows].join('\n');
      
      case 'summary':
        const summary = Array.from(results.entries()).map(([formulaId, result]) => {
          const summaryData = this.getCalculationSummary(result);
          return `${formulaId}: ${summaryData.dataQuality} - ${result.financedEmissions.toFixed(2)} tCO2e`;
        });
        return summary.join('\n');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

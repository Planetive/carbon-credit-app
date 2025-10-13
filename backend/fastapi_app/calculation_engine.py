"""
Calculation Engine - Migrated from TypeScript
Main calculation engine for PCAF formulas
Handles validation, calculation, and result processing

Migrated from: src/pages/finance_facilitated/engines/CalculationEngine.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from typing import List, Dict, Any, Optional, Tuple
import logging
from .finance_models import (
    FormulaConfig, CalculationResult, FormulaValidationResult, 
    CompanyType, FormulaCategory, CalculationStep
)
from .shared_formula_utils import (
    calculate_attribution_factor_listed, calculate_attribution_factor_unlisted,
    validate_financial_inputs, get_denominator_for_company_type,
    create_emission_calculation_steps, create_activity_calculation_steps
)
from .unit_conversions import smart_convert_unit
from .formula_configs import BASIC_FORMULAS
from .corporate_bond_business_loan_configs import CORPORATE_BOND_BUSINESS_LOAN_FORMULAS
from .commercial_real_estate_configs import COMMERCIAL_REAL_ESTATE_FORMULAS
from .mortgage_configs import MORTGAGE_FORMULAS
from .motor_vehicle_loan_configs import MOTOR_VEHICLE_LOAN_FORMULAS
from .project_finance_configs import PROJECT_FINANCE_FORMULAS
from .sovereign_debt_configs import SOVEREIGN_DEBT_FORMULAS
from .facilitated_emission_configs import FACILITATED_EMISSION_FORMULAS

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class CalculationEngine:
    """
    Main calculation engine for PCAF formulas
    Handles validation, calculation, and result processing
    """
    
    def __init__(self):
        """Initialize the calculation engine with all formulas"""
        # Load all formula configurations
        self.formulas: List[FormulaConfig] = (
            BASIC_FORMULAS +
            CORPORATE_BOND_BUSINESS_LOAN_FORMULAS +
            COMMERCIAL_REAL_ESTATE_FORMULAS +
            MORTGAGE_FORMULAS +
            MOTOR_VEHICLE_LOAN_FORMULAS +
            PROJECT_FINANCE_FORMULAS +
            SOVEREIGN_DEBT_FORMULAS +
            FACILITATED_EMISSION_FORMULAS
        )
        logger.info(f"Loaded {len(self.formulas)} formula configurations")
    
    def get_all_formulas(self) -> List[FormulaConfig]:
        """Get all available formulas"""
        return self.formulas
    
    def get_formulas_by_category(self, category: FormulaCategory) -> List[FormulaConfig]:
        """Get formulas by category"""
        return [formula for formula in self.formulas if formula.category == category]
    
    def get_formulas_by_score(self, score: int) -> List[FormulaConfig]:
        """Get formulas by data quality score"""
        return [formula for formula in self.formulas if formula.data_quality_score == score]
    
    def get_formula_by_id(self, formula_id: str) -> Optional[FormulaConfig]:
        """Get formula by ID"""
        return next((formula for formula in self.formulas if formula.id == formula_id), None)
    
    def get_applicable_formulas(self, company_type: CompanyType) -> List[FormulaConfig]:
        """Get applicable formulas for a company type"""
        # For now, all formulas are applicable to both types
        # In the future, we can add specific company type restrictions
        return self.formulas
    
    def validate_inputs(self, formula_id: str, inputs: Dict[str, Any]) -> FormulaValidationResult:
        """
        Validate inputs for a specific formula
        Migrated from: validateInputs
        """
        formula = self.get_formula_by_id(formula_id)
        
        # DEBUG: Log validation details
        logger.info(f'🔍 CALCULATION ENGINE DEBUG - Formula ID: {formula_id}')
        logger.info(f'🔍 CALCULATION ENGINE DEBUG - Formula: {formula.name if formula else "Not found"}')
        logger.info(f'🔍 CALCULATION ENGINE DEBUG - Inputs received: {inputs}')
        if formula:
            required_inputs = [input_field.name for input_field in formula.inputs if input_field.required]
            logger.info(f'🔍 CALCULATION ENGINE DEBUG - Required inputs: {required_inputs}')
        
        if not formula:
            return FormulaValidationResult(
                is_valid=False,
                errors=[f"Formula '{formula_id}' not found"],
                warnings=[],
                missing_inputs=[]
            )
        
        errors: List[str] = []
        warnings: List[str] = []
        missing_inputs: List[str] = []
        
        # Check required inputs
        for input_field in formula.inputs:
            if input_field.required:
                logger.info(f'🔍 CALCULATION ENGINE DEBUG - Checking required input: {input_field.name} = {inputs.get(input_field.name)}')
                if input_field.name not in inputs or inputs[input_field.name] is None:
                    logger.info(f'❌ CALCULATION ENGINE DEBUG - Missing required input: {input_field.name}')
                    missing_inputs.append(input_field.name)
                    errors.append(f"{input_field.label} is required")
                elif input_field.type == 'number' and (not isinstance(inputs[input_field.name], (int, float)) or inputs[input_field.name] < 0):
                    logger.info(f'❌ CALCULATION ENGINE DEBUG - Invalid number input: {input_field.name} = {inputs[input_field.name]}')
                    errors.append(f"{input_field.label} must be a non-negative number")
                else:
                    logger.info(f'✅ CALCULATION ENGINE DEBUG - Valid required input: {input_field.name} = {inputs[input_field.name]}')
        
        # Check input validation rules
        for input_field in formula.inputs:
            if input_field.name in inputs and input_field.validation:
                value = inputs[input_field.name]
                
                if 'min' in input_field.validation and value < input_field.validation['min']:
                    errors.append(f"{input_field.label} must be at least {input_field.validation['min']}")
                
                if 'max' in input_field.validation and value > input_field.validation['max']:
                    errors.append(f"{input_field.label} must be at most {input_field.validation['max']}")
                
                if 'pattern' in input_field.validation and isinstance(value, str):
                    import re
                    if not re.match(input_field.validation['pattern'], value):
                        errors.append(f"{input_field.label} format is invalid")
        
        # Add formula-specific validations
        self._add_formula_specific_validations(formula, inputs, errors, warnings)
        
        # DEBUG: Log final validation result
        logger.info('🔍 CALCULATION ENGINE DEBUG - Final validation result:')
        logger.info(f'🔍 CALCULATION ENGINE DEBUG - Is Valid: {len(errors) == 0}')
        logger.info(f'🔍 CALCULATION ENGINE DEBUG - Errors: {errors}')
        logger.info(f'🔍 CALCULATION ENGINE DEBUG - Missing Inputs: {missing_inputs}')
        
        return FormulaValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            missing_inputs=missing_inputs
        )
    
    def calculate(
        self,
        formula_id: str,
        inputs: Dict[str, Any],
        company_type: CompanyType
    ) -> CalculationResult:
        """
        Calculate financed emissions using a specific formula
        Migrated from: calculate
        """
        formula = self.get_formula_by_id(formula_id)
        
        if not formula:
            raise ValueError(f"Formula '{formula_id}' not found")
        
        # Validate inputs first
        validation = self.validate_inputs(formula_id, inputs)
        if not validation.is_valid:
            raise ValueError(f"Validation failed: {', '.join(validation.errors)}")
        
        # Execute calculation based on formula type
        result = self._execute_calculation(formula, inputs, company_type)
        
        # Add validation warnings to result metadata
        if validation.warnings:
            if result.metadata is None:
                result.metadata = {}
            result.metadata['validationWarnings'] = validation.warnings
        
        return result
    
    def calculate_multiple(
        self,
        formula_ids: List[str],
        inputs: Dict[str, Any],
        company_type: CompanyType
    ) -> Dict[str, CalculationResult]:
        """
        Calculate multiple formulas and return results
        Migrated from: calculateMultiple
        """
        results = {}
        
        for formula_id in formula_ids:
            try:
                result = self.calculate(formula_id, inputs, company_type)
                results[formula_id] = result
            except Exception as error:
                logger.error(f"Failed to calculate {formula_id}: {error}")
                # Continue with other calculations
        
        return results
    
    def get_best_formula(
        self,
        available_inputs: List[str],
        company_type: CompanyType,
        category: FormulaCategory
    ) -> Optional[FormulaConfig]:
        """
        Get the best available formula based on data quality and available inputs
        Migrated from: getBestFormula
        """
        applicable_formulas = [
            formula for formula in self.get_formulas_by_category(category)
            if self._has_required_inputs(formula, available_inputs)
        ]
        
        # Sort by data quality score (lower is better)
        applicable_formulas.sort(key=lambda f: f.data_quality_score)
        
        return applicable_formulas[0] if applicable_formulas else None
    
    def get_calculation_summary(self, result: CalculationResult) -> Dict[str, Any]:
        """
        Get calculation summary for a result
        Migrated from: getCalculationSummary
        """
        data_quality_labels = {
            1: 'Excellent (Verified Data)',
            2: 'Good (Unverified Data)',
            3: 'Fair (Activity Data)',
            4: 'Poor (Sector Data)',
            5: 'Very Poor (Estimated Data)'
        }
        
        recommendations = []
        
        if result.data_quality_score > 2:
            recommendations.append('Consider collecting more detailed company-specific data to improve accuracy')
        
        if result.data_quality_score > 3:
            recommendations.append('This calculation has significant uncertainty - use with caution')
        
        if result.attribution_factor > 0.5:
            recommendations.append('High attribution factor - this represents a significant portion of the company')
        
        return {
            'data_quality': data_quality_labels.get(result.data_quality_score, 'Unknown'),
            'methodology': result.methodology,
            'key_metrics': {
                'attribution_factor': result.attribution_factor,
                'emission_factor': result.emission_factor,
                'financed_emissions': result.financed_emissions
            },
            'recommendations': recommendations
        }
    
    def export_results(
        self,
        results: Dict[str, CalculationResult],
        format_type: str
    ) -> str:
        """
        Export calculation results to different formats
        Migrated from: exportResults
        """
        if format_type == 'json':
            import json
            return json.dumps(list(results.items()), indent=2)
        
        elif format_type == 'csv':
            csv_headers = 'Formula,Data Quality Score,Attribution Factor,Emission Factor,Financed Emissions,Methodology'
            csv_rows = [
                f"{formula_id},{result.data_quality_score},{result.attribution_factor},{result.emission_factor},{result.financed_emissions},\"{result.methodology}\""
                for formula_id, result in results.items()
            ]
            return '\n'.join([csv_headers] + csv_rows)
        
        elif format_type == 'summary':
            summary = [
                f"{formula_id}: {self.get_calculation_summary(result)['data_quality']} - {result.financed_emissions:.2f} tCO2e"
                for formula_id, result in results.items()
            ]
            return '\n'.join(summary)
        
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
    
    # ============================================================================
    # PRIVATE HELPER METHODS
    # ============================================================================
    
    def _add_formula_specific_validations(
        self,
        formula: FormulaConfig,
        inputs: Dict[str, Any],
        errors: List[str],
        warnings: List[str]
    ) -> None:
        """
        Add formula-specific validations
        Migrated from: addFormulaSpecificValidations
        """
        # Option 1a/1b specific validations
        if formula.option_code in ['1a', '1b']:
            outstanding_amount = inputs.get('outstanding_amount', 0)
            evic = inputs.get('evic', 0)
            if outstanding_amount and evic and outstanding_amount > evic:
                warnings.append('Outstanding amount exceeds EVIC - please verify data')
        
        # Option 2a specific validations
        if formula.option_code == '2a':
            energy_consumption = inputs.get('energy_consumption', 0)
            emission_factor = inputs.get('emission_factor', 0)
            if energy_consumption and emission_factor:
                calculated_emissions = energy_consumption * emission_factor
                if calculated_emissions > 1000000:  # 1 million tCO2e
                    warnings.append('Very high calculated emissions - please verify emission factors')
        
        # General validations
        outstanding_amount = inputs.get('outstanding_amount', 0)
        if outstanding_amount and outstanding_amount < 0:
            errors.append('Outstanding amount must be non-negative')
    
    def _execute_calculation(
        self,
        formula: FormulaConfig,
        inputs: Dict[str, Any],
        company_type: CompanyType
    ) -> CalculationResult:
        """
        Execute the actual calculation based on formula type
        """
        # This is where the specific formula calculations would be implemented
        # For now, we'll implement a basic structure that can be extended
        
        # Get the denominator based on company type
        denominator = get_denominator_for_company_type(inputs, company_type.value)
        outstanding_amount = inputs.get('outstanding_amount', 0)
        
        # Calculate attribution factor based on formula type
        if formula.category.value == 'facilitated_emission':
            # For facilitated emissions, use facilitated_amount
            facilitated_amount = inputs.get('facilitated_amount', 0)
            if company_type == CompanyType.LISTED:
                attribution_factor = calculate_attribution_factor_listed(facilitated_amount, denominator)
            else:
                attribution_factor = calculate_attribution_factor_unlisted(facilitated_amount, denominator)
        else:
            # For finance emissions, use outstanding_amount
            if company_type == CompanyType.LISTED:
                attribution_factor = calculate_attribution_factor_listed(outstanding_amount, denominator)
            else:
                attribution_factor = calculate_attribution_factor_unlisted(outstanding_amount, denominator)
        
        # Calculate financed emissions based on formula type
        financed_emissions, emission_factor, calculation_steps = self._calculate_emissions(
            formula, inputs, outstanding_amount, denominator, company_type
        )
        
        return CalculationResult(
            attribution_factor=attribution_factor,
            emission_factor=emission_factor,
            financed_emissions=financed_emissions,
            data_quality_score=formula.data_quality_score,
            methodology=formula.description,
            calculation_steps=calculation_steps,
            metadata={
                'formula_id': formula.id,
                'formula_name': formula.name,
                'company_type': company_type.value,
                'option_code': formula.option_code
            }
        )
    
    def _calculate_emissions(
        self,
        formula: FormulaConfig,
        inputs: Dict[str, Any],
        outstanding_amount: float,
        denominator: float,
        company_type: CompanyType
    ) -> Tuple[float, float, List[CalculationStep]]:
        """
        Calculate emissions based on formula type
        """
        # Check if this is a facilitated emission
        if formula.category.value == 'facilitated_emission':
            # Facilitated emission calculation
            facilitated_amount = inputs.get('facilitated_amount', 0)
            weighting_factor = inputs.get('weighting_factor', 0)
            emission_data = inputs.get('verified_emissions', 0) or inputs.get('unverified_emissions', 0)
            
            # For facilitated emissions: (Facilitated Amount / Company Value) × Weighting Factor × Emission Data
            attribution_factor = facilitated_amount / denominator if denominator > 0 else 0
            financed_emissions = attribution_factor * weighting_factor * emission_data
            emission_factor = 0  # Not applicable for direct emissions
            
            calculation_steps = [
                CalculationStep(
                    step='Attribution Factor',
                    value=attribution_factor,
                    formula=f"{facilitated_amount} / {denominator} = {attribution_factor:.6f}"
                ),
                CalculationStep(
                    step='Weighting Factor',
                    value=weighting_factor,
                    formula=f"Fixed weighting factor: {weighting_factor}"
                ),
                CalculationStep(
                    step='Facilitated Emissions',
                    value=financed_emissions,
                    formula=f"({facilitated_amount} / {denominator:.2f}) × {weighting_factor} × {emission_data} = {financed_emissions:.2f}"
                )
            ]
            
        elif formula.option_code in ['1a', '1b']:
            # Direct emission data (finance emissions)
            emission_data = inputs.get('verified_emissions', 0) or inputs.get('unverified_emissions', 0)
            emission_factor = 0  # Not applicable for direct emissions
            financed_emissions = (outstanding_amount / denominator) * emission_data
            
            calculation_steps = create_emission_calculation_steps(
                outstanding_amount, denominator, emission_data,
                'Emission Data', company_type.value
            )
            
        elif formula.option_code in ['2a', '2b']:
            # Activity-based calculation
            activity_data = inputs.get('energy_consumption', 0) or inputs.get('production', 0)
            emission_factor = inputs.get('emission_factor', 0) or inputs.get('production_emission_factor', 0)
            calculated_emissions = activity_data * emission_factor
            financed_emissions = (outstanding_amount / denominator) * calculated_emissions
            
            activity_label = 'Energy Consumption' if formula.option_code == '2a' else 'Production'
            emission_factor_label = 'Emission Factor' if formula.option_code == '2a' else 'Production Emission Factor'
            
            calculation_steps = create_activity_calculation_steps(
                outstanding_amount, denominator, activity_data, activity_label,
                emission_factor, emission_factor_label, company_type.value
            )
            
        else:
            # Default case
            emission_data = 0
            emission_factor = 0
            financed_emissions = 0
            calculation_steps = []
        
        return financed_emissions, emission_factor, calculation_steps
    
    def _has_required_inputs(self, formula: FormulaConfig, available_inputs: List[str]) -> bool:
        """
        Check if formula has all required inputs available
        """
        required_inputs = [input_field.name for input_field in formula.inputs if input_field.required]
        return all(input_name in available_inputs for input_name in required_inputs)

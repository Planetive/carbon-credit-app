/**
 * Scenario Building Module - Main Export File
 * Centralized exports for all scenario building functionality
 */

// Types and Interfaces
export * from './types';

// Constants
export * from './constants';

// Data Utilities
export * from './dataUtils';

// Calculation Engine
export * from './calculationEngine';

// Re-export commonly used items for convenience
export {
  CLIMATE_SCENARIOS,
  DEFAULT_FINANCED_EMISSIONS_BY_SECTOR
} from './constants';

export {
  convertPortfolioToScenario,
  mapSectorToAssetClass,
  calculateFinancedEmissions
} from './dataUtils';

export {
  calculateScenarioResults
} from './calculationEngine';
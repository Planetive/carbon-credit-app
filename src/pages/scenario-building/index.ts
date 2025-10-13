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
  PCAF_ASSET_CLASSES,
  SECTOR_SEGMENTS,
  CLIMATE_SCENARIOS,
  SECTOR_TO_ASSET_CLASS_MAPPING,
  DEFAULT_FINANCED_EMISSIONS_BY_SECTOR
} from './constants';

export {
  convertPortfolioToScenario,
  mapSectorToAssetClass,
  mapSectorToScenarioSector,
  calculateFinancedEmissions,
  filterByAssetClasses,
  filterBySectors,
  getUniqueAssetClasses,
  getUniqueSectors,
  calculateTotalPortfolioValue,
  calculateTotalFinancedEmissions,
  groupByAssetClass,
  groupBySector,
  sortByAmount,
  getTopEntries,
  validatePortfolioEntry,
  validatePortfolioEntries
} from './dataUtils';

export {
  calculateScenarioResults
} from './calculationEngine';

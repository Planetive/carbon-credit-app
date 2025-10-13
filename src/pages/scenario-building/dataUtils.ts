/**
 * Data Transformation Utilities for Scenario Building
 * Converts between different data formats and structures
 */

import { PortfolioEntry, ScenarioPortfolioEntry } from './types';
import { SECTOR_TO_ASSET_CLASS_MAPPING, DEFAULT_FINANCED_EMISSIONS_BY_SECTOR } from './constants';

/**
 * Convert BankPortfolio entries to Scenario Building portfolio entries
 */
export function convertPortfolioToScenario(
  portfolioEntries: PortfolioEntry[]
): ScenarioPortfolioEntry[] {
  return portfolioEntries.map(entry => {
    const assetClass = mapSectorToAssetClass(entry.sector);
    const sector = mapSectorToScenarioSector(entry.sector);
    const financedEmissions = calculateFinancedEmissions(entry.amount, entry.sector);
    
    console.log('convertPortfolioToScenario - Converting entry:', {
      originalSector: entry.sector,
      mappedAssetClass: assetClass,
      mappedSector: sector,
      amount: entry.amount,
      financedEmissions
    });
    
    return {
      id: entry.id,
      company: entry.company,
      amount: entry.amount,
      assetClass,
      sector,
      geography: entry.geography,
      financedEmissions
    };
  });
}

/**
 * Map portfolio sector to PCAF asset class
 */
export function mapSectorToAssetClass(sector: string): string {
  return SECTOR_TO_ASSET_CLASS_MAPPING[sector] || 'business_loans';
}

/**
 * Map portfolio sector to scenario building sector ID
 */
export function mapSectorToScenarioSector(sector: string): string {
  const sectorMapping: { [key: string]: string } = {
    'Energy': 'power_fossil',
    'Agriculture': 'agriculture',
    'Real Estate': 'real_estate',
    'Manufacturing': 'manufacturing',
    'Retail': 'retail',
    'Technology': 'manufacturing', // Map to manufacturing for now
    'Healthcare': 'manufacturing', // Map to manufacturing for now
    'Financial Services': 'banking_finance',
    'Transportation': 'transport',
    'Construction': 'construction',
    'Other': 'manufacturing' // Default to manufacturing
  };
  
  return sectorMapping[sector] || 'manufacturing';
}

/**
 * Calculate financed emissions based on amount and sector
 */
export function calculateFinancedEmissions(amount: number, sector: string): number {
  const emissionFactor = DEFAULT_FINANCED_EMISSIONS_BY_SECTOR[sector] || 0.2;
  // Convert amount from PKR to millions for calculation
  const amountInMillions = amount / 1000000;
  return amountInMillions * emissionFactor;
}

/**
 * Filter portfolio entries by selected asset classes
 */
export function filterByAssetClasses(
  portfolioEntries: ScenarioPortfolioEntry[],
  selectedAssetClasses: string[]
): ScenarioPortfolioEntry[] {
  if (selectedAssetClasses.length === 0) return portfolioEntries;
  
  return portfolioEntries.filter(entry => 
    selectedAssetClasses.includes(entry.assetClass)
  );
}

/**
 * Filter portfolio entries by selected sectors
 */
export function filterBySectors(
  portfolioEntries: ScenarioPortfolioEntry[],
  selectedSectors: string[]
): ScenarioPortfolioEntry[] {
  if (selectedSectors.length === 0) return portfolioEntries;
  
  return portfolioEntries.filter(entry => 
    selectedSectors.includes(entry.sector)
  );
}

/**
 * Get unique asset classes from portfolio entries
 */
export function getUniqueAssetClasses(portfolioEntries: ScenarioPortfolioEntry[]): string[] {
  const assetClasses = new Set(portfolioEntries.map(entry => entry.assetClass));
  return Array.from(assetClasses);
}

/**
 * Get unique sectors from portfolio entries
 */
export function getUniqueSectors(portfolioEntries: ScenarioPortfolioEntry[]): string[] {
  const sectors = new Set(portfolioEntries.map(entry => entry.sector));
  return Array.from(sectors);
}

/**
 * Calculate total portfolio value
 */
export function calculateTotalPortfolioValue(portfolioEntries: ScenarioPortfolioEntry[]): number {
  return portfolioEntries.reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * Calculate total financed emissions
 */
export function calculateTotalFinancedEmissions(portfolioEntries: ScenarioPortfolioEntry[]): number {
  return portfolioEntries.reduce((sum, entry) => sum + entry.financedEmissions, 0);
}

/**
 * Group portfolio entries by asset class
 */
export function groupByAssetClass(portfolioEntries: ScenarioPortfolioEntry[]): { [key: string]: ScenarioPortfolioEntry[] } {
  return portfolioEntries.reduce((groups, entry) => {
    if (!groups[entry.assetClass]) {
      groups[entry.assetClass] = [];
    }
    groups[entry.assetClass].push(entry);
    return groups;
  }, {} as { [key: string]: ScenarioPortfolioEntry[] });
}

/**
 * Group portfolio entries by sector
 */
export function groupBySector(portfolioEntries: ScenarioPortfolioEntry[]): { [key: string]: ScenarioPortfolioEntry[] } {
  return portfolioEntries.reduce((groups, entry) => {
    if (!groups[entry.sector]) {
      groups[entry.sector] = [];
    }
    groups[entry.sector].push(entry);
    return groups;
  }, {} as { [key: string]: ScenarioPortfolioEntry[] });
}

/**
 * Sort portfolio entries by amount (descending)
 */
export function sortByAmount(portfolioEntries: ScenarioPortfolioEntry[]): ScenarioPortfolioEntry[] {
  return [...portfolioEntries].sort((a, b) => b.amount - a.amount);
}

/**
 * Get top N portfolio entries by amount
 */
export function getTopEntries(portfolioEntries: ScenarioPortfolioEntry[], count: number): ScenarioPortfolioEntry[] {
  return sortByAmount(portfolioEntries).slice(0, count);
}

/**
 * Validate portfolio entry
 */
export function validatePortfolioEntry(entry: ScenarioPortfolioEntry): string[] {
  const errors: string[] = [];
  
  if (!entry.company || entry.company.trim() === '') {
    errors.push('Company name is required');
  }
  
  if (entry.amount <= 0) {
    errors.push('Amount must be greater than zero');
  }
  
  if (!entry.assetClass) {
    errors.push('Asset class is required');
  }
  
  if (!entry.sector) {
    errors.push('Sector is required');
  }
  
  if (!entry.geography) {
    errors.push('Geography is required');
  }
  
  if (entry.financedEmissions < 0) {
    errors.push('Financed emissions cannot be negative');
  }
  
  return errors;
}

/**
 * Validate portfolio entries array
 */
export function validatePortfolioEntries(entries: ScenarioPortfolioEntry[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (entries.length === 0) {
    errors.push('At least one portfolio entry is required');
  }
  
  entries.forEach((entry, index) => {
    const entryErrors = validatePortfolioEntry(entry);
    entryErrors.forEach(error => {
      errors.push(`Entry ${index + 1}: ${error}`);
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

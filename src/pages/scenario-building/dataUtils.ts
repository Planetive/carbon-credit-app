/**
 * Data Transformation Utilities for Scenario Building
 * Converts between different data formats and structures
 */

import { PortfolioEntry, ScenarioPortfolioEntry } from './types';
import { DEFAULT_FINANCED_EMISSIONS_BY_SECTOR } from './constants';
import { PortfolioClient } from '@/integrations/supabase/portfolioClient';

/**
 * Convert BankPortfolio entries to Scenario Building portfolio entries
 * Now uses real loan types from the database instead of hardcoded mapping
 */
export async function convertPortfolioToScenario(
  portfolioEntries: PortfolioEntry[]
): Promise<ScenarioPortfolioEntry[]> {
  // Get loan type mappings from database
  const loanTypeMap = await PortfolioClient.getLoanTypeMappings();
  
  return portfolioEntries.map(entry => {
    // Get real asset class from database, fallback to sector-based mapping
    const realAssetClass = entry.counterpartyId 
      ? getAssetClassFromLoanType(loanTypeMap.get(entry.counterpartyId) || 'business-loan')
      : mapSectorToAssetClass(entry.sector);
    
    const financedEmissions = calculateFinancedEmissions(entry.amount, entry.sector);
    
    console.log('convertPortfolioToScenario - Converting entry:', {
      originalSector: entry.sector,
      counterpartyId: entry.counterpartyId,
      loanTypeFromDB: loanTypeMap.get(entry.counterpartyId),
      mappedAssetClass: realAssetClass,
      amount: entry.amount,
      financedEmissions
    });
    
    // Map counterpartyType to counterparty if counterparty is not available
    // Entries from BankPortfolio have counterpartyType, not counterparty
    const counterparty = (entry as any).counterparty || (entry as any).counterpartyType || 'N/A';
    
    return {
      id: entry.id,
      company: entry.company,
      amount: entry.amount,
      counterparty: counterparty,
      sector: entry.sector,
      geography: entry.geography,
      probabilityOfDefault: entry.probabilityOfDefault,
      lossGivenDefault: entry.lossGivenDefault,
      tenor: entry.tenor,
      assetClass: realAssetClass,
      financedEmissions
    };
  });
}

/**
 * Map loan type from database to display-friendly asset class name
 */
export function getAssetClassFromLoanType(loanType: string): string {
  const loanTypeLabels: { [key: string]: string } = {
    'corporate-bond': 'Corporate Bond',
    'business-loan': 'Business Loan',
    'project-finance': 'Project Finance',
    'mortgage': 'Mortgage',
    'sovereign-debt': 'Sovereign Debt',
    'motor-vehicle-loan': 'Motor Vehicle Loan',
    'commercial-real-estate': 'Commercial Real Estate'
  };
  
  return loanTypeLabels[loanType] || 'Business Loan';
}

/**
 * Map portfolio sector to simple asset class (fallback for entries without loan type data)
 */
export function mapSectorToAssetClass(sector: string): string {
  // Simple mapping - all business loans for now (fallback)
  return 'Business Loan';
}

/**
 * Calculate financed emissions for an entry
 */
export function calculateFinancedEmissions(amount: number, sector: string): number {
  const sectorEmissions = DEFAULT_FINANCED_EMISSIONS_BY_SECTOR[sector] || 0.2;
  return (amount / 1000000) * sectorEmissions; // Convert to millions
}

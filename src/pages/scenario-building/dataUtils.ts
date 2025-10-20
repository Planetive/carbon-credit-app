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
    
    return {
      id: entry.id,
      company: entry.company,
      amount: entry.amount,
      counterparty: entry.counterparty,
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

/**
 * Generate sample portfolio data for testing
 */
export function generateSamplePortfolio(): PortfolioEntry[] {
  return [
    {
      id: '1',
      company: 'Acme Manufacturing Ltd.',
      amount: 70000000000, // 70 billion PKR
      counterparty: 'ACME001',
      sector: 'Manufacturing',
      geography: 'Pakistan',
      probabilityOfDefault: 2.5,
      lossGivenDefault: 45,
      tenor: 36
    },
    {
      id: '2',
      company: 'Green Energy Corp.',
      amount: 126000000000, // 126 billion PKR
      counterparty: 'GREEN001',
      sector: 'Energy',
      geography: 'Pakistan',
      probabilityOfDefault: 1.8,
      lossGivenDefault: 40,
      tenor: 60
    },
    {
      id: '3',
      company: 'Prime Retail Pvt.',
      amount: 42000000000, // 42 billion PKR
      counterparty: 'PRIME001',
      sector: 'Retail',
      geography: 'Pakistan',
      probabilityOfDefault: 3.2,
      lossGivenDefault: 50,
      tenor: 24
    },
    {
      id: '4',
      company: 'Tech Solutions Inc.',
      amount: 28000000000, // 28 billion PKR
      counterparty: 'TECH001',
      sector: 'Technology',
      geography: 'Pakistan',
      probabilityOfDefault: 2.1,
      lossGivenDefault: 35,
      tenor: 48
    },
    {
      id: '5',
      company: 'AgriCorp Ltd.',
      amount: 56000000000, // 56 billion PKR
      counterparty: 'AGRI001',
      sector: 'Agriculture',
      geography: 'Pakistan',
      probabilityOfDefault: 4.0,
      lossGivenDefault: 55,
      tenor: 18
    }
  ];
}
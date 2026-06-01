/**
 * Simple Scenario Building Calculation Engine
 * Handles TCFD climate stress testing calculations
 */

import { ScenarioPortfolioEntry, ScenarioResult } from './types';
import { CLIMATE_SCENARIOS, DEFAULT_FINANCED_EMISSIONS_BY_SECTOR } from './constants';

/**
 * Main calculation function for scenario analysis
 */
export function calculateScenarioResults(
  selectedScenario: string,
  portfolioEntries: ScenarioPortfolioEntry[]
): ScenarioResult {
  console.log('CalculationEngine - Input params:', {
    selectedScenario,
    portfolioEntriesCount: portfolioEntries.length
  });
  
  // Get scenario configuration
  const scenario = CLIMATE_SCENARIOS.find(s => s.id === selectedScenario);
  if (!scenario) {
    throw new Error(`Scenario '${selectedScenario}' not found`);
  }
  
  // Calculate basic metrics
  const totalPortfolioValue = calculateTotalPortfolioValue(portfolioEntries);
  const totalFinancedEmissions = calculateTotalFinancedEmissions(portfolioEntries);
  
  console.log('CalculationEngine - Basic metrics:', {
    totalPortfolioValue,
    totalFinancedEmissions,
    portfolioEntriesCount: portfolioEntries.length
  });
  
  // Calculate scenario-specific impacts
  const { totalPortfolioLoss, portfolioLossPercentage } = calculatePortfolioLoss(
    portfolioEntries, 
    scenario
  );
  
  // Calculate breakdowns
  const assetClassBreakdown = calculateAssetClassBreakdown(portfolioEntries, scenario);
  const sectorBreakdown = calculateSectorBreakdown(portfolioEntries, scenario);
  const topExposures = calculateTopExposures(portfolioEntries, scenario);
  
  // Calculate portfolio-weighted baseline risk from actual data
  const totalBaselineExpectedLoss = portfolioEntries.reduce((sum, entry) => {
    return sum + (entry.amount * (entry.probabilityOfDefault / 100) * (entry.lossGivenDefault / 100));
  }, 0);
  
  const baselineRisk = totalPortfolioValue > 0 ? (totalBaselineExpectedLoss / totalPortfolioValue) * 100 : 0;
  const scenarioRisk = baselineRisk + (baselineRisk * portfolioLossPercentage / 100);
  const riskIncrease = baselineRisk > 0 ? ((scenarioRisk - baselineRisk) / baselineRisk) * 100 : 0;

  const result: ScenarioResult = {
    scenarioType: scenario.name,
    totalPortfolioValue,
    totalFinancedEmissions,
    totalPortfolioLoss,
    portfolioLossPercentage,
    baselineRisk, // Now calculated from actual portfolio data
    scenarioRisk, // Now calculated from actual portfolio data
    riskIncrease, // Now calculated from actual portfolio data
    assetClassBreakdown,
    sectorBreakdown,
    topExposures
  };
  
  console.log('CalculationEngine - Final result:', result);
  return result;
}

/**
 * Calculate total portfolio value
 */
function calculateTotalPortfolioValue(entries: ScenarioPortfolioEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

/**
 * Calculate total financed emissions
 */
function calculateTotalFinancedEmissions(entries: ScenarioPortfolioEntry[]): number {
  return entries.reduce((total, entry) => {
    const sectorEmissions = DEFAULT_FINANCED_EMISSIONS_BY_SECTOR[entry.sector] || 0.2;
    return total + (entry.amount / 1000000) * sectorEmissions; // Convert to millions
  }, 0);
}

/**
 * Calculate portfolio loss based on scenario
 */
function calculatePortfolioLoss(
  entries: ScenarioPortfolioEntry[], 
  scenario: any
): { totalPortfolioLoss: number; portfolioLossPercentage: number } {
  let totalLoss = 0;
  
  entries.forEach(entry => {
    // Simple loss calculation based on scenario type
    let lossPercentage = 0;
    
    switch (scenario.id) {
      case 'transition_shock':
        lossPercentage = getTransitionLossPercentage(entry.sector);
        break;
      case 'physical_shock':
        lossPercentage = getPhysicalLossPercentage(entry.sector);
        break;
      case 'dual_stress':
        lossPercentage = getTransitionLossPercentage(entry.sector) + getPhysicalLossPercentage(entry.sector);
        break;
      default:
        lossPercentage = 0;
    }
    
    totalLoss += entry.amount * (lossPercentage / 100);
  });
  
  const totalPortfolioValue = calculateTotalPortfolioValue(entries);
  const portfolioLossPercentage = totalPortfolioValue > 0 ? (totalLoss / totalPortfolioValue) * 100 : 0;
  
  return { totalPortfolioLoss: totalLoss, portfolioLossPercentage };
}

/**
 * Get transition loss percentage by sector
 */
function getTransitionLossPercentage(sector: string): number {
  const transitionLosses: { [key: string]: number } = {
    'Energy': 3.5,
    'Manufacturing': 2.0,
    'Transportation': 1.8,
    'Agriculture': 2.5,
    'Real Estate': 2.5,
    'Construction': 1.2,
    'Retail': 0.8,
    'Technology': 0.5,
    'Healthcare': 0.5,
    'Financial Services': 0.5,
    'Other': 1.0
  };
  
  return transitionLosses[sector] || 1.0;
}

/**
 * Get physical loss percentage by sector
 */
function getPhysicalLossPercentage(sector: string): number {
  const physicalLosses: { [key: string]: number } = {
    'Energy': 1.0,
    'Manufacturing': 0.5,
    'Transportation': 0.8,
    'Agriculture': 2.0,
    'Real Estate': 1.5,
    'Construction': 0.5,
    'Retail': 0.3,
    'Technology': 0.2,
    'Healthcare': 0.2,
    'Financial Services': 0.2,
    'Other': 0.5
  };
  
  return physicalLosses[sector] || 0.5;
}

/**
 * Calculate asset class breakdown
 */
function calculateAssetClassBreakdown(entries: ScenarioPortfolioEntry[], scenario: any) {
  const breakdown: { [key: string]: { amount: number; estimatedLoss: number } } = {};
  
  entries.forEach(entry => {
    if (!breakdown[entry.assetClass]) {
      breakdown[entry.assetClass] = { amount: 0, estimatedLoss: 0 };
    }
    
    breakdown[entry.assetClass].amount += entry.amount;
    
    // Calculate estimated loss for this entry
    let lossPercentage = 0;
    switch (scenario.id) {
      case 'transition_shock':
        lossPercentage = getTransitionLossPercentage(entry.sector);
        break;
      case 'physical_shock':
        lossPercentage = getPhysicalLossPercentage(entry.sector);
        break;
      case 'dual_stress':
        lossPercentage = getTransitionLossPercentage(entry.sector) + getPhysicalLossPercentage(entry.sector);
        break;
    }
    
    breakdown[entry.assetClass].estimatedLoss += entry.amount * (lossPercentage / 100);
  });
  
  const totalAmount = calculateTotalPortfolioValue(entries);
  
  return Object.entries(breakdown).map(([assetClass, data]) => ({
    assetClass,
    amount: data.amount,
    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    estimatedLoss: data.estimatedLoss
  }));
}

/**
 * Calculate sector breakdown
 */
function calculateSectorBreakdown(entries: ScenarioPortfolioEntry[], scenario: any) {
  const breakdown: { [key: string]: { amount: number; estimatedLoss: number } } = {};
  
  entries.forEach(entry => {
    if (!breakdown[entry.sector]) {
      breakdown[entry.sector] = { amount: 0, estimatedLoss: 0 };
    }
    
    breakdown[entry.sector].amount += entry.amount;
    
    // Calculate estimated loss for this entry
    let lossPercentage = 0;
    switch (scenario.id) {
      case 'transition_shock':
        lossPercentage = getTransitionLossPercentage(entry.sector);
        break;
      case 'physical_shock':
        lossPercentage = getPhysicalLossPercentage(entry.sector);
        break;
      case 'dual_stress':
        lossPercentage = getTransitionLossPercentage(entry.sector) + getPhysicalLossPercentage(entry.sector);
        break;
    }
    
    breakdown[entry.sector].estimatedLoss += entry.amount * (lossPercentage / 100);
  });
  
  const totalAmount = calculateTotalPortfolioValue(entries);
  
  return Object.entries(breakdown).map(([sector, data]) => ({
    sector,
    amount: data.amount,
    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    estimatedLoss: data.estimatedLoss
  }));
}

/**
 * Calculate top exposures
 */
function calculateTopExposures(entries: ScenarioPortfolioEntry[], scenario: any) {
  return entries
    .map(entry => {
      let lossPercentage = 0;
      switch (scenario.id) {
        case 'transition_shock':
          lossPercentage = getTransitionLossPercentage(entry.sector);
          break;
        case 'physical_shock':
          lossPercentage = getPhysicalLossPercentage(entry.sector);
          break;
        case 'dual_stress':
          lossPercentage = getTransitionLossPercentage(entry.sector) + getPhysicalLossPercentage(entry.sector);
          break;
      }
      
      return {
        company: entry.company,
        sector: entry.sector,
        assetClass: entry.assetClass,
        amount: entry.amount,
        baselineRisk: entry.probabilityOfDefault,
        scenarioRisk: entry.probabilityOfDefault + lossPercentage,
        estimatedLoss: entry.amount * (lossPercentage / 100)
      };
    })
    .sort((a, b) => b.estimatedLoss - a.estimatedLoss);
}
/**
 * Scenario Building Calculation Engine
 * Handles all PCAF climate stress testing calculations
 */

import { ScenarioPortfolioEntry, ScenarioResult, CalculationParameters } from './types';
import { SECTOR_SEGMENTS, CLIMATE_SCENARIOS } from './constants';

/**
 * Main calculation function for scenario analysis
 */
export function calculateScenarioResults(params: CalculationParameters): ScenarioResult {
  const { selectedScenario, portfolioEntries, selectedAssetClasses, selectedSectors } = params;
  
  console.log('CalculationEngine - Input params:', {
    selectedScenario,
    portfolioEntriesCount: portfolioEntries.length,
    selectedAssetClasses,
    selectedSectors
  });
  
  console.log('CalculationEngine - Available sectors:', SECTOR_SEGMENTS.map(s => s.id));
  console.log('CalculationEngine - Portfolio entry sectors:', portfolioEntries.map(e => e.sector));
  console.log('CalculationEngine - Selected sectors:', selectedSectors);
  console.log('CalculationEngine - Selected asset classes:', selectedAssetClasses);
  
  // Filter portfolio entries based on selections
  const filteredEntries = filterPortfolioEntries(portfolioEntries, selectedAssetClasses, selectedSectors);
  
  console.log('CalculationEngine - Filtered entries:', filteredEntries);
  
  // Get scenario configuration
  const scenario = CLIMATE_SCENARIOS.find(s => s.id === selectedScenario);
  if (!scenario) {
    throw new Error(`Scenario '${selectedScenario}' not found`);
  }
  
  // Calculate basic metrics
  const totalPortfolioValue = calculateTotalPortfolioValue(filteredEntries);
  const totalFinancedEmissions = calculateTotalFinancedEmissions(filteredEntries);
  
  console.log('CalculationEngine - Basic metrics:', {
    totalPortfolioValue,
    totalFinancedEmissions,
    filteredEntriesCount: filteredEntries.length
  });
  
  // Calculate scenario-specific impacts
  const { totalPortfolioLoss, portfolioLossPercentage } = calculatePortfolioLoss(
    filteredEntries, 
    selectedScenario
  );
  
  console.log('CalculationEngine - Portfolio loss:', {
    totalPortfolioLoss,
    portfolioLossPercentage
  });
  
  // Calculate risk metrics
  const baselineRisk = 2.5; // Base risk percentage
  const scenarioRisk = baselineRisk + portfolioLossPercentage;
  const riskIncrease = ((scenarioRisk - baselineRisk) / baselineRisk) * 100;
  
  // Generate breakdowns
  const assetClassBreakdown = calculateAssetClassBreakdown(filteredEntries, selectedScenario, baselineRisk);
  const sectorBreakdown = calculateSectorBreakdown(filteredEntries, selectedScenario, baselineRisk);
  const topExposures = calculateTopExposures(filteredEntries, selectedScenario, baselineRisk);
  
  return {
    scenarioType: scenario.name,
    totalPortfolioValue,
    totalFinancedEmissions,
    totalPortfolioLoss,
    portfolioLossPercentage,
    baselineRisk,
    scenarioRisk,
    riskIncrease,
    assetClassBreakdown,
    sectorBreakdown,
    topExposures
  };
}

/**
 * Filter portfolio entries based on selected asset classes and sectors
 */
function filterPortfolioEntries(
  entries: ScenarioPortfolioEntry[],
  selectedAssetClasses: string[],
  selectedSectors: string[]
): ScenarioPortfolioEntry[] {
  let filtered = entries;
  
  console.log('filterPortfolioEntries - Input:', {
    entriesCount: entries.length,
    selectedAssetClasses,
    selectedSectors
  });
  
  // If no asset classes are selected, include all
  if (selectedAssetClasses.length > 0) {
    console.log('filterPortfolioEntries - Filtering by asset classes:', selectedAssetClasses);
    filtered = filtered.filter(entry => {
      const matches = selectedAssetClasses.includes(entry.assetClass);
      console.log(`filterPortfolioEntries - Entry ${entry.id} assetClass ${entry.assetClass} matches:`, matches);
      return matches;
    });
    console.log('filterPortfolioEntries - After asset class filter:', filtered.length);
  }
  
  // If no sectors are selected, include all
  if (selectedSectors.length > 0) {
    console.log('filterPortfolioEntries - Filtering by sectors:', selectedSectors);
    filtered = filtered.filter(entry => {
      const matches = selectedSectors.includes(entry.sector);
      console.log(`filterPortfolioEntries - Entry ${entry.id} sector ${entry.sector} matches:`, matches);
      return matches;
    });
    console.log('filterPortfolioEntries - After sector filter:', filtered.length);
  }
  
  console.log('filterPortfolioEntries - Final result:', filtered.length);
  return filtered;
}

/**
 * Calculate total portfolio value
 */
function calculateTotalPortfolioValue(entries: ScenarioPortfolioEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * Calculate total financed emissions
 */
function calculateTotalFinancedEmissions(entries: ScenarioPortfolioEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.financedEmissions, 0);
}

/**
 * Calculate portfolio loss based on scenario
 */
function calculatePortfolioLoss(
  entries: ScenarioPortfolioEntry[],
  scenarioId: string
): { totalPortfolioLoss: number; portfolioLossPercentage: number } {
  let totalPortfolioLoss = 0;
  let totalExposure = 0;
  
  console.log('calculatePortfolioLoss - Input:', { entries, scenarioId });
  
  entries.forEach(entry => {
    console.log('calculatePortfolioLoss - Processing entry:', entry);
    const sector = SECTOR_SEGMENTS.find(s => s.id === entry.sector);
    console.log('calculatePortfolioLoss - Found sector:', sector);
    
    if (sector && sector.impacts) {
      const exposure = entry.amount;
      totalExposure += exposure;
      
      // Apply scenario-specific impacts
      let sectorLoss = 0;
      if (scenarioId === 'transition_shock') {
        // Apply transition impacts
        const transitionImpact = sector.impacts.transition;
        sectorLoss = exposure * (Math.abs(transitionImpact.revenueChange || 0) + 
                               Math.abs(transitionImpact.costIncrease || 0) + 
                               Math.abs(transitionImpact.demandChange || 0)) / 100;
      } else if (scenarioId === 'physical_shock') {
        // Apply physical impacts
        const physicalImpact = sector.impacts.physical;
        sectorLoss = exposure * (Math.abs(physicalImpact.damage || 0) + 
                               Math.abs(physicalImpact.efficiencyLoss || 0) + 
                               Math.abs(physicalImpact.outputLoss || 0)) / 100;
      } else if (scenarioId === 'dual_stress') {
        // Apply both transition and physical impacts
        const transitionImpact = sector.impacts.transition;
        const physicalImpact = sector.impacts.physical;
        sectorLoss = exposure * (
          (Math.abs(transitionImpact.revenueChange || 0) + 
           Math.abs(transitionImpact.costIncrease || 0) + 
           Math.abs(transitionImpact.demandChange || 0)) +
          (Math.abs(physicalImpact.damage || 0) + 
           Math.abs(physicalImpact.efficiencyLoss || 0) + 
           Math.abs(physicalImpact.outputLoss || 0))
        ) / 100;
      } else {
        // Baseline - use estimated portfolio loss percentage
        sectorLoss = exposure * (sector.impacts.estimatedPortfolioLoss || 0) / 100;
      }
      
      totalPortfolioLoss += sectorLoss;
    }
  });
  
  const portfolioLossPercentage = totalExposure > 0 ? (totalPortfolioLoss / totalExposure) * 100 : 0;
  
  return { totalPortfolioLoss, portfolioLossPercentage };
}

/**
 * Calculate asset class breakdown
 */
function calculateAssetClassBreakdown(
  entries: ScenarioPortfolioEntry[],
  scenarioId: string,
  baselineRisk: number
) {
  const assetClassGroups = groupByAssetClass(entries);
  
  return Object.entries(assetClassGroups).map(([assetClass, assetClassEntries]) => {
    const amount = assetClassEntries.reduce((sum, entry) => sum + entry.amount, 0);
    
    // Calculate asset class specific impacts
    let assetClassLoss = 0;
    assetClassEntries.forEach(entry => {
      const sector = SECTOR_SEGMENTS.find(s => s.id === entry.sector);
      if (sector && sector.impacts) {
        let sectorLoss = 0;
        if (scenarioId === 'transition_shock') {
          const transitionImpact = sector.impacts.transition;
          sectorLoss = entry.amount * (Math.abs(transitionImpact.revenueChange || 0) + 
                                     Math.abs(transitionImpact.costIncrease || 0) + 
                                     Math.abs(transitionImpact.demandChange || 0)) / 100;
        } else if (scenarioId === 'physical_shock') {
          const physicalImpact = sector.impacts.physical;
          sectorLoss = entry.amount * (Math.abs(physicalImpact.damage || 0) + 
                                     Math.abs(physicalImpact.efficiencyLoss || 0) + 
                                     Math.abs(physicalImpact.outputLoss || 0)) / 100;
        } else if (scenarioId === 'dual_stress') {
          const transitionImpact = sector.impacts.transition;
          const physicalImpact = sector.impacts.physical;
          sectorLoss = entry.amount * (
            (Math.abs(transitionImpact.revenueChange || 0) + 
             Math.abs(transitionImpact.costIncrease || 0) + 
             Math.abs(transitionImpact.demandChange || 0)) +
            (Math.abs(physicalImpact.damage || 0) + 
             Math.abs(physicalImpact.efficiencyLoss || 0) + 
             Math.abs(physicalImpact.outputLoss || 0))
          ) / 100;
        } else {
          sectorLoss = entry.amount * (sector.impacts.estimatedPortfolioLoss || 0) / 100;
        }
        assetClassLoss += sectorLoss;
      }
    });
    
    const assetClassRisk = baselineRisk + (amount > 0 ? (assetClassLoss / amount) * 100 : 0);
    const assetClassRiskIncrease = ((assetClassRisk - baselineRisk) / baselineRisk) * 100;
    
    return {
      assetClass: getAssetClassName(assetClass),
      amount,
      baselineRisk: baselineRisk,
      scenarioRisk: assetClassRisk,
      riskIncrease: assetClassRiskIncrease,
      estimatedLoss: assetClassLoss
    };
  });
}

/**
 * Calculate sector breakdown
 */
function calculateSectorBreakdown(
  entries: ScenarioPortfolioEntry[],
  scenarioId: string,
  baselineRisk: number
) {
  const sectorGroups = groupBySector(entries);
  
  return Object.entries(sectorGroups).map(([sectorId, sectorEntries]) => {
    const amount = sectorEntries.reduce((sum, entry) => sum + entry.amount, 0);
    
    // Calculate sector-specific impacts
    let sectorLoss = 0;
    sectorEntries.forEach(entry => {
      const sector = SECTOR_SEGMENTS.find(s => s.id === entry.sector);
      if (sector && sector.impacts) {
        if (scenarioId === 'transition_shock') {
          const transitionImpact = sector.impacts.transition;
          sectorLoss += entry.amount * (Math.abs(transitionImpact.revenueChange || 0) + 
                                      Math.abs(transitionImpact.costIncrease || 0) + 
                                      Math.abs(transitionImpact.demandChange || 0)) / 100;
        } else if (scenarioId === 'physical_shock') {
          const physicalImpact = sector.impacts.physical;
          sectorLoss += entry.amount * (Math.abs(physicalImpact.damage || 0) + 
                                      Math.abs(physicalImpact.efficiencyLoss || 0) + 
                                      Math.abs(physicalImpact.outputLoss || 0)) / 100;
        } else if (scenarioId === 'dual_stress') {
          const transitionImpact = sector.impacts.transition;
          const physicalImpact = sector.impacts.physical;
          sectorLoss += entry.amount * (
            (Math.abs(transitionImpact.revenueChange || 0) + 
             Math.abs(transitionImpact.costIncrease || 0) + 
             Math.abs(transitionImpact.demandChange || 0)) +
            (Math.abs(physicalImpact.damage || 0) + 
             Math.abs(physicalImpact.efficiencyLoss || 0) + 
             Math.abs(physicalImpact.outputLoss || 0))
          ) / 100;
        } else {
          sectorLoss += entry.amount * (sector.impacts.estimatedPortfolioLoss || 0) / 100;
        }
      }
    });
    
    const sectorRisk = baselineRisk + (amount > 0 ? (sectorLoss / amount) * 100 : 0);
    const sectorRiskIncrease = ((sectorRisk - baselineRisk) / baselineRisk) * 100;
    
    return {
      sector: getSectorName(sectorId),
      amount,
      baselineRisk: baselineRisk,
      scenarioRisk: sectorRisk,
      riskIncrease: sectorRiskIncrease,
      estimatedLoss: sectorLoss
    };
  });
}

/**
 * Calculate top exposures
 */
function calculateTopExposures(
  entries: ScenarioPortfolioEntry[],
  scenarioId: string,
  baselineRisk: number
) {
  return entries
    .map(entry => {
      const sector = SECTOR_SEGMENTS.find(s => s.id === entry.sector);
      let estimatedLoss = 0;
      
      if (sector && sector.impacts) {
        if (scenarioId === 'transition_shock') {
          const transitionImpact = sector.impacts.transition;
          estimatedLoss = entry.amount * (Math.abs(transitionImpact.revenueChange || 0) + 
                                        Math.abs(transitionImpact.costIncrease || 0) + 
                                        Math.abs(transitionImpact.demandChange || 0)) / 100;
        } else if (scenarioId === 'physical_shock') {
          const physicalImpact = sector.impacts.physical;
          estimatedLoss = entry.amount * (Math.abs(physicalImpact.damage || 0) + 
                                        Math.abs(physicalImpact.efficiencyLoss || 0) + 
                                        Math.abs(physicalImpact.outputLoss || 0)) / 100;
        } else if (scenarioId === 'dual_stress') {
          const transitionImpact = sector.impacts.transition;
          const physicalImpact = sector.impacts.physical;
          estimatedLoss = entry.amount * (
            (Math.abs(transitionImpact.revenueChange || 0) + 
             Math.abs(transitionImpact.costIncrease || 0) + 
             Math.abs(transitionImpact.demandChange || 0)) +
            (Math.abs(physicalImpact.damage || 0) + 
             Math.abs(physicalImpact.efficiencyLoss || 0) + 
             Math.abs(physicalImpact.outputLoss || 0))
          ) / 100;
        } else {
          estimatedLoss = entry.amount * (sector.impacts.estimatedPortfolioLoss || 0) / 100;
        }
      }
      
      const entryRisk = baselineRisk + (entry.amount > 0 ? (estimatedLoss / entry.amount) * 100 : 0);
      
      return {
        ...entry,
        baselineRisk: baselineRisk,
        scenarioRisk: entryRisk,
        financedEmissions: entry.financedEmissions,
        estimatedLoss: estimatedLoss
      };
    })
    .sort((a, b) => b.estimatedLoss - a.estimatedLoss)
    .slice(0, 5);
}

/**
 * Helper function to group entries by asset class
 */
function groupByAssetClass(entries: ScenarioPortfolioEntry[]): { [key: string]: ScenarioPortfolioEntry[] } {
  return entries.reduce((groups, entry) => {
    if (!groups[entry.assetClass]) {
      groups[entry.assetClass] = [];
    }
    groups[entry.assetClass].push(entry);
    return groups;
  }, {} as { [key: string]: ScenarioPortfolioEntry[] });
}

/**
 * Helper function to group entries by sector
 */
function groupBySector(entries: ScenarioPortfolioEntry[]): { [key: string]: ScenarioPortfolioEntry[] } {
  return entries.reduce((groups, entry) => {
    if (!groups[entry.sector]) {
      groups[entry.sector] = [];
    }
    groups[entry.sector].push(entry);
    return groups;
  }, {} as { [key: string]: ScenarioPortfolioEntry[] });
}

/**
 * Get asset class name from ID
 */
function getAssetClassName(assetClassId: string): string {
  const assetClassNames: { [key: string]: string } = {
    'listed_equity': 'Listed Equity & Corporate Bonds',
    'business_loans': 'Business Loans & Unlisted Equity',
    'project_finance': 'Project Finance',
    'commercial_real_estate': 'Commercial Real Estate',
    'mortgages': 'Mortgages (Residential Real Estate)',
    'motor_vehicle_loans': 'Motor Vehicle Loans',
    'sovereign_debt': 'Sovereign Debt',
    'insurance_facilitation': 'Insurance / Facilitation Exposure'
  };
  
  return assetClassNames[assetClassId] || assetClassId;
}

/**
 * Get sector name from ID
 */
function getSectorName(sectorId: string): string {
  const sector = SECTOR_SEGMENTS.find(s => s.id === sectorId);
  return sector ? sector.name : sectorId;
}

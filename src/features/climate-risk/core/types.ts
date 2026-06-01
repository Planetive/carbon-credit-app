/**
 * Scenario Building Types and Interfaces
 * Simple TCFD Types
 */

// Climate Stress Scenarios
export interface ClimateScenario {
  id: string;
  name: string;
  type: string;
  description: string;
  assumptions: {
    gdpGrowth: string;
    carbonPrice: string;
    fossilDemand: string;
    greenSector: string;
    gdpImpact: string;
    physicalDamage: string;
    cropYields: string;
  };
  color: string;
  bgColor: string;
  borderColor: string;
}

// Portfolio Entry (from Bank Portfolio)
export interface PortfolioEntry {
  id: string;
  company: string;
  amount: number;
  counterparty: string;
  sector: string;
  geography: string;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
}

// Scenario Portfolio Entry (converted for scenario building)
export interface ScenarioPortfolioEntry {
  id: string;
  company: string;
  amount: number;
  counterparty: string;
  sector: string;
  geography: string;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
  assetClass: string;
  financedEmissions: number;
}

// Scenario Results
export interface ScenarioResult {
  scenarioType: string;
  totalPortfolioValue: number;
  totalFinancedEmissions: number;
  totalPortfolioLoss: number;
  portfolioLossPercentage: number;
  baselineRisk: number;
  scenarioRisk: number;
  riskIncrease: number;
  assetClassBreakdown: Array<{
    assetClass: string;
    amount: number;
    percentage: number;
    estimatedLoss: number;
  }>;
  sectorBreakdown: Array<{
    sector: string;
    amount: number;
    percentage: number;
    estimatedLoss: number;
  }>;
  topExposures: Array<{
    company: string;
    sector: string;
    assetClass: string;
    amount: number;
    baselineRisk: number;
    scenarioRisk: number;
    estimatedLoss: number;
  }>;
}

// Scenario Building State
export interface ScenarioBuildingState {
  currentStep: number;
  selectedScenario: string;
  portfolioEntries: ScenarioPortfolioEntry[];
  isRunning: boolean;
  progress: number;
  results: ScenarioResult | null;
  error: string | null;
}
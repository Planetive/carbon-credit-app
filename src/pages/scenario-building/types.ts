/**
 * Scenario Building Types and Interfaces
 * Separated from main component for better organization
 */

// PCAF Asset Classes
export interface PCAFAssetClass {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor?: string;
  riskTypes: string[];
}

// Sector Segments with Risk Mapping and Impact Quantification
export interface SectorSegment {
  id: string;
  name: string;
  transitionRisks: string[];
  physicalRisks: string[];
  typicalAssetClass: string;
  impacts: {
    transition: {
      revenueChange: number;
      strandedAssets: number;
      costIncrease: number;
      demandChange: number;
    };
    physical: {
      damage: number;
      efficiencyLoss: number;
      outputLoss: number;
    };
    estimatedPortfolioLoss: number;
  };
}

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

// Portfolio Entry (from BankPortfolio)
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

// Scenario Building Portfolio Entry (for PCAF calculations)
export interface ScenarioPortfolioEntry {
  id: string;
  company: string;
  amount: number;
  assetClass: string;
  sector: string;
  geography: string;
  financedEmissions: number;
}

// Scenario Result
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
    baselineRisk: number;
    scenarioRisk: number;
    riskIncrease: number;
    estimatedLoss: number;
  }>;
  sectorBreakdown: Array<{
    sector: string;
    amount: number;
    baselineRisk: number;
    scenarioRisk: number;
    riskIncrease: number;
    estimatedLoss: number;
  }>;
  topExposures: Array<{
    company: string;
    sector: string;
    assetClass: string;
    amount: number;
    baselineRisk: number;
    scenarioRisk: number;
    financedEmissions: number;
    estimatedLoss: number;
  }>;
}

// Scenario Building State
export interface ScenarioBuildingState {
  currentStep: number;
  selectedAssetClasses: string[];
  selectedSectors: string[];
  selectedScenario: string;
  portfolioEntries: ScenarioPortfolioEntry[];
  isRunning: boolean;
  progress: number;
  results: ScenarioResult | null;
  error: string | null;
}

// Sector to Asset Class Mapping
export interface SectorAssetClassMapping {
  [sector: string]: string;
}

// Calculation Parameters
export interface CalculationParameters {
  selectedScenario: string;
  portfolioEntries: ScenarioPortfolioEntry[];
  selectedAssetClasses: string[];
  selectedSectors: string[];
}

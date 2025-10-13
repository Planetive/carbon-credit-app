/**
 * Scenario Building Constants
 * PCAF Asset Classes, Sector Segments, and Climate Scenarios
 */

import { PCAFAssetClass, SectorSegment, ClimateScenario } from './types';

// PCAF Asset Classes
export const PCAF_ASSET_CLASSES: PCAFAssetClass[] = [
  {
    id: 'listed_equity',
    name: 'Listed Equity & Corporate Bonds',
    description: 'Holdings in public companies, green or brown sectors',
    icon: 'Building',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    riskTypes: ['Market valuation', 'Stranded asset risk']
  },
  {
    id: 'business_loans',
    name: 'Business Loans & Unlisted Equity',
    description: 'Corporate lending, project finance',
    icon: 'Briefcase',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    riskTypes: ['Credit risk', 'Capital impairment']
  },
  {
    id: 'project_finance',
    name: 'Project Finance',
    description: 'Power plants, infrastructure, mining',
    icon: 'Factory',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    riskTypes: ['Transition risk', 'Physical risk on project-level']
  },
  {
    id: 'commercial_real_estate',
    name: 'Commercial Real Estate',
    description: 'Property-backed loans, commercial developments',
    icon: 'Building',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    riskTypes: ['Physical damage', 'Retrofit cost']
  },
  {
    id: 'mortgages',
    name: 'Mortgages (Residential Real Estate)',
    description: 'Home loans',
    icon: 'Home',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    riskTypes: ['Flooding', 'Energy efficiency cost']
  },
  {
    id: 'motor_vehicle_loans',
    name: 'Motor Vehicle Loans',
    description: 'Fleet financing, EV vs ICE transition',
    icon: 'Car',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    riskTypes: ['Policy-driven demand shock']
  },
  {
    id: 'sovereign_debt',
    name: 'Sovereign Debt',
    description: 'Government bonds',
    icon: 'Landmark',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    riskTypes: ['Fiscal and macro risk', 'Transition policy exposure']
  },
  {
    id: 'insurance_facilitation',
    name: 'Insurance / Facilitation Exposure',
    description: 'Non-balance sheet facilitated finance',
    icon: 'Shield',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    riskTypes: ['Reputation', 'Contingent credit exposure']
  }
];

// Sector Segments with Risk Mapping and Impact Quantification
export const SECTOR_SEGMENTS: SectorSegment[] = [
  {
    id: 'oil_gas',
    name: 'Oil & Gas',
    transitionRisks: ['Carbon pricing', 'Stranded assets', 'Regulation'],
    physicalRisks: ['Storms', 'Heat', 'Sea level'],
    typicalAssetClass: 'Project Finance, Corporate Lending',
    impacts: {
      transition: {
        revenueChange: -25,
        strandedAssets: 30,
        costIncrease: 0,
        demandChange: 0
      },
      physical: {
        damage: 10,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 3.5 // Average of 3-4%
    }
  },
  {
    id: 'power_fossil',
    name: 'Power Generation (Fossil)',
    transitionRisks: ['Carbon taxes', 'Renewable competition'],
    physicalRisks: ['Floods', 'Heat on plants'],
    typicalAssetClass: 'Project Finance, Corporate Loans',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 20,
        demandChange: -15
      },
      physical: {
        damage: 0,
        efficiencyLoss: 5,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 2.5 // Average of 2-3%
    }
  },
  {
    id: 'power_renewable',
    name: 'Power Generation (Renewable)',
    transitionRisks: ['Tech evolution risk', 'Subsidy removal'],
    physicalRisks: ['Weather variability'],
    typicalAssetClass: 'Project Finance',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 0,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 5
      },
      estimatedPortfolioLoss: 0.5
    }
  },
  {
    id: 'steel_cement',
    name: 'Steel & Cement',
    transitionRisks: ['Carbon border adjustment', 'Process emissions'],
    physicalRisks: ['Heat', 'Flood'],
    typicalAssetClass: 'Corporate Lending',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 20,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 2.0
    }
  },
  {
    id: 'chemicals',
    name: 'Chemicals & Fertilizers',
    transitionRisks: ['Regulation', 'Input cost', 'Decarbonization pressure'],
    physicalRisks: ['Flood', 'Drought'],
    typicalAssetClass: 'Corporate Lending',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 15,
        demandChange: 0
      },
      physical: {
        damage: 10,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 1.5
    }
  },
  {
    id: 'agriculture',
    name: 'Agriculture',
    transitionRisks: ['Methane & fertilizer limits', 'ESG pressure'],
    physicalRisks: ['Drought', 'Pest', 'Flood'],
    typicalAssetClass: 'Business Loans',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 10,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 25
      },
      estimatedPortfolioLoss: 2.5
    }
  },
  {
    id: 'livestock',
    name: 'Livestock',
    transitionRisks: ['Methane limits', 'Diet shift'],
    physicalRisks: ['Heat', 'Drought'],
    typicalAssetClass: 'Business Loans',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 10,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 15
      },
      estimatedPortfolioLoss: 1.8
    }
  },
  {
    id: 'forestry',
    name: 'Forestry & Pulp',
    transitionRisks: ['Deforestation bans', 'Carbon market volatility'],
    physicalRisks: ['Wildfire', 'Drought'],
    typicalAssetClass: 'Business Loans',
    impacts: {
      transition: {
        revenueChange: -10,
        strandedAssets: 0,
        costIncrease: 0,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 20
      },
      estimatedPortfolioLoss: 2.0
    }
  },
  {
    id: 'real_estate',
    name: 'Real Estate (Commercial & Residential)',
    transitionRisks: ['Efficiency mandates', 'Tenant demand'],
    physicalRisks: ['Flood', 'Storm', 'Heat'],
    typicalAssetClass: 'Mortgages, CRE',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 15,
        demandChange: 0
      },
      physical: {
        damage: 20,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 2.5 // Average of 2-3%
    }
  },
  {
    id: 'construction',
    name: 'Construction',
    transitionRisks: ['Green material cost', 'Lifecycle carbon'],
    physicalRisks: ['Flood/storm'],
    typicalAssetClass: 'Corporate Loans',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 15,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 10
      },
      estimatedPortfolioLoss: 1.2
    }
  },
  {
    id: 'transport',
    name: 'Transport (Road, Rail, Shipping, Aviation)',
    transitionRisks: ['Fuel regulations', 'Electrification'],
    physicalRisks: ['Flood', 'Storm', 'Heat'],
    typicalAssetClass: 'Corporate Loans, Vehicle Finance',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 20,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 1.8
    }
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    transitionRisks: ['Energy cost', 'Emission compliance'],
    physicalRisks: ['Flood', 'Heat'],
    typicalAssetClass: 'Corporate Loans',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 10,
        demandChange: 0
      },
      physical: {
        damage: 5,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 1.0
    }
  },
  {
    id: 'retail',
    name: 'Retail',
    transitionRisks: ['Consumer preference shift'],
    physicalRisks: ['Storm', 'Supply chain disruption'],
    typicalAssetClass: 'Corporate Loans',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 10,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 0.8
    }
  },
  {
    id: 'food_processing',
    name: 'Food Processing',
    transitionRisks: ['Low-carbon transition'],
    physicalRisks: ['Crop/weather disruption'],
    typicalAssetClass: 'Corporate Loans',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 10,
        demandChange: 0
      },
      physical: {
        damage: 20,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 2.0
    }
  },
  {
    id: 'banking_finance',
    name: 'Banking / Finance',
    transitionRisks: ['Scope 3 policy', 'Carbon pricing in portfolio'],
    physicalRisks: ['Flood of branches'],
    typicalAssetClass: 'Corporate Bonds, Sovereign',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 0,
        demandChange: 0
      },
      physical: {
        damage: 5,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 0.5
    }
  },
  {
    id: 'insurance',
    name: 'Insurance',
    transitionRisks: ['Underwriting emissions', 'Solvency'],
    physicalRisks: ['Higher claims', 'Catastrophe risk'],
    typicalAssetClass: 'Corporate Bonds',
    impacts: {
      transition: {
        revenueChange: 0,
        strandedAssets: 0,
        costIncrease: 20,
        demandChange: 0
      },
      physical: {
        damage: 30,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 1.5
    }
  },
  {
    id: 'sovereign_public',
    name: 'Sovereign / Public Sector',
    transitionRisks: ['Policy misalignment', 'Green bond credibility'],
    physicalRisks: ['National-level disasters'],
    typicalAssetClass: 'Sovereign Debt',
    impacts: {
      transition: {
        revenueChange: -2,
        strandedAssets: 0,
        costIncrease: 0,
        demandChange: 0
      },
      physical: {
        damage: 0,
        efficiencyLoss: 0,
        outputLoss: 0
      },
      estimatedPortfolioLoss: 0.7
    }
  }
];

// Climate Stress Scenarios
export const CLIMATE_SCENARIOS: ClimateScenario[] = [
  {
    id: 'baseline',
    name: 'Baseline (2025–2030)',
    type: 'Control',
    description: 'Normal macro conditions; no additional carbon tax',
    assumptions: {
      gdpGrowth: 'Stable',
      carbonPrice: '<PKR 14,000/tCO₂',
      fossilDemand: 'Normal',
      greenSector: 'Normal',
      gdpImpact: '0%',
      physicalDamage: '0%',
      cropYields: 'Normal'
    },
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  {
    id: 'transition_shock',
    name: 'Transition Shock',
    type: 'Policy / Market',
    description: 'Rapid climate policy enforcement; sudden carbon tax, stranded assets',
    assumptions: {
      gdpGrowth: 'Stable',
      carbonPrice: 'PKR 28,000/tCO₂',
      fossilDemand: '-20%',
      greenSector: '+10%',
      gdpImpact: '0%',
      physicalDamage: '0%',
      cropYields: 'Normal'
    },
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'physical_shock',
    name: 'Physical Shock',
    type: 'Climate Impact',
    description: 'Major weather shocks; temperature rise, flooding',
    assumptions: {
      gdpGrowth: 'Stable',
      carbonPrice: '<PKR 14,000/tCO₂',
      fossilDemand: 'Normal',
      greenSector: 'Normal',
      gdpImpact: '-2%',
      physicalDamage: '15%',
      cropYields: '-25%'
    },
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'dual_stress',
    name: 'Dual Stress (Optional)',
    type: 'Combined',
    description: 'Transition + physical stress together',
    assumptions: {
      gdpGrowth: 'Stable',
      carbonPrice: 'PKR 28,000/tCO₂',
      fossilDemand: '-20%',
      greenSector: '+10%',
      gdpImpact: '-2%',
      physicalDamage: '15%',
      cropYields: '-25%'
    },
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
];

// Sector to Asset Class Mapping (for converting portfolio sectors to PCAF asset classes)
export const SECTOR_TO_ASSET_CLASS_MAPPING: { [key: string]: string } = {
  'Energy': 'project_finance',
  'Agriculture': 'business_loans',
  'Real Estate': 'commercial_real_estate',
  'Manufacturing': 'business_loans',
  'Retail': 'business_loans',
  'Technology': 'business_loans',
  'Healthcare': 'business_loans',
  'Financial Services': 'business_loans',
  'Transportation': 'motor_vehicle_loans',
  'Construction': 'business_loans',
  'Other': 'business_loans'
};

// Default financed emissions by sector (tCO2e per million PKR)
export const DEFAULT_FINANCED_EMISSIONS_BY_SECTOR: { [key: string]: number } = {
  'Energy': 0.5,
  'Agriculture': 0.3,
  'Real Estate': 0.2,
  'Manufacturing': 0.4,
  'Retail': 0.1,
  'Technology': 0.1,
  'Healthcare': 0.1,
  'Financial Services': 0.05,
  'Transportation': 0.6,
  'Construction': 0.3,
  'Other': 0.2
};

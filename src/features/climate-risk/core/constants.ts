/**
 * Scenario Building Constants
 * Simple TCFD Climate Scenarios
 */

import { ClimateScenario } from './types';

// Simple TCFD Climate Scenarios
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
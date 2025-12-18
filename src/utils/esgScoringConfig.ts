/**
 * ESG Scoring Configuration
 * 
 * This file contains all configurable thresholds and benchmarks used in automated ESG scoring.
 * Adjust these values to fine-tune the scoring algorithm based on industry standards or requirements.
 */

export const ESGScoringConfig = {
  // Environmental Scoring Thresholds
  environmental: {
    // Renewable energy percentage thresholds
    renewableEnergy: {
      excellent: 50,  // >= 50% renewable = score 3
      good: 25,      // >= 25% renewable = score 2
    },
    // Fossil fuel usage thresholds (lower is better)
    fossilFuel: {
      excellent: 20,  // <= 20% fossil = score 3
      good: 40,       // <= 40% fossil = score 2
    },
    // Water reclamation rate thresholds
    waterReclamation: {
      excellent: 50,  // >= 50% reclaimed = score 3
      good: 25,       // >= 25% reclaimed = score 2
    },
    // Waste treatment percentage thresholds
    wasteTreatment: {
      excellent: 80,  // >= 80% treated = score 3
      good: 50,       // >= 50% treated = score 2
    },
    // Minimum number of environmental policies for high score
    policyCount: {
      excellent: 4,   // >= 4 policies = score 3
      good: 2,        // >= 2 policies = score 2
    },
  },

  // Social Scoring Thresholds
  social: {
    // Gender pay equity thresholds (female/male ratio)
    payEquity: {
      excellent: 95,  // >= 95% = score 3 (within 5% is excellent)
      good: 85,       // >= 85% = score 2 (within 15% is acceptable)
    },
    // CEO pay ratio thresholds (lower is better, more equitable)
    ceoPayRatio: {
      excellent: 20,  // <= 20:1 = score 3
      good: 50,       // <= 50:1 = score 2
    },
    // Employee turnover thresholds (lower is better)
    turnover: {
      excellent: 10,  // <= 10% = score 3
      good: 20,       // <= 20% = score 2
    },
    // Gender diversity at senior level
    seniorGenderDiversity: {
      excellent: 40,  // >= 40% women = score 3
      good: 30,       // >= 30% women = score 2
    },
    // Overall gender balance
    genderBalance: {
      excellent: { min: 40, max: 60 },  // 40-60% = score 3
      good: { min: 30, max: 70 },        // 30-70% = score 2
    },
    // Temporary workers percentage (lower is better)
    temporaryWorkers: {
      excellent: 10,  // <= 10% = score 3
      good: 25,       // <= 25% = score 2
    },
    // Grievance/harassment resolution rate
    resolutionRate: {
      excellent: 90,  // >= 90% resolved = score 3
      good: 70,       // >= 70% resolved = score 2
    },
    // TRIR (Total Recordable Injury Rate) - lower is better
    trir: {
      excellent: 1.0,  // <= 1.0 = score 3
      good: 3.0,       // <= 3.0 = score 2
    },
    // Promotion equity (gender balance in promotions)
    promotionEquity: {
      excellent: { min: 40, max: 60 },  // 40-60% women = score 3
      good: 30,                         // >= 30% women = score 2
    },
    // CSR spending percentage
    csrSpending: {
      excellent: 2,   // >= 2% = score 3
      good: 1,        // >= 1% = score 2
    },
  },

  // Governance Scoring Thresholds
  governance: {
    // Board independence percentage
    boardIndependence: {
      excellent: 50,  // >= 50% independent = score 3
      good: 30,       // >= 30% independent = score 2
    },
    // Board gender diversity
    boardGenderDiversity: {
      excellent: 30,  // >= 30% women = score 3
      good: 20,       // >= 20% women = score 2
    },
    // Supplier compliance percentage
    supplierCompliance: {
      excellent: 80,  // >= 80% compliant = score 3
      good: 50,       // >= 50% compliant = score 2
    },
    // Number of sustainability disclosure practices
    disclosureCount: {
      excellent: 4,   // >= 4 practices = score 3
      good: 2,        // >= 2 practices = score 2
    },
  },

  // Section Weightages (must sum to 1.0)
  sectionWeights: {
    environmental: 0.30,  // 30%
    social: 0.35,           // 35%
    governance: 0.35,       // 35%
  },

  // Question Weightages within each section
  questionWeights: {
    environmental: [0.05, 0.04, 0.04, 0.04, 0.04, 0.05, 0.04],  // E-Q1 to E-Q7
    social: [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.02],  // S-Q1 to S-Q12
    governance: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05],  // G-Q1 to G-Q7
  },
} as const;


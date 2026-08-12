/**
 * SOVEREIGN DEBT FORMULA CONFIGURATIONS
 *
 * PCAF Global GHG Accounting and Reporting Standard
 * Table 10.1-7: Data quality score table for sovereign debt
 *
 * Attribution (all options): Outstanding amount / PPP-adjusted GDP
 * - 1a (score 1): verified country GHG (UNFCCC)
 * - 1b (score 2): unverified country GHG
 * - 2a (score 3): energy consumption × emission factor (+ process emissions)
 * - 3a (score 4): PPP-GDP × sector intensity (from country_sector_intensity table)
 * - 3b (score 5): PPP-GDP_c × (proxy GHG / proxy PPP-GDP)
 */

import { FormulaConfig } from '../types/formula';
import { COMMON_INPUTS } from './sharedFormulaUtils';

const num = (v: unknown) => Number(v || 0);

const pppGdpInput = {
  name: 'pp_adjusted_gdp',
  label: 'PPP-Adjusted GDP',
  type: 'number' as const,
  required: true,
  unit: 'PKR',
  description: 'Purchasing Power Parity-adjusted GDP of the sovereign country',
};

const attribution = (outstanding: number, pppGdp: number) => {
  if (!pppGdp) throw new Error('PPP-adjusted GDP must be greater than 0');
  return outstanding / pppGdp;
};

export const OPTION_1A_SOVEREIGN_DEBT: FormulaConfig = {
  id: '1a-sovereign-debt',
  name: 'Option 1a - Verified Country Emissions (Sovereign Debt)',
  description: 'Verified GHG emissions of the country, reported by the country to UNFCCC',
  dataQualityScore: 1,
  category: 'sovereign-debt',
  optionCode: '1a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    pppGdpInput,
    {
      name: 'verified_country_emissions',
      label: 'Verified Country Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Verified country GHG emissions reported to UNFCCC',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = num(inputs.outstanding_amount);
    const ppAdjustedGDP = num(inputs.pp_adjusted_gdp);
    const verifiedCountryEmissions = num(inputs.verified_country_emissions);
    if (!verifiedCountryEmissions) throw new Error('Verified country emissions must be greater than 0');
    const attributionFactor = attribution(outstandingAmount, ppAdjustedGDP);
    const financedEmissions = attributionFactor * verifiedCountryEmissions;
    return {
      attributionFactor,
      emissionFactor: verifiedCountryEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1a - Verified Country Emissions (Sovereign Debt)',
      calculationSteps: [
        { step: 'PPP-Adjusted GDP', value: ppAdjustedGDP, formula: `PPP-Adjusted GDP = ${ppAdjustedGDP.toFixed(2)}` },
        { step: 'Attribution Factor', value: attributionFactor, formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
        { step: 'Verified Country Emissions', value: verifiedCountryEmissions, formula: `Verified country emissions = ${verifiedCountryEmissions.toFixed(2)} tCO2e` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `${attributionFactor.toFixed(6)} × ${verifiedCountryEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e` },
      ],
      metadata: {
        companyType,
        optionCode: '1a',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        verifiedCountryEmissions,
        formula: 'Σ (Outstanding / PPP-adjusted GDP) × Verified country emissions',
      },
    };
  },
  notes: ['Highest data quality score (1)', 'Verified UNFCCC country GHG'],
};

export const OPTION_1B_SOVEREIGN_DEBT: FormulaConfig = {
  id: '1b-sovereign-debt',
  name: 'Option 1b - Unverified Country Emissions (Sovereign Debt)',
  description: 'Unverified GHG emissions of the country',
  dataQualityScore: 2,
  category: 'sovereign-debt',
  optionCode: '1b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    pppGdpInput,
    {
      name: 'unverified_country_emissions',
      label: 'Unverified Country Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Unverified country GHG emissions',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = num(inputs.outstanding_amount);
    const ppAdjustedGDP = num(inputs.pp_adjusted_gdp);
    const unverifiedCountryEmissions = num(inputs.unverified_country_emissions);
    if (!unverifiedCountryEmissions) throw new Error('Unverified country emissions must be greater than 0');
    const attributionFactor = attribution(outstandingAmount, ppAdjustedGDP);
    const financedEmissions = attributionFactor * unverifiedCountryEmissions;
    return {
      attributionFactor,
      emissionFactor: unverifiedCountryEmissions,
      financedEmissions,
      dataQualityScore: 2,
      methodology: 'PCAF Option 1b - Unverified Country Emissions (Sovereign Debt)',
      calculationSteps: [
        { step: 'PPP-Adjusted GDP', value: ppAdjustedGDP, formula: `PPP-Adjusted GDP = ${ppAdjustedGDP.toFixed(2)}` },
        { step: 'Attribution Factor', value: attributionFactor, formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
        { step: 'Unverified Country Emissions', value: unverifiedCountryEmissions, formula: `Unverified country emissions = ${unverifiedCountryEmissions.toFixed(2)} tCO2e` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `${attributionFactor.toFixed(6)} × ${unverifiedCountryEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e` },
      ],
      metadata: {
        companyType,
        optionCode: '1b',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        unverifiedCountryEmissions,
        formula: 'Σ (Outstanding / PPP-adjusted GDP) × Unverified country emissions',
      },
    };
  },
  notes: ['Good data quality score (2)', 'Unverified country GHG'],
};

export const OPTION_2A_SOVEREIGN_DEBT: FormulaConfig = {
  id: '2a-sovereign-debt',
  name: 'Option 2a - Country Energy Consumption (Sovereign Debt)',
  description: 'Country energy consumption (domestic and imported) × energy-source emission factor, plus process emissions',
  dataQualityScore: 3,
  category: 'sovereign-debt',
  optionCode: '2a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    pppGdpInput,
    {
      name: 'energy_consumption',
      label: 'Country Energy Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Energy consumption × EPA/DEFRA emission factor',
    },
    {
      name: 'emission_factor',
      label: 'Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e / unit',
    },
    {
      name: 'process_emissions',
      label: 'Process Emissions',
      type: 'number',
      required: false,
      unit: 'tCO2e',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = num(inputs.outstanding_amount);
    const ppAdjustedGDP = num(inputs.pp_adjusted_gdp);
    const energyConsumption = num(inputs.energy_consumption);
    const emissionFactor = num(inputs.emission_factor);
    const processEmissions = num(inputs.process_emissions);
    if (!energyConsumption || !emissionFactor) {
      throw new Error('Country energy consumption and emission factor must be greater than 0');
    }
    const attributionFactor = attribution(outstandingAmount, ppAdjustedGDP);
    const energyEmissions = energyConsumption * emissionFactor + processEmissions;
    const financedEmissions = attributionFactor * energyEmissions;
    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2a - Country Energy Consumption (Sovereign Debt)',
      calculationSteps: [
        { step: 'PPP-Adjusted GDP', value: ppAdjustedGDP, formula: `PPP-Adjusted GDP = ${ppAdjustedGDP.toFixed(2)}` },
        { step: 'Attribution Factor', value: attributionFactor, formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
        { step: 'Country Energy Emissions', value: energyEmissions, formula: `${energyConsumption} × ${emissionFactor} + ${processEmissions} = ${energyEmissions.toFixed(6)} tCO2e` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `${attributionFactor.toFixed(6)} × ${energyEmissions.toFixed(6)} = ${financedEmissions.toFixed(2)} tCO2e` },
      ],
      metadata: {
        companyType,
        optionCode: '2a',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        energyConsumption,
        emissionFactor,
        processEmissions,
        energyEmissions,
        formula: 'Σ (Outstanding / PPP-adjusted GDP) × Energy × EF',
      },
    };
  },
  notes: ['Fair data quality score (3)', 'Country energy × EPA/DEFRA factor'],
};

export const OPTION_3A_SOVEREIGN_DEBT: FormulaConfig = {
  id: '3a-sovereign-debt',
  name: 'Option 3a - Country Sector Intensity (Sovereign Debt)',
  description: 'PPP-GDP × sector intensity (GHG / revenue from reference table)',
  dataQualityScore: 4,
  category: 'sovereign-debt',
  optionCode: '3a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    pppGdpInput,
    {
      name: 'sector_intensity',
      label: 'Sector intensity',
      type: 'number',
      required: true,
      unit: 'kgCO2e/PKR',
      description: 'Country-sector GHG intensity from reference table (replaces GHG / revenue)',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = num(inputs.outstanding_amount);
    const ppAdjustedGDP = num(inputs.pp_adjusted_gdp);
    const rawIntensity = num(inputs.sector_intensity);
    if (!rawIntensity) throw new Error('Select a sector with intensity data');
    const unit = String(inputs.sector_intensity_unit || 'kgCO2e/PKR');
    const intensityT = unit.toLowerCase().includes('kg') ? rawIntensity / 1000 : rawIntensity;
    const attributionFactor = attribution(outstandingAmount, ppAdjustedGDP);
    const countryEmissions = ppAdjustedGDP * intensityT;
    const financedEmissions = attributionFactor * countryEmissions;
    return {
      attributionFactor,
      emissionFactor: countryEmissions,
      financedEmissions,
      dataQualityScore: 4,
      methodology: 'PCAF Option 3a - Country Sector Intensity (Sovereign Debt)',
      calculationSteps: [
        { step: 'PPP-Adjusted GDP', value: ppAdjustedGDP, formula: `PPP-Adjusted GDP = ${ppAdjustedGDP.toFixed(2)}` },
        { step: 'Attribution Factor', value: attributionFactor, formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
        { step: 'Sector Intensity', value: intensityT, formula: `${rawIntensity} ${unit} → ${intensityT.toExponential(6)} tCO2e/PKR` },
        { step: 'Country Sector Emissions', value: countryEmissions, formula: `PPP-GDP × intensity = ${countryEmissions.toFixed(2)} tCO2e` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `${attributionFactor.toFixed(6)} × ${countryEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e` },
      ],
      metadata: {
        companyType,
        optionCode: '3a',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        intensity: intensityT,
        countryEmissions,
        formula: 'Σ (Outstanding / PPP-adjusted GDP) × PPP-GDP × sector intensity',
      },
    };
  },
  notes: ['Lower data quality score (4)', 'Uses reference table intensity instead of GHG and revenue'],
};

export const OPTION_3B_SOVEREIGN_DEBT: FormulaConfig = {
  id: '3b-sovereign-debt',
  name: 'Option 3b - Proxy Country Intensity (Sovereign Debt)',
  description: 'Target PPP-adjusted GDP × (proxy country GHG / proxy PPP-adjusted GDP)',
  dataQualityScore: 5,
  category: 'sovereign-debt',
  optionCode: '3b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    pppGdpInput,
    {
      name: 'proxy_country_emissions',
      label: 'Proxy Country GHG',
      type: 'number',
      required: true,
      unit: 'tCO2e',
    },
    {
      name: 'proxy_pp_adjusted_gdp',
      label: 'Proxy Country PPP-Adjusted GDP',
      type: 'number',
      required: true,
      unit: 'PKR',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = num(inputs.outstanding_amount);
    const ppAdjustedGDP = num(inputs.pp_adjusted_gdp);
    const proxyEmissions = num(inputs.proxy_country_emissions);
    const proxyGdp = num(inputs.proxy_pp_adjusted_gdp);
    if (!proxyEmissions || !proxyGdp) {
      throw new Error('Proxy country GHG and proxy PPP-adjusted GDP must be greater than 0');
    }
    const attributionFactor = attribution(outstandingAmount, ppAdjustedGDP);
    const proxyIntensity = proxyEmissions / proxyGdp;
    const countryEmissions = ppAdjustedGDP * proxyIntensity;
    const financedEmissions = attributionFactor * countryEmissions;
    return {
      attributionFactor,
      emissionFactor: countryEmissions,
      financedEmissions,
      dataQualityScore: 5,
      methodology: 'PCAF Option 3b - Proxy Country Intensity (Sovereign Debt)',
      calculationSteps: [
        { step: 'PPP-Adjusted GDP', value: ppAdjustedGDP, formula: `PPP-Adjusted GDP = ${ppAdjustedGDP.toFixed(2)}` },
        { step: 'Attribution Factor', value: attributionFactor, formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
        { step: 'Proxy Intensity', value: proxyIntensity, formula: `${proxyEmissions} / ${proxyGdp} = ${proxyIntensity.toFixed(8)} tCO2e / GDP` },
        { step: 'Implied Country Emissions', value: countryEmissions, formula: `${ppAdjustedGDP} × ${proxyIntensity.toFixed(8)} = ${countryEmissions.toFixed(2)} tCO2e` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `${attributionFactor.toFixed(6)} × ${countryEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e` },
      ],
      metadata: {
        companyType,
        optionCode: '3b',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        proxyEmissions,
        proxyGdp,
        proxyIntensity,
        countryEmissions,
        formula: 'Σ (Outstanding / PPP-GDP_c) × PPP-GDP_c × (GHG_proxy / PPP-GDP_proxy)',
      },
    };
  },
  notes: ['Lowest data quality score (5)', 'Equivalent to Outstanding × (proxy GHG / proxy PPP-GDP)'],
};

export const SOVEREIGN_DEBT_FORMULAS = [
  OPTION_1A_SOVEREIGN_DEBT,
  OPTION_1B_SOVEREIGN_DEBT,
  OPTION_2A_SOVEREIGN_DEBT,
  OPTION_3A_SOVEREIGN_DEBT,
  OPTION_3B_SOVEREIGN_DEBT,
];

export const getSovereignDebtFormulasByCategory = (category: string) => {
  return SOVEREIGN_DEBT_FORMULAS.filter((formula) => formula.category === category);
};

export const getSovereignDebtFormulaById = (id: string) => {
  return SOVEREIGN_DEBT_FORMULAS.find((formula) => formula.id === id);
};

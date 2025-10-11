/**
 * Unit Conversion Utilities
 * 
 * This file provides comprehensive unit conversion functions for all unit types
 * used across the PCAF emission calculation forms.
 */

// ============================================================================
// EMISSION UNIT CONVERSIONS (to tCO2e)
// ============================================================================

export const convertToTonnesCO2e = (value: number, unit: string): number => {
  switch (unit) {
    case 'tCO2e': return value;
    case 'ktCO2e': return value * 1000; // kilotonnes to tonnes
    case 'MtCO2e': return value * 1000000; // megatonnes to tonnes
    case 'GtCO2e': return value * 1000000000; // gigatonnes to tonnes
    default: return value;
  }
};

// ============================================================================
// ENERGY UNIT CONVERSIONS (to MWh)
// ============================================================================

export const convertToMWh = (value: number, unit: string): number => {
  switch (unit) {
    case 'MWh': return value;
    case 'GWh': return value * 1000; // gigawatt-hours to megawatt-hours
    case 'TWh': return value * 1000000; // terawatt-hours to megawatt-hours
    case 'kWh': return value / 1000; // kilowatt-hours to megawatt-hours
    default: return value;
  }
};

// ============================================================================
// EMISSION FACTOR UNIT CONVERSIONS (to tCO2e/MWh)
// ============================================================================

export const convertToTonnesCO2ePerMWh = (value: number, unit: string): number => {
  switch (unit) {
    case 'tCO2e/MWh': return value;
    case 'kgCO2e/MWh': return value / 1000; // kg to tonnes
    case 'tCO2e/GWh': return value / 1000; // per GWh to per MWh
    default: return value;
  }
};

// ============================================================================
// PRODUCTION UNIT CONVERSIONS (to tonnes)
// ============================================================================

export const convertToTonnes = (value: number, unit: string): number => {
  switch (unit) {
    case 'tonnes': return value;
    case 'mt': return value * 1000000; // million tonnes to tonnes
    case 'kg': return value / 1000; // kilograms to tonnes
    case 'units': return value; // units remain as-is (no conversion)
    case 'barrels': return value; // barrels remain as-is (no conversion)
    case 'cubic-meters': return value; // cubic meters remain as-is (no conversion)
    default: return value;
  }
};

// ============================================================================
// PRODUCTION EMISSION FACTOR UNIT CONVERSIONS (to tCO2e/tonne)
// ============================================================================

export const convertToTonnesCO2ePerTonne = (value: number, unit: string): number => {
  switch (unit) {
    case 'tCO2e/tonne': return value;
    case 'kgCO2e/tonne': return value / 1000; // kg to tonnes
    case 'tCO2e/unit': return value; // per unit remains as-is
    case 'tCO2e/barrel': return value; // per barrel remains as-is
    default: return value;
  }
};

// ============================================================================
// FUEL CONSUMPTION UNIT CONVERSIONS (to L)
// ============================================================================

export const convertToLiters = (value: number, unit: string): number => {
  switch (unit) {
    case 'L': return value;
    case 'gal': return value * 3.78541; // gallons to liters
    case 'm³': return value * 1000; // cubic meters to liters
    default: return value;
  }
};

// ============================================================================
// VEHICLE EMISSION FACTOR UNIT CONVERSIONS (to tCO2e/L)
// ============================================================================

export const convertToTonnesCO2ePerLiter = (value: number, unit: string): number => {
  switch (unit) {
    case 'tCO2e/L': return value;
    case 'kgCO2e/L': return value / 1000; // kg to tonnes
    case 'tCO2e/gal': return value / 3.78541; // per gallon to per liter
    case 'kgCO2e/gal': return (value / 1000) / 3.78541; // kg per gallon to tonnes per liter
    default: return value;
  }
};

// ============================================================================
// UNIVERSAL UNIT CONVERSION FUNCTION
// ============================================================================

/**
 * Universal unit conversion function that handles all unit types
 * @param value - The numeric value to convert
 * @param unit - The current unit
 * @param targetType - The type of conversion needed
 * @returns The converted value
 */
export const convertUnit = (
  value: number, 
  unit: string, 
  targetType: 'emissions' | 'energy' | 'emissionFactor' | 'production' | 'productionEmissionFactor' | 'fuelConsumption' | 'vehicleEmissionFactor'
): number => {
  switch (targetType) {
    case 'emissions':
      return convertToTonnesCO2e(value, unit);
    case 'energy':
      return convertToMWh(value, unit);
    case 'emissionFactor':
      return convertToTonnesCO2ePerMWh(value, unit);
    case 'production':
      return convertToTonnes(value, unit);
    case 'productionEmissionFactor':
      return convertToTonnesCO2ePerTonne(value, unit);
    case 'fuelConsumption':
      return convertToLiters(value, unit);
    case 'vehicleEmissionFactor':
      return convertToTonnesCO2ePerLiter(value, unit);
    default:
      return value;
  }
};

// ============================================================================
// UNIT TYPE DETECTION
// ============================================================================

/**
 * Automatically detects the unit type based on the unit string
 * @param unit - The unit string
 * @returns The detected unit type
 */
export const detectUnitType = (unit: string): 'emissions' | 'energy' | 'emissionFactor' | 'production' | 'productionEmissionFactor' | 'fuelConsumption' | 'vehicleEmissionFactor' | 'unknown' => {
  // Emission units
  if (['tCO2e', 'ktCO2e', 'MtCO2e', 'GtCO2e'].includes(unit)) {
    return 'emissions';
  }
  
  // Energy units
  if (['MWh', 'GWh', 'TWh', 'kWh'].includes(unit)) {
    return 'energy';
  }
  
  // Emission factor units
  if (['tCO2e/MWh', 'kgCO2e/MWh', 'tCO2e/GWh'].includes(unit)) {
    return 'emissionFactor';
  }
  
  // Production units
  if (['tonnes', 'mt', 'kg', 'units', 'barrels', 'cubic-meters'].includes(unit)) {
    return 'production';
  }
  
  // Production emission factor units
  if (['tCO2e/tonne', 'kgCO2e/tonne', 'tCO2e/unit', 'tCO2e/barrel'].includes(unit)) {
    return 'productionEmissionFactor';
  }
  
  // Fuel consumption units
  if (['L', 'gal', 'm³'].includes(unit)) {
    return 'fuelConsumption';
  }
  
  // Vehicle emission factor units
  if (['tCO2e/L', 'kgCO2e/L', 'tCO2e/gal', 'kgCO2e/gal'].includes(unit)) {
    return 'vehicleEmissionFactor';
  }
  
  return 'unknown';
};

// ============================================================================
// SMART CONVERSION FUNCTION
// ============================================================================

/**
 * Smart conversion function that automatically detects unit type and converts
 * @param value - The numeric value to convert
 * @param unit - The current unit
 * @returns The converted value
 */
export const smartConvertUnit = (value: number, unit: string): number => {
  const unitType = detectUnitType(unit);
  if (unitType === 'unknown') {
    return value; // Return as-is if unit type is unknown
  }
  return convertUnit(value, unit, unitType);
};

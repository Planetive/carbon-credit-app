"""
Unit Conversion Utilities - Migrated from TypeScript
This file provides comprehensive unit conversion functions for all unit types
used across the PCAF emission calculation forms.

Migrated from: src/pages/finance_facilitated/utils/unitConversions.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from typing import Literal, Union
from .finance_models import UnitType


# ============================================================================
# EMISSION UNIT CONVERSIONS (to tCO2e)
# ============================================================================

def convert_to_tonnes_co2e(value: float, unit: str) -> float:
    """
    Convert emission units to tonnes CO2e
    Migrated from: convertToTonnesCO2e
    """
    unit_conversions = {
        'tCO2e': 1.0,
        'ktCO2e': 1000.0,  # kilotonnes to tonnes
        'MtCO2e': 1000000.0,  # megatonnes to tonnes
        'GtCO2e': 1000000000.0  # gigatonnes to tonnes
    }
    return value * unit_conversions.get(unit, 1.0)


# ============================================================================
# ENERGY UNIT CONVERSIONS (to MWh)
# ============================================================================

def convert_to_mwh(value: float, unit: str) -> float:
    """
    Convert energy units to MWh
    Migrated from: convertToMWh
    """
    unit_conversions = {
        'MWh': 1.0,
        'GWh': 1000.0,  # gigawatt-hours to megawatt-hours
        'TWh': 1000000.0,  # terawatt-hours to megawatt-hours
        'kWh': 0.001  # kilowatt-hours to megawatt-hours
    }
    return value * unit_conversions.get(unit, 1.0)


# ============================================================================
# EMISSION FACTOR UNIT CONVERSIONS (to tCO2e/MWh)
# ============================================================================

def convert_to_tonnes_co2e_per_mwh(value: float, unit: str) -> float:
    """
    Convert emission factor units to tCO2e/MWh
    Migrated from: convertToTonnesCO2ePerMWh
    """
    unit_conversions = {
        'tCO2e/MWh': 1.0,
        'kgCO2e/MWh': 0.001,  # kg to tonnes
        'tCO2e/GWh': 0.001  # per GWh to per MWh
    }
    return value * unit_conversions.get(unit, 1.0)


# ============================================================================
# PRODUCTION UNIT CONVERSIONS (to tonnes)
# ============================================================================

def convert_to_tonnes(value: float, unit: str) -> float:
    """
    Convert production units to tonnes
    Migrated from: convertToTonnes
    """
    unit_conversions = {
        'tonnes': 1.0,
        'mt': 1000000.0,  # million tonnes to tonnes
        'kg': 0.001,  # kilograms to tonnes
        'units': 1.0,  # units remain as-is (no conversion)
        'barrels': 1.0,  # barrels remain as-is (no conversion)
        'cubic-meters': 1.0  # cubic meters remain as-is (no conversion)
    }
    return value * unit_conversions.get(unit, 1.0)


# ============================================================================
# PRODUCTION EMISSION FACTOR UNIT CONVERSIONS (to tCO2e/tonne)
# ============================================================================

def convert_to_tonnes_co2e_per_tonne(value: float, unit: str) -> float:
    """
    Convert production emission factor units to tCO2e/tonne
    Migrated from: convertToTonnesCO2ePerTonne
    """
    unit_conversions = {
        'tCO2e/tonne': 1.0,
        'kgCO2e/tonne': 0.001,  # kg to tonnes
        'tCO2e/unit': 1.0,  # per unit remains as-is
        'tCO2e/barrel': 1.0  # per barrel remains as-is
    }
    return value * unit_conversions.get(unit, 1.0)


# ============================================================================
# FUEL CONSUMPTION UNIT CONVERSIONS (to L)
# ============================================================================

def convert_to_liters(value: float, unit: str) -> float:
    """
    Convert fuel consumption units to liters
    Migrated from: convertToLiters
    """
    unit_conversions = {
        'L': 1.0,
        'gal': 3.78541,  # gallons to liters
        'm³': 1000.0  # cubic meters to liters
    }
    return value * unit_conversions.get(unit, 1.0)


# ============================================================================
# VEHICLE EMISSION FACTOR UNIT CONVERSIONS (to tCO2e/L)
# ============================================================================

def convert_to_tonnes_co2e_per_liter(value: float, unit: str) -> float:
    """
    Convert vehicle emission factor units to tCO2e/L
    Migrated from: convertToTonnesCO2ePerLiter
    """
    unit_conversions = {
        'tCO2e/L': 1.0,
        'kgCO2e/L': 0.001,  # kg to tonnes
        'tCO2e/gal': 0.264172,  # per gallon to per liter (1/3.78541)
        'kgCO2e/gal': 0.000264172  # kg per gallon to tonnes per liter
    }
    return value * unit_conversions.get(unit, 1.0)


# ============================================================================
# UNIVERSAL UNIT CONVERSION FUNCTION
# ============================================================================

def convert_unit(
    value: float, 
    unit: str, 
    target_type: Literal['emissions', 'energy', 'emissionFactor', 'production', 'productionEmissionFactor', 'fuelConsumption', 'vehicleEmissionFactor']
) -> float:
    """
    Universal unit conversion function that handles all unit types
    Migrated from: convertUnit
    
    Args:
        value: The numeric value to convert
        unit: The current unit
        target_type: The type of conversion needed
    Returns:
        The converted value
    """
    conversion_functions = {
        'emissions': convert_to_tonnes_co2e,
        'energy': convert_to_mwh,
        'emissionFactor': convert_to_tonnes_co2e_per_mwh,
        'production': convert_to_tonnes,
        'productionEmissionFactor': convert_to_tonnes_co2e_per_tonne,
        'fuelConsumption': convert_to_liters,
        'vehicleEmissionFactor': convert_to_tonnes_co2e_per_liter
    }
    
    conversion_func = conversion_functions.get(target_type)
    if conversion_func:
        return conversion_func(value, unit)
    else:
        return value


# ============================================================================
# UNIT TYPE DETECTION
# ============================================================================

def detect_unit_type(unit: str) -> Union[Literal['emissions', 'energy', 'emissionFactor', 'production', 'productionEmissionFactor', 'fuelConsumption', 'vehicleEmissionFactor'], Literal['unknown']]:
    """
    Automatically detects the unit type based on the unit string
    Migrated from: detectUnitType
    
    Args:
        unit: The unit string
    Returns:
        The detected unit type
    """
    # Emission units
    if unit in ['tCO2e', 'ktCO2e', 'MtCO2e', 'GtCO2e']:
        return 'emissions'
    
    # Energy units
    if unit in ['MWh', 'GWh', 'TWh', 'kWh']:
        return 'energy'
    
    # Emission factor units
    if unit in ['tCO2e/MWh', 'kgCO2e/MWh', 'tCO2e/GWh']:
        return 'emissionFactor'
    
    # Production units
    if unit in ['tonnes', 'mt', 'kg', 'units', 'barrels', 'cubic-meters']:
        return 'production'
    
    # Production emission factor units
    if unit in ['tCO2e/tonne', 'kgCO2e/tonne', 'tCO2e/unit', 'tCO2e/barrel']:
        return 'productionEmissionFactor'
    
    # Fuel consumption units
    if unit in ['L', 'gal', 'm³']:
        return 'fuelConsumption'
    
    # Vehicle emission factor units
    if unit in ['tCO2e/L', 'kgCO2e/L', 'tCO2e/gal', 'kgCO2e/gal']:
        return 'vehicleEmissionFactor'
    
    return 'unknown'


# ============================================================================
# SMART CONVERSION FUNCTION
# ============================================================================

def smart_convert_unit(value: float, unit: str) -> float:
    """
    Smart conversion function that automatically detects unit type and converts
    Migrated from: smartConvertUnit
    
    Args:
        value: The numeric value to convert
        unit: The current unit
    Returns:
        The converted value
    """
    unit_type = detect_unit_type(unit)
    if unit_type == 'unknown':
        return value  # Return as-is if unit type is unknown
    
    return convert_unit(value, unit, unit_type)


# ============================================================================
# NUMBER FORMATTING UTILITIES (migrated from utils/numberFormatting.ts)
# ============================================================================

def format_number_with_commas(value: Union[float, str]) -> str:
    """
    Format a number with commas for display
    Migrated from: formatNumberWithCommas
    
    Args:
        value: The number to format
    Returns:
        Formatted string with commas (e.g., 10000 -> "10,000")
    """
    if value == '' or value is None:
        return ''
    
    try:
        num_value = float(value) if isinstance(value, str) else value
        if num_value != num_value:  # Check for NaN
            return ''
        
        return f"{num_value:,.0f}"
    except (ValueError, TypeError):
        return ''


def parse_formatted_number(formatted_value: str) -> float:
    """
    Parse a formatted number string back to a number
    Migrated from: parseFormattedNumber
    
    Args:
        formatted_value: The formatted string (e.g., "10,000")
    Returns:
        The parsed number (e.g., 10000)
    """
    if not formatted_value:
        return 0.0
    
    # Remove commas and parse
    clean_value = formatted_value.replace(',', '')
    try:
        parsed = float(clean_value)
        return parsed if parsed == parsed else 0.0  # Check for NaN
    except ValueError:
        return 0.0


def handle_formatted_number_change(value: str) -> float:
    """
    Handle input change for formatted number fields
    Migrated from: handleFormattedNumberChange
    
    Args:
        value: The input value
    Returns:
        The parsed number
    """
    # Allow empty string
    if value == '':
        return 0.0
    
    # Remove any non-numeric characters except decimal point
    clean_value = ''.join(c for c in value if c.isdigit() or c == '.')
    
    # Prevent multiple decimal points
    parts = clean_value.split('.')
    if len(parts) > 2:
        return 0.0  # Invalid input
    
    # Parse and return
    return parse_formatted_number(clean_value)

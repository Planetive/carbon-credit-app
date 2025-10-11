/**
 * Utility functions for number formatting and parsing
 */

/**
 * Format a number with commas for display
 * @param value - The number to format
 * @returns Formatted string with commas (e.g., 10000 -> "10,000")
 */
export const formatNumberWithCommas = (value: number | string): string => {
  if (value === '' || value === null || value === undefined) return '';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '';
  
  return numValue.toLocaleString('en-US');
};

/**
 * Parse a formatted number string back to a number
 * @param formattedValue - The formatted string (e.g., "10,000")
 * @returns The parsed number (e.g., 10000)
 */
export const parseFormattedNumber = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  
  // Remove commas and parse
  const cleanValue = formattedValue.replace(/,/g, '');
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Handle input change for formatted number fields
 * @param value - The input value
 * @param onChange - The onChange callback function
 */
export const handleFormattedNumberChange = (
  value: string,
  onChange: (value: number) => void
) => {
  // Allow empty string
  if (value === '') {
    onChange(0);
    return;
  }
  
  // Remove any non-numeric characters except decimal point
  const cleanValue = value.replace(/[^0-9.]/g, '');
  
  // Prevent multiple decimal points
  const parts = cleanValue.split('.');
  if (parts.length > 2) {
    return; // Invalid input, don't update
  }
  
  // Parse and update
  const parsed = parseFormattedNumber(cleanValue);
  onChange(parsed);
};

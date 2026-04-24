export const formatNumberWithCommas = (value: number | string): string => {
  if (value === "" || value === null || value === undefined) return "";

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(numValue)) return "";

  return numValue.toLocaleString("en-US");
};

export const parseFormattedNumber = (formattedValue: string): number => {
  if (!formattedValue) return 0;

  const cleanValue = formattedValue.replace(/,/g, "");
  const parsed = parseFloat(cleanValue);

  return Number.isNaN(parsed) ? 0 : parsed;
};

export const handleFormattedNumberChange = (value: string, onChange: (value: number) => void) => {
  if (value === "") {
    onChange(0);
    return;
  }

  const cleanValue = value.replace(/[^0-9.]/g, "");
  const parts = cleanValue.split(".");
  if (parts.length > 2) {
    return;
  }

  const parsed = parseFormattedNumber(cleanValue);
  onChange(parsed);
};

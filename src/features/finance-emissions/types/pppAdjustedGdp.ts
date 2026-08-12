export type PppAdjustedGdpRow = {
  country_name: string;
  gdp_2024: number | null;
  gdp_2025: number | null;
};

export type ResolvedPppGdp = {
  countryName: string;
  value: number;
  year: number;
  /** True when 2025 was requested but only 2024 data exists */
  usedFallback: boolean;
};

export type SovereignCountryOption = {
  countryName: string;
  gdpYear: number;
  gdpValue: number;
  usedFallback: boolean;
};

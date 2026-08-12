export type CountrySectorIntensityRow = {
  country_code: string;
  country_name: string;
  sector_code: string;
  sector_name: string;
  year: number;
  unit: string;
  intensity: number;
};

export type SectorOption = {
  sectorKey: string;
  sectorCode: string;
  sectorName: string;
  year: number;
  unit: string;
  intensity: number;
};

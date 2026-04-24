export type CountryEmissionRecord = Record<string, unknown>;

export type CountryAggregateRow = {
  key: string;
  name: string;
  alpha2?: string;
  emissions: number;
  percentageChangeAvg?: number;
};

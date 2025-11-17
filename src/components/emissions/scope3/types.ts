// Scope 3 Supplier types for Purchased Goods & Services

export interface Supplier {
  id: string;
  code: string;
  supplier_name: string;
  unit: string;
  emission_factor: number;
  created_at?: string;
  updated_at?: string;
}

// Supplier search result with highlighted match
export interface SupplierSearchResult extends Supplier {
  match_score?: number;
}


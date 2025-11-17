# Scope 3 Emissions Components

This directory contains all Scope 3 emission calculation components, specifically for **Purchased Goods & Services**.

## 📁 File Structure

```
scope3/
├── README.md                    # This file - overview and documentation
├── Scope3Section.tsx            # Main Scope 3 section component
├── Scope3Questionnaire.tsx      # Scope 3 questionnaire component
├── SupplierAutocomplete.tsx     # Supplier search/autocomplete component
├── types.ts                     # TypeScript types for suppliers
└── suppliers.ts                 # Supplier database query utilities
```

## 🔍 Quick Reference

### **Components**

#### `Scope3Section.tsx`
- Main component for Scope 3 emission categories
- Handles Purchased Goods & Services, Capital Goods, etc.
- Uses `SupplierAutocomplete` for supplier selection

#### `SupplierAutocomplete.tsx`
- Autocomplete dropdown for searching suppliers
- Features: debounced search, keyboard navigation, supplier details display
- Props: `value`, `onSelect`, `placeholder`, `disabled`, `className`

### **Utilities**

#### `suppliers.ts`
Database query functions:
- `searchSuppliers(term, limit)` - Search suppliers by name
- `getSupplierById(id)` - Get supplier by ID
- `getSupplierByCode(code)` - Get supplier by code

### **Types**

#### `types.ts`
TypeScript interfaces:
- `Supplier` - Supplier data structure
- `SupplierSearchResult` - Extended supplier with match score

## 🗄️ Database

**Table**: `suppliers`
- Migration: `supabase/migrations/20250120000000_create_suppliers_table.sql`
- Import Guide: `docs/SUPPLIER_DATA_IMPORT.md`

## 📝 Usage Example

```tsx
import { SupplierAutocomplete } from "./SupplierAutocomplete";
import { Supplier } from "./types";
import { useState } from "react";

function MyComponent() {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  
  return (
    <SupplierAutocomplete
      value={supplier}
      onSelect={setSupplier}
      placeholder="Search supplier..."
    />
  );
}
```

## 🔗 Related Files

- **Shared Types**: `src/components/emissions/shared/types.ts`
- **Shared Utils**: `src/components/emissions/shared/utils.ts`
- **Database Migration**: `supabase/migrations/20250120000000_create_suppliers_table.sql`
- **Import Documentation**: `docs/SUPPLIER_DATA_IMPORT.md`

## 🚀 Adding New Features

When adding new Scope 3 features:
1. Add types to `types.ts` if needed
2. Add database queries to `suppliers.ts` if needed
3. Create components in this directory
4. Update this README


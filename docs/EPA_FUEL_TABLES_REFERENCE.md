# Fuel EPA 1, 2, 3 – Table reference

The app loads fuel emission factors from three Supabase tables: **"Fuel EPA 1"**, **"Fuel EPA 2"**, and **"Fuel EPA 3"**. There is no migration that creates these tables in this repo; they are assumed to exist in your project (e.g. created in Supabase dashboard or by another process).

## How the app reads the tables

- **Tables:** `Fuel EPA 1`, `Fuel EPA 2`, `Fuel EPA 3`
- **Query:** `supabase.from(table).select("*")` for each table; all rows are merged and processed together.

## Columns the app looks for

### Identity

| Purpose        | Preferred names (case-sensitive in code)     | Fallbacks / variants |
|----------------|----------------------------------------------|------------------------|
| Category       | `Category`, `Fuel Category`                  | `category`, `fuel_category` |
| Fuel type      | `Fuel Type`, `Fuel`                          | `fuel_type`, `fuel`    |

### Heat content (for MMSCF derivation)

| Purpose     | Preferred names                              | Fallbacks |
|------------|------------------------------------------------|-----------|
| HHV value  | `Heat Content (HHV)`, `Heat Content`, `HeatContent` | `heat_content_hhv`, `hhv` |
| HHV unit   | `HHV Unit`, `HIV Unit` (typo)                  | `hhv_unit`, `hiv_unit`, `heat_content_unit` |

- **MMSCF option:** Only added when the HHV unit string (lowercased) contains `"scf"` (e.g. mmBtu/scf, mmBtu/MMscf). So fuels with HHV in **mmBtu per scf** get CO2/CH4/N2O per MMSCF; fuels with HHV in mmBtu per short ton or per gallon do not.

### Emission factors (by unit)

The app matches columns by **name** using these patterns (any column whose name matches is used):

**mmBtu-based (CO2 kg, CH4 g, N2O g per mmBtu):**

- CO2: name matches `CO2.*mmBtu` or `kg CO2.*mmBtu`, or fallback `CO2 Factor` / `co2_factor`
- CH4: name matches `CH4.*mmBtu` or `g CH4.*mmBtu`, or fallback `CH4 Factor` / `ch4_factor`
- N2O: name matches `N2O.*mmBtu` or `g N2O.*mmBtu`, or fallback `N2O Factor` / `n2o_factor`

**Short-ton-based (per short ton of fuel):**

- CO2: name matches `CO2.*short ton(s)?` or `kg CO2.*short ton(s)?`
- CH4: name matches `CH4.*short ton(s)?` or `g CH4.*short ton(s)?`
- N2O: name matches `N2O.*short ton(s)?` or `g N2O.*short ton(s)?`

If your Supabase column names use different wording (e.g. “per short ton” or “(short tons)”), the regexes may not match. Use the browser console logs (see below) to see the exact names and adjust either the table column names or the patterns in `FuelEmissions.tsx`.

## Seeing the actual table structure in the app

When the Fuel (EPA) screen loads, the app logs to the **browser console** (F12 → Console):

- `[Fuel EPA] Fuel EPA 1 columns:` – array of column names for table 1  
- `[Fuel EPA] Fuel EPA 1 first row:` – first row (all columns) for table 1  
- Same for **Fuel EPA 2** and **Fuel EPA 3** if they return data.

Use these to confirm exact column names and fix short ton / MMSCF behaviour if needed.

## UI unit labels produced

- **mmBtu:** `CO2 (kg CO2 / mmBtu)`, `CH4 (g CH4 / mmBtu)`, `N2O (g N2O / mmBtu)`
- **MMSCF:** `CO2 (kg CO2 / MMSCF)`, etc. (only when HHV unit contains `scf`)
- **Short ton:** `CO2 (kg CO2 / short ton)`, `CH4 (g CH4 / short ton)`, `N2O (g N2O / short ton)` (when a matching short-ton factor column exists)

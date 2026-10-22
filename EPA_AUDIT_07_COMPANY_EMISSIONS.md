# EPA Audit 07 — Company emissions storage

Research only. No application code, database rows, or reporting logic was changed.

Date of inspection: 20 October 2026.

This audit follows the EPA calculator’s company-portfolio save. It does not redesign finance, facilitated emissions, scenario building, or risk assessment.

## Data flow

```text
EPA calculator session (in-memory scopeTotals)
        |
        |  kilograms, no conversion
        v
saveCompanyEmissions (EpaCalculatorScreen.tsx)
        |
        |  scope1_emissions, scope2_emissions, scope3_emissions
        |  counterparty_id, is_bank_emissions = false
        |  calculation_source, notes
        v
PortfolioClient.upsertCompanyEmissions
        |
        +-- JWT (current app): PATCH the existing active row
        |                      no INSERT
        |
        +-- Supabase fallback: UPSERT on
               (user_id, counterparty_id, is_bank_emissions)
        v
company_emissions
        |
        +-- UK calculator toast only (does not calculate with the numbers)
        +-- delete archives the same row
        |
        +-- the same Save button, when opened from the finance wizard,
            also copies the same numbers into sessionStorage esgWizardState
            That copy is not a read of company_emissions.
```

## 1. Saving

`saveCompanyEmissions` is in `src/features/emission-calculator/methodologies/epa-ipcc/EpaCalculatorScreen.tsx` lines 591–618. It runs only when `companyContext` is set. The button at lines 1770–1825 calls it with `scopeTotals`.

The three stored numbers are exactly `scopeTotals.scope1`, `scopeTotals.scope2`, and `scopeTotals.scope3`. Nothing divides or multiplies them before the write.

Those totals are built at lines 342–367 from the current session:

- Scope 1, manual mode: `emissionData.scope1.fuel` + mobile fuel + on-road gasoline + on-road diesel/alt + non-road + Scope 1 heat-and-steam + refrigerants + `ipccScope1Totals` (flaring, venting, vehicular, kitchen, power, heating).
- Scope 2: the sum of `emissionData.scope2`.
- Scope 3: Scope 3 rows whose category does not start with `lca_`.
- LCA mode uses the `lca_scope1`, `lca_scope2`, `lca_upstream`, and `lca_downstream` rows instead.

Missing rows contribute 0 through `|| 0`.

### Unit

The numbers are kilograms, stored in columns whose original comment says tCO2e.

- Stationary: `StationaryCombustionSection.tsx` lines 44–46 passes `total_kg_co2e` into the fuel slot. A verified 100 mmBtu natural-gas result of 5.31145 t is therefore 5311.45 in the saved Scope 1 number.
- Electricity: `ElectricityEmissions.tsx` line 861 labels `displayElectricityEmissions` as kg CO2e and line 594 pushes that same number into Scope 2.
- The sidebar cards at lines 1182–1185 print `scopeTotals` with no unit label. The calculator’s own PDF labels those same numbers tCO2e and does not divide by 1,000 (`getReportContent`, around lines 240–249). That PDF is not the company-emissions write, but it uses the same `scopeTotals`.

The migration comment on the three scope columns is `tCO2e` (`supabase/migrations/20250115_000004_create_company_emissions.sql` lines 12–14). The save does not convert.

### Stationary records included

The save does not query `epa_stationary` and does not call `buildReportingTotals`.

Company mode skips the database hydrate (`refreshSummaryFromDb` returns immediately when `companyContext` is set, line 472). Historical fuel, kitchen, power, heating, and Scope 1 heat are therefore not loaded into the snapshot unless a form in this session wrote them into memory.

The stationary form reports only the entry that is currently verified. `StationaryEntryForm.tsx` lines 150–152 sends `total_kg_co2e` when `canSave` is true, and `null` otherwise. `reportVerified` turns `null` into an empty fuel list. Saved stationary records shown in the list are not added up. Opening the form without a verified result clears the fuel contribution to zero.

So a company save can include one just-calculated stationary kilogram figure. It does not include the organization’s other `epa_stationary` rows, and it does not include the legacy stationary inventory.

### What else is written

```text
counterparty_id     companyContext.counterpartyId
is_bank_emissions   false
calculation_source  "emission_calculator"
notes               "Calculated using EPA emission calculator version"
```

No assessment id, reporting period, organization id, GWP version, or factor dataset is sent.

`companyContext` comes from `sessionStorage.companyEmissionsContext` (30-minute window, lines 714–725) or from a `counterpartyId` query parameter. The query-parameter path sets `returnUrl` to `/bank-portfolio` (lines 736–740). The finance-wizard path sets `returnUrl` to `/finance-emission` (lines 691–698). No writer of `companyEmissionsContext` remains in the current frontend; the key is only read and removed. The live entry is the wizard URL `?from=wizard&counterpartyId=...` or a direct `?counterpartyId=` link.

## 2. Database

Table: `company_emissions`.

Defined in `supabase/migrations/20250115_000004_create_company_emissions.sql` and mapped in `carbon-credit-backend/fastapi_app/portfolio_models.py` lines 107–155.

| Column | Type | Stored by the EPA save |
| --- | --- | --- |
| `id` | UUID | Generated |
| `user_id` | UUID, not null | Authenticated user. Supabase upsert sets it. JWT leaves the existing row’s user |
| `counterparty_id` | UUID, nullable, FK to `counterparties` | The company being saved. Null only for a bank row, which this save does not create |
| `is_bank_emissions` | boolean, default false | `false` |
| `scope1_emissions` | NUMERIC(20,6), default 0 | Session Scope 1. Comment in the migration says tCO2e. No unit column |
| `scope2_emissions` | NUMERIC(20,6), default 0 | Session Scope 2. Same comment |
| `scope3_emissions` | NUMERIC(20,6), default 0 | Session Scope 3. Same comment |
| `total_emissions` | NUMERIC(20,6), default 0 | Sum of the three scopes. A trigger and the API both recompute it |
| `calculation_source` | text, check `emission_calculator`, `questionnaire`, `manual` | Intended value `emission_calculator`. The JWT patch body does not send it, so an existing row keeps its previous source |
| `calculation_date` | timestamptz | Supabase upsert sets it to now. The JWT patch does not change it |
| `status` | text, `active` or `archived` | Set to `active` |
| `notes` | text | The EPA note above |
| `created_at`, `updated_at` | timestamptz | Row timestamps |

Not stored: unit, reporting year, reporting period, methodology version, assessment id, organization id, GWP, or factor dataset. The backend model comment says the table has no `organization_id`; organization scope is applied by joining `counterparties.organization_id` (`company_emissions.py` lines 21–40).

Unique key: `(user_id, counterparty_id, is_bank_emissions)`. Status is not part of the key, so there is one row for that company and user, not one row per year.

### Update versus insert

Supabase path (`portfolioClient.ts` lines 942–955): `upsert` on that unique key. A second save overwrites the same snapshot and sets `status` back to `active`.

JWT path (lines 911–931), which this app uses when `USE_JWT_AUTH` is on: look up the active row, then `PATCH /api/v1/company-emissions/{id}`. If no active row exists, it throws `Creating company_emissions via API is not available yet (PATCH-only)` and does not insert. The API schema `CompanyEmissionUpdate` has no `total_emissions` field; `patch_company_emission` recomputes the total after applying the scopes (`company_emissions.py` lines 114–118). There is no POST route.

`deleteCompanyEmissions` archives that same row. It does not create a replacement.

## 3. Downstream usage

### Direct readers of `company_emissions`

| Consumer | What it does with the row | Unit it assumes | Used in a further calculation |
| --- | --- | --- | --- |
| `PortfolioClient.getCompanyEmissions` | Lookup for update and delete | None | No |
| `PortfolioClient.upsertCompanyEmissions` | Overwrites the active row | Writes the session number unchanged | Adds the three scopes into `total_emissions` |
| `UKCalculatorScreen.loadExistingCompanyEmissions` (`UKCalculatorScreen.tsx` lines 476–493) | Toast with the three numbers, then resets the UK calculator to blank | Prints the stored number with no unit | No |
| `GET/PATCH /api/v1/company-emissions` | List and update | Numeric only | Total is the arithmetic sum |

No portfolio screen, finance formula, facilitated formula, scenario screen, or risk screen queries this table.

`EpaIpccResultsScreen.tsx` reads `companyEmissionsContext` from session storage only to choose a counterparty filter. It does not read `company_emissions`.

### Company Portfolio

`CompanyDetailScreen.tsx` shows financed-emission results from `emission_calculations`, not `company_emissions`. Its finance button opens `/finance-emission` with the counterparty. It does not display `scope1_emissions` from the company snapshot.

### Finance Emissions and Facilitated Emissions

These modules do not read `company_emissions`.

The EPA Save button, when `hasWizardContext` is set, writes the snapshot and then copies the same `scopeTotals` into `sessionStorage.esgWizardState` (lines 1797–1821): `scope1Emissions`, `scope2Emissions`, `scope3Emissions`, and `totalEmissions`. Verified versus unverified is the whole total, based on the wizard’s verification status, not on `epa_stationary`.

`ESGWizard.tsx` lines 694–752 prefers those session numbers over `counterparty_questionnaires.scope*_emissions`. It then saves them onto the questionnaire (lines 1113–1119). Finance and facilitated formulas multiply `verified_emissions` or `unverified_emissions` by an attribution factor and label the product tCO2e. Examples:

- `corporateBondAndBusinessLoanFormulaConfigs.ts` lines 101 and 129: `(outstanding / EVIC) × verified_emissions`, unit `tCO2e`.
- `facilitatedEmissionFormulaConfigs.ts` lines 85–118: `(facilitated amount / EVIC) × weighting × verified_emissions`, unit `tCO2e`.

If the session number is kilograms, those formulas scale it as if it were tonnes. That is a 1,000× error on the parallel wizard path. It is not a read of the `company_emissions` row. A later finance run that reloads the questionnaire, rather than the fresh session, uses the questionnaire copy of those same numbers.

Missing questionnaire values become 0 (`questionnaire.scope1_emissions || 0`, line 750). Formula inputs use `|| 0` the same way (`facilitatedEmissionFormulaConfigs.ts` line 93).

### Scenario Building

No reference to `company_emissions`, `getCompanyEmissions`, or the company scope columns under `src/features/climate-risk`. Scenario inputs come from other climate-risk data, not this snapshot.

### Risk Assessment

No reference to `company_emissions` under the climate-risk feature. The dashboard risk block is a separate placeholder and does not read this table.

## 4. Data-integrity risks

**1,000× unit error.** The session totals are kilograms. The table comment and the finance formulas say tCO2e. Saving 5,311.45 for one natural-gas activity stores 5,311.45 in a tonnes column. A finance formula that later treats a copied questionnaire value as tonnes reports about 1,000 times the activity’s 5.31145 tCO2e.

**Legacy versus new stationary.** The snapshot is neither the reportable EPA total nor the legacy inventory. It is the sidebar session. New `epa_stationary` rows are omitted except for the single entry currently verified on the form. Legacy fuel, kitchen, power, heating, and Scope 1 heat are omitted in company mode because the loader refresh is skipped.

**Duplicate counting.** The save does not add verified tonnes on top of legacy fuel, because company mode does not load legacy fuel. It also does not sum multiple stationary records. The in-session Scope 1 formula can still add mobile, on-road, non-road, and `ipccScope1Totals.vehicularCarbonFootprints` together if those rows were all filled in one session.

**Missing reporting period.** No year or period is stored. A January activity and an October activity, saved at different times, cannot be told apart. The second save replaces the first.

**Overwritten snapshot.** The unique key allows one active company row per user. Supabase upsert replaces it. JWT patch replaces the scope columns on that row. Archiving is the only other state, and JWT cannot insert a new row afterward.

**Organization and counterparty.** The write is counterparty-specific and not organization-specific. The API will only patch a row whose counterparty belongs to the authenticated organization. A company with no existing row fails the JWT save. Bank emissions (`is_bank_emissions = true`, null counterparty) are a different row and are not written by this function. The results screen’s organization inventory is not what gets stored.

**Unavailable calculation becomes zero.** An empty session, a stationary form with no verified result, or a category the user did not open contributes 0 and that 0 is saved. A failed stationary list sets the form’s record list to empty and does not block the save. A thrown upsert does not write zero; it shows an error. The wizard’s `Number(resumePayload.scope1Emissions ?? 0)` and the formula `|| 0` paths do turn a missing value into zero after a successful copy.

## 5. Files inspected

- `src/features/emission-calculator/methodologies/epa-ipcc/EpaCalculatorScreen.tsx`
- `src/features/emission-calculator/scope1/activity-based/components/StationaryCombustionSection.tsx`
- `src/features/emission-calculator/scope1/activity-based/stationary/StationaryEntryForm.tsx`
- `src/features/emission-calculator/scope2/components/ElectricityEmissions.tsx`
- `src/integrations/supabase/portfolioClient.ts`
- `src/api/portfolio.ts`
- `src/features/emission-calculator/methodologies/uk/UKCalculatorScreen.tsx`
- `src/features/finance-emissions/esg/ESGWizard.tsx`
- `src/features/finance-emissions/config/corporateBondAndBusinessLoanFormulaConfigs.ts`
- `src/features/finance-emissions/config/facilitatedEmissionFormulaConfigs.ts`
- `src/features/portfolio/screens/CompanyDetailScreen.tsx`
- `supabase/migrations/20250115_000004_create_company_emissions.sql`
- `carbon-credit-backend/fastapi_app/portfolio_models.py`
- `carbon-credit-backend/fastapi_app/schemas_v1.py`
- `carbon-credit-backend/fastapi_app/routers/company_emissions.py`

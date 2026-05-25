# Scope 3

This is the most important architecture file in the calculator docs.

Scope 3 is where the codebase had the biggest frontend scaling problem, and it is where the current migration work is most visible.

## Purpose

This file explains:

- why `Scope3Section` became a problem
- how Scope 3 is being split up
- what Wave 1, Wave 2, and Phase 7C mean
- how the presentational extraction strategy works
- why we used re-export stubs
- what the target Scope 3 architecture looks like

## The core problem

The main Scope 3 file is:

- `src/components/emissions/scope3/Scope3Section.tsx`

That file grew into one very large orchestrator that handled:

- many Scope 3 categories
- lots of local state
- row updates
- save and load logic
- factor loading
- emission syncing
- large amounts of JSX

That made it hard to:

- understand where a bug lived
- safely refactor one category
- review changes
- onboard new developers

In simple terms:

```txt
Too many jobs in one file
  ↓
hard to read
hard to test
hard to move safely
```

## Old Scope 3 shape

Before the extraction work, the structure looked more like this:

```txt
Scope3Section
  ├─ category routing
  ├─ category state
  ├─ row update logic
  ├─ save/load logic
  ├─ factor loaders
  ├─ emission sync
  └─ JSX for many categories
```

## Current Scope 3 shape

Today the structure is better, but still transitional:

```txt
Scope3Section
  ├─ still owns most state
  ├─ still owns save/load/calculation logic
  ├─ still owns useEmissionSync
  └─ renders many extracted UI sections

components/emissions/scope3/components/*
  └─ mostly re-export stubs

features/emission-calculator/scope3/categories/*
  └─ real presentational category UI
```

## Why we used presentational extraction first

We did not start by moving all Scope 3 logic at once.

That would have been too risky.

Instead, we used a safer sequence:

1. move the JSX out first
2. keep parent-owned state in `Scope3Section`
3. keep Supabase and calculations in one place
4. move hooks/adapters later

This gave us smaller pull requests and lower risk.

## Parent-owned state strategy

This is the key pattern used in the migration.

Example:

```txt
Scope3Section
  owns:
    - rows
    - saving flags
    - totals
    - update handlers
    - save handlers
    - sync logic

Category component
  receives:
    - rows
    - totals
    - saving
    - callbacks
```

This means the extracted category UI can stay simple while behavior remains unchanged.

## Re-export stub strategy

We also kept old import paths stable by adding small stub files.

Pattern:

```txt
old path
  ↓
re-export stub
  ↓
new feature-owned file
```

Example idea:

```txt
components/emissions/scope3/components/WasteGeneratedSection.tsx
  ↓
re-exports
  ↓
features/emission-calculator/scope3/categories/waste-generated/WasteGeneratedSection.tsx
```

This let us move code safely without rewriting all consumers at once.

## Extracted categories

These categories now have feature-owned UI files under:

- `src/features/emission-calculator/scope3/categories/`

Important extracted categories include:

- `business-travel`
- `employee-commuting`
- `waste-generated`
- `purchased-goods`
- `capital-goods`
- `fuel-energy-activities`
- `end-of-life-treatment`
- `processing-use-of-sold-products`
- `franchises`
- `upstream-transportation`
- `downstream-transportation`
- `leased-assets`
- `investments`
- `facilitated-emissions`

Inside `processing-use-of-sold-products`, the UI is now split further into:

- `ProcessingProductTypeSelector.tsx`
- `ProcessingSoldProductsSection.tsx`
- `UseOfSoldProductsSection.tsx`

## What Wave 1 means

Wave 1 was the first push to move obvious Scope 3 category UI out of the giant file.

This covered earlier category extractions such as:

- `franchises`
- `fuel-energy-activities`
- `purchased-goods`
- `capital-goods`

Why these first?

- they were easier to isolate
- they reduced `Scope3Section` size quickly
- they helped prove the extraction pattern

## What Wave 2 means

Wave 2 expanded the same strategy to more operational categories.

Examples:

- `business-travel`
- `employee-commuting`
- `waste-generated`
- `upstream-transportation`
- `downstream-transportation`
- `leased-assets`
- later finance-related Scope 3 sections

Wave 2 was important because it showed the same migration pattern works across several category types, not just one or two.

## What Phase 7C means

Phase 7C focused on the last large inline UI blocks that were still sitting inside `Scope3Section`.

That included:

- `end-of-life-treatment`
- `processing-use-of-sold-products`

Phase 7C used smaller safe steps:

### 7C-1

- extract `EndOfLifeTreatmentSection` UI only

### 7C-2a

- extract the processing/use product type selector UI

### 7C-2b

- extract `ProcessingSoldProductsSection` UI only

### 7C-2c

- extract `UseOfSoldProductsSection` UI only

At the end of these steps, the large inline Scope 3 UI blocks are now feature-owned, but the parent still owns most behavior.

## Current Scope 3 folder story

### `categories/`

This is where category UI is moving.

What belongs here:

- category-specific presentational sections
- category-level UI composition
- display logic that depends on props

What should not stay here long-term if it grows:

- duplicated business logic from the parent
- feature-wide data access logic

### `hooks/`

Current old path:

- `src/components/emissions/scope3/hooks/useEmissionSync.ts`

Target direction:

- move more Scope 3 logic into feature-owned hooks

What belongs here:

- sync logic
- category-level state hooks
- factor-loading hooks
- save/load orchestration hooks

### `adapters/`

Current finance-related adapter path:

- `src/features/scope3/adapters/scope3SupabaseAdapter.ts`

Target direction for calculator Scope 3:

- feature-owned data access helpers closer to the calculator feature

What belongs here:

- Supabase mapping
- data persistence helpers
- DB payload translation

### `types/`

Current important path:

- `src/components/emissions/scope3/types/scope3Types.ts`

Target direction:

- keep Scope 3 types grouped with the feature that owns them

What belongs here:

- row types
- payload contracts
- feature-level DTOs

## Current vs target architecture

### Current

```txt
Scope3Section
  ├─ activeCategory routing
  ├─ state
  ├─ calculations
  ├─ save/load
  ├─ sync
  └─ renders extracted category components
```

### Target

```txt
Scope3Shell
  ├─ small composition layer
  ├─ category hooks
  ├─ adapters
  └─ renders presentational category sections

categories/*
  └─ UI only or mostly UI
```

## What is still left after UI extraction

Even after the category UI moves, some work still remains:

- move more logic out of `Scope3Section`
- move feature-specific save/load into hooks or adapters
- reduce the old `components/emissions/scope3/` bridge layer
- make the feature path the true owner of Scope 3

## Best practices for future Scope 3 work

- do not add new large UI blocks back into `Scope3Section`
- prefer category files under `features/emission-calculator/scope3/categories/`
- keep parent-owned state only as a migration step, not the final state
- move persistence and side effects into hooks or adapters when safe

## What belongs in Scope 3 docs

- migration strategy
- category ownership
- current bridge vs target state
- examples of extracted sections

## What should not belong in Scope 3 docs

- abstract language with no file examples
- fake folder plans that do not match the real repo

## Navigation

- Back: [`scope2.md`](./scope2.md)
- Next: [`data-flow.md`](./data-flow.md)
- Migration timeline: [`migration-history.md`](./migration-history.md)
- Diagram: [`../diagrams/scope3-flow.md`](../diagrams/scope3-flow.md)
- ADR: [`../decisions/ADR-002-scope3-extraction.md`](../decisions/ADR-002-scope3-extraction.md)

# Migration History

This file tracks how the emission calculator architecture has been changed over time.

It focuses on the frontend migration toward a feature-first structure.

## Purpose

Use this file to understand:

- what was moved
- why it was moved
- what stayed behind temporarily
- what the next steps are

## Why the migration started

The old calculator structure was hard to scale because:

- more logic stayed in `pages/`
- more logic stayed in old `components/emissions/*` paths
- Scope 3 grew into one very large orchestrator

The migration goal was not just to move files.
The goal was to make ownership clearer and changes safer.

## Migration pattern used

Most moves followed this sequence:

```txt
old path
  ↓
move implementation to features/
  ↓
leave re-export stub behind
  ↓
keep routes and imports stable
```

## Earlier calculator migration work

Important route-level moves included:

- UK calculator screen
- result screens
- history screen
- calculator choice screen

This helped shift ownership from `pages/` into `features/emission-calculator/`.

## Wave 1 — first Scope 3 category extractions

Wave 1 focused on categories that were easier to isolate.

Examples:

- `franchises`
- `fuel-energy-activities`
- `purchased-goods`
- `capital-goods`

### Why Wave 1 mattered

- proved the extraction pattern
- reduced risk
- let us keep behavior stable

### What stayed in `Scope3Section`

- state
- save/load logic
- calculations
- sync logic

## Wave 2 — more category extractions

Wave 2 extended the same pattern to more Scope 3 categories.

Examples:

- `business-travel`
- `employee-commuting`
- `waste-generated`
- `upstream-transportation`
- `downstream-transportation`
- `leased-assets`
- `investments`
- `facilitated-emissions`

### Why Wave 2 mattered

- removed much more inline JSX
- showed the pattern works across different category types
- kept changes smaller than a full rewrite

## Phase 7C — last major inline UI blocks

Phase 7C focused on the hardest remaining inline Scope 3 UI.

### 7C-1

- extracted `EndOfLifeTreatmentSection`

### 7C-2a

- extracted `ProcessingProductTypeSelector`

### 7C-2b

- extracted `ProcessingSoldProductsSection`

### 7C-2c

- extracted `UseOfSoldProductsSection`

### Why Phase 7C was important

These were the last large Scope 3 UI blocks still sitting inside `Scope3Section`.

By finishing this phase, we changed the problem from:

- "a lot of big inline UI is still trapped in one file"

to:

- "logic ownership still needs cleanup"

## What stayed in `Scope3Section` after these moves

Even after the UI extraction phases, `Scope3Section` still owns a lot:

- row state
- save flags
- factor loaders
- update handlers
- save/load handlers
- `useEmissionSync`
- category orchestration

This was intentional. It kept the migration safer.

## What the future target is

The next architectural step is not another giant UI move.

The next step is logic cleanup:

- move category logic into feature hooks
- move Supabase data handling into adapters
- reduce the bridge role of `components/emissions/scope3/`
- make feature-owned Scope 3 the main owner

## Timeline summary

```txt
Old state
  ↓
Route and screen migration into features/
  ↓
Wave 1: first Scope 3 UI extractions
  ↓
Wave 2: more category UI extractions
  ↓
Phase 7C: final large inline Scope 3 UI blocks extracted
  ↓
Next: move logic ownership out of Scope3Section
```

## Best practices learned from the migration

- move UI first when logic is risky
- use stubs to keep imports stable
- keep pull requests focused
- avoid giant all-at-once refactors

## Navigation

- Back: [`supabase.md`](./supabase.md)
- Scope 3 details: [`scope3.md`](./scope3.md)
- Diagram: [`../diagrams/scope3-flow.md`](../diagrams/scope3-flow.md)

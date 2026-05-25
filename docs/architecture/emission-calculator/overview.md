# Emission Calculator Overview

This folder explains the architecture of the emission calculator feature.

Main feature path:

- `src/features/emission-calculator/`

## Purpose

Use this file to understand:

- how the calculator is organized
- what is already migrated
- what is still transitional
- how Scope 1, Scope 2, Scope 3, results, and loaders fit together

## Main feature structure

```txt
src/features/emission-calculator/
  core/
  methodologies/
  results/
  scope1/
  scope2/
  scope3/
  templates/
```

## What each part does

### `core/`

This holds shared calculator-level pieces.

Examples:

- calculator choice screen
- loader helpers
- units
- template resolution

### `methodologies/`

This holds the main methodology-specific screens.

Current important example:

- `methodologies/uk/UKCalculatorScreen.tsx`

This is the real screen behind:

- `src/pages/EmissionCalculator.tsx`

### `results/`

This holds calculator result screens.

Examples:

- `UKResultsScreen`
- `EpaIpccResultsScreen`
- `EmissionHistoryScreen`

### `scope1/`

This now has:

- `Scope1Shell.tsx`
- feature-owned Scope 1 components

### `scope2/`

This now has:

- `Scope2Shell.tsx`
- feature-owned Scope 2 components

### `scope3/`

This is the most complex part.

It now has many extracted category components under:

- `scope3/categories/`

But some logic still lives in:

- `src/components/emissions/scope3/Scope3Section.tsx`

This is the main transitional part of the architecture.

## Current architecture

Current flow for the UK calculator:

```txt
pages/EmissionCalculator.tsx
  ↓
features/emission-calculator/methodologies/uk/UKCalculatorScreen.tsx
  ↓
Scope1 / Scope2 / Scope3 sections
```

For Scope 1 and Scope 2, migration is already much cleaner.

For Scope 3, the UI is now mostly extracted, but the parent still owns much of the logic.

## Why this feature got reorganized

The calculator grew large because it combines:

- methodology differences
- category-specific calculations
- database save/load
- many field combinations
- history and results screens

Without structure, this quickly turns into very large files.

The reorganization helps us split the feature into:

- screens
- shells
- category components
- future hooks
- future adapters

## Current vs target

### Current

```txt
route stub
  ↓
feature screen
  ↓
some clean shells
  ↓
Scope3Section bridge layer
```

### Target

```txt
route stub or thin route
  ↓
feature screen
  ↓
Scope1Shell / Scope2Shell / Scope3Shell
  ↓
feature hooks + adapters + presentational sections
```

## What belongs in this feature

- emission calculator screens
- methodology-specific logic
- scope-specific UI and hooks
- calculator state flow
- result/history logic

## What should not belong here

- generic shared UI primitives
- app-wide auth context setup
- unrelated project or dashboard logic

## Best practices

- keep calculator logic inside this feature
- split UI from logic when files get too large
- avoid adding new large logic to legacy bridge files
- move new Scope 3 work toward `scope3/` under `features/`

## Read next

- Scope 1: [`scope1.md`](./scope1.md)
- Scope 2: [`scope2.md`](./scope2.md)
- Scope 3: [`scope3.md`](./scope3.md)
- Data flow: [`data-flow.md`](./data-flow.md)

## Navigation

- Back: [`../README.md`](../README.md)
- Next: [`scope1.md`](./scope1.md)

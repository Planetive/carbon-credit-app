# Architecture Principles

This file explains the rules we try to follow when adding or moving code.

These are not abstract rules. They come from real problems we hit in this project, especially around `Scope3Section`, route growth, and mixed logic ownership.

## Purpose

Use this file when you are unsure:

- where new code should go
- whether something belongs in `pages/`, `features/`, or `components/`
- how much logic a UI component should own
- how to avoid creating another giant file

## Principle 1: Routes stay thin

`src/App.tsx` should be a router, not a business logic file.

`src/pages/` route files should ideally do one of these things:

- re-export a feature screen
- do small route-specific composition
- apply route-level wrappers

Good example:

- `src/pages/EmissionCalculator.tsx`
- `src/pages/EmissionHistory.tsx`
- `src/pages/ESGHealthCheck.tsx`

These already forward to `src/features/...`.

What belongs here:

- route entry wiring
- redirects
- route guards
- small route composition

What should not belong here:

- large domain logic
- long calculation flows
- Supabase save logic for a full feature

## Principle 2: Features own business logic

`src/features/` is where feature code should live.

A feature should own the things that make that feature work:

- screens
- hooks
- feature types
- small helpers
- adapters
- domain-specific calculations

Good examples:

- `src/features/emission-calculator/`
- `src/features/esg-management/`
- `src/features/esg-readiness/`
- `src/features/admin/`

What belongs here:

- code that clearly belongs to one business area
- feature-specific hooks
- feature-specific state handling
- feature-specific Supabase loaders or adapters

What should not belong here:

- generic UI primitives
- app-wide context setup
- helpers used across many unrelated features

## Principle 3: Shared code should stay generic

Shared code is useful only when it is truly shared.

Examples:

- `src/components/ui/`
- `src/components/shared/`
- `src/contexts/`
- `src/integrations/supabase/`

If a file uses business words like:

- emissions
- franchises
- ESG topics
- processing of sold products

then it probably belongs in a feature, not in a global shared folder.

What belongs here:

- buttons, cards, form controls
- layout shells
- auth and organization contexts
- generic utility hooks
- database client setup

What should not belong here:

- feature-specific row update logic
- Scope 3 calculation code
- domain-specific save handlers

## Principle 4: Avoid giant orchestrator files

A file becomes a problem when it does too many jobs at once.

`src/components/emissions/scope3/Scope3Section.tsx` is the clearest example:

- many categories
- many state variables
- many handlers
- many Supabase calls
- many calculations
- lots of JSX

That made it hard to:

- onboard new developers
- test changes safely
- review pull requests
- move fast without breaking other categories

So the fix is not one huge rewrite. The fix is:

1. extract presentational UI first
2. keep state in the parent at first
3. move hooks and adapters later

## Principle 5: Presentational components should stay simple

A presentational component mainly renders UI and raises events.

Example from Scope 3 migration:

- `BusinessTravelSection`
- `EmployeeCommutingSection`
- `WasteGeneratedSection`
- `EndOfLifeTreatmentSection`
- `ProcessingProductTypeSelector`
- `ProcessingSoldProductsSection`
- `UseOfSoldProductsSection`

These components receive props like:

- rows
- totals
- saving flags
- event handlers

They do not own the feature workflow.

What belongs here:

- JSX
- field layout
- buttons
- labels
- reading data from props

What should not belong here:

- Supabase save logic
- complex state setup
- feature-wide side effects
- duplicate calculation rules already handled in the parent

## Principle 6: State should live close to the feature

State should not be global unless it truly needs to be global.

Good places for state:

- inside a feature screen
- inside a feature hook
- inside a small parent orchestrator for a specific workflow

Current Scope 3 is in a transition stage:

- state still lives in `Scope3Section`
- UI is moving into feature-owned components
- next step is moving logic into feature hooks and adapters

## Principle 7: Do not duplicate business logic

If the same emissions rule or save behavior exists in two places, one of them will become wrong later.

During migration we try to keep one source of truth by:

- leaving logic in the parent at first
- moving only UI first
- adding re-export stubs instead of copying files

This is why many migrations were done as:

```txt
Old import path
   ↓
re-export stub
   ↓
new feature-owned file
```

## Principle 8: Prefer feature ownership over path convenience

Just because a file is already in `components/` does not mean new code should keep going there.

If the code belongs to the emission calculator, it should move toward:

- `src/features/emission-calculator/...`

If it belongs to ESG management, it should move toward:

- `src/features/esg-management/...`

## Scope 3 example

Old pattern:

```txt
Scope3Section
  ├─ owns state
  ├─ renders UI
  ├─ calculates emissions
  ├─ saves to Supabase
  └─ does this for many categories
```

Current pattern:

```txt
Scope3Section
  ├─ still owns state and save logic
  ├─ still owns calculations
  └─ renders extracted category components from features/
```

Target pattern:

```txt
Scope3Shell
  ↓
feature hooks
  ↓
adapters
  ↓
Supabase

category components
  ↑
render from props only
```

## Best practices

- If a route file grows too much, move it into `features/`
- If a feature file grows too much, split UI and logic
- If a helper is only used by one feature, keep it in that feature
- Use re-export stubs when you need a safe migration path
- Prefer several small pull requests over one giant move

## What belongs in this file

- rules for file placement
- real examples from this project
- migration-friendly engineering guidance

## What should not belong in this file

- one-off local coding preferences
- styling rules that belong in frontend standards
- database schema details

## Navigation

- Back: [`README.md`](./README.md)
- Next: [`folder-structure.md`](./folder-structure.md)
- Scope 3 details: [`emission-calculator/scope3.md`](./emission-calculator/scope3.md)

# Folder Structure

This file explains the major frontend folders in practical terms.

If you are new to the project, read this after [`principles.md`](./principles.md).

## Purpose

This file helps answer:

- what each major folder is for
- what kind of code belongs there
- what should not go there
- where to place new work

## Quick map

```txt
src/
  App.tsx
  pages/
  features/
  components/
  contexts/
  hooks/
  integrations/
  utils/

docs/
  architecture/
```

## `src/App.tsx`

This is the main route entry for the app.

What belongs here:

- route definitions
- route guards
- redirects
- top-level layout wiring

What should not belong here:

- business calculations
- long save/load logic
- feature-specific state

## `src/pages/`

This folder still exists because the project is in migration.

Today, `pages/` contains two kinds of files:

1. thin route stubs
2. older full pages that have not been migrated yet

Examples of thin stubs:

- `src/pages/EmissionCalculator.tsx`
- `src/pages/EmissionHistory.tsx`
- `src/pages/ESGHealthCheck.tsx`

Examples of still-large pages:

- `src/pages/EmissionCalculatorEPA.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/finance_facilitated/...`

What belongs here:

- route entry files
- route-specific redirects
- small route composition

What should not go here:

- new large business flows when a feature folder already exists
- long domain hooks
- feature-specific adapters

## `src/features/`

This is the main destination for the architecture.

Features are grouped by business area, not by route name.

Real feature folders:

- `src/features/emission-calculator/`
- `src/features/esg-management/`
- `src/features/esg-readiness/`
- `src/features/admin/`
- `src/features/auth/`
- `src/features/country-emissions/`
- `src/features/scope3/`

What belongs here:

- screens
- hooks
- adapters
- feature types
- feature calculations
- reusable domain UI inside one feature

What should not go here:

- global generic UI primitives
- app-wide contexts
- random helpers with no feature ownership

## `src/components/`

This folder is mixed today.

Some parts are healthy shared UI.
Some parts are legacy bridge layers from before the feature migration.

Important subfolders:

- `src/components/ui/` → shared design system primitives
- `src/components/layout/` → app shell components
- `src/components/shared/` → generic helpers used across domains
- `src/components/emissions/` → legacy emissions layer plus migration bridge

### `src/components/emissions/`

This folder needs special attention.

Examples:

- `src/components/emissions/Scope1Emissions.tsx`
- `src/components/emissions/Scope2Emissions.tsx`
- `src/components/emissions/scope3/Scope3Section.tsx`
- `src/components/emissions/scope3/components/*`

Some files here are now just stubs pointing into `src/features/emission-calculator/...`.
Some files still contain real logic.

What belongs here today:

- compatibility stubs during migration
- shared emissions UI that has not been moved yet

What should not keep growing here:

- new large domain logic
- new feature-owned workflows
- more giant orchestrator files

## `src/contexts/`

This is for app-wide state that truly needs broad access.

Examples:

- `src/contexts/AuthContext.tsx`
- `src/contexts/OrganizationContext.tsx`

What belongs here:

- authentication state
- organization-level state
- cross-app state needed by many routes

What should not go here:

- category-specific Scope 3 state
- calculator-only form state
- one-screen local state

## `src/hooks/`

This is for generic hooks used in many places.

Examples:

- scroll behavior
- small reusable UI hooks

What belongs here:

- cross-feature hooks
- app-wide helper hooks

What should not go here:

- feature-specific logic that should live in `src/features/<feature>/hooks/`

## `src/integrations/`

This folder holds external service clients and integration setup.

Important example:

- `src/integrations/supabase/client.ts`

What belongs here:

- shared Supabase client setup
- connection wiring
- external integration configuration

What should not go here:

- feature-specific queries mixed together
- feature save logic that belongs in an adapter or hook

## `src/utils/`

This is for shared helpers that are not tied to one feature.

Examples:

- report export helpers
- formatting helpers
- small generic utility logic

What belongs here:

- helpers with broad reuse
- utilities that are not UI components

What should not go here:

- feature-specific business rules
- large feature save/load logic

If a helper is only used by one feature, it should usually live in that feature.

## `docs/`

This is for project documentation, not runtime code.

This architecture set lives at:

- `docs/architecture/`

What belongs here:

- onboarding docs
- architecture diagrams
- decision records
- migration notes

What should not go here:

- runtime config
- code snippets pretending to be source files

## Where common work should go

### Example: new Scope 3 category UI

Put it in:

- `src/features/emission-calculator/scope3/categories/<category>/`

Not in:

- `src/pages/`
- a brand new random shared folder

### Example: shared app button or form primitive

Put it in:

- `src/components/ui/`

### Example: feature-specific Supabase save helper

Put it in:

- feature hook or adapter folder

Example target:

- `src/features/emission-calculator/scope3/adapters/`

## Best practices

- Start with the feature that owns the behavior
- Only use shared folders when the code is truly generic
- Keep `pages/` thin when possible
- Use migration stubs when moving code safely

## Navigation

- Back: [`principles.md`](./principles.md)
- Next: [`routing.md`](./routing.md)
- More detail: [`emission-calculator/overview.md`](./emission-calculator/overview.md)

# State Management

This file explains where calculator state lives today and where it should move over time.

## Purpose

Use this file to understand:

- local state vs shared feature state
- parent-owned state during migration
- what should become a hook later

## Current calculator state model

Different layers hold different kinds of state.

### App-wide state

Lives in:

- `src/contexts/AuthContext.tsx`
- `src/contexts/OrganizationContext.tsx`

This is for:

- signed-in user
- organization context

### Feature screen state

Lives in screens like:

- `UKCalculatorScreen`
- result screens

This is for:

- calculator step flow
- selected sections
- broader calculator state

### Scope section state

Lives in section owners like:

- `Scope3Section`

This is for:

- row arrays
- saving flags
- deleting flags
- local workflow flags like `productType`

## Why parent-owned state was kept during Scope 3 migration

We wanted safer migrations.

If we moved UI and logic at the same time, we would increase risk too much.

So the pattern became:

```txt
Move UI first
Keep state in parent
Move logic later
```

That is why extracted components like:

- `BusinessTravelSection`
- `WasteGeneratedSection`
- `EndOfLifeTreatmentSection`
- `ProcessingSoldProductsSection`
- `UseOfSoldProductsSection`

still receive data and handlers from the parent.

## Current Scope 3 state owner

Right now the big owner is still:

- `src/components/emissions/scope3/Scope3Section.tsx`

Examples of state there:

- category rows
- save flags
- load flags
- `productType`
- factor table data

## What should become hooks later

Good candidates for feature hooks:

- category load logic
- category save logic
- factor loading logic
- row-sync logic
- data-to-payload mapping

Target example:

```txt
UseOfSoldProductsSection
  ↓
useUseOfSoldProducts()
  ↓
scope3 adapter
  ↓
Supabase
```

## What should stay out of global context

Do not move feature-local calculator state into app-wide contexts unless there is a strong reason.

Examples that should stay local to the feature:

- sold product row arrays
- waste category drafts
- local save flags

## Best practices

- keep state close to where it is used
- keep only truly shared state in contexts
- use parent-owned state as a migration step, not the final destination
- once a category is stable, consider moving logic into a feature hook

## What belongs in this file

- state ownership rules
- migration-stage state strategy
- local vs shared state guidance

## What should not belong in this file

- route architecture
- DB schema details

## Navigation

- Back: [`data-flow.md`](./data-flow.md)
- Next: [`supabase.md`](./supabase.md)

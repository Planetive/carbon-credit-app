# ADR-002: Scope 3 Extraction Strategy

## Context

`src/components/emissions/scope3/Scope3Section.tsx` became one of the largest and hardest-to-change frontend files in the project.

It handled:

- category UI
- state
- save/load logic
- calculations
- factor loading
- sync logic

## Problem

A full rewrite would have been too risky.

Moving UI and logic at the same time could easily break:

- calculations
- Supabase writes
- emission sync
- category-specific workflows

## Decision

We will extract Scope 3 in stages.

The chosen pattern is:

1. move category JSX into feature-owned presentational components
2. keep parent-owned state in `Scope3Section`
3. keep save/load/calculation logic in the parent first
4. move hooks and adapters later

We also use re-export stubs so old import paths continue to work.

## Consequences

### Good

- safer refactors
- smaller pull requests
- easier review
- less risk of breaking data flow

### Trade-off

- `Scope3Section` remains large for a while
- the architecture is temporarily mixed
- some logic still sits in old paths until later phases

## Future Direction

- move more Scope 3 logic into feature hooks
- move persistence into adapters
- reduce `Scope3Section` into a smaller composition layer

## Related docs

- [`../emission-calculator/scope3.md`](../emission-calculator/scope3.md)
- [`../emission-calculator/migration-history.md`](../emission-calculator/migration-history.md)

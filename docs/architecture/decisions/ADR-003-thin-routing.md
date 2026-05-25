# ADR-003: Thin Routing

## Context

The app still routes through `src/App.tsx`, and many entry files still live in `src/pages/`.

As features moved into `src/features/`, routing needed to stay stable without blocking the migration.

## Problem

If route files keep growing with business logic, then:

- `App.tsx` becomes harder to reason about
- route files become another home for feature logic
- migrations become more expensive

## Decision

We will keep routing thin.

That means:

- `App.tsx` owns route definitions and wrappers
- `pages/` files should mostly be route adapters
- real behavior should live in `features/`

## Consequences

### Good

- routing stays easy to understand
- feature ownership becomes clearer
- route paths can stay stable during migration

### Trade-off

- `pages/` remains as a transition layer for some time
- the repo temporarily contains both route adapters and feature screens

## Future Direction

- continue converting route files into thin stubs
- optionally point `App.tsx` directly at feature screens later
- keep business logic out of route files

## Related docs

- [`../routing.md`](../routing.md)
- [`ADR-001-feature-first-architecture.md`](./ADR-001-feature-first-architecture.md)
